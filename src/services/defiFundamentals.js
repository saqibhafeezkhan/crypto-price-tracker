import { requestJson } from './http';
import { withStore } from './store';

// The browser only ever reads the JSON snapshots produced by
// scripts/refreshDefiFundamentals.mjs. DefiLlama itself is never called from a
// page view, and the CDN serves these files.
const BASE_URL = `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/data/defi`;
const RETENTION_MS = 5 * 60 * 1000;

export const fetchDefiSummary = ({ signal, force = false } = {}) =>
  withStore(
    'defi:summary:v1',
    () =>
      requestJson(`${BASE_URL}/summary.json`, {
        signal,
        label: 'DeFi fundamentals snapshot',
      }),
    { retentionMs: RETENTION_MS, force },
  );

export const fetchDefiChain = (chainId, { signal, force = false } = {}) =>
  withStore(
    `defi:chain:v1:${chainId}`,
    () =>
      requestJson(`${BASE_URL}/chains/${encodeURIComponent(chainId)}.json`, {
        signal,
        label: `DeFi chain snapshot (${chainId})`,
      }),
    { retentionMs: RETENTION_MS, force },
  );

export const snapshotAgeMs = (meta, now = Date.now()) => {
  const generated = Date.parse(meta?.generatedAt || '');
  return Number.isFinite(generated) ? Math.max(0, now - generated) : null;
};

export const isSnapshotStale = (meta, now = Date.now()) => {
  const age = snapshotAgeMs(meta, now);
  if (age === null) return true;

  const staleAfter = Number(meta?.staleAfterMinutes) || 90;
  return age > staleAfter * 60 * 1000;
};
