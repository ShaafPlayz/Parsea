const fs = require('fs');
const csv = require('csv-parser');

// Updated auth code detection function
function isAuthCodeEmail(content) {
  const patterns = [
    /verification code/i,
    /auth(entication)? code/i,
    /use code/i,
    /your code/i,
    /login code/i,
    /security code/i,
    /2fa code/i,
    /otp/i,
    // More specific pattern for codes - only match if surrounded by specific context
    /\b(code|pin).*\d{4,8}\b/i,
    /\d{4,8}.*\b(code|pin)\b/i
  ];

  return patterns.some(pattern => pattern.test(content));
}

console.log('🔍 Testing updated CSV filtering logic...');

let totalRows = 0;
let filteredOut = 0;
let kept = 0;

fs.createReadStream('emails.csv')
  .pipe(csv())
  .on('data', (row) => {
    totalRows++;
    const text = `${row.Subject || ''} ${row.Raw || ''}`;
    
    if (totalRows <= 5) { // Show details for first 5 rows
      console.log(`\n--- Row ${totalRows} ---`);
      console.log(`Subject: "${row.Subject}"`);
      console.log(`From: "${row.From}"`);
    }
    
    if (!isAuthCodeEmail(text)) {
      kept++;
      if (totalRows <= 5) console.log('✅ KEPT - Not an auth code email');
    } else {
      filteredOut++;
      if (totalRows <= 5) console.log('🚫 FILTERED OUT - Detected as auth code email');
    }
  })
  .on('end', () => {
    console.log(`\n📊 FINAL STATS:`);
    console.log(`Total rows: ${totalRows}`);
    console.log(`Kept: ${kept}`);
    console.log(`Filtered out: ${filteredOut}`);
    console.log(`Filter rate: ${((filteredOut / totalRows) * 100).toFixed(1)}%`);
  })
  .on('error', (error) => {
    console.error('Error reading CSV:', error);
  });
