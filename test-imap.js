const { fetchEmailsAsJSON } = require('./IMAP.js');

async function testIMAP() {
    console.log('🔍 Testing IMAP email fetching...');
    
    try {
        const emails = await fetchEmailsAsJSON();
        console.log(`✅ Successfully fetched ${emails.length} emails`);
        
        if (emails.length > 0) {
            console.log('📧 Sample email:', {
                subject: emails[0].subject,
                from: emails[0].from,
                date: emails[0].date
            });
        }
    } catch (error) {
        console.error('❌ Error testing IMAP:', error);
    }
}

testIMAP();
