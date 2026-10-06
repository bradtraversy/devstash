import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = {
  title: "Sign In - DevStash",
  description: "Sign in to your DevStash account",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}
