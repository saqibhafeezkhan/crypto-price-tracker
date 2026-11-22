// Adapter: CryptoPanic. Disabled unless CRYPTOPANIC_API_KEY is set. It is an
// enrichment source only: CryptoPanic links point at CryptoPanic, while this
// page must link to the original publisher, so its signals are matched onto RSS
// items by URL/title instead of being published as headlines.
//
// Verified against https://cryptopanic.com/developers/api (base URL
// /api/<plan>/v2/posts/, auth_token query parameter, 10 req/sec, server-side
// cache means there is no value in polling faster than every 30 seconds).
import { canonicalUrl, titleSimilarity } from '../../src/services/newsText.js';
import { NEWS_FETCH_TIMEOUT_MS, NEWS_USER_AGENT } from '../../src/constants/news.js';

const PLANS = new Set(['developer', 'growth', 'enterprise']);
const MATCH_SIMILARITY = 0.8;
const MATCH_WINDOW_MS = 48 * 60 * 60 * 1000;

const asPlan = (value) => (PLANS.has(value) ? value : 'growth');

const parseSentiment = (value) =>
  typeof value === 'string' && ['positive', 'neutral', 'negative'].includes(value.toLowerCase())
    ? value.toLowerCase()
    : null;

// votes.important is a reader signal, not a sentiment label. It only feeds the
// optional importance boost; sentiment is never derived from votes.
const parseImportance = (post) => {
  if (Number.isFinite(post?.importance)) return post.importance;
  const votes = Number(post?.votes?.important);
  if (!Number.isFinite(votes) || votes <= 0) return 0;
  return votes >= 5 ? 3 : 2;
};

const publisherUrl = (post) => {
  const candidate = post?.original_url || post?.originalUrl || post?.source_url || post?.url || '';
  const canonical = canonicalUrl(candidate);
  return canonical && !/cryptopanic\.com/i.test(canonical) ? canonical : '';
};

export const cryptoPanicAdapter = {
  id: 'cryptopanic',
  label: 'CryptoPanic',
  kind: 'enrichment',
  attribution: 'Powered by CryptoPanic',
  attributionUrl: 'https://cryptopanic.com',
  docsUrl: 'https://cryptopanic.com/developers/api',

  enabled: (env = process.env) => Boolean(env.CRYPTOPANIC_API_KEY),

  async fetch({ env = process.env, signal } = {}) {
    const key = env.CRYPTOPANIC_API_KEY;
    const plan = asPlan(env.CRYPTOPANIC_API_PLAN || 'growth');
    const url = new URL(`https://cryptopanic.com/api/${plan}/v2/posts/`);
    url.searchParams.set('auth_token', key);
    url.searchParams.set('public', 'true');
    url.searchParams.set('kind', 'news');

    try {
      const timeout = AbortSignal.timeout(NEWS_FETCH_TIMEOUT_MS);
      const response = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': NEWS_USER_AGENT },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });

      if (!response.ok) {
        return {
          signals: [],
          meta: {
            enabled: true,
            ok: false,
            plan,
            attribution: this.attribution,
            attributionUrl: this.attributionUrl,
            error: `${response.status} ${response.statusText}`,
          },
        };
      }

      const data = await response.json();
      const posts = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.posts)
          ? data.posts
          : [];

      const signals = posts
        .map((post) => {
          const publishedAt = Date.parse(post?.published_at || post?.created_at || '');
          const title = String(post?.title || '').trim();
          if (!title || !Number.isFinite(publishedAt)) return null;

          return {
            title,
            url: publisherUrl(post),
            publishedAt: new Date(publishedAt).toISOString(),
            publisher: String(post?.source?.title || post?.source?.domain || '').trim(),
            sentiment: parseSentiment(post?.sentiment),
            importance: parseImportance(post),
          };
        })
        .filter(Boolean);

      return {
        signals,
        meta: {
          enabled: true,
          ok: true,
          plan,
          itemCount: signals.length,
          attribution: this.attribution,
          attributionUrl: this.attributionUrl,
        },
      };
    } catch (error) {
      return {
        signals: [],
        meta: {
          enabled: true,
          ok: false,
          plan,
          attribution: this.attribution,
          attributionUrl: this.attributionUrl,
          error: error.message,
        },
      };
    }
  },
};

/**
 * Applies CryptoPanic signals to already-deduped items. Returns the number of
 * items that received any signal.
 */
export const applySignals = (items, signals) => {
  if (!signals?.length) return 0;

  const byUrl = new Map(
    signals.filter((signal) => signal.url).map((signal) => [signal.url, signal]),
  );
  let matched = 0;

  for (const item of items) {
    let signal = byUrl.get(item.url);

    if (!signal) {
      signal = signals.find((candidate) => {
        const gap = Math.abs(Date.parse(candidate.publishedAt) - Date.parse(item.publishedAt));
        return (
          gap <= MATCH_WINDOW_MS && titleSimilarity(candidate.title, item.title) >= MATCH_SIMILARITY
        );
      });
    }

    if (!signal) continue;

    const before = `${item.sentiment}|${item.importance}`;
    item.sentiment = signal.sentiment || item.sentiment;
    item.importance = Math.max(item.importance || 0, signal.importance || 0);
    if (`${item.sentiment}|${item.importance}` !== before) matched += 1;
  }

  return matched;
};
