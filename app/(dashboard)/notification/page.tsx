"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Timestamp;
  shootId?: string;
  deliverableId?: string;
  projectId?: string;
}

interface ProjectInfo {
  projectName: string;
  dates: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectMap, setProjectMap] = useState<Record<string, ProjectInfo>>({});

  // Fetch projects to map projectId -> name & dates
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "projects"), (snapshot) => {
      const map: Record<string, ProjectInfo> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        map[doc.id] = {
          projectName: data.projectName || "",
          dates: data.dates || "",
        };
      });
      setProjectMap(map);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(firestore, "notifications"),
      where("employeeId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifList: Notification[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Notification, "id">),
      }));
      setNotifications(notifList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  );

  const markAsRead = async (id: string) => {
    const docRef = doc(firestore, "notifications", id);
    await updateDoc(docRef, { read: true });
  };

  const markAllAsRead = async () => {
    if (unreadNotifications.length === 0) return;
    try {
      const batch = writeBatch(firestore);
      unreadNotifications.forEach((notif) => {
        const docRef = doc(firestore, "notifications", notif.id);
        batch.update(docRef, { read: true });
      });
      await batch.commit();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  if (loading) return <p className="text-center mt-10">Loading notifications...</p>;

  if (notifications.length === 0) return <p className="text-center mt-10">No notifications yet.</p>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Notifications</h1>
        {unreadNotifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read ({unreadNotifications.length})
          </Button>
        )}
      </div>
      {notifications.map((notif) => {
        const project = notif.projectId ? projectMap[notif.projectId] : null;
        return (
          <Card
            key={notif.id}
            className={`border ${notif.read ? "border-gray-200 bg-gray-50" : "border-blue-500 bg-white"
              }`}
          >
            <CardContent className="flex justify-between items-center">
              <div>
                <h2 className="font-semibold">{notif.title}</h2>
                <p className="text-sm text-gray-700">{notif.body}</p>
                {notif.shootId && (
                  <p className="text-xs text-gray-400">Shoot ID: {notif.shootId}</p>
                )}
                {notif.deliverableId && (
                  <p className="text-xs text-gray-400">Deliverable ID: {notif.deliverableId}</p>
                )}
                {project && (
                  <>
                    <p className="text-xs text-gray-400">Project: {project.projectName}</p>
                    {project.dates && (
                      <p className="text-xs text-gray-400">Project Date: {project.dates}</p>
                    )}
                  </>
                )}
                <p className="text-xs text-gray-500">
                  {notif.createdAt instanceof Timestamp
                    ? notif.createdAt.toDate().toLocaleString()
                    : new Date(notif.createdAt as unknown as string).toLocaleString()}
                </p>
              </div>
              {!notif.read && (
                <Button size="sm" onClick={() => markAsRead(notif.id)}>
                  Mark as read
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
