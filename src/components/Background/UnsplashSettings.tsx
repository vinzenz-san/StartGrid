import { useState } from 'react';
import { useBackground } from '../../contexts/BackgroundContext';
import { UnsplashConfig } from '../../types/background';
import { SettingsSlider } from '../shared/Form';
import './UnsplashSettings.css';

const TOPIC_CHIPS = [
  { label: 'Nature',        id: '6sMVjTLSkeQ' },
  { label: 'Architecture',  id: 'rnSKDHwwYUk' },
  { label: 'Travel',        id: 'Fzo3zuOHN6w' },
  { label: 'Minimal',       id: '_8zFHuhRhyo' },
  { label: 'Street',        id: 'xHxYTMHLgOc' },
  { label: 'Technology',    id: 'qPYsDzvJOYc' },
  { label: 'Wallpapers',    id: 'bo8jQKTaE0Y' },
];

const INTERVAL_OPTIONS = [
  { label: '15 min',  value: 900   },
  { label: '30 min',  value: 1800  },
  { label: '1 hour',  value: 3600  },
  { label: '4 hours', value: 14400 },
  { label: '12 hours',value: 43200 },
  { label: '24 hours',value: 86400 },
];

const SOURCE_TABS: { label: string; value: UnsplashConfig['source'] }[] = [
  { label: 'Topics',  value: 'topics' },
  { label: 'Search',  value: 'search' },
  { label: 'Random',  value: 'random' },
];

export default function UnsplashSettings() {
  const { config, setConfig, unsplash } = useBackground();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  if (config.mode !== 'unsplash') return null;
  const uc = config as UnsplashConfig;

  const update = (patch: Partial<UnsplashConfig>) =>
    setConfig({ ...uc, ...patch });

  const source    = uc.source ?? 'topics';
  const topics    = uc.topics ?? [];
  const interval  = uc.rotationInterval ?? 900;
  const showAttr  = uc.showAttribution ?? true;

  const toggleTopic = (id: string) => {
    const next = topics.includes(id)
      ? topics.filter(t => t !== id)
      : [...topics, id];
    update({ topics: next });
  };

  return (
    <div className="sg-usp">

      {/* API Key */}
      <section className="settings-section">
        <div className="settings-section-label">Unsplash API Key</div>
        <div className="sg-usp-key-row">
          <input
            className="sg-usp-input"
            type={apiKeyVisible ? 'text' : 'password'}
            placeholder="Paste your Access Key…"
            value={uc.apiKey ?? ''}
            onChange={e => update({ apiKey: e.target.value.trim() })}
            spellCheck={false}
          />
          <button
            className="sg-usp-eye"
            onClick={() => setApiKeyVisible(v => !v)}
            title={apiKeyVisible ? 'Hide' : 'Show'}
          >
            {apiKeyVisible ? '🙈' : '👁'}
          </button>
        </div>
        <p className="bg-sync-warning">
          Get a free key at unsplash.com/developers — register an app, copy the Access Key.
        </p>
      </section>

      {/* Source tabs */}
      <section className="settings-section">
        <div className="settings-section-label">Source</div>
        <div className="sg-usp-tabs">
          {SOURCE_TABS.map(t => (
            <button
              key={t.value}
              className={`sg-usp-tab${source === t.value ? ' sg-usp-tab--active' : ''}`}
              onClick={() => update({ source: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>

        {source === 'topics' && (
          <div className="sg-usp-chips">
            {TOPIC_CHIPS.map(chip => (
              <button
                key={chip.id}
                className={`sg-usp-chip${topics.includes(chip.id) ? ' sg-usp-chip--active' : ''}`}
                onClick={() => toggleTopic(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {source === 'search' && (
          <input
            className="sg-usp-input sg-usp-input--search"
            type="text"
            placeholder="e.g. dark forest, cyberpunk city…"
            value={uc.query ?? ''}
            onChange={e => update({ query: e.target.value })}
          />
        )}

        {source === 'random' && (
          <p className="bg-sync-warning" style={{ marginTop: 6 }}>
            A random photo from Unsplash's editorial feed.
          </p>
        )}
      </section>

      {/* Rotation interval */}
      <section className="settings-section">
        <div className="settings-section-label">Change photo every</div>
        <div className="sg-usp-interval-row">
          {INTERVAL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`sg-usp-interval-btn${interval === opt.value ? ' sg-usp-interval-btn--active' : ''}`}
              onClick={() => update({ rotationInterval: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dimming is rendered by BackgroundEditor for all modes */}

      {/* Attribution toggle */}
      <section className="settings-section">
        <div className="sg-usp-attr-row">
          <label className="sg-usp-attr-label">Show attribution</label>
          <button
            className={`sg-usp-toggle${showAttr ? ' sg-usp-toggle--on' : ''}`}
            onClick={() => update({ showAttribution: !showAttr })}
          >
            {showAttr ? 'On' : 'Off'}
          </button>
        </div>

        {/* Current attribution preview */}
        {unsplash.attribution && (
          <p className="sg-usp-attr-preview">
            Current: <em>{unsplash.attribution.photographerName}</em> on Unsplash
          </p>
        )}
      </section>

      {/* Fetch controls */}
      <section className="settings-section">
        <div className="sg-usp-fetch-row">
          <button
            className="bg-btn sg-usp-fetch-btn"
            onClick={unsplash.fetchNow}
            disabled={unsplash.isFetching || !uc.apiKey}
          >
            {unsplash.isFetching ? 'Loading…' : 'Next photo ↺'}
          </button>
        </div>
        {unsplash.error && (
          <p className="sg-usp-error">{unsplash.error}</p>
        )}
        {!uc.apiKey && (
          <p className="sg-usp-error">Enter an API key above to start.</p>
        )}
      </section>

    </div>
  );
}
