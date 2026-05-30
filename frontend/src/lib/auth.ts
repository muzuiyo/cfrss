import Cookies from "js-cookie";

const AUTH_TOKEN_KEY = "rss_reader_auth";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface User {
  email: string;
}

// Check if user is authenticated by verifying with backend
export const checkAuth = async (): Promise<User | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      credentials: "include",
    });

    if (res.ok) {
      // In production, Cloudflare Access handles auth
      // If we can reach the API, user is authenticated
      const email =
        res.headers.get("Cf-Access-Authenticated-User-Email") ?? "user@example.com";
      return { email };
    }

    return null;
  } catch {
    // In development, if backend is not running, check cookie
    const authCookie = Cookies.get(AUTH_TOKEN_KEY);
    if (authCookie) {
      try {
        return JSON.parse(authCookie) as User;
      } catch {
        return null;
      }
    }
    return null;
  }
};

// Set auth state (for development)
export const setAuth = (user: User) => {
  Cookies.set(AUTH_TOKEN_KEY, JSON.stringify(user), { expires: 7 });
};

// Clear auth
export const clearAuth = () => {
  Cookies.remove(AUTH_TOKEN_KEY);
};

// Get the Cloudflare Access login URL
export const getLoginUrl = (): string => {
  // In production, redirect to Cloudflare Access login
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return "/cdn-cgi/access/login";
  }
  // In development, use mock login
  return "/api/auth/mock-login";
};
