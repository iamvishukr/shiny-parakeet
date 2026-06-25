"use client";

import React, { useMemo, useState, useCallback } from "react";
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
  ColumnDef,
} from "@tanstack/react-table";
import { getProjectColumns } from "./columns";
import ViewProjectModal from "./ViewProjectModal";
import { GenericTable } from "@/components/shared/GenericTable";
import { useProjectsView } from "../../../hooks/useProjectsView";
import { ProjectsTable } from "./components/ProjectsTable";
import { useRouter } from "next/navigation";
import { Project, roleColumnVisibilityMap } from "./types";
import { useAuth } from "@/context/AuthProvider";

export default function ProjectsView() {
  const router = useRouter();
  const {
    isLoading,
    data,
    viewOpen,
    selectedProject,
    handleView,
    handleViewClose,
    handleBulkDelete,
  } = useProjectsView();
  const { role } = useAuth();

  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    data.forEach((p) => {
      const status = p.status?.toLowerCase();
      if (status === "completed") {
        completed++;
      } else if (status === "pending" || status === "resumed" || status === "ongoing") {
        pending++; // Or just pending based on the previous counts setup
      }
    });

    // In previous useProjectCounts logic: pending included pending & resumed.
    // However, the card says "Pending & Ongoing Projects", so let's count them easily.
    const pendingOngoing = data.filter(
      (p) => ["pending", "resumed", "ongoing"].includes(p.status?.toLowerCase() || "")
    ).length;

    return {
      pending: pendingOngoing,
      completed,
      total: data.length,
    };
  }, [data]);

  // Edit handler: redirect to add page with ?edit=projectId
  const handleEdit = useCallback(
    (project: Project) => {
      router.push(`/projects/add?edit=${project.projectId}`);
    },
    [router]
  );

  // REMOVED: Default 1-month date range setup
  // Initialize with empty column filters
  const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: "dates" }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]); // Empty initial filters
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    select: true,
    price: false,
    extraExpenses: false,
    discount: false,
    finalAmount: false,
    createdAt: false,
    dueAmount: false,
  });
  const [rowSelection, setRowSelection] = useState({});

  const getColKey = (col: ColumnDef<Project>) => (col as Project).accessorKey ?? col.id ?? null;

  const columns = useMemo(() => {
    const allColumns = getProjectColumns(handleEdit, handleView, role ?? "manager");
    const allowed = roleColumnVisibilityMap[role?.toLowerCase() ?? "manager"] || [];

    return allColumns.filter((col) => {
      const key = getColKey(col);
      return key && allowed.includes(key);
    });
  }, [handleEdit, handleView, role]);

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

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <p>Loading summary...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Ongoing Projects</h3>
            <p className="text-2xl font-bold text-yellow-600">{counts.ongoing}</p>
          </div> */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Pending & Ongoing Projects</h3>
            <p className="text-2xl font-bold text-red-600">{counts.pending}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Completed Projects</h3>
            <p
              className={`text-2xl font-bold ${
                counts.completed > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {counts.completed}
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Records</h3>
            <p className="text-2xl font-bold">{counts.total}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton columnCount={16} rowCount={5} />
      ) : (
        <>
          <ProjectsTable
            table={table}
            data={data}
            onEdit={handleEdit}
            onView={handleView}
            onBulkDelete={handleBulkDelete}
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}

      <ViewProjectModal
        project={selectedProject}
        open={viewOpen}
        onOpenChange={handleViewClose}
        isAdmin={role === "admin"}
      />
    </div>
  );
}
