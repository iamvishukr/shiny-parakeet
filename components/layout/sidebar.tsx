"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Command,
  SquareTerminal,
  Users,
  FolderKanban,
  CheckSquare,
  IndianRupee,
  LucideIcon,
  ChartNoAxesCombined,
  CircleStop,
  CalendarDays,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthProvider";
import { ClientOnly } from "@/components/ClientOnly";

// typed shapes for final NavMain props
type NavChild = { title: string; url: string };
type NavMainItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: NavChild[];
};

// base source shape (contains keys used for permissions checks)
type SourceChild = { title: string; url: string; key: string };
type SourceItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  key: string;
  items?: SourceChild[];
};

// ✅ Base menu structure (typed as SourceItem[])
const allNavItems: SourceItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: SquareTerminal, key: "dashboard" },
  { title: "Notifications", url: "/notification", icon: CircleStop, key: "notification" },
  { title: "Enquiry", url: "/enquiry", icon: Bot, key: "enquiry" },
  { title: "Clients", url: "/clients", icon: Bot, key: "clients" },
  { title: "Projects", url: "/projects", icon: BookOpen, key: "projects" },
  {
    title: "Assign Project",
    url: "#",
    icon: BookOpen,
    key: "assign",
    items: [
      { title: "Shoots", url: "/projects/shoots", key: "shoots" },
      { title: "Deliverables", url: "/projects/deliverables", key: "deliverables" },
    ],
  },
  {
    title: "Task",
    url: "#",
    icon: FolderKanban,
    key: "task",
    items: [
      { title: "Outdoor Task", url: "/task", key: "outdoor task" },
      { title: "Indoor Task", url: "/task/indoor", key: "indoor task" },
      { title: "Other Task", url: "/task/other", key: "other task" },
    ],
  },

  {
    title: "Manage Packages",
    url: "#",
    icon: BookOpen,
    key: "packages",
    items: [
      { title: "Events", url: "/events", key: "events" },
      { title: "Packages", url: "/packages", key: "packages" },
      { title: "Shoots", url: "/shoots", key: "shoots" },
      { title: "Deliverables", url: "/deliverables", key: "deliverables" },
    ],
  },
  { title: "Employee", url: "/employee", icon: Users, key: "employee" },

  {
    title: "Attendance",
    url: "/attendance",
    icon: CheckSquare,
    key: "attendance",
    items: [
      { title: "View Attendance", url: "/attendance", key: "attendance" },
      { title: "Add Attendance", url: "/attendance/add", key: "attendance add" },
    ],
  },
  {
    title: "Leaves",
    url: "#",
    icon: CalendarDays,
    key: "leaves",
    items: [
      { title: "My Leaves", url: "/leaves", key: "leaves" },
      { title: "Requests", url: "/leaves/requests", key: "leaves" },
      { title: "Manage Balances", url: "/leaves/manage", key: "leaves manage" },
      { title: "Policy Settings", url: "/leaves/policy", key: "leaves policy" },
    ],
  },
  {
    title: "Invoice",
    url: "#",
    icon: SquareTerminal,
    key: "invoice",
    items: [
      { title: "View", url: "/invoice/view", key: "invoice" },
      { title: "Create", url: "/invoice", key: "invoice" },
    ],
  },
  {
    title: "Accounts",
    url: "#",
    icon: IndianRupee,
    key: "accounts",
    items: [
      { title: "Transaction", url: "/accounts/transaction", key: "accounts" },
      { title: "Salary", url: "/accounts/salary", key: "accounts" },
    ],
  },
  { title: "Profile", url: "/profile", icon: ChartNoAxesCombined, key: "profile" },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user, role, permissions } = useAuth();

  // ✅ Filter menu items based on permissions and role
  const filteredNav = React.useMemo<NavMainItem[]>(() => {
    // Admins see everything, map to NavMainItem shape (strip permission keys from children)
    if (role === "admin") {
      return allNavItems.map((it) => ({
        title: it.title,
        url: it.url,
        icon: it.icon,
        items: it.items ? it.items.map((c) => ({ title: c.title, url: c.url })) : undefined,
      }));
    }

    const allowed = (key: string) => permissions.includes(key);

    const result: NavMainItem[] = [];
    for (const item of allNavItems) {
      const hasAccess = allowed(item.key);
      if (!hasAccess) continue;

      const children = item.items
        ? item.items
            .filter((child) => allowed(child.key))
            .map((child) => ({ title: child.title, url: child.url }))
        : undefined;

      result.push({
        title: item.title,
        url: item.url,
        icon: item.icon,
        items: children,
      });
    }

    return result;
  }, [permissions, role]);

  const userDisplay = {
    name: user?.displayName || "Guest",
    email: user?.email || "No Email",
    avatar: user?.photoURL || "/user.png",
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Studio</span>
                  <span className="truncate text-xs">Suite</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <ClientOnly>
          <NavMain items={filteredNav} />
        </ClientOnly>
      </SidebarContent>

      <SidebarFooter>
        <ClientOnly>
          <NavUser user={userDisplay} />
        </ClientOnly>
      </SidebarFooter>
    </Sidebar>
  );
}
