import Parser from "rss-parser";

export interface ParsedFeed {
  title: string;
  link: string;
  description?: string;
  items: ParsedArticle[];
}

export interface ParsedArticle {
  guid: string;
  title: string;
  link: string;
  author?: string;
  summary?: string;
  content?: string;
  publishedAt?: Date;
}

// Custom fields for the parser
const customFields = {
  item: [
    ["media:content", "mediaContent"],
    ["content:encoded", "contentEncoded"],
  ],
};

// Create parser instance
const createParser = () => {
  return new Parser({
    customFields,
    timeout: 10000, // 10 second timeout
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
    requestOptions: {
      rejectUnauthorized: false,
    },
  });
};

// Parse RSS feed from URL
export const parseFeed = async (url: string, etag?: string, lastModified?: string): Promise<{
  feed: ParsedFeed;
  etag?: string;
  lastModified?: string;
  status: number;
}> => {
  const parser = createParser();

  // Build request headers for conditional fetching
  const headers: Record<string, string> = {};
  if (etag) {
    headers["If-None-Match"] = etag;
  }
  if (lastModified) {
    headers["If-Modified-Since"] = lastModified;
  }

  try {
    // Fetch and parse the feed
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    // 304 Not Modified
    if (response.status === 304) {
      return {
        feed: { title: "", link: "", items: [] },
        status: 304,
      };
    }

    // Get ETag and Last-Modified from response
    const responseEtag = response.headers.get("etag") ?? undefined;
    const responseLastModified = response.headers.get("last-modified") ?? undefined;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const result = await parser.parseString(xml);

    // Map items to our format
    const items: ParsedArticle[] = result.items.map((item) => {
      // Determine GUID - fallback to link if no guid
      const guid = item.guid || item.link || generateFallbackGuid(item.title || "");

      // Get content - prefer content:encoded, then content, then description/summary
      const content = item.contentEncoded || item.content || undefined;
      const summary = item.contentSnippet || item.summary || item.description || undefined;

      // Parse date
      let publishedAt: Date | undefined;
      if (item.pubDate) {
        publishedAt = new Date(item.pubDate);
      } else if (item.isoDate) {
        publishedAt = new Date(item.isoDate);
      }

      return {
        guid,
        title: item.title || "Untitled",
        link: item.link || "",
        author: (item.creator || item.author || undefined) as string | undefined,
        summary: summary as string | undefined,
        content: content as string | undefined,
        publishedAt,
      };
    });

    return {
      feed: {
        title: result.title || "Untitled Feed",
        link: result.link || url,
        description: result.description || undefined,
        items,
      },
      etag: responseEtag,
      lastModified: responseLastModified,
      status: 200,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse feed: ${error.message}`);
    }
    throw new Error("Failed to parse feed: Unknown error");
  }
};

// Generate a fallback GUID from title
const generateFallbackGuid = (title: string): string => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `guid-${Math.abs(hash).toString(36)}`;
};
