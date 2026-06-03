"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { articlesApi } from "@/lib/api";
import { toast } from "sonner";

export const articleKeys = {
  all: ["articles"] as const,
  stats: ["articles", "stats"] as const,
  list: (view: string, page: number, feedId?: string, q?: string) =>
    q
      ? ["articles", view, page, feedId, q]
      : feedId
      ? ["articles", view, page, feedId]
      : ["articles", view, page] as const,
  detail: (id: string) => ["articles", id] as const,
};

export const useArticleStats = () =>
  useQuery({
    queryKey: articleKeys.stats,
    queryFn: articlesApi.getStats,
    staleTime: 30_000,
  });

export const useArticles = (page = 1, perPage = 20, feedId?: string, q?: string) =>
  useQuery({
    queryKey: articleKeys.list("all", page, feedId, q),
    queryFn: () => articlesApi.getAll({ page, per_page: perPage, ...(feedId ? { feed_id: feedId } : {}), ...(q ? { q } : {}) }),
    staleTime: 60_000,
  });

export const useUnreadArticles = (page = 1, perPage = 20, feedId?: string, q?: string) =>
  useQuery({
    queryKey: articleKeys.list("unread", page, feedId, q),
    queryFn: () => articlesApi.getUnread({ page, per_page: perPage, ...(feedId ? { feed_id: feedId } : {}), ...(q ? { q } : {}) }),
    staleTime: 60_000,
  });

export const useStarredArticles = (page = 1, perPage = 20, q?: string) =>
  useQuery({
    queryKey: articleKeys.list("starred", page, undefined, q),
    queryFn: () => articlesApi.getStarred({ page, per_page: perPage, ...(q ? { q } : {}) }),
    staleTime: 60_000,
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: articleKeys.all });
      qc.invalidateQueries({ queryKey: articleKeys.stats });
      qc.invalidateQueries({ queryKey: ["feeds"] });
    },
  });
};

export const useMarkUnread = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.markUnread,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: articleKeys.all });
      qc.invalidateQueries({ queryKey: articleKeys.stats });
      qc.invalidateQueries({ queryKey: ["feeds"] });
    },
  });
};

export const useStar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.star,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: articleKeys.all });
      qc.invalidateQueries({ queryKey: articleKeys.stats });
    },
  });
};

export const useUnstar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.unstar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: articleKeys.all });
      qc.invalidateQueries({ queryKey: articleKeys.stats });
    },
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: articleKeys.all });
      qc.invalidateQueries({ queryKey: articleKeys.stats });
      qc.invalidateQueries({ queryKey: ["feeds"] });
      toast.success("All marked as read");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMarkFeedRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.markFeedRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: articleKeys.all });
      qc.invalidateQueries({ queryKey: articleKeys.stats });
      qc.invalidateQueries({ queryKey: ["feeds"] });
      toast.success("Feed marked as read");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUnstarAll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.unstarAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: articleKeys.all });
      qc.invalidateQueries({ queryKey: articleKeys.stats });
      toast.success("All articles unstarred");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
