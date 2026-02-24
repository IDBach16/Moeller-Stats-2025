const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'Moeller Stats 2025.xlsx');

function parsePlayerName(fullName) {
  // "Connor Fuhrer (Sr)" -> { first: "Connor", last: "Fuhrer", classYear: "Sr" }
  const match = fullName.match(/^(.+?)\s+\((\w+)\)$/);
  if (!match) {
    const parts = fullName.trim().split(/\s+/);
    return { first: parts[0], last: parts.slice(1).join(' '), classYear: null };
  }
  const namePart = match[1].trim();
  const classYear = match[2];
  const parts = namePart.split(/\s+/);
  const first = parts[0];
  const last = parts.slice(1).join(' ');
  return { first, last, classYear };
}

function parseIP(ipValue) {
  // 4.1 = 4 innings + 1 out, 4.2 = 4 innings + 2 outs
  if (ipValue === 0 || ipValue === null || ipValue === undefined) return { full: 0, partial: 0 };
  const str = String(ipValue);
  const parts = str.split('.');
  const full = parseInt(parts[0]) || 0;
  const partial = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
  return { full, partial: Math.min(partial, 2) };
}

function loadWorkbook() {
  return XLSX.readFile(EXCEL_PATH);
}

function extractPlayers(workbook) {
  const totalSheet = workbook.Sheets['Total'];
  const data = XLSX.utils.sheet_to_json(totalSheet, { header: 1 });

  const players = new Map(); // key = full name -> player info

  // Batting players (rows 2+, col 0)
  for (let i = 2; i < data.length; i++) {
    if (!data[i][0] || data[i][0] === 'Totals') break;
    const name = data[i][0];
    const parsed = parsePlayerName(name);
    if (!players.has(name)) {
      players.set(name, { ...parsed, isPitcher: false, fullName: name });
    }
  }

  // Pitching players
  let pitchStart = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][0] === 'PLAYER' && i > 20) {
      pitchStart = i;
      break;
    }
  }
  if (pitchStart > 0) {
    for (let i = pitchStart + 1; i < data.length; i++) {
      if (!data[i][0] || data[i][0] === 'Totals') break;
      const name = data[i][0];
      const parsed = parsePlayerName(name);
      if (players.has(name)) {
        players.get(name).isPitcher = true;
      } else {
        players.set(name, { ...parsed, isPitcher: true, fullName: name });
      }
    }
  }

  return players;
}

function extractAggregatePitching(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  // Headers: PLAYER(0), G(1), W-L%(2), GS(3), CG(4), Full IP(5), Partial IP(6), IP(7),
  //   H(8), R(9), ER(10), BB(11), K(12), HR(13), W(14), L(15), SV(16), SHO(17)
  let pitchStart = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][0] === 'PLAYER' && i > 10) {
      pitchStart = i;
      break;
    }
  }
  const result = {};
  if (pitchStart > 0) {
    for (let i = pitchStart + 1; i < data.length; i++) {
      if (!data[i][0] || data[i][0] === 'Totals') break;
      const name = data[i][0];
      result[name] = {
        g: data[i][1] || 0,
        gs: data[i][3] || 0,
        cg: data[i][4] || 0,
        w: data[i][14] || 0,
        l: data[i][15] || 0,
        sv: data[i][16] || 0,
        sho: data[i][17] || 0,
        hbp: 0 // Not in aggregate pitching, will come from game data
      };
    }
  }
  return result;
}

function parseOneGame(data, startRow, endRow) {
  const batters = [];
  const pitchers = [];
  let teamBattingR = 0;
  let teamPitchingR = 0;

  // Parse batting data (col 0 = player name, cols 1-16 = stats)
  for (let i = startRow; i < endRow; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    if (row[0] === 'Team') {
      teamBattingR = row[2] || 0;
      continue;
    }
    if (row[0] === 'Hitting' || row[0] === 'Moeller') continue;

    batters.push({
      name: row[0],
      ab: row[1] || 0,
      r: row[2] || 0,
      h: row[3] || 0,
      rbi: row[4] || 0,
      doubles: row[6] || 0,
      triples: row[7] || 0,
      hr: row[8] || 0,
      bb: row[9] || 0,
      so: row[10] || 0,
      sf: row[11] || 0,
      sh: row[12] || 0,
      hbp: row[13] || 0,
      sb: row[16] || 0,
      cs: 0,
      errors: 0
    });
  }

  // Parse pitching data (col 17 = pitcher name, cols 18-25 = stats)
  for (let i = startRow; i < endRow; i++) {
    const row = data[i];
    if (!row || row[17] === undefined || row[17] === null) continue;
    const pName = row[17];
    if (pName === 'Pitching' || pName === 'Hitting') continue;
    if (pName === 'Team') {
      teamPitchingR = row[20] || 0;
      continue;
    }

    const ip = parseIP(row[18]);
    pitchers.push({
      name: pName,
      ip_full: ip.full,
      ip_partial: ip.partial,
      h: row[19] || 0,
      r: row[20] || 0,
      er: row[21] || 0,
      bb: row[22] || 0,
      so: row[23] || 0,
      hr: row[24] || 0,
      hbp: 0,
      gs: 0,
      w: 0, l: 0, sv: 0, cg: 0, sho: 0,
      errors: 0
    });
  }

  // Assign GS to pitcher with most IP (starter typically pitches most)
  if (pitchers.length > 0) {
    let maxIP = -1, starterIdx = 0;
    for (let i = 0; i < pitchers.length; i++) {
      const outs = pitchers[i].ip_full * 3 + pitchers[i].ip_partial;
      if (outs > maxIP) { maxIP = outs; starterIdx = i; }
    }
    pitchers[starterIdx].gs = 1;
  }

  let result = null;
  if (teamBattingR > teamPitchingR) result = 'W';
  else if (teamBattingR < teamPitchingR) result = 'L';
  else if (teamBattingR === teamPitchingR && teamBattingR > 0) result = 'T';

  return { batters, pitchers, teamBattingR, teamPitchingR, result };
}

function extractGames(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const isPost = sheetName === 'POST Game Stats';
  const seasonType = isPost ? 'postseason' : 'regular';

  // Find game boundaries using "Moeller" markers
  const moellerRows = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][0] === 'Moeller') moellerRows.push(i);
  }

  const games = [];
  let gameCounter = 0;

  for (let g = 0; g < moellerRows.length; g++) {
    const blockStart = moellerRows[g];
    const blockEnd = g + 1 < moellerRows.length ? moellerRows[g + 1] : data.length;

    // Check for doubleheader: look for a second "Hitting" header after first "Team" row
    let splitRow = -1;
    let foundFirstTeam = false;
    for (let i = blockStart + 2; i < blockEnd; i++) {
      if (data[i] && data[i][0] === 'Team') {
        foundFirstTeam = true;
        continue;
      }
      if (foundFirstTeam && data[i] && data[i][0] === 'Hitting') {
        splitRow = i;
        break;
      }
    }

    if (splitRow > 0) {
      // Doubleheader: two games in one block
      gameCounter++;
      const game1 = parseOneGame(data, blockStart, splitRow);
      games.push({ gameNumber: gameCounter, seasonType, ...game1 });

      gameCounter++;
      const game2 = parseOneGame(data, splitRow, blockEnd);
      games.push({ gameNumber: gameCounter, seasonType, ...game2 });
    } else {
      // Single game
      gameCounter++;
      const game = parseOneGame(data, blockStart, blockEnd);
      games.push({ gameNumber: gameCounter, seasonType, ...game });
    }
  }

  return games;
}

module.exports = {
  loadWorkbook,
  extractPlayers,
  extractGames,
  extractAggregatePitching,
  parsePlayerName,
  parseIP
};
