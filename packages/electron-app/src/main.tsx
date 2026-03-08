import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, GitHubAPIProvider } from '@gh-dashboard/github-ui';
import '@gh-dashboard/github-ui/src/styles.css';
import type { GitHubAPI } from '@gh-dashboard/github-ui';

const electronAPI: GitHubAPI = {
  checkGhCli: () => (window as any).electronAPI.checkGhCli(),
  checkAuth: () => (window as any).electronAPI.checkAuth(),
  login: () => (window as any).electronAPI.login(),
  getPRs: () => (window as any).electronAPI.getPRs(),
  getReviewRequestedPRs: (teams: string[]) => (window as any).electronAPI.getReviewRequestedPRs(teams),
  openInBrowser: (url: string) => (window as any).electronAPI.openInBrowser(url),
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GitHubAPIProvider value={electronAPI}>
      <App />
    </GitHubAPIProvider>
  </React.StrictMode>
);
