import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGitHub } from "@/actions/auth";

interface GitHubAuthSectionProps {
  /** Same-origin path to return to after GitHub sign-in; the dashboard when omitted. */
  callbackUrl?: string;
}

export default function GitHubAuthSection({ callbackUrl }: GitHubAuthSectionProps) {
  return (
    <>
      <form action={signInWithGitHub}>
        {callbackUrl && <input type="hidden" name="redirectTo" value={callbackUrl} />}
        <Button variant="outline" size="lg" className="w-full" type="submit">
          <Github className="h-4 w-4" />
          Continue with GitHub
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
    </>
  );
}
