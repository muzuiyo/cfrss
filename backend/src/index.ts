import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppContext } from "./types";
import { createDatabase } from "./db";
import { authMiddleware } from "./middleware/auth";
import { errorResponse, ErrorCodes } from "./utils/response";
import { fetchAllFeeds } from "./services/feed-fetcher";

// Import routes
import feedsRouter from "./routes/feeds";
import articlesRouter from "./routes/articles";
import opmlRouter from "./routes/opml";
import settingsRouter from "./routes/settings";
import authRouter from "./routes/auth";

const app = new Hono<AppContext>();

// CORS middleware - must be first, handles OPTIONS preflight
app.use("*", async (c, next) => {
  const corsOrigin = c.env.FRONTEND_ORIGIN || "http://localhost:3000";
  const corsMiddleware = cors({
    origin: corsOrigin.split(",").map(s => s.trim()),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// Logger middleware
app.use("*", logger());

// Database middleware - inject db into context
app.use("*", async (c, next) => {
  const db = createDatabase(c.env.DB);
  c.set("db", db);
  await next();
});

// Health check endpoint (no auth required)
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth middleware for all other API routes
app.use("/api/*", authMiddleware);

// API routes
app.route("/api/auth", authRouter);
app.route("/api/feeds", feedsRouter);
app.route("/api/articles", articlesRouter);
app.route("/api/opml", opmlRouter);
app.route("/api/settings", settingsRouter);

// 404 handler
app.notFound((c) => {
  return errorResponse(c, ErrorCodes.NOT_FOUND, "Route not found", 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return errorResponse(c, ErrorCodes.INTERNAL_ERROR, "Internal server error", 500);
});

// Cron trigger handler
const scheduled: ExportedHandlerScheduledHandler = async (event, env, ctx) => {
  const db = createDatabase((env as any).DB);
  console.log("Cron trigger fired at:", new Date().toISOString());

  const result = await fetchAllFeeds(db);
  console.log("Cron completed:", result);
};

export default {
  fetch: app.fetch,
  scheduled,
};
