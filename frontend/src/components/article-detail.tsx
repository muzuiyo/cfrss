"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookOpen } from "lucide-react";
import { format } from "date-fns";
import type { Article } from "@/types";
import DOMPurify from "dompurify";

interface ArticleDetailProps {
  article: Article;
  hideHeader?: boolean;
}

export function ArticleDetail({ article, hideHeader = false }: ArticleDetailProps) {
  const content = article.content
    ? DOMPurify.sanitize(article.content, {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
      })
    : null;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight mb-4">
            {article.title}
          </h1>
          {(article.author || article.published_at) && (
            <div className="flex flex-wrap items-center gap-2 mb-8 text-sm text-muted-foreground">
              {article.author && (
                <span className="font-medium">{article.author}</span>
              )}
              {article.author && article.published_at && (
                <Separator orientation="vertical" className="h-4" />
              )}
              {article.published_at && (
                <span title={format(new Date(article.published_at), "PPpp")}>
                  {format(new Date(article.published_at), "yyyy-MM-dd HH:mm")}
                </span>
              )}
            </div>
          )}
          {content ? (
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : article.summary ? (
            <p className="text-base leading-relaxed">{article.summary}</p>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No content available</p>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Read original article
              </a>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
