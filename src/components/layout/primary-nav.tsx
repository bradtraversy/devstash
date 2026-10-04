"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Home", Icon: House },
  { href: "/shared", label: "Shared", Icon: Share2 },
  { href: "/favorites", label: "Favorites", Icon: Star },
] as const;

interface PrimaryNavProps {
  isCollapsed?: boolean;
  onLinkClick?: () => void;
}

export default function PrimaryNav({ isCollapsed = false, onLinkClick }: PrimaryNavProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {LINKS.map(({ href, label, Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            title={isCollapsed ? label : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
              isCollapsed && "justify-center",
              isActive && "bg-accent text-accent-foreground font-medium"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-foreground" : "text-muted-foreground")} aria-hidden="true" />
            {isCollapsed ? <span className="sr-only">{label}</span> : <span>{label}</span>}
          </Link>
        );
      })}
    </div>
  );
}
