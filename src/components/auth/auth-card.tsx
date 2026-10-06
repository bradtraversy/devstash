import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AuthCard({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn("w-full max-w-md border-0 bg-transparent shadow-none", className)}
      {...props}
    />
  );
}
