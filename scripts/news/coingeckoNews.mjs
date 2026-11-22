// Adapter: CoinGecko News. Optional and off unless COINGECKO_API_KEY (or
// COINGECKO_PRO_API_KEY) is set. The /news endpoint is restricted to the Analyst
// plan and above, so a 401/403 simply disables enrichment without breaking RSS.
//
// Verified against https://docs.coingecko.com/reference/news: GET /news on
// pro-api.coingecko.com, x-cg-pro-api-key header, per_page <= 20, type=news.
import { TOP_COINS } from '../../src/constants/topCoins.js';
import { NEWS_FETCH_TIMEOUT_MS, NEWS_USER_AGENT } from '../../src/constants/news.js';

const SYMBOL_BY_ID = new Map(TOP_COINS.map((coin) => [coin.id, coin.symbol?.toLowerCase()]));
const slug = (value) =>
  String(value || 'coingecko')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const coinGeckoNewsAdapter = {
  id: 'coingecko',
  label: 'CoinGecko News',
  kind: 'news',
  docsUrl: 'https://docs.coingecko.com/reference/news',

  enabled: (env = process.env) =>
    Boolean(env.COINGECKO_NEWS_API_KEY || env.COINGECKO_PRO_API_KEY || env.COINGECKO_API_KEY),

  async fetch({ env = process.env, signal } = {}) {
    const key =
      env.COINGECKO_NEWS_API_KEY || env.COINGECKO_PRO_API_KEY || env.COINGECKO_API_KEY || '';
    const url = new URL('https://pro-api.coingecko.com/api/v3/news');
    url.searchParams.set('per_page', '20');
    url.searchParams.set('page', '1');
    url.searchParams.set('type', 'news');
    url.searchParams.set('language', 'en');

    try {
      const timeout = AbortSignal.timeout(NEWS_FETCH_TIMEOUT_MS);
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': NEWS_USER_AGENT,
          'x-cg-pro-api-key': key,
        },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });

      if (!response.ok) {
        return {
          items: [],
          meta: {
            enabled: true,
            ok: false,
            // The endpoint needs Analyst+; that is the most likely 401/403.
            error:
              response.status === 401 || response.status === 403
                ? `plan does not include /news (${response.status})`
                : `${response.status} ${response.statusText}`,
          },
        };
      }

      const data = await response.json();
      const articles = Array.isArray(data) ? data : [];

      const items = articles
        .filter((article) => article?.type !== 'guide')
        .map((article) => ({
          sourceId: `cg:${slug(article.source_name)}`,
          source: String(article.source_name || 'CoinGecko News').trim(),
          title: String(article.title || '').trim(),
          url: article.url,
          publishedAt: article.posted_at,
          // CoinGecko provides no summary field; the headline stands alone.
          summary: '',
          // Structured coin matches from the API are used as tag hints.
          coins: (article.related_coin_ids || []).map((id) => SYMBOL_BY_ID.get(id)).filter(Boolean),
          provider: 'coingecko',
        }));

      return {
        items,
        meta: { enabled: true, ok: true, itemCount: items.length },
      };
    } catch (error) {
      return {
        items: [],
        meta: { enabled: true, ok: false, error: error.message },
      };
    }
  },
};
