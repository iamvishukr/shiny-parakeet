"use client";

import { useAuth } from "@/context/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import LoadingSpinner from "./shared/LoadingSpinner";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, permissions, isAuthLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  const checkAccess = useCallback(() => {
    if (!isAuthLoaded) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const routeSegment = pathname?.split("/")[1];

    // If no permissions are loaded yet, wait
    if (!permissions.length) return;

    // Admins can access everything
    if (role === "admin") {
      setAllowed(true);
      return;
    }

    // Check if user has permission for this route
    if (routeSegment && !permissions.includes(routeSegment)) {
      router.replace("/unauthorized");
      return;
    }

    setAllowed(true);
  }, [user, role, permissions, pathname, isAuthLoaded, router]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return (
    <>
      {children}
      {(!isAuthLoaded || !allowed) && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-[2px] z-50">
          <LoadingSpinner message="Checking access..." />
        </div>
      )}
    </>
  );
}
