import test from 'node:test';
import assert from 'node:assert/strict';
import { buildItem, dedupeItems, retagItem } from '../src/services/newsMerge.js';

const raw = (overrides = {}) => ({
  sourceId: 'coindesk',
  source: 'CoinDesk',
  title: 'Bitcoin rallies past $70,000 as ETF inflows surge',
  url: 'https://www.coindesk.com/markets/bitcoin-rally',
  publishedAt: '2026-11-22T10:00:00.000Z',
  summary: '<p>A short summary about Bitcoin.</p>',
  ...overrides,
});

test('buildItem produces the common model with an id from the canonical URL', () => {
  const item = buildItem(
    raw({ url: 'https://www.coindesk.com/markets/bitcoin-rally?utm_source=rss&utm_medium=rss' }),
  );

  assert.equal(item.url, 'https://coindesk.com/markets/bitcoin-rally');
  assert.match(item.id, /^n_[0-9a-f]{8}$/);
  assert.equal(item.snippet, 'A short summary about Bitcoin.');
  assert.deepEqual(item.tags.coins, ['btc']);
  assert.equal(item.category, 'markets');
  assert.equal(item.sourceCount, 1);
  assert.equal(item.sentiment, null);
});

test('buildItem rejects items without a title, link or usable date', () => {
  assert.equal(buildItem(raw({ title: '' })), null);
  assert.equal(buildItem(raw({ url: '' })), null);
  assert.equal(buildItem(raw({ publishedAt: 'not a date' })), null);
});

test('exact URL matches merge, keeping the earliest source as primary', () => {
  const earlier = buildItem(
    raw({
      sourceId: 'decrypt',
      source: 'Decrypt',
      url: 'https://decrypt.co/story',
      publishedAt: '2026-11-22T09:00:00.000Z',
      summary: 'First summary.',
    }),
  );
  const later = buildItem(
    raw({
      url: 'https://www.coindesk.com/story',
      publishedAt: '2026-11-22T10:00:00.000Z',
      summary: 'Second summary.',
    }),
  );

  // Force the same canonical URL for the exact-match case.
  earlier.url = later.url;
  earlier.id = later.id;

  const merged = dedupeItems([later, earlier]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].sourceCount, 2);
  assert.equal(merged[0].source, 'Decrypt');
  assert.equal(merged[0].snippet, 'First summary.');
  assert.deepEqual(merged[0].coverage.map((entry) => entry.source).sort(), ['CoinDesk', 'Decrypt']);
});

test('near-duplicate headlines from different outlets merge', () => {
  const left = buildItem(raw({}));
  const right = buildItem(
    raw({
      sourceId: 'theblock',
      source: 'The Block',
      url: 'https://www.theblock.co/story',
      title: 'Bitcoin rallies past $70,000 as ETF inflow surges',
      publishedAt: '2026-11-22T10:30:00.000Z',
    }),
  );

  const merged = dedupeItems([left, right]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].sourceCount, 2);
});

test('unrelated stories and same-source reposts stay separate', () => {
  const first = buildItem(raw({}));
  const second = buildItem(
    raw({
      sourceId: 'theblock',
      source: 'The Block',
      url: 'https://www.theblock.co/other',
      title: 'Solana validator upgrade ships on mainnet',
    }),
  );
  const repost = buildItem(
    raw({
      url: 'https://coindesk.com/second-link',
      title: 'Bitcoin rallies past $70,000 as ETF inflow surges',
      publishedAt: '2026-11-22T11:00:00.000Z',
    }),
  );

  assert.equal(dedupeItems([first, second]).length, 2);
  // A second URL from the same outlet is not independent coverage.
  assert.equal(dedupeItems([first, repost]).length, 2);
});

test('a follow-up from an outlet already in a merged group stays separate', () => {
  const decryptEarlier = buildItem(
    raw({
      sourceId: 'decrypt',
      source: 'Decrypt',
      url: 'https://decrypt.co/story',
      publishedAt: '2026-11-22T09:00:00.000Z',
    }),
  );
  const coinDeskMatch = buildItem(
    raw({
      url: 'https://www.coindesk.com/story',
      publishedAt: '2026-11-22T09:30:00.000Z',
    }),
  );
  const coinDeskFollowUp = buildItem(
    raw({
      url: 'https://www.coindesk.com/story-follow-up',
      publishedAt: '2026-11-22T10:30:00.000Z',
      title: 'Bitcoin rallies past $70,000 as ETF inflow surges',
    }),
  );

  const merged = dedupeItems([decryptEarlier, coinDeskMatch, coinDeskFollowUp]);

  assert.equal(merged.length, 2);
  const group = merged.find((item) => item.sourceId === 'decrypt');
  assert.equal(group.sourceCount, 2);
  assert.equal(merged.filter((item) => item.sourceId === 'coindesk').length, 1);
});

test('retagItem recomputes stale tags on stored items', () => {
  const stored = {
    ...buildItem(raw({ title: 'Why CoinShares Just Sold Its Ethereum', summary: '' })),
    tags: { coins: ['jst', 'eth'], chains: [] },
  };

  assert.deepEqual(retagItem(stored).tags.coins, ['eth']);
});

test('merging unions tags from every outlet', () => {
  const left = buildItem(raw({ title: 'Bitcoin and Ethereum rally' }));
  const right = buildItem(
    raw({
      sourceId: 'theblock',
      source: 'The Block',
      url: 'https://www.theblock.co/story-2',
      title: 'Bitcoin, Ethereum and Solana rally',
      publishedAt: '2026-11-22T10:05:00.000Z',
    }),
  );

  const [merged] = dedupeItems([left, right]);
  assert.deepEqual(merged.tags.coins, ['btc', 'eth', 'sol']);
});
