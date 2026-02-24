const { resetDb, getDb } = require('../lib/db');
const { loadWorkbook, extractPlayers, extractGames, extractAggregatePitching } = require('../lib/import');

console.log('=== Moeller Stats 2025 - Database Seed ===\n');

// Reset and initialize database
const db = resetDb();
console.log('Database reset and schema created.\n');

// Load Excel workbook
const workbook = loadWorkbook();
console.log('Excel workbook loaded.\n');

// Extract and insert players
const playerMap = extractPlayers(workbook);
console.log(`Found ${playerMap.size} unique players.`);

const insertPlayer = db.prepare(
  'INSERT INTO players (first_name, last_name, class_year, is_pitcher) VALUES (?, ?, ?, ?)'
);

const nameToId = {};
const insertPlayers = db.transaction(() => {
  for (const [fullName, info] of playerMap) {
    const result = insertPlayer.run(info.first, info.last, info.classYear, info.isPitcher ? 1 : 0);
    nameToId[fullName] = result.lastInsertRowid;
  }
});
insertPlayers();
console.log(`Inserted ${Object.keys(nameToId).length} players into database.`);

// Display players
let batters = 0, pitchers = 0;
for (const [name, info] of playerMap) {
  if (info.isPitcher) pitchers++;
  else batters++;
}
console.log(`  Batters only: ${batters}`);
console.log(`  Pitchers: ${pitchers}\n`);

// Extract aggregate pitching data for W/L/SV distribution
const totalPitching = extractAggregatePitching(workbook, 'Total');
const regPitching = extractAggregatePitching(workbook, 'Regular Season');
const postPitching = extractAggregatePitching(workbook, 'Postseason');

// Extract and insert games
const regularGames = extractGames(workbook, 'Game Stats');
const postGames = extractGames(workbook, 'POST Game Stats');

console.log(`Regular season games: ${regularGames.length}`);
console.log(`Postseason games: ${postGames.length}`);

const insertGame = db.prepare(
  'INSERT INTO games (game_number, season_type, result) VALUES (?, ?, ?)'
);
const insertBatting = db.prepare(
  `INSERT INTO game_batting (game_id, player_id, ab, r, h, rbi, doubles, triples, hr, bb, so, sf, sh, hbp, sb, cs, errors)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertPitching = db.prepare(
  `INSERT INTO game_pitching (game_id, player_id, ip_full, ip_partial, h, r, er, bb, so, hr, hbp, gs, w, l, sv, cg, sho, errors)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

function findPlayerId(name) {
  if (nameToId[name]) return nameToId[name];
  // Try fuzzy match
  for (const key of Object.keys(nameToId)) {
    if (key.toLowerCase() === name.toLowerCase()) return nameToId[key];
  }
  console.warn(`  WARNING: Player not found: "${name}"`);
  return null;
}

// Track per-pitcher W/L/SV assignments to match aggregate data
const pitcherWLSV = {}; // { playerName: { w: assigned, l: assigned, sv: assigned } }

function distributeWLSV(games, aggPitching) {
  // For each game with a result, try to assign W/L/SV to pitchers
  for (const game of games) {
    if (!game.result || game.pitchers.length === 0) continue;

    const starter = game.pitchers[0];
    const lastPitcher = game.pitchers[game.pitchers.length - 1];

    if (game.result === 'W') {
      // Try to give W to starter if they went 4+ IP or only pitcher
      // Otherwise give to a reliever who has remaining W in aggregate
      let assigned = false;
      const starterAgg = aggPitching[starter.name];

      if (game.pitchers.length === 1) {
        starter.w = 1;
        assigned = true;
      } else if (starter.ip_full >= 4 || (starter.ip_full === 3 && starter.ip_partial > 0)) {
        // Starter likely gets W if they went 4+ innings
        if (starterAgg && getRemainingW(starter.name, aggPitching) > 0) {
          starter.w = 1;
          assigned = true;
        }
      }

      if (!assigned) {
        // Give W to first reliever who has remaining W
        for (let p = 1; p < game.pitchers.length; p++) {
          if (getRemainingW(game.pitchers[p].name, aggPitching) > 0) {
            game.pitchers[p].w = 1;
            assigned = true;
            break;
          }
        }
      }

      if (!assigned && starterAgg && getRemainingW(starter.name, aggPitching) > 0) {
        starter.w = 1;
        assigned = true;
      }

      // Assign save to last pitcher if different from W pitcher and has saves remaining
      if (game.pitchers.length > 1) {
        const last = game.pitchers[game.pitchers.length - 1];
        if (!last.w && getRemainingSV(last.name, aggPitching) > 0) {
          last.sv = 1;
          trackAssignment(last.name, 'sv');
        }
      }

      if (assigned) {
        const winner = game.pitchers.find(p => p.w === 1);
        if (winner) trackAssignment(winner.name, 'w');
      }
    } else if (game.result === 'L') {
      // Give L to pitcher who allowed the most earned runs, preferring starter
      let assigned = false;

      if (getRemainingL(starter.name, aggPitching) > 0) {
        starter.l = 1;
        trackAssignment(starter.name, 'l');
        assigned = true;
      }

      if (!assigned) {
        for (const p of game.pitchers) {
          if (getRemainingL(p.name, aggPitching) > 0) {
            p.l = 1;
            trackAssignment(p.name, 'l');
            break;
          }
        }
      }
    }

    // CG/SHO
    if (game.pitchers.length === 1) {
      const agg = aggPitching[starter.name];
      if (agg && getRemainingCG(starter.name, aggPitching) > 0) {
        starter.cg = 1;
        trackAssignment(starter.name, 'cg');
        if (game.teamPitchingR === 0 && getRemainingSHO(starter.name, aggPitching) > 0) {
          starter.sho = 1;
          trackAssignment(starter.name, 'sho');
        }
      }
    }
  }
}

function trackAssignment(name, stat) {
  if (!pitcherWLSV[name]) pitcherWLSV[name] = { w: 0, l: 0, sv: 0, cg: 0, sho: 0 };
  pitcherWLSV[name][stat]++;
}

function getAssigned(name, stat) {
  return (pitcherWLSV[name] && pitcherWLSV[name][stat]) || 0;
}

function getRemainingW(name, agg) {
  return ((agg[name] && agg[name].w) || 0) - getAssigned(name, 'w');
}
function getRemainingL(name, agg) {
  return ((agg[name] && agg[name].l) || 0) - getAssigned(name, 'l');
}
function getRemainingSV(name, agg) {
  return ((agg[name] && agg[name].sv) || 0) - getAssigned(name, 'sv');
}
function getRemainingCG(name, agg) {
  return ((agg[name] && agg[name].cg) || 0) - getAssigned(name, 'cg');
}
function getRemainingSHO(name, agg) {
  return ((agg[name] && agg[name].sho) || 0) - getAssigned(name, 'sho');
}

// Distribute W/L/SV for regular season
distributeWLSV(regularGames, regPitching);
// Distribute W/L/SV for postseason
distributeWLSV(postGames, postPitching);

// Insert all games
const insertAllGames = db.transaction(() => {
  let totalBatting = 0, totalPitching = 0;

  for (const games of [regularGames, postGames]) {
    for (const game of games) {
      const gameResult = insertGame.run(game.gameNumber, game.seasonType, game.result);
      const gameId = gameResult.lastInsertRowid;

      for (const batter of game.batters) {
        const playerId = findPlayerId(batter.name);
        if (!playerId) continue;
        insertBatting.run(gameId, playerId,
          batter.ab, batter.r, batter.h, batter.rbi,
          batter.doubles, batter.triples, batter.hr,
          batter.bb, batter.so, batter.sf, batter.sh, batter.hbp,
          batter.sb, batter.cs, batter.errors
        );
        totalBatting++;
      }

      for (const pitcher of game.pitchers) {
        const playerId = findPlayerId(pitcher.name);
        if (!playerId) continue;
        insertPitching.run(gameId, playerId,
          pitcher.ip_full, pitcher.ip_partial,
          pitcher.h, pitcher.r, pitcher.er,
          pitcher.bb, pitcher.so, pitcher.hr, pitcher.hbp,
          pitcher.gs, pitcher.w, pitcher.l, pitcher.sv,
          pitcher.cg, pitcher.sho, pitcher.errors
        );
        totalPitching++;
      }
    }
  }

  console.log(`\nInserted ${regularGames.length + postGames.length} games.`);
  console.log(`  Batting entries: ${totalBatting}`);
  console.log(`  Pitching entries: ${totalPitching}`);
});

insertAllGames();

// ============ CORRECTION PASS ============
// Force per-pitcher GS/W/L/SV totals to match aggregate Excel data exactly
// by adjusting individual game records
console.log('\n=== Correction Pass: GS/W/L/SV ===');

function correctPitcherStat(pitcherName, stat, targetTotal, seasonFilter) {
  const playerId = findPlayerId(pitcherName);
  if (!playerId) return;

  const filterClause = seasonFilter === 'regular'
    ? "AND g.season_type = 'regular'"
    : seasonFilter === 'postseason'
    ? "AND g.season_type = 'postseason'"
    : '';

  const current = db.prepare(`
    SELECT SUM(gp.${stat}) as total FROM game_pitching gp
    JOIN games g ON g.id = gp.game_id
    WHERE gp.player_id = ? ${filterClause}
  `).get(playerId);

  const currentTotal = current.total || 0;
  let diff = targetTotal - currentTotal;

  if (diff > 0) {
    // Need to add more - find games where this pitcher has stat=0
    const games = db.prepare(`
      SELECT gp.id, gp.game_id FROM game_pitching gp
      JOIN games g ON g.id = gp.game_id
      WHERE gp.player_id = ? AND gp.${stat} = 0 ${filterClause}
      ORDER BY gp.game_id
    `).all(playerId);
    for (let i = 0; i < Math.min(diff, games.length); i++) {
      db.prepare(`UPDATE game_pitching SET ${stat} = 1 WHERE id = ?`).run(games[i].id);
    }
  } else if (diff < 0) {
    // Need to remove some
    const games = db.prepare(`
      SELECT gp.id FROM game_pitching gp
      JOIN games g ON g.id = gp.game_id
      WHERE gp.player_id = ? AND gp.${stat} = 1 ${filterClause}
      ORDER BY gp.game_id DESC
    `).all(playerId);
    for (let i = 0; i < Math.min(-diff, games.length); i++) {
      db.prepare(`UPDATE game_pitching SET ${stat} = 0 WHERE id = ?`).run(games[i].id);
    }
  }
}

// Apply corrections using Total aggregate data
for (const [name, agg] of Object.entries(totalPitching)) {
  correctPitcherStat(name, 'gs', agg.gs, null);
  correctPitcherStat(name, 'w', agg.w, null);
  correctPitcherStat(name, 'l', agg.l, null);
  correctPitcherStat(name, 'sv', agg.sv, null);
  correctPitcherStat(name, 'cg', agg.cg, null);
  correctPitcherStat(name, 'sho', agg.sho, null);
}

console.log('GS/W/L/SV correction pass complete.');

// Validate results
console.log('\n=== VALIDATION ===\n');

// Count game results
const gameResults = db.prepare('SELECT result, COUNT(*) as cnt FROM games GROUP BY result').all();
console.log('Game results:', gameResults);

const regWins = db.prepare("SELECT COUNT(*) as cnt FROM games WHERE season_type='regular' AND result='W'").get();
const regLosses = db.prepare("SELECT COUNT(*) as cnt FROM games WHERE season_type='regular' AND result='L'").get();
const regTies = db.prepare("SELECT COUNT(*) as cnt FROM games WHERE season_type='regular' AND result='T'").get();
console.log(`Regular season record: ${regWins.cnt}-${regLosses.cnt}-${regTies.cnt}`);

const postWins = db.prepare("SELECT COUNT(*) as cnt FROM games WHERE season_type='postseason' AND result='W'").get();
const postLosses = db.prepare("SELECT COUNT(*) as cnt FROM games WHERE season_type='postseason' AND result='L'").get();
console.log(`Postseason record: ${postWins.cnt}-${postLosses.cnt}`);

const totalW = db.prepare("SELECT COUNT(*) as cnt FROM games WHERE result='W'").get();
const totalL = db.prepare("SELECT COUNT(*) as cnt FROM games WHERE result='L'").get();
const totalT = db.prepare("SELECT COUNT(*) as cnt FROM games WHERE result='T'").get();
console.log(`Total record: ${totalW.cnt}-${totalL.cnt}-${totalT.cnt}`);

// Update config with actual record
db.prepare("UPDATE config SET value = ? WHERE key = 'wins'").run(String(totalW.cnt));
db.prepare("UPDATE config SET value = ? WHERE key = 'losses'").run(String(totalL.cnt));
db.prepare("UPDATE config SET value = ? WHERE key = 'ties'").run(String(totalT.cnt));

// Validate batting totals
const battingTotals = db.prepare(`
  SELECT SUM(ab) as ab, SUM(h) as h, SUM(r) as r, SUM(rbi) as rbi,
    SUM(bb) as bb, SUM(so) as so, SUM(hr) as hr, SUM(doubles) as "2b",
    SUM(triples) as "3b", SUM(sb) as sb
  FROM game_batting
`).get();
console.log('\nBatting totals from DB:', battingTotals);
console.log('Expected from Excel: AB=751, H=263, R=265, RBI=231, BB=155, SO=170, HR=21, 2B=41, 3B=21, SB=129');

// Validate pitching totals
const pitchingTotals = db.prepare(`
  SELECT SUM(ip_full*3+ip_partial) as total_outs, SUM(h) as h, SUM(r) as r,
    SUM(er) as er, SUM(bb) as bb, SUM(so) as so, SUM(w) as w, SUM(l) as l,
    SUM(sv) as sv, SUM(gs) as gs
  FROM game_pitching
`).get();
const ipDisp = Math.floor(pitchingTotals.total_outs / 3) + '.' + (pitchingTotals.total_outs % 3);
console.log('\nPitching totals from DB:', { ...pitchingTotals, ip: ipDisp });
console.log('Expected from Excel: IP=193.2, H=131, R=94, ER=77, BB=111, SO=211, W=25, L=4, SV=8');

// Per-pitcher W/L/SV validation
console.log('\n--- Per-pitcher W/L/SV ---');
const pitcherStats = db.prepare(`
  SELECT p.first_name || ' ' || p.last_name as name,
    SUM(gp.w) as w, SUM(gp.l) as l, SUM(gp.sv) as sv, SUM(gp.gs) as gs
  FROM game_pitching gp
  JOIN players p ON p.id = gp.player_id
  GROUP BY p.id
  ORDER BY p.last_name
`).all();
for (const ps of pitcherStats) {
  const expected = totalPitching[Object.keys(totalPitching).find(k => k.includes(ps.name.split(' ')[1])) || ''];
  console.log(`  ${ps.name}: W=${ps.w}, L=${ps.l}, SV=${ps.sv}, GS=${ps.gs}` +
    (expected ? ` (expected W=${expected.w}, L=${expected.l}, SV=${expected.sv}, GS=${expected.gs})` : ''));
}

// Verify player counts
const playerCount = db.prepare('SELECT COUNT(*) as cnt FROM players').get();
const pitcherCount = db.prepare('SELECT COUNT(*) as cnt FROM players WHERE is_pitcher = 1').get();
console.log(`\nTotal players: ${playerCount.cnt} (${pitcherCount.cnt} pitchers, ${playerCount.cnt - pitcherCount.cnt} batters-only)`);

console.log('\n=== Seed complete! ===');
