"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { collection, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { GenericTable } from "@/components/shared/GenericTable";
import Pagination from "@/components/shared/Pagination";
import TableSkeleton from "@/components/shared/skeletons/TableSkeleton";
import TableActions from "@/components/shared/TableActions";
import { menuContent } from "@/components/shared/TableMenuContent";
import { getTaskColumns, type RawTask, type Task } from "./columns";
import { toast } from "sonner";
import AddTaskModal from "../AddTaskModal";
import { useAuth } from "@/context/AuthProvider";
import UpdateTaskStatusModal from "@/components/shared/UpdateTaskStatusModal";

export default function TasksTable() {
  const { role, user } = useAuth();
  const isStaff = role?.toLowerCase() === "staff";
  const [isLoading, setIsLoading] = useState(true);
  const [flatTasks, setFlatTasks] = useState<Task[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [activeUsersMap, setActiveUsersMap] = useState<Record<string, string>>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "deliveryDate", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    createdAt: false,
    employeeNames: !isStaff,
  });
  const [open, setOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleEdit = useCallback((task: Task) => {
    setSelectedTask(task);
    setOpen(true);
  }, []);

  const handleUpdate = useCallback((task: Task) => {
    setSelectedTask(task);
    setUpdateOpen(true);
  }, []);

  const handleDelete = useCallback(async (task: Task) => {
    try {
      // Delete task from all employee documents
      const deletePromises = task.employeeIds.map(async (employeeId) => {
        const taskDocRef = doc(firestore, "task", employeeId);
        const snap = await getDoc(taskDocRef);

        if (!snap.exists()) return;

        const tasks = snap.data()?.tasks || [];
        const updatedTasks = tasks.filter((t: { taskId: string }) => t.taskId !== task.id);

        await updateDoc(taskDocRef, { tasks: updatedTasks });
      });

      await Promise.all(deletePromises);
      toast.success("Task deleted successfully for all employees");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete task");
    }
  }, []);

  const columns = useMemo(
    () => getTaskColumns(handleEdit, handleDelete, handleUpdate, isStaff),
    [handleEdit, handleDelete, isStaff, handleUpdate]
  );

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

  useEffect(() => {
    const dateColumn = table.getColumn("createdAt");
    if (dateColumn) {
      dateColumn.setFilterValue(startDate || endDate ? { startDate, endDate } : undefined);
    }
  }, [startDate, endDate, table]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSelectedTask(undefined);
  }, []);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(firestore, "users"), (snap) => {
      const map: Record<string, string> = {};
      const activeMap: Record<string, string> = {};
      snap.forEach((d) => {
        const dt = d.data();
        const username = dt.name || dt.email || "Unknown";
        map[d.id] = username;
        if (dt.profileStatus !== "Inactive") {
          activeMap[d.id] = username;
        }
      });
      setUsersMap(map);
      setActiveUsersMap(activeMap);
    });
    return () => unsubUsers();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    let unsub: () => void;

    if (user) {
      if (isStaff) {
        // Staff user sees only their tasks
        const userDocRef = doc(firestore, "task", user.uid);

        unsub = onSnapshot(userDocRef, (docSnap) => {
          const grouped: Record<string, Task> = {};

          if (docSnap.exists()) {
            const docData = docSnap.data() || {};
            const tasks: RawTask[] = Array.isArray(docData.tasks) ? docData.tasks : [];

            tasks.forEach((t) => {
              if (t.type !== "Other") return;

              const taskId = t.taskId;

              if (!grouped[taskId]) {
                grouped[taskId] = {
                  id: taskId,
                  raw: t,
                  name: t.name,
                  employeeIds: [user.uid],
                  employeeNames: [usersMap[user.uid] || "Unknown"],
                  description: t.description,
                  deliveryDate: t.deliveryDate ? new Date(t.deliveryDate) : undefined,
                  assignedDate: t.assignedDate ? new Date(t.assignedDate) : undefined,
                  createdAt: new Date(t.createdAt),
                  status: t.status,
                  projectId: t.projectId,
                  shootId: t.shootId,
                  role: t.role,
                };
              }
            });
          }

          setFlatTasks(Object.values(grouped));
          setIsLoading(false);
        });
      } else {
        // Admin/Manager sees all tasks grouped by taskId
        unsub = onSnapshot(collection(firestore, "task"), (snapshot) => {
          const grouped: Record<string, Task> = {};

          snapshot.forEach((docSnap) => {
            const userId = docSnap.id;
            const docData = docSnap.data() || {};
            const tasks: RawTask[] = Array.isArray(docData.tasks) ? docData.tasks : [];

            tasks.forEach((t) => {
              if (t.type !== "Other") return;

              const taskId = t.taskId;

              if (!grouped[taskId]) {
                // First occurrence of this task
                grouped[taskId] = {
                  id: taskId,
                  raw: t,
                  name: t.name,
                  employeeIds: [userId],
                  employeeNames: [usersMap[userId] || "Unknown"],
                  description: t.description,
                  deliveryDate: t.deliveryDate ? new Date(t.deliveryDate) : undefined,
                  assignedDate: t.assignedDate ? new Date(t.assignedDate) : undefined,
                  createdAt: new Date(t.createdAt),
                  status: t.status,
                  projectId: t.projectId,
                  shootId: t.shootId,
                  role: t.role,
                };
              } else {
                // Additional employee for this task
                if (!grouped[taskId].employeeIds.includes(userId)) {
                  grouped[taskId].employeeIds.push(userId);
                  grouped[taskId].employeeNames.push(usersMap[userId] || "Unknown");
                }
              }
            });
          });

          const all = Object.values(grouped);
          all.sort((a, b) => {
            const aTime = a.deliveryDate?.getTime() ?? 0;
            const bTime = b.deliveryDate?.getTime() ?? 0;
            return bTime - aTime;
          });

          setFlatTasks(all);
          setIsLoading(false);
        });
      }
    }

    return () => unsub?.();
  }, [usersMap, user, isStaff]);

  async function updateTaskStatus(tasks: Task[], newStatus: string) {
    try {
      // For each task, update all employee documents
      const updatePromises = tasks.flatMap((task) =>
        task.employeeIds.map(async (employeeId) => {
          const taskDocRef = doc(firestore, "task", employeeId);
          const snap = await getDoc(taskDocRef);

          if (!snap.exists()) return;

          const existingTasks = snap.data()?.tasks || [];
          const updatedTasks = existingTasks.map((t: { taskId: string }) =>
            t.taskId === task.id ? { ...t, status: newStatus } : t
          );

          await updateDoc(taskDocRef, { tasks: updatedTasks });
        })
      );

      await Promise.all(updatePromises);
      toast.success(`Tasks marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update tasks");
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

  async function handleUpdateStatus(status: string) {
    if (!selectedTask) return;

    try {
      const updatePromises = selectedTask.employeeIds.map(async (employeeId) => {
        const ref = doc(firestore, "task", employeeId);
        const snap = await getDoc(ref);

        if (!snap.exists()) return;

        const tasks = snap.data()?.tasks || [];

        const updatedTasks = tasks.map((t: { taskId: string }) =>
          t.taskId === selectedTask.id ? { ...t, statusNote: status } : t
        );

        await updateDoc(ref, { tasks: updatedTasks });
      });

      await Promise.all(updatePromises);
      toast.success("Task status updated");
      setUpdateOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update task status");
    }
  }

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
            employeeParam={isStaff ? "" : "employeeNames"}
            resetDateFilter={() => {
              setStartDate("");
              setEndDate("");
            }}
            menuContent={
              !isStaff &&
              menuContent({
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
              })
            }
            onOpenChange={setOpen}
            statusFilter={true}
            searchPlaceholder="Filter tasks..."
            dateColumn="createdAt"
            showAdd={!isStaff}
          />
          <GenericTable table={table} />
          <Pagination table={table} />
          {!isStaff && (
            <AddTaskModal
              open={open}
              onOpenChange={handleClose}
              employees={activeUsersMap}
              task={selectedTask}
            />
          )}
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
