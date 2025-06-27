const { CohereClientV2 } = require('cohere-ai');
const fs = require('fs');
require('dotenv').config();

const sel_service = 1;


const llm = "command-a-03-2025"
const sys_prompt = `You are an assistant that classifies job application–related emails. Your task is to read each email and assign it one of the following classifications based on its content:

                - Updates — The email contains any job-related communication including interview invitations, job offers, rejection notifications, or any other significant updates about job applications.
                - Confirmation — The email confirms receipt of an application, test, or other form submission.
                - Other — Anything that doesn't fall into the above categories.


                Start by writing a summary section:
                **Summary Section:**
                - Updates: #
                - Confirmations: #
                - Others: #
                
                Only then do the following:
                Return the title of the email for the updates and confirmations. 
                This is because I will be using this information to find that specific email.
                DO NOT RETURN THE CONTENTS OF ANY EMAIL. 
                FOLLOW THE FOLLOWING FORMAT:

                **Futher:**
                "Title of email", "Title of email", "Title of email", "Title of email", etc..
                
                **Helper:**
                "updates", "confirmation", "confirmation", "updates", etc..

                ANY EMAIL THAT DOES NOT FALL IN ANY OF THE ABOVE CATEGORIES, COUNT THEM IN THE OTHERS.
                IGNORE THE LINKEDIN INVITATIONS BUT DO COUNT THEM IN OTHERS.
                INCLUDE JOB POSTINGS IN OTHERS.
                INPUT FORMAT: You will receive email data extracted from a CSV file containing recent emails from the user's inbox. Each email includes: Subject, From (sender), Date, and content.` 

const cohere = new CohereClientV2({ 
  token: process.env.COHERE_API_KEY 
});

async function classifyEmail() {
  // Fetch fresh emails from the server (saves to CSV)
  
  
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
  
  if (sel_service == 1) {
    return await Cohere(prompt);
  }
}

async function Cohere(input) {
  try {
    const response = await cohere.chat({
      model: llm,
      messages: [
        {
          role: "system",
          content: sys_prompt   
        },
        {
          role: "user",
          content: input
        }
      ],
      temperature: 0
    });
    
    return response.message.content[0].text.trim();
  } catch (error) {
    console.error('Error with Cohere API:', error);
    console.error('Full error details:', error.message);
    return 'Error: Unable to classify email';
  }
}

module.exports = { classifyEmail };


