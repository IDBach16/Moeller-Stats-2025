const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

// Get all column headers for aggregated sheets
console.log('========== AGGREGATED SHEETS (Total, Regular Season, Postseason) ==========\n');

['Total', 'Regular Season', 'Postseason'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('\n--- ' + sheetName + ' ---');
  
  // Batting headers (row 1)
  console.log('\nBATTING HEADERS (Row 1):');
  console.log(data[1].join(' | '));
  
  // Count batting players
  let battingCount = 0;
  for (let i = 2; i < data.length; i++) {
    if (data[i] && data[i][0] && data[i][0] !== 'Totals' && data[i][0] !== 'Pitching Totals') {
      battingCount++;
    } else {
      break;
    }
  }
  console.log('Batting Players: ' + battingCount);
  
  // Find totals row
  for (let i = 2; i < data.length; i++) {
    if (data[i] && data[i][0] === 'Totals') {
      console.log('\nTotals Row (Batting): ' + data[i].slice(0, 10).join(' | '));
      break;
    }
  }
  
  // Pitching headers
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][0] === 'PLAYER' && i > 20) {
      console.log('\nPITCHING HEADERS (Row ' + i + '):');
      console.log(data[i].join(' | '));
      
      // Count pitchers
      let pitcherCount = 0;
      for (let j = i + 1; j < data.length; j++) {
        if (data[j] && data[j][0] && data[j][0] !== 'Totals') {
          pitcherCount++;
        } else {
          break;
        }
      }
      console.log('Pitchers: ' + pitcherCount);
      
      // Find pitcher totals
      for (let j = i + 1; j < data.length; j++) {
        if (data[j] && data[j][0] === 'Totals') {
          console.log('Totals Row (Pitching): ' + data[j].slice(0, 10).join(' | '));
          break;
        }
      }
      break;
    }
  }
});
