-- RSS Reader Database Schema
-- Created: 2024-12-18
-- Updated: 2026-05-31

-- Feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  custom_title TEXT,
  url TEXT NOT NULL UNIQUE,
  site_url TEXT,
  favicon TEXT,
  category TEXT,
  etag TEXT,
  last_modified TEXT,
  last_fetched_at INTEGER,
  last_error TEXT,
  unread_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY NOT NULL,
  feed_id TEXT NOT NULL,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  author TEXT,
  summary TEXT,
  content TEXT,
  published_at INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_starred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS feed_guid_idx ON articles(feed_id, guid);
CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
CREATE INDEX IF NOT EXISTS idx_articles_is_starred ON articles(is_starred);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_feeds_category ON feeds(category);
