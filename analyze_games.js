const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

['Game Stats', 'POST Game Stats'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('====== ' + sheetName + ' GAME BREAKDOWN ======\n');
  
  let gameNum = 0;
  let gameStartRows = [];
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][0] === 'Moeller') {
      gameNum++;
      gameStartRows.push(i);
      
      if (gameNum <= 3 || gameNum > 23) {
        // Find team row
        let teamRowIdx = -1;
        for (let j = i + 1; j < Math.min(i + 30, data.length); j++) {
          if (data[j] && data[j][0] === 'Team') {
            teamRowIdx = j;
            break;
          }
        }
        
        if (teamRowIdx > 0) {
          const hitterCount = teamRowIdx - i - 2; // -2 for header row and team row
          const teamRow = data[teamRowIdx];
          
          console.log('Game ' + gameNum + ':');
          console.log('  Start Row: ' + i);
          console.log('  Team Summary Row: ' + teamRowIdx);
          console.log('  Hitter Rows: ' + hitterCount);
          console.log('  Team Stats: AB=' + teamRow[1] + ', R=' + teamRow[2] + ', H=' + teamRow[3] + ', RBI=' + teamRow[4]);
          console.log('  Next Row: ' + (teamRowIdx + 1) + ' [' + (data[teamRowIdx + 1] && data[teamRowIdx + 1][0] ? data[teamRowIdx + 1][0] : 'EMPTY') + ']\n');
        }
      }
    }
  }
  
  console.log('Total Games Found: ' + gameNum);
  console.log('Game Start Rows: ' + gameStartRows.join(', '));
  
  // Calculate spacing
  if (gameStartRows.length > 1) {
    console.log('\nTypical game spacing: ' + (gameStartRows[1] - gameStartRows[0]) + ' rows');
  }
  
  console.log('\n');
});
