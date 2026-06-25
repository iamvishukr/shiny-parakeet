import { useState, useEffect, useCallback } from "react";
import { collection, deleteDoc, doc, onSnapshot, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { toast } from "sonner";
import { Project, Deliverable, Client } from "../app/(dashboard)/projects/types";
import { Package } from "../app/(dashboard)/packages/types";

export function useProjectsView() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  // Fetch deliverables for mapping
  useEffect(() => {
    const unsubscribeDeliverables = onSnapshot(
      collection(firestore, "deliverables"),
      (snapshot) => {
        const deliverablesData: Deliverable[] = snapshot.docs.map((doc) => ({
          deliverableId: doc.id,
          name: doc.data().name,
        }));
        setDeliverables(deliverablesData);
      }
    );
    return () => unsubscribeDeliverables();
  }, []);

  // Fetch clients
  useEffect(() => {
    const unsubscribeClients = onSnapshot(collection(firestore, "clients"), (snapshot) => {
      const clientsData: Client[] = snapshot.docs.map((doc) => ({
        clientId: doc.id,
        name: doc.data().name,
      }));
      setClients(clientsData);
    });
    return () => unsubscribeClients();
  }, []);

  // Fetch packages
  useEffect(() => {
    const unsubscribePackages = onSnapshot(collection(firestore, "packages"), (snapshot) => {
      const packagesData: Package[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price,
        eventId: doc.data().eventId,
        shoots: doc.data().shoots || [],
        deliverables: doc.data().deliverables || [],
        createdAt: doc.data().createdAt,
      }));
      setPackages(packagesData);
    });
    return () => unsubscribePackages();
  }, []);

  // Fetch projects
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "projects"), (snapshot) => {
      const result: Project[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        let createdAt: Date;
        if (data.createdAt instanceof Timestamp) {
          createdAt = data.createdAt.toDate();
        } else if (
          typeof data.createdAt === "object" &&
          data.createdAt !== null &&
          "seconds" in data.createdAt
        ) {
          createdAt = new Date(data.createdAt.seconds * 1000);
        } else if (typeof data.createdAt === "string") {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }

        // Map clientName and package to their names
        let clientName = data.clientName;
        let packageName = data.package;
        // If clientName is an ID, resolve to name
        const clientObj = clients.find((c) => c.clientId === data.clientName);
        if (clientObj) clientName = clientObj.name;
        // If package is an ID, resolve to name
        const packageObj = packages.find((p) => p.id === data.package);
        if (packageObj) packageName = packageObj.name;

        // determine final status based on shoots' dates and deliverables' statuses
        const toDate = (val: { seconds: number } | string): Date | null => {
          if (!val) return null;
          if (val instanceof Timestamp) return val.toDate();
          if (val instanceof Date) return val;
          if (typeof val === "object" && "seconds" in val) return new Date(val.seconds * 1000);
          if (typeof val === "string" || typeof val === "number") return new Date(val);
          return null;
        };

        const isSameDate = (a: Date, b: Date) =>
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate();

        const now = new Date();

        // normalize shoot dates (handles entries that are date strings, timestamps, or objects with .date)
        const shootDates: Date[] = (data.shoots || [])
          .map((s: { date: string }) => {
            const raw = s?.date ?? s; // handles both { date: ... } or plain date values
            return toDate(raw);
          })
          .filter(Boolean) as Date[];

        // normalize deliverable statuses
        const deliverableStatuses: string[] = (data.deliverables || [])
          .map((d: { date: string; status: string }) =>
            d && typeof d === "object" ? (d.status || "pending") : "pending"
          );

        const anyShootInFuture = shootDates.some((d) => d.getTime() > now.getTime());
        const anyShootToday = shootDates.some((d) => isSameDate(d, now));
        const allDeliverablesCompleted =
          deliverableStatuses.length > 0 &&
          deliverableStatuses.every((s) => s.toLowerCase() === "completed");
        const anyDeliverableOngoing =
          deliverableStatuses.length > 0 &&
          deliverableStatuses.some((s) => s.toLowerCase() === "ongoing");
        const anyDeliverableCompleted =
          deliverableStatuses.length > 0 &&
          deliverableStatuses.some((s) => s.toLowerCase() === "completed");

        // determine final status
        let status: string;
        if (["Cancelled", "Postponed", "Not Confirmed"].includes(data.status)) {
          status = data.status;
        } else if (allDeliverablesCompleted && !anyShootInFuture && !anyShootToday) {
          // all deliverables done and all shoots completed
          status = "completed";
        } else if (anyDeliverableOngoing || anyDeliverableCompleted || anyShootToday) {
          // something is ongoing or upcoming
          status = "ongoing";
        } else {
          // default fallback
          status = "pending";
        }

        return {
          projectId: doc.id,
          clientName,
          projectName: data.projectName,
          dates: data.dates,
          venues: data.venues,
          event: data.event,
          eventName: data.eventName,
          package: packageName,
          shoots: data.shoots || [],
          // shoot: data.shoot,
          status: status,
          deliverables: data.deliverables || [],
          price: data.price || 0,
          extraExpenses: data.extraExpenses || 0,
          discount: data.discount || 0,
          finalAmount: data.finalAmount || 0,
          advance: data.advance || 0,
          due: data.due || 0,
          note: data.note,
          createdAt,
          transactionHistory: data.transactionHistory || [],
        };
      });
      setData(result);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [clients, packages]);

  const handleEdit = useCallback((project: Project) => {
    setSelectedProject(project);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedProject(null);
    setOpen(false);
  }, []);

  const handleView = useCallback((project: Project) => {
    setSelectedProject(project);
    setViewOpen(true);
  }, []);

  const handleViewClose = useCallback(() => {
    setSelectedProject(null);
    setViewOpen(false);
  }, []);

  const handleBulkDelete = useCallback(async (projects: Project[]) => {
    if (!confirm(`Are you sure you want to delete ${projects.length} selected project(s)?`)) {
      return;
    }

    try {
      const deletePromises = projects.map((project) =>
        deleteDoc(doc(firestore, "projects", project.projectId))
      );
      await Promise.all(deletePromises);
      toast.success("Selected projects deleted successfully.");
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete selected projects.");
    }
  }, []);

  return {
    isLoading,
    data,
    deliverables,
    open,
    viewOpen,
    selectedProject,
    handleEdit,
    handleClose,
    handleView,
    handleViewClose,
    handleBulkDelete,
  };
}
