// Coarser grouping than weatherCodes.ts's 12 display conditions — collapses
// WMO codes down to the handful of particle systems WeatherEffect actually
// renders. Matches HTC Sense's classic weather-animation set (rain, clear,
// clouds, snow, thunderstorm) rather than inventing conditions HTC never
// had — no fog effect; thunderstorm folds into 'rain' (no lightning
// flourish in v1). Fog's WMO codes (45, 48) fall through to 'none'.
export type WeatherEffectType = 'rain' | 'snow' | 'clouds' | 'none';

const RAIN_CODES  = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES  = new Set([71, 73, 75, 77, 85, 86]);
const CLOUD_CODES = new Set([3]);

export function getWeatherEffectType(code: number): WeatherEffectType {
  if (RAIN_CODES.has(code))  return 'rain';
  if (SNOW_CODES.has(code))  return 'snow';
  if (CLOUD_CODES.has(code)) return 'clouds';
  return 'none';
}
