export interface RawNewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number; // unix seconds
  image?: string;
  relatedSymbol?: string;
}

export interface NewsProvider {
  readonly name: string;
  isConfigured(): boolean;
  getCompanyNews(symbol: string, fromDate: string, toDate: string): Promise<RawNewsArticle[]>;
  getGeneralNews(): Promise<RawNewsArticle[]>;
}
