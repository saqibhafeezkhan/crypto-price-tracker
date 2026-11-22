// Configuration for the Crypto News page. The scheduled job
// (scripts/refreshCryptoNews.mjs) is the only thing that reads these feeds:
// the browser just loads the JSON snapshot it writes.
//
// Every feed below was checked live before being added. Trust is a 0..1 weight
// used by the ranking score, not a claim about editorial quality.
export const NEWS_SOURCES = [
  {
    id: 'coindesk',
    name: 'CoinDesk',
    homepage: 'https://www.coindesk.com',
    feedUrl: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    trust: 0.9,
  },
  {
    id: 'cointelegraph',
    name: 'Cointelegraph',
    homepage: 'https://cointelegraph.com',
    feedUrl: 'https://cointelegraph.com/rss',
    trust: 0.7,
  },
  {
    id: 'decrypt',
    name: 'Decrypt',
    homepage: 'https://decrypt.co',
    feedUrl: 'https://decrypt.co/feed',
    trust: 0.8,
  },
  {
    id: 'theblock',
    name: 'The Block',
    homepage: 'https://www.theblock.co',
    feedUrl: 'https://www.theblock.co/rss.xml',
    trust: 0.85,
  },
  {
    id: 'blockworks',
    name: 'Blockworks',
    homepage: 'https://blockworks.co',
    // Atom feed: the adapter reads both RSS 2.0 and Atom.
    feedUrl: 'https://blockworks.co/feed',
    trust: 0.8,
  },
  {
    id: 'bitcoinmagazine',
    name: 'Bitcoin Magazine',
    homepage: 'https://bitcoinmagazine.com',
    feedUrl: 'https://bitcoinmagazine.com/feed',
    trust: 0.65,
  },
];

// Ranking formula, in one place so the page and the README cannot drift apart:
//   score = recency + sourceCount + trust + tracked + sentiment + importance
// Recency decays by half every `recencyHalfLifeHours`. Source count stops
// boosting after `sourceCountCap` extra outlets so syndication cannot dominate.
// Sentiment is only ever present when an API supplied it.
export const NEWS_SCORING = {
  topCount: 20,
  perSourceLimit: 6,
  recencyHalfLifeHours: 8,
  sourceCountCap: 3,
  weights: {
    recency: 50,
    sourceCount: 9,
    trust: 12,
    tracked: 8,
    sentiment: 4,
    importance: 6,
  },
};

export const NEWS_WINDOWS = [
  { id: '1h', label: '1H', hours: 1 },
  { id: '6h', label: '6H', hours: 6 },
  { id: '24h', label: '24H', hours: 24 },
  { id: '7d', label: '7D', hours: 168 },
];

export const NEWS_CATEGORIES = [
  { id: 'markets', label: 'Markets' },
  { id: 'defi', label: 'DeFi' },
  { id: 'regulation', label: 'Regulation' },
  { id: 'security', label: 'Security/Hacks' },
  { id: 'exchanges', label: 'Exchanges' },
  { id: 'nft', label: 'NFTs/Gaming' },
  { id: 'infra', label: 'Infrastructure/L2' },
  { id: 'stablecoins', label: 'Stablecoins' },
  { id: 'other', label: 'Other' },
];

export const CATEGORY_LABELS = Object.fromEntries(
  NEWS_CATEGORIES.map((category) => [category.id, category.label]),
);

export const categoryLabel = (id) => CATEGORY_LABELS[id] || CATEGORY_LABELS.other;

// News does not need to be real time, so the snapshot is rebuilt every 6 hours.
// A run that is delayed or fails is visible once the snapshot passes 7 hours;
// the 7-day archive still lets the time-window filters work normally.
export const NEWS_REFRESH_MINUTES = 360;
export const NEWS_STALE_AFTER_MINUTES = 420;

export const NEWS_ARCHIVE_DAYS = 7;
export const NEWS_MAX_ITEMS = 600;
export const NEWS_FETCH_TIMEOUT_MS = 15000;
export const NEWS_RETRY_ATTEMPTS = 3;

export const NEWS_USER_AGENT =
  'crypto-price-tracker-news/1.0 (+https://github.com/; RSS headline aggregator)';

// Plain-text snippets only. We never store article bodies or images.
export const NEWS_SNIPPET_LENGTH = 200;
