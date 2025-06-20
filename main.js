const { app, BrowserWindow, ipcMain } = require('electron/main');
const path = require('path');
require('dotenv').config();

const { fetchEmailsAsJSON } = require('./IMAP'); // Import IMAP module
const { classifyEmail } = require('./ai'); // Import your cohere code


let credentials = {
  email: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

// Event logic
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Check emails handler
ipcMain.handle('check-emails', async () => {
  console.log('check-emails handler called');

  console.log('About to classify emails');
  try {
    const result = await classifyEmail();
    console.log('Classification result:', result);
    return `${result}`;
  } catch (error) {
    console.error('Error in check-emails handler:', error);
    return `Error: ${error.message}`;
  }
});

// Fetch Email Handler
ipcMain.handle('fetch-emails', async () => {
  console.log('fetch-emails handler called');

  console.log('About to fetch emails');
  try {
    await fetchEmailsAsJSON();
    console.log('Fetch result');
    return 0;
  } catch (error) {
    console.error('Error in fetch-emails handler:', error);
    return `Error: ${error.message}`;
  }
});

// for dev mode (live reload)
require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`)
});

ipcMain.on('set-cred', (event, user, pass) => {
  credentials.email = user;
  credentials.pass = pass;

  event.reply('cred-status', "Complete");
});

ipcMain.on('get-cred', (event) => {
  event.reply('creds-data', credentials);
});