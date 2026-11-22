// Transparent ranking for the news list. The same function runs in the refresh
// job (to store the score breakdown) and in the browser (to re-rank inside a
// time window or after a filter).
//
// score = recency + sourceCount + trust + tracked + sentiment + importance
// Every component is a weight from src/constants/news.js.
import { NEWS_SCORING, NEWS_SOURCES } from '../constants/news.js';

const TRUST_BY_SOURCE = new Map(NEWS_SOURCES.map((source) => [source.id, source.trust]));
const DEFAULT_TRUST = 0.5;

const round = (value) => Math.round(value * 1000) / 1000;

const recencyScore = (publishedAt, now, scoring) => {
  const time = Date.parse(publishedAt);
  if (!Number.isFinite(time)) return 0;

  // A clock skew that puts an item slightly in the future should not make it
  // infinitely fresh.
  const ageHours = Math.max(0, now - time) / (60 * 60 * 1000);
  return scoring.weights.recency * 0.5 ** (ageHours / scoring.recencyHalfLifeHours);
};

export const scoreItem = (item, { now = Date.now(), scoring = NEWS_SCORING } = {}) => {
  const recency = recencyScore(item.publishedAt, now, scoring);
  const extraSources = Math.min(Math.max(0, (item.sourceCount || 1) - 1), scoring.sourceCountCap);
  const sourceCount = extraSources * scoring.weights.sourceCount;
  const trust = (TRUST_BY_SOURCE.get(item.sourceId) ?? DEFAULT_TRUST) * scoring.weights.trust;
  const tracked =
    item.tags?.coins?.length > 0 || item.tags?.chains?.length > 0 ? scoring.weights.tracked : 0;
  // Neutral is not a reason to promote a headline; positive and negative are.
  const sentiment =
    item.sentiment === 'positive' || item.sentiment === 'negative' ? scoring.weights.sentiment : 0;
  const importance =
    (Math.min(3, Math.max(0, item.importance || 0)) / 3) * scoring.weights.importance;

  return {
    total: round(recency + sourceCount + trust + tracked + sentiment + importance),
    recency: round(recency),
    sourceCount: round(sourceCount),
    trust: round(trust),
    tracked: round(tracked),
    sentiment: round(sentiment),
    importance: round(importance),
  };
};

/**
 * Filters by window, scores every item, then greedily fills the top slots while
 * enforcing the per-source cap. A single outlet can never take more than
 * `scoring.perSourceLimit` of the returned list.
 */
export const rankItems = (
  items,
  { now = Date.now(), scoring = NEWS_SCORING, windowHours = null } = {},
) => {
  const cutoff = windowHours ? now - windowHours * 60 * 60 * 1000 : null;

  const candidates = (Array.isArray(items) ? items : [])
    .filter((item) => {
      if (!item?.publishedAt) return false;
      if (cutoff === null) return true;
      const time = Date.parse(item.publishedAt);
      return Number.isFinite(time) && time >= cutoff;
    })
    .map((item) => ({ ...item, score: scoreItem(item, { now, scoring }) }))
    .sort((left, right) => {
      if (right.score.total !== left.score.total) return right.score.total - left.score.total;
      const time = Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
      return time !== 0 ? time : String(left.id).localeCompare(String(right.id));
    });

  const perSource = new Map();
  const selected = [];

  for (const item of candidates) {
    if (selected.length >= scoring.topCount) break;

    const used = perSource.get(item.sourceId) || 0;
    if (used >= scoring.perSourceLimit) continue;

    perSource.set(item.sourceId, used + 1);
    selected.push({ ...item, rank: selected.length + 1 });
  }

  return selected;
};
