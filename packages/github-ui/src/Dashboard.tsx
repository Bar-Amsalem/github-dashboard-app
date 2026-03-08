import { useState, useMemo } from 'react';
import type { GitHubUser, PullRequest, UserSettings } from '@gh-dashboard/github-types';
import { PRList } from './PRList';
import type { PRData } from './usePRData';

interface Props {
  user: GitHubUser;
  onLogout: () => void;
  onOpenSettings: () => void;
  settings: UserSettings;
  prData: PRData;
}

type Tab = 'my-prs' | 'review-requests';
type SortField = 'updated' | 'created' | 'title' | 'author';
type SortDir = 'asc' | 'desc';

function filterPRsByRepo(prs: PullRequest[], settings: UserSettings): PullRequest[] {
  let filtered = prs;
  if (settings.repoWhitelist.length > 0) {
    filtered = filtered.filter(pr => settings.repoWhitelist.includes(pr.repo_name));
  }
  if (settings.repoBlacklist.length > 0) {
    filtered = filtered.filter(pr => !settings.repoBlacklist.includes(pr.repo_name));
  }
  return filtered;
}

function sortPRs(prs: PullRequest[], field: SortField, dir: SortDir): PullRequest[] {
  const sorted = [...prs].sort((a, b) => {
    if (field === 'title') return a.title.localeCompare(b.title);
    if (field === 'author') return a.user.login.localeCompare(b.user.login);
    if (field === 'created') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function shortRepoName(repoName: string): string {
  const parts = repoName.split('/');
  return parts.length > 1 ? parts[parts.length - 1] : repoName;
}

function useToggleSet() {
  const [set, setSet] = useState<Set<string>>(new Set());
  const toggle = (value: string) => {
    setSet(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };
  const clear = () => setSet(new Set());
  return { set, toggle, clear };
}

const STATUS_FILTER_LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes Requested',
  COMMENTED: 'Commented',
  PENDING: 'Awaiting Review',
};

const SORT_LABELS: Record<SortField, string> = {
  updated: 'Updated',
  created: 'Created',
  title: 'Title',
  author: 'Author',
};

export function Dashboard({ user, onLogout, onOpenSettings, settings, prData }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('my-prs');
  const selectedRepos = useToggleSet();
  const selectedAuthors = useToggleSet();
  const selectedStatuses = useToggleSet();
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleRefresh = () => {
    if (activeTab === 'my-prs') prData.refreshMyPRs();
    else prData.refreshReviewPRs();
  };

  const toggleSortField = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredMyPrs = useMemo(
    () => filterPRsByRepo(prData.myPrs.prs, settings),
    [prData.myPrs.prs, settings],
  );
  const settingsFilteredReviewPrs = useMemo(
    () => filterPRsByRepo(prData.reviewPrs.prs, settings),
    [prData.reviewPrs.prs, settings],
  );

  // Unique repos from review PRs for filter tags, with PR counts
  const reviewRepos = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pr of settingsFilteredReviewPrs) {
      counts.set(pr.repo_name, (counts.get(pr.repo_name) || 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([repo, count]) => ({ repo, count }));
  }, [settingsFilteredReviewPrs]);

  // Unique authors from review PRs
  const reviewAuthors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pr of settingsFilteredReviewPrs) {
      const login = pr.user.login;
      counts.set(login, (counts.get(login) || 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([author, count]) => ({ author, count }));
  }, [settingsFilteredReviewPrs]);

  // Unique review statuses from review PRs
  const reviewStatuses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pr of settingsFilteredReviewPrs) {
      const status = pr.myReviewStatus ?? 'PENDING';
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, count]) => ({ status, count }));
  }, [settingsFilteredReviewPrs]);

  // Apply in-memory filters then sort
  const filteredReviewPrs = useMemo(() => {
    let prs = settingsFilteredReviewPrs;
    if (selectedRepos.set.size > 0) {
      prs = prs.filter(pr => selectedRepos.set.has(pr.repo_name));
    }
    if (selectedAuthors.set.size > 0) {
      prs = prs.filter(pr => selectedAuthors.set.has(pr.user.login));
    }
    if (selectedStatuses.set.size > 0) {
      prs = prs.filter(pr => selectedStatuses.set.has(pr.myReviewStatus ?? 'PENDING'));
    }
    return sortPRs(prs, sortField, sortDir);
  }, [settingsFilteredReviewPrs, selectedRepos.set, selectedAuthors.set, selectedStatuses.set, sortField, sortDir]);

  // Sort my PRs too
  const sortedMyPrs = useMemo(
    () => sortPRs(filteredMyPrs, sortField, sortDir),
    [filteredMyPrs, sortField, sortDir],
  );

  const hasActiveFilters = selectedRepos.set.size > 0 || selectedAuthors.set.size > 0 || selectedStatuses.set.size > 0;
  const clearAllFilters = () => { selectedRepos.clear(); selectedAuthors.clear(); selectedStatuses.clear(); };

  const currentData = activeTab === 'my-prs' ? prData.myPrs : prData.reviewPrs;
  const isLoading = currentData.loading;

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-left">
          <div className="tab-bar">
            <button
              className={`tab ${activeTab === 'my-prs' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-prs')}
            >
              My PRs
            </button>
            <button
              className={`tab ${activeTab === 'review-requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('review-requests')}
            >
              Review Requests
            </button>
          </div>
        </div>
        <div className="header-right">
          <div className="sort-controls">
            {(Object.keys(SORT_LABELS) as SortField[]).map(field => (
              <button
                key={field}
                className={`sort-btn ${sortField === field ? 'active' : ''}`}
                onClick={() => toggleSortField(field)}
              >
                {SORT_LABELS[field]}
                {sortField === field && (
                  <span className="sort-arrow">{sortDir === 'desc' ? '\u2193' : '\u2191'}</span>
                )}
              </button>
            ))}
          </div>
          <button className="settings-btn" onClick={onOpenSettings} title="Settings">
            &#9881;
          </button>
          <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
            Refresh
          </button>
          <div className="user-info">
            <img src={user.avatar_url} alt={user.login} className="avatar" />
            <span>{user.name || user.login}</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {activeTab === 'my-prs' && (
        <>
          <PRList
            prs={sortedMyPrs}
            loading={prData.myPrs.loading}
            error={prData.myPrs.error}
            onRetry={prData.refreshMyPRs}
            emptyMessage="No open pull requests found."
          />
          <footer className="footer">
            <span>{sortedMyPrs.length} open pull request{sortedMyPrs.length !== 1 ? 's' : ''}</span>
            {prData.myPrs.lastUpdated && (
              <span className="last-updated">Updated {formatLastUpdated(prData.myPrs.lastUpdated)}</span>
            )}
          </footer>
        </>
      )}

      {activeTab === 'review-requests' && (
        <>
          {!prData.reviewPrs.loading && (reviewRepos.length > 1 || reviewAuthors.length > 1 || reviewStatuses.length > 0) && (
            <div className="filter-bar">
              {reviewStatuses.length > 0 && (
                <div className="filter-row">
                  <span className="filter-label">Status</span>
                  {reviewStatuses.map(({ status, count }) => (
                    <button
                      key={status}
                      className={`filter-tag status-filter-tag ${status.toLowerCase().replace('_', '-')} ${selectedStatuses.set.has(status) ? 'selected' : ''}`}
                      onClick={() => selectedStatuses.toggle(status)}
                    >
                      {STATUS_FILTER_LABELS[status] ?? status}
                      <span className="filter-tag-count">{count}</span>
                    </button>
                  ))}
                </div>
              )}
              {reviewRepos.length > 1 && (
                <div className="filter-row">
                  <span className="filter-label">Repos</span>
                  {reviewRepos.map(({ repo, count }) => (
                    <button
                      key={repo}
                      className={`filter-tag ${selectedRepos.set.has(repo) ? 'selected' : ''}`}
                      onClick={() => selectedRepos.toggle(repo)}
                      title={repo}
                    >
                      {shortRepoName(repo)}
                      <span className="filter-tag-count">{count}</span>
                    </button>
                  ))}
                </div>
              )}
              {reviewAuthors.length > 1 && (
                <div className="filter-row">
                  <span className="filter-label">Authors</span>
                  {reviewAuthors.map(({ author, count }) => (
                    <button
                      key={author}
                      className={`filter-tag ${selectedAuthors.set.has(author) ? 'selected' : ''}`}
                      onClick={() => selectedAuthors.toggle(author)}
                    >
                      {author}
                      <span className="filter-tag-count">{count}</span>
                    </button>
                  ))}
                </div>
              )}
              {hasActiveFilters && (
                <button className="filter-clear-all" onClick={clearAllFilters}>
                  Clear all filters
                </button>
              )}
            </div>
          )}
          <PRList
            prs={filteredReviewPrs}
            loading={prData.reviewPrs.loading}
            error={prData.reviewPrs.error}
            onRetry={prData.refreshReviewPRs}
            emptyMessage="No pull requests waiting for your review."
            showAuthor
          />
          <footer className="footer">
            <span>{filteredReviewPrs.length} PR{filteredReviewPrs.length !== 1 ? 's' : ''} awaiting review</span>
            {prData.reviewPrs.lastUpdated && (
              <span className="last-updated">Updated {formatLastUpdated(prData.reviewPrs.lastUpdated)}</span>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
