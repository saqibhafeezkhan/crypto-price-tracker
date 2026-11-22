import { requestJson } from './http';
import { readStored, withStore } from './store';

// The news page reads the JSON snapshot written by scripts/refreshCryptoNews.mjs.
// Publishers are never called from a page view.
const BASE_URL = `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/data/news`;
const CACHE_KEY = 'news:snapshot:v1';
const RETENTION_MS = 3 * 60 * 1000;

/**
 * Loads the snapshot. If the network fails, the last stored copy is returned
 * with `fromCache: true` so the page can show it with a stale notice.
 */
export const fetchCryptoNews = async ({ signal, force = false } = {}) => {
  try {
    const data = await withStore(
      CACHE_KEY,
      () =>
        requestJson(
          // A manual refresh must reach the origin, not a CDN copy of the file.
          `${BASE_URL}/latest.json${force ? `?t=${Date.now()}` : ''}`,
          { signal, label: 'Crypto news snapshot' },
        ),
      { retentionMs: RETENTION_MS, force },
    );

    return { data, fromCache: false };
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    const stored = readStored(CACHE_KEY);
    if (stored?.data?.items) return { data: stored.data, fromCache: true };

    throw error;
  }
};

export const newsAgeMs = (meta, now = Date.now()) => {
  const generated = Date.parse(meta?.generatedAt || '');
  return Number.isFinite(generated) ? Math.max(0, now - generated) : null;
};

export const isNewsStale = (meta, now = Date.now()) => {
  const age = newsAgeMs(meta, now);
  if (age === null) return true;

  const staleAfter = Number(meta?.staleAfterMinutes) || 45;
  return age > staleAfter * 60 * 1000;
};
