"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, ListOrdered, Building2, FileBarChart } from "lucide-react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard/map", label: "Map", icon: Map },
  { href: "/dashboard/priority", label: "Priority List", icon: ListOrdered },
  { href: "/dashboard/buildings", label: "Buildings", icon: Building2 },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={item.href}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
