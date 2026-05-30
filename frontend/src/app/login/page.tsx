"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rss, GitBranch } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Rss className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl">RSS Reader</CardTitle>
            <CardDescription>
              Sign in to access your feeds
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full h-11"
            size="lg"
            onClick={login}
          >
            <GitBranch className="mr-2 h-5 w-5" />
            Continue with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
