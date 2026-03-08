import { useState, useEffect, useCallback, useRef } from 'react';
import type { PullRequest } from '@gh-dashboard/github-types';
import type { GitHubAPI } from './GitHubAPIContext';

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const STALE_CHECK_INTERVAL_MS = 60 * 1000; // check every minute

export interface PRDataSet {
  prs: PullRequest[];
  loading: boolean;
  error: string;
  lastUpdated: number | null;
}

export interface PRData {
  myPrs: PRDataSet;
  reviewPrs: PRDataSet;
  refreshMyPRs: () => Promise<void>;
  refreshReviewPRs: () => Promise<void>;
  refreshAll: () => void;
}

export function usePRData(api: GitHubAPI, teams: string[]): PRData {
  const [myPrs, setMyPrs] = useState<PullRequest[]>([]);
  const [myLoading, setMyLoading] = useState(true);
  const [myError, setMyError] = useState('');
  const [myLastUpdated, setMyLastUpdated] = useState<number | null>(null);

  const [reviewPrs, setReviewPrs] = useState<PullRequest[]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState('');
  const [reviewLastUpdated, setReviewLastUpdated] = useState<number | null>(null);

  const teamsRef = useRef(teams);
  teamsRef.current = teams;

  const fetchMyPRs = useCallback(async (background = false) => {
    if (!background) setMyLoading(true);
    setMyError('');
    try {
      const prs = await api.getPRs();
      setMyPrs(prs);
      setMyLastUpdated(Date.now());
    } catch (err) {
      if (!background) {
        setMyError(err instanceof Error ? err.message : 'Failed to fetch PRs');
      }
    } finally {
      if (!background) setMyLoading(false);
    }
  }, [api]);

  const fetchReviewPRs = useCallback(async (background = false) => {
    if (!background) setReviewLoading(true);
    setReviewError('');
    try {
      const prs = await api.getReviewRequestedPRs(teamsRef.current);
      setReviewPrs(prs);
      setReviewLastUpdated(Date.now());
    } catch (err) {
      if (!background) {
        setReviewError(err instanceof Error ? err.message : 'Failed to fetch review requests');
      }
    } finally {
      if (!background) setReviewLoading(false);
    }
  }, [api]);

  // Eager load both on mount
  useEffect(() => {
    fetchMyPRs();
    fetchReviewPRs();
  }, []);

  // Re-fetch review PRs when teams change
  const teamsKey = teams.join(',');
  const prevTeamsKey = useRef(teamsKey);
  useEffect(() => {
    if (prevTeamsKey.current !== teamsKey) {
      prevTeamsKey.current = teamsKey;
      fetchReviewPRs();
    }
  }, [teamsKey]);

  // Stale check interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (myLastUpdated && now - myLastUpdated > STALE_THRESHOLD_MS) {
        fetchMyPRs(true);
      }
      if (reviewLastUpdated && now - reviewLastUpdated > STALE_THRESHOLD_MS) {
        fetchReviewPRs(true);
      }
    }, STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [myLastUpdated, reviewLastUpdated, fetchMyPRs, fetchReviewPRs]);

  const refreshMyPRs = useCallback(() => fetchMyPRs(false), [fetchMyPRs]);
  const refreshReviewPRs = useCallback(() => fetchReviewPRs(false), [fetchReviewPRs]);
  const refreshAll = useCallback(() => {
    fetchMyPRs(false);
    fetchReviewPRs(false);
  }, [fetchMyPRs, fetchReviewPRs]);

  return {
    myPrs: { prs: myPrs, loading: myLoading, error: myError, lastUpdated: myLastUpdated },
    reviewPrs: { prs: reviewPrs, loading: reviewLoading, error: reviewError, lastUpdated: reviewLastUpdated },
    refreshMyPRs,
    refreshReviewPRs,
    refreshAll,
  };
}
