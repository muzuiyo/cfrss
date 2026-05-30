import { Context, Next } from "hono";
import { errorResponse, ErrorCodes } from "../utils/response";

export const authMiddleware = async (c: Context, next: Next) => {
  // Get allowed email from environment bindings (not process.env)
  const allowedEmail = c.env.ALLOWED_USER_EMAIL ?? "";

  // Skip auth for cron triggers (they come from Cloudflare)
  const cronHeader = c.req.header("cf-cron");
  if (cronHeader) {
    c.set("user", { email: "cron@system" });
    return next();
  }

  // Check if running in local development mode
  const host = c.req.header("host") ?? "";
  const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");

  if (isLocalDev) {
    // In development mode, skip authentication
    c.set("user", { email: "dev@localhost" });
    return next();
  }

  // Get Cloudflare Access headers (production only)
  const userEmail = c.req.header("Cf-Access-Authenticated-User-Email");

  // Check if user email header exists
  if (!userEmail) {
    return errorResponse(
      c,
      ErrorCodes.UNAUTHORIZED,
      "Authentication required. Please access through Cloudflare Access.",
      401
    );
  }

  // If ALLOWED_EMAIL is set, verify the user
  if (allowedEmail && userEmail !== allowedEmail) {
    return errorResponse(
      c,
      ErrorCodes.UNAUTHORIZED,
      "Access denied. Your account is not authorized.",
      403
    );
  }

  // Set user in context
  c.set("user", { email: userEmail });

  await next();
};
