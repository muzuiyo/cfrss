"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      // Set session cookie (accessible by JavaScript for API calls)
      const isSecure = window.location.protocol === "https:";
      Cookies.set("session", token, {
        expires: 7,
        path: "/",
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
      });
      router.push("/");
    } else {
      router.push("/login?error=no_token");
    }
  }, [searchParams, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Completing login...</div>
    </div>
  );
}
