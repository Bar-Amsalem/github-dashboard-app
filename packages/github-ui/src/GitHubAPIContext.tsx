import { createContext, useContext } from 'react';
import type { GitHubUser, PullRequest } from '@gh-dashboard/github-types';

export interface GitHubAPI {
  checkGhCli(): Promise<boolean>;
  checkAuth(): Promise<GitHubUser | null>;
  login(): Promise<GitHubUser>;
  getPRs(): Promise<PullRequest[]>;
  getReviewRequestedPRs(teams: string[]): Promise<PullRequest[]>;
  openInBrowser(url: string): Promise<void>;
}

const GitHubAPIContext = createContext<GitHubAPI | null>(null);

export const GitHubAPIProvider = GitHubAPIContext.Provider;

export function useGitHubAPI(): GitHubAPI {
  const api = useContext(GitHubAPIContext);
  if (!api) throw new Error('GitHubAPIProvider is required');
  return api;
}
