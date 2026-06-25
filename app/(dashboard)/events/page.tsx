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
import { getEventColumns } from "./columns";
import AddEventModal from "./AddEventModal";
import { Event } from "./types";
import { collection, deleteDoc, doc, onSnapshot, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { GenericTable } from "@/components/shared/GenericTable";
import { menuContent } from "@/components/shared/TableMenuContent";
import { toast } from "sonner";

export default function Events() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Event[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ createdAt: false });
  const [rowSelection, setRowSelection] = useState({});
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  // const [startDate, setStartDate] = useState("");
  // const [endDate, setEndDate] = useState("");

  const handleEdit = useCallback((event: Event) => {
    setSelectedEvent(event);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedEvent(null);
    setOpen(false);
  }, []);

  const columns = useMemo(() => getEventColumns(handleEdit), [handleEdit]);

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

  // Apply date filter to table when dates change
  // useEffect(() => {
  //   const dateColumn = table.getColumn("createdAt");
  //   if (dateColumn) {
  //     dateColumn.setFilterValue(startDate || endDate ? { startDate, endDate } : undefined);
  //   }
  // }, [startDate, endDate, table]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "events"), (snapshot) => {
      const result: Event[] = snapshot.docs.map((doc) => {
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

        return {
          eventId: doc.id,
          name: data.name,
          createdAt,
        };
      });
      setData(result);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBulkDelete = async (events: Event[]) => {
    try {
      const deletePromises = events.map((event) =>
        deleteDoc(doc(firestore, "events", event.eventId))
      );
      await Promise.all(deletePromises);
      setRowSelection({});
      toast.success("Selected events deleted successfully.");
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete selected events.");
    }
  };

  return (
    <div className="w-full">
      {isLoading ? (
        <TableSkeleton columnCount={3} rowCount={5} />
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
            searchPlaceholder="Filter Events..."
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}
      <AddEventModal event={selectedEvent} open={open} onOpenChange={handleClose} />
    </div>
  );
}
