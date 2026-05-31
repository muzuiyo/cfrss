"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useAuth } from "@/components/auth-provider";
import { Sidebar, type View } from "@/components/sidebar";
import { ArticleList } from "@/components/article-list";
import { ArticleDetail } from "@/components/article-detail";
import { SettingsView } from "@/components/settings-view";
import { useArticles, useUnreadArticles, useStarredArticles, useMarkRead, useMarkUnread, useStar, useUnstar } from "@/hooks/use-articles";
import { useFeeds } from "@/hooks/use-feeds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, ArrowLeft, Star, CheckCircle, Circle, ExternalLink, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Article } from "@/types";

export default function HomePage() {
  const { user } = useAuth();
  const { data: feeds = [] } = useFeeds();
  const [view, setView] = useState<View>("all");
  const [feedId, setFeedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const perPage = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Mutations
  const markRead = useMarkRead();
  const markUnread = useMarkUnread();
  const star = useStar();
  const unstar = useUnstar();

  // Fetch articles based on current view
  const searchParam = debouncedSearch || undefined;
  const allQuery = useArticles(page, perPage, feedId ?? undefined, searchParam);
  const unreadQuery = useUnreadArticles(page, perPage, feedId ?? undefined, searchParam);
  const starredQuery = useStarredArticles(page, perPage, searchParam);

  const { data, isLoading, total } = useMemo(() => {
    switch (view) {
      case "unread":
        return { data: unreadQuery.data, isLoading: unreadQuery.isLoading, total: unreadQuery.data?.total ?? 0 };
      case "starred":
        return { data: starredQuery.data, isLoading: starredQuery.isLoading, total: starredQuery.data?.total ?? 0 };
      default:
        return { data: allQuery.data, isLoading: allQuery.isLoading, total: allQuery.data?.total ?? 0 };
    }
  }, [view, allQuery, unreadQuery, starredQuery]);

  const articles = data?.data ?? [];

  // Get current feed info
  const currentFeed = useMemo(() => {
    if (!feedId) return null;
    return feeds.find(f => f.id === feedId) ?? null;
  }, [feedId, feeds]);

  const handleViewChange = useCallback((v: View, newFeedId?: string) => {
    setView(v);
    setFeedId(newFeedId ?? null);
    setPage(1);
    setSelectedArticle(null);
    setSidebarOpen(false);
    setSearchQuery("");
    setDebouncedSearch("");
  }, []);

  const handleSelectArticle = useCallback((article: Article) => {
    setSelectedArticle(article);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedArticle(null);
  }, []);

  // Get title for current view
  const viewTitle = useMemo(() => {
    if (currentFeed) return currentFeed.title;
    switch (view) {
      case "unread": return "Unread";
      case "starred": return "Starred";
      case "settings": return "Settings";
      default: return "All Articles";
    }
  }, [view, currentFeed]);

  // Sidebar content
  const sidebarContent = (
    <Sidebar
      currentView={view}
      currentFeedId={feedId}
      onViewChange={handleViewChange}
    />
  );

  // Article list content
  const articleListContent = (
    <ArticleList
      articles={articles}
      total={total}
      page={page}
      perPage={perPage}
      isLoading={isLoading}
      selectedId={selectedArticle?.id}
      onSelect={handleSelectArticle}
      onPageChange={setPage}
    />
  );

  // Settings content
  const settingsContent = <SettingsView />;

  // Build header content for article detail view
  const articleDetailHeader = selectedArticle && (
    <>
      {/* Back button */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Feed info */}
      <div className="flex items-center gap-2 min-w-0 flex-1 ml-1">
        {selectedArticle.feed_favicon && (
          <img src={selectedArticle.feed_favicon} alt="" className="h-5 w-5 rounded shrink-0" />
        )}
        <span className="text-sm font-medium truncate">{viewTitle}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const newStarred = !selectedArticle.is_starred;
            setSelectedArticle({ ...selectedArticle, is_starred: newStarred ? 1 : 0 });
            selectedArticle.is_starred ? unstar.mutate(selectedArticle.id) : star.mutate(selectedArticle.id);
          }}
        >
          <Star className={cn("h-4 w-4", selectedArticle.is_starred && "fill-yellow-500 text-yellow-500")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const newRead = !selectedArticle.is_read;
            setSelectedArticle({ ...selectedArticle, is_read: newRead ? 1 : 0 });
            selectedArticle.is_read ? markUnread.mutate(selectedArticle.id) : markRead.mutate(selectedArticle.id);
          }}
        >
          {selectedArticle.is_read ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => window.open(selectedArticle.link, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Mobile header */}
      <div className="flex md:hidden items-center h-14 px-4 border-b shrink-0 gap-2">
        {selectedArticle ? (
          // Article detail header (mobile)
          articleDetailHeader
        ) : (
          // Normal header (mobile)
          <>
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                {sidebarContent}
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm truncate flex-1">{viewTitle}</span>
            {view !== "settings" && (
              <div className="relative w-40">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-7 text-sm"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex shrink-0 min-w-50 max-w-xs">
          {sidebarContent}
        </div>

        {/* Desktop main area */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          {/* Desktop header */}
          <div className="flex items-center h-14 px-4 border-b shrink-0 gap-2">
            {selectedArticle && view !== "settings" ? (
              // Article detail header (desktop)
              articleDetailHeader
            ) : (
              // Normal header (desktop)
              <>
                <h2 className="text-sm font-semibold truncate">{viewTitle}</h2>
                {view !== "settings" && (
                  <div className="relative ml-auto w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {view === "settings" ? (
              settingsContent
            ) : selectedArticle ? (
              <PanelGroup orientation="horizontal" className="h-full">
                <Panel defaultSize={35} minSize={25}>
                  {articleListContent}
                </Panel>
                <PanelResizeHandle className="w-px bg-border hover:bg-primary hover:w-1 transition-colors cursor-col-resize" />
                <Panel defaultSize={65} minSize={40}>
                  <ArticleDetail article={selectedArticle} hideHeader />
                </Panel>
              </PanelGroup>
            ) : (
              articleListContent
            )}
          </div>
        </div>

        {/* Mobile main area */}
        <div className="flex md:hidden flex-1 flex-col min-w-0 overflow-hidden">
          {view === "settings" ? (
            settingsContent
          ) : selectedArticle ? (
            <ArticleDetail article={selectedArticle} hideHeader />
          ) : (
            articleListContent
          )}
        </div>
      </div>
    </div>
  );
}
