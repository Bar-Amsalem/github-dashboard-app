import { execFile } from 'child_process';
import { promisify } from 'util';
import type { IGitHubClient, GitHubUser, PullRequest, ReviewSummary, ChecksSummary } from '@gh-dashboard/github-types';

const execFileAsync = promisify(execFile);

interface ReviewResult {
  summary: ReviewSummary;
  viewerStatus: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | null;
}

async function fetchReviews(owner: string, repo: string, prNumber: number, viewerLogin?: string): Promise<ReviewResult> {
  try {
    const { stdout } = await execFileAsync('gh', [
      'api', `/repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100`,
      '-H', 'Accept: application/vnd.github+json',
      '--paginate',
    ]);
    const reviews: { state: string; user: { login: string } }[] =
      stdout.trim().split('\n').filter(Boolean).flatMap(line => JSON.parse(line));

    const latestByUser = new Map<string, string>();
    for (const r of reviews) {
      latestByUser.set(r.user.login, r.state);
    }

    const summary: ReviewSummary = { approved: 0, changesRequested: 0, commented: 0, pending: 0 };
    for (const state of latestByUser.values()) {
      if (state === 'APPROVED') summary.approved++;
      else if (state === 'CHANGES_REQUESTED') summary.changesRequested++;
      else if (state === 'COMMENTED') summary.commented++;
      else if (state === 'PENDING') summary.pending++;
    }

    let viewerStatus: ReviewResult['viewerStatus'] = null;
    if (viewerLogin) {
      const state = latestByUser.get(viewerLogin);
      if (state === 'APPROVED' || state === 'CHANGES_REQUESTED' || state === 'COMMENTED' || state === 'PENDING') {
        viewerStatus = state;
      }
    }

    return { summary, viewerStatus };
  } catch {
    return { summary: { approved: 0, changesRequested: 0, commented: 0, pending: 0 }, viewerStatus: null };
  }
}

async function fetchChecks(owner: string, repo: string, prNumber: number): Promise<ChecksSummary> {
  try {
    const { stdout: prStdout } = await execFileAsync('gh', [
      'api', `/repos/${owner}/${repo}/pulls/${prNumber}`,
      '--jq', '.head.sha',
      '-H', 'Accept: application/vnd.github+json',
    ]);
    const sha = prStdout.trim();

    // Fetch check runs (Actions, third-party checks)
    const { stdout: checksStdout } = await execFileAsync('gh', [
      'api', `/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`,
      '-H', 'Accept: application/vnd.github+json',
      '--paginate',
    ]);
    const checkPages: { check_runs: { conclusion: string | null; status: string }[] }[] =
      checksStdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    const runs = checkPages.flatMap(page => page.check_runs || []);

    // Fetch commit statuses (legacy status API)
    const { stdout: statusStdout } = await execFileAsync('gh', [
      'api', `/repos/${owner}/${repo}/commits/${sha}/status`,
      '-H', 'Accept: application/vnd.github+json',
    ]);
    const statusData = JSON.parse(statusStdout);
    const statuses: { state: string }[] = statusData.statuses || [];

    const summary: ChecksSummary = { success: 0, failure: 0, pending: 0, total: runs.length + statuses.length };
    for (const run of runs) {
      if (run.status !== 'completed') summary.pending++;
      else if (run.conclusion === 'success') summary.success++;
      else summary.failure++;
    }
    for (const s of statuses) {
      if (s.state === 'success') summary.success++;
      else if (s.state === 'pending') summary.pending++;
      else summary.failure++;
    }
    return summary;
  } catch {
    return { success: 0, failure: 0, pending: 0, total: 0 };
  }
}

export class GhCliClient implements IGitHubClient {
  private viewerLogin: string | null = null;

  private async getViewerLogin(): Promise<string> {
    if (!this.viewerLogin) {
      const { stdout } = await execFileAsync('gh', ['api', '/user', '--jq', '.login']);
      this.viewerLogin = stdout.trim();
    }
    return this.viewerLogin;
  }

  async isGhInstalled(): Promise<boolean> {
    try {
      await execFileAsync('gh', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await execFileAsync('gh', ['auth', 'status']);
      return true;
    } catch {
      return false;
    }
  }

  async login(): Promise<void> {
    await execFileAsync('gh', ['auth', 'login', '--web', '-s', 'read:user,repo']);
  }

  async getAuthToken(): Promise<string> {
    const { stdout } = await execFileAsync('gh', ['auth', 'token']);
    return stdout.trim();
  }

  async fetchUser(_token: string): Promise<GitHubUser> {
    const { stdout } = await execFileAsync('gh', [
      'api', '/user',
      '-H', 'Accept: application/vnd.github+json',
    ]);
    return JSON.parse(stdout);
  }

  private async searchPRs(query: string): Promise<PullRequest[]> {
    const { stdout } = await execFileAsync('gh', [
      'api', '/search/issues',
      '-X', 'GET',
      '-f', `q=${query}`,
      '-f', 'sort=updated',
      '-f', 'order=desc',
      '-f', 'per_page=50',
      '-H', 'Accept: application/vnd.github+json',
    ]);

    const data = JSON.parse(stdout);
    return (data.items || []).map((item: any) => ({
      ...item,
      repo_name: item.repository_url?.replace('https://api.github.com/repos/', ''),
    }));
  }

  private async enrichPRs(prs: PullRequest[], viewerLogin?: string): Promise<void> {
    await Promise.all(
      prs.map(async (pr) => {
        if (!pr.repo_name) return;
        const [owner, repo] = pr.repo_name.split('/');
        const [reviewResult, checks] = await Promise.all([
          fetchReviews(owner, repo, pr.number, viewerLogin),
          fetchChecks(owner, repo, pr.number),
        ]);
        pr.reviews = reviewResult.summary;
        pr.checks = checks;
        if (viewerLogin) {
          pr.myReviewStatus = reviewResult.viewerStatus;
        }
      })
    );
  }

  async fetchUserPRs(): Promise<PullRequest[]> {
    const prs = await this.searchPRs('is:pr is:open author:@me');
    await this.enrichPRs(prs);
    return prs;
  }

  async fetchReviewRequestedPRs(teams: string[]): Promise<PullRequest[]> {
    const queries = ['is:pr is:open review-requested:@me'];
    for (const team of teams) {
      queries.push(`is:pr is:open team-review-requested:${team}`);
    }

    const results = await Promise.all(queries.map(q => this.searchPRs(q)));
    const seen = new Set<string>();
    const prs: PullRequest[] = [];
    for (const batch of results) {
      for (const pr of batch) {
        if (!seen.has(pr.html_url)) {
          seen.add(pr.html_url);
          prs.push(pr);
        }
      }
    }

    prs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    const viewerLogin = await this.getViewerLogin();
    await this.enrichPRs(prs, viewerLogin);
    return prs;
  }
}
