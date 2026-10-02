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
        {callbackUrl && <input type="hidden" name="redirectTo" value={callbackUrl} />}
        <Button variant="outline" className="w-full" type="submit">
          <Github className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </form>
    </>
  );
}
