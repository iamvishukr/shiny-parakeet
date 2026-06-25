import { ColumnDef } from "@tanstack/react-table";
import SortButton from "@/components/shared/sortButton";
import { Deliverable } from "./types";
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
import { format } from "date-fns";

// Helper function to parse the custom date format
const parseCustomDateFormat = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    // Handle format: "October 6, 2025 at 5:42:09 PM UTC+5:30"
    // Remove the "at" and timezone parts for simpler parsing
    const cleanedDateString = dateString
      .replace(' at ', ' ')
      .replace(/ UTC[+-]\d+:\d+$/, '') // Remove timezone
      .replace(/ ([AP]M)$/, ' $1'); // Replace special space before AM/PM with regular space
    
    const date = new Date(cleanedDateString);
    return !isNaN(date.getTime()) ? date : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

export function getDeliverableColumns(
  onEdit: (deliverable: Deliverable) => void
): ColumnDef<Deliverable>[] {
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
      accessorKey: "Sl No",
      header: "Sl No",
      cell: (info) => info.row.index + 1,
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
    // {
    //   accessorKey: "description",
    //   header: "Description",
    //   cell: ({ row }) => {
    //     const desc = row.getValue("description") as string;
    //     return (
    //       <div className="max-w-xs truncate" title={desc}>
    //         {desc}
    //       </div>
    //     );
    //   },
    // },
    {
      accessorKey: "createdAt",
      header: "Created At",
     cell: ({ row }) => {
              const d = row.original.createdAt;
              return <div>{d ? format(d, "dd/MM/yyyy HH:mm") : "-"}</div>;
            },
      // Add filter function for date range filtering
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        
        const { startDate, endDate } = filterValue;
        const cellValue = row.getValue(columnId);
        
        if (!cellValue) return false;
        
        let eventDate: Date | null = null;
        
        // Handle different date formats
        if (typeof cellValue === "object" && cellValue !== null && "seconds" in cellValue) {
          // Firestore Timestamp
          eventDate = new Date((cellValue as { seconds: number }).seconds * 1000);
        } else if (typeof cellValue === "string") {
          // Custom date string format
          eventDate = parseCustomDateFormat(cellValue);
        } else if (cellValue instanceof Date) {
          // Date object
          eventDate = cellValue;
        }
        
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
        const deliverable = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(deliverable)}>
                Edit
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