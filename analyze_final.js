const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

console.log('====================================================================');
console.log('COMPREHENSIVE DATA MODEL ANALYSIS - Moeller Stats 2025.xlsx');
console.log('====================================================================\n');

console.log('1. ALL SHEET NAMES:');
console.log('   ' + workbook.SheetNames.join(', '));

// ============ AGGREGATED SHEETS ============
console.log('\n\n2. AGGREGATED SHEETS (Total, Regular Season, Postseason):');

['Total', 'Regular Season', 'Postseason'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('\n   --- ' + sheetName + ' ---');
  
  // Batting section
  const battingHeaders = data[1];
  console.log('\n   BATTING SECTION:');
  console.log('   Columns (Total: ' + battingHeaders.length + '): ' + battingHeaders.join(' | '));
  
  // Count players and totals
  let playerCount = 0;
  for (let i = 2; i < data.length; i++) {
    if (data[i][0] === 'Totals') break;
    if (data[i][0]) playerCount++;
  }
  console.log('   Player Rows: ' + playerCount);
  
  // Find pitching section
  let pitchingStartRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][0] === 'PLAYER' && i > 20) {
      pitchingStartRow = i;
      break;
    }
  }
  
  if (pitchingStartRow > 0) {
    const pitchingHeaders = data[pitchingStartRow];
    console.log('\n   PITCHING SECTION:');
    console.log('   Columns (Total: ' + pitchingHeaders.length + '): ' + pitchingHeaders.join(' | '));
    
    let pitcherCount = 0;
    for (let i = pitchingStartRow + 1; i < data.length; i++) {
      if (data[i][0] === 'Totals') break;
      if (data[i][0]) pitcherCount++;
    }
    console.log('   Pitcher Rows: ' + pitcherCount);
  }
});

// ============ GAME STATS SHEETS ============
console.log('\n\n3. GAME STATS SHEETS (Game Stats, POST Game Stats):\n');

['Game Stats', 'POST Game Stats'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('   --- ' + sheetName + ' ---');
  console.log('   Total Rows: ' + data.length);
  
  // Get hitting headers
  const hittingHeaders = data[1];
  console.log('\n   HITTING HEADERS (Row 1): ' + hittingHeaders.slice(0, 17).join(' | '));
  
  // Get pitching headers (usually in same row, columns R onwards)
  console.log('   PITCHING HEADERS (Row 1): ' + hittingHeaders.slice(17, 26).join(' | '));
  
  // Game metadata columns
  console.log('\n   GAME METADATA COLUMNS (AB, AC, AD):');
  console.log('   AB: INN (Inning)');
  console.log('   AC: LOB (Left On Base)');
  console.log('   AD: Hitter (Upcoming Hitter)');
  
  // Count games
  let gameCount = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][0] === 'Moeller') {
      gameCount++;
    }
  }
  console.log('\n   Total Games: ' + gameCount);
  
  // Analyze first game structure
  console.log('\n   FIRST GAME STRUCTURE:');
  console.log('   Row 0: Game header (Moeller)');
  console.log('   Row 1: Column headers (Hitting and Pitching stats)');
  console.log('   Rows 2-N: Hitter rows (player names in column A)');
  
  // Find Team row in first game
  for (let i = 0; i < Math.min(15, data.length); i++) {
    if (data[i] && data[i][0] === 'Team') {
      console.log('   Row ' + i + ': Team summary row');
      break;
    }
  }
  
  console.log('   Row N+1: Empty row (game separator)');
  console.log('   Row N+2: Next game header (Moeller)');
});

// ============ MISSING DATA ============
console.log('\n\n4. OPPONENT AND GAME METADATA:');
console.log('   Status: NOT FOUND in spreadsheet');
console.log('   - No "Opponent" field in any sheet');
console.log('   - No "Score" field in any sheet');
console.log('   - No date information in Game Stats or POST Game Stats sheets');
console.log('   - Only contains: Game hitting stats, Pitching stats, Inning, LOB, Next Hitter info');

console.log('\n====================================================================\n');
