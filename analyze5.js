const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

['Game Stats'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  
  console.log('========== ' + sheetName + ' - RAW ANALYSIS ==========\n');
  
  // Get all data with all columns
  const allCells = Object.keys(sheet).filter(k => k[0] !== '!');
  console.log('Total cells with data: ' + allCells.length);
  
  // Check specific cells for row 0 (first game header)
  console.log('\nRow 0 (Game Header - columns A through AE):');
  for (let col = 0; col < 31; col++) {
    const letter = String.fromCharCode(65 + (col < 26 ? col : 0));
    const colStr = col < 26 ? letter : 'A' + letter;
    const cellKey = colStr + '1';
    const cell = sheet[cellKey];
    const val = cell ? cell.v : '';
    console.log('  Col ' + colStr + '(' + (col) + '): ' + val);
  }
  
  console.log('\n\nRow 1 (Hitting Headers):');
  for (let col = 0; col < 31; col++) {
    const letter = String.fromCharCode(65 + (col < 26 ? col : 0));
    const colStr = col < 26 ? letter : 'A' + letter;
    const cellKey = colStr + '2';
    const cell = sheet[cellKey];
    const val = cell ? cell.v : '';
    console.log('  Col ' + colStr + '(' + (col) + '): ' + val);
  }
  
  // Try to get opponent info
  console.log('\n\nLooking for opponent/game metadata:');
  console.log('Sheet object keys (first 20): ');
  const keys = Object.keys(sheet).filter(k => k[0] !== '!').slice(0, 20);
  keys.forEach(k => {
    const val = sheet[k].v;
    console.log('  ' + k + ': ' + val);
  });
});
