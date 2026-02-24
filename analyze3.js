const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

console.log('========== GAME STATS SHEETS ==========\n');

['Game Stats', 'POST Game Stats'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('\n--- ' + sheetName + ' ---');
  console.log('Total Rows: ' + data.length);
  
  // Look for game structure
  let gameCount = 0;
  let i = 0;
  
  while (i < data.length) {
    const row = data[i];
    
    // Look for game header (starts with "Moeller")
    if (row && row[0] === 'Moeller') {
      gameCount++;
      
      if (gameCount <= 3) {
        console.log('\n  --- Game ' + gameCount + ' (Row ' + i + ') ---');
        console.log('  Header: ' + row.slice(0, 10).join(' | '));
        
        // Get columns at indices AB, AC, AD
        const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD'];
        console.log('  Columns around AB-AD: [' + (row[27] || 'undefined') + ' | ' + (row[28] || 'undefined') + ' | ' + (row[29] || 'undefined') + ']');
        
        // Look for hitting header
        if (i + 1 < data.length && data[i + 1][0] === 'Hitting') {
          console.log('  Row ' + (i + 1) + ': ' + data[i + 1].slice(0, 10).join(' | '));
        }
        
        // Count hitting and pitching rows
        let hittingCount = 0;
        let pitchingCount = 0;
        let j = i + 1;
        
        while (j < data.length && j < i + 50) {
          const gameRow = data[j];
          
          if (gameRow && gameRow[0]) {
            if (gameRow[0] === 'Hitting') {
              hittingCount++;
            } else if (gameRow[0] === 'Pitching') {
              pitchingCount++;
            } else if (gameRow[0] === 'Team') {
              console.log('  Team Summary (Row ' + j + '): ' + gameRow.slice(0, 10).join(' | '));
              // Next game starts after Team row
              i = j;
              break;
            } else if (gameRow[0] === 'Moeller' && j > i + 1) {
              // Found next game
              i = j - 1;
              break;
            }
          }
          j++;
        }
        
        console.log('  Hitting rows: ' + hittingCount);
        console.log('  Pitching rows: ' + pitchingCount);
      }
    }
    
    i++;
  }
  
  console.log('\nTotal games in ' + sheetName + ': ' + gameCount);
});
