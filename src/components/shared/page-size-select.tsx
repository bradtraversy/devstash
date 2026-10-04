"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZES, parsePageSize, storePageSize, type PageSize } from "@/lib/page-size";

export default function PageSizeSelect({ pageSize }: { pageSize: PageSize }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [current, setCurrent] = useState(pageSize);
  const [, startTransition] = useTransition();

  const choose = (value: string) => {
    const next = parsePageSize(value);
    if (next === current) return;
    setCurrent(next);
    storePageSize(next);
    // A new size starts from the first page, since the old page number points somewhere else now.
    const params = new URLSearchParams(searchParams.toString());
    const hadPage = params.has("page");
    params.delete("page");
    const query = params.toString();
    startTransition(() => {
      if (hadPage) router.push(query ? `${pathname}?${query}` : pathname);
      else router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span aria-hidden="true">Show</span>
      <Select value={String(current)} onValueChange={choose}>
        <SelectTrigger size="sm" aria-label="Items per page" className="h-7 w-[4.5rem] border-border font-mono text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span aria-hidden="true">per page</span>
    </div>
  );
}
