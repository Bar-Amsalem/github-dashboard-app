export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
}

export interface ReviewSummary {
  approved: number;
  changesRequested: number;
  commented: number;
  pending: number;
}

export interface ChecksSummary {
  success: number;
  failure: number;
  pending: number;
  total: number;
}

export interface PullRequest {
  title: string;
  html_url: string;
  number: number;
  state: string;
  created_at: string;
  updated_at: string;
  draft: boolean;
  repo_name: string;
  user: { login: string; avatar_url: string };
  reviews?: ReviewSummary;
  checks?: ChecksSummary;
  myReviewStatus?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | null;
}

export interface UserSettings {
  repoWhitelist: string[];
  repoBlacklist: string[];
  teamWhitelist: string[];
  teamBlacklist: string[];
}

export interface IGitHubClient {
  isGhInstalled(): Promise<boolean>;
  isLoggedIn(): Promise<boolean>;
  login(): Promise<void>;
  getAuthToken(): Promise<string>;
  fetchUser(token: string): Promise<GitHubUser>;
  fetchUserPRs(): Promise<PullRequest[]>;
  fetchReviewRequestedPRs(teams: string[]): Promise<PullRequest[]>;
}
