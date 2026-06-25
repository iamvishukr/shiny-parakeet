"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  getExpandedRowModel,
} from "@tanstack/react-table";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import TableActions from "@/components/shared/TableActions";
import { useProjectsView } from "@/hooks/useProjectsView";
import { useAuth } from "@/context/AuthProvider";

export default function ProjectShootsPage() {
  const { role, user } = useAuth();
  const { isLoading, data } = useProjectsView();
  const [employees, setEmployees] = useState<{ uId: string; name: string }[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch employees
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "users"), (snapshot) => {
      const result: { uId: string; name: string }[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uId: data.uId ?? doc.id,
          name: data.name ?? "",
        };
      });
      setEmployees(result);
    });
    return () => unsubscribe();
  }, []);

  const hasAssignedEmployees = (assignedEmployees: unknown) => {
    if (!assignedEmployees || typeof assignedEmployees !== "object") return false;
    console.log(role, "assignedEmployees");
    if (role?.toLowerCase() === "staff") {
      return Object.values(assignedEmployees).some(
        (employees) => Array.isArray(employees) && employees.includes(user?.uid)
      );
    } else {
      return Object.values(assignedEmployees).some(
        (employees) => Array.isArray(employees) && employees.length > 0
      );
    }
  };

  // Prepare shoots data for table
  const allShoots: ShootRow[] = useMemo(
    () =>
      data.filter((project) => !["Cancelled", "Not Confirmed"].includes(project.status)).flatMap((project) =>
        (Array.isArray(project.shoots) ? project.shoots : [])
          .filter((shoot) =>
            hasAssignedEmployees((shoot as Record<string, unknown>).assignedEmployees)
          )
          .map(
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

  const groupedShoots = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>();

    allShoots.forEach((shoot) => {
      if (!map.has(shoot.projectId)) {
        map.set(shoot.projectId, {
          id: shoot.projectId,
          projectName: shoot.projectName,
          status: shoot.status,
          isProjectRow: true,
          subRows: [],
        });
      }

      map.get(shoot.projectId).subRows.push({
        ...shoot,
        isProjectRow: false,
      });
    });

    return Array.from(map.values());
  }, [allShoots]);

  // Table columns
  const columns = useMemo(() => getShootColumns(employees), [employees]);

  const table = useReactTable({
    data: groupedShoots,
    columns,
    getSubRows: (row) => row.subRows,
    getExpandedRowModel: getExpandedRowModel(),
    filterFromLeafRows: true,

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
            statusFilter={true}
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}
    </div>
  );
}
