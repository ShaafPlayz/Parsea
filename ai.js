const { CohereClientV2 } = require('cohere-ai');
require('dotenv').config();

const cohere = new CohereClientV2({ 
  token: process.env.COHERE_API_KEY 
});

async function classifyEmail(emailText) {
  const prompt = `You are an assistant that classifies job application emails. Your task is to determine the status of the email from the following options:
- Interview
- Offer
- Rejection
- Confirmation
- Other


If there are any emails that classify into:
- Interview
- Offer
Then show a little summary, and the status and the classification.

If there are emails that classify into:
- Rejection
- Confirmation
Then show the number of total rejections and confirmation.

Always show the contents of an email that classify into:
- Other

Here are the emails:

"${emailText}"

Rejections #
Confirmations: #
Interviews: #
Offers: #
Other: #

Explation on Interviews or Offers:
From:
Classification:
Summary:`
;
  try {
    const response = await cohere.chat({
      model: "command-r-plus",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      maxTokens: 50
    });

    return response.message.content[0].text.trim();
  } catch (error) {
    console.error('Error with Cohere API:', error);
    console.error('Full error details:', error.message);
    return 'Error: Unable to classify email';
  }
}

module.exports = { classifyEmail };


