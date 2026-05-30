"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { checkAuth, getLoginUrl, logout as authLogout, type User } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const currentUser = await checkAuth();
      setUser(currentUser);
      setLoading(false);

      // Redirect logic
      if (!currentUser && pathname !== "/login") {
        router.push("/login");
      } else if (currentUser && pathname === "/login") {
        router.push("/");
      }
    };

    initAuth();
  }, [pathname, router]);

  const login = () => {
    // Redirect to GitHub OAuth
    window.location.href = getLoginUrl();
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    router.push("/login");
  };

  // Show nothing while checking auth and redirecting
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render children if not authenticated and not on login page
  if (!user && pathname !== "/login") {
    return null;
  }

  // Don't render children if authenticated and on login page
  if (user && pathname === "/login") {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
