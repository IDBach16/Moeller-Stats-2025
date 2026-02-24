const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

['Game Stats', 'POST Game Stats'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('\n\n========== DETAILED GAME STRUCTURE: ' + sheetName + ' ==========\n');
  
  // Look at first game in detail
  console.log('--- FIRST GAME (Rows 0-15) ---\n');
  
  for (let i = 0; i < Math.min(16, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    let rowStr = 'Row ' + i + ': ';
    
    // Show first 12 columns
    for (let j = 0; j < 12 && j < row.length; j++) {
      rowStr += (row[j] || '') + ' | ';
    }
    rowStr += ' ... | ';
    
    // Show columns AB(27), AC(28), AD(29)
    rowStr += (row[27] || '') + ' | ' + (row[28] || '') + ' | ' + (row[29] || '');
    
    console.log(rowStr);
  }
  
  console.log('\n--- GAME HEADERS ---\n');
  
  // Get the Hitting header row
  if (data[1] && data[1][0] === 'Hitting') {
    console.log('HITTING HEADERS (Row 1):');
    console.log(data[1].join(' | '));
  }
  
  // Check for Pitching header
  for (let i = 0; i < Math.min(20, data.length); i++) {
    if (data[i] && data[i][0] === 'Pitching') {
      console.log('\nPITCHING HEADERS (Row ' + i + '):');
      console.log(data[i].join(' | '));
      break;
    }
  }
});
