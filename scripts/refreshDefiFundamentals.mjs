#!/usr/bin/env node
// Builds the DefiLlama snapshot the "DeFi Fundamentals" page reads. It runs as a
// scheduled job (see .github/workflows/defi-fundamentals.yml) and writes static
// JSON, so the browser never calls DefiLlama for a page view.
//
// Refresh: `npm run refresh:defi`
// Output:  public/data/defi/summary.json
//          public/data/defi/chains/<chainId>.json
//
// DefiLlama's free API needs no key. A Pro key can be supplied through the
// DEFI_LLAMA_API_KEY environment variable (never in code); it only changes the
// base URL to the key-prefixed Pro host.

import { mkdir, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFI_CHAINS, DEFI_CHAIN_NAMES, defiChainId } from '../src/constants/defiChains.js';
import { changeFromSeries } from '../src/services/defiMetrics.js';

const API_KEY = process.env.DEFI_LLAMA_API_KEY || '';
const API_BASE = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/api` : 'https://api.llama.fi';
const OUT_DIR = fileURLToPath(new URL('../public/data/defi/', import.meta.url));

const REFRESH_MINUTES = 60;
const STALE_AFTER_MINUTES = 150;
const HISTORY_DAYS = 365;
const CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 45000;

// Bounded work: /protocol/{slug} is a large payload, so history is only fetched
// for the protocols that can appear near the top of a view.
// /protocol/{slug} payloads run to several MB decoded, so the fetch is bounded
// by count. The byte guard only stops a runaway if the API changes shape.
const PROTOCOL_HISTORY_LIMIT = 120;
const PROTOCOL_HISTORY_BUDGET_BYTES = 900 * 1024 * 1024;

const GLOBAL_TVL_LIMIT = 200;
const GLOBAL_FEES_LIMIT = 150;
const GLOBAL_REVENUE_LIMIT = 150;
const CHAIN_PROTOCOL_LIMIT = 30;

const warn = (...args) => console.warn('[defi]', ...args);
const info = (...args) => console.log('[defi]', ...args);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const round = (value, digits = 2) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const toNumber = (value) => {
  // Number(null) is 0, which would turn "no data" into a real zero on the page.
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const requestJson = async (pathname, { attempts = 3 } = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}${pathname}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const error = new Error(`${pathname} failed: ${response.status} ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      // Responses are chunked, so content-length is usually absent. Read the text
      // to measure the real payload size for the history byte budget.
      const text = await response.text();

      return { data: JSON.parse(text), bytes: Buffer.byteLength(text, 'utf8') };
    } catch (error) {
      lastError = error;
      const retryable =
        error.name === 'TimeoutError' ||
        error.status === 429 ||
        error.status >= 500 ||
        error.status === undefined;

      if (attempt >= attempts || !retryable) break;

      // 1s, 4s: short enough to stay inside a 30-minute window, long enough for
      // a rate limiter to recover.
      await sleep(1000 * attempt * attempt);
    }
  }

  throw lastError;
};

const mapPool = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
};

// History points differ by endpoint: chain TVL history uses `tvl`, while
// /protocol/{slug} uses `totalLiquidityUSD`. Dates are seconds in both.
const historyPoints = (history, valueKey) =>
  (Array.isArray(history) ? history : [])
    .map((point) => ({ date: toNumber(point?.date), tvl: toNumber(point?.[valueKey]) }))
    .filter((point) => point.date !== null && point.tvl !== null);

const chainTvlPoints = (history) => historyPoints(history, 'tvl');
const protocolTvlPoints = (history) => historyPoints(history, 'totalLiquidityUSD');

const trimHistory = (points, days = HISTORY_DAYS) => {
  if (points.length === 0) return [];
  const cutoff = points[points.length - 1].date - days * 86400;

  return points.filter((point) => point.date >= cutoff);
};

// 'chain' rows are per-chain aggregates that would double count, and CEX
// entries are custodial balances rather than DeFi activity.
const isProtocolRow = (row) =>
  Boolean(row) && row.protocolType !== 'chain' && row.category !== 'CEX';

const chainProtocolRows = (payload) =>
  (Array.isArray(payload?.protocols) ? payload.protocols : []).filter(isProtocolRow);

const indexBySlug = (rows) => new Map(rows.map((row) => [row.slug, row]));

// Protocol TVL is keyed by DefiLlama's chain spelling, which can differ from the
// chain endpoint's own name ("Binance" vs "BSC"), so the exact key wins and the
// shared id is the fallback.
const chainTvlValue = (protocol, chainId, defiName) => {
  const chainTvls = protocol?.chainTvls || {};
  if (defiName && chainTvls[defiName] !== undefined) return toNumber(chainTvls[defiName]);

  for (const [key, value] of Object.entries(chainTvls)) {
    if (defiChainId(key) === chainId) return toNumber(value);
  }

  return null;
};

const loadChain = async (chain) => {
  const defiName = DEFI_CHAIN_NAMES[chain.id];

  if (!defiName) {
    warn(`no DefiLlama name for chain id "${chain.id}" - skipped`);
    return null;
  }

  const encoded = encodeURIComponent(defiName);

  const [feesResult, revenueResult, tvlResult] = await Promise.allSettled([
    // The chain's daily fee chart is kept for the TVL-vs-fees chart; the large
    // per-chain breakdown chart is not needed.
    requestJson(`/overview/fees/${encoded}?dataType=dailyFees&excludeTotalDataChartBreakdown=true`),
    requestJson(
      `/overview/fees/${encoded}?dataType=dailyRevenue&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
    ),
    requestJson(`/v2/historicalChainTvl/${encoded}`),
  ]);

  const fees = feesResult.status === 'fulfilled' ? feesResult.value.data : null;
  const revenue = revenueResult.status === 'fulfilled' ? revenueResult.value.data : null;
  const tvlHistory = tvlResult.status === 'fulfilled' ? tvlResult.value.data : null;

  if (!fees)
    warn(`${defiName}: fee data unavailable (${feesResult.reason?.message || 'unknown error'})`);
  if (!revenue)
    warn(
      `${defiName}: revenue data unavailable (${revenueResult.reason?.message || 'unknown error'})`,
    );
  if (!tvlHistory)
    warn(`${defiName}: TVL history unavailable (${tvlResult.reason?.message || 'unknown error'})`);

  if (!fees && !tvlHistory) return null;

  const points = chainTvlPoints(tvlHistory);
  const latest = points.length > 0 ? points[points.length - 1].tvl : null;

  const summary = {
    id: chain.id,
    name: chain.name,
    defiName,
    tvl: round(latest),
    tvlChange24h: round(changeFromSeries(points, 1)),
    tvlChange7d: round(changeFromSeries(points, 7)),
    tvlChange30d: round(changeFromSeries(points, 30)),
    fees24h: round(toNumber(fees?.total24h)),
    fees7d: round(toNumber(fees?.total7d)),
    fees30d: round(toNumber(fees?.total30d)),
    revenue24h: round(toNumber(revenue?.total24h)),
    revenue7d: round(toNumber(revenue?.total7d)),
    revenue30d: round(toNumber(revenue?.total30d)),
    protocolCount: chainProtocolRows(fees).length,
  };

  const feeChart = (Array.isArray(fees?.totalDataChart) ? fees.totalDataChart : [])
    .map(([date, value]) => ({ date: toNumber(date), tvl: toNumber(value) }))
    .filter((point) => point.date !== null && point.tvl !== null);

  return {
    summary,
    protocols: chainProtocolRows(fees),
    revenueBySlug: indexBySlug(chainProtocolRows(revenue)),
    series: {
      tvl: trimHistory(points).map((point) => [point.date, Math.round(point.tvl)]),
      fees: trimHistory(feeChart).map((point) => [point.date, round(point.tvl)]),
    },
  };
};

/**
 * Per-protocol TVL history. /protocol/{slug} is the only free endpoint that can
 * tell whether TVL rose or fell over 30 days, and its payload is large, so this
 * runs against a bounded, prioritised list and a byte budget.
 */
const loadProtocolHistory = async (candidates) => {
  const changes = new Map();
  let spentBytes = 0;

  for (const slug of candidates) {
    if (spentBytes > PROTOCOL_HISTORY_BUDGET_BYTES) {
      warn(`protocol history byte budget reached after ${changes.size} protocols`);
      break;
    }

    try {
      const { data, bytes } = await requestJson(`/protocol/${encodeURIComponent(slug)}`);
      spentBytes += bytes || 0;

      const byChain = {};

      for (const [key, entry] of Object.entries(data?.chainTvls || {})) {
        const chainId = defiChainId(key);
        if (!chainId) continue; // "Ethereum-borrowed", "staking", ... are variants
        if (!Array.isArray(entry?.tvl)) continue;

        const points = protocolTvlPoints(entry.tvl);
        byChain[chainId] = {
          change24h: round(changeFromSeries(points, 1)),
          change7d: round(changeFromSeries(points, 7)),
          change30d: round(changeFromSeries(points, 30)),
        };
      }

      const total = protocolTvlPoints(data?.tvl);
      changes.set(slug, {
        tvlChange24h: round(changeFromSeries(total, 1)),
        tvlChange7d: round(changeFromSeries(total, 7)),
        tvlChange30d: round(changeFromSeries(total, 30)),
        byChain,
      });
    } catch (error) {
      warn(`protocol history failed for ${slug}: ${error.message}`);
    }
  }

  return changes;
};

const byNumberDesc = (key) => (left, right) => (right[key] ?? -Infinity) - (left[key] ?? -Infinity);

const pickTop = (rows, key, limit) =>
  [...rows]
    .sort(byNumberDesc(key))
    .slice(0, limit)
    .map((row) => row.slug);

// Removes chain files that are no longer part of the DeFi set, so dropping a
// chain does not leave a stale snapshot behind in public/data/defi/chains.
const pruneChainFiles = async (keepIds) => {
  try {
    const files = await readdir(`${OUT_DIR}chains`);
    await Promise.all(
      files
        .filter((file) => file.endsWith('.json') && !keepIds.has(file.slice(0, -5)))
        .map((file) => unlink(`${OUT_DIR}chains/${file}`)),
    );
  } catch {
    // No directory yet on a first run.
  }
};

const writeJson = async (relativePath, value) => {
  const target = `${OUT_DIR}${relativePath}`;
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`);
  await rename(temporary, target);
};

const main = async () => {
  info(`source: ${API_BASE}`);
  info('fetching protocol TVL, fees and revenue overviews…');

  const [protocolsResult, feesResult, revenueResult] = await Promise.all([
    requestJson('/protocols'),
    requestJson(
      '/overview/fees?dataType=dailyFees&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
    ),
    requestJson(
      '/overview/fees?dataType=dailyRevenue&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
    ),
  ]);

  const protocolRows = Array.isArray(protocolsResult.data) ? protocolsResult.data : [];
  const feeRows = chainProtocolRows(feesResult.data);
  const revenueRows = chainProtocolRows(revenueResult.data);

  info(
    `protocols: ${protocolRows.length} with TVL, ${feeRows.length} with fees, ${revenueRows.length} with revenue`,
  );

  const tvlBySlug = new Map(protocolRows.filter((row) => row.slug).map((row) => [row.slug, row]));
  const feeBySlug = indexBySlug(feeRows);
  const revenueBySlug = indexBySlug(revenueRows);

  info('fetching chain-level TVL, fees and revenue…');

  const chainResults = await mapPool(DEFI_CHAINS, CONCURRENCY, async (chain) => {
    try {
      return await loadChain(chain);
    } catch (error) {
      warn(`chain ${chain.name} failed: ${error.message}`);
      return null;
    }
  });

  const chains = chainResults.filter(Boolean);

  if (chains.length < 18) {
    throw new Error(
      `only ${chains.length} of ${DEFI_CHAINS.length} chains loaded; refusing to replace the last snapshot`,
    );
  }

  // Share is relative to the 20 tracked chains' TVL, as the page states.
  const trackedTvl = chains.reduce((total, chain) => total + (chain.summary.tvl || 0), 0);
  for (const chain of chains) {
    chain.summary.share =
      trackedTvl > 0 ? round(((chain.summary.tvl || 0) / trackedTvl) * 100) : null;
  }

  const missingChains = DEFI_CHAINS.filter(
    (chain) => !chains.some((row) => row.summary.id === chain.id),
  );
  if (missingChains.length > 0) {
    warn(`chains without a snapshot: ${missingChains.map((chain) => chain.name).join(', ')}`);
  }

  // Global leaderboard candidates: the union of the top rows by each metric, so
  // switching the ranking column never shows an empty table.
  const globalRows = new Map();

  const addGlobalRow = (slug) => {
    if (!slug || globalRows.has(slug)) return;

    const tvlRow = tvlBySlug.get(slug);
    const feeRow = feeBySlug.get(slug);
    const revenueRow = revenueBySlug.get(slug);
    if (!tvlRow && !feeRow && !revenueRow) return;

    const category =
      feeRow?.category || tvlRow?.category || revenueRow?.category || 'Uncategorized';
    if (category === 'CEX') return;

    const chainsRaw = tvlRow?.chains || feeRow?.chains || revenueRow?.chains || [];
    const chainIds = [...new Set(chainsRaw.map(defiChainId).filter(Boolean))];

    const chainTvl = {};
    for (const [key, value] of Object.entries(tvlRow?.chainTvls || {})) {
      const chainId = defiChainId(key);
      const amount = toNumber(value);
      if (chainId && amount !== null) chainTvl[chainId] = round(amount);
    }

    globalRows.set(slug, {
      slug,
      name: feeRow?.displayName || feeRow?.name || tvlRow?.name || revenueRow?.name || slug,
      symbol: tvlRow?.symbol || null,
      category,
      chains: chainIds,
      chainCount: chainsRaw.length,
      tvl: round(toNumber(tvlRow?.tvl)),
      tvlChange24h: round(toNumber(tvlRow?.change_1d)),
      tvlChange7d: round(toNumber(tvlRow?.change_7d)),
      tvlChange30d: null,
      fees24h: round(toNumber(feeRow?.total24h)),
      fees7d: round(toNumber(feeRow?.total7d)),
      fees30d: round(toNumber(feeRow?.total30d)),
      revenue24h: round(toNumber(revenueRow?.total24h)),
      revenue7d: round(toNumber(revenueRow?.total7d)),
      revenue30d: round(toNumber(revenueRow?.total30d)),
      feesChange30d: round(toNumber(feeRow?.change_30dover30d)),
      revenueChange30d: round(toNumber(revenueRow?.change_30dover30d)),
      mcap: round(toNumber(tvlRow?.mcap)),
      chainTvl,
    });
  };

  const feeCandidates = feeRows
    .filter((row) => Number.isFinite(row.total30d) && row.total30d > 0)
    .sort(byNumberDesc('total30d'));
  const revenueCandidates = revenueRows
    .filter((row) => Number.isFinite(row.total30d) && row.total30d > 0)
    .sort(byNumberDesc('total30d'));
  const tvlCandidates = protocolRows
    .filter((row) => Number.isFinite(row.tvl) && row.tvl > 0)
    .sort(byNumberDesc('tvl'));

  [
    ...tvlCandidates.slice(0, GLOBAL_TVL_LIMIT),
    ...feeCandidates.slice(0, GLOBAL_FEES_LIMIT),
  ].forEach((row) => addGlobalRow(row.slug));
  revenueCandidates.slice(0, GLOBAL_REVENUE_LIMIT).forEach((row) => addGlobalRow(row.slug));

  const protocols = [...globalRows.values()];

  // History priority: what the page shows first. Leaderboard TVL rows and each
  // chain's deepest protocols come first, then the earnings rankings, then each
  // chain's fee leaders. A 30d change is only meaningful for TVL-bearing rows,
  // so fee-only protocols do not consume the budget.
  const historyCandidates = [];
  const addHistoryCandidate = (slug) => {
    if (slug && !historyCandidates.includes(slug)) historyCandidates.push(slug);
  };
  const withTvl = protocols.filter((protocol) => protocol.tvl !== null);

  pickTop(withTvl, 'tvl', 25).forEach(addHistoryCandidate);

  // Round-robin by depth so a limited budget still gives every chain its top
  // rows instead of exhausting itself on the first few chains.
  const depthByChain = chains.map((chain) =>
    [...chain.protocols].filter((row) => row.tvl !== null).sort(byNumberDesc('tvl')),
  );

  for (let rank = 0; rank < 8; rank += 1) {
    for (const depth of depthByChain) {
      if (depth[rank]) addHistoryCandidate(depth[rank].slug);
    }
  }

  pickTop(withTvl, 'fees30d', 15).forEach(addHistoryCandidate);
  pickTop(withTvl, 'revenue30d', 15).forEach(addHistoryCandidate);

  const budgeted = historyCandidates.slice(0, PROTOCOL_HISTORY_LIMIT);
  info(
    `fetching TVL history for ${budgeted.length} protocols (${historyCandidates.length} candidates)…`,
  );

  const history = await loadProtocolHistory(budgeted);

  for (const protocol of protocols) {
    const entry = history.get(protocol.slug);
    if (!entry) continue;

    protocol.tvlChange24h = entry.tvlChange24h ?? protocol.tvlChange24h;
    protocol.tvlChange7d = entry.tvlChange7d ?? protocol.tvlChange7d;
    protocol.tvlChange30d = entry.tvlChange30d;
  }

  info('building per-chain files…');

  const usedCategories = new Set(protocols.map((protocol) => protocol.category));

  for (const chain of chains) {
    const defiName = chain.summary.defiName;
    const rows = [];

    for (const feeRow of chain.protocols) {
      const tvlRow = tvlBySlug.get(feeRow.slug);
      const revenueRow = chain.revenueBySlug.get(feeRow.slug);
      const entry = history.get(feeRow.slug);
      const chainHistory = entry?.byChain?.[chain.summary.id] || {};

      const rawChainTvl = chainTvlValue(tvlRow, chain.summary.id, defiName);
      const fees30d = toNumber(feeRow.total30d);

      if (rawChainTvl === null && fees30d === null) continue;

      usedCategories.add(feeRow.category);

      rows.push({
        slug: feeRow.slug,
        name: feeRow.displayName || feeRow.name || feeRow.slug,
        symbol: tvlRow?.symbol || null,
        category: feeRow.category || tvlRow?.category || 'Uncategorized',
        tvl: round(rawChainTvl),
        tvlChange24h: chainHistory.change24h ?? null,
        tvlChange7d: chainHistory.change7d ?? null,
        tvlChange30d: chainHistory.change30d ?? null,
        fees24h: round(toNumber(feeRow.total24h)),
        fees7d: round(toNumber(feeRow.total7d)),
        fees30d: round(fees30d),
        revenue24h: round(toNumber(revenueRow?.total24h)),
        revenue7d: round(toNumber(revenueRow?.total7d)),
        revenue30d: round(toNumber(revenueRow?.total30d)),
        feesChange30d: round(toNumber(feeRow.change_30dover30d)),
        revenueChange30d: round(toNumber(revenueRow?.change_30dover30d)),
        mcap: round(toNumber(tvlRow?.mcap)),
      });
    }

    // Keep the union of the deepest and the busiest protocols; the page sorts
    // client-side by any column.
    const ranked = [...rows].sort(byNumberDesc('tvl'));
    const busiest = [...rows].sort(byNumberDesc('fees30d'));
    const selected = [];
    const seen = new Set();

    for (const row of [
      ...ranked.slice(0, CHAIN_PROTOCOL_LIMIT),
      ...busiest.slice(0, CHAIN_PROTOCOL_LIMIT),
    ]) {
      if (seen.has(row.slug)) continue;
      seen.add(row.slug);
      selected.push(row);
    }

    await writeJson(`chains/${chain.summary.id}.json`, {
      meta: {
        chainId: chain.summary.id,
        defiName,
        generatedAt: new Date().toISOString(),
      },
      chain: chain.summary,
      protocols: selected,
      series: chain.series,
    });
  }

  await pruneChainFiles(new Set(chains.map((chain) => chain.summary.id)));

  const unmappedNames = new Set();

  for (const row of [...protocolRows, ...feeRows]) {
    for (const name of row.chains || []) {
      if (!defiChainId(name)) unmappedNames.add(name);
    }
  }

  if (unmappedNames.size > 0) {
    warn(
      `${unmappedNames.size} DefiLlama chain names are outside the tracked top 25 (kept, not dropped): ${[
        ...unmappedNames,
      ]
        .slice(0, 15)
        .join(', ')}`,
    );
  }

  const summary = {
    meta: {
      generatedAt: new Date().toISOString(),
      generatedAtMs: Date.now(),
      source: 'DefiLlama',
      sourceUrl: 'https://defillama.com',
      apiBase: API_KEY ? 'https://pro-api.llama.fi' : 'https://api.llama.fi',
      refreshIntervalMinutes: REFRESH_MINUTES,
      staleAfterMinutes: STALE_AFTER_MINUTES,
      trackedChains: chains.length,
      protocolsTracked: protocols.length,
      protocolsWithHistory: history.size,
      unmatchedChains: unmappedNames.size,
      unmatchedChainSample: [...unmappedNames].slice(0, 10),
      notes: [
        'DeFi covers the 20 largest tracked chains; DEX Pools still covers all 25.',
        'Chain totals are DefiLlama chain endpoints and are never summed from protocol rows.',
        'Free API: chain TVL already excludes liquid staking and double-counted TVL, so no gross-variant toggle is offered.',
        'Protocol TVL changes over 30d are only present for a bounded set of protocols; others show n/a.',
      ],
    },
    totals: {
      tvl: round(chains.reduce((total, chain) => total + (chain.summary.tvl || 0), 0)),
      fees24h: round(chains.reduce((total, chain) => total + (chain.summary.fees24h || 0), 0)),
      fees30d: round(chains.reduce((total, chain) => total + (chain.summary.fees30d || 0), 0)),
      revenue24h: round(
        chains.reduce((total, chain) => total + (chain.summary.revenue24h || 0), 0),
      ),
      revenue30d: round(
        chains.reduce((total, chain) => total + (chain.summary.revenue30d || 0), 0),
      ),
    },
    categories: [...usedCategories]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right)),
    chains: chains.map((chain) => chain.summary),
    protocols,
  };

  await writeJson('summary.json', summary);

  info(
    `wrote summary.json (${protocols.length} protocols, ${chains.length} chains) and ${chains.length} chain files`,
  );
  info(
    `history fetched for ${history.size} protocols; unmatched chain names: ${unmappedNames.size}`,
  );
};

main().catch((error) => {
  console.error('[defi] refresh failed:', error.message);
  process.exitCode = 1;
});
