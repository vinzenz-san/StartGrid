import { useEffect, useRef, useState } from 'react';
import type { WeatherData } from '../../../types/widget';
import { SettingsRow, SegmentedControl, SettingsSwitch, ActionButton } from '../../shared/Form';
import { useSettings } from '../../../contexts/SettingsContext';
import { useWeather } from '../../../hooks/useWeather';
import { geocodeCity, type GeocodeResult } from '../../../lib/openMeteoApi';
import { getWeatherCodeInfo } from '../../../lib/weatherCodes';
import './Weather.css';

const SEARCH_DEBOUNCE_MS = 450;

// ── Settings ───────────────────────────────────────────────────────────────

interface SettingsProps {
  data: WeatherData;
  onUpdateData: (patch: Partial<WeatherData>) => void;
}

export function WeatherSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const units            = data.units ?? 'metric';
  const showFeelsLike     = data.showFeelsLike ?? true;
  const showLocationName  = data.showLocationName ?? true;

  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const r = await geocodeCity(q);
        setResults(r);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const selectResult = (r: GeocodeResult) => {
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
    onUpdateData({
      locationName: label,
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone,
    });
    setQuery('');
    setResults([]);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocateError(t('widget.weather.locationDenied'));
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        onUpdateData({
          locationName: undefined,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timezone: undefined,
        });
      },
      () => {
        setLocating(false);
        setLocateError(t('widget.weather.locationDenied'));
      },
      { timeout: 10_000 },
    );
  };

  return (
    <div className="sg-weather-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label={t('widget.weather.searchCity')}>
        <input
          className="sg-weather-input"
          placeholder={t('widget.weather.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onDragStart={e => e.stopPropagation()}
        />
      </SettingsRow>

      {searching && <div className="sg-weather-search-hint">{t('widget.weather.locating')}</div>}
      {searchError && <div className="sg-weather-search-error">{searchError}</div>}

      {results.length > 0 && (
        <div className="sg-weather-results">
          {results.map((r, i) => (
            <button
              key={`${r.latitude}-${r.longitude}-${i}`}
              className="sg-weather-result"
              onClick={() => selectResult(r)}
            >
              {[r.name, r.admin1, r.country].filter(Boolean).join(', ')}
            </button>
          ))}
        </div>
      )}

      {data.locationName && (
        <div className="sg-weather-current-location">{data.locationName}</div>
      )}

      <ActionButton variant="ghost" onClick={useCurrentLocation} disabled={locating}>
        {locating ? t('widget.weather.locating') : t('widget.weather.useCurrentLocation')}
      </ActionButton>
      {locateError && <div className="sg-weather-search-error">{locateError}</div>}

      <SettingsRow label={t('widget.weather.units')}>
        <SegmentedControl
          options={[
            { value: 'metric',   label: t('widget.weather.unitsMetric') },
            { value: 'imperial', label: t('widget.weather.unitsImperial') },
          ]}
          value={units}
          onChange={v => onUpdateData({ units: v as WeatherData['units'] })}
        />
      </SettingsRow>

      <SettingsRow label={t('widget.weather.showFeelsLike')}>
        <SettingsSwitch checked={showFeelsLike} onChange={v => onUpdateData({ showFeelsLike: v })} />
      </SettingsRow>

      <SettingsRow label={t('widget.weather.showLocationName')}>
        <SettingsSwitch checked={showLocationName} onChange={v => onUpdateData({ showLocationName: v })} />
      </SettingsRow>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────

interface Props {
  data: WeatherData;
  onUpdateData: (patch: Partial<WeatherData>) => void;
}

export default function Weather({ data }: Props) {
  const { t } = useSettings();
  const units           = data.units ?? 'metric';
  const showFeelsLike    = data.showFeelsLike ?? true;
  const showLocationName = data.showLocationName ?? true;

  const { weather, isFetching, error, refetch } = useWeather({
    latitude: data.latitude,
    longitude: data.longitude,
    units,
  });

  const hasLocation = data.latitude !== undefined && data.longitude !== undefined;
  const unitSuffix = units === 'imperial' ? '°F' : '°C';

  if (!hasLocation) {
    return (
      <div className="sg-weather sg-weather--empty">
        <span className="sg-weather-empty-text">{t('widget.weather.noLocation')}</span>
        <span className="sg-weather-empty-hint">{t('widget.weather.openSettings')}</span>
      </div>
    );
  }

  if (isFetching && !weather) {
    return (
      <div className="sg-weather sg-weather--empty">
        <span className="sg-weather-empty-text">{t('widget.weather.loading')}</span>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="sg-weather sg-weather--empty">
        <span className="sg-weather-empty-text">{t('widget.weather.error')}</span>
        <ActionButton variant="ghost" onClick={refetch}>{t('widget.weather.retry')}</ActionButton>
      </div>
    );
  }

  if (!weather) return null;

  const info = getWeatherCodeInfo(weather.weatherCode);
  const temp = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(weather.temperature);
  const feelsLike = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(weather.feelsLike);

  return (
    <div className="sg-weather">
      <div className="sg-weather-icon">{info.icon}</div>
      <div className="sg-weather-main">
        <div className="sg-weather-temp">{temp}{unitSuffix}</div>
        <div className="sg-weather-condition">{t(info.labelKey)}</div>
        {showFeelsLike && (
          <div className="sg-weather-feelslike">{t('widget.weather.feelsLike', { value: `${feelsLike}${unitSuffix}` })}</div>
        )}
        {showLocationName && data.locationName && (
          <div className="sg-weather-location">{data.locationName}</div>
        )}
      </div>
    </div>
  );
}
