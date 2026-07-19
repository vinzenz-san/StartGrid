import { useState } from 'react';
import { useBackground } from '../../contexts/BackgroundContext';
import { useSettings } from '../../contexts/SettingsContext';
import { UnsplashConfig } from '../../types/background';
import { SettingsRow, SettingsSwitch } from '../shared/Form';
import { DetailedSettings } from '../Layout/DetailedSettings';
import './UnsplashSettings.css';

export default function UnsplashSettings() {
  const { config, setConfig, unsplash } = useBackground();
  const { t } = useSettings();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  if (config.mode !== 'unsplash') return null;
  const uc = config as UnsplashConfig;

  const TOPIC_CHIPS = [
    { label: t('background.unsplash.topic.nature'),       id: '6sMVjTLSkeQ' },
    { label: t('background.unsplash.topic.architecture'), id: 'rnSKDHwwYUk' },
    { label: t('background.unsplash.topic.travel'),       id: 'Fzo3zuOHN6w' },
    { label: t('background.unsplash.topic.minimal'),      id: '_8zFHuhRhyo' },
    { label: t('background.unsplash.topic.street'),       id: 'xHxYTMHLgOc' },
    { label: t('background.unsplash.topic.technology'),   id: 'qPYsDzvJOYc' },
    { label: t('background.unsplash.topic.wallpapers'),   id: 'bo8jQKTaE0Y' },
  ];

  const INTERVAL_OPTIONS = [
    { label: t('background.unsplash.interval.15min'),   value: 900   },
    { label: t('background.unsplash.interval.30min'),   value: 1800  },
    { label: t('background.unsplash.interval.1hour'),   value: 3600  },
    { label: t('background.unsplash.interval.4hours'),  value: 14400 },
    { label: t('background.unsplash.interval.12hours'), value: 43200 },
    { label: t('background.unsplash.interval.24hours'), value: 86400 },
  ];

  const SOURCE_TABS: { label: string; value: UnsplashConfig['source'] }[] = [
    { label: t('background.unsplash.sourceTopics'), value: 'topics' },
    { label: t('background.unsplash.sourceSearch'), value: 'search' },
    { label: t('background.unsplash.sourceRandom'), value: 'random' },
  ];

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
        <div className="settings-section-label">{t('background.unsplash.apiKeyLabel')}</div>
        <div className="sg-usp-key-row">
          <input
            className="sg-usp-input"
            type={apiKeyVisible ? 'text' : 'password'}
            placeholder={t('background.unsplash.apiKeyPlaceholder')}
            value={uc.apiKey ?? ''}
            onChange={e => update({ apiKey: e.target.value.trim() })}
            spellCheck={false}
          />
          <button
            className="sg-usp-eye"
            onClick={() => setApiKeyVisible(v => !v)}
            title={apiKeyVisible ? t('background.unsplash.hide') : t('background.unsplash.show')}
          >
            {apiKeyVisible ? '🙈' : '👁'}
          </button>
        </div>
        <p className="bg-sync-warning">
          {t('background.unsplash.apiKeyHelp')}
        </p>
      </section>

      {/* Source tabs */}
      <section className="settings-section">
        <div className="settings-section-label">{t('background.unsplash.source')}</div>
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
            placeholder={t('background.unsplash.searchPlaceholder')}
            value={uc.query ?? ''}
            onChange={e => update({ query: e.target.value })}
          />
        )}

        {source === 'random' && (
          <p className="bg-sync-warning" style={{ marginTop: 6 }}>
            {t('background.unsplash.randomNote')}
          </p>
        )}
      </section>

      {/* Luminosity is rendered by BackgroundEditor for all modes */}

      {/* Rotation interval + attribution — advanced */}
      <DetailedSettings>
        <section className="settings-section">
          <div className="settings-section-label">{t('background.unsplash.changePhotoEvery')}</div>
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

        <section className="settings-section">
          <SettingsRow label={t('background.unsplash.showAttribution')}>
            <SettingsSwitch checked={showAttr} onChange={v => update({ showAttribution: v })} />
          </SettingsRow>

          {/* Current attribution preview */}
          {unsplash.attribution && (
            <p className="sg-usp-attr-preview">
              {t('background.unsplash.currentAttributionPrefix')} <em>{unsplash.attribution.photographerName}</em> {t('background.unsplash.currentAttributionSuffix')}
            </p>
          )}
        </section>
      </DetailedSettings>

      {/* Fetch controls */}
      <section className="settings-section">
        <div className="sg-usp-fetch-row">
          <button
            className="bg-btn sg-usp-fetch-btn"
            onClick={unsplash.fetchNow}
            disabled={unsplash.isFetching || !uc.apiKey}
          >
            {unsplash.isFetching ? t('background.unsplash.loading') : t('background.unsplash.nextPhoto')}
          </button>
        </div>
        {unsplash.error && (
          <p className="sg-usp-error">{unsplash.error}</p>
        )}
        {!uc.apiKey && (
          <p className="sg-usp-error">{t('background.unsplash.enterApiKey')}</p>
        )}
      </section>

    </div>
  );
}
