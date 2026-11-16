# Crypto Price Tracker

A modern, responsive web application for tracking cryptocurrency prices, backed by the CoinGecko API with CoinMarketCap, Binance and OKX as fallbacks.

## 🚀 Features

- **Real-time Price Tracking**: Get up-to-date cryptocurrency prices across multiple currencies
- **Search**: Find any coin in the CoinGecko catalogue by name or symbol
- **Resilient Fetching**: Falls back through CoinMarketCap, Binance and OKX when CoinGecko is rate-limited
- **Four-Hour Retention**: A local API stores each response in `data/*.json` and reuses it for four hours
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
- **API Server**: Small dependency-free Node server (`server/`) serving `/api` from a JSON store
- **Linting**: ESLint 9.17.0

## 📋 Prerequisites

- Node.js 20.12 or higher (the API server uses `process.loadEnvFile`)
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

Vite also mounts the local API on the same server, so the app's `/api/...` requests are answered without running a second process. Fetched data is written to `data/` and reused for four hours.

## 🔨 Build

Build for production:
```bash
npm run build
```

The optimized build files will be in the `dist` folder.

Serve the build together with the API:
```bash
npm start
```

The server listens on `http://localhost:8787` (or `$PORT`) and falls back to `index.html` for client-side routes.

## 📝 Linting

Check for code quality issues:
```bash
npm run lint
```

## 👀 Preview

Preview the production build locally:
```bash
npm run preview
```

The local API is mounted on the preview server as well, so `/api` works exactly as in `npm start`.

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
server/                # Local API: JSON store, request handlers, production server
data/                  # One JSON file per cached query (created at runtime, git-ignored)
src/
├── components/        # Reusable UI components
│   └── Navbar/       # Navigation component
├── pages/            # Page components
│   ├── Home/         # Homepage with coin list
│   └── Coin/         # Individual coin details page
├── context/          # Coin context, hook and provider
├── constants/        # Shared constants (supported currencies)
├── services/         # Browser API client plus the provider clients and fallback chain
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
PORT=8787  # optional, used by `npm start`
```

Keys are read by the local API server, not by the page code, so they never reach the browser bundle. The `VITE_` prefixes are kept for compatibility with existing setups and do not require changing.

If `VITE_COINMARKETCAP_API_KEY` is set, the app falls back to CoinMarketCap whenever a CoinGecko request fails (for example when the free-tier rate limit is exhausted). Without a key it falls back to CoinMarketCap's keyless public API instead, which covers prices, search and coin details but no price history.

**Note**: Never commit `.env.local` to the repository. Use `.env.example` as a template for other developers.

## 📖 API Documentation

This project uses the [CoinGecko API](https://www.coingecko.com/en/api/documentation) with fallbacks to [CoinMarketCap](https://coinmarketcap.com/api/documentation/v1/), [Binance](https://developers.binance.com/docs/binance-spot-api-docs) and [OKX](https://www.okx.com/docs-v5/en/). Each read walks that chain and uses the first provider that answers, so a CoinGecko rate limit does not take the app down. Binance and OKX only quote USDT pairs, so they are skipped for EUR and INR.

Successful responses are retained for four hours (`RETENTION_MS` in `server/store.js`). Each one is written to `data/<query>.json` as `{ key, fetchedAt, data }`, and every read — including after a restart — reuses that file until the window expires. Prices therefore do not refresh more often than once every four hours.

### Local API:
- `/api/markets?vsCurrency=usd&perPage=250&ids=bitcoin,ethereum` - coin list
- `/api/coins/:coinId?vsCurrency=usd` - single coin details
- `/api/charts/:coinId?vsCurrency=usd&days=7` - price history (or `from`/`to` timestamps)
- `/api/search?query=bit` - matching coins

### Provider Endpoints Used:
- `/coins/markets` - Get market data for multiple cryptocurrencies
- `/coins/{id}` - Get detailed information about a specific cryptocurrency
- `/coins/{id}/market_chart` - Get price history for the chart

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
