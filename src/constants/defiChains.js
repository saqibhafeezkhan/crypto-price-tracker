import { TOP_CHAINS } from './dexChains.js';

// DefiLlama spells chains its own way (and renames them over time: "xDai" became
// "Gnosis", "Optimism" is "OP Mainnet" in the fees endpoints). The app keeps the
// ids it already uses everywhere else, so this file is the single place that
// translates between the two. Both the scheduled refresh script and the page
// import it, which is why it has no browser-only imports.
export const DEFI_CHAIN_NAMES = {
  ethereum: 'Ethereum',
  solana: 'Solana',
  bsc: 'BSC',
  base: 'Base',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  avalanche: 'Avalanche',
  optimism: 'OP Mainnet',
  blast: 'Blast',
  mantle: 'Mantle',
  sonic: 'Sonic',
  unichain: 'Unichain',
  berachain: 'Berachain',
  linea: 'Linea',
  scroll: 'Scroll',
  zksync: 'ZKsync Era',
  tron: 'Tron',
  cronos: 'Cronos',
  gnosis: 'Gnosis',
  celo: 'Celo',
  hyperevm: 'Hyperliquid L1',
  monad: 'Monad',
  sei: 'Sei',
  sui: 'Sui',
  ton: 'TON',
};

// Older or alternative spellings DefiLlama still returns inside protocol chain
// lists, keyed by lower-case name.
export const DEFI_CHAIN_ALIASES = {
  'op mainnet': 'optimism',
  optimism: 'optimism',
  'optimistic ethereum': 'optimism',
  'gnosis chain': 'gnosis',
  xdai: 'gnosis',
  'zksync era': 'zksync',
  zksync: 'zksync',
  'hyperliquid l1': 'hyperevm',
  hyperliquid: 'hyperevm',
  'sei evm': 'sei',
  seiv2: 'sei',
  'bnb chain': 'bsc',
  bsc: 'bsc',
  // The fees endpoints say "BSC"; the protocol payloads say "Binance".
  binance: 'bsc',
  'binance smart chain': 'bsc',
  'polygon pos': 'polygon',
  matic: 'polygon',
  'avalanche c-chain': 'avalanche',
  avax: 'avalanche',
  'ton blockchain': 'ton',
};

const NAME_BY_ID = new Map(Object.entries(DEFI_CHAIN_NAMES));
const ID_BY_NAME = new Map(
  Object.entries(DEFI_CHAIN_NAMES).map(([id, name]) => [name.toLowerCase(), id]),
);

// The DeFi page only needs the largest chains. This is the top 20 of the 25
// DEX-pool chains ranked by DefiLlama TVL when the list was set; the five
// smallest (Blast, Sonic, Scroll, zkSync, Celo) are left to the DEX Pools page.
// Keeping it explicit avoids the summary table reshuffling between refreshes.
const DEFI_CHAIN_IDS = new Set([
  'ethereum',
  'solana',
  'bsc',
  'base',
  'arbitrum',
  'polygon',
  'avalanche',
  'optimism',
  'mantle',
  'unichain',
  'berachain',
  'linea',
  'tron',
  'cronos',
  'gnosis',
  'hyperevm',
  'monad',
  'sei',
  'sui',
  'ton',
]);

export const DEFI_CHAINS = TOP_CHAINS.filter((chain) => DEFI_CHAIN_IDS.has(chain.id));

export const DEFI_TRACKED_CHAIN_IDS = DEFI_CHAINS.map((chain) => chain.id);

/** App chain id for a DefiLlama chain name, or null when it is outside the top 25. */
export const defiChainId = (defiName) => {
  if (!defiName) return null;

  const key = String(defiName).trim().toLowerCase();
  return ID_BY_NAME.get(key) || DEFI_CHAIN_ALIASES[key] || null;
};

/** DefiLlama chain name for an app chain id, or null when the chain is not tracked. */
export const defiChainName = (chainId) => NAME_BY_ID.get(chainId) || null;

// Category labels DefiLlama returns are already meaningful; these only tidy the
// handful that read awkwardly in a table.
export const CATEGORY_LABELS = {
  Dexs: 'DEX',
  'Perp DEXs': 'Perps',
  'Liquid Staking': 'Liquid Staking',
  Bridge: 'Bridges',
  'Canonical Bridge': 'Canonical Bridges',
  Derivatives: 'Derivatives',
  'Yield Aggregator': 'Yield',
  'Algo-Stables': 'Algo Stablecoins',
  'RWA Lending': 'RWA Lending',
  'Lending RWA': 'RWA Lending',
  'Onchain Capital Allocator': 'Capital Allocator',
  'Basis Trading': 'Basis Trading',
  'Risk Curators': 'Risk Curators',
};

export const categoryLabel = (category) => CATEGORY_LABELS[category] || category || 'Uncategorized';

// Chains are listed once in dexChains.js; this re-export keeps the fundamentals
// page independent of where the list lives.
export { TOP_CHAINS };
