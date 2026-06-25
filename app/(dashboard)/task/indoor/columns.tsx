import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import SortButton from "@/components/shared/sortButton";

export type RawTask = Record<string, string>;

export interface Task {
  id: string;
  raw: RawTask;
  name: string;
  employeeId: string;
  employeeName: string;
  deliveryDate?: string;
  assignedDate: string;
  createdAt: Date;
  status: string;
  projectId: string;
  shootId?: string;
  role?: string;
  projectDate?: string;
}

export function getTaskColumns(onUpdate: (task: Task) => void): ColumnDef<Task>[] {
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
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "slno",
      header: "Sl No",
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        const rows = table.getRowModel().rows;
        const index = rows.findIndex((r) => r.id === row.id);
        return pageIndex * pageSize + index + 1;
      },
    },

    {
      accessorKey: "name",
      header: "Task Name",
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => <div>{row.getValue("employeeName")}</div>,
    },
    {
      accessorKey: "assignedDate",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Assigned Date"
        />
      ),
      cell: ({ row }) => {
        const d = row.original.assignedDate;
        return <div>{d ? format(d, "dd/MM/yyyy") : "-"}</div>;
      },
    },
    {
      accessorKey: "deliveryDate",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Delivey Date"
        />
      ),
      cell: ({ row }) => {
        const d = row.original.deliveryDate;
        return <div>{d ? format(d, "dd/MM/yyyy") : "-"}</div>;
      },
    },
    {
      accessorKey: "projectDate",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Project Date"
        />
      ),
      cell: ({ row }) => {
        const d = row.original.projectDate;
        if (!d) return <div>-</div>;
        try {
          // Parse as local date to avoid timezone shift
          const datePart = d.substring(0, 10); // "YYYY-MM-DD"
          return <div>{format(new Date(datePart + "T00:00:00"), "dd/MM/yyyy")}</div>;
        } catch {
          return <div>{d}</div>;
        }
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const { startDate, endDate } = filterValue;
        const cellValue = row.getValue(columnId) as string;

        if (!cellValue) return false;

        const eventDate = new Date(cellValue);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && eventDate < start) return false;
        if (end && eventDate > end) return false;

        return true;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ row }) => {
        const d = row.original.createdAt;
        return <div>{d ? format(d, "yyyy-MM-dd HH:mm") : "-"}</div>;
      },
    },
    {
      accessorKey: "statusNote",
      header: "Live Status",
      cell: ({ row }) => row.original.raw.statusNote ?? "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const classes: Record<string, string> = {
          Pending: "text-yellow-600",
          Ongoing: "text-blue-600",
          Completed: "text-green-600",
          Cancelled: "text-red-600",
          Postponed: "text-purple-600",
        };
        return <span className={classes[status] || ""}>{status}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onUpdate(row.original)}>Update</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
