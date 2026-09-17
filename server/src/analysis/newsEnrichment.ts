import { NewsArticle, NewsScope } from '../types';
import { RawNewsArticle } from '../providers/news/types';
import { scoreSentiment } from './sentiment';

// Converts a provider's raw article into the app's NewsArticle shape,
// attaching a sentiment score and marking whether it's company-specific or
// general market news. This is the one place scope gets assigned, so a
// general article can never accidentally masquerade as company news.

export function enrichArticle(raw: RawNewsArticle, scope: NewsScope): NewsArticle {
  return {
    id: raw.id,
    headline: raw.headline,
    summary: raw.summary,
    source: raw.source,
    url: raw.url,
    datetime: raw.datetime,
    image: raw.image,
    relatedSymbol: raw.relatedSymbol,
    scope,
    sentiment: scoreSentiment(raw.headline, raw.summary),
  };
}

export function enrichArticles(raws: RawNewsArticle[], scope: NewsScope): NewsArticle[] {
  return raws.map((r) => enrichArticle(r, scope));
}
