const fs = require('fs');
const csv = require('csv-parser');

// Test the filtering logic
function isAuthCodeEmail(content) {
  const patterns = [
    /verification code/i,
    /auth(entication)? code/i,
    /use code/i,
    /\b\d{4,8}\b/,        // Matches 4–8 digit numbers (likely codes)
    /2fa code/i,
    /otp/i,
    /login code/i
  ];

  return patterns.some(pattern => pattern.test(content));
}

async function testFiltering() {
  console.log('🔍 Testing CSV filtering logic...');
  
  const rows = [];
  let totalRows = 0;
  let filteredOut = 0;
  let kept = 0;

  return new Promise((resolve) => {
    fs.createReadStream('emails.csv')
      .pipe(csv())
      .on('data', (row) => {
        totalRows++;
        const text = `${row.Subject || ''} ${row.Raw || ''}`;
        
        console.log(`\n--- Row ${totalRows} ---`);
        console.log(`Subject: "${row.Subject}"`);
        console.log(`From: "${row.From}"`);
        console.log(`Text sample: "${text.substring(0, 100)}..."`);
        
        if (!isAuthCodeEmail(text)) {
          rows.push(row);
          kept++;
          console.log('✅ KEPT - Not an auth code email');
        } else {
          filteredOut++;
          console.log('🚫 FILTERED OUT - Detected as auth code email');
        }
        
        // Only test first 5 rows to avoid spam
        if (totalRows >= 5) {
          console.log(`\n📊 Final stats: ${totalRows} total, ${kept} kept, ${filteredOut} filtered out`);
          resolve();
        }
      })
      .on('end', () => {
        console.log(`\n📊 Final stats: ${totalRows} total, ${kept} kept, ${filteredOut} filtered out`);
        resolve();
      });
  });
}

testFiltering();
