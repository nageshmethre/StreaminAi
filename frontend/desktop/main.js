const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#05070f',
  });

  // Load the static Next.js export out/index.html file
  const startUrl = url.format({
    pathname: path.join(__dirname, '../out/index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);

  // Open the DevTools during evaluation
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Register standard schemes
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
]);

app.on('ready', () => {
  // Handle local file protocol interception to solve Next.js route path conversions
  protocol.interceptFileProtocol('file', (request, callback) => {
    let filePath = request.url.substr(7); // strip 'file://'
    
    // Normalize path for Windows
    filePath = path.normalize(filePath);

    // If it's a folder, look for index.html
    if (filePath.endsWith(path.sep)) {
      filePath = path.join(filePath, 'index.html');
    }

    // Append .html for page endpoints if no extension is present
    const ext = path.extname(filePath);
    if (!ext && !filePath.includes('.')) {
      filePath = filePath + '.html';
    }

    callback({ path: filePath });
  });

  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
