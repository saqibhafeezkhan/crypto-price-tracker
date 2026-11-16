// Every query keeps its own JSON document in the browser, so a reload or a
// restart reuses the data instead of spending another provider request.
export const RETENTION_MS = 4 * 60 * 60 * 1000;

const PREFIX = 'crypto-tracker:';

// localStorage raises in private modes and can be full, so a memory copy backs
// it up: the page keeps working for the session even when nothing persists.
const memory = new Map();

const storage = () => {
  try {
    const probe = `${PREFIX}probe`;
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const readEntry = (key) => {
  const store = storage();

  if (store) {
    const raw = store.getItem(PREFIX + key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Unreadable JSON is a cache miss, not a page error; the next load rewrites it.
        return null;
      }
    }
  }

  // Nothing persisted (private mode, a full quota or a dropped write), so reuse
  // the copy this session already fetched.
  return memory.get(key) ?? null;
};

const writeEntry = (key, entry) => {
  memory.set(key, entry);

  const store = storage();
  if (!store) return;

  try {
    store.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Out of quota: drop this app's documents and try once more, then move on.
    try {
      for (const name of Object.keys(store)) {
        if (name.startsWith(PREFIX)) store.removeItem(name);
      }
      store.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // Nothing persisted; the memory copy still serves this session.
    }
  }
};

// Short chart windows arrive as absolute timestamps that shift every second, so
// they are bucketed to the retention window to keep landing on the same entry.
const bucketOf = (seconds) =>
  Number.isFinite(seconds) ? Math.floor(seconds / (RETENTION_MS / 1000)) : 'now';

export const rangeScope = ({ days, from, to } = {}) =>
  days ? `${days}d` : `${bucketOf(from)}-${bucketOf(to)}`;

export const withStore = async (key, load) => {
  const stored = readEntry(key);

  if (stored && Date.now() - stored.fetchedAt < RETENTION_MS) {
    return stored.data;
  }

  // A failed or aborted load throws, so nothing stale or partial is written.
  const data = await load();
  writeEntry(key, { key, fetchedAt: Date.now(), data });
  return data;
};
