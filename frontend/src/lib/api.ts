import axios from "axios";
import type { Feed, Article, Settings, PaginatedResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Only redirect to login if not already on login page
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Feeds API
export const feedsApi = {
  getAll: async (): Promise<Feed[]> => {
    const { data } = await api.get("/api/feeds");
    return data.data;
  },
  create: async (input: { url: string; title?: string; category?: string }): Promise<Feed> => {
    const { data } = await api.post("/api/feeds", input);
    return data.data;
  },
  update: async (id: string, input: { title?: string; custom_title?: string; category?: string }): Promise<Feed> => {
    const { data } = await api.put(`/api/feeds/${id}`, input);
    return data.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/feeds/${id}`);
  },
  deleteAll: async (): Promise<void> => {
    await api.delete("/api/feeds");
  },
  refresh: async (id: string) => {
    const { data } = await api.post(`/api/feeds/${id}/refresh`);
    return data.data;
  },
  refreshAll: async () => {
    const { data } = await api.post("/api/feeds/refresh-all");
    return data.data;
  },
};

// Articles API
export const articlesApi = {
  getStats: async (): Promise<{ unread_count: number; starred_count: number }> => {
    const { data } = await api.get("/api/articles/stats");
    return data.data;
  },
  getAll: async (params: Record<string, string | number> = {}): Promise<PaginatedResponse<Article>> => {
    const { data } = await api.get("/api/articles", { params });
    return { data: data.data, total: data.meta?.total ?? 0, page: data.meta?.page ?? 1, per_page: data.meta?.per_page ?? 20 };
  },
  getUnread: async (params: Record<string, string | number> = {}): Promise<PaginatedResponse<Article>> => {
    const { data } = await api.get("/api/articles/unread", { params });
    return { data: data.data, total: data.meta?.total ?? 0, page: data.meta?.page ?? 1, per_page: data.meta?.per_page ?? 20 };
  },
  getStarred: async (params: Record<string, string | number> = {}): Promise<PaginatedResponse<Article>> => {
    const { data } = await api.get("/api/articles/starred", { params });
    return { data: data.data, total: data.meta?.total ?? 0, page: data.meta?.page ?? 1, per_page: data.meta?.per_page ?? 20 };
  },
  getById: async (id: string): Promise<Article> => {
    const { data } = await api.get(`/api/articles/${id}`);
    return data.data;
  },
  markRead: async (id: string): Promise<void> => {
    await api.patch(`/api/articles/${id}/read`);
  },
  markUnread: async (id: string): Promise<void> => {
    await api.patch(`/api/articles/${id}/unread`);
  },
  star: async (id: string): Promise<void> => {
    await api.patch(`/api/articles/${id}/star`);
  },
  unstar: async (id: string): Promise<void> => {
    await api.patch(`/api/articles/${id}/unstar`);
  },
  markAllRead: async (): Promise<void> => {
    await api.post("/api/articles/mark-all-read");
  },
};

// Settings API
export const settingsApi = {
  getAll: async (): Promise<Settings> => {
    const { data } = await api.get("/api/settings");
    return data.data;
  },
  update: async (settings: Partial<Settings>): Promise<Settings> => {
    const { data } = await api.put("/api/settings", settings);
    return data.data;
  },
};

// OPML API
export const opmlApi = {
  import: async (file: File): Promise<{ imported: number; skipped: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/api/opml/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },
  export: async (): Promise<Blob> => {
    const response = await api.get("/api/opml/export", { responseType: "blob" });
    return response.data;
  },
};
