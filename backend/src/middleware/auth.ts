import { Context, Next } from "hono";
import { errorResponse, ErrorCodes } from "../utils/response";

// Verify JWT token
const verifyJwt = async (token: string, secret: string): Promise<Record<string, any> | null> => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = Uint8Array.from(atob(encodedSignature.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(data));
    if (!valid) return null;

    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const authMiddleware = async (c: Context, next: Next) => {
  // Skip auth for cron triggers (they come from Cloudflare)
  const cronHeader = c.req.header("cf-cron");
  if (cronHeader) {
    c.set("user", { username: "cron" });
    return next();
  }

  // Skip auth for auth routes
  if (c.req.path.startsWith("/api/auth/")) {
    return next();
  }

  // Check if running in local development mode
  const host = c.req.header("host") ?? "";
  const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");

  if (isLocalDev && !c.env.SESSION_SECRET) {
    // In development mode without session secret, skip authentication
    c.set("user", { username: "dev", email: "dev@localhost" });
    return next();
  }

  // Get session token from Authorization header or cookie
  const authHeader = c.req.header("Authorization") || "";
  const cookieHeader = c.req.header("Cookie") || "";
  const sessionToken = authHeader.replace("Bearer ", "") || cookieHeader.match(/session=([^;]+)/)?.[1];
  const sessionSecret = c.env.SESSION_SECRET;

  if (!sessionToken || !sessionSecret) {
    return errorResponse(c, ErrorCodes.UNAUTHORIZED, "Not authenticated", 401);
  }

  const payload = await verifyJwt(sessionToken, sessionSecret);
  if (!payload) {
    return errorResponse(c, ErrorCodes.UNAUTHORIZED, "Invalid session", 401);
  }

  // Check if user is allowed
  const allowedUser = c.env.ALLOWED_GITHUB_USER;
  if (allowedUser && payload.username !== allowedUser) {
    return errorResponse(c, ErrorCodes.UNAUTHORIZED, "Access denied", 403);
  }

  // Set user in context
  c.set("user", {
    githubId: payload.githubId,
    username: payload.username,
    email: payload.email,
    avatarUrl: payload.avatarUrl,
  });

  await next();
};
