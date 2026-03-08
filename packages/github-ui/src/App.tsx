import { useEffect, useState } from 'react';
import type { GitHubUser } from '@gh-dashboard/github-types';
import { useGitHubAPI } from './GitHubAPIContext';
import { LoginScreen } from './LoginScreen';
import { GhCliMissing } from './GhCliMissing';
import { Dashboard } from './Dashboard';
import { SettingsPage } from './SettingsPage';
import { useSettings } from './useSettings';
import { usePRData } from './usePRData';

type View = 'dashboard' | 'settings';

export function App() {
  const api = useGitHubAPI();
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [ghInstalled, setGhInstalled] = useState(true);
  const [view, setView] = useState<View>('dashboard');

  const { settings, updateSettings } = useSettings(user?.login ?? '');
  const prData = usePRData(api, settings.teamWhitelist);

  useEffect(() => {
    api.checkGhCli().then((installed) => {
      setGhInstalled(installed);
      if (!installed) {
        setChecking(false);
        return;
      }
      api.checkAuth()
        .then((u) => setUser(u))
        .finally(() => setChecking(false));
    });
  }, []);

  const handleLogin = (userData: GitHubUser) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
  };

  if (checking) return null;

  if (!ghInstalled) {
    return <GhCliMissing />;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (view === 'settings') {
    return (
      <SettingsPage
        settings={settings}
        onUpdateSettings={updateSettings}
        onBack={() => setView('dashboard')}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onOpenSettings={() => setView('settings')}
      settings={settings}
      prData={prData}
    />
  );
}
