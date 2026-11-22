#!/usr/bin/env node
// Builds the Crypto News snapshot. Runs on a schedule (see
// .github/workflows/crypto-news.yml); the browser only reads the static JSON.
//
// Refresh: `npm run refresh:news`
// Output:  public/data/news/latest.json
//
// Pipeline: fetch adapters in parallel → normalize → dedupe → enrich → prune to
// 7 days → rank → write. A failed source is reported in meta and never takes
// the page down; the previous snapshot is kept if nothing usable arrived.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NEWS_ARCHIVE_DAYS,
  NEWS_MAX_ITEMS,
  NEWS_REFRESH_MINUTES,
  NEWS_SCORING,
  NEWS_SOURCES,
  NEWS_STALE_AFTER_MINUTES,
} from '../src/constants/news.js';
import { buildItem, dedupeItems, retagItem } from '../src/services/newsMerge.js';
import { rankItems, scoreItem } from '../src/services/newsRank.js';
import { TOP_CHAINS } from '../src/constants/dexChains.js';
import { TOP_COINS } from '../src/constants/topCoins.js';
import { rssAdapter } from './news/feeds.mjs';
import { applySignals, cryptoPanicAdapter } from './news/cryptopanic.mjs';
import { coinGeckoNewsAdapter } from './news/coingeckoNews.mjs';

const OUTPUT = fileURLToPath(new URL('../public/data/news/latest.json', import.meta.url));
const ADAPTERS = [rssAdapter, cryptoPanicAdapter, coinGeckoNewsAdapter];

const info = (...args) => console.log('[news]', ...args);
const warn = (...args) => console.warn('[news]', ...args);

const readPrevious = async () => {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT, 'utf8'));
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return { items, generatedAt: parsed?.meta?.generatedAt || null };
  } catch {
    return { items: [], generatedAt: null };
  }
};

const countBy = (items, selector) => {
  const counts = new Map();
  for (const item of items) {
    for (const value of selector(item)) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
};

const buildTrending = (items) => {
  const recent = items.filter(
    (item) => Date.now() - Date.parse(item.publishedAt) <= 24 * 60 * 60 * 1000,
  );
  const coinNames = new Map(TOP_COINS.map((coin) => [coin.symbol?.toLowerCase(), coin.name]));
  const chainNames = new Map(TOP_CHAINS.map((chain) => [chain.id, chain.name]));

  return {
    windowHours: 24,
    coins: countBy(recent, (item) => item.tags?.coins || [])
      .slice(0, 8)
      .map(([symbol, count]) => ({
        symbol,
        name: coinNames.get(symbol) || symbol.toUpperCase(),
        count,
      })),
    chains: countBy(recent, (item) => item.tags?.chains || [])
      .slice(0, 8)
      .map(([id, count]) => ({ id, name: chainNames.get(id) || id, count })),
  };
};

const writeSnapshot = async (snapshot) => {
  await mkdir(dirname(OUTPUT), { recursive: true });
  const temporary = `${OUTPUT}.tmp`;
  await writeFile(temporary, `${JSON.stringify(snapshot)}\n`);
  await rename(temporary, OUTPUT);
};

const main = async () => {
  const startedAt = Date.now();
  const previous = await readPrevious();

  info(`fetching ${ADAPTERS.length} adapters (${NEWS_SOURCES.length} publisher feeds)…`);

  const results = await Promise.all(
    ADAPTERS.map(async (adapter) => {
      if (!adapter.enabled(process.env)) {
        return { id: adapter.id, skipped: true, items: [], signals: [], meta: { enabled: false } };
      }

      try {
        const result = await adapter.fetch({ env: process.env });
        return { id: adapter.id, skipped: false, ...result };
      } catch (error) {
        warn(`${adapter.id} adapter failed: ${error.message}`);
        return {
          id: adapter.id,
          skipped: false,
          items: [],
          signals: [],
          meta: { enabled: true, ok: false, error: error.message },
        };
      }
    }),
  );

  const byId = Object.fromEntries(results.map((result) => [result.id, result]));
  const rss = byId.rss || { items: [], sources: [] };
  const cryptoPanic = byId.cryptopanic || { signals: [], meta: { enabled: false } };
  const coinGecko = byId.coingecko || { items: [], meta: { enabled: false } };

  for (const source of rss.sources || []) {
    if (source.ok) info(`  ${source.name}: ${source.itemCount} items (${source.format})`);
    else warn(`  ${source.name}: failed - ${source.error}`);
  }

  const rawItems = [...(rss.items || []), ...(coinGecko.items || [])];
  const newItems = rawItems.map(buildItem).filter(Boolean);
  const discarded = rawItems.length - newItems.length;

  info(
    `fetched ${rawItems.length} raw items, ${newItems.length} usable, ${discarded} discarded (missing title/link/date)`,
  );

  if (newItems.length === 0) {
    // Writing previous items with a new timestamp would make stale data look
    // live, so the old file is left exactly as it was.
    if (previous.items.length > 0) {
      warn('every source failed; keeping the previous snapshot untouched');
      return;
    }

    throw new Error(
      'no usable news items and no previous snapshot; refusing to write an empty page',
    );
  }

  // Retag every item, including the ones kept from previous runs, so fixes to
  // the lexicons apply immediately instead of waiting for the 7-day prune.
  const deduped = dedupeItems([...previous.items, ...newItems]).map(retagItem);
  info(`deduped to ${deduped.length} stories across ${NEWS_ARCHIVE_DAYS} days`);

  const signalsMatched = applySignals(deduped, cryptoPanic.signals || []);

  const cutoff = startedAt - NEWS_ARCHIVE_DAYS * 24 * 60 * 60 * 1000;
  const kept = deduped
    .filter((item) => Date.parse(item.publishedAt) >= cutoff)
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, NEWS_MAX_ITEMS);

  const ranked = rankItems(kept, { now: startedAt });
  const rankById = new Map(ranked.map((item) => [item.id, item.rank]));

  const items = kept
    .map((item) => ({
      ...item,
      score: scoreItem(item, { now: startedAt }),
      rank: rankById.get(item.id) ?? null,
    }))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

  const trending = buildTrending(items);
  const failedSources = (rss.sources || []).filter((source) => !source.ok).length;

  const snapshot = {
    meta: {
      generatedAt: new Date(startedAt).toISOString(),
      generatedAtMs: startedAt,
      refreshIntervalMinutes: NEWS_REFRESH_MINUTES,
      staleAfterMinutes: NEWS_STALE_AFTER_MINUTES,
      archiveDays: NEWS_ARCHIVE_DAYS,
      totalItems: items.length,
      topCount: NEWS_SCORING.topCount,
      perSourceLimit: NEWS_SCORING.perSourceLimit,
      publishersConfigured: NEWS_SOURCES.length,
      publishersFailed: failedSources,
      ranking: {
        ...NEWS_SCORING,
        formula: 'recency + sourceCount + trust + tracked + sentiment + importance',
        sources: NEWS_SOURCES.map((source) => ({
          id: source.id,
          name: source.name,
          trust: source.trust,
        })),
      },
      sources: rss.sources || [],
      adapters: {
        rss: {
          enabled: true,
          ok: (rss.sources || []).some((source) => source.ok),
          itemCount: (rss.items || []).length,
        },
        cryptopanic: {
          ...cryptoPanic.meta,
          signals: (cryptoPanic.signals || []).length,
          matched: signalsMatched,
          attribution: cryptoPanicAdapter.attribution,
          attributionUrl: cryptoPanicAdapter.attributionUrl,
        },
        coingecko: { ...coinGecko.meta, itemCount: (coinGecko.items || []).length },
      },
      notes: [
        'Headlines, links, timestamps and short feed summaries only. Article text and images are never stored.',
        'Sentiment and importance appear only when CryptoPanic supplies them.',
      ],
    },
    trending,
    items,
  };

  await writeSnapshot(snapshot);

  info(
    `wrote ${items.length} items (${ranked.length} ranked); ${failedSources} publisher feed(s) failed; CryptoPanic matched ${signalsMatched} stories`,
  );
};

main().catch((error) => {
  console.error('[news] refresh failed:', error.message);
  process.exitCode = 1;
});
