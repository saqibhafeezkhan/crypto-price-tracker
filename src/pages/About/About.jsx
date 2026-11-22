import { Link } from 'react-router-dom';
import './About.css';

const PORTFOLIO_URL = 'https://saqibhafeezkhan.vercel.app/';
const EMAIL = 'saqibhafiz0007@gmail.com';
const GITHUB_PROFILE = 'https://github.com/saqibhafeezkhan';

const PROJECT_PAGES = [
  {
    to: '/',
    kicker: 'Markets',
    title: 'Home',
    description:
      'A searchable top-100 market table with prices, 24h moves, market caps and a detail page with price history for every coin.',
    source: 'CoinGecko, with CoinMarketCap, Binance and OKX fallbacks',
  },
  {
    to: '/pools',
    kicker: 'Liquidity',
    title: 'DEX Pools',
    description:
      'The busiest pools on each tracked chain, with volume, liquidity, price change and the DEX that hosts them.',
    source: 'DexScreener and GeckoTerminal',
  },
  {
    to: '/defi',
    kicker: 'Protocols',
    title: 'DeFi Fundamentals',
    description:
      'TVL, fees and revenue for the top protocols across the 20 largest tracked chains, with chain drill-downs and a transparent P/F column.',
    source: 'DefiLlama, refreshed by a scheduled snapshot job',
  },
  {
    to: '/news',
    kicker: 'Headlines',
    title: 'Crypto News',
    description:
      'The 20 highest-ranked stories of the moment, tagged to tracked coins and chains and linked to the original publisher.',
    source: 'Publisher RSS/Atom feeds, with optional CryptoPanic signals',
  },
];

const STACK = [
  'React 18',
  'Vite 6',
  'React Router',
  'Plain CSS',
  'Node snapshot jobs',
  'GitHub Actions',
  'Static JSON',
];

const About = () => (
  <div className="about">
    <header className="about-hero">
      <span className="about-eyebrow">About the project</span>
      <h1>Crypto Track &amp; Trade</h1>
      <p className="about-lede">
        A read-only crypto workspace for prices, DEX liquidity, protocol economics and the news
        around them. Built by Saqib Hafeez Khan.
      </p>

      <div className="about-actions">
        <a className="about-button" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
          Portfolio
        </a>
        <a
          className="about-button about-button--ghost"
          href={GITHUB_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a className="about-button about-button--ghost" href={`mailto:${EMAIL}`}>
          Email
        </a>
      </div>
    </header>

    <section className="about-section" aria-labelledby="about-project">
      <div className="about-section-head">
        <h2 id="about-project">What it does</h2>
        <p>Four views over the same tracked universe: the top 100 coins and 25 active chains.</p>
      </div>

      <div className="about-card-grid">
        {PROJECT_PAGES.map((page) => (
          <Link key={page.to} to={page.to} className="about-card">
            <span className="about-card-kicker">{page.kicker}</span>
            <h3>{page.title}</h3>
            <p>{page.description}</p>
            <span className="about-card-source">{page.source}</span>
          </Link>
        ))}
      </div>

      <div className="about-build">
        <div>
          <h3>How it is built</h3>
          <p>
            A React and Vite single-page app with no backend. Slow-moving datasets are fetched by
            Node jobs, written to static JSON and refreshed by GitHub Actions, so page views never
            wait on an upstream API. Prices are cached in the browser and every read walks a
            provider chain when a primary source rate-limits.
          </p>
        </div>
        <div className="about-chips">
          {STACK.map((item) => (
            <span key={item} className="about-chip">
              {item}
            </span>
          ))}
        </div>
      </div>

      <p className="about-note">
        Read-only by design: there are no accounts, no wallet connection, no order flow and no
        custody. Nothing here is financial advice, and third-party data can be delayed or
        incomplete.
      </p>
    </section>

    <section className="about-section" aria-labelledby="about-builder">
      <div className="about-section-head">
        <h2 id="about-builder">The builder</h2>
        <p>
          Saqib Hafeez Khan is a full-stack blockchain developer. This project is an independent,
          read-only workspace for exploring crypto markets and on-chain data.
        </p>
      </div>
    </section>

    <footer className="about-footer">
      Crypto Track &amp; Trade · A read-only market workspace
    </footer>
  </div>
);

export default About;
