// Simple test to verify IMAP functionality works
const { fetchEmailsAsJSON } = require('./IMAP.js');

console.log('🚀 Starting IMAP test...');

fetchEmailsAsJSON()
  .then(emails => {
    console.log(`✅ Test completed! Fetched ${emails.length} emails`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
