import type { Database } from "./db";

export interface Env {
  // D1 Database binding
  DB: D1Database;
  // Environment variables
  ENVIRONMENT: string;
  FRONTEND_ORIGIN?: string;
  ALLOWED_USER_EMAIL?: string;
  // Cloudflare Access headers (set by Cloudflare Access)
  CF_ACCESS_JWT_ASSERTION?: string;
  CF_ACCESS_AUTHENTICATED_USER_EMAIL?: string;
}

export interface AppContext {
  Bindings: Env;
  Variables: {
    db: Database;
    user: {
      email: string;
    };
  };
}
