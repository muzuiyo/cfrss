"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import { toast } from "sonner";

export const settingsKeys = { all: ["settings"] as const };

export const useSettings = () =>
  useQuery({ queryKey: settingsKeys.all, queryFn: settingsApi.getAll, staleTime: 300_000 });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
