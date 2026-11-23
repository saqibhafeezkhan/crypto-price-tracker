# Crypto Track & Trade

A read-only crypto workspace for **markets, DEX liquidity, protocol economics and news**. It is a React + Vite single-page app with no backend runtime: prices are fetched in the browser, while slow-moving DeFi and news datasets are built by scheduled Node jobs and served as static JSON.

There are no accounts, wallets, order flow or custody. Nothing here is financial advice, and third-party data can be delayed or incomplete.

## Pages

| Route           | Page              | What it shows                                                                                 |
| --------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `/`             | Home              | Searchable top-100 market table: price, 24h change and market cap in USD, EUR or INR.         |
| `/coin/:coinId` | Coin              | Price, market cap, 24h high/low, supply, description and a 1H–30D price chart.                |
| `/pools`        | DEX Pools         | Top 100 pools on each of 25 chains, ranked by 24h volume, with a provider selector.           |
| `/defi`         | DeFi Fundamentals | TVL, fees and revenue for the largest protocols across 20 tracked chains.                     |
| `/news`         | Crypto News       | The top 20 current headlines, tagged to tracked coins and chains and linked to the publisher. |
| `/about`        | About             | Project overview, data sources and builder information.                                       |

The navbar includes Home, Pools, DeFi, News and About, with a responsive mobile menu.

## Features

### Market overview and coin pages

- Top 100 coins by market cap, loaded from CoinGecko with automatic fallbacks to CoinMarketCap, Binance and OKX.
- Search the wider CoinGecko catalogue by name or symbol. The query is kept in the URL as `?q=`.
- USD, EUR and INR display. Binance and OKX only quote USDT pairs, so they are skipped for EUR/INR.
- Coin detail page with price, market cap, 24h high/low, ATH/ATL, supply, description and chart.
- Chart ranges: **1H, 6H, 1D, 7D, 30D**.
- Price and chart responses are cached in the browser for four hours (`RETENTION_MS` in `src/services/store.js`).

### DEX Pools

- 25 tracked chains, each with up to **100 pools ranked by 24h volume**.
- **DexScreener** is the primary provider. **GeckoTerminal** is the automatic fallback and can also be selected directly.
- Provider selector: `Auto`, `DexScreener`, `GeckoTerminal`.
- Auto tries DexScreener first and falls back when it fails or returns no pools.
- GeckoTerminal fetches five pages of 20 pools, normalizes the JSON:API response and ranks the merged result.
- Per-chain, per-provider cache of 60 seconds; auto-refresh every 60 seconds; manual refresh.
- Search, sortable columns, chain picker, volume/liquidity summary cards and responsive layout.
- Quiet chains can return fewer than 100 pools. GeckoTerminal's public API is rate-limited to roughly 10 requests/minute.

### DeFi Fundamentals

- 20 largest tracked chains (the five smallest chains in the 25-chain list remain on the DEX Pools page).
- Chain summary table with TVL, 24h/7d/30d TVL changes, 24h/30d fees, 24h/30d revenue and share.
- Protocol leaderboard, filterable by category and rankable by TVL, fees or revenue.
- Chain drill-down with only that chain's portion of each protocol.
- TVL and fee/revenue charts for 30, 90 or 365 days.
- Transparent metrics: Fees/TVL, Rev/TVL, annualized fees, P/F and divergence flags. P/F is shown only when the protocol token is in the top-100 identifier set.
  - **Mercenary capital?** — TVL rose while fees fell over 30 days.
  - **Organic demand** — fees rose while TVL was flat or down over 30 days.
- Missing values render as `n/a`, never as `0`.
- Snapshots are built hourly; the page flags a snapshot older than 150 minutes. Browser cache: five minutes.

### Crypto News

- Top 20 headlines ranked by recency, coverage, publisher trust, tracked-asset match and optional API signals.
- Each item shows title, publisher, relative/absolute time, short snippet, category, coin/chain chips, coverage count and optional sentiment.
- Titles link out to the original publisher in a new tab with `rel="noopener noreferrer"`.
- Filters: category, coin, chain and time window (**1H / 6H / 24H / 7D**). Filters re-rank within the window and still return up to 20.
- “Trending tags · 24h” sidebar for the most-mentioned tracked coins and chains.
- Loading skeletons, empty states, stale-data notice and last-cached fallback.
- The page can run on publisher RSS/Atom feeds alone. CryptoPanic and CoinGecko News are optional enrichment adapters.
- No article text or images are stored. See [Crypto News details](#crypto-news-details).

### About

The `/about` page summarizes the project, its pages, stack and read-only design.

## Tech stack

- **React 18.3** with React Router 7
- **Vite 6**
- **Plain CSS** per page/component
- **oxlint** + **oxfmt**
- **Node `node:test`** for unit tests
- **fast-xml-parser** for RSS/Atom parsing in the scheduled news job
- **GitHub Actions** for snapshot refresh jobs
- **Static JSON** committed under `public/data/`

No database, server process or API proxy is required at runtime. The browser reads public market APIs directly and reads slow data from same-origin JSON snapshots.

## Requirements

- **Node.js 20+** recommended. The news refresh job uses `AbortSignal.any`; the GitHub workflows run Node 20.
- npm 10+ (the repo is developed with npm and `save-exact=true` in `.npmrc`).

## Quick start

```bash
git clone <your-repository-url>
cd crypto-price-tracker
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:5173>.

The app works without any key:

- Prices use CoinGecko's public/demo access first, then keyless CoinMarketCap/Binance/OKX fallbacks.
- News works with RSS alone.
- DeFi works with DefiLlama's free API when you run the refresh job.

Keys are optional but improve rate-limit headroom. See [Environment variables](#environment-variables).

### First local news snapshot

The news page reads `public/data/news/latest.json`. A snapshot is already committed, so the page works immediately. To rebuild it locally:

```bash
npm run refresh:news
```

This performs network requests to the configured feeds and optional APIs. It writes the snapshot atomically to `public/data/news/latest.json`.

### First local DeFi snapshot

The DeFi page reads `public/data/defi/`. Rebuild it with:

```bash
npm run refresh:defi
```

## Scripts

| Command                 | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server on port 5173.                       |
| `npm run build`         | Production build to `dist/`.                                  |
| `npm run preview`       | Preview the production build locally.                         |
| `npm run lint`          | Run oxlint.                                                   |
| `npm run format`        | Format with oxfmt.                                            |
| `npm run format:check`  | Check formatting without writing.                             |
| `npm test`              | Run all `tests/*.test.mjs` with Node's test runner.           |
| `npm run refresh:coins` | Refresh `src/constants/topCoins.js` from CoinGecko's top 100. |
| `npm run refresh:defi`  | Build `public/data/defi/` from DefiLlama.                     |
| `npm run refresh:news`  | Build `public/data/news/latest.json` from RSS/optional APIs.  |

Snapshot jobs need `devDependencies` because `fast-xml-parser` is installed there. Use `npm ci` (not `npm ci --omit=dev`) before running them.

## Project structure

```text
.
├── src/
│   ├── components/
│   │   ├── Navbar/                 # Responsive navigation
│   │   └── PriceChart/             # SVG price chart
│   ├── constants/
│   │   ├── chartRanges.js          # 1H/6H/1D/7D/30D chart windows
│   │   ├── currencies.js           # USD/EUR/INR
│   │   ├── dexChains.js            # 25 tracked chains, DEX labels
│   │   ├── defiChains.js           # DefiLlama chain mapping, DeFi subset
│   │   ├── news.js                 # Sources, categories, windows, scoring
│   │   └── topCoins.js             # Generated top-100 coin identifiers
│   ├── context/                    # Coin/provider context
│   ├── pages/
│   │   ├── Home/                   # Market table and search
│   │   ├── Coin/                   # Coin detail and chart
│   │   ├── DexPools/               # Top pools per chain
│   │   ├── DefiFundamentals/       # TVL/fees/revenue views
│   │   ├── CryptoNews/             # Headlines, filters, ranking UI
│   │   └── About/                  # Project overview
│   ├── services/
│   │   ├── cryptoApi.js            # Cached market/search/chart facade
│   │   ├── providers.js            # CoinGecko → CMC → Binance → OKX
│   │   ├── coingecko.js
│   │   ├── coinmarketcap.js
│   │   ├── binance.js
│   │   ├── okx.js
│   │   ├── symbols.js              # Slug ↔ ticker mapping for exchanges
│   │   ├── store.js                # localStorage + memory cache
│   │   ├── http.js                 # JSON fetch with timeout/abort
│   │   ├── dexPools.js             # Pool provider selection and caching
│   │   ├── dexscreener.js
│   │   ├── geckoterminal.js
│   │   ├── defiFundamentals.js     # Static DeFi snapshot reads
│   │   ├── defiMetrics.js          # P/F, ratios, divergence flags
│   │   ├── cryptoNews.js           # News snapshot read + stale fallback
│   │   ├── newsText.js             # HTML/URL/text helpers, hashing
│   │   ├── newsMerge.js            # Normalize, dedupe, retag
│   │   ├── newsTagging.js          # Coin/chain tagging + categories
│   │   └── newsRank.js             # Transparent scoring and source cap
│   └── App.jsx                     # Routes
├── scripts/
│   ├── refreshTopCoins.mjs         # Top-100 identifier snapshot
│   ├── refreshDefiFundamentals.mjs # DefiLlama snapshot builder
│   ├── refreshCryptoNews.mjs       # News snapshot builder
│   └── news/
│       ├── feeds.mjs               # RSS/Atom adapter
│       ├── cryptopanic.mjs         # Optional enrichment adapter
│       └── coingeckoNews.mjs       # Optional CoinGecko News adapter
├── public/data/
│   ├── defi/                       # summary.json + chains/*.json
│   └── news/latest.json            # 7-day news snapshot
├── tests/                          # Node unit tests
├── .github/workflows/              # DeFi and news refresh jobs
├── netlify.toml
├── vercel.json
└── vite.config.js
```

## Data sources and refresh model

| Data                          | Producer                                    | Browser cache  | Refresh                                    |
| ----------------------------- | ------------------------------------------- | -------------- | ------------------------------------------ |
| Markets, search, coin details | CoinGecko → CoinMarketCap → Binance → OKX   | 4 hours        | On demand after cache expiry               |
| Price charts                  | CoinGecko → CoinMarketCap → Binance → OKX   | 4 hours        | On range change/expiry                     |
| DEX pools                     | DexScreener, GeckoTerminal                  | 60 seconds     | Auto every 60 seconds + manual             |
| DeFi fundamentals             | DefiLlama via GitHub Actions                | 5 minutes      | Job hourly                                 |
| Crypto news                   | RSS/Atom + optional APIs via GitHub Actions | 3 minutes      | Job every 6 hours + manual snapshot reload |
| Top-100 identifiers           | CoinGecko via `refresh:coins`               | Not applicable | Manual/repository snapshot                 |

The **browser never calls DefiLlama or news publishers on a page view**. Only the scheduled Node jobs do. Price/DEX calls stay in the browser because they are interactive and provider fallbacks already absorb rate limits.

### Price provider chain

`src/services/providers.js` walks providers in this order for every read:

1. CoinGecko
2. CoinMarketCap
3. Binance
4. OKX

Each adapter normalizes its payload to CoinGecko-like shapes. Aborts are never swallowed; a provider rate limit, CORS failure or unusable payload advances to the next provider. Binance and OKX are skipped for non-USD currencies and for fields they do not provide, such as market caps; CoinMarketCap's keyless mode has no price history.

CoinMarketCap uses its keyless public API when no key is set. That covers listings, quotes and search but not price history. CoinGecko's demo key is used as a last-resort default in `src/services/coingecko.js`; set your own `VITE_COINGECKO_API_KEY` for production.

### DEX Pools

- **DexScreener** has no public “top pools per chain” endpoint. The app discovers candidates through search and token-pair lookups, filters by chain, expands through counterpart tokens and ranks by 24h volume.
- **GeckoTerminal** exposes a real network top-pools endpoint. The adapter fetches up to five pages of 20, requests `sort=h24_volume_usd_desc`, normalizes token/DEX metadata and ranks again client-side.
- Auto uses DexScreener first, GeckoTerminal if DexScreener fails or returns no pools. Manual source selection bypasses the other provider.
- Per-chain, per-source cache key: 60 seconds. Manual refresh/auto-refresh force a fresh cache read.
- GeckoTerminal's public API allows roughly 10 calls/minute; a single view uses up to five. If pages are rate-limited, the first page's pools can still render.

### DeFi Fundamentals

- Data comes from DefiLlama's free API (`https://api.llama.fi`). An optional `DEFI_LLAMA_API_KEY` routes the job through the Pro host.
- The job writes `public/data/defi/summary.json` and one file per chain under `public/data/defi/chains/`.
- Chain totals come from DefiLlama chain endpoints; protocol rows are never summed to create a chain total.
- 30-day protocol TVL history is bounded by count/bytes in the refresh script. Rows without history show `n/a`.
- The DeFi subset is 20 chains, not all 25. This is intentional: the five smallest tracked chains remain available on DEX Pools.

### Crypto News details

#### Data flow

```text
GitHub Actions (every 6 hours)
  ├─ publisher RSS/Atom feeds (always on)
  ├─ CryptoPanic signals (optional, enrichment only)
  └─ CoinGecko News (optional, plan-gated)
        ↓
  normalize → canonicalize → dedupe → tag → categorize
        ↓
  prune to 7 days / 600 items → score → rank
        ↓
  public/data/news/latest.json
        ↓
  browser fetch → filter → re-rank → top 20 cards
```

The browser's **Refresh** button reloads the published snapshot with a cache-busting query parameter. It does **not** trigger RSS/API fetches; those happen only in the scheduled job. The button has a 60-second cooldown.

#### Publisher feeds

Configured in `src/constants/news.js`. All six URLs below were checked live on **2026-11-23**:

| Source           | Feed URL                                          | Live result        | Latest item seen | Notes                                                                                                                                                                        |
| ---------------- | ------------------------------------------------- | ------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CoinDesk         | `https://www.coindesk.com/arc/outboundfeeds/rss/` | HTTP 200, 25 items | 23 Nov 2026      | Active. Headline/link use with attribution.                                                                                                                                  |
| Cointelegraph    | `https://cointelegraph.com/rss`                   | HTTP 200, 30 items | 23 Nov 2026      | Active. Publisher content is copyrighted; link out, do not republish.                                                                                                        |
| Decrypt          | `https://decrypt.co/feed`                         | HTTP 200, 36 items | 23 Nov 2026      | Active. Decrypt's terms describe its services as noncommercial; obtain permission for commercial use.                                                                        |
| The Block        | `https://www.theblock.co/rss.xml`                 | HTTP 200, 20 items | 23 Nov 2026      | Active. Terms emphasize personal use; obtain permission for commercial use.                                                                                                  |
| Blockworks       | `https://blockworks.co/feed`                      | HTTP 200, 50 items | **7 Jan 2026**   | **Stale.** The feed responds but has no recent stories. It contributes no items to the 7-day archive. Remove it from `NEWS_SOURCES` if you do not want it in the source bar. |
| Bitcoin Magazine | `https://bitcoinmagazine.com/feed`                | HTTP 200, 10 items | 23 Nov 2026      | Active. Headline/link use only; content is owned by the publisher.                                                                                                           |

The RSS adapter never fetches the article body. It reads the feed's own title, link, date and summary, then strips HTML and truncates the summary to **200 characters**. It supports RSS 2.0, Atom and RDF, retries three times with backoff, uses a 15-second timeout and sends a descriptive User-Agent:

```text
crypto-price-tracker-news/1.0 (+https://github.com/; RSS headline aggregator)
```

One failing feed is reported in `meta.sources` and does not break the page. If **every** source fails and a previous snapshot exists, the job leaves the old snapshot untouched rather than writing an empty page.

#### Optional CryptoPanic adapter

- Enabled only when `CRYPTOPANIC_API_KEY` is set.
- Plan path comes from `CRYPTOPANIC_API_PLAN` (`developer`, `growth` or `enterprise`; current docs list Growth/Enterprise, and the adapter defaults to `growth`).
- Endpoint: `GET https://cryptopanic.com/api/<plan>/v2/posts/` with `auth_token`, `public=true` and `kind=news`.
- It is **enrichment only**. CryptoPanic links point to CryptoPanic, while the page must link to the original publisher, so signals are matched to RSS items by canonical URL or title similarity.
- It can supply sentiment (`positive` / `neutral` / `negative`) and an importance signal. Sentiment is never inferred from votes or generated locally.
- When the adapter is enabled and supplies matched signals, the page shows **“Powered by CryptoPanic”** linking to CryptoPanic.
- Current public docs list plan quotas and a 5–10 requests/second rate limit depending on plan. The adapter makes a single request per run.
- No key was available for this review, so the live CryptoPanic response was not exercised.

#### Optional CoinGecko News adapter

- Enabled only when `COINGECKO_API_KEY`, `COINGECKO_NEWS_API_KEY` or `COINGECKO_PRO_API_KEY` is set.
- Endpoint: `GET https://pro-api.coingecko.com/api/v3/news` with the `x-cg-pro-api-key` header.
- CoinGecko restricts `/news` to **Analyst, Lite, Pro and Enterprise** plans. The adapter skips gracefully on 401/403, so RSS remains sufficient.
- Requests 20 news items, page 1, English, `type=news`.
- CoinGecko News provides no summary field, so these items can have an empty snippet.
- Structured `related_coin_ids` are used as coin-tag hints.
- No Analyst key was available for this review, so the live response was not exercised.

#### Common item model

Every adapter normalizes to:

```json
{
  "id": "n_1a2b3c4d",
  "title": "Headline",
  "source": "CoinDesk",
  "sourceId": "coindesk",
  "url": "https://coindesk.com/...",
  "publishedAt": "2026-11-22T10:00:00.000Z",
  "snippet": "A plain-text publisher summary of at most 200 characters.",
  "tags": { "coins": ["btc"], "chains": ["ethereum"] },
  "category": "markets",
  "sentiment": null,
  "importance": 0,
  "sourceCount": 1,
  "coverage": [{ "sourceId": "coindesk", "source": "CoinDesk", "url": "https://..." }],
  "score": {
    "total": 61.2,
    "recency": 35.4,
    "sourceCount": 0,
    "trust": 10.8,
    "tracked": 8,
    "sentiment": 0,
    "importance": 0
  },
  "rank": 1
}
```

`id` is an FNV-1a hash of the canonical URL. `sentiment` is `null` unless an API supplied it. `importance` is clamped to 0–3.

#### Normalization, deduplication and tagging

1. **Normalize:** strip HTML/entities, collapse whitespace, truncate snippets, parse dates to ISO UTC.
2. **Canonicalize URLs:** lower-case host, remove `www`, drop fragments and known tracking parameters (`utm_*`, `fbclid`, `gclid`, etc.), sort remaining query parameters and normalize duplicate slashes/trailing slashes.
3. **Exact-URL dedupe:** merge items with the same canonical URL.
4. **Near-duplicate dedupe:** compare normalized titles with token-set Jaccard similarity. At **≥ 0.72** within **72 hours**, stories from different publishers merge. The earliest source stays primary; `sourceCount` becomes the number of distinct outlets and `coverage` retains every link.
5. **Retagging:** every run re-tags stored items so lexicon fixes apply immediately, even to items kept from earlier runs.
6. **Tagging:** match the generated top-100 coin list and 25-chain list, including aliases.
   - Ambiguous tickers (`ONE`, `NEAR`, `LINK`, `OP`, `TON`, etc.) only tag in uppercase ticker form or with a leading `$`.
   - Names that are ordinary English words (`Base`, `Render`, `Sky`, `Sonic`, etc.) require capitalization where appropriate.
   - Longest match wins, so “Ethereum Classic” does not also tag Ethereum.
   - “Base layer” is explicitly excluded from the Base chain.
7. **Categories** use ordered keyword rules: Security/Hacks, Regulation, Stablecoins, Exchanges, DeFi, NFTs/Gaming, Infrastructure/L2, Markets, then Other. The first category with the highest score wins; ties follow that order.

#### Ranking formula and weights

Defined in `NEWS_SCORING` in `src/constants/news.js`:

```text
score =
    50 × 0.5^(ageHours / 8)                         # recency
  + min(max(0, sourceCount - 1), 3) × 9             # coverage
  + trust × 12                                      # publisher trust
  + 8 × (has any tracked coin or chain tag)          # tracked-asset match
  + 4 × (sentiment is positive or negative)          # optional API signal
  + (importance / 3) × 6                             # optional 0–3 signal
```

| Component       | Weight             | Notes                                                                                                |
| --------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| Recency         | 50                 | Half-life 8 hours. Future timestamps are clamped to age 0.                                           |
| Source count    | 9 per extra outlet | Capped at 3 extra outlets, so syndication cannot dominate.                                           |
| Publisher trust | 12 × trust         | CoinDesk 0.9, The Block 0.85, Decrypt 0.8, Blockworks 0.8, Cointelegraph 0.7, Bitcoin Magazine 0.65. |
| Tracked asset   | 8                  | Any tagged coin or chain.                                                                            |
| Sentiment       | 4                  | Only positive or negative. Neutral gets no boost.                                                    |
| Importance      | 6                  | `importance / 3 × 6`; clamped to 0–3.                                                                |

Ranking is deterministic: score descending, then newer first, then id. The browser applies the selected time window **before** scoring, so the list re-ranks within the window.

**Per-source cap:** after sorting, the list is filled greedily to 20 items, but no publisher can take more than **6** slots. This is enforced in `src/services/newsRank.js` and tested.

#### Archive and caching

- Snapshot job cadence: **every 6 hours** (`.github/workflows/crypto-news.yml`).
- Stale threshold: **7 hours** (`NEWS_STALE_AFTER_MINUTES = 420`).
- Archive: **7 days**, maximum **600 items**.
- Browser snapshot cache: **3 minutes**.
- Manual refresh cooldown: **60 seconds**.
- If the snapshot fetch fails, `fetchCryptoNews` returns the last localStorage copy with `fromCache: true` and the page shows a stale-data notice.
- If the job runs and all sources fail, the previous `latest.json` is left untouched.
- Source pills show the feed's **fetched** item count, not the number retained after pruning. A stale feed such as Blockworks can therefore show a nonzero fetched count while contributing zero retained stories.

> The original brief suggested a 5–15 minute refresh. This implementation uses 6 hours because snapshots are committed to the repository; a 15-minute cadence would create roughly 96 commits/day. Change `NEWS_REFRESH_MINUTES` and the cron entry together if you need faster updates.

#### Compliance and attribution

- Only headline, source name, link, timestamp and a short publisher summary are stored.
- No full article text, no article scraping, no hotlinked images.
- Every card links to the original publisher.
- Publisher names are always visible.
- CryptoPanic attribution appears only when its adapter is enabled and supplies matched signals.
- Sentiment is never invented; it appears only when CryptoPanic supplies a label.
- Decrypt and The Block both have noncommercial/personal-use language in their terms. Confirm your own rights before commercial deployment.

## Environment variables

### Browser-visible (`VITE_` prefix)

These are compiled into the bundle by Vite and must be treated as public.

| Variable                     | Required | Purpose                                                                 |
| ---------------------------- | -------- | ----------------------------------------------------------------------- |
| `VITE_COINGECKO_API_KEY`     | No       | Own CoinGecko demo key. A demo default exists in code.                  |
| `VITE_COINMARKETCAP_API_KEY` | No       | CoinMarketCap fallback key. Without it, the keyless public API is used. |
| `VITE_API_BASE_URL`          | No       | CoinGecko base URL; default `https://api.coingecko.com/api/v3`.         |
| `VITE_CMC_API_BASE_URL`      | No       | CoinMarketCap base URL; default `https://pro-api.coinmarketcap.com`.    |
| `VITE_BINANCE_API_BASE_URL`  | No       | Binance base URL; default `https://api.binance.com`.                    |
| `VITE_OKX_API_BASE_URL`      | No       | OKX base URL; default `https://www.okx.com`.                            |

### Server-only (scheduled jobs)

Never prefix these with `VITE_`; they must not reach the browser bundle.

| Variable                 | Required | Used by                                                      |
| ------------------------ | -------- | ------------------------------------------------------------ |
| `DEFI_LLAMA_API_KEY`     | No       | DeFi refresh job; routes to DefiLlama Pro.                   |
| `CRYPTOPANIC_API_KEY`    | No       | News refresh job; enables enrichment.                        |
| `CRYPTOPANIC_API_PLAN`   | No       | `developer`, `growth` or `enterprise`; defaults to `growth`. |
| `COINGECKO_API_KEY`      | No       | Top-100 identifier refresh and CoinGecko News adapter.       |
| `COINGECKO_NEWS_API_KEY` | No       | Alias for the CoinGecko News adapter.                        |
| `COINGECKO_PRO_API_KEY`  | No       | Alias for the CoinGecko News adapter.                        |
| `COINGECKO_API_BASE_URL` | No       | Base URL for `refresh:coins`; default CoinGecko demo host.   |

`.env` and `.env.local` are gitignored. Use `.env.example` as the template. For GitHub Actions, add secrets under **Settings → Secrets and variables → Actions**:

- Secrets: `CRYPTOPANIC_API_KEY`, `COINGECKO_API_KEY`, `DEFI_LLAMA_API_KEY`
- Variable: `CRYPTOPANIC_API_PLAN`

The Netlify/Vercel dashboards only need the `VITE_*` values. News and DeFi keys belong to the GitHub Action, not the static host.

## Scheduled jobs

### DeFi fundamentals

`.github/workflows/defi-fundamentals.yml`

- Runs hourly (`0 * * * *`) and on manual dispatch.
- Runs `npm run refresh:defi`.
- Commits changed files under `public/data/defi/`.
- Requires `contents: write`.

### Crypto news

`.github/workflows/crypto-news.yml`

- Runs every 6 hours (`0 */6 * * *`) and on manual dispatch.
- Runs `npm ci` (needed for `fast-xml-parser`).
- On manual dispatch, also attempts `npm run refresh:coins`.
- Runs `npm run refresh:news` with optional secrets.
- Commits changes to `public/data/news/` and `src/constants/topCoins.js`.
- Requires `contents: write`.

If branch protection blocks bot pushes, configure an allowed bot or change the workflow to open a PR instead. The page will keep serving the last committed snapshot.

## Testing and quality checks

```bash
npm test
npm run lint
npm run format:check
npm run build
```

The test suite covers:

- `tests/newsText.test.mjs` — URL canonicalization, HTML/entity stripping, snippet limits, title normalization/similarity, stable hashing.
- `tests/newsMerge.test.mjs` — common model, invalid-item rejection, exact-URL merging, near-duplicate merging, same-source repost handling, retagging, tag unions.
- `tests/newsTagging.test.mjs` — coin/chain aliases, ambiguous tickers, `$NEAR`-style explicit tickers, longest-match behavior, “Base layer” false positive, keyword categories.
- `tests/newsRank.test.mjs` — recency, coverage, tracked-asset boost, sentiment handling, per-source cap, window filtering, deterministic ties.
- `tests/defiMetrics.test.mjs` — percentages, annualization, ratios, P/F, series changes, divergence flags.
- `tests/defiChains.test.mjs` — DefiLlama chain name mapping and the 20-chain DeFi subset.

## Deployment

The production build is plain static assets:

```bash
npm run build
# output: dist/
```

### Netlify

`netlify.toml` sets:

- build command `npm run build`
- publish directory `dist`
- SPA fallback `/* → /index.html`

Set `VITE_COINGECKO_API_KEY` and `VITE_COINMARKETCAP_API_KEY` in the Netlify UI if desired. Do not put server-only news/DeFi keys in Netlify; those jobs run in GitHub Actions.

### Vercel

Import the repository with the Vite preset, build command `npm run build`, output directory `dist`. Set the `VITE_*` variables in the project settings.

If direct visits to client routes such as `/news` return 404, add an SPA rewrite that preserves `/assets/*` and `/data/*` as static files.

### GitHub Pages

1. Set `base` in `vite.config.js` to the repository path, e.g. `/crypto-price-tracker/`.
2. Build with `npm run build`.
3. Publish `dist/` (for example with `gh-pages`).
4. Ensure the static JSON under `public/data/` is deployed with the site.

See [DEPLOYMENT.md](DEPLOYMENT.md) for more detail.

## Troubleshooting

| Symptom                               | Check                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| News page says no snapshot            | Run `npm run refresh:news`; confirm `public/data/news/latest.json` exists and the workflow ran.                                |
| News page shows stale data            | The snapshot is older than 7 hours or the job failed. Check the Crypto News workflow and `meta.generatedAt`.                   |
| CryptoPanic badge/sentiment absent    | Key/plan not configured, adapter failed, or no signals matched RSS items. Inspect `meta.adapters.cryptopanic` in the snapshot. |
| CoinGecko News items absent           | The key is missing or its plan does not include `/news`; RSS still works.                                                      |
| DeFi page says snapshot missing/stale | Run `npm run refresh:defi`; check the hourly workflow and `public/data/defi/summary.json`.                                     |
| Prices hit rate limits                | Set `VITE_COINGECKO_API_KEY`; fallbacks should still answer. Non-USD currencies skip Binance/OKX.                              |
| DEX pool list is short or empty       | Provider coverage/rate limits vary by chain. Try the other source in the selector.                                             |
| `refresh:news` fails on import        | Run `npm ci`; `fast-xml-parser` is a devDependency and the job needs it.                                                       |
| Direct route reload 404s              | Configure an SPA fallback to `index.html` on the host while keeping `/data/*` and `/assets/*` static.                          |

## Known limitations and assumptions

- **News cadence is 6 hours**, not the 5–15 minutes in the original brief. The snapshot is committed to the repository, so 6 hours keeps history/deploy noise down. The 7-day archive and 1H/6H filters still work, but very fresh stories may wait for the next run.
- **Blockworks is stale.** Its feed responds with 50 items, but the newest is from 7 Jan 2026. It contributes no retained headlines and can be removed from `NEWS_SOURCES`.
- **The top-100 identifier snapshot is manual.** `src/constants/topCoins.js` is refreshed by `npm run refresh:coins` (and the manual news workflow dispatch), not on every 6-hour run, so a newly listed coin may wait until the next manual refresh before it can be tagged.
- **CryptoPanic and CoinGecko News were not live-tested** because no keys were available. Their adapters follow the current public docs and fail open to RSS.
- **Publisher terms vary.** Decrypt describes its services as noncommercial; The Block emphasizes personal use. Headline/link/snippet use is kept minimal, but commercial deployment may require publisher permission.
- **RSS retention is limited.** Feeds expose only their latest items. The 7-day archive depends on regular runs; 1H/6H windows can be sparse after a missed job.
- **Dedupe and tagging are rule-based.** No LLM or AI summarization is used. Near-duplicate detection can miss paraphrases or merge similar wording; ambiguous tickers are guarded but not perfect.
- **Sentiment is optional and sparse.** It appears only when CryptoPanic supplies it; neutral does not receive a ranking boost.
- **News images and full article text are deliberately absent.** Only headline, source, link, timestamp and a ≤200-character publisher summary are stored.
- **DeFi covers 20 chains, not 25.** The five smallest tracked chains remain on DEX Pools. Protocol history is bounded, so some rows show `n/a` for 30-day TVL change.
- **Prices are cached for four hours**, so the market table is not a live ticker. Exchange fallbacks have fewer fields than CoinGecko, and Binance/OKX only quote USDT pairs.
- **DEX coverage varies.** DexScreener discovery is heuristic; GeckoTerminal is a true top-pools endpoint but rate-limited. Quiet chains can show fewer than 100 pools.
- **Static snapshots create repository commits.** Branch protection or Actions permission changes can stop refreshes; the site keeps serving the last snapshot.
- **No backend, accounts, trading or wallets.** The project is read-only by design.

## Verification status

Checked during the documentation review:

- **49/49 unit tests pass.**
- `npm run lint` passes.
- `npm run format:check` passes.
- `npm run build` passes (Vite production build).
- Publisher feeds checked live on **2026-11-23**; results are in the [feed table](#publisher-feeds).
- The committed news snapshot reports 188 retained items across 7 days and 5 contributing publishers.
- CryptoPanic and CoinGecko News APIs remain **documentation-verified only** because no keys were available.
- Live browser screenshots were not captured during this review; the production build and static snapshot paths were verified.

## Contributing and security

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for coding style, commit conventions and pull-request steps.
- Report vulnerabilities according to [SECURITY.md](SECURITY.md). Do not open a public issue for a security problem.
- Do not commit `.env`, `.env.local` or real API keys.
- Run `npm test`, `npm run lint`, `npm run format:check` and `npm run build` before opening a pull request.

## License

MIT. See [LICENSE](LICENSE).

---

**Last reviewed:** November 23, 2026
