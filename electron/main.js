const { app, BrowserWindow } = require('electron');
const path = require('path');

function startBackend() {
  try {
    // Require the compiled backend server (built to backend/dist)
    require(path.join(__dirname, '..', 'backend', 'dist', 'server.js'));
    console.log('Backend démarré depuis Electron');
  } catch (err) {
    console.error('Impossible de démarrer le backend:', err);
    // Quit if backend cannot start
    app.quit();
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  win.loadFile(indexPath).catch((err) => {
    console.error('Erreur chargement UI:', err);
  });
}

app.whenReady().then(() => {
  startBackend();
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
