"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3.5rem";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    isMobile ? setOpenMobile((v) => !v) : setOpen((v) => !v);
  }, [isMobile]);

  return (
    <SidebarContext.Provider
      value={{ open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }}
    >
      <div
        style={{ "--sidebar-width": SIDEBAR_WIDTH } as React.CSSProperties}
        className={cn("flex min-h-svh w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-[--sidebar-width-mobile] bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
          style={{ "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-state={open ? "expanded" : "collapsed"}
      className={cn(
        "hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear md:flex md:flex-col",
        open ? "w-[--sidebar-width]" : "w-[--sidebar-width-icon]",
        className
      )}
      style={{ "--sidebar-width-icon": SIDEBAR_WIDTH_ICON } as React.CSSProperties}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

export function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <main
      className={cn("flex min-h-svh flex-1 flex-col bg-background", className)}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 p-3", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto flex flex-col gap-2 p-3", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2", className)} {...props} />
  );
}

export function SidebarGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, isMobile } = useSidebar();
  if (!open && !isMobile) return null;
  return (
    <div
      className={cn(
        "px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/50",
        className
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("list-none", className)} {...props} />;
}

export function SidebarMenuButton({
  className,
  isActive,
  asChild,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean; asChild?: boolean }) {
  const { open, isMobile } = useSidebar();
  const Comp = asChild ? React.Fragment : "button";
  const content = (
    <span
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        !open && !isMobile && "justify-center px-2",
        className
      )}
    >
      {children}
    </span>
  );
  if (asChild) return content;
  return (
    <button type="button" className="w-full" {...props}>
      {content}
    </button>
  );
}
