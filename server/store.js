import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Fetched data is written to data/<key>.json and reused for four hours, so the
// providers are asked at most once per window and a restart reuses the disk.
export const RETENTION_MS = 4 * 60 * 60 * 1000;

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data');

// Short chart ranges arrive as absolute timestamps that shift every second, so
// they are bucketed to the retention window to keep landing on the same file.
const bucketOf = (seconds) =>
  Number.isFinite(seconds) ? Math.floor(seconds / (RETENTION_MS / 1000)) : 'now';

export const rangeScope = ({ days, from, to } = {}) =>
  days ? `${days}d` : `${bucketOf(from)}-${bucketOf(to)}`;

// Keys contain slugs and id lists, so they are flattened and disambiguated by a
// digest rather than trusted as file names.
const fileName = (key) => {
  const safe = key.toLowerCase().replace(/[^a-z0-9._-]+/g, '_').slice(0, 80);
  const digest = createHash('sha1').update(key).digest('hex').slice(0, 10);
  return `${safe}-${digest}.json`;
};

const readEntry = async (file) => {
  try {
    const entry = JSON.parse(await readFile(file, 'utf8'));
    return typeof entry?.fetchedAt === 'number' ? entry : null;
  } catch {
    // Missing or unreadable files are simply a cache miss.
    return null;
  }
};

const writeEntry = async (file, entry) => {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const temp = `${file}.tmp`;
    await writeFile(temp, JSON.stringify(entry), 'utf8');
    // Rename so a crashed write never leaves a half-written cache file behind.
    await rename(temp, file);
  } catch (error) {
    // A read-only or full disk must not fail the request: the data is still fresh.
    console.warn(`Could not persist ${path.basename(file)}: ${error.message}`);
  }
};

// Concurrent requests for the same key (a page load fires several) share one
// refresh instead of spending a provider request each.
const inFlight = new Map();

export const withStore = async (key, load) => {
  const file = path.join(DATA_DIR, fileName(key));
  const stored = await readEntry(file);

  if (stored && Date.now() - stored.fetchedAt < RETENTION_MS) {
    return stored.data;
  }

  if (inFlight.has(key)) return inFlight.get(key);

  const refresh = (async () => {
    const data = await load();
    await writeEntry(file, { key, fetchedAt: Date.now(), data });
    return data;
  })();

  inFlight.set(key, refresh);
  try {
    return await refresh;
  } finally {
    inFlight.delete(key);
  }
};
