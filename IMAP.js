'use strict';

const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();
const { ImapFlow } = require('./lib/imap-flow');

// function checkSettings(){
//   try {
//     settings = JSON.parse(localStorage.getItem('parseaSettings') || '{}');
//     credentials.email = settings.email;
//     credentials.host = settings.server;
//     credentials.pass = settings.password;
//     credentials.port = settings.port;
//     credentials.secure = settings.secure;

//   } catch (error) {
//     console.error('Error loading settings:', error);
//   }
// };

let credentials = {
  email: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  port: 993,
  host: 'imap.gmail.com',
  secure: true
};
// checkSettings();

async function fetchEmailsAsJSON() {
    const emails = [];

    try {
        const client = new ImapFlow({
        host: credentials.host,
        port: credentials.port,
        secure: credentials.secure,
        tls: {
            rejectUnauthorized: false
        },
        auth: {
            user: credentials.email,
            pass: credentials.pass // also fix typo from `passssss`
        },
        clientInfo: {
            name: false,
            'support-url': false,
            vendor: false,
            date: false
        }
    });

      await client.connect(); // ✅ safe to call now
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
            await client.logout();
        }
        
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
        
        const csvContent = csvRows.join('\n');        // Save to CSV file
        fs.writeFileSync('emails.csv', csvContent); // also overwrites apparently lol
        console.log(`✅ Saved ${emails.length} emails to emails.csv`);
        
        // Debug: Check what was written to CSV before cleanup
        console.log(`📝 CSV content preview (first 200 chars): ${csvContent.substring(0, 200)}...`);
        
        // Clean up CSV: filter out authentication emails and mask email addresses
        try {
          await cleanupCSV('emails.csv');
        } catch (cleanupError) {
          console.error('⚠️ CSV cleanup failed, keeping original CSV:', cleanupError.message);
        }
        
        // Still return the emails array for backward compatibility
        return emails;

    } catch (err) {
        console.error('❌ Failed:', err.message);
        return []; // Return empty array on error
    }
}

// Helper function to mask email addresses
function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  
  const emailRegex = /^([^@]+)@(.+)$/;
  const match = email.match(emailRegex);
  
  if (!match) return email;
  
  const [, localPart, domain] = match;
  
  // Mask the local part, keeping first and last character if long enough
  let maskedLocal;
  if (localPart.length <= 2) {
    maskedLocal = '*'.repeat(localPart.length);
  } else {
    maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
  }
  
  return `${maskedLocal}@${domain}`;
}

function maskEmailsInRows(rows) {
  return rows.map(row => {
    const maskedRow = { ...row };

    if (maskedRow.From) {
      maskedRow.From = maskEmail(maskedRow.From);
    }

    if (maskedRow.To) {
      maskedRow.To = maskEmail(maskedRow.To);
    }

    // Optionally scrub from Raw field too
    if (maskedRow.Raw) {
      maskedRow.Raw = maskedRow.Raw.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        match => maskEmail(match)
      );
    }

    return maskedRow;
  });
}

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

function readAndFilterCSV(filePath) {
  return new Promise((resolve, reject) => {
    const filteredRows = [];
    let totalRows = 0;
    let filteredOut = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        totalRows++;
        const text = `${row.Subject || ''} ${row.Raw || ''}`;
        if (!isAuthCodeEmail(text)) {
          filteredRows.push(row);
        } else {
          filteredOut++;
          console.log(`🚫 Filtered out auth email: "${(row.Subject || '').substring(0, 50)}..."`);
        }
      })
      .on('end', () => {
        console.log(`📊 CSV filtering stats: ${totalRows} total, ${filteredRows.length} kept, ${filteredOut} filtered out`);
        resolve(filteredRows);
      })
      .on('error', reject);
  });
}

async function overwriteCSV(filePath, rows) {
  if (!rows || rows.length === 0) {
    console.log('⚠️ Warning: No rows to write, skipping CSV overwrite');
    return;
  }
  
  const headers = Object.keys(rows[0] || {}).map(key => ({ id: key, title: key }));

  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers
  });

  await csvWriter.writeRecords(rows);
  console.log(`✅ CSV overwritten with ${rows.length} records`);
}

// Combined function to filter and mask CSV data
async function cleanupCSV(filePath) {
  try {
    console.log('🧹 Starting CSV cleanup (filtering and masking)...');
    
    // Step 1: Filter out authentication code emails
    const filteredRows = await readAndFilterCSV(filePath);
    console.log(`📋 Filtered ${filteredRows.length} rows (removed auth code emails)`);
    
    // Check if we have any rows left after filtering
    if (filteredRows.length === 0) {
      console.log('⚠️ Warning: All rows were filtered out (possibly all were auth code emails)');
      return;
    }
    
    // Step 2: Mask email addresses in the filtered data
    const maskedRows = maskEmailsInRows(filteredRows);
    console.log('🎭 Applied email masking to filtered data');
    
    // Step 3: Write the cleaned data back to the CSV
    await overwriteCSV(filePath, maskedRows);
    console.log('✨ CSV cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during CSV cleanup:', error);
    throw error;
  }
}

// Helper function to read CSV (similar to the one in output.js)
function readCSV(filePath = 'emails.csv') {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}



module.exports = { fetchEmailsAsJSON };