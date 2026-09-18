"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-mock";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </form>
  );
}
