import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function PublicHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-5">
      <Link href="/lookup" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">RadonGuard</span>
      </Link>
      <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
        Official sign-in
      </Link>
    </header>
  );
}
