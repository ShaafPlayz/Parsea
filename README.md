# Parsea
#
![Showcase](resources/showcase.gif)

#### AI desktop tool that reads your inbox and flags job updates, so you don't waste time checking every email.

![image](https://github.com/user-attachments/assets/44fd168b-edee-401d-9b0d-bb5ee5c5e7f9)
#### Loading
![image](https://github.com/user-attachments/assets/ea4bc9d0-a923-410f-b89c-941dad79b195)

---

## Features
- Fetches recent emails from your inbox and saves them to a CSV file using IMAP
- Parses the CSV into structured email objects (subject, sender, date, etc.)
- Uses Cohere AI (Command-a-03-2025) to classify job application–related emails into categories: Interview, Offer, Rejection, Confirmation, and Other
- Returns only the titles of relevant emails for easy identification (no email contents are exposed)
- Provides a summary count for each category in the AI response
- Robust error handling for API and parsing issues
- Modular code for easy maintenance and extension

## Recent Updates (June 19, 2025)
- Refactored email classification logic to use a detailed system prompt for Cohere AI
- Improved CSV parsing and email formatting for AI input
- Ensured only email titles are returned for classified emails
- Added error handling for Cohere API failures

## Problems
- Requires a better way to parse all the emails locally before sending it to the model
- Design could have a better UI that is more intuitive compared to just a text
- Could experiment with a RAG type workflow for this application
- Context Length might become an issue, because the emails parsed are a lot

## Use the Product

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd parseML
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Dependencies
This project uses the following dependencies:

**Production Dependencies:**
- `@azure/msal-node@^3.6.0` - Microsoft Authentication Library for Azure AD
- `axios@^1.10.0` - HTTP client for API requests
- `cohere-ai@^7.17.1` - Cohere AI API client
- `dotenv@^16.5.0` - Environment variable loader
- `imap@^0.8.17` - IMAP client library
- `imapflow@^1.0.188` - Modern IMAP client
- `mailparser@^3.7.3` - Email parsing utilities

**Development Dependencies:**
- `electron@^36.4.0` - Desktop application framework
- `electron-reload@^2.0.0-alpha.1` - Hot reload for Electron development

### Running the Application
```bash
npm start
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for improvements or bug fixes.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
