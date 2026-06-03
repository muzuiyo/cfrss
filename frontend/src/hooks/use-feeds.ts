"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feedsApi } from "@/lib/api";
import { toast } from "sonner";

export const feedKeys = {
  all: ["feeds"] as const,
};

export const useFeeds = () =>
  useQuery({ queryKey: feedKeys.all, queryFn: feedsApi.getAll, staleTime: 60_000 });

export const useAddFeed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: feedsApi.create,
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      toast.success(`Added: ${f.title}`);
    },
    onError: (e: any) => {
      const message = e.response?.data?.error?.message;
      if (message) {
        toast.error(message);
      } else {
        toast.error(e.message || "Failed to add feed");
      }
    },
  });
};

export const useDeleteFeed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: feedsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      toast.success("Feed deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteAllFeeds = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: feedsApi.deleteAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      qc.invalidateQueries({ queryKey: ["articles"] });
      toast.success("All feeds deleted");
    },
    onError: (e: any) => {
      const message = e.response?.data?.error?.message;
      toast.error(message || e.message || "Failed to delete all feeds");
    },
  });
};

export const useUpdateFeed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { title?: string; custom_title?: string; url?: string; category?: string } }) =>
      feedsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      toast.success("Feed updated");
    },
    onError: (e: any) => {
      const message = e.response?.data?.error?.message;
      if (message) {
        toast.error(message);
      } else {
        toast.error(e.message || "Failed to update feed");
      }
    },
  });
};

export const useRefreshAllFeeds = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: feedsApi.refreshAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      qc.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Feeds refreshed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
