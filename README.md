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
