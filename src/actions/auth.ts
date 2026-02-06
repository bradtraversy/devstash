"use server";

import { signIn } from "@/auth";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}
