# Crypto Price Tracker

A modern, responsive web application for tracking cryptocurrency prices in real-time using the CoinGecko API.

## 🚀 Features

- **Real-time Price Tracking**: Get up-to-date cryptocurrency prices across multiple currencies
- **Responsive Design**: Fully responsive UI built with React and Bootstrap
- **Multiple Currency Support**: Track prices in different fiat currencies
- **Detailed Coin Information**: View comprehensive details for individual cryptocurrencies
- **Clean UI/UX**: Modern and intuitive user interface
- **Client-side Rendering**: Fast performance with Vite bundler

## 🛠️ Tech Stack

- **Frontend Framework**: React 18.3.1
- **Build Tool**: Vite 6.0.5
- **Routing**: React Router DOM 7.1.1
- **UI Framework**: Bootstrap 5.3.3 & React Bootstrap 2.10.7
- **API**: CoinGecko API (free tier)
- **Linting**: ESLint 9.17.0

## 📋 Prerequisites

- Node.js (v14 or higher recommended)
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

The application will be available at `http://localhost:5173`

## 🔨 Build

Build for production:
```bash
npm run build
```

The optimized build files will be in the `dist` folder.

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
├── context/          # React Context for state management
├── assets/           # Static assets
├── App.jsx           # Main App component
├── main.jsx          # Entry point
└── index.css         # Global styles
```

## 🔐 Environment Variables

Create a `.env.local` file with the following:

```
VITE_COINGECKO_API_KEY=your_coingecko_api_key
```

**Note**: Never commit `.env.local` to the repository. Use `.env.example` as a template for other developers.

## 📖 API Documentation

This project uses the [CoinGecko API](https://www.coingecko.com/en/api/documentation).

### Endpoints Used:
- `/coins/markets` - Get market data for multiple cryptocurrencies
- `/coins/{id}` - Get detailed information about a specific cryptocurrency

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
