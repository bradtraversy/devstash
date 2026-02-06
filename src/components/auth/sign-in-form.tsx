"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Github, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithGitHub } from "@/actions/auth";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const toastShown = useRef(false);

  useEffect(() => {
    if (registered === "true" && !toastShown.current) {
      toastShown.current = true;
      toast.success("Account created successfully! You can now sign in.");
      router.replace("/sign-in", { scroll: false });
    }
  }, [registered, router]);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    // Check rate limit before attempting login
    try {
      const rateLimitResponse = await fetch("/api/auth/check-login-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (rateLimitResponse.status === 429) {
        const data = await rateLimitResponse.json();
        setFormError(data.error || "Too many login attempts. Please try again later.");
        setNeedsVerification(false);
        setIsLoading(false);
        return;
      }
    } catch {
      // Continue with login if rate limit check fails (fail open)
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.code === "credentials" && result.error.includes("EmailNotVerified")) {
        setFormError("Please verify your email before signing in.");
        setNeedsVerification(true);
      } else {
        setFormError("Invalid email or password");
        setNeedsVerification(false);
      }
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  async function handleResendVerification() {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to resend verification email");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in to DevStash</CardTitle>
        <CardDescription>
          Enter your credentials or use GitHub to sign in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(error || formError) && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p>
              {formError ||
                (error === "OAuthAccountNotLinked"
                  ? "This email is already registered with a password. Please sign in with your email and password instead."
                  : "An error occurred. Please try again.")}
            </p>
            {needsVerification && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="mt-2 text-primary hover:underline disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <form action={signInWithGitHub}>
          <Button variant="outline" className="w-full" type="submit">
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
