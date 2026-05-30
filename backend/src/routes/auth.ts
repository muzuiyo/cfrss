import { Hono } from "hono";
import type { AppContext } from "../types";
import { successResponse, errorResponse, ErrorCodes } from "../utils/response";

const authRouter = new Hono<AppContext>();

// Generate random string for state
const generateState = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

// Simple JWT implementation using Web Crypto API
const signJwt = async (payload: Record<string, any>, secret: string): Promise<string> => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 }; // 7 days

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const data = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${encodedSignature}`;
};

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

// GET /api/auth/github - Initiate GitHub OAuth
authRouter.get("/github", (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const frontendOrigin = c.env.FRONTEND_ORIGIN || "http://localhost:3000";
  const redirectUri = `${c.req.url.split("/api/auth")[0]}/api/auth/callback/github`;

  if (!clientId) {
    return errorResponse(c, ErrorCodes.INTERNAL_ERROR, "GitHub OAuth not configured", 500);
  }

  const state = generateState();

  // Store state in cookie for verification
  const isSecure = c.req.url.startsWith("https://");
  const secureFlag = isSecure ? "Secure; " : "";
  const sameSite = isSecure ? "SameSite=None" : "SameSite=Lax";

  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", clientId);
  githubUrl.searchParams.set("redirect_uri", redirectUri);
  githubUrl.searchParams.set("scope", "read:user user:email");
  githubUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: githubUrl.toString(),
      "Set-Cookie": `oauth_state=${state}; Path=/; HttpOnly; ${secureFlag}${sameSite}; Max-Age=600`,
    },
  });
});

// GET /api/auth/callback/github - Handle GitHub OAuth callback
authRouter.get("/callback/github", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieHeader = c.req.header("Cookie") || "";
  const savedState = cookieHeader.match(/oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== savedState) {
    // Clear invalid state cookie
    const isSecure = c.req.url.startsWith("https://");
    const secureFlag = isSecure ? "Secure; " : "";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${c.env.FRONTEND_ORIGIN || "http://localhost:3000"}/login?error=invalid_state`,
        "Set-Cookie": `oauth_state=; Path=/; HttpOnly; ${secureFlag}Max-Age=0`,
      },
    });
  }

  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;
  const sessionSecret = c.env.SESSION_SECRET;
  const allowedUser = c.env.ALLOWED_GITHUB_USER;
  const frontendOrigin = c.env.FRONTEND_ORIGIN || "http://localhost:3000";

  if (!clientId || !clientSecret || !sessionSecret) {
    return errorResponse(c, ErrorCodes.INTERNAL_ERROR, "GitHub OAuth not configured", 500);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenText = await tokenResponse.text();
    // console.log("GitHub token response status:", tokenResponse.status);
    // console.log("GitHub token response:", tokenText.substring(0, 500));

    // Check if response is OK
    if (!tokenResponse.ok) {
      console.error("GitHub token exchange failed:", tokenResponse.status, tokenText);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendOrigin}/login?error=${encodeURIComponent(`GitHub API error: ${tokenResponse.status}`)}`,
          "Set-Cookie": `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
      });
    }

    let tokenData: Record<string, any>;

    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      // GitHub sometimes returns form-encoded response
      const params = new URLSearchParams(tokenText);
      tokenData = Object.fromEntries(params);
    }

    if (tokenData.error) {
      console.error("GitHub OAuth error:", tokenData.error, tokenData.error_description);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendOrigin}/login?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`,
          "Set-Cookie": `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
      });
    }

    if (!tokenData.access_token) {
      console.error("No access_token in response:", tokenData);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendOrigin}/login?error=${encodeURIComponent("Failed to get access token")}`,
          "Set-Cookie": `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
      });
    }

    // Get user info from GitHub
    console.log("Fetching user info from GitHub...");
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
        "User-Agent": "RSS-Reader",
      },
    });

    console.log("GitHub user response status:", userResponse.status);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Failed to get user info:", userResponse.status, errorText);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendOrigin}/login?error=${encodeURIComponent("Failed to get user info from GitHub")}`,
          "Set-Cookie": `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
      });
    }

    const githubUser = (await userResponse.json()) as Record<string, any>;
    console.log("GitHub user:", githubUser.login, githubUser.id);

    // Check if user is allowed
    if (allowedUser && githubUser.login !== allowedUser) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendOrigin}/login?error=unauthorized`,
          "Set-Cookie": `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
      });
    }

    // Create JWT token
    console.log("Creating JWT token...");
    const token = await signJwt(
      {
        githubId: githubUser.id,
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
      },
      sessionSecret
    );
    console.log("JWT token created successfully");

    // Redirect to frontend with session token in URL
    // Frontend will set the cookie via API call
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendOrigin}/auth/callback?token=${token}`,
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Failed to authenticate";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendOrigin}/login?error=${encodeURIComponent(message)}`,
        "Set-Cookie": `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      },
    });
  }
});

// GET /api/auth/me - Get current user
authRouter.get("/me", async (c) => {
  const sessionSecret = c.env.SESSION_SECRET;
  const cookieHeader = c.req.header("Cookie") || "";
  const sessionToken = cookieHeader.match(/session=([^;]+)/)?.[1];

  if (!sessionToken || !sessionSecret) {
    return errorResponse(c, ErrorCodes.UNAUTHORIZED, "Not authenticated", 401);
  }

  const payload = await verifyJwt(sessionToken, sessionSecret);
  if (!payload) {
    return errorResponse(c, ErrorCodes.UNAUTHORIZED, "Invalid session", 401);
  }

  return successResponse(c, {
    githubId: payload.githubId,
    username: payload.username,
    email: payload.email,
    avatarUrl: payload.avatarUrl,
  });
});

// POST /api/auth/logout - Logout
authRouter.post("/logout", (c) => {
  const frontendOrigin = c.env.FRONTEND_ORIGIN || "http://localhost:3000";

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${frontendOrigin}/login`,
      "Set-Cookie": `session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
});

export default authRouter;
