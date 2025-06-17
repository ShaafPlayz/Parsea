'use strict';

const fs = require('fs');
require('dotenv').config();
const { ImapFlow } = require('./lib/imap-flow');

const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    tls: {
        rejectUnauthorized: false
    },

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },

    clientInfo: {
        name: false,
        'support-url': false,
        vendor: false,
        date: false
    }
});

async function fetchEmailsAsJSON() {
    const emails = [];

    try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');

        // Calculate date days ago
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const imapDate = since.toISOString().split('T')[0];

        try {
            // Search for emails since the date
            const uids = await client.search({ since: imapDate });

            if (uids.length === 0) {
                console.log('📭 No emails found during however many days you set.');
            }

            for await (let message of client.fetch(uids, { envelope: true, source: true })) {
                const emailObj = {
                    uid: message.uid,
                    subject: message.envelope.subject,
                    from: message.envelope.from.map(f => f.address).join(', '),
                    to: message.envelope.to?.map(t => t.address).join(', ') || '',
                    date: message.envelope.date,
                    raw: message.source.toString()
                };
                emails.push(emailObj);
            }
        } finally {
            lock.release();
        }        await client.logout();
        
        // Create CSV content
        const csvHeaders = ['UID', 'Subject', 'From', 'To', 'Date', 'Raw'];
        const csvRows = [csvHeaders.join(',')];
        
        emails.forEach(email => {
            const row = [
                email.uid,
                `"${(email.subject || '').replace(/"/g, '""')}"`, // Escape quotes in subject
                `"${email.from}"`,
                `"${email.to}"`,
                `"${new Date(email.date).toISOString()}"`,
                `"${email.raw.replace(/"/g, '""').substring(0, 500)}"` // Truncate raw content and escape quotes
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        
        // Save to CSV file
        fs.writeFileSync('emails.csv', csvContent); // also overwrites apparently lol
        console.log(`✅ Saved ${emails.length} emails to emails.csv`);
        
        // Still return the emails array for backward compatibility
        return emails;

    } catch (err) {
        console.error('❌ Failed:', err.message);
        return []; // Return empty array on error
    }
}




module.exports = { fetchEmailsAsJSON };