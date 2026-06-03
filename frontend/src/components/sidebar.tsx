"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  X,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useFeeds, useRefreshAllFeeds, useDeleteFeed, useUpdateFeed } from "@/hooks/use-feeds";
import { useArticleStats, useMarkFeedRead, useMarkAllRead, useUnstarAll } from "@/hooks/use-articles";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type View = "all" | "unread" | "starred" | "settings";

interface SidebarProps {
  currentView: View;
  currentFeedId?: string | null;
  onViewChange: (view: View, feedId?: string) => void;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ currentView, currentFeedId, onViewChange, onClose, className }: SidebarProps) {
  const { user, logout } = useAuth();
  const { data: feeds = [] } = useFeeds();
  const { data: stats } = useArticleStats();
  const refreshAll = useRefreshAllFeeds();
  const deleteFeed = useDeleteFeed();
  const updateFeed = useUpdateFeed();
  const markFeedRead = useMarkFeedRead();
  const markAllRead = useMarkAllRead();
  const unstarAll = useUnstarAll();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Uncategorized"]));
  const [deleteDialogFeed, setDeleteDialogFeed] = useState<{ id: string; title: string } | null>(null);
  const [markAllReadDialog, setMarkAllReadDialog] = useState(false);
  const [unstarAllDialog, setUnstarAllDialog] = useState(false);
  const [editDialogFeed, setEditDialogFeed] = useState<{ id: string; title: string; url: string; custom_title: string; category: string } | null>(null);

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
      {/* Header */}
      <div className="flex items-center justify-between gap-2 h-14 px-3 border-b shrink-0">
        <Link href="/" className="flex items-center gap-1" onClick={() => onViewChange("all")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Rss className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">RSS Reader</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refreshAll.mutate()}
            disabled={refreshAll.isPending}
          >
            <RefreshCw className={cn("h-4 w-4", refreshAll.isPending && "animate-spin")} />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0">
        <nav className="p-3 space-y-0.5">
          {navItems.map((item) => (
            <ContextMenu key={item.id}>
              <ContextMenuTrigger
                render={
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors min-w-0",
                      currentView === item.id && !currentFeedId
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  />
                }
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
              </ContextMenuTrigger>
              <ContextMenuContent>
                {item.id === "starred" ? (
                  <ContextMenuItem onClick={() => setUnstarAllDialog(true)}>
                    <Star className="mr-2 h-4 w-4" />
                    Unstar All
                  </ContextMenuItem>
                ) : (
                  <ContextMenuItem onClick={() => setMarkAllReadDialog(true)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark All as Read
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
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
                    <ContextMenu key={feed.id}>
                      <ContextMenuTrigger
                        render={
                          <button
                            onClick={() => onViewChange("all", feed.id)}
                            className={cn(
                              "flex items-center gap-2.5 w-full rounded-lg px-3 py-1.5 text-sm transition-colors min-w-0",
                              currentFeedId === feed.id
                                ? "bg-accent text-accent-foreground font-medium"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                            )}
                          />
                        }
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
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => markFeedRead.mutate(feed.id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Read
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => setEditDialogFeed({
                          id: feed.id,
                          title: feed.title,
                          url: feed.url,
                          custom_title: feed.custom_title ?? "",
                          category: feed.category ?? "",
                        })}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit Subscription
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          variant="destructive"
                          onClick={() => setDeleteDialogFeed({ id: feed.id, title: feed.custom_title || feed.title })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Subscription
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
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
                <AlertDialogAction variant="destructive" onClick={logout}>
                  Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialogFeed} onOpenChange={(open) => !open && setDeleteDialogFeed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Subscription
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialogFeed?.title}&quot; and all its articles? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogFeed(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialogFeed) {
                  deleteFeed.mutate(deleteDialogFeed.id);
                }
                setDeleteDialogFeed(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark All as Read Dialog */}
      <Dialog open={markAllReadDialog} onOpenChange={setMarkAllReadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Mark All as Read
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark all articles as read? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkAllReadDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                markAllRead.mutate();
                setMarkAllReadDialog(false);
              }}
            >
              Mark All as Read
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unstar All Dialog */}
      <Dialog open={unstarAllDialog} onOpenChange={setUnstarAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Unstar All
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all starred articles? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnstarAllDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                unstarAll.mutate();
                setUnstarAllDialog(false);
              }}
            >
              Unstar All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editDialogFeed} onOpenChange={(open) => !open && setEditDialogFeed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Edit Subscription
            </DialogTitle>
            <DialogDescription>
              Edit the details for this subscription.
            </DialogDescription>
          </DialogHeader>
          {editDialogFeed && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-sm">Title</Label>
                <Input
                  value={editDialogFeed.title}
                  disabled
                  className="opacity-50"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm">Custom Title</Label>
                <Input
                  placeholder="Leave empty to use original title"
                  value={editDialogFeed.custom_title}
                  onChange={(e) => setEditDialogFeed({ ...editDialogFeed, custom_title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm">Feed URL</Label>
                <Input
                  value={editDialogFeed.url}
                  onChange={(e) => setEditDialogFeed({ ...editDialogFeed, url: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm">Category</Label>
                <Input
                  placeholder="Leave empty for Uncategorized"
                  value={editDialogFeed.category}
                  onChange={(e) => setEditDialogFeed({ ...editDialogFeed, category: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogFeed(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editDialogFeed) {
                  updateFeed.mutate({
                    id: editDialogFeed.id,
                    input: {
                      custom_title: editDialogFeed.custom_title || undefined,
                      url: editDialogFeed.url,
                      category: editDialogFeed.category || undefined,
                    },
                  });
                }
                setEditDialogFeed(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
