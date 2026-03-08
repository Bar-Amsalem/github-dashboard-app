import { useState, useCallback } from 'react';
import type { UserSettings } from '@gh-dashboard/github-types';

const DEFAULT_USER_SETTINGS: UserSettings = {
  repoWhitelist: [],
  repoBlacklist: [],
  teamWhitelist: [],
  teamBlacklist: [],
};

const SETTINGS_KEY_PREFIX = 'gh-dashboard:settings:';
const LEGACY_TEAMS_KEY = 'gh-dashboard:reviewer-teams';

function storageKey(userLogin: string): string {
  return `${SETTINGS_KEY_PREFIX}${userLogin}`;
}

function migrateLegacyTeams(): string[] {
  try {
    const stored = localStorage.getItem(LEGACY_TEAMS_KEY);
    if (stored) {
      localStorage.removeItem(LEGACY_TEAMS_KEY);
      return JSON.parse(stored);
    }
  } catch { /* ignore */ }
  return [];
}

function loadSettings(userLogin: string): UserSettings {
  try {
    const stored = localStorage.getItem(storageKey(userLogin));
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_USER_SETTINGS, ...parsed };
    }
    // Migrate legacy teams data if no per-user settings exist yet
    const legacyTeams = migrateLegacyTeams();
    if (legacyTeams.length > 0) {
      const settings = { ...DEFAULT_USER_SETTINGS, teamWhitelist: legacyTeams };
      persistSettings(userLogin, settings);
      return settings;
    }
    return { ...DEFAULT_USER_SETTINGS };
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

function persistSettings(userLogin: string, settings: UserSettings) {
  localStorage.setItem(storageKey(userLogin), JSON.stringify(settings));
}

export function useSettings(userLogin: string) {
  const [settings, setSettingsState] = useState<UserSettings>(() => loadSettings(userLogin));

  const setSettings = useCallback((updated: UserSettings) => {
    setSettingsState(updated);
    persistSettings(userLogin, updated);
  }, [userLogin]);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...patch };
      persistSettings(userLogin, updated);
      return updated;
    });
  }, [userLogin]);

  return { settings, setSettings, updateSettings };
}
