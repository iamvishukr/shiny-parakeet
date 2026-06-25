"use client";
import { v4 as uuidv4 } from "uuid";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useProjectsView } from "../../../../hooks/useProjectsView";
import { getDeliverableColumns, DeliverableRow, Employee } from "./columns";
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
import { collection, doc, onSnapshot, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { MultiSelect, Option } from "@/components/shared/MultiSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import TableActions from "@/components/shared/TableActions";

type Task = {
  deliverableId?: string;
  name?: string;
  projectId?: string;
  employeeId?: string;
  assignedDate?: string;
  deliveryDate?: string;
  completeDate?: string;
  createdAt?: string;
  type?: string;
  status?: string;
  taskId: string;
};

function ProjectDeliverables() {
  const { isLoading, data } = useProjectsView();
  const [saving, setSaving] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableRow | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDeliverableProjectId, setSelectedDeliverableProjectId] = useState<string | null>(
    null
  );
  const [assignedDate, setAssignedDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch employees
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "users"), (snapshot) => {
      const result: Employee[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uId: data.uId ?? doc.id,
          empId: data.empId ?? "",
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          gender: data.gender ?? "",
          address: data.address ?? "",
          salary: data.salary ?? "",
          paidSalary: data.paidSalary ?? 0,
          profileStatus: data.profileStatus ?? "Inactive",
          userType: data.userType ?? "employee",
          createdAt: data.createdAt ?? "",
          assignedCompany: data.assignedCompany ?? {},
          salaryHistory: data.salaryHistory ?? {},
          accessLevelMap: data.accessLevelMap ?? {},
          salaryStatus: data.salaryStatus ?? "Unpaid",
        };
      });
      setEmployees(result);
    });
    return () => unsubscribe();
  }, []);

  // Employee map for quick lookup
  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((emp) => {
      map[emp.uId] = emp.name;
    });
    return map;
  }, [employees]);

  // Flatten all deliverables from all projects, including projectName and assignedEmployees
  const allDeliverables: DeliverableRow[] = useMemo(
    () =>
      data
        .filter((project) => !["Cancelled", "Not Confirmed"].includes(project.status))
        .flatMap((project) =>
          Array.isArray(project.deliverables)
            ? (project.deliverables as DeliverableRow[]).map((d: DeliverableRow, idx: number) => ({
              id: d.id || `${project.projectId}-${idx}`,
              name: d.name || String(d),
              qty: d.qty || "",
              projectName: project.projectName,
              status: project.status,
              assignedEmployees: Array.isArray(d.assignedEmployees) ? d.assignedEmployees : [],
              _projectId: project.projectId, // for update reference
              createdAt: (d as Partial<DeliverableRow> & { createdAt?: string }).createdAt || "",
              deliveryDate: d.deliveryDate ?? "",
              assignedDate: d.assignedDate ?? "",
              projectDate: project.dates || "",
            }))
            : []
        ),
    [data]
  );

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Edit handler (placeholder)
  const handleEdit = useCallback((deliverable: DeliverableRow) => {
    setSelectedDeliverable(deliverable);
  }, []);

  // Assign Employee handler
  const handleAssignEmployee = useCallback((deliverable: DeliverableRow) => {
    setSelectedDeliverable(deliverable);
    setSelectedEmployeeIds(deliverable.assignedEmployees || []);
    setSelectedDeliverableProjectId(
      (deliverable as Partial<DeliverableRow> & { _projectId?: string })._projectId || null
    );
    setAssignedDate(deliverable.assignedDate);
    setDeliveryDate(deliverable.deliveryDate);
    setAssignModalOpen(true);
  }, []);

  // Save assigned employees and create task in Firestore
  const handleSaveAssign = async () => {
    if (!selectedDeliverable || !selectedDeliverableProjectId) return;
    try {
      setSaving(true);
      // Find the project and update the deliverable's assignedEmployees and task info
      const projectDocRef = doc(firestore, "projects", selectedDeliverableProjectId);
      // Find the project in data
      const project = data.find((p) => p.projectId === selectedDeliverableProjectId);
      if (!project) throw new Error("Project not found");
      const now = new Date().toISOString();
      // Find previous assigned employees for this deliverable
      const prevDeliverable = (project.deliverables as DeliverableRow[]).find(
        (d: DeliverableRow) => d.id === selectedDeliverable.id
      );
      const prevAssignedEmployees: string[] = Array.isArray(prevDeliverable?.assignedEmployees)
        ? prevDeliverable.assignedEmployees
        : [];
      const newlyAddedEmployees = selectedEmployeeIds.filter(
        (empId) => !prevAssignedEmployees.includes(empId)
      );
      const existingEmployees = selectedEmployeeIds.filter((empId) =>
        prevAssignedEmployees.includes(empId)
      );

      // Detect removed employees (all previous if assignedEmployees is empty)
      const removedEmployees: string[] = prevAssignedEmployees.filter(
        (empId) => !selectedEmployeeIds.includes(empId)
      );
      // Remove ONLY the task for this deliverable from each removed employee's task document
      for (const empId of removedEmployees) {
        const employeeTaskDocRef = doc(firestore, "task", empId);
        const docSnap = await getDoc(employeeTaskDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const tasks: Task[] = Array.isArray(data.tasks) ? data.tasks : [];
          // Only remove the task for this deliverable, leave other tasks untouched
          const newTasks = tasks.filter(
            (task) =>
              !(
                task.deliverableId === selectedDeliverable.id &&
                task.projectId === selectedDeliverableProjectId
              )
          );

          await setDoc(employeeTaskDocRef, { tasks: newTasks }, { merge: true });
        }
      }
      const updatedDeliverables = (project.deliverables as DeliverableRow[]).map((d) =>
        d.id === selectedDeliverable.id
          ? {
            ...d,
            assignedEmployees: selectedEmployeeIds,
            createdAt: (d as Partial<DeliverableRow> & { createdAt?: string }).createdAt || now,
            deliveryDate: deliveryDate,
            assignedDate: assignedDate,
          }
          : d
      );
      await updateDoc(projectDocRef, { deliverables: updatedDeliverables });

      // If nothing assigned, just close after syncing project
      if (selectedEmployeeIds.length === 0) {
        toast.success("All employees unassigned from deliverable");
        setAssignModalOpen(false);
        return;
      }

      for (const empId of existingEmployees) {
        const employeeTaskDocRef = doc(firestore, "task", empId);
        const docSnap = await getDoc(employeeTaskDocRef);

        if (!docSnap.exists()) continue;

        const tasks: Task[] = Array.isArray(docSnap.data().tasks) ? docSnap.data().tasks : [];

        const updatedTasks = tasks.map((task) => {
          if (
            task.deliverableId === selectedDeliverable.id &&
            task.projectId === selectedDeliverableProjectId
          ) {
            return {
              ...task,
              assignedDate: assignedDate,
              deliveryDate: deliveryDate,
            };
          }
          return task;
        });

        await updateDoc(employeeTaskDocRef, { tasks: updatedTasks });
      }

      if (newlyAddedEmployees.length > 0) {
        for (const empId of newlyAddedEmployees) {
          const employeeTaskDocRef = doc(firestore, "task", empId);
          const docSnap = await getDoc(employeeTaskDocRef);

          const existingTasks: Task[] = docSnap.exists()
            ? Array.isArray(docSnap.data().tasks)
              ? docSnap.data().tasks
              : []
            : [];

          // SAFETY CHECK
          const alreadyExists = existingTasks.some(
            (t) =>
              t.deliverableId === selectedDeliverable.id &&
              t.projectId === selectedDeliverableProjectId
          );

          if (alreadyExists) continue;

          const newTask: Task = {
            type: "deliverable",
            deliverableId: selectedDeliverable.id,
            name: selectedDeliverable.name,
            projectId: selectedDeliverableProjectId,
            employeeId: empId,
            assignedDate: assignedDate,

            deliveryDate: deliveryDate,
            createdAt: new Date().toISOString(),
            taskId: uuidv4(),
            status: "Pending",
          };

          await setDoc(employeeTaskDocRef, { tasks: [...existingTasks, newTask] }, { merge: true });

          await fetch("/api/sendNotifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: empId,
              title: "New Task Assigned",
              body: `${employees.find((e) => e.uId === empId)?.name || "You"
                } have been assigned to: ${selectedDeliverable.name}`,
              deliverableId: selectedDeliverable.id,
              projectId: selectedDeliverableProjectId,
            }),
          });
        }

        toast.success("New employees assigned successfully");
      }

      setSaving(false);
      setAssignModalOpen(false);
    } catch (err) {
      toast.error("Failed to assign employees or create task");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => getDeliverableColumns(handleEdit, handleAssignEmployee, employeeMap),
    [handleEdit, handleAssignEmployee, employeeMap]
  );

  const table = useReactTable({
    data: allDeliverables,
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
    const dateColumn = table.getColumn("projectDate");
    if (dateColumn) {
      dateColumn.setFilterValue(startDate || endDate ? { startDate, endDate } : undefined);
    }
  }, [startDate, endDate, table]);

  // Employee options for MultiSelect
  const employeeOptions: Option[] = employees
    .filter((emp) => emp.profileStatus !== "Inactive")
    .map((emp) => ({ value: emp.uId, label: emp.name }));

  return (
    <div className="w-full p-4">
      <h1 className="text-3xl font-bold mb-6">All Project Deliverables</h1>
      {isLoading ? (
        <TableSkeleton columnCount={4} rowCount={5} />
      ) : (
        <>
          <TableActions
            table={table}
            data={allDeliverables}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            resetDateFilter={() => {
              setStartDate("");
              setEndDate("");
            }}
            searchParam="projectName"
            searchPlaceholder="Filter by Project..."
            employeeParam="name"
            employeeParamPlaceholder="Filter by Task..."
            dateColumn="projectDate"
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Employee(s) to Deliverable</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <MultiSelect
              options={employeeOptions}
              selected={selectedEmployeeIds}
              onChange={setSelectedEmployeeIds}
              placeholder="Select employees..."
            />
            <div>
              <label className="block mb-1 font-medium">Assigned Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 w-full"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Delivery Task Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 w-full"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
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
    </div>
  );
}

export default ProjectDeliverables;
