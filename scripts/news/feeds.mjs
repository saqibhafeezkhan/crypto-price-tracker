// Adapter: publisher RSS/Atom feeds. Always enabled. One bad feed is reported
// and skipped; it never fails the other sources.
import { XMLParser } from 'fast-xml-parser';
import {
  NEWS_FETCH_TIMEOUT_MS,
  NEWS_RETRY_ATTEMPTS,
  NEWS_SOURCES,
  NEWS_USER_AGENT,
} from '../../src/constants/news.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Node text can be a string, a CDATA object, or an object with a #text fallback.
export const nodeText = (node) => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  return String(node.__cdata ?? node['#text'] ?? '');
};

const atomLink = (link) => {
  const links = Array.isArray(link) ? link : link ? [link] : [];
  const alternate = links.find(
    (entry) => entry && (!entry['@_rel'] || entry['@_rel'] === 'alternate') && entry['@_href'],
  );
  return alternate?.['@_href'] || links.find((entry) => entry?.['@_href'])?.['@_href'] || '';
};

const firstText = (item, keys) => {
  for (const key of keys) {
    const value = nodeText(item?.[key]);
    if (value.trim()) return value;
  }
  return '';
};

const requestText = async (url, { signal } = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= NEWS_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const timeout = AbortSignal.timeout(NEWS_FETCH_TIMEOUT_MS);
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
      const response = await fetch(url, {
        headers: {
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
          'user-agent': NEWS_USER_AGENT,
        },
        redirect: 'follow',
        signal: combined,
      });

      if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      const retryable =
        error.name === 'TimeoutError' ||
        error.status === 429 ||
        error.status >= 500 ||
        error.status === undefined;
      if (attempt >= NEWS_RETRY_ATTEMPTS || !retryable) break;
      await sleep(700 * attempt * attempt);
    }
  }

  throw lastError;
};

const parseFeed = (xml) => {
  const document = parser.parse(xml);
  const rssItems = document?.rss?.channel?.item;
  const atomEntries = document?.feed?.entry;
  const rdfItems = document?.['rdf:RDF']?.item;

  if (Array.isArray(rssItems) || rssItems) {
    return { kind: 'rss', items: Array.isArray(rssItems) ? rssItems : [rssItems] };
  }
  if (Array.isArray(atomEntries) || atomEntries) {
    return { kind: 'atom', items: Array.isArray(atomEntries) ? atomEntries : [atomEntries] };
  }
  if (Array.isArray(rdfItems) || rdfItems) {
    return { kind: 'rss', items: Array.isArray(rdfItems) ? rdfItems : [rdfItems] };
  }

  return { kind: 'unknown', items: [] };
};

const toRawItem = (entry, kind, source) => {
  const link =
    kind === 'atom'
      ? atomLink(entry.link) || nodeText(entry.id)
      : nodeText(entry.link) || nodeText(entry.guid);

  return {
    sourceId: source.id,
    source: source.name,
    title: firstText(entry, ['title']),
    url: link,
    publishedAt: firstText(entry, ['pubDate', 'dc:date', 'published', 'updated']),
    // The feed's own summary only. The adapter never fetches the article.
    summary: firstText(entry, ['description', 'summary', 'content:encoded', 'content']),
    provider: 'rss',
  };
};

const fetchSource = async (source, { signal } = {}) => {
  const xml = await requestText(source.feedUrl, { signal });
  const { kind, items } = parseFeed(xml);

  if (kind === 'unknown') throw new Error('unrecognised feed format');

  const raw = items.map((entry) => toRawItem(entry, kind, source));
  const usable = raw.filter((item) => item.title && item.url && item.publishedAt);

  return {
    items: usable,
    skipped: raw.length - usable.length,
    kind,
  };
};

export const rssAdapter = {
  id: 'rss',
  label: 'Publisher feeds',
  alwaysOn: true,
  enabled: () => true,

  // Returns { items, sources: [{ id, name, homepage, ok, itemCount, error }] }.
  async fetch({ signal } = {}) {
    const results = await Promise.allSettled(
      NEWS_SOURCES.map((source) => fetchSource(source, { signal })),
    );

    const items = [];
    const sources = [];

    results.forEach((result, index) => {
      const source = NEWS_SOURCES[index];

      if (result.status === 'fulfilled') {
        items.push(...result.value.items);
        sources.push({
          id: source.id,
          name: source.name,
          homepage: source.homepage,
          feedUrl: source.feedUrl,
          ok: true,
          itemCount: result.value.items.length,
          skipped: result.value.skipped,
          format: result.value.kind,
        });
      } else {
        sources.push({
          id: source.id,
          name: source.name,
          homepage: source.homepage,
          feedUrl: source.feedUrl,
          ok: false,
          itemCount: 0,
          error: result.reason?.message || 'unknown error',
        });
      }
    });

    return { items, sources };
  },
};
