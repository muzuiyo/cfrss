"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2, FileText, Database, Plus, Trash2, Save, Upload, Download, ChevronLeft, ChevronRight, Rss, AlertTriangle, Edit, Settings as SettingsIcon } from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useFeeds, useAddFeed, useDeleteFeed, useDeleteAllFeeds, useUpdateFeed } from "@/hooks/use-feeds";
import { useMarkAllRead } from "@/hooks/use-articles";
import { opmlApi } from "@/lib/api";
import { toast } from "sonner";
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
import type { Settings } from "@/types";

export function SettingsView() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: feeds = [] } = useFeeds();
  const addFeed = useAddFeed();
  const deleteFeed = useDeleteFeed();
  const deleteAllFeeds = useDeleteAllFeeds();
  const updateFeed = useUpdateFeed();
  const markAllRead = useMarkAllRead();

  const [formData, setFormData] = useState<Partial<Settings>>({});
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedTitle, setNewFeedTitle] = useState("");
  const [newFeedCategory, setNewFeedCategory] = useState("");
  const [editDialogFeed, setEditDialogFeed] = useState<{ id: string; title: string; url: string; custom_title: string; category: string } | null>(null);
  const [feedsPage, setFeedsPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedsPerPage = 20;

  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData);
  };

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;
    const input: { url: string; title?: string; category?: string } = {
      url: newFeedUrl,
    };
    if (newFeedTitle.trim()) {
      input.title = newFeedTitle.trim();
    }
    if (newFeedCategory.trim()) {
      input.category = newFeedCategory.trim();
    }
    await addFeed.mutateAsync(input);
    setNewFeedUrl("");
    setNewFeedTitle("");
    setNewFeedCategory("");
  };

  const handleDeleteFeed = async (id: string, title: string) => {
    await deleteFeed.mutateAsync(id);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await opmlApi.import(file);
      toast.success(`Imported ${result.imported} feeds`);
      e.target.value = "";
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await opmlApi.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rss-reader-export.opml";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* General */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">General</CardTitle>
            </div>
            <CardDescription>Basic settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-sm">Theme</Label>
              <div className="flex gap-2">
                {[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "System" },
                ].map((theme) => (
                  <Button
                    key={theme.value}
                    variant={formData.ui_theme === theme.value ? "default" : "outline"}
                    size="sm"
                    onClick={async () => {
                      const newTheme = theme.value;
                      setFormData({ ...formData, ui_theme: newTheme });
                      // Apply theme immediately
                      const root = document.documentElement;
                      if (newTheme === "dark") {
                        root.classList.add("dark");
                      } else if (newTheme === "light") {
                        root.classList.remove("dark");
                      } else {
                        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                        root.classList.toggle("dark", prefersDark);
                      }
                      // Save immediately
                      await updateSettings.mutateAsync({ ...formData, ui_theme: newTheme });
                    }}
                  >
                    {theme.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm">Refresh Interval (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  value={formData.refresh_interval ?? "30"}
                  onChange={(e) => setFormData({ ...formData, refresh_interval: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm">Articles per Page</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.ui_articles_per_page ?? "20"}
                  onChange={(e) => setFormData({ ...formData, ui_articles_per_page: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={updateSettings.isPending} size="sm">
              <Save className="h-4 w-4 mr-1.5" />
              {updateSettings.isPending ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        {/* Add Feed */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Add Subscription</CardTitle>
            </div>
            <CardDescription>Subscribe to a new RSS feed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/feed.xml"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddFeed()}
                />
                <Button onClick={handleAddFeed} disabled={addFeed.isPending}>
                  Add
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Title (optional, leave empty to use default)"
                  value={newFeedTitle}
                  onChange={(e) => setNewFeedTitle(e.target.value)}
                />
                <Input
                  placeholder="Category (optional)"
                  value={newFeedCategory}
                  onChange={(e) => setNewFeedCategory(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manage Feeds */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Subscriptions</CardTitle>
            </div>
            <CardDescription>Manage your feeds ({feeds.length} total)</CardDescription>
          </CardHeader>
          <CardContent>
            {feeds.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No feeds yet</p>
            ) : (
              <>
                <div className="divide-y border rounded-lg">
                  {feeds
                    .slice((feedsPage - 1) * feedsPerPage, feedsPage * feedsPerPage)
                    .map((feed) => (
                      <div key={feed.id} className="flex items-center gap-3 px-3 py-2.5">
                        {feed.favicon ? (
                          <img src={feed.favicon} alt="" className="h-5 w-5 rounded shrink-0" />
                        ) : (
                          <Rss className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{feed.custom_title || feed.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {feed.unread_count} unread
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setEditDialogFeed({
                            id: feed.id,
                            title: feed.title,
                            url: feed.url,
                            custom_title: feed.custom_title ?? "",
                            category: feed.category ?? "",
                          })}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" />}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Delete Subscription
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{feed.title}&quot; and all its articles? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => handleDeleteFeed(feed.id, feed.title)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                </div>
                {Math.ceil(feeds.length / feedsPerPage) > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      Showing {(feedsPage - 1) * feedsPerPage + 1}-{Math.min(feedsPage * feedsPerPage, feeds.length)} of {feeds.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setFeedsPage((p) => Math.max(1, p - 1))}
                        disabled={feedsPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">
                        {feedsPage} / {Math.ceil(feeds.length / feedsPerPage)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setFeedsPage((p) => Math.min(Math.ceil(feeds.length / feedsPerPage), p + 1))}
                        disabled={feedsPage >= Math.ceil(feeds.length / feedsPerPage)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Import/Export */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Import / Export</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".opml,.xml"
                className="hidden"
                onChange={handleImport}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" />
                Import OPML
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                Export OPML
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={markAllRead.isPending} />}>
                  {markAllRead.isPending ? "Marking..." : "Mark All as Read"}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Mark All as Read
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to mark all articles as read? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => markAllRead.mutate()}>
                      Mark All as Read
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={deleteAllFeeds.isPending || feeds.length === 0} />}>
                  {deleteAllFeeds.isPending ? "Deleting..." : "Delete All Subscriptions"}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete All Subscriptions
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete all {feeds.length} subscriptions and their articles? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => deleteAllFeeds.mutate()}>
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editDialogFeed} onOpenChange={(open) => !open && setEditDialogFeed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
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
    </ScrollArea>
  );
}
