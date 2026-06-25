"use client";

import React, { useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { usePathname, useRouter } from "next/navigation";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

function Topbar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const segments = pathname
    .split("/")
    .filter(
      (segment) =>
        segment &&
        !/^[0-9a-fA-F]{24}$/.test(segment) &&
        isNaN(Number(segment))
    )
    .map((segment) =>
      segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    );

  // 🔔 Listen for unread notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(firestore, "notifications"),
      where("employeeId", "==", user.uid),
      where("read", "==", false),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });

    return () => unsub();
  }, [user]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2">
      {/* LEFT SIDE */}
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            {segments.map((segment, index) => (
              <React.Fragment key={segment + index}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === segments.length - 1 ? (
                    <BreadcrumbPage>{segment}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={`/${segment.toLowerCase()}`}>
                      {segment}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4 pr-4">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => router.push("/notification")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
}

export default Topbar;
