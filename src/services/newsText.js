// Pure text/URL helpers shared by the scheduled job, the browser and the
// tests. Nothing here touches the network or the DOM.

const ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  laquo: '«',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  raquo: '»',
  rdquo: '”',
  rsquo: '’',
  sbquo: '‚',
  bdquo: '„',
  times: '×',
};

export const decodeEntities = (value = '') => {
  let text = String(value);

  // Some feeds double-encode ("&amp;#8217;"), so two passes are needed before
  // the result is plain text.
  for (let pass = 0; pass < 2; pass += 1) {
    text = text
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        const code = Number.parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : '';
      })
      .replace(/&#(\d+);/g, (_, digits) => {
        const code = Number.parseInt(digits, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : '';
      })
      .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
  }

  return text;
};

// Summary fields arrive as HTML. We keep their text, not their markup, and we
// never request the article itself.
export const stripHtml = (value = '') =>
  decodeEntities(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();

export const truncate = (value = '', maxLength = 200) => {
  const text = String(value).trim();
  if (text.length <= maxLength) return text;

  // Cut at a word boundary when one is close, otherwise hard-cut.
  const slice = text.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
};

export const cleanSnippet = (value = '', maxLength = 200) =>
  truncate(stripHtml(value).replace(/\s+/g, ' '), maxLength);

// Tracking parameters are dropped before an item is identified or linked. The
// list is deliberately narrow: removing arbitrary keys can change an article's
// canonical path on some publishers.
const TRACKING_PARAMS = new Set([
  'at_campaign',
  'at_medium',
  'cmpid',
  'dclid',
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
  'ref_src',
  's',
  'sr_share',
  'utm_campaign',
  'utm_content',
  'utm_id',
  'utm_medium',
  'utm_name',
  'utm_reader',
  'utm_source',
  'utm_term',
  'vero_conv',
  'vero_id',
  '__twitter_impression',
]);

export const canonicalUrl = (raw = '') => {
  const value = String(raw).trim();
  if (!value) return '';

  let url;
  try {
    url = new URL(value);
  } catch {
    // A handful of feeds omit the scheme; try https once.
    try {
      url = new URL(`https://${value}`);
    } catch {
      return '';
    }
  }

  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');

  // Only http(s) links are publishable headlines.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
  }

  // Sorted parameters make two spellings of the same link hash identically.
  url.searchParams.sort();

  let pathname = url.pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1) pathname = pathname.replace(/\/$/, '');
  url.pathname = pathname;

  return url.toString();
};

// FNV-1a over the canonical URL: stable across runs, short enough for an id and
// cheap enough to run in both Node and the browser without a crypto import.
export const hashId = (value = '') => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  const second = (hash >>> 0).toString(16).padStart(8, '0');
  return `n_${second}`;
};

const TITLE_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'will',
  'with',
]);

// Lowercase, drop publisher suffixes (" - CoinDesk"), punctuation and stopwords.
export const normalizeTitle = (title = '') =>
  String(title)
    .toLowerCase()
    .replace(/\s+[-|–—]\s+[^-|–—]{2,24}$/, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const titleTokens = (title = '') =>
  normalizeTitle(title)
    .split(' ')
    .filter((token) => token.length > 1 && !TITLE_STOPWORDS.has(token))
    // A light plural fold keeps "inflows"/"inflow" and "surges"/"surge" from
    // hiding a syndicated headline.
    .map((token) => (token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token));

// Token-set Jaccard similarity. Duplicate wire stories usually keep most of the
// same content words; unrelated headlines rarely share more than a couple.
export const titleSimilarity = (left, right) => {
  const a = new Set(titleTokens(left));
  const b = new Set(titleTokens(right));

  if (a.size < 3 || b.size < 3) return 0;

  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;

  return shared / (a.size + b.size - shared);
};

export const DUPLICATE_TITLE_SIMILARITY = 0.72;
