import type { Database } from "./db";

export interface Env {
  // D1 Database binding
  DB: D1Database;
  // Environment variables
  ENVIRONMENT: string;
  FRONTEND_ORIGIN?: string;
  // GitHub OAuth
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  ALLOWED_GITHUB_USER?: string;
}

export interface AppContext {
  Bindings: Env;
  Variables: {
    db: Database;
    user: {
      githubId?: number;
      username?: string;
      email?: string;
      avatarUrl?: string;
    };
  };
}
