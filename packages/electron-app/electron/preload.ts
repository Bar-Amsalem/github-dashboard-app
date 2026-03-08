import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkGhCli: () => ipcRenderer.invoke('github:check-gh-cli'),
  checkAuth: () => ipcRenderer.invoke('github:check-auth'),
  login: () => ipcRenderer.invoke('github:login'),
  getPRs: () => ipcRenderer.invoke('github:get-prs'),
  getReviewRequestedPRs: (teams: string[]) => ipcRenderer.invoke('github:get-review-requested-prs', teams),
  openInBrowser: (url: string) => ipcRenderer.invoke('open-in-browser', url),
});
