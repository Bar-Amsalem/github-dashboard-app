import { useState } from 'react';
import type { UserSettings } from '@gh-dashboard/github-types';

interface Props {
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onBack: () => void;
}

function TagList({
  label,
  description,
  placeholder,
  items,
  onAdd,
  onRemove,
  emptyHint,
}: {
  label: string;
  description: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  emptyHint: string;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
    }
    setInput('');
  };

  return (
    <div className="settings-section">
      <h3>{label}</h3>
      <p className="settings-desc">{description}</p>
      <div className="team-input-row">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="team-input"
        />
        <button className="add-team-btn" onClick={handleAdd}>Add</button>
      </div>
      {items.length > 0 ? (
        <div className="team-list">
          {items.map(item => (
            <div key={item} className="team-tag">
              <span>{item}</span>
              <button className="remove-team-btn" onClick={() => onRemove(item)}>&times;</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="settings-hint">{emptyHint}</p>
      )}
    </div>
  );
}

export function SettingsPage({ settings, onUpdateSettings, onBack }: Props) {
  const addTo = (key: keyof UserSettings, value: string) => {
    const current = settings[key];
    if (!current.includes(value)) {
      onUpdateSettings({ [key]: [...current, value] });
    }
  };

  const removeFrom = (key: keyof UserSettings, value: string) => {
    onUpdateSettings({ [key]: settings[key].filter(v => v !== value) });
  };

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <button className="settings-back-btn" onClick={onBack}>&larr; Back</button>
        <h2>Settings</h2>
      </header>
      <div className="settings-page-content">
        <div className="settings-group">
          <h2 className="settings-group-title">Repository Filters</h2>
          <p className="settings-group-desc">
            Control which repositories appear in your dashboard. If a whitelist is configured, only those repos are shown. Blacklisted repos are always hidden.
          </p>
          <TagList
            label="Whitelisted Repos"
            description="Only show PRs from these repositories. Leave empty to show all."
            placeholder="e.g. wix-private/my-repo"
            items={settings.repoWhitelist}
            onAdd={v => addTo('repoWhitelist', v)}
            onRemove={v => removeFrom('repoWhitelist', v)}
            emptyHint="No repo whitelist configured. All repositories will be shown."
          />
          <TagList
            label="Blacklisted Repos"
            description="Always hide PRs from these repositories."
            placeholder="e.g. wix-private/noisy-repo"
            items={settings.repoBlacklist}
            onAdd={v => addTo('repoBlacklist', v)}
            onRemove={v => removeFrom('repoBlacklist', v)}
            emptyHint="No repos blacklisted."
          />
        </div>

        <div className="settings-group">
          <h2 className="settings-group-title">Team Filters</h2>
          <p className="settings-group-desc">
            Configure which teams' review requests appear in your Review Requests tab. Whitelisted teams will be included in queries. Blacklisted teams' PRs will be hidden from results.
          </p>
          <TagList
            label="Included Teams"
            description="Add GitHub teams (org/team-slug) whose review requests should appear in your Review Requests tab."
            placeholder="e.g. wix-private/ot-multilingual-bed"
            items={settings.teamWhitelist}
            onAdd={v => addTo('teamWhitelist', v)}
            onRemove={v => removeFrom('teamWhitelist', v)}
            emptyHint="No teams configured. Only PRs with your personal review requested will be shown."
          />
          <TagList
            label="Excluded Teams"
            description="Hide review requests from these teams even if they match other filters."
            placeholder="e.g. wix-private/noisy-team"
            items={settings.teamBlacklist}
            onAdd={v => addTo('teamBlacklist', v)}
            onRemove={v => removeFrom('teamBlacklist', v)}
            emptyHint="No teams excluded."
          />
        </div>
      </div>
    </div>
  );
}
