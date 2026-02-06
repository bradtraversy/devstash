# Fix GitHub OAuth Redirect Issue

## Problem

GitHub sign-in requires two clicks. First click authenticates the user (session is created) but redirect to `/dashboard` fails - page refreshes to `/sign-in`. Second click works.

## Root Cause

Using client-side `signIn` from `next-auth/react` which has unreliable redirect behavior in production.

## Solution

Switch to server-side `signIn` from `@/auth` using a Server Action. This is the recommended NextAuth v5 pattern.

## Changes Required

### 1. Create `src/actions/auth.ts`
- Export a `signInWithGitHub` server action
- Call `signIn("github", { redirectTo: "/dashboard" })` from `@/auth`

### 2. Update `src/components/auth/sign-in-form.tsx`
- Import `signInWithGitHub` from `@/actions/auth`
- Replace the GitHub `<Button onClick={...}>` with a `<form action={signInWithGitHub}>` containing a submit button
- Remove `isGitHubLoading` state and `handleGitHubSignIn` function
- Keep credentials login as-is (uses `redirect: false`, works fine)

## Key Details

- Use `redirectTo` (NextAuth v5) not `callbackUrl` (v4)
- No SessionProvider needed
- Server action handles the redirect server-side, avoiding client-side timing issues

## Verification

Run `npm run build` and `npm run test`, then test in production.
