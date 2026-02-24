const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

['Game Stats', 'POST Game Stats'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('\n========== ' + sheetName + ' - COMPLETE STRUCTURE ==========\n');
  
  // Analyze first complete game
  console.log('FIRST GAME STRUCTURE:\n');
  
  // Show all rows of first game
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    console.log('Row ' + i + ': ' + JSON.stringify(row.slice(0, 30)));
  }
  
  // Look for pitching section in first game
  console.log('\n\nLooking for PITCHING header in first game:');
  for (let i = 0; i < Math.min(20, data.length); i++) {
    if (data[i] && data[i].includes('Pitching') && data[i][0] === 'Pitching') {
      console.log('Found Pitching header at Row ' + i);
      console.log('Full row: ' + JSON.stringify(data[i].slice(0, 30)));
      break;
    }
  }
  
  // Look for all unique first-column values in first game
  console.log('\n\nAll Row Labels in First Game (rows 0-25):');
  for (let i = 0; i < Math.min(26, data.length); i++) {
    if (data[i]) {
      console.log('  Row ' + i + ': "' + (data[i][0] || 'EMPTY') + '"');
    }
  }
  
  // Count games
  let gameCount = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][0] === 'Moeller' && (i === 0 || data[i - 1][0] === 'Team')) {
      gameCount++;
    }
  }
  console.log('\n\nTotal Games: ' + gameCount);
});
