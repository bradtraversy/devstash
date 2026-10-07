"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy, KeyRound } from "lucide-react";
import DialogFormFooter from "@/components/shared/dialog-form-footer";
import FormError from "@/components/shared/form-error";
import { createApiToken } from "@/actions/api-tokens";
import { useClipboard } from "@/hooks/use-clipboard";
import { useOrigin } from "@/hooks/use-origin";
import { API_TOKEN_NAME_MAX } from "@/lib/constants/api-tokens";

interface CreateApiTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateApiTokenDialog({ open, onOpenChange }: CreateApiTokenDialogProps) {
  const router = useRouter();
  const origin = useOrigin();
  const tokenClipboard = useClipboard();
  const curlClipboard = useClipboard();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const curl = token ? `curl -H "Authorization: Bearer ${token}" ${origin}/api/v1/items` : "";

  const handleClose = () => {
    if (isLoading) return;
    if (token) router.refresh();
    setName("");
    setError(null);
    setToken(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await createApiToken({ name });
      if (result.success && result.data) {
        setToken(result.data.token);
      } else {
        setError(result.fieldErrors?.name?.[0] ?? result.error ?? "Failed to create token");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[520px]"
        // A stray click or Escape must not throw away a token that is never shown again.
        onInteractOutside={(e) => {
          if (token) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (token) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <KeyRound className="h-4 w-4 text-primary" />
            </div>
            {token ? "Token created" : "Create token"}
          </DialogTitle>
          <DialogDescription>
            {token
              ? "Copy it now. You won't see it again."
              : "Name it after where you'll use it, so you know which one to revoke."}
          </DialogDescription>
        </DialogHeader>

        {token ? (
          <div className="min-w-0 space-y-4">
            <div className="flex items-start gap-2">
              <code className="min-w-0 flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                {token}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => tokenClipboard.copy(token, "Token copied")}
                aria-label="Copy token"
              >
                {tokenClipboard.copied ? <Check className="text-emerald-500" /> : <Copy />}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Try it</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => curlClipboard.copy(curl, "Command copied")}
                >
                  {curlClipboard.copied ? <Check className="text-emerald-500" /> : <Copy />}
                  Copy
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-md border bg-muted px-3 py-2 font-mono text-xs">
                {curl}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-token-name">Name</Label>
              <Input
                id="api-token-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Claude Code on my laptop"
                maxLength={API_TOKEN_NAME_MAX}
                required
                disabled={isLoading}
                autoFocus
              />
              <FormError message={error} />
            </div>

            <DialogFormFooter isLoading={isLoading} onCancel={handleClose} submitLabel="Create" />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
