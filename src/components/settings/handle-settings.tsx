"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormError from "@/components/shared/form-error";
import { toast } from "sonner";
import { updateHandle } from "@/actions/settings";
import { useOrigin } from "@/hooks/use-origin";
import { MAX_SLUG_LENGTH } from "@/lib/slugs";

interface HandleSettingsProps {
  handle: string | null;
}

export default function HandleSettings({ handle }: HandleSettingsProps) {
  const router = useRouter();
  const origin = useOrigin();
  const [saved, setSaved] = useState(handle ?? "");
  const [value, setValue] = useState(handle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const host = origin ? new URL(origin).host : "";
  const preview = value || "your-handle";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const result = await updateHandle({ handle: value });
    setIsSaving(false);

    if (result.success && result.data) {
      setSaved(result.data.handle);
      setValue(result.data.handle);
      toast.success("Handle updated");
      router.refresh();
    } else {
      setError(result.fieldErrors?.handle?.[0] ?? result.error ?? "Failed to update handle");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Handle</CardTitle>
        <CardDescription>The first part of your public collection links</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Label htmlFor="handle">Handle</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-sm text-muted-foreground">{host}/</span>
            <Input
              id="handle"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.toLowerCase());
                setError(null);
              }}
              placeholder="your-handle"
              maxLength={MAX_SLUG_LENGTH}
              disabled={isSaving}
              className="font-mono"
            />
            <Button type="submit" disabled={isSaving || value === saved}>
              Save
            </Button>
          </div>
          <FormError message={error} />
          <p className="text-sm text-muted-foreground">
            Your collection links start with{" "}
            <span className="font-mono">{host}/{preview}/</span>. Changing it changes those
            links; short links keep working.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
