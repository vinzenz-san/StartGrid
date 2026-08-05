// Frankfurter (api.frankfurter.dev) — free, no API key, ECB-sourced daily
// exchange rates. Sends a permissive CORS header (verified: `Access-Control-
// Allow-Origin: *`), so a direct fetch() from an extension page works with
// no proxy/relay, same as Open-Meteo (openMeteoApi.ts) and the Bing mirror
// (bingApi.ts). No real free, keyless, CORS-open stock-price API exists to
// verify the same way, which is why this widget is currencies only.

const LATEST_ENDPOINT = 'https://api.frankfurter.dev/v1/latest';
const CURRENCIES_ENDPOINT = 'https://api.frankfurter.dev/v1/currencies';

interface LatestApiResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function fetchExchangeRates(base: string, symbols: string[]): Promise<Record<string, number>> {
  const params = new URLSearchParams({ base, symbols: symbols.join(',') });
  const res = await fetch(`${LATEST_ENDPOINT}?${params.toString()}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json() as LatestApiResponse;
  return data.rates ?? {};
}

// Code -> display name (e.g. "USD" -> "United States Dollar"), used to
// populate the base/target currency pickers. Cheap enough (~30 entries) to
// just fetch once and cache client-side rather than hardcoding the list.
export async function fetchCurrencyList(): Promise<Record<string, string>> {
  const res = await fetch(CURRENCIES_ENDPOINT);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return await res.json() as Record<string, string>;
}
