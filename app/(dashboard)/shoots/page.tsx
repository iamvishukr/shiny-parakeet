"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { getShootColumns } from "./columns";
import AddShootModal from "./AddShootModal";
import { Shoot } from "./types";
import { collection, deleteDoc, doc, onSnapshot, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { GenericTable } from "@/components/shared/GenericTable";
import { menuContent } from "@/components/shared/TableMenuContent";
import { toast } from "sonner";

export default function Shoots() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Shoot[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ createdAt: false });
  const [rowSelection, setRowSelection] = useState({});
  const [open, setOpen] = useState(false);
  const [selectedShoot, setSelectedShoot] = useState<Shoot | null>(null);
  // const [startDate, setStartDate] = useState("");
  // const [endDate, setEndDate] = useState("");

  const handleEdit = useCallback((shoot: Shoot) => {
    setSelectedShoot(shoot);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedShoot(null);
    setOpen(false);
  }, []);

  const columns = useMemo(() => getShootColumns(handleEdit), [handleEdit]);

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

  // // Apply date filter to table when dates change
  // useEffect(() => {
  //   const dateColumn = table.getColumn("createdAt");
  //   if (dateColumn) {
  //     dateColumn.setFilterValue(
  //       startDate || endDate ? { startDate, endDate } : undefined
  //     );
  //   }
  // }, [startDate, endDate, table]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "shoots"), (snapshot) => {
      const result: Shoot[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        // Convert Firestore Timestamp to Date object
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

        // Create Shoot object with all required properties
        const shoot: Shoot = {
          shootId: doc.id,
          name: data.name || "",
          traditionalPhotographer: data.traditionalPhotographer || "",
          traditionalVideographer: data.traditionalVideographer || "",
          candid: data.candid || "",
          cinemetographer: data.cinemetographer || "",
          assistant: data.assistant || "",
          other: data.other || "",
          drone: data.drone || "", // Add the missing drone property
          createdAt: createdAt,
        };

        return shoot;
      });
      setData(result);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBulkDelete = async (shoots: Shoot[]) => {
    try {
      const deletePromises = shoots.map((shoot) =>
        deleteDoc(doc(firestore, "shoots", shoot.shootId))
      );
      await Promise.all(deletePromises);
      setRowSelection({});
      toast.success("Selected shoots deleted successfully.");
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete selected shoots.");
    }
  };

  return (
    <div className="w-full">
      {isLoading ? (
        <TableSkeleton columnCount={6} rowCount={5} />
      ) : (
        <>
          <TableActions
            table={table}
            data={data}
            menuContent={menuContent({
              selectedRows: table.getSelectedRowModel().rows.map((row) => row.original),
              actions: [
                {
                  label: "Delete Selected",
                  onClick: handleBulkDelete,
                  className: "text-red-600",
                },
              ],
            })}
            onOpenChange={setOpen}
            searchPlaceholder="Filter shoots..."
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}
      <AddShootModal shoot={selectedShoot} open={open} onOpenChange={handleClose} />
    </div>
  );
}
