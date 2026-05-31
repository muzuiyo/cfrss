const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const IS_LOCAL = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");

export interface User {
  githubId?: number;
  username?: string;
  email?: string;
  avatarUrl?: string;
}

// Check if user is authenticated by verifying with backend
export const checkAuth = async (): Promise<User | null> => {
  // In local development, return a mock user
  if (IS_LOCAL) {
    return { username: "dev", email: "dev@localhost" };
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      return data.data as User;
    }

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
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore errors
  }
};
