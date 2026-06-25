"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Package } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import SortButton from "@/components/shared/sortButton";

// Helper function to parse the custom date format and handle different data types
// const parseDateValue = (dateValue: unknown): Date | null => {
//   if (!dateValue) return null;

//   try {
//     // If it's already a Date object
//     if (dateValue instanceof Date) {
//       return !isNaN(dateValue.getTime()) ? dateValue : null;
//     }

//     // If it's a string
//     if (typeof dateValue === 'string') {
//       // Handle format: "July 20, 2025 at 11:24:05 PM UTC+5:30"
//       // Remove the "at" and timezone parts for simpler parsing
//       const cleanedDateString = dateValue
//         .replace(' at ', ' ')
//         .replace(/ UTC[+-]\d+:\d+$/, '') // Remove timezone
//         .replace(/ ([AP]M)$/, ' $1'); // Replace special space before AM/PM with regular space

//       const date = new Date(cleanedDateString);
//       return !isNaN(date.getTime()) ? date : null;
//     }

//     // If it's a Firestore Timestamp object
//     if (typeof dateValue === 'object' && dateValue !== null) {
//       // Handle Firestore Timestamp with seconds
//       if ('seconds' in dateValue && typeof dateValue.seconds === 'number') {
//         const date = new Date(dateValue.seconds * 1000);
//         return !isNaN(date.getTime()) ? date : null;
//       }

//       // Handle object with toDate method
//       if ('toDate' in dateValue && typeof dateValue.toDate === 'function') {
//         const date = dateValue.toDate();
//         return !isNaN(date.getTime()) ? date : null;
//       }
//     }

//     return null;
//   } catch (error) {
//     console.error('Error parsing date:', error);
//     return null;
//   }
// };

// Helper function to format date for display
// const formatDateForDisplay = (dateValue: unknown): string => {
//   const date = parseDateValue(dateValue);
//   return date ? date.toLocaleDateString() : '-';
// };

export function getPackageColumns(
  onEdit: (pkg: Package) => void,
  onView: (pkg: Package) => void
): ColumnDef<Package>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "Sl No",
      header: "Sl No",
      cell: (info) => info.row.index + 1,
    },
    {
      accessorKey: "eventName",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Event"
        />
      ),
      cell: ({ row }) => <div>{row.getValue("eventName")}</div>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Package Name"
        />
      ),
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <div>₹ {row.getValue("price")}</div>,
    },
    // {
    //   accessorKey: "createdAt",
    //   header: "Created Date",
    //   cell: ({ row }) => {
    //     const dateValue = row.getValue("createdAt");
    //     return <div>{formatDateForDisplay(dateValue)}</div>;
    //   },
    //   // Add filter function for date range filtering
    //   filterFn: (row, columnId, filterValue) => {
    //     if (!filterValue) return true;

    //     const { startDate, endDate } = filterValue;
    //     const cellValue = row.getValue(columnId);

    //     if (!cellValue) return false;

    //     // Parse the date value
    //     const eventDate = parseDateValue(cellValue);
    //     if (!eventDate) return false;

    //     const start = startDate ? new Date(startDate) : null;
    //     const end = endDate ? new Date(endDate) : null;

    //     // Set time to beginning of day for start date and end of day for end date
    //     if (start) start.setHours(0, 0, 0, 0);
    //     if (end) end.setHours(23, 59, 59, 999);

    //     if (start && eventDate < start) return false;
    //     if (end && eventDate > end) return false;

    //     return true;
    //   },
    // },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const pkg = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onView(pkg)}
                className="text-blue-600 cursor-pointer"
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(pkg)} className="cursor-pointer">
                Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
