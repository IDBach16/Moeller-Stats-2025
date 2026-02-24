const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

// Analyze aggregated sheets
['Total', 'Regular Season', 'Postseason'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('\n========== ' + sheetName + ' SHEET ==========');
  console.log('Total Rows: ' + data.length);
  
  // Print first 30 rows to understand structure
  console.log('\nFirst 30 rows:');
  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (row && row[0]) {
      console.log('Row ' + i + ': [' + row.slice(0, 5).join(' | ') + '] ... (' + row.length + ' cols)');
    } else {
      console.log('Row ' + i + ': [EMPTY]');
    }
  }
});
