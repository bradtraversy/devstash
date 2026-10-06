"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AuthCard from "@/components/auth/auth-card";

type ResetStatus = "form" | "loading" | "success" | "error" | "no-token";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<ResetStatus>(token ? "form" : "no-token");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setStatus("error");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters");
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to reset password");
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  }

  if (status === "no-token") {
    return (
      <AuthCard>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has been used.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="brand" className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardFooter>
      </AuthCard>
    );
  }

  if (status === "success") {
    return (
      <AuthCard>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Password Reset!</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="brand" className="w-full">
            <Link href="/sign-in">Sign in with your new password</Link>
          </Button>
        </CardFooter>
      </AuthCard>
    );
  }

  if (status === "loading") {
    return (
      <AuthCard>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Resetting password...</CardTitle>
          <CardDescription>Please wait while we update your password.</CardDescription>
        </CardHeader>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Set new password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "error" && message && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {message}
            {message.includes("expired") && (
              <Link
                href="/forgot-password"
                className="mt-2 block text-primary hover:underline"
              >
                Request a new reset link
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" variant="brand" className="w-full">
            Reset password
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href="/sign-in"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </AuthCard>
  );
}
