import { NewsArticle } from '../types';
import { formatRelativeTime } from '../utils/time';

const SENTIMENT_STYLES: Record<NewsArticle['sentiment']['label'], { dot: string; text: string; label: string }> = {
  positive: { dot: 'bg-green', text: 'text-green', label: 'Positive' },
  neutral: { dot: 'bg-gray', text: 'text-gray', label: 'Neutral' },
  negative: { dot: 'bg-red', text: 'text-red', label: 'Negative' },
};

export function NewsArticleCard({ article, showTicker = true }: { article: NewsArticle; showTicker?: boolean }) {
  const sentiment = SENTIMENT_STYLES[article.sentiment.label];
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-4 sm:px-5 py-4 hover:bg-panelhover transition-colors"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mb-1.5">
        <span>{formatRelativeTime(article.datetime)}</span>
        <span className="text-faint">·</span>
        <span>{article.source}</span>
        {showTicker && article.relatedSymbol && (
          <>
            <span className="text-faint">·</span>
            <span className="text-text font-medium">{article.relatedSymbol}</span>
          </>
        )}
        <span className="inline-flex items-center gap-1.5 ml-auto">
          <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dot}`} />
          <span className={sentiment.text}>{sentiment.label}</span>
        </span>
      </div>
      <div className="text-sm font-medium text-text mb-1 leading-snug">{article.headline}</div>
      {article.summary && <div className="text-sm text-muted line-clamp-2 leading-relaxed">{article.summary}</div>}
    </a>
  );
}
