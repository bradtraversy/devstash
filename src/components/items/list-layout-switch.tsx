"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { storeListLayout, type ListLayout } from "@/lib/list-layout";

const OPTIONS = [
  { value: "rows", label: "Rows", Icon: List },
  { value: "cards", label: "Code cards", Icon: LayoutGrid },
] as const;

export default function ListLayoutSwitch({ layout }: { layout: ListLayout }) {
  const router = useRouter();
  const [current, setCurrent] = useOptimistic(layout);
  const [, startTransition] = useTransition();

  const choose = (next: ListLayout) => {
    if (next === layout) return;
    storeListLayout(next);
    startTransition(() => {
      setCurrent(next);
      router.refresh();
    });
  };

  return (
    <div role="group" aria-label="Layout" className="inline-flex shrink-0 rounded-md border border-border bg-background p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="icon"
          aria-pressed={current === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn("h-7 w-7 text-muted-foreground", current === value && "bg-accent text-foreground")}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
