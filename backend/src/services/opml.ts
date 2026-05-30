import { parseString } from "xml2js";
import type { Database } from "../db";
import { feeds, type NewFeed } from "../db/schema";
import { generateId } from "../utils/id";

interface OpmlOutline {
  text: string;
  title?: string;
  xmlUrl: string;
  htmlUrl?: string;
  category?: string;
}

interface ParsedOpml {
  title: string;
  outlines: OpmlOutline[];
}

// Parse OPML XML string
export const parseOpml = (xml: string): Promise<ParsedOpml> => {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) {
        reject(new Error("Invalid OPML XML format"));
        return;
      }

      try {
        const opml = result.opml;
        if (!opml) {
          reject(new Error("Invalid OPML structure"));
          return;
        }

        const title = opml.head?.title ?? "Imported Feeds";
        const body = opml.body;

        if (!body || !body.outline) {
          resolve({ title, outlines: [] });
          return;
        }

        const outlines = parseOutlines(
          Array.isArray(body.outline) ? body.outline : [body.outline]
        );

        resolve({ title, outlines });
      } catch (error) {
        reject(new Error("Failed to parse OPML structure"));
      }
    });
  });
};

// Parse outline elements recursively
const parseOutlines = (elements: any[], category?: string): OpmlOutline[] => {
  const outlines: OpmlOutline[] = [];

  for (const element of elements) {
    const attrs = element.$ || element;
    const xmlUrl = attrs.xmlUrl;

    // Only process elements with xmlUrl (feed outlines)
    if (xmlUrl) {
      outlines.push({
        text: attrs.text ?? "",
        title: attrs.title ?? undefined,
        xmlUrl,
        htmlUrl: attrs.htmlUrl ?? undefined,
        category: category ?? attrs.category ?? undefined,
      });
    }

    // Process child outlines
    if (element.outline) {
      const childOutlines = Array.isArray(element.outline)
        ? element.outline
        : [element.outline];
      const parentCategory = attrs.text || category;
      outlines.push(...parseOutlines(childOutlines, parentCategory));
    }
  }

  return outlines;
};

// Import OPML feeds into database
export const importOpml = async (
  db: Database,
  xml: string
): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> => {
  const parsed = await parseOpml(xml);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const outline of parsed.outlines) {
    try {
      // Check if feed already exists
      const existing = await db.query.feeds.findFirst({
        where: (feeds, { eq }) => eq(feeds.url, outline.xmlUrl),
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create new feed
      const now = new Date();
      const newFeed: NewFeed = {
        id: generateId(),
        title: outline.title || outline.text,
        url: outline.xmlUrl,
        siteUrl: outline.htmlUrl,
        category: outline.category,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(feeds).values(newFeed);
      imported++;
    } catch (error) {
      errors.push(
        `Failed to import "${outline.text}": ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return { imported, skipped, errors };
};

// Export feeds to OPML XML
export const exportOpml = async (db: Database): Promise<string> => {
  const allFeeds = await db.query.feeds.findMany({
    orderBy: (feeds, { asc }) => [asc(feeds.category), asc(feeds.title)],
  });

  // Group by category
  const categories = new Map<string, typeof allFeeds>();
  for (const feed of allFeeds) {
    const category = feed.category ?? "Uncategorized";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(feed);
  }

  // Build OPML XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<opml version="2.0">\n';
  xml += '  <head>\n';
  xml += '    <title>RSS Reader Export</title>\n';
  xml += `    <dateCreated>${new Date().toUTCString()}</dateCreated>\n`;
  xml += '  </head>\n';
  xml += '  <body>\n';

  for (const [category, categoryFeeds] of categories) {
    if (category === "Uncategorized") {
      // Uncategorized feeds at root level
      for (const feed of categoryFeeds) {
        xml += `    <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}"`;
        if (feed.siteUrl) {
          xml += ` htmlUrl="${escapeXml(feed.siteUrl)}"`;
        }
        xml += '/>\n';
      }
    } else {
      // Grouped under category
      xml += `    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">\n`;
      for (const feed of categoryFeeds) {
        xml += `      <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}"`;
        if (feed.siteUrl) {
          xml += ` htmlUrl="${escapeXml(feed.siteUrl)}"`;
        }
        xml += '/>\n';
      }
      xml += '    </outline>\n';
    }
  }

  xml += '  </body>\n';
  xml += '</opml>';

  return xml;
};

// Escape special XML characters
const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};
