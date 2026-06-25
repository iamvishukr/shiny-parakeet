import { ColumnDef } from "@tanstack/react-table";
import { Shoot } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import SortButton from "@/components/shared/sortButton";
import { format } from "date-fns";

export function getShootColumns(onEdit: (shoot: Shoot) => void): ColumnDef<Shoot>[] {
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
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: "traditionalPhotographer",
      header: "Traditional Photographer",
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: "traditionalVideographer",
      header: "Traditional Videographer",
      cell: (info) => info.getValue(),
    },
    { 
      accessorKey: "candid", 
      header: "Candid", 
      cell: (info) => info.getValue() 
    },
    { 
      accessorKey: "cinemetographer", 
      header: "Cinematographer", 
      cell: (info) => info.getValue() 
    },
    { 
      accessorKey: "assistant", 
      header: "Assistant", 
      cell: (info) => info.getValue() 
    },
    { 
      accessorKey: "drone", 
      header: "Drone", 
      cell: (info) => info.getValue() 
    },
    { 
      accessorKey: "other", 
      header: "Other", 
      cell: (info) => info.getValue() 
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ row }) => {
              const d = row.original.createdAt;
              return <div>{d ? format(d, "dd/MM/yyyy HH:mm") : "-"}</div>;
            },
      // Add filter function for date range filtering
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        
        const { startDate, endDate } = filterValue;
        const cellValue = row.getValue(columnId) as Date;
        
        if (!cellValue) return false;
        
        const eventDate = cellValue;
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
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
          Edit
        </Button>
      ),
    },
  ];
}