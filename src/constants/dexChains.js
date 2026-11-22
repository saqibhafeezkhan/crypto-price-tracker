// The 25 chains that carry most DEX activity. Each entry also carries the
// search terms used to discover that chain's busiest tokens; the optional
// addresses are well-known wrapped-native/stablecoin contracts that make the
// discovery exact on chains where the symbols are shared with other networks.
// `dsId` is only set where DexScreener's chain id differs from `id`.
export const TOP_CHAINS = [
  {
    id: 'ethereum',
    geckoId: 'eth',
    name: 'Ethereum',
    short: 'ETH',
    color: '#8a9dff',
    terms: ['WETH', 'USDC'],
    addresses: [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    ],
  },
  {
    id: 'solana',
    geckoId: 'solana',
    name: 'Solana',
    short: 'SOL',
    color: '#2ee6a8',
    terms: ['SOL', 'USDC'],
    addresses: [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    ],
  },
  {
    id: 'bsc',
    geckoId: 'bsc',
    name: 'BNB Chain',
    short: 'BNB',
    color: '#f0b90b',
    terms: ['WBNB', 'USDT'],
    addresses: [
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      '0x55d398326f99059fF775485246999027B3197955', // USDT
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
    ],
  },
  {
    id: 'base',
    geckoId: 'base',
    name: 'Base',
    short: 'BASE',
    color: '#4d8dff',
    terms: ['WETH', 'USDC'],
    addresses: [
      '0x4200000000000000000000000000000000000006', // WETH
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    ],
  },
  {
    id: 'arbitrum',
    geckoId: 'arbitrum',
    name: 'Arbitrum',
    short: 'ARB',
    color: '#5ab8f5',
    terms: ['WETH', 'USDC'],
    addresses: [
      '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
      '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
    ],
  },
  {
    id: 'polygon',
    geckoId: 'polygon_pos',
    name: 'Polygon',
    short: 'POL',
    color: '#a97bff',
    terms: ['WPOL', 'USDC'],
    addresses: [
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WPOL
      '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
    ],
  },
  {
    id: 'avalanche',
    geckoId: 'avax',
    name: 'Avalanche',
    short: 'AVAX',
    color: '#ff5c74',
    terms: ['WAVAX', 'USDC'],
    addresses: [
      '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
      '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC
      '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // USDT
    ],
  },
  {
    id: 'optimism',
    geckoId: 'optimism',
    name: 'Optimism',
    short: 'OP',
    color: '#ff5c74',
    terms: ['WETH', 'USDC'],
    addresses: [
      '0x4200000000000000000000000000000000000006', // WETH
      '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC
      '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // USDT
    ],
  },
  {
    id: 'blast',
    geckoId: 'blast',
    name: 'Blast',
    short: 'BLAST',
    color: '#f5d04a',
    terms: ['USDB', 'WETH'],
    addresses: [
      '0x4300000000000000000000000000000000000004', // WETH
      '0x4300000000000000000000000000000000000003', // USDB
    ],
  },
  {
    id: 'mantle',
    geckoId: 'mantle',
    name: 'Mantle',
    short: 'MNT',
    color: '#69d3c0',
    terms: ['WMNT', 'USDC'],
    addresses: [
      '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8', // WMNT
    ],
  },
  {
    id: 'sonic',
    geckoId: 'sonic',
    name: 'Sonic',
    short: 'S',
    color: '#8b8bff',
    terms: ['WS', 'USDC'],
    addresses: [
      '0x039e2fB66102314Ce7b64Ce5Ce409BcA25F9616d', // WS
    ],
  },
  {
    id: 'unichain',
    geckoId: 'unichain',
    name: 'Unichain',
    short: 'UNI',
    color: '#ff5cae',
    terms: ['WETH', 'USDC'],
    addresses: [
      '0x4200000000000000000000000000000000000006', // WETH
      '0x078D782b760474a361dDA0AF3839290b0EF57AD6', // USDC
    ],
  },
  {
    id: 'berachain',
    geckoId: 'berachain',
    name: 'Berachain',
    short: 'BERA',
    color: '#d9a441',
    terms: ['WBERA', 'USDC'],
    addresses: [
      '0x6969696969696969696969696969696969696969', // WBERA
    ],
  },
  {
    id: 'linea',
    geckoId: 'linea',
    name: 'Linea',
    short: 'LINEA',
    color: '#5aa9ff',
    terms: ['WETH', 'USDC'],
    addresses: [
      '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // WETH
    ],
  },
  {
    id: 'scroll',
    geckoId: 'scroll',
    name: 'Scroll',
    short: 'SCR',
    color: '#f0c890',
    terms: ['WETH', 'USDC'],
    addresses: [
      '0x5300000000000000000000000000000000000004', // WETH
    ],
  },
  {
    id: 'zksync',
    geckoId: 'zksync',
    name: 'zkSync',
    short: 'ZK',
    color: '#8f9dff',
    terms: ['WETH', 'USDC'],
    addresses: [
      '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91', // WETH
    ],
  },
  {
    id: 'tron',
    geckoId: 'tron',
    name: 'Tron',
    short: 'TRX',
    color: '#ff4b4b',
    terms: ['TRX', 'USDT'],
    addresses: [
      'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT
      'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR', // WTRX
    ],
  },
  {
    id: 'cronos',
    geckoId: 'cro',
    name: 'Cronos',
    short: 'CRO',
    color: '#3d7dff',
    terms: ['WCRO', 'USDC'],
    addresses: [
      '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23', // WCRO
      '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59', // USDC
      '0x66e428c3f67a68878562e79A0234c1F83c208770', // USDT
    ],
  },
  {
    id: 'gnosis',
    geckoId: 'xdai',
    name: 'Gnosis',
    short: 'GNO',
    color: '#3ecf8e',
    terms: ['WXDAI', 'USDC'],
    addresses: [
      '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d', // WXDAI
      '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83', // USDC
      '0x4ECaBa5870353805a9F068101A40E0f32ed605C6', // USDT
    ],
  },
  {
    id: 'celo',
    geckoId: 'celo',
    name: 'Celo',
    short: 'CELO',
    color: '#f7d64a',
    terms: ['CELO', 'USDC'],
    addresses: [
      '0x471EcE3750Da237f93B8E339c536989b8978a438', // CELO
      '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', // USDC
      '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e', // USDT
    ],
  },
  {
    id: 'hyperevm',
    geckoId: 'hyperevm',
    name: 'HyperEVM',
    short: 'HYPE',
    color: '#4de0b0',
    terms: ['WHYPE', 'USDC'],
    addresses: [
      '0x5555555555555555555555555555555555555555', // WHYPE
    ],
  },
  {
    id: 'monad',
    geckoId: 'monad',
    name: 'Monad',
    short: 'MON',
    color: '#b18cff',
    terms: ['MON', 'USDC'],
  },
  {
    id: 'sei',
    // DexScreener lists Sei as "seiv2"; without this the chain id filter drops
    // every pair it returns for the network.
    dsId: 'seiv2',
    geckoId: 'sei-evm',
    name: 'Sei',
    short: 'SEI',
    color: '#9b4bff',
    terms: ['WSEI', 'USDC'],
  },
  {
    id: 'sui',
    geckoId: 'sui-network',
    name: 'Sui',
    short: 'SUI',
    color: '#4fbcff',
    terms: ['SUI', 'USDC'],
  },
  {
    id: 'ton',
    geckoId: 'ton',
    name: 'TON',
    short: 'TON',
    color: '#3aa6ff',
    terms: ['TON', 'USDT'],
  },
];

export const CHAIN_BY_ID = Object.fromEntries(TOP_CHAINS.map((chain) => [chain.id, chain]));

export const DEX_LABELS = {
  uniswap: 'Uniswap',
  uniswap_v2: 'Uniswap v2',
  uniswap_v3: 'Uniswap v3',
  uniswap_v4: 'Uniswap v4',
  'uniswap-v2': 'Uniswap v2',
  'uniswap-v3': 'Uniswap v3',
  'uniswap-v4': 'Uniswap v4',
  pancakeswap: 'PancakeSwap',
  pancakeswapv3: 'PancakeSwap v3',
  pancakeswap_v2: 'PancakeSwap v2',
  pancakeswap_v3: 'PancakeSwap v3',
  'pancakeswap-v2': 'PancakeSwap v2',
  'pancakeswap-v3': 'PancakeSwap v3',
  'pancakeswap-infinity': 'PancakeSwap Infinity',
  raydium: 'Raydium',
  orca: 'Orca',
  meteora: 'Meteora',
  aerodrome: 'Aerodrome',
  'aerodrome-slipstream': 'Aerodrome SlipStream',
  camelot: 'Camelot',
  sushiswap: 'SushiSwap',
  curve: 'Curve',
  balancer: 'Balancer',
  pumpfun: 'pump.fun',
  pumpswap: 'PumpSwap',
  'trader-joe': 'Trader Joe',
  quickswap: 'QuickSwap',
  velodrome: 'Velodrome',
  thena: 'THENA',
  thruster: 'Thruster',
  spookyswap: 'SpookySwap',
  kyberswap: 'KyberSwap',
  dodo: 'DODO',
  biswap: 'Biswap',
  cetus: 'Cetus',
  turbos: 'Turbos',
};

// GeckoTerminal appends a network suffix to its DEX ids (for example
// uniswap-v4-ethereum), so match the longest known prefix before falling back
// to a readable version of the raw id.
const DEX_KEYS_BY_LENGTH = Object.keys(DEX_LABELS).sort(
  (left, right) => right.length - left.length,
);

export const dexLabel = (dexId = '') => {
  if (DEX_LABELS[dexId]) return DEX_LABELS[dexId];

  const known = DEX_KEYS_BY_LENGTH.find((key) => dexId.startsWith(`${key}-`));
  if (known) return DEX_LABELS[known];

  return dexId.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
};
