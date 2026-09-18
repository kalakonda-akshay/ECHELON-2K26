import { ShieldCheck } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavLinks } from "@/components/dashboard/nav-links";
import { Separator } from "@/components/ui/separator";

const hasRealClerkKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim() !== "" &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("example.com") &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("xxxx") &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("pk_test_Y2xlcmsu")
);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (hasRealClerkKey) {
    const { userId } = await auth();
    if (!userId) {
      redirect("/sign-in?redirect_url=/dashboard");
    }
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                RadonGuard
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">Official Dashboard</p>
            </div>
          </div>
        </SidebarHeader>

        <Separator className="bg-sidebar-border" />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
            <NavLinks />
          </SidebarGroup>
        </SidebarContent>

        <Separator className="bg-sidebar-border" />

        <SidebarFooter>
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 bg-sidebar-accent/50">
            {hasRealClerkKey ? (
              <UserButton afterSignOutUrl="/sign-in" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-white">
                RG
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-sidebar-foreground">Officer Portal</p>
              <p className="truncate text-[10px] text-sidebar-foreground/60">
                {hasRealClerkKey ? "Authenticated" : "Local Dev Preview"}
              </p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <p className="text-sm text-muted-foreground">
            Regional Radiation Risk Monitoring System
          </p>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
