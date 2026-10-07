"use server";

import { signIn } from "@/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

/** A same-origin `redirectTo` field brings the user back where they started. */
async function signInWithProvider(provider: "github" | "google", formData?: FormData) {
  const requested = formData?.get("redirectTo");
  const redirectTo = safeRedirectPath(typeof requested === "string" ? requested : null);
  await signIn(provider, { redirectTo });
}

export async function signInWithGitHub(formData?: FormData) {
  await signInWithProvider("github", formData);
}

export async function signInWithGoogle(formData?: FormData) {
  await signInWithProvider("google", formData);
}
