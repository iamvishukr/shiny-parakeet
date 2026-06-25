"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { collection, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { GenericTable } from "@/components/shared/GenericTable";
import Pagination from "@/components/shared/Pagination";
import TableSkeleton from "@/components/shared/skeletons/TableSkeleton";
import TableActions from "@/components/shared/TableActions";
import { menuContent } from "@/components/shared/TableMenuContent";
import { getTaskColumns, RawTask, Task } from "./columns";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import UpdateTaskStatusModal from "@/components/shared/UpdateTaskStatusModal";

export default function TasksTable() {
  const { role, user } = useAuth();
  const isStaff = role?.toLowerCase() === "staff";
  const [isLoading, setIsLoading] = useState(true);
  const [flatTasks, setFlatTasks] = useState<Task[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "deliveryDate", desc: true }]); // Fixed: changed 'date' to 'deliveryDate'
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    createdAt: false,
    employeeName: !isStaff,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedTask, setSelectedTask] = useState<Task>();
  const [updateOpen, setUpdateOpen] = useState(false);

  const [projectsMap, setProjectsMap] = useState<
    Record<
      string,
      { name: string; status: string; dates: string; deliverables: { id: string; status?: string }[] }
    >
  >({});

  const handleUpdate = useCallback((task: Task) => {
    setSelectedTask(task);
    setUpdateOpen(true);
  }, []);

  // columns (inline for clarity)
  const columns = useMemo(() => getTaskColumns(handleUpdate), [handleUpdate]);

  const table = useReactTable({
    data: flatTasks,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Apply date filter to table when dates change
  useEffect(() => {
    const dateColumn = table.getColumn("projectDate");
    if (dateColumn) {
      dateColumn.setFilterValue(startDate || endDate ? { startDate, endDate } : undefined);
    }
  }, [startDate, endDate, table]);

  // Subscribe to users collection to build map userId -> name
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(firestore, "users"), (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((d) => {
        const dt = d.data();
        map[d.id] = dt.name || dt.email || "Unknown";
      });
      setUsersMap(map);
    });
    return () => unsubUsers();
  }, []);

  // Subscribe to projects collection first
  useEffect(() => {
    const unsubProjects = onSnapshot(collection(firestore, "projects"), (snap) => {
      const map: Record<
        string,
        { name: string; status: string; dates: string; deliverables: { id: string; status?: string }[] }
      > = {};
      snap.forEach((doc) => {
        if (doc.data().status === "Cancelled") return; // Skip cancelled projects
        const data = doc.data();
        map[doc.id] = {
          name: data.projectName ?? "",
          status: data.status ?? "",
          dates: data.dates ?? "",
          deliverables: data.deliverables || [],
        };
      });
      setProjectsMap(map);
    });

    return () => unsubProjects();
  }, []);

  // Subscribe to task collection (one doc per user, each has tasks array)
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    let unsub: () => void;

    if (isStaff) {
      // ✅ STAFF → Fetch ONLY their own document
      const userDocRef = doc(firestore, "task", user.uid);

      unsub = onSnapshot(userDocRef, (docSnap) => {
        const all: Task[] = [];

        if (docSnap.exists()) {
          const docData = docSnap.data() || {};
          const tasks: RawTask[] = Array.isArray(docData.tasks) ? docData.tasks : [];

          tasks.forEach((t) => {
            if (t.type !== "deliverable") return; // only deliverable tasks
            if (!t.projectId) return console.warn(`No projectId in task ${t.taskId}`);

            const project = projectsMap[t.projectId];
            if (
              !project ||
              project.deliverables.every((d: { id: string }) => d.id !== t.deliverableId)
            ) {
              console.warn(`Project ${t.projectId} not found for task ${t.taskId}`);
              return;
            }

            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const assignedDate = t.assignedDate;
            const createdAt = new Date(t.createdAt || now);
            const deliveryDate = t.deliveryDate;

            let projectStatus = "Pending";
            if (["Cancelled", "Postponed", "Not Confirmed"].includes(project.status)) {
              projectStatus = project.status;
            } else {
              const deliverable = project.deliverables.find(
                (d: { id: string; status?: string }) => d.id === t.deliverableId
              );
              projectStatus = deliverable?.status ?? t.status;
            }

            const name = `${project.name}_${t.name}`;

            all.push({
              id: t.taskId,
              raw: t,
              name,
              employeeId: t.employeeId || user.uid,
              employeeName: usersMap[user.uid],
              deliveryDate,
              assignedDate,
              createdAt,
              status: projectStatus,
              projectId: t.projectId,
              shootId: t.shootId,
              role: t.role,
              projectDate: project.dates,
            });
          });
        }

        setFlatTasks(all);
        setIsLoading(false);
      });
    } else {
      // ✅ ADMIN / MANAGER → Fetch entire collection
      unsub = onSnapshot(collection(firestore, "task"), (snapshot) => {
        const all: Task[] = [];

        snapshot.forEach((docSnap) => {
          const userId = docSnap.id;
          const docData = docSnap.data() || {};
          const tasks: RawTask[] = Array.isArray(docData.tasks) ? docData.tasks : [];

          tasks.forEach((t) => {
            if (t.type !== "deliverable") return;
            if (!t.projectId) return console.warn(`No projectId in task ${t.taskId}`);

            const project = projectsMap[t.projectId];
            if (
              !project ||
              project.deliverables.every((d: { id: string }) => d.id !== t.deliverableId)
            ) {
              console.warn(`Project ${t.projectId} not found for task ${t.taskId}`);
              return;
            }

            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const assignedDate = t.assignedDate;
            const createdAt = new Date(t.createdAt || now);
            const deliveryDate = t.deliveryDate;

            let projectStatus = "Pending";
            if (["Cancelled", "Postponed", "Not Confirmed"].includes(project.status)) {
              projectStatus = project.status;
            } else {
              const deliverable = project.deliverables.find(
                (d: { id: string; status?: string }) => d.id === t.deliverableId
              );
              projectStatus = deliverable?.status ?? t.status;
            }

            const name = `${project.name}_${t.name}`;

            all.push({
              id: t.taskId,
              raw: t,
              name,
              employeeId: t.employeeId || userId,
              employeeName: usersMap[userId],
              deliveryDate,
              assignedDate,
              createdAt,
              status: projectStatus,
              projectId: t.projectId,
              shootId: t.shootId,
              role: t.role,
              projectDate: project.dates,
            });
          });
        });

        setFlatTasks(all);
        setIsLoading(false);
      });
    }

    return () => unsub && unsub();
  }, [user, isStaff, usersMap, projectsMap]);

  async function updateTaskStatus(tasks: Task[], newStatus: string) {
    try {
      // Group tasks by project_id
      const groupedByProject: Record<string, Task[]> = {};
      tasks.forEach((task) => {
        if (!groupedByProject[task.projectId]) {
          groupedByProject[task.projectId] = [];
        }
        groupedByProject[task.projectId].push(task);
      });

      for (const [projectId, projectTasks] of Object.entries(groupedByProject)) {
        const projectDocRef = doc(firestore, "projects", projectId);
        const projectSnap = await getDoc(projectDocRef);

        if (!projectSnap.exists()) continue;

        const projectData = projectSnap.data();
        const deliverables = projectData.deliverables || [];

        // Update deliverables inside this project
        const updatedDeliverables = deliverables.map((d: { id: string }) => {
          const matchingTask = projectTasks.find((t) => t.raw.deliverableId === d.id);
          if (matchingTask) {
            return { ...d, status: newStatus };
          }
          return d;
        });

        // fetch("/api/sendUpdateNotification", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({
        //     title: `Deliverables Updated to ${newStatus}`,
        //     body: `The "${projectTasks[0].raw.name}" for project "${projectData.projectName}" have been marked as ${newStatus}.`,
        //     employeeId: projectTasks[0].employeeId,
        //     projectId: projectId,
        //   }),
        // });

        await updateDoc(projectDocRef, { deliverables: updatedDeliverables });
      }

      toast.success(`Deliverables marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update deliverable status");
    }
  }

  function handleMarkPending() {
    const selectedTasks = table.getSelectedRowModel().rows.map((r) => r.original);
    updateTaskStatus(selectedTasks, "Pending");
  }

  function handleMarkOngoing() {
    const selectedTasks = table.getSelectedRowModel().rows.map((r) => r.original);

    updateTaskStatus(selectedTasks, "Ongoing");
  }

  function handleMarkedCompleted() {
    const selectedTasks = table.getSelectedRowModel().rows.map((r) => r.original);
    const nonCompletedTasks = selectedTasks.filter((t) => t.status !== "Completed");

    if (nonCompletedTasks.length === 0) {
      toast.error("No tasks to mark as completed");
      return;
    }

    updateTaskStatus(nonCompletedTasks, "Completed");
  }

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTask) return;

    try {
      const taskOwnerId = isStaff ? user?.uid : selectedTask.employeeId;

      if (!taskOwnerId) {
        toast.error("Invalid task owner");
        return;
      }

      const taskDocRef = doc(firestore, "task", taskOwnerId);
      const snap = await getDoc(taskDocRef);

      if (!snap.exists()) {
        toast.error("Task document not found");
        return;
      }

      // 2️⃣ Update only the matching task inside tasks[]
      const existingTasks = snap.data()?.tasks || [];

      const updatedTasks = existingTasks.map((t: { taskId: string }) => {
        if (t.taskId !== selectedTask.id) return t;

        return {
          ...t,
          statusNote: status ?? "",
          updatedAt: new Date().toISOString(),
        };
      });

      // 3️⃣ Save back to Firestore
      await updateDoc(taskDocRef, {
        tasks: updatedTasks,
      });

      toast.success("Task status updated");
      setUpdateOpen(false);
      setSelectedTask(undefined);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update task status");
    }
  };

  return (
    <div className="w-full">
      {isLoading ? (
        <TableSkeleton columnCount={6} rowCount={6} />
      ) : (
        <>
          <TableActions
            table={table}
            data={flatTasks}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            employeeParam={isStaff ? "" : "employeeName"}
            resetDateFilter={() => {
              setStartDate("");
              setEndDate("");
            }}
            menuContent={menuContent({
              selectedRows: table.getSelectedRowModel().rows.map((r) => r.original),
              actions: [
                {
                  label: "Mark Pending",
                  onClick: handleMarkPending,
                  className: "text-red-600",
                },
                {
                  label: "Mark Ongoing",
                  onClick: handleMarkOngoing,
                  className: "text-blue-600",
                },
                {
                  label: "Mark Completed",
                  onClick: handleMarkedCompleted,
                  className: "text-green-600",
                },
              ],
            })}
            statusFilter={true}
            searchPlaceholder="Filter tasks..."
            dateColumn="projectDate"
          />
          <GenericTable table={table} />
          <Pagination table={table} />
          {selectedTask && (
            <UpdateTaskStatusModal
              open={updateOpen}
              onOpenChange={setUpdateOpen}
              statusNote={selectedTask.raw.statusNote}
              onSubmit={handleUpdateStatus}
            />
          )}
        </>
      )}
    </div>
  );
}
