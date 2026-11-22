# Crypto Price Tracker

A modern, responsive web application for tracking cryptocurrency prices, backed by the CoinGecko API with CoinMarketCap, Binance and OKX as fallbacks.

## 🚀 Features

- **Real-time Price Tracking**: Get up-to-date cryptocurrency prices across multiple currencies
- **Search**: Find any coin in the CoinGecko catalogue by name or symbol
- **Resilient Fetching**: Falls back through CoinMarketCap, Binance and OKX when CoinGecko is rate-limited
- **Four-Hour Retention**: Each response is kept as a JSON document in the browser and reused for four hours
- **Responsive Design**: Fully responsive layout with custom CSS breakpoints
- **Multiple Currency Support**: Track prices in different fiat currencies
- **Detailed Coin Information**: View comprehensive details for individual cryptocurrencies
- **Clean UI/UX**: Modern and intuitive user interface
- **Client-side Rendering**: Fast performance with Vite bundler

## 🛠️ Tech Stack

- **Frontend Framework**: React 18.3.1
- **Build Tool**: Vite 6.0.5
- **Routing**: React Router DOM 7.1.1
- **Styling**: Custom CSS
- **API**: CoinGecko API (free tier) with CoinMarketCap, Binance and OKX fallbacks
- **Linting**: oxlint 1.94.0
- **Formatting**: oxfmt 0.79.0

## 📋 Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- A CoinGecko API key (get it for free at [coingecko.com](https://www.coingecko.com/en/api))

## 🔧 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/crypto-price-tracker.git
   cd crypto-price-tracker
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your CoinGecko API key:
   ```
   VITE_COINGECKO_API_KEY=your_api_key_here
   ```

## 🚀 Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

Market data is fetched straight from the browser, so there is no second process to start. Responses are cached for four hours and survive reloads.

## 🔨 Build

Build for production:

```bash
npm run build
```

The optimized build files will be in the `dist` folder. They are plain static assets: any static host works, because the app talks to the providers directly from the browser.

## 📝 Linting & Formatting

Check for code quality issues with [oxlint](https://oxc.rs/docs/guide/usage/linter):

```bash
npm run lint
```

Format the codebase with [oxfmt](https://oxc.rs/docs/guide/usage/formatter):

```bash
npm run format
```

Check formatting without writing changes:

```bash
npm run format:check
```

## 👀 Preview

Preview the production build locally:

```bash
npm run preview
```

## 📦 Deployment

### Using Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and connect your repository
3. Set environment variables in Vercel dashboard
4. Deploy with one click!

### Using Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Deploy!

### Using GitHub Pages

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed GitHub Pages deployment instructions.

## 📂 Project Structure

```
src/
├── components/        # Reusable UI components
│   └── Navbar/       # Navigation component
├── pages/            # Page components
│   ├── Home/         # Homepage with coin list
│   └── Coin/         # Individual coin details page
├── context/          # Coin context, hook and provider
├── constants/        # Shared constants (supported currencies)
├── services/         # Provider clients, fallback chain and the four-hour JSON cache
├── assets/           # Static assets
├── App.jsx           # Main App component
├── main.jsx          # Entry point
└── index.css         # Global styles
```

## 🔐 Environment Variables

Create a `.env.local` file with the following:

```
VITE_COINGECKO_API_KEY=your_coingecko_api_key
VITE_COINMARKETCAP_API_KEY=your_coinmarketcap_api_key  # optional fallback
```

`VITE_`-prefixed values are compiled into the bundle, which is what these keys need: they are read by the browser. Treat them as public (the CoinGecko demo key ships in the default build), or route the calls through your own backend if you need them private.

If `VITE_COINMARKETCAP_API_KEY` is set, the app falls back to CoinMarketCap whenever a CoinGecko request fails (for example when the free-tier rate limit is exhausted). Without a key it falls back to CoinMarketCap's keyless public API instead, which covers prices, search and coin details but no price history.

**Note**: Never commit `.env.local` to the repository. Use `.env.example` as a template for other developers.

## 📖 API Documentation

This project uses the [CoinGecko API](https://www.coingecko.com/en/api/documentation) with fallbacks to [CoinMarketCap](https://coinmarketcap.com/api/documentation/v1/), [Binance](https://developers.binance.com/docs/binance-spot-api-docs) and [OKX](https://www.okx.com/docs-v5/en/). Each read walks that chain and uses the first provider that answers, so a CoinGecko rate limit does not take the app down. Binance and OKX only quote USDT pairs, so they are skipped for EUR and INR.

Successful responses are retained for four hours (`RETENTION_MS` in `src/services/store.js`). Each answer is stored in the browser as a JSON document under `crypto-tracker:<query>` in the form `{ key, fetchedAt, data }`, and a reload reuses it until the window expires. Prices therefore do not refresh more often than once every four hours, and clearing site data forces a fresh fetch. If storage is unavailable or full, the cache falls back to an in-memory copy for the session.

### Endpoints Used:

- `/coins/markets` - Get market data for multiple cryptocurrencies
- `/coins/{id}` - Get detailed information about a specific cryptocurrency
- `/coins/{id}/market_chart` - Get price history for the chart

## 📊 DeFi Fundamentals

The `/fundamentals` page tracks TVL, fees and revenue for the top DeFi protocols across the 20 largest chains from the DEX Pools set. DEX Pools still covers all 25; the DeFi cut drops the five smallest by TVL (Blast, Sonic, Scroll, zkSync and Celo) as a fixed list in `DEFI_CHAINS`, so the summary table does not reshuffle between refreshes.

### Data sources

All data comes from DefiLlama's free API (`https://api.llama.fi`, no key required):

- `/protocols` — protocol TVL, per-chain TVL breakdown, category, market cap
- `/v2/historicalChainTvl/{chain}` — chain TVL history (24h/7d/30d changes)
- `/overview/fees?dataType=dailyFees` and `dailyRevenue` — protocol totals
- `/overview/fees/{chain}?dataType=dailyFees` and `dailyRevenue` — chain totals, per-protocol chain rows and the daily fee series
- `/protocol/{slug}` — per-protocol TVL history for 30-day changes (bounded set)

Token prices for the P/F column come from the app's existing top-100 coin dataset.

### Refresh and caching

The browser never calls DefiLlama. `npm run refresh:defi` aggregates everything into static JSON under `public/data/defi/` (`summary.json` plus one file per chain), and the page reads those files with a five-minute client cache. The [refresh workflow](.github/workflows/defi-fundamentals.yml) runs hourly, commits the snapshot when it changed, and leaves the previous files in place if a run fails — the page then shows a "stale data" notice based on the snapshot timestamp. Change the cron entry (and `REFRESH_MINUTES` in the script) if you want a different cadence.

Run it manually with:

```bash
npm run refresh:defi
```

Set an optional `DEFI_LLAMA_API_KEY` (no `VITE_` prefix; used by the job only) to route requests through DefiLlama's Pro host.

### Metric definitions

- **Fees** — everything users pay to use a protocol (swap, borrow, bridge, liquidation).
- **Revenue** — the share kept by the protocol or token holders. Liquidity-provider and validator earnings are not revenue. Fees and revenue are separate columns and are never merged.
- **Fees/TVL, Rev/TVL** — 30-day fees or revenue divided by current TVL.
- **Annualized** — 30-day value × 365/30. An estimate, used only for P/F.
- **P/F** — market cap divided by annualized fees, shown only when the protocol token is in the top-100 coins dataset (the token price beside it comes from that dataset).
- **Mercenary capital?** — TVL up while fees down over 30 days (both legs must move more than 1%).
- **Organic demand** — fees up while TVL flat or down over 30 days.
- Missing values are shown as `n/a`, never as 0.

### Known limitations

- Chain-level TVL and fees always come from DefiLlama's chain endpoints; protocol rows are never summed to produce a chain total.
- On multi-chain protocols the drill-down shows only that chain's portion (per-chain TVL and per-chain fee rows).
- DefiLlama's free chain TVL already excludes liquid staking and double-counted TVL, so no gross-variant toggle is offered.
- 30-day protocol TVL changes require `/protocol/{slug}`, whose payload is large (several MB each). Only a prioritised set is fetched each run — the leaderboard's deepest rows and each chain's top rows first — and the run stops at `PROTOCOL_HISTORY_LIMIT` / `PROTOCOL_HISTORY_BUDGET_BYTES` in `scripts/refreshDefiFundamentals.mjs`. Other rows show `n/a` for the 30-day TVL change and get no divergence badge. Lower those two constants to trade coverage for bandwidth.
- CEX entries are excluded from the protocol leaderboard (they are custodial balances, not DeFi activity).
- DefiLlama chain names are normalised in `src/constants/defiChains.js` (for example the fee endpoints say `BSC` while protocol payloads say `Binance`, and `OP Mainnet` vs `Optimism`); chains outside the tracked list are logged by the refresh job rather than silently dropped.
- DeFi chain coverage is fixed at the 20 largest tracked chains. Refresh fetches only those 20 endpoints and prunes snapshot files for chains removed from the list.

### Tests

```bash
npm test
```

Covers the metric calculations (period changes, fees/TVL, P/F, annualization, divergence flags) and the chain-name mapping.

## 📰 Crypto News

The `/news` page shows the 20 highest-ranked crypto headlines from publisher feeds, tagged to the app's top-100 coin list and top-25 chain list. Every headline links to the original publisher in a new tab; article text and images are never stored.

### Sources

Feeds were checked live on 2026-11-22. `trust` is a 0-1 ranking weight from `src/constants/news.js`, not a claim about editorial quality.

| Source           | Feed                                              | Format  | Trust |
| ---------------- | ------------------------------------------------- | ------- | ----- |
| CoinDesk         | `https://www.coindesk.com/arc/outboundfeeds/rss/` | RSS 2.0 | 0.90  |
| Cointelegraph    | `https://cointelegraph.com/rss`                   | RSS 2.0 | 0.70  |
| Decrypt          | `https://decrypt.co/feed`                         | RSS 2.0 | 0.80  |
| The Block        | `https://www.theblock.co/rss.xml`                 | RSS 2.0 | 0.85  |
| Blockworks       | `https://blockworks.co/feed`                      | Atom    | 0.80  |
| Bitcoin Magazine | `https://bitcoinmagazine.com/feed`                | RSS 2.0 | 0.65  |

The RSS/Atom adapter is always on. Two optional adapters sit behind the same interface:

- **CryptoPanic** (`CRYPTOPANIC_API_KEY`) supplies sentiment and reader-importance signals. Its API returns CryptoPanic links, so it is used only to enrich matching RSS stories by URL or title; it never becomes the outbound link. Attribution ("Powered by CryptoPanic") is shown on the page when the adapter contributes. Per its docs the API is rate-limited to 10 req/sec and should not be polled faster than every 30 seconds; the 6-hour job is well inside that.
- **CoinGecko News** (`COINGECKO_API_KEY`) adds another headline source. `/news` is restricted to the Analyst plan and above, so a 401/403 disables it without affecting the page.

### Refresh and caching

`npm run refresh:news` fetches all adapters in parallel, normalises every item to a common model, de-duplicates, tags, categorises, ranks and writes `public/data/news/latest.json`. The browser reads that static file (three-minute client cache) and never calls a publisher. The [refresh workflow](.github/workflows/crypto-news.yml) runs every 6 hours and commits the snapshot only when it changed. If every source fails, the job exits without overwriting the previous snapshot; the page shows a stale-data notice after 7 hours.

The job merges new items into the existing snapshot, keeps 7 days of stories (maximum 600) and prunes the rest, so the 1h/6h/24h/7d filters work offline from the browser's point of view. A manual **Refresh** button re-reads the snapshot and is rate-limited to once a minute; it does not trigger the scheduled job.

Run it manually with:

```bash
npm run refresh:news
```

Set `CRYPTOPANIC_API_KEY`, `CRYPTOPANIC_API_PLAN` (`growth` by default) and/or `COINGECKO_API_KEY` to enable the optional adapters. They are job-only variables with no `VITE_` prefix, so they are never compiled into the bundle.

### Ranking

Every item gets a transparent score; weights live in `NEWS_SCORING` in `src/constants/news.js`:

```
score = recency + sourceCount + trust + tracked + sentiment + importance
```

| Component       | Weight             | Notes                                          |
| --------------- | ------------------ | ---------------------------------------------- |
| Recency         | up to 50           | Halves every 8 hours                           |
| Source count    | 9 per extra outlet | Stops after 3 extra outlets                    |
| Publisher trust | up to 12           | `trust × 12`                                   |
| Tracked asset   | 8                  | Any matched coin or chain                      |
| Sentiment       | 4                  | Only positive/negative, and only when supplied |
| Importance      | up to 6            | API signal scaled 0-3                          |

The list returns at most 20 stories and enforces a cap of 6 per publisher, so one outlet cannot fill the page. Changing a filter re-runs the same ranking inside the selected window.

### Processing rules

- HTML is stripped from titles and summaries; entities are decoded; snippets are capped at 200 characters. No article body is fetched.
- URLs drop tracking parameters (`utm_*`, `fbclid`, `gclid`, …), fragments, `www.` and trailing slashes before hashing, so a shared link and its RSS spelling collapse to one `id`.
- De-duplication is exact canonical URL first, then a token-set title similarity of 0.72 or more between different outlets within 72 hours. The earliest item stays primary; `sourceCount` and `coverage` list every outlet.
- Coins and chains come from `src/constants/topCoins.js` (generated from CoinGecko's top 100 by `npm run refresh:coins`) and `src/constants/dexChains.js`. Tickers that are ordinary words (`NEAR`, `ONE`, `LINK`, `TON`, …) only tag when written as `$NEAR` or as part of a multi-word name; single-word names that read as English need a capital letter. Tests cover the false-positive cases.
- Categories are keyword rules (Markets, DeFi, Regulation, Security/Hacks, Exchanges, NFTs/Gaming, Infrastructure/L2, Stablecoins, Other). No model calls.

### Known limitations

- GitHub Actions can delay scheduled runs; the page reports the snapshot age rather than pretending it is live.
- The 6-hour cadence means up to four snapshot commits and deployments per day. Shorten the cron interval and `NEWS_REFRESH_MINUTES` / `NEWS_STALE_AFTER_MINUTES` in `src/constants/news.js` if you want fresher data.
- CryptoPanic links are not publisher links, so unmatched CryptoPanic posts are ignored rather than shown. Its free developer plan has been discontinued; Growth or Enterprise is required. Sentiment is displayed only if the API includes a sentiment field; it is never inferred from votes.
- CoinGecko's news endpoint is paid-plan only. The adapter disables itself on 401/403.
- De-duplication merges near-identical headlines, not different angles on the same event, so `sourceCount` is often 1. Lowering the similarity threshold would merge more coverage at the cost of collapsing distinct stories.
- Keyword categories are heuristics and will occasionally mislabel a story (for example a market reaction to a court ruling).
- Publisher feeds show only their most recent items; a quiet 7-day window can contain fewer than 20 stories. The empty state says so instead of padding the list.
- Only the headline, source, link, timestamp and publisher summary are stored. Feeds are treated as public syndication; remove a source from `NEWS_SOURCES` if its terms change.

### Tests

`npm test` covers URL canonicalisation and snippet cleanup, exact/near-title de-duplication, coin and chain tagging (including the false-positive set), and ranking (recency, coverage, tracked-asset boost, window filtering, the 6-per-source cap).

## 🤝 Contributing

Contributions are welcome! Please follow the guidelines in [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/yourusername/crypto-price-tracker/issues) on GitHub.

## 📞 Support

For support, please open an issue or contact the maintainers.

## 🎯 Roadmap

- [ ] Add advanced filtering and sorting options
- [ ] Implement price alerts
- [ ] Add price charts and historical data
- [ ] Support for more fiat currencies
- [ ] Dark/Light theme toggle
- [ ] Cryptocurrency watchlist/favorites
- [ ] Mobile app version

---

**Last Updated**: June 28, 2026
