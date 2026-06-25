"use client";
import { v4 as uuidv4 } from "uuid";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useProjectsView } from "../../../../hooks/useProjectsView";
import { getShootColumns, ShootRow } from "./columns";
import { GenericTable } from "@/components/shared/GenericTable";
import TableSkeleton from "@/components/shared/skeletons/TableSkeleton";
import Pagination from "@/components/shared/Pagination";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { MultiSelect, Option } from "@/components/shared/MultiSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import TableActions from "@/components/shared/TableActions";

type RoleAssignments = {
  [role: string]: string[];
};

type PendingAssignment = {
  role: string;
  newSelection: string[];
  employeeId: string;
  employeeName: string;
};

// Define types for Firestore data
interface FirestoreTask {
  type: string;
  shootId: string;
  projectId: string;
  role: string;
  deliveryDate?: string;
}

interface FirestoreTaskDocument {
  tasks?: FirestoreTask[];
}

// Extended ShootRow interface to include index signature
interface ShootRowExtended extends ShootRow {
  [key: string]: unknown;
}

export default function ProjectShootsPage() {
  const { isLoading, data } = useProjectsView();
  const [employees, setEmployees] = useState<{ uId: string; name: string; profileStatus: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [selectedShoot, setSelectedShoot] = useState<ShootRow | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignments>({
    traditionalPhotographer: [],
    traditionalVideographer: [],
    candid: [],
    cinematographer: [],
    assistant: [],
    drone: [],
    others: [],
  });
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);

  // Fetch employees
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "users"), (snapshot) => {
      const result = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uId: data.uId ?? doc.id,
          name: data.name ?? "",
          profileStatus: data.profileStatus ?? "Active",
        };
      });
      setEmployees(result);
    });
    return () => unsubscribe();
  }, []);

  // Prepare shoots data for table
  const allShoots: ShootRow[] = useMemo(
    () =>
      data
        .filter((project) => !["Cancelled", "Not Confirmed"].includes(project.status))
        .flatMap((project) =>
          (Array.isArray(project.shoots) ? project.shoots : []).map(
            (shoot: Record<string, unknown>) =>
            ({
              ...shoot,
              projectName: project.projectName,
              venue: shoot.venue === "" ? project.venues : shoot.venue,
              projectId: project.projectId,
              status: project.status,
              assignedEmployees: (shoot as Record<string, unknown>).assignedEmployees || [],
            } as ShootRow)
          )
        ),
    [data]
  );

  // Get quantity limits from the shoot data itself
  const getRoleQuantityLimit = useCallback((shoot: ShootRow, role: string): number => {
    const roleMappings: { [key: string]: string } = {
      traditionalPhotographer: "traditionalPhotographer",
      traditionalVideographer: "traditionalVideographer",
      candid: "candid",
      cinematographer: "cinemetographer",
      assistant: "assistant",
      drone: "drone",
      others: "other",
    };

    const fieldName = roleMappings[role];
    if (!fieldName) return 1;

    // Use type assertion with ShootRowExtended
    const shootExtended = shoot as ShootRowExtended;
    const value = shootExtended[fieldName];
    if (value === undefined || value === null) return 1;

    const numericValue = parseInt(String(value), 10);
    return isNaN(numericValue) ? 1 : numericValue;
  }, []);

  // Check if employee is already assigned on the same date (across all projects)
  const isEmployeeAlreadyAssigned = useCallback(
    async (employeeId: string, shootDate: string, currentShootId: string) => {
      try {
        const taskDocRef = doc(firestore, "task", employeeId);
        const taskDoc = await getDoc(taskDocRef);

        if (!taskDoc.exists()) return false;

        const taskData = taskDoc.data() as FirestoreTaskDocument;
        const tasks = taskData.tasks || [];

        const shootDateFormatted = new Date(shootDate).toISOString().slice(0, 10);

        const hasConflict = tasks.some((task: FirestoreTask) => {
          if (task.type !== "shoot") return false;
          if (task.shootId === currentShootId) return false;

          const taskDate = task.deliveryDate
            ? new Date(task.deliveryDate).toISOString().slice(0, 10)
            : null;

          return taskDate === shootDateFormatted;
        });

        return hasConflict;
      } catch (error) {
        console.error("Error checking employee assignment:", error);
        return false;
      }
    },
    []
  );

  // Assign Employee handler
  const handleAssignEmployee = useCallback((shoot: ShootRow) => {
    setSelectedShoot(shoot);

    setRoleAssignments({
      traditionalPhotographer: shoot.assignedEmployees?.traditionalPhotographer || [],
      traditionalVideographer: shoot.assignedEmployees?.traditionalVideographer || [],
      candid: shoot.assignedEmployees?.candid || [],
      cinematographer: shoot.assignedEmployees?.cinematographer || [],
      assistant: shoot.assignedEmployees?.assistant || [],
      drone: shoot.assignedEmployees?.drone || [],
      others: shoot.assignedEmployees?.others || [],
    });

    setAssignModalOpen(true);
  }, []);

  // Handle role assignment change with validation
  const handleRoleAssignmentChange = useCallback(
    async (role: string, newSelection: string[]) => {
      if (!selectedShoot) return;

      // Check quantity limit
      const quantityLimit = getRoleQuantityLimit(selectedShoot, role);
      if (newSelection.length > quantityLimit) {
        toast.error(`Cannot assign more than ${quantityLimit} employee(s) for ${role}`);
        return;
      }

      // Check for duplicate assignments on same date
      const newlyAddedEmployees = newSelection.filter(
        (empId) => !roleAssignments[role].includes(empId)
      );

      for (const employeeId of newlyAddedEmployees) {
        // 1. Check current roleAssignments in the modal (other roles for same shoot)
        const isAlreadyInOtherRole = Object.entries(roleAssignments).some(([r, assignedIds]) => {
          if (r === role) return false; // skip same role
          return assignedIds.includes(employeeId);
        });

        // 2. Check Firebase tasks
        const isAlreadyInTask = await isEmployeeAlreadyAssigned(
          employeeId,
          selectedShoot.date,
          selectedShoot.id
        );

        if (isAlreadyInOtherRole || isAlreadyInTask) {
          const employee = employees.find((emp) => emp.uId === employeeId);

          setPendingAssignment({
            role,
            newSelection,
            employeeId,
            employeeName: employee?.name || "Unknown Employee",
          });
          setConfirmationModalOpen(true);
          return; // stop further assignment until user confirms
        }
      }

      // If no conflicts, update the assignment immediately
      setRoleAssignments((prev) => ({ ...prev, [role]: newSelection }));
    },
    [selectedShoot, roleAssignments, employees, isEmployeeAlreadyAssigned, getRoleQuantityLimit]
  );

  // Handle confirmation dialog response
  const handleConfirmationResponse = useCallback(
    (confirmed: boolean) => {
      if (!pendingAssignment || !selectedShoot) {
        setConfirmationModalOpen(false);
        setPendingAssignment(null);
        return;
      }

      if (confirmed) {
        // User confirmed - allow the assignment
        setRoleAssignments((prev) => ({
          ...prev,
          [pendingAssignment.role]: pendingAssignment.newSelection,
        }));
        toast.success(
          `Employee ${pendingAssignment.employeeName} assigned despite existing task on same date`
        );
      } else {
        // User declined - keep the original selection
        toast.info(`Employee ${pendingAssignment.employeeName} was not assigned`);
      }

      setConfirmationModalOpen(false);
      setPendingAssignment(null);
    },
    [pendingAssignment, selectedShoot]
  );

  // Table columns
  const columns = useMemo(
    () => getShootColumns(handleAssignEmployee, employees),
    [handleAssignEmployee, employees]
  );

  const table = useReactTable({
    data: allShoots,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Apply date filter to table when dates change
  useEffect(() => {
    const dateColumn = table.getColumn("date");
    if (dateColumn) {
      dateColumn.setFilterValue(startDate || endDate ? { startDate, endDate } : undefined);
    }
  }, [startDate, endDate, table]);

  // Also apply date filter when table is first initialized or data changes
  useEffect(() => {
    if (startDate || endDate) {
      const dateColumn = table.getColumn("date");
      if (dateColumn) {
        dateColumn.setFilterValue({ startDate, endDate });
      }
    }
  }, [table, startDate, endDate]);

  // Save assigned employees
  const handleSaveAssign = async () => {
    if (!selectedShoot) return;

    try {
      setSaving(true);
      // Final validation before saving (only quantity limits, not date conflicts)
      for (const [role, assignedEmployees] of Object.entries(roleAssignments)) {
        const quantityLimit = getRoleQuantityLimit(selectedShoot, role);

        if (assignedEmployees.length > quantityLimit) {
          toast.error(`Cannot assign more than ${quantityLimit} employee(s) for ${role}`);
          return;
        }
      }

      const now = new Date().toISOString();
      const assignedDate = selectedShoot.date
        ? new Date(selectedShoot.date).toISOString().slice(0, 10)
        : now.slice(0, 10);

      // 1) update project document (only update the target shoot)
      const projectDocRef = doc(firestore, "projects", selectedShoot.projectId);
      const project = data.find((p) => p.projectId === selectedShoot.projectId);
      if (!project) throw new Error("Project not found");

      const updatedShoots = (project.shoots || []).map((s) =>
        s.id === selectedShoot.id ? { ...s, assignedEmployees: roleAssignments } : s
      );

      await updateDoc(projectDocRef, { shoots: updatedShoots });

      // 2) compute differences between previous assignments and new assignments
      const prevAssignments: RoleAssignments =
        (selectedShoot.assignedEmployees as RoleAssignments) || {};
      const allRoles = Array.from(
        new Set([...Object.keys(prevAssignments), ...Object.keys(roleAssignments)])
      );

      // For each role, compute added and removed employee ids
      for (const role of allRoles) {
        const prev = new Set(prevAssignments[role] || []);
        const curr = new Set(roleAssignments[role] || []);

        // ADDED: in curr but not in prev -> create task entry under task/{userId}
        for (const empUid of [...curr].filter((x) => !prev.has(x))) {
          const taskDocRef = doc(firestore, "task", empUid);
          const newTask = {
            taskId: uuidv4(),
            type: "shoot",
            shootId: selectedShoot.id,
            name: selectedShoot.day || selectedShoot.ritual || "",
            role,
            projectId: selectedShoot.projectId,
            employeeId: empUid,
            assignedDate: now,
            deliveryDate: assignedDate,
            createdAt: now,
          };

          await fetch("/api/sendNotifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: empUid,
              title: "New Task Assigned",
              body: `${employees.find((e) => e.uId === empUid)?.name || "You"
                } have been assigned to: ${role}`,
              shootId: selectedShoot.id,
              projectId: selectedShoot.projectId,
            }),
          });

          const snap = await getDoc(taskDocRef);
          if (snap.exists()) {
            const existingTasks = (snap.data() as FirestoreTaskDocument).tasks || [];
            const exists = existingTasks.some(
              (t: FirestoreTask) =>
                t.type === "shoot" &&
                t.shootId === newTask.shootId &&
                t.projectId === newTask.projectId &&
                t.role === newTask.role
            );
            if (!exists) {
              await updateDoc(taskDocRef, { tasks: arrayUnion(newTask) });
            }
          } else {
            await setDoc(taskDocRef, { tasks: [newTask] });
          }
        }

        // REMOVED: in prev but not in curr -> remove ONLY that role task
        for (const empUid of [...prev].filter((x) => !curr.has(x))) {
          const taskDocRef = doc(firestore, "task", empUid);
          const snap = await getDoc(taskDocRef);
          if (!snap.exists()) continue;

          const existingTasks = (snap.data() as FirestoreTaskDocument).tasks || [];

          const filtered = existingTasks.filter(
            (t: FirestoreTask) =>
              !(
                (
                  t.type === "shoot" &&
                  t.shootId === selectedShoot.id &&
                  t.projectId === selectedShoot.projectId &&
                  t.role === role
                ) // ✅ THIS IS THE FIX
              )
          );

          await updateDoc(taskDocRef, { tasks: filtered });
        }
      }

      toast.success("Assigned employees & tasks synced");
      setSaving(false);
      setAssignModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign employees");
    } finally {
      setSaving(false);
    }
  };

  // Employee options for MultiSelect
  const employeeOptions: Option[] = employees
    .filter((emp) => emp.profileStatus !== "Inactive")
    .map((emp) => ({ value: emp.uId, label: emp.name }));

  return (
    <div className="w-full p-4">
      <h1 className="text-3xl font-bold mb-6">All Project Shoots</h1>
      {isLoading ? (
        <TableSkeleton columnCount={12} rowCount={5} />
      ) : (
        <>
          <TableActions
            table={table}
            data={allShoots}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            resetDateFilter={() => {
              setStartDate("");
              setEndDate("");
            }}
            searchParam="projectName"
            dateColumn="date"
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}

      {/* Assign Employee Dialog */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Employee(s) to Shoot</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            {Object.keys(roleAssignments).map((role) => (
              <div key={role}>
                <label className="block mb-1 font-semibold capitalize">
                  {role.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                  {selectedShoot && (
                    <span className="ml-2 text-sm text-gray-500">
                      (Limit: {getRoleQuantityLimit(selectedShoot, role)})
                    </span>
                  )}
                </label>
                <MultiSelect
                  options={employeeOptions}
                  selected={roleAssignments[role]}
                  onChange={(newSelection) => handleRoleAssignmentChange(role, newSelection)}
                  placeholder={`Select ${role}...`}
                  maxSelection={selectedShoot ? getRoleQuantityLimit(selectedShoot, role) : 1}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveAssign} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationModalOpen} onOpenChange={setConfirmationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Already Assigned</DialogTitle>
            <DialogDescription>
              Employee <strong>{pendingAssignment?.employeeName}</strong> is already assigned to
              another task on{" "}
              <strong>
                {selectedShoot ? new Date(selectedShoot.date).toLocaleDateString("en-GB") : ""}
              </strong>
              . Do you want to assign them anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2">
            <Button variant="outline" onClick={() => handleConfirmationResponse(false)}>
              No, Cancel
            </Button>
            <Button
              onClick={() => handleConfirmationResponse(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Yes, Assign Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
