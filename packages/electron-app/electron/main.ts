import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { GhCliClient } from '@gh-dashboard/github-gh-cli';

// Packaged macOS apps launch with a minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin).
// Append common locations where gh and other CLI tools are installed.
const extraPaths = ['/opt/homebrew/bin', '/usr/local/bin', `${process.env.HOME}/.local/bin`];
process.env.PATH = `${process.env.PATH}:${extraPaths.join(':')}`;

const github = new GhCliClient();
let mainWindow: BrowserWindow | null = null;

const iconPath = path.join(__dirname, '../assets/icon.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'TINT Viewer',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.name = 'TINT Viewer';

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('github:check-gh-cli', async () => {
  return github.isGhInstalled();
});

ipcMain.handle('github:check-auth', async () => {
  const loggedIn = await github.isLoggedIn();
  if (!loggedIn) return null;
  const token = await github.getAuthToken();
  return github.fetchUser(token);
});

ipcMain.handle('github:login', async () => {
  await github.login();
  const token = await github.getAuthToken();
  return github.fetchUser(token);
});

ipcMain.handle('github:get-prs', async () => {
  return github.fetchUserPRs();
});

ipcMain.handle('github:get-review-requested-prs', async (_event, teams: string[]) => {
  return github.fetchReviewRequestedPRs(teams);
});

ipcMain.handle('open-in-browser', async (_event, url: string) => {
  shell.openExternal(url);
});
