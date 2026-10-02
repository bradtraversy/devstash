"use server";

import { signIn } from "@/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

/** Starts GitHub sign-in; a same-origin `redirectTo` field brings the user back where they started. */
export async function signInWithGitHub(formData?: FormData) {
  const requested = formData?.get("redirectTo");
  const redirectTo = safeRedirectPath(typeof requested === "string" ? requested : null);
  await signIn("github", { redirectTo });
}
