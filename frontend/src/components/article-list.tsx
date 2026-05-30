"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useMarkRead, useStar, useUnstar } from "@/hooks/use-articles";
import type { Article } from "@/types";
import DOMPurify from "dompurify";

interface ArticleListProps {
  articles: Article[];
  total: number;
  page: number;
  perPage: number;
  isLoading?: boolean;
  selectedId?: string | null;
  onSelect: (article: Article) => void;
  onPageChange: (page: number) => void;
}

export function ArticleList({
  articles,
  total,
  page,
  perPage,
  isLoading,
  selectedId,
  onSelect,
  onPageChange,
}: ArticleListProps) {
  const markRead = useMarkRead();
  const star = useStar();
  const unstar = useUnstar();
  const totalPages = Math.ceil(total / perPage);

  const handleClick = (article: Article) => {
    if (!article.is_read) {
      onSelect({ ...article, is_read: 1 });
      markRead.mutate(article.id);
    } else {
      onSelect(article);
    }
  };

  const handleStar = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    article.is_starred ? unstar.mutate(article.id) : star.mutate(article.id);
  };

  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Inbox className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No articles</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {articles.map((article) => (
          <div
            key={article.id}
            onClick={() => handleClick(article)}
            className={cn(
              "flex gap-3 p-4 cursor-pointer transition-colors border-b",
              selectedId === article.id ? "bg-accent" : "hover:bg-accent/50",
              !article.is_read && "bg-primary/5"
            )}
          >
            {/* Star */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 mt-0.5 shrink-0"
              onClick={(e) => handleStar(e, article)}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  article.is_starred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                )}
              />
            </Button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {article.feed_title}
                </span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {article.published_at
                    ? (() => {
                        const now = Date.now();
                        const diff = now - article.published_at;
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        if (days < 7) {
                          return formatDistanceToNow(new Date(article.published_at), { addSuffix: true });
                        } else {
                          return format(new Date(article.published_at), "yyyy-MM-dd");
                        }
                      })()
                    : ""}
                </span>
              </div>
              <h3
                className={cn(
                  "text-sm leading-snug line-clamp-2",
                  !article.is_read ? "font-semibold" : "font-normal text-foreground/80"
                )}
              >
                {article.title}
              </h3>
              {article.summary && (
                <p
                  className="text-xs text-muted-foreground line-clamp-2 mt-1"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(article.summary, { ALLOWED_TAGS: [] }),
                  }}
                />
              )}
            </div>

            {/* Unread dot */}
            {!article.is_read && (
              <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
            )}
          </div>
        ))}
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-7 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-7 text-xs"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
