export interface Feed {
  id: string;
  title: string;
  url: string;
  site_url: string | null;
  favicon: string | null;
  category: string | null;
  unread_count: number;
  created_at: number;
  updated_at: number;
}

export interface Article {
  id: string;
  feed_id: string;
  guid: string;
  title: string;
  link: string;
  author: string | null;
  summary: string | null;
  content: string | null;
  published_at: number | null;
  is_read: number;
  is_starred: number;
  created_at: number;
  updated_at: number;
  feed_title?: string;
  feed_favicon?: string;
}

export interface Settings {
  refresh_interval: string;
  ui_theme: string;
  ui_articles_per_page: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}
