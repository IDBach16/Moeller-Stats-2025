const XLSX = require('xlsx');

const workbook = XLSX.readFile('Moeller Stats 2025.xlsx');

console.log('====================================================================');
console.log('SAMPLE DATA AND PITCHING DETAILS');
console.log('====================================================================\n');

// POST Game Stats pitching info
console.log('POST Game Stats - Full First Game Detail:\n');

const sheet = workbook.Sheets['POST Game Stats'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Row 0 (Game Header): ' + JSON.stringify(data[0]));
console.log('\nRow 1 (Headers): ' + JSON.stringify(data[1]));
console.log('\nRows 2-19 (Players and Pitching):');
for (let i = 2; i < 20; i++) {
  const row = data[i];
  if (row) {
    console.log('  Row ' + i + ': [Player: ' + (row[0] || 'EMPTY') + '] [R: ' + row[1] + ', H: ' + row[2] + ', AB: ' + row[3] + '] [Pitch: ' + (row[17] || 'NONE') + ' IP: ' + (row[18] || '?') + ']');
  }
}

// Check if POST Game Stats has pitching info in row 2
console.log('\n\nChecking Pitching Data in POST Game Stats Row 2:');
console.log('Full Row 2: ' + JSON.stringify(data[2]));
console.log('\nPitching section (Cols R-Z): ' + JSON.stringify(data[2].slice(17, 26)));

// Regular Season sample
console.log('\n\n====== AGGREGATED SHEET SAMPLE (Total) ======\n');

const totalSheet = workbook.Sheets['Total'];
const totalData = XLSX.utils.sheet_to_json(totalSheet, { header: 1 });

console.log('Batting Section - First 3 players:');
for (let i = 2; i < 5; i++) {
  const row = totalData[i];
  if (row) {
    console.log('  ' + row[0] + ': G=' + row[1] + ', PA=' + row[2] + ', AB=' + row[3] + ', H=' + row[5] + ', HR=' + row[10] + ', AVG=' + row[18]);
  }
}

// Find and show Team/Totals row
for (let i = 0; i < totalData.length; i++) {
  if (totalData[i] && totalData[i][0] === 'Totals') {
    console.log('\nBatting Totals: ' + JSON.stringify(totalData[i].slice(0, 15)));
    break;
  }
}

console.log('\n\nPitching Section - First 2 pitchers:');
for (let i = 25; i < 27; i++) {
  const row = totalData[i];
  if (row) {
    console.log('  ' + row[0] + ': G=' + row[1] + ', W=' + row[14] + ', L=' + row[15] + ', ERA=' + row[19] + ', IP=' + row[7]);
  }
}

console.log('\n====================================================================\n');
