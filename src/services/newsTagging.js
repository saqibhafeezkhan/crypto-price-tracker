// Coin and chain tagging plus keyword categories. Everything is rule based: no
// model calls, no invented sentiment, and the lexicons come from the app's own
// top-100 coin snapshot and top-25 chain list.
import { TOP_COINS } from '../constants/topCoins.js';
import { TOP_CHAINS } from '../constants/dexChains.js';

// Tickers that are also ordinary words (or single characters). A bare match is
// too unreliable, so they only tag when written as "$NEAR" etc. This is the
// false-positive guard the tests exercise.
const AMBIGUOUS_SYMBOLS = new Set([
  'atom',
  'cake',
  'cc',
  'dot',
  'flow',
  'gram',
  'gt',
  'hype',
  'link',
  'lit',
  'm',
  'mana',
  'near',
  'night',
  'one',
  'op',
  'pi',
  'pol',
  'pump',
  'rain',
  'render',
  'rune',
  'sand',
  'sky',
  'ton',
  'u',
  'vet',
]);

// Single-word names that read as normal English. These still tag when written
// with a capital letter ("Near Protocol", "Render"), but not lowercase.
const AMBIGUOUS_NAMES = new Set([
  'aster',
  'base',
  'blast',
  'cake',
  'flow',
  'gram',
  'hype',
  'link',
  'liter',
  'mantle',
  'mana',
  'near',
  'night',
  'one',
  'optimism',
  'pearl',
  'pump',
  'rain',
  'render',
  'sand',
  'scroll',
  'sky',
  'sonic',
]);

// Common ways headlines refer to a tracked asset without using its CoinGecko
// name. The first value is the symbol to tag.
const COIN_ALIASES = [
  ['binance coin', 'bnb'],
  ['binancecoin', 'bnb'],
  ['bnb coin', 'bnb'],
  ['ether', 'eth'],
  ['ethereum network', 'eth'],
  ['usd coin', 'usdc'],
  ['usd tether', 'usdt'],
  ['ripple', 'xrp'],
  ['matic', 'pol'],
  ['toncoin', 'gram'],
  ['shiba inu coin', 'shib'],
  ['dogecoin', 'doge'],
  ['hyper liquid', 'hype'],
  ['world liberty financial', 'wlfi'],
];

// Names whose capitalised form is still ordinary prose. Only the all-caps ticker
// form counts ("JUST", not "Just Sold").
const UPPERCASE_ONLY_NAMES = new Set(['just']);

const PARENTHETICAL = /\s*\((?:prev\.?|ex-|formerly)[^)]*\)\s*$/i;

const cleanCoinName = (name = '') => {
  const withoutParenthetical = name.replace(PARENTHETICAL, '').trim();
  const alias = name.match(/\((?:prev\.?|ex-|formerly)\s*([^)]+)\)/i)?.[1];
  return { name: withoutParenthetical, alias: alias?.trim() || '' };
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Phrases are matched with letter/number boundaries; a plain \b would split
// hyphenated names such as "zkSync Era" oddly.
const phrasePattern = (text) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(text).replace(/\\?\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`,
    'giu',
  );

const buildCoinTerms = () => {
  const terms = [];

  for (const coin of TOP_COINS) {
    const symbol = String(coin.symbol || '').toLowerCase();
    if (!symbol) continue;

    const { name, alias } = cleanCoinName(coin.name);
    const words = name.split(/\s+/).filter(Boolean);

    if (name) {
      terms.push({
        type: 'coin',
        value: symbol,
        text: name,
        mode: UPPERCASE_ONLY_NAMES.has(name.toLowerCase())
          ? 'uppercase'
          : words.length === 1 && (AMBIGUOUS_NAMES.has(name.toLowerCase()) || name.length < 5)
            ? 'capitalized'
            : 'any',
      });
    }

    if (alias) {
      terms.push({
        type: 'coin',
        value: symbol,
        text: alias,
        mode: alias.split(/\s+/).length === 1 && alias.length < 5 ? 'capitalized' : 'any',
      });
    }

    // Symbols are matched case-sensitively: "ARB" is the token, "arb" is jargon.
    if (symbol.length >= 2 && !AMBIGUOUS_SYMBOLS.has(symbol)) {
      terms.push({ type: 'coin', value: symbol, text: coin.symbol.toUpperCase(), mode: 'symbol' });
    }
  }

  for (const [text, symbol] of COIN_ALIASES) {
    const coin = TOP_COINS.find((entry) => entry.symbol?.toLowerCase() === symbol);
    if (!coin) continue;

    terms.push({
      type: 'coin',
      value: symbol,
      text,
      mode:
        text.split(/\s+/).length === 1 && (AMBIGUOUS_NAMES.has(text) || text.length < 5)
          ? 'capitalized'
          : 'any',
    });
  }

  return terms;
};

const CHAIN_ALIASES = {
  ethereum: ['ethereum', 'ethereum mainnet', 'eth mainnet'],
  solana: ['solana'],
  bsc: ['bnb chain', 'bsc', 'binance smart chain', 'bnb smart chain'],
  base: ['base chain', 'base network'],
  arbitrum: ['arbitrum', 'arbitrum one', 'arb one'],
  polygon: ['polygon', 'polygon pos', 'matic network'],
  avalanche: ['avalanche', 'avalanche c-chain', 'avax c-chain'],
  optimism: ['optimism', 'op mainnet', 'optimism mainnet'],
  blast: ['blast'],
  mantle: ['mantle network', 'mantle chain'],
  sonic: ['sonic chain', 'sonic network', 'sonic evm'],
  unichain: ['unichain'],
  berachain: ['berachain', 'bera chain'],
  linea: ['linea'],
  scroll: ['scroll'],
  zksync: ['zksync', 'zksync era', 'zk sync era'],
  tron: ['tron', 'tron network'],
  cronos: ['cronos', 'cronos chain'],
  gnosis: ['gnosis', 'gnosis chain', 'xdai'],
  celo: ['celo', 'celo network'],
  hyperevm: ['hyperevm', 'hyper evm', 'hyperliquid chain', 'hyperliquid evm'],
  monad: ['monad'],
  sei: ['sei network', 'sei chain', 'sei evm'],
  sui: ['sui network', 'sui chain'],
  ton: ['ton blockchain', 'ton network', 'the open network'],
};

// Bare chain names that are also English words need a capital letter. "Base"
// additionally skips the common "base layer" idiom.
const TITLE_ONLY_CHAINS = new Set(['base', 'blast', 'mantle', 'optimism', 'scroll', 'sonic']);
const BASE_NEGATIVE_CONTEXT = /^\s+(?:layer|case|rate|level|model|line|fee|class)\b/i;

const buildChainTerms = () => {
  const terms = [];

  for (const chain of TOP_CHAINS) {
    const ownAliases = CHAIN_ALIASES[chain.id] || [];
    const aliases = [...new Set([chain.name, ...ownAliases])];

    for (const text of aliases) {
      const singleWord = text.split(/\s+/).length === 1;
      terms.push({
        type: 'chain',
        value: chain.id,
        text,
        mode:
          singleWord && (TITLE_ONLY_CHAINS.has(text.toLowerCase()) || text.length < 5)
            ? 'capitalized'
            : 'any',
      });
    }
  }

  return terms;
};

const isCapitalized = (value) => /^[A-Z0-9]/.test(value);
const isAllCaps = (value) => value === value.toUpperCase() && /[A-Z]/.test(value);

const acceptsMatch = (mode, match, term) => {
  if (mode === 'any') return true;
  if (mode === 'capitalized') return isCapitalized(match);
  if (mode === 'uppercase') return isAllCaps(match) && match === term.text;

  // Symbol mode: uppercase only. A leading "$" is matched separately.
  if (mode === 'symbol') return isAllCaps(match) && match === term.text;

  return false;
};

// Longest phrase first, with claimed ranges, so "Ethereum Classic" does not also
// tag plain Ethereum and "USD Coin" is not split.
const collect = (text, terms) => {
  const claimed = [];
  const found = new Set();
  const sorted = [...terms].sort((left, right) => right.text.length - left.text.length);

  for (const term of sorted) {
    const pattern = phrasePattern(term.text);
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = claimed.some(([from, to]) => start < to && end > from);

      // "Base layer" is an idiom, not the chain.
      const baseIdiom =
        term.text.toLowerCase() === 'base' && BASE_NEGATIVE_CONTEXT.test(text.slice(end, end + 12));

      if (!overlaps && !baseIdiom && acceptsMatch(term.mode, match[0], term)) {
        claimed.push([start, end]);
        found.add(term.value);
        break;
      }

      // Zero-length matches cannot happen here, but guard the loop anyway.
      if (match[0] === '') pattern.lastIndex += 1;
    }
  }

  return [...found];
};

const COIN_TERMS = buildCoinTerms();
const CHAIN_TERMS = buildChainTerms();
const SYMBOL_BY_UPPER = new Map(
  TOP_COINS.map((coin) => [
    String(coin.symbol || '').toUpperCase(),
    String(coin.symbol || '').toLowerCase(),
  ]),
);

// "$NEAR", "$BTC": an explicit ticker is always safe, even for ambiguous ones.
const collectDollarTickers = (text) => {
  const found = new Set();
  for (const match of text.matchAll(/\$([A-Za-z0-9]{2,10})(?![A-Za-z0-9])/g)) {
    const symbol = SYMBOL_BY_UPPER.get(match[1].toUpperCase());
    if (symbol) found.add(symbol);
  }
  return [...found];
};

export const tagText = (title = '', snippet = '') => {
  // Headlines carry the signal; the snippet is a fallback for names that did not
  // fit in the title.
  const text = `${title} ${snippet}`.replace(/\s+/g, ' ').trim();

  const coins = new Set([...collect(text, COIN_TERMS), ...collectDollarTickers(text)]);
  const chains = collect(text, CHAIN_TERMS);

  return { coins: [...coins].sort(), chains: chains.sort() };
};

const CATEGORY_RULES = [
  {
    id: 'security',
    keywords: [
      'hack',
      'hacked',
      'hacker',
      'exploit',
      'breach',
      'stolen',
      'theft',
      'scam',
      'rug pull',
      'rugpull',
      'phishing',
      'drained',
      'attacker',
      'vulnerability',
      'malware',
      'ransomware',
      'fraud',
      'ponzi',
      'compromised',
      'security flaw',
      'bounty',
      'double spend',
    ],
  },
  {
    id: 'regulation',
    keywords: [
      'sec',
      'cftc',
      'regulator',
      'regulation',
      'regulatory',
      'lawsuit',
      'court',
      'judge',
      'settlement',
      'congress',
      'senate',
      'bill',
      'legislation',
      'policy',
      'government',
      'treasury',
      'doj',
      'justice department',
      'enforcement',
      'kyc',
      'aml',
      'sanction',
      'ban',
      'tax',
      'license',
      'parliament',
      'white house',
      'federal reserve',
      'etf approval',
      'legal',
      'hearing',
      'indictment',
      'subpoena',
      'injunction',
    ],
  },
  {
    id: 'stablecoins',
    keywords: [
      'stablecoin',
      'stablecoins',
      'tether',
      'usdt',
      'usdc',
      'depeg',
      'depegs',
      'peg',
      'usd coin',
      'pyusd',
      'usde',
      'usds',
      'fdusd',
    ],
  },
  {
    id: 'exchanges',
    keywords: [
      'exchange',
      'binance',
      'coinbase',
      'kraken',
      'okx',
      'bybit',
      'bitget',
      'kucoin',
      'upbit',
      'gemini',
      'bitstamp',
      'listing',
      'delist',
      'delisting',
      'trading platform',
      'broker',
      'nasdaq',
      'nyse',
      'kalshi',
      'polymarket',
      'htx',
      'gate.io',
    ],
  },
  {
    id: 'defi',
    keywords: [
      'defi',
      'lending',
      'borrow',
      'borrowing',
      'liquidity',
      'yield',
      'staking',
      'restaking',
      'dex',
      'tvl',
      'dao',
      'vault',
      'amm',
      'perpetual',
      'perps',
      'airdrop',
      'protocol',
      'smart contract',
      'onchain',
      'on-chain',
      'liquid staking',
      'yield farm',
      'incentive',
    ],
  },
  {
    id: 'nft',
    keywords: [
      'nft',
      'nfts',
      'gaming',
      'game',
      'games',
      'metaverse',
      'collectible',
      'collectibles',
      'mint',
      'minted',
      'guild',
      'esports',
      'gta',
      'web3 game',
      'digital collectible',
    ],
  },
  {
    id: 'infra',
    keywords: [
      'layer 2',
      'layer-2',
      'l2',
      'rollup',
      'mainnet',
      'testnet',
      'devnet',
      'upgrade',
      'validator',
      'validators',
      'node',
      'nodes',
      'scaling',
      'zero-knowledge',
      'zk',
      'modular',
      'interoperability',
      'bridge',
      'hard fork',
      'consensus',
      'roadmap',
      'throughput',
      'blockchain network',
      'gas fees',
      'infrastructure',
    ],
  },
  {
    id: 'markets',
    keywords: [
      'price',
      'market',
      'markets',
      'rally',
      'surge',
      'soar',
      'plunge',
      'drop',
      'drops',
      'fall',
      'falls',
      'rise',
      'rises',
      'gain',
      'gains',
      'tank',
      'tanks',
      'tumble',
      'tumbles',
      'slide',
      'slides',
      'sink',
      'sinks',
      'climb',
      'climbs',
      'jump',
      'jumps',
      'plummet',
      'retreat',
      'retreats',
      'dip',
      'dips',
      'pare',
      'pares',
      'rebound',
      'rebounds',
      'selloff',
      'sell-off',
      'crash',
      'crashes',
      'slump',
      'bull',
      'bullish',
      'bear',
      'bearish',
      'liquidation',
      'liquidations',
      'funding rate',
      'whale',
      'whales',
      'trading',
      'volume',
      'all-time high',
      'ath',
      'correction',
      'breakout',
      'forecast',
      'analyst',
      'analysts',
      'inflow',
      'inflows',
      'outflow',
      'outflows',
      'short squeeze',
      'support',
      'resistance',
    ],
  },
];

const keywordPattern = (keyword) => phrasePattern(keyword);

export const categorize = (title = '', snippet = '') => {
  const text = `${title} ${snippet}`.replace(/\s+/g, ' ');
  let best = { id: 'other', score: 0 };

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (keywordPattern(keyword).test(text)) score += keyword.includes(' ') ? 2 : 1;
    }

    // Category order is the tie-breaker: security, then regulation, and so on.
    if (score > best.score) best = { id: rule.id, score };
  }

  return best.score > 0 ? best.id : 'other';
};

export const COIN_TAGGING_TERMS = COIN_TERMS;
export const CHAIN_TAGGING_TERMS = CHAIN_TERMS;
