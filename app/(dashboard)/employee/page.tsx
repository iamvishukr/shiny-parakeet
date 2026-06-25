"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GenericTable } from "@/components/shared/GenericTable";
import TableActions from "@/components/shared/TableActions";
import Pagination from "@/components/shared/Pagination";
import TableSkeleton from "@/components/shared/skeletons/TableSkeleton";
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
import { getEmployeeColumns } from "./columns";
import AddEmployeeModal from "./AddEmployeeModal";
import { Employee, SalaryHistoryEntry } from "./types";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
// import { menuContent } from "@/components/shared/TableMenuContent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// import { toast } from "sonner";

// 🔹 Popup component
function EmployeePopup({
  open,
  onClose,
  title,
  content,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] w-full max-w-5xl overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">{content}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 🔹 Hook to manage popup state
function useEmployeePopup() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupContent, setPopupContent] = useState<React.ReactNode>(null);

  const openPopup = (title: string, content: React.ReactNode) => {
    setPopupTitle(title);
    setPopupContent(content);
    setPopupOpen(true);
  };

  const popup = (
    <EmployeePopup
      open={popupOpen}
      onClose={() => setPopupOpen(false)}
      title={popupTitle}
      content={popupContent}
    />
  );

  return { openPopup, popup };
}

export default function Employees() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Employee[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    salaryStatus: false,
    salary: false,
    profileStatus: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { openPopup, popup } = useEmployeePopup();

  // Event handlers - moved to top
  const handleEdit = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSelectedEmployee(null);
  }, []);

  // const handleBulkDelete = useCallback(async (employees: Employee[]) => {
  //   try {
  //     console.log("Starting bulk delete for employees:", employees);

  //     if (employees.length === 0) {
  //       toast.error("No employees selected for deletion");
  //       return;
  //     }

  //     // Validate all employees have uId
  //     const invalidEmployees = employees.filter((emp) => !emp.uId);
  //     if (invalidEmployees.length > 0) {
  //       console.error("Employees missing uId:", invalidEmployees);
  //       toast.error(`${invalidEmployees.length} employee(s) missing IDs`);
  //       return;
  //     }

  //     const deletePromises = employees.map((employee) => {
  //       console.log(`Deleting employee: ${employee.uId} - ${employee.name}`);
  //       return deleteDoc(doc(firestore, "users", employee.uId!));
  //     });

  //     await Promise.all(deletePromises);
  //     console.log("Bulk delete completed successfully");

  //     setRowSelection({});
  //     toast.success(`Successfully deleted ${employees.length} employee(s)`);
  //   } catch (error: unknown) {
  //     console.error("Bulk delete failed:", error);
  //     const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
  //     toast.error(`Failed to delete employees: ${errorMessage}`);
  //   }
  // }, []);

  // Load data
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "users"), async (snapshot) => {
      const result: Employee[] = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const userId = doc.id;

          // Fetch salaryHistory subcollection
          const salarySnap = await getDocs(collection(firestore, "users", userId, "salaryHistory"));

          const salaryHistory: Record<string, SalaryHistoryEntry> = {};

          salarySnap.forEach((s) => {
            salaryHistory[s.id] = s.data() as SalaryHistoryEntry; // s.id is YYYY-MM
          });

          return {
            employeeId: userId,
            uId: data.uId ?? userId,
            empId: data.empId ?? "",
            name: data.name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            gender: data.gender ?? "",
            dob: data.dob ?? "",
            bloodGroup: data.bloodGroup ?? "",
            address: data.address ?? "",
            salary: data.salary ?? "",
            aadhaar: data.aadhaar ?? "",
            paidSalary: data.paidSalary ?? 0,
            profileStatus: data.profileStatus ?? "Inactive",
            userType: data.userType ?? "employee",
            createdAt: data.createdAt ?? "",
            assignedCompany: data.assignedCompany ?? {},
            salaryHistory, // NEW UPDATED FIELD
            accessLevelMap: data.accessLevelMap ?? {},
            salaryStatus: data.salaryStatus ?? "",
            accessLevel: data.accessLevel ?? "",
            employmentType: data.employmentType ?? "",
            username: data.username ?? "",
            salaryAmountHistory: data.salaryAmountHistory ?? [],
          };
        })
      );

      setData(result);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Table columns
  const columns = useMemo(() => getEmployeeColumns(handleEdit, openPopup), [handleEdit, openPopup]);

  // Table instance
  const table = useReactTable({
    data,
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

  // Selected rows - FIXED: Get selected rows from rowSelection state
  // const selectedRows = useMemo(() => {
  //   const selectedRowIds = Object.keys(rowSelection);
  //   const selected = table
  //     .getRowModel()
  //     .rows.filter((row) => selectedRowIds.includes(row.id))
  //     .map((row) => row.original);
  //   return selected;
  // }, [rowSelection, table]);

  // // Create a custom bulk delete handler for the menu
  // const handleMenuBulkDelete = useCallback(() => {
  //   if (selectedRows.length === 0) {
  //     toast.error("Please select employees to delete");
  //     return;
  //   }
  //   handleBulkDelete(selectedRows);
  // }, [selectedRows, handleBulkDelete]);

  return (
    <div className="w-full">
      {isLoading ? (
        <TableSkeleton columnCount={6} rowCount={5} />
      ) : (
        <>
          <TableActions
            table={table}
            data={data}
            showDateFilter={false}
            onOpenChange={setOpen}
            searchPlaceholder="Filter employees..."
            dateColumn="createdAt"
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}
      <AddEmployeeModal employee={selectedEmployee} open={open} onOpenChange={handleClose} />

      {/* ✅ Render popup globally */}
      {popup}
    </div>
  );
}
