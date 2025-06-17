const { CohereClientV2 } = require('cohere-ai');
const fs = require('fs');
require('dotenv').config();

const { fetchEmailsAsJSON } = require('./IMAP'); // Import module code


const cohere = new CohereClientV2({ 
  token: process.env.COHERE_API_KEY 
});

async function classifyEmail() {
  // Fetch fresh emails from the server (saves to CSV)
  await fetchEmailsAsJSON();
  
  // Read emails from CSV file
  const csvContent = fs.readFileSync('emails.csv', 'utf8');
  const csvLines = csvContent.split('\n');
  const headers = csvLines[0].split(',');
  
  // Parse CSV into email objects (skip header row)
  const emails = [];
  for (let i = 1; i < csvLines.length; i++) {
    const line = csvLines[i].trim();
    if (line) {
      // Simple CSV parsing (handles quoted fields)
      const values = line.split(',').map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));
      if (values.length >= 5) {
        emails.push({
          uid: values[0],
          subject: values[1],
          from: values[2],
          to: values[3],
          date: values[4],
          raw: values[5] || ''
        });
      }
    }
  }
  
  // Format emails for the AI prompt
  const emailsText = emails.map(email => 
    `Subject: ${email.subject}\nFrom: ${email.from}\nDate: ${email.date}\n---`
  ).join('\n\n');
  
    const prompt = `Here are the emails to process: ${emailsText}`

  const testPrompt = `Could you find the email from Workday HR ON June 13TH: ${emailsText}`
  try {
    const response = await cohere.chat({
      model: "command-a-03-2025",
      messages: [
        {
          role: "system",
          content: `You are an assistant that classifies job application–related emails. Your task is to read each email and assign it one of the following classifications based on its content:

                - Interview — The email contains an invitation to interview.
                - Offer — The email contains a job offer or intent to hire.
                - Rejection — The email clearly states the application was unsuccessful.
                - Confirmation — The email confirms receipt of an application, test, or other form submission.
                - Other — Anything that doesn’t fall into the above categories.

                📊 **Final Summary Section:**
                - Rejections: #
                - Confirmations: #
                - Interviews: #
                - Offers: #
                - Other (needs review): #
                
                For each classification, take the following action:

                🟢 **If the email is an Interview or Offer**  
                - Show the subject, sender, and a short summary (1–2 sentences max).
                - Provide your classification and reasoning.

                🟡 **If the email is a Rejection or Confirmation**  
                - Do not display the emails individually.
                - Instead, report the total count of each.

                🔴 **If the email is classified as Other**  
                - Display the full content of the email.
                - Highlight **why it might still require attention** (e.g., ambiguous phrasing, follow-up needed, etc.).
                INPUT FORMAT: You will receive email data extracted from a CSV file containing recent emails from the user's inbox. Each email includes: Subject, From (sender), Date, and content.`    
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    });

    return response.message.content[0].text.trim();
  } catch (error) {
    console.error('Error with Cohere API:', error);
    console.error('Full error details:', error.message);
    return 'Error: Unable to classify email';
  }
}

module.exports = { classifyEmail };


