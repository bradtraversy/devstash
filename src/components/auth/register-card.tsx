import Link from "next/link";
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AuthCard from "@/components/auth/auth-card";
import OAuthSection from "@/components/shared/oauth-section";

export function RegisterCard() {
  return (
    <AuthCard>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create an account</CardTitle>
      </CardHeader>
      <CardContent>
        <OAuthSection />
      </CardContent>
      <CardFooter className="flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to the{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </CardFooter>
    </AuthCard>
  );
}
