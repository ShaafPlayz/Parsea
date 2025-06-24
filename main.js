const { app, BrowserWindow, ipcMain } = require('electron/main');
const path = require('path');
require('dotenv').config();

const { fetchEmailsAsJSON } = require('./IMAP'); // Import IMAP module
const { classifyEmail } = require('./ai'); // Import your cohere code


function checkSettings(){
  try {
    const data = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(data);
    
    credentials.email = settings.email;
    credentials.host = settings.server;
    credentials.pass = settings.password;
    credentials.port = settings.port;
    credentials.secure = settings.secure;

  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

let credentials = {
  email: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  port: 993,
  host: 'imap.gmail.com',
  secure: true
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Add this to handle child process cleanup
app.on('before-quit', (event) => {
  console.log('Electron app is about to quit. Checking for child processes...');
  if (myChildProcess && !myChildProcess.killed) {
    console.log('Terminating child process...');
    myChildProcess.kill(); // Sends SIGTERM
    // You might need to force kill after a timeout if it doesn't respond
    // setTimeout(() => {
    //   if (!myChildProcess.killed) {
    //     myChildProcess.kill('SIGKILL');
    //   }
    // }, 2000);
  }
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
// require('electron-reload')(__dirname, {
//   electron: require(`${__dirname}/node_modules/electron`)
// });

ipcMain.on('set-cred', (event, user, pass) => {
  credentials.email = user;
  credentials.pass = pass;

  event.reply('cred-status', "Complete");
});

ipcMain.on('get-cred', (event) => {
  event.reply('creds-data', credentials);
});