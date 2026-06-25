import { ColumnDef } from "@tanstack/react-table";
import SortButton from "@/components/shared/sortButton";
import { Client } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

// Type guard for Firestore Timestamp
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

const isFirestoreTimestamp = (value: unknown): value is FirestoreTimestamp => {
  return (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as FirestoreTimestamp).seconds === "number"
  );
};

// Type guard for object with toDate method
const hasToDateMethod = (value: unknown): value is { toDate: () => Date } => {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  );
};

// Helper function to parse DD/MM/YYYY format
const parseDDMMYYYY = (dateString: string): Date | null => {
  if (!dateString) return null;

  try {
    const parts = dateString.split("/");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JavaScript
    const year = parseInt(parts[2], 10);

    // Validate date components
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 0 || month > 11) return null;
    if (year < 1000) return null;

    const date = new Date(year, month, day);

    // Check if the date is valid
    if (isNaN(date.getTime())) return null;

    // Additional validation to catch invalid dates like 31/02/2023
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }

    return date;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
};

// Helper function to safely format dates
const formatDate = (dateValue: unknown): string => {
  if (!dateValue) return "-";

  try {
    // If it's already a string in DD/MM/YYYY format
    if (typeof dateValue === "string") {
      // Check if it matches DD/MM/YYYY format
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
        const date = parseDDMMYYYY(dateValue);
        return date ? date.toLocaleDateString() : dateValue; // Return original if parsing fails
      }

      // Try standard Date parsing for other formats
      const date = new Date(dateValue);
      return !isNaN(date.getTime()) ? date.toLocaleDateString() : dateValue;
    }

    // If it's an object with toDate method (Firestore Timestamp)
    if (hasToDateMethod(dateValue)) {
      try {
        const date = dateValue.toDate();
        return !isNaN(date.getTime()) ? date.toLocaleDateString() : "-";
      } catch (error) {
        console.error("Error calling toDate:", error);
        return "-";
      }
    }

    // If it's a Firestore Timestamp with seconds
    if (isFirestoreTimestamp(dateValue)) {
      const date = new Date(dateValue.seconds * 1000);
      return !isNaN(date.getTime()) ? date.toLocaleDateString() : "-";
    }

    return String(dateValue);
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(dateValue);
  }
};

// Helper function for date validation
const isValidDate = (dateValue: unknown): boolean => {
  if (!dateValue) return false;

  try {
    if (typeof dateValue === "string") {
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
        return parseDDMMYYYY(dateValue) !== null;
      }
      return !isNaN(new Date(dateValue).getTime());
    }

    if (hasToDateMethod(dateValue)) {
      try {
        return !isNaN(dateValue.toDate().getTime());
      } catch (error) {
        console.error("Error calling toDate:", error);
        return false;
      }
    }

    if (isFirestoreTimestamp(dateValue)) {
      return !isNaN(new Date(dateValue.seconds * 1000).getTime());
    }

    return false;
  } catch (error) {
    console.error("Error validating date:", error);
    return false;
  }
};

// Helper function to convert date value to Date object for comparison
const toDateObject = (dateValue: unknown): Date | null => {
  if (!dateValue) return null;

  try {
    if (typeof dateValue === "string") {
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
        return parseDDMMYYYY(dateValue);
      }
      const date = new Date(dateValue);
      return !isNaN(date.getTime()) ? date : null;
    }

    if (hasToDateMethod(dateValue)) {
      try {
        const date = dateValue.toDate();
        return !isNaN(date.getTime()) ? date : null;
      } catch (error) {
        console.error("Error calling toDate:", error);
        return null;
      }
    }

    if (isFirestoreTimestamp(dateValue)) {
      const date = new Date(dateValue.seconds * 1000);
      return !isNaN(date.getTime()) ? date : null;
    }

    return null;
  } catch (error) {
    console.error("Error converting date:", error);
    return null;
  }
};

export function getClientColumns(
  onEdit: (client: Client) => void,
  onCreate: (clientId: string) => void
): ColumnDef<Client>[] {
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
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "clientId",
      header: () => <Button variant="ghost">Client ID</Button>,
      cell: ({ row }) => <div>{row.getValue("clientId")}</div>,
    },
    {
      accessorKey: "slNO",
      header: "Sl No",
      cell: ({ row }) => <div>{row.index + 1}</div>,
      enableHiding: true,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
        />
      ),
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "phoneNo",
      header: "Phone No",
      cell: ({ row }) => <div>{row.getValue("phoneNo")}</div>,
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => <div>{row.getValue("address")}</div>,
    },
    {
      accessorKey: "projectType",
      header: "Project Type",
      cell: ({ row }) => <div>{row.getValue("projectType")}</div>,
    },
    {
      accessorKey: "venue",
      header: "Venue",
      cell: ({ row }) => <div>{row.getValue("venue")}</div>,
    },
    {
      accessorKey: "dateOfEvent",
      header: "Date Of Event",
      cell: ({ row }) => {
        const dateValue = row.getValue("dateOfEvent");
        return <div>{formatDate(dateValue)}</div>;
      },
      // Add sorting for date column
      sortingFn: (rowA, rowB, columnId) => {
        const dateA = toDateObject(rowA.getValue(columnId));
        const dateB = toDateObject(rowB.getValue(columnId));

        if (!dateA && !dateB) return 0;
        if (!dateA) return -1;
        if (!dateB) return 1;

        return dateA.getTime() - dateB.getTime();
      },
      // Add filter function for date range filtering
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const { startDate, endDate } = filterValue;
        const cellValue = row.getValue(columnId);

        if (!isValidDate(cellValue)) return false;

        const eventDate = toDateObject(cellValue);
        if (!eventDate) return false;

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Set time to beginning of day for start date and end of day for end date
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && eventDate < start) return false;
        if (end && eventDate > end) return false;

        return true;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const client = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(client)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreate(client.clientId)}>
                Create Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
