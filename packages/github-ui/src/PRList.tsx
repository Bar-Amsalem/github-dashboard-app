import type { PullRequest } from '@gh-dashboard/github-types';
import { useGitHubAPI } from './GitHubAPIContext';

interface Props {
  prs: PullRequest[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  emptyMessage: string;
  showAuthor?: boolean;
}

type MyReviewStatus = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING';

const MY_REVIEW_LABELS: Record<MyReviewStatus, string> = {
  APPROVED: 'You approved',
  CHANGES_REQUESTED: 'You requested changes',
  COMMENTED: 'You commented',
  PENDING: 'Awaiting your review',
};

const MY_REVIEW_CLASS: Record<MyReviewStatus, string> = {
  APPROVED: 'my-review approved',
  CHANGES_REQUESTED: 'my-review changes-requested',
  COMMENTED: 'my-review commented',
  PENDING: 'my-review pending',
};

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PRList({ prs, loading, error, onRetry, emptyMessage, showAuthor }: Props) {
  const api = useGitHubAPI();

  return (
    <main className="pr-list">
      {loading && <div className="loading">Loading pull requests...</div>}

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={onRetry}>Retry</button>
        </div>
      )}

      {!loading && !error && prs.length === 0 && (
        <div className="empty">
          <p>{emptyMessage}</p>
        </div>
      )}

      {prs.map((pr) => (
        <div key={pr.html_url} className="pr-card">
          <div className="pr-header">
            <span className={`pr-badge ${pr.draft ? 'draft' : 'open'}`}>
              {pr.draft ? 'Draft' : 'Open'}
            </span>
            <span className="pr-repo">{pr.repo_name}</span>
            <span className="pr-number">#{pr.number}</span>
            {showAuthor && pr.myReviewStatus && (
              <span className={MY_REVIEW_CLASS[pr.myReviewStatus]}>
                {MY_REVIEW_LABELS[pr.myReviewStatus]}
              </span>
            )}
            {!pr.myReviewStatus && showAuthor && (
              <span className="my-review pending">
                Awaiting your review
              </span>
            )}
            {showAuthor && pr.user && (
              <span className="pr-author">
                <img src={pr.user.avatar_url} alt={pr.user.login} className="pr-author-avatar" />
                {pr.user.login}
              </span>
            )}
          </div>
          <h3 className="pr-title">{pr.title}</h3>
          <div className="pr-status">
            {pr.reviews && (
              <div className="status-group">
                <span className="status-label">Reviews:</span>
                {pr.reviews.approved > 0 && (
                  <span className="status-chip approved">{pr.reviews.approved} approved</span>
                )}
                {pr.reviews.changesRequested > 0 && (
                  <span className="status-chip changes-requested">{pr.reviews.changesRequested} changes requested</span>
                )}
                {pr.reviews.commented > 0 && (
                  <span className="status-chip commented">{pr.reviews.commented} commented</span>
                )}
                {pr.reviews.pending > 0 && (
                  <span className="status-chip pending">{pr.reviews.pending} pending</span>
                )}
                {pr.reviews.approved === 0 && pr.reviews.changesRequested === 0 && pr.reviews.commented === 0 && pr.reviews.pending === 0 && (
                  <span className="status-chip no-reviews">no reviews</span>
                )}
              </div>
            )}
            {pr.checks && pr.checks.total > 0 && (
              <div className="status-group">
                <span className="status-label">Checks:</span>
                {pr.checks.success > 0 && (
                  <span className="status-chip checks-pass">{pr.checks.success} passed</span>
                )}
                {pr.checks.failure > 0 && (
                  <span className="status-chip checks-fail">{pr.checks.failure} failed</span>
                )}
                {pr.checks.pending > 0 && (
                  <span className="status-chip checks-pending">{pr.checks.pending} pending</span>
                )}
              </div>
            )}
          </div>
          <div className="pr-meta">
            <span>opened {timeAgo(pr.created_at)}</span>
            <span>updated {timeAgo(pr.updated_at)}</span>
            <button
              className="open-btn"
              onClick={() => api.openInBrowser(pr.html_url)}
            >
              Open in Browser
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
