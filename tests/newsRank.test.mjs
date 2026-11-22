import test from 'node:test';
import assert from 'node:assert/strict';
import { NEWS_SCORING } from '../src/constants/news.js';
import { rankItems, scoreItem } from '../src/services/newsRank.js';

const NOW = Date.parse('2026-11-22T12:00:00.000Z');

const item = (overrides = {}) => ({
  id: `id-${Math.random().toString(16).slice(2)}`,
  title: 'Story',
  url: 'https://example.com/story',
  sourceId: 'coindesk',
  source: 'CoinDesk',
  publishedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
  tags: { coins: [], chains: [] },
  sourceCount: 1,
  sentiment: null,
  importance: 0,
  ...overrides,
});

test('newer stories outrank older ones when everything else matches', () => {
  const older = item({
    sourceId: 'decrypt',
    source: 'Decrypt',
    publishedAt: new Date(NOW - 8 * 3600e3).toISOString(),
  });
  const newer = item({
    sourceId: 'theblock',
    source: 'The Block',
    publishedAt: new Date(NOW - 10 * 60e3).toISOString(),
  });

  const ranked = rankItems([older, newer], { now: NOW });
  assert.deepEqual(
    ranked.map((entry) => entry.source),
    ['The Block', 'Decrypt'],
  );
});

test('coverage across outlets raises the score', () => {
  const base = item();
  const covered = item({ sourceCount: 4 });
  assert.ok(scoreItem(covered, { now: NOW }).total > scoreItem(base, { now: NOW }).total);
});

test('tracked-asset tags add a boost', () => {
  const plain = item();
  const tagged = item({ tags: { coins: ['btc'], chains: [] } });
  assert.equal(scoreItem(tagged, { now: NOW }).tracked, NEWS_SCORING.weights.tracked);
  assert.ok(scoreItem(tagged, { now: NOW }).total > scoreItem(plain, { now: NOW }).total);
});

test('only positive or negative sentiment boosts a story', () => {
  assert.equal(scoreItem(item({ sentiment: 'neutral' }), { now: NOW }).sentiment, 0);
  assert.ok(scoreItem(item({ sentiment: 'positive' }), { now: NOW }).sentiment > 0);
  assert.ok(scoreItem(item({ sentiment: 'negative' }), { now: NOW }).sentiment > 0);
});

test('a single publisher cannot fill more than six of the twenty slots', () => {
  const dominant = Array.from({ length: 12 }, (_, index) =>
    item({
      sourceId: 'coindesk',
      source: 'CoinDesk',
      id: `dominant-${index}`,
      title: `CoinDesk story ${index}`,
      url: `https://coindesk.com/${index}`,
    }),
  );
  const others = [
    ...Array.from({ length: 12 }, (_, index) =>
      item({
        sourceId: 'decrypt',
        source: 'Decrypt',
        id: `decrypt-${index}`,
        title: `Decrypt story ${index}`,
        url: `https://decrypt.co/${index}`,
        publishedAt: new Date(NOW - 2 * 3600e3).toISOString(),
      }),
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      item({
        sourceId: 'theblock',
        source: 'The Block',
        id: `block-${index}`,
        title: `The Block story ${index}`,
        url: `https://theblock.co/${index}`,
        publishedAt: new Date(NOW - 3 * 3600e3).toISOString(),
      }),
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      item({
        sourceId: 'blockworks',
        source: 'Blockworks',
        id: `works-${index}`,
        title: `Blockworks story ${index}`,
        url: `https://blockworks.co/${index}`,
        publishedAt: new Date(NOW - 4 * 3600e3).toISOString(),
      }),
    ),
  ];

  const ranked = rankItems([...dominant, ...others], { now: NOW });
  const coindesk = ranked.filter((entry) => entry.sourceId === 'coindesk');

  assert.equal(ranked.length, 20);
  assert.ok(coindesk.length <= 6, `CoinDesk took ${coindesk.length} slots`);
});

test('the window filter drops stories outside the requested window', () => {
  const recent = item({ id: 'recent' });
  const old = item({ id: 'old', publishedAt: new Date(NOW - 2 * 3600e3).toISOString() });

  const ranked = rankItems([recent, old], { now: NOW, windowHours: 1 });
  assert.deepEqual(
    ranked.map((entry) => entry.id),
    ['recent'],
  );
});

test('ranking is deterministic for identical scores', () => {
  const first = item({ id: 'aaa', sourceId: 'decrypt', source: 'Decrypt' });
  const second = item({ id: 'bbb', sourceId: 'theblock', source: 'The Block' });

  const forward = rankItems([first, second], { now: NOW }).map((entry) => entry.id);
  const backward = rankItems([second, first], { now: NOW }).map((entry) => entry.id);
  assert.deepEqual(forward, backward);
});
