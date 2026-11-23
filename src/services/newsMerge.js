// Normalization and de-duplication. Exact URLs are merged first; near-identical
// headlines from different outlets are merged second. The merged item keeps the
// earliest source as primary and remembers every outlet that covered it.
import {
  DUPLICATE_TITLE_SIMILARITY,
  canonicalUrl,
  cleanSnippet,
  hashId,
  stripHtml,
  titleSimilarity,
} from './newsText.js';
import { tagText, categorize } from './newsTagging.js';
import { NEWS_SNIPPET_LENGTH } from '../constants/news.js';
import { TOP_COINS } from '../constants/topCoins.js';

const MAX_TITLE_LENGTH = 300;
const NEAR_DUPLICATE_WINDOW_MS = 72 * 60 * 60 * 1000;
const KNOWN_SYMBOLS = new Set(
  TOP_COINS.map((coin) => String(coin.symbol || '').toLowerCase()).filter(Boolean),
);

const asIso = (value) => {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
};

/**
 * Turns one adapter result into the common item shape. Returns null for an item
 * that cannot be shown honestly (no title, no publishable link, no timestamp).
 */
export const buildItem = (raw) => {
  const url = canonicalUrl(raw?.url);
  const title = stripHtml(raw?.title || '').slice(0, MAX_TITLE_LENGTH);
  const publishedAt = asIso(raw?.publishedAt);

  if (!url || !title || !publishedAt) return null;

  const snippet = cleanSnippet(raw?.summary, NEWS_SNIPPET_LENGTH);
  const tags = tagText(title, snippet);
  const hintedCoins = Array.isArray(raw?.coins)
    ? raw.coins
        .map((symbol) => String(symbol).toLowerCase())
        .filter((symbol) => KNOWN_SYMBOLS.has(symbol))
    : [];
  if (hintedCoins.length > 0) {
    tags.coins = [...new Set([...tags.coins, ...hintedCoins])].sort();
  }

  const source = String(raw?.source || 'Unknown').trim();
  const sourceId = String(raw?.sourceId || source.toLowerCase()).trim();
  return {
    id: hashId(url),
    title,
    url,
    publishedAt,
    snippet,
    source,
    sourceId,
    tags,
    category: categorize(title, snippet),
    // Only an API-provided label lands here; nothing is inferred.
    sentiment: ['positive', 'neutral', 'negative'].includes(raw?.sentiment) ? raw.sentiment : null,
    importance: Number.isFinite(raw?.importance) ? Math.max(0, Math.min(3, raw.importance)) : 0,
    provider: String(raw?.provider || 'rss'),
    // API-provided coin matches survive a later retag of stored items.
    hintCoins: hintedCoins,
    sourceCount: 1,
    coverage: [{ sourceId, source, url }],
  };
};

const mergeCoverage = (left, right) => {
  const seen = new Set();
  const merged = [];

  for (const entry of [...left, ...right]) {
    const key = entry.url || `${entry.sourceId}:${entry.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }

  return merged;
};

const pickSentiment = (left, right) => left || right || null;

const mergePair = (left, right) => {
  const coverage = mergeCoverage(left.coverage, right.coverage);
  const sources = new Set(coverage.map((entry) => entry.sourceId));
  const primary = Date.parse(left.publishedAt) <= Date.parse(right.publishedAt) ? left : right;

  return {
    ...primary,
    publishedAt: primary.publishedAt,
    // Keep the earliest outlet's link, but borrow a snippet if it had none.
    snippet: primary.snippet || (primary === left ? right.snippet : left.snippet),
    tags: {
      coins: [...new Set([...left.tags.coins, ...right.tags.coins])].sort(),
      chains: [...new Set([...left.tags.chains, ...right.tags.chains])].sort(),
    },
    sentiment: pickSentiment(left.sentiment, right.sentiment),
    importance: Math.max(left.importance, right.importance),
    sourceCount: sources.size,
    coverage,
  };
};

/**
 * Recomputes tags and category from the stored text. The job runs this after
 * merging so lexicon or keyword fixes apply to items kept from earlier runs,
 * instead of leaving a false positive in the snapshot for a week.
 */
export const retagItem = (item) => {
  const tags = tagText(item.title, item.snippet || '');
  const hints = Array.isArray(item.hintCoins) ? item.hintCoins : [];

  if (hints.length > 0) {
    tags.coins = [...new Set([...tags.coins, ...hints])].sort();
  }

  return {
    ...item,
    tags,
    category: categorize(item.title, item.snippet || ''),
  };
};

const byPublished = (left, right) => Date.parse(left.publishedAt) - Date.parse(right.publishedAt);
const byId = (left, right) => String(left.id).localeCompare(String(right.id));

/**
 * De-duplicates a mixed list of new and previously stored items. Items must
 * already be in the common shape (buildItem output).
 */
export const dedupeItems = (items) => {
  const byUrl = new Map();

  for (const item of items) {
    if (!item?.url) continue;

    const existing = byUrl.get(item.url);
    if (existing) byUrl.set(item.url, mergePair(existing, item));
    else byUrl.set(item.url, item);
  }

  const candidates = [...byUrl.values()].sort((left, right) => {
    const time = byPublished(left, right);
    return time !== 0 ? time : byId(left, right);
  });

  const merged = [];

  for (const item of candidates) {
    let target = null;

    for (const group of merged) {
      // Syndicated copies always come from different outlets. Check every outlet
      // already in the group, not just the primary, so a follow-up from a source
      // that was merged in later does not get folded into the same story.
      if ((group.coverage || []).some((entry) => entry.sourceId === item.sourceId)) continue;

      const gap = Math.abs(Date.parse(group.publishedAt) - Date.parse(item.publishedAt));
      if (gap > NEAR_DUPLICATE_WINDOW_MS) continue;

      if (titleSimilarity(group.title, item.title) >= DUPLICATE_TITLE_SIMILARITY) {
        target = group;
        break;
      }
    }

    if (target) {
      const index = merged.indexOf(target);
      merged[index] = mergePair(target, item);
    } else {
      merged.push(item);
    }
  }

  return merged;
};
