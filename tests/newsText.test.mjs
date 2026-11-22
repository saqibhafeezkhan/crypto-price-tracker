import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalUrl,
  cleanSnippet,
  decodeEntities,
  hashId,
  normalizeTitle,
  stripHtml,
  titleSimilarity,
} from '../src/services/newsText.js';

test('canonicalUrl drops tracking parameters, fragments and default noise', () => {
  assert.equal(
    canonicalUrl(
      'https://www.CoinDesk.com/markets/bitcoin/?utm_source=rss&utm_medium=feed&fbclid=abc#top',
    ),
    'https://coindesk.com/markets/bitcoin',
  );
});

test('canonicalUrl keeps meaningful query parameters and sorts them', () => {
  assert.equal(
    canonicalUrl('https://example.com/story?id=42&page=2&utm_campaign=news'),
    'https://example.com/story?id=42&page=2',
  );
});

test('canonicalUrl repairs a missing scheme and rejects non-http links', () => {
  assert.equal(canonicalUrl('example.com/a'), 'https://example.com/a');
  assert.equal(canonicalUrl('javascript:alert(1)'), '');
  assert.equal(canonicalUrl(''), '');
});

test('decodeEntities handles numeric, named and double-encoded entities', () => {
  assert.equal(
    decodeEntities('Bitcoin&#8217;s &amp; Ether&#x27;s &amp;#8217;'),
    "Bitcoin’s & Ether's ’",
  );
});

test('stripHtml leaves plain text only', () => {
  assert.equal(
    stripHtml('<p>Hello <strong>world</strong>&nbsp;<script>bad()</script></p>'),
    'Hello world',
  );
});

test('cleanSnippet strips markup and caps the text near 200 characters', () => {
  const snippet = cleanSnippet(
    `<p>${'word '.repeat(80)}</p><img src="https://example.com/x.png">`,
    200,
  );

  assert.ok(snippet.length <= 200, `snippet was ${snippet.length} chars`);
  assert.ok(!snippet.includes('<'));
  assert.ok(!snippet.includes('example.com/x.png'));
});

test('normalizeTitle removes punctuation, case and publisher suffixes', () => {
  assert.equal(
    normalizeTitle('Bitcoin Rallies Past $70,000! - CoinDesk'),
    'bitcoin rallies past 70 000',
  );
});

test('titleSimilarity scores syndicated headlines high and unrelated ones low', () => {
  const copy = titleSimilarity(
    'Bitcoin rallies past $70,000 as ETF inflows surge',
    'Bitcoin rallies past $70,000 as ETF inflow surges',
  );
  const unrelated = titleSimilarity(
    'Bitcoin rallies past $70,000 as ETF inflows surge',
    'Solana validator upgrade ships on mainnet',
  );

  assert.ok(copy > 0.72, `expected a duplicate score, got ${copy}`);
  assert.ok(unrelated < 0.2, `expected a low score, got ${unrelated}`);
});

test('hashId is stable for the same URL and differs for another', () => {
  assert.equal(hashId('https://example.com/a'), hashId('https://example.com/a'));
  assert.notEqual(hashId('https://example.com/a'), hashId('https://example.com/b'));
});
