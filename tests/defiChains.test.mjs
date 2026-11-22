import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFI_CHAINS,
  DEFI_CHAIN_NAMES,
  TOP_CHAINS,
  categoryLabel,
  defiChainId,
  defiChainName,
} from '../src/constants/defiChains.js';

test('every tracked chain has a DefiLlama name and the mapping is unique', () => {
  const names = Object.values(DEFI_CHAIN_NAMES);

  for (const chain of TOP_CHAINS) {
    assert.ok(DEFI_CHAIN_NAMES[chain.id], `missing mapping for ${chain.id}`);
  }

  assert.equal(new Set(names).size, names.length, 'two chains map to the same DefiLlama name');
  assert.equal(Object.keys(DEFI_CHAIN_NAMES).length, TOP_CHAINS.length);
});

test('the DeFi subset has 20 unique chains drawn from the DEX list', () => {
  assert.equal(DEFI_CHAINS.length, 20);
  assert.equal(new Set(DEFI_CHAINS.map((chain) => chain.id)).size, 20);

  for (const chain of DEFI_CHAINS) {
    assert.ok(
      TOP_CHAINS.some((entry) => entry.id === chain.id),
      `${chain.id} is not tracked`,
    );
  }

  // DEX Pools still uses the full 25, so the smaller chains stay there.
  assert.equal(TOP_CHAINS.length, 25);
});

test('chain names round-trip through both directions', () => {
  for (const chain of TOP_CHAINS) {
    const name = defiChainName(chain.id);
    assert.equal(defiChainId(name), chain.id);
  }
});

test('mapping is case-insensitive and knows the renamed chains', () => {
  assert.equal(defiChainId('ethereum'), 'ethereum');
  assert.equal(defiChainId('ETHEREUM'), 'ethereum');
  assert.equal(defiChainId('OP Mainnet'), 'optimism');
  assert.equal(defiChainId('Optimism'), 'optimism');
  assert.equal(defiChainId('xDai'), 'gnosis');
  assert.equal(defiChainId('Gnosis Chain'), 'gnosis');
  assert.equal(defiChainId('ZKsync Era'), 'zksync');
  assert.equal(defiChainId('Hyperliquid L1'), 'hyperevm');
  assert.equal(defiChainId('BSC'), 'bsc');
  // The protocol payloads spell BNB Chain as "Binance"; the fees endpoints use "BSC".
  assert.equal(defiChainId('Binance'), 'bsc');
  assert.equal(defiChainId('Sei'), 'sei');
  assert.equal(defiChainId('seiv2'), 'sei');
  assert.equal(defiChainId('  Polygon  '), 'polygon');
});

test('chains outside the tracked top 25 resolve to null instead of guessing', () => {
  assert.equal(defiChainId('Fantom'), null);
  assert.equal(defiChainId('Metis'), null);
  assert.equal(defiChainId('Ethereum-borrowed'), null);
  assert.equal(defiChainId(''), null);
  assert.equal(defiChainId(undefined), null);
  assert.equal(defiChainName('fantom'), null);
});

test('category labels tidy the awkward DefiLlama names', () => {
  assert.equal(categoryLabel('Dexs'), 'DEX');
  assert.equal(categoryLabel('Perp DEXs'), 'Perps');
  assert.equal(categoryLabel('Bridge'), 'Bridges');
  assert.equal(categoryLabel('Lending'), 'Lending');
  assert.equal(categoryLabel('Something New'), 'Something New');
  assert.equal(categoryLabel(undefined), 'Uncategorized');
});
