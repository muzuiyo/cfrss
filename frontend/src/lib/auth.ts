import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface User {
  githubId?: number;
  username?: string;
  email?: string;
  avatarUrl?: string;
}

// Check if user is authenticated by verifying with backend
export const checkAuth = async (): Promise<User | null> => {
  const sessionToken = Cookies.get("session");
  if (!sessionToken) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${sessionToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data.data as User;
    }

    // Token invalid, remove cookie
    Cookies.remove("session");
    return null;
  } catch {
    return null;
  }
};

// Get the GitHub OAuth login URL
export const getLoginUrl = (): string => {
  return `${API_BASE}/api/auth/github`;
};

// Logout
export const logout = async (): Promise<void> => {
  Cookies.remove("session");
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore errors
  }
};
