"use client";
import { AppSidebar } from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthProvider";
import { firestore, onMessageListener, requestNotificationPermission } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { MessagePayload } from "firebase/messaging";
import { useEffect } from "react";
import { toast } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    requestNotificationPermission().then(async (token) => {
      if (!token) return;

      await setDoc(doc(firestore, "fcmTokens", user.uid), {
        token,
        updatedAt: Date.now(),
      });

      console.log("Token saved!");
    });

    onMessageListener().then((payload: MessagePayload) => {
      const title = payload?.notification?.title || "New Notification";
      const body = payload?.notification?.body || "";
      toast.success(title, {
        description: body,
        duration: 5000,
      });
    });
  }, [user]);
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Topbar />
          <div className="p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
