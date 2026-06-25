"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { getPackageColumns } from "./columns";
import { Package } from "./types";
import { Event } from "../events/types";
import AddPackageModal from "./AddPackageModal";
import ViewPackageModal from "./ViewPackageModal";
import { GenericTable } from "@/components/shared/GenericTable";
import TableActions from "@/components/shared/TableActions";
import TableSkeleton from "@/components/shared/skeletons/TableSkeleton";
import Pagination from "@/components/shared/Pagination";
import { v4 as uuidv4 } from "uuid";
import { menuContent } from "@/components/shared/TableMenuContent";
import { toast } from "sonner";

function PackagesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<Package[]>([]);
  const [events, setEvents] = useState<Record<string, Event>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Package | null>(null);
  const [viewPackage, setViewPackage] = useState<Package | null>(null);
  // COMMENTED OUT: Date range filter state
  // const [startDate, setStartDate] = useState("");
  // const [endDate, setEndDate] = useState("");

  // Event handlers - moved to top
  const handleSave = useCallback(async (pkg: Package) => {
    try {
      const id = pkg.id || `PKG-${uuidv4().slice(0, 4).toUpperCase()}`;
      const isNewPackage = !pkg.id;

      const packageData = {
        ...pkg,
        id,
        createdAt: isNewPackage ? new Date() : pkg.createdAt,
      };

      await setDoc(doc(firestore, "packages", id), packageData, { merge: true });
      toast.success(pkg.id ? "Package updated successfully" : "Package created successfully");
      setOpen(false);
      setSelected(null);
    } catch (error) {
      console.error("Error saving package:", error);
      toast.error("Failed to save package");
    }
  }, []);

  const handleEdit = useCallback((pkg: Package) => {
    setSelected(pkg);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSelected(null);
  }, []);

  const handleView = useCallback((pkg: Package) => {
    setViewPackage(pkg);
    setViewOpen(true);
  }, []);

  const handleViewClose = useCallback(() => {
    setViewOpen(false);
    setViewPackage(null);
  }, []);

  const handleBulkDelete = useCallback(async (selectedPackages: Package[]) => {
    try {
      console.log("Starting bulk delete for packages:", selectedPackages);

      if (selectedPackages.length === 0) {
        toast.error("No packages selected for deletion");
        return;
      }

      // Validate all packages have IDs
      const invalidPackages = selectedPackages.filter((pkg) => !pkg.id);
      if (invalidPackages.length > 0) {
        console.error("Packages missing IDs:", invalidPackages);
        toast.error(`${invalidPackages.length} package(s) missing IDs`);
        return;
      }

      const deletePromises = selectedPackages.map((pkg) => {
        console.log(`Deleting package: ${pkg.id} - ${pkg.name}`);
        return deleteDoc(doc(firestore, "packages", pkg.id!));
      });

      await Promise.all(deletePromises);
      console.log("Bulk delete completed successfully");

      setRowSelection({});
      toast.success(`Successfully deleted ${selectedPackages.length} package(s)`);
    } catch (error: unknown) {
      console.error("Bulk delete failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to delete packages: ${errorMessage}`);
    }
  }, []);

  // Load events
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "events"), (snapshot) => {
      const eventsData = snapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { ...doc.data(), eventId: doc.id } as Event;
        return acc;
      }, {} as Record<string, Event>);
      setEvents(eventsData);
    });
    return () => unsubscribe();
  }, []);

  // Load packages
  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "packages"), (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();

        // Convert createdAt to a consistent format
        let createdAt: string | Date = docData.createdAt;

        // If it's a Firestore Timestamp, convert to string
        if (docData.createdAt && typeof docData.createdAt === "object") {
          if ("toDate" in docData.createdAt) {
            createdAt = docData.createdAt.toDate().toString();
          } else if ("seconds" in docData.createdAt) {
            createdAt = new Date(docData.createdAt.seconds * 1000).toString();
          }
        }

        return {
          id: doc.id,
          name: docData.name || "",
          price: docData.price || 0,
          eventId: docData.eventId || "",
          shoots: docData.shoots || [],
          deliverables: docData.deliverables || [],
          createdAt: createdAt,
        } as Package;
      });
      setPackages(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Combine packages with event names
  const packagesWithEventNames = useMemo(() => {
    return packages.map((pkg) => ({
      ...pkg,
      eventName: events[pkg.eventId]?.name || "Loading...",
    }));
  }, [packages, events]);

  // Table columns - now can safely use handleEdit and handleView
  const columns = useMemo(
    () => getPackageColumns(handleEdit, handleView),
    [handleEdit, handleView]
  );

  // Table instance
  const table = useReactTable({
    data: packagesWithEventNames,
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

  // Selected rows - get the actual selected rows from the table
  const selectedRows = useMemo(() => {
    const selectedRowIds = Object.keys(rowSelection);
    return table
      .getRowModel()
      .rows.filter((row) => selectedRowIds.includes(row.id))
      .map((row) => row.original);
  }, [rowSelection, table]);

  // Debug selected rows
  useEffect(() => {
    console.log("Selected rows:", selectedRows);
    console.log("Row selection state:", rowSelection);
    console.log("Selected row IDs:", Object.keys(rowSelection));
  }, [selectedRows, rowSelection]);

  // Create a custom bulk delete handler for the menu
  const handleMenuBulkDelete = useCallback(() => {
    console.log("Menu bulk delete triggered, selected rows:", selectedRows);
    if (selectedRows.length === 0) {
      toast.error("Please select packages to delete");
      return;
    }
    handleBulkDelete(selectedRows);
  }, [selectedRows, handleBulkDelete]);

  // COMMENTED OUT: Apply date filter to table when dates change
  // useEffect(() => {
  //   const dateColumn = table.getColumn("createdAt");
  //   if (dateColumn) {
  //     dateColumn.setFilterValue(
  //       startDate || endDate ? { startDate, endDate } : undefined
  //     );
  //   }
  // }, [startDate, endDate, table]);

  return (
    <div className="w-full">
      {isLoading ? (
        <TableSkeleton columnCount={4} rowCount={5} />
      ) : (
        <>
          <TableActions
            table={table}
            data={packages}
            // startDate={startDate}
            // endDate={endDate}
            // setStartDate={setStartDate}
            // setEndDate={setEndDate}
            // resetDateFilter={() => {
            //   setStartDate("");
            //   setEndDate("");
            // }}
            menuContent={menuContent({
              selectedRows,
              actions: [
                {
                  label: `Delete Selected (${selectedRows.length})`,
                  onClick: handleMenuBulkDelete,
                  className: "text-red-600",
                },
              ],
            })}
            onOpenChange={setOpen}
            searchPlaceholder="Filter Events"
            searchParam="eventName"
            // dateColumn="createdAt"
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}
      <AddPackageModal
        initialData={selected}
        open={open}
        onClose={handleClose}
        onSave={handleSave}
      />
      <ViewPackageModal data={viewPackage} open={viewOpen} onClose={handleViewClose} />
    </div>
  );
}

export default PackagesPage;
