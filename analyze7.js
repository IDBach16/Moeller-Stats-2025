const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

['Game Stats'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  
  // Get all cell references to look for opponent/score info
  console.log('========== LOOKING FOR OPPONENT/SCORE DATA ==========\n');
  
  // Check for "Opponent" or "Score" text anywhere
  console.log('Searching for "Opponent" and "Score" in all cells:');
  let foundOpponent = false;
  let foundScore = false;
  
  Object.keys(sheet).forEach(key => {
    if (key[0] !== '!') {
      const cell = sheet[key];
      if (cell && cell.v) {
        const val = String(cell.v).toLowerCase();
        if (val.includes('opponent')) {
          console.log('  Found "opponent" at ' + key + ': ' + cell.v);
          foundOpponent = true;
        }
        if (val.includes('score') && val !== 'scores') {
          console.log('  Found "score" at ' + key + ': ' + cell.v);
          foundScore = true;
        }
      }
    }
  });
  
  if (!foundOpponent) console.log('  No "opponent" found');
  if (!foundScore) console.log('  No "score" found');
  
  // Look for any text in columns beyond Z
  console.log('\n\nAll values in columns AA, AB, AC, AD:');
  for (let row = 1; row <= 20; row++) {
    ['AA', 'AB', 'AC', 'AD'].forEach(col => {
      const cellKey = col + row;
      const cell = sheet[cellKey];
      if (cell && cell.v) {
        console.log('  ' + cellKey + ': ' + cell.v);
      }
    });
  }
  
  // Check all unique values in row 1 (first game header)
  console.log('\n\nAll values in row 1:');
  const row1Cells = Object.keys(sheet).filter(k => k.endsWith('1') && k[0] !== '!');
  row1Cells.sort().forEach(key => {
    const cell = sheet[key];
    if (cell && cell.v) {
      console.log('  ' + key + ': ' + cell.v);
    }
  });
});
