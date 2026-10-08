"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import ConfirmDeleteDialog from "@/components/shared/confirm-delete-dialog";
import CreateApiTokenDialog from "@/components/settings/create-api-token-dialog";
import { revokeApiToken } from "@/actions/api-tokens";
import { API_TOKEN_LIMIT } from "@/lib/constants/api-tokens";
import { MCP_DOCS_PATH } from "@/lib/constants/links";
import type { ApiTokenSummary } from "@/lib/db/api-tokens";
import { formatRelativeDate } from "@/lib/utils/date";

interface ApiTokenSettingsProps {
  tokens: ApiTokenSummary[];
}

function relativeDay(date: Date): string {
  const relative = formatRelativeDate(date);
  return relative === "Today" || relative === "Yesterday" ? relative.toLowerCase() : relative;
}

export default function ApiTokenSettings({ tokens }: ApiTokenSettingsProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiTokenSummary | null>(null);
  const atLimit = tokens.length >= API_TOKEN_LIMIT;

  const handleRevoke = async () => {
    if (!revoking) return;
    const result = await revokeApiToken(revoking.id);
    if (result.success) {
      toast.success("Token revoked");
      setRevoking(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to revoke token");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>API tokens</CardTitle>
            <CardDescription>
              Let scripts and AI tools use your stash. Anyone with a token can read, create,
              share, and delete your items.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)} disabled={atLimit}>
            <Plus />
            Create token
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{token.name}</p>
                  <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                    <span className="font-mono">ds_...{token.lastFour}</span>
                    {" · "}Created {relativeDay(token.createdAt)}
                    {" · "}
                    {token.lastUsedAt ? `Last used ${relativeDay(token.lastUsedAt)}` : "Never used"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setRevoking(token)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}

        {atLimit && (
          <p className="text-sm text-muted-foreground">
            You can have up to {API_TOKEN_LIMIT} tokens. Revoke one to make another.
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          See the{" "}
          <Link href="/docs/api" className="text-foreground underline underline-offset-4">
            API docs
          </Link>{" "}
          for the endpoints, or{" "}
          <Link href={MCP_DOCS_PATH} className="text-foreground underline underline-offset-4">
            connect Claude Code, Codex, or Cursor
          </Link>{" "}
          through the MCP server.
        </p>
      </CardContent>

      <CreateApiTokenDialog open={creating} onOpenChange={setCreating} />

      <ConfirmDeleteDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
        title={revoking ? `Revoke ${revoking.name}?` : "Revoke token?"}
        description="Anything using this token stops working right away."
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
      />
    </Card>
  );
}
