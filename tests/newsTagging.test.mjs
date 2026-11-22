import test from 'node:test';
import assert from 'node:assert/strict';
import { categorize, tagText } from '../src/services/newsTagging.js';

test('tags coin names and unambiguous uppercase tickers', () => {
  assert.deepEqual(tagText('Bitcoin breaks a new high').coins, ['btc']);
  assert.deepEqual(tagText('BTC and ETH lead the market').coins, ['btc', 'eth']);
  assert.deepEqual(tagText('Solana activity rises').coins, ['sol']);
  assert.deepEqual(tagText('SOL trades higher').coins, ['sol']);
});

test('does not tag ordinary words that happen to be tickers', () => {
  const cases = [
    'Prices trade near $60,000',
    'ONE OF THE BIGGEST rallies this year',
    'A link to the full report',
    'A ton of stablecoin inflows',
    'A piece of cake',
    'The sky is falling',
    'Please render the chart',
    'Base layer throughput improves',
    'NEAR the end of the quarter',
  ];

  for (const text of cases) {
    const tags = tagText(text);
    assert.deepEqual(tags.coins, [], `unexpected coin tag for: ${text}`);
  }
});

test('an explicit dollar ticker still tags an ambiguous symbol', () => {
  assert.deepEqual(tagText('$NEAR is up after the upgrade').coins, ['near']);
  assert.deepEqual(tagText('$SOL and $LINK rally').coins, ['link', 'sol']);
});

test('a prose-like coin name only tags in its all-caps form', () => {
  assert.deepEqual(tagText('Why CoinShares Just Sold All Its Ethereum').coins, ['eth']);
  assert.deepEqual(tagText('JUST lists on a new exchange').coins, ['jst']);
});

test('multi-word names tag even when the ticker is ambiguous', () => {
  assert.deepEqual(tagText('NEAR Protocol ships a new release').coins, ['near']);
  assert.deepEqual(tagText('Chainlink expands its oracle network').coins, ['link']);
});

test('longest match wins so Ethereum Classic is not also Ethereum', () => {
  assert.deepEqual(tagText('Ethereum Classic holds above support').coins, ['etc']);
});

test('chains tag from the app chain list, including aliases', () => {
  assert.deepEqual(tagText('Uniswap launches on Base').chains, ['base']);
  assert.deepEqual(tagText('OP Mainnet fees fall').chains, ['optimism']);
  assert.deepEqual(tagText('Activity on BNB Chain grows').chains, ['bsc']);
  assert.deepEqual(tagText('Solana validators approve the upgrade').chains, ['solana']);
});

test('"Base layer" is not mistaken for the Base chain', () => {
  assert.deepEqual(tagText('Base layer fees are falling').chains, []);
  assert.deepEqual(tagText('Base users pay less').chains, ['base']);
});

test('keyword categories map headlines to the requested buckets', () => {
  assert.equal(categorize('Chainflip confirms $12M hack, offers bounty'), 'security');
  assert.equal(categorize('SEC files lawsuit against a crypto exchange'), 'regulation');
  assert.equal(categorize('Stablecoin depegs after reserve disclosure'), 'stablecoins');
  assert.equal(categorize('Bitcoin price rallies as ETF inflows surge'), 'markets');
  assert.equal(categorize('Solana validator upgrade ships on mainnet'), 'infra');
  assert.equal(categorize('A quiet day in the ecosystem'), 'other');
});
