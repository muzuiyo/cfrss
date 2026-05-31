"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Inbox,
  Rss,
  Star,
  Settings,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useFeeds, useRefreshAllFeeds } from "@/hooks/use-feeds";
import { useArticleStats } from "@/hooks/use-articles";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type View = "all" | "unread" | "starred" | "settings";

interface SidebarProps {
  currentView: View;
  currentFeedId?: string | null;
  onViewChange: (view: View, feedId?: string) => void;
  className?: string;
}

export function Sidebar({ currentView, currentFeedId, onViewChange, className }: SidebarProps) {
  const { user, logout } = useAuth();
  const { data: feeds = [] } = useFeeds();
  const { data: stats } = useArticleStats();
  const refreshAll = useRefreshAllFeeds();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Uncategorized"]));

  const totalUnread = stats?.unread_count ?? 0;
  const totalStarred = stats?.starred_count ?? 0;

  // Group feeds by category
  const categorizedFeeds = feeds.reduce((acc, feed) => {
    const cat = feed.category ?? "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feed);
    return acc;
  }, {} as Record<string, typeof feeds>);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const navItems = [
    { id: "all" as View, label: "All Articles", icon: Inbox, count: totalUnread },
    { id: "unread" as View, label: "Unread", icon: Rss, count: totalUnread },
    { id: "starred" as View, label: "Starred", icon: Star, count: totalStarred },
  ];

  return (
    <aside className={cn("flex flex-col h-full w-full bg-card border-r overflow-hidden", className)}>
      {/* Header - pr-12 on mobile to avoid overlapping with Sheet close button */}
      <div className="flex items-center justify-between h-14 px-4 pr-12 md:pr-4 border-b shrink-0">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => onViewChange("all")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Rss className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">RSS Reader</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refreshAll.mutate()}
          disabled={refreshAll.isPending}
        >
          <RefreshCw className={cn("h-4 w-4", refreshAll.isPending && "animate-spin")} />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0">
        <nav className="p-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors min-w-0",
                currentView === item.id && !currentFeedId
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate min-w-0">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <Badge
                  variant={currentView === item.id && !currentFeedId ? "secondary" : "outline"}
                  className="h-5 px-1.5 text-xs shrink-0"
                >
                  {item.count > 99 ? "99+" : item.count}
                </Badge>
              )}
            </button>
          ))}

          <Separator className="my-3" />

          {/* Feeds by category */}
          {Object.entries(categorizedFeeds).map(([cat, catFeeds]) => (
            <div key={cat} className="space-y-0.5">
              <button
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-w-0"
              >
                {expandedCategories.has(cat) ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="flex-1 text-left truncate font-medium min-w-0">{cat}</span>
                <span className="text-xs text-muted-foreground shrink-0">{catFeeds.length}</span>
              </button>
              {expandedCategories.has(cat) && (
                <div className="ml-5 space-y-0.5">
                  {catFeeds.map((feed) => (
                    <button
                      key={feed.id}
                      onClick={() => onViewChange("all", feed.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full rounded-lg px-3 py-1.5 text-sm transition-colors min-w-0",
                        currentFeedId === feed.id
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                    >
                      {feed.favicon ? (
                        <img src={feed.favicon} alt="" className="h-4 w-4 rounded shrink-0" />
                      ) : (
                        <Rss className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="flex-1 text-left truncate min-w-0">{feed.custom_title || feed.title}</span>
                      {feed.unread_count > 0 && (
                        <span className="text-xs shrink-0">{feed.unread_count}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3 space-y-1 shrink-0">
        <button
          onClick={() => onViewChange("settings")}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            currentView === "settings"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Settings</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          {user?.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.username || "User"}
              className="h-8 w-8 rounded-full shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">GitHub</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" />}>
              <LogOut className="h-3.5 w-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirm Logout
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to log out? You will need to log in again to access your feeds.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={logout}>
                  Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </aside>
  );
}
