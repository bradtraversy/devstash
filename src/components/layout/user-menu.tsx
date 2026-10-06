"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { BookOpen, LogOut, User, Settings } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  onNavigate?: () => void;
}

export default function UserMenuContent({ onNavigate }: UserMenuProps) {
  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem asChild>
        <Link href="/profile" onClick={onNavigate} className="flex items-center">
          <User className="mr-2 h-4 w-4" />
          Profile
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings" onClick={onNavigate} className="flex items-center">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/docs" onClick={onNavigate} className="flex items-center">
          <BookOpen className="mr-2 h-4 w-4" />
          Docs
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => signOut({ callbackUrl: "/sign-in" })}
        className="text-destructive focus:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
