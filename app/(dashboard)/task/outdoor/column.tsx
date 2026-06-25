import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { convertTo12Hour } from "@/lib/utils";

export type RawTask = Record<string, string>;

export interface Task {
  id: string;
  raw: RawTask;
  name: string;
  employeeId: string;
  employeeName: string;
  deliveryDate?: Date;
  eventTime?: string;
  description?: string;
  assignedDate: Date;
  createdAt: Date; // Add this field
  status: string;
  projectId?: string;
  shootId?: string;
  role?: string;
}

export function getTaskColumns(): ColumnDef<Task>[] {
  return [
    {
      accessorKey: "Sl No",
      header: "Sl No",
      cell: (info) => info.row.index + 1,
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
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <div>{row.getValue("role")}</div>,
    },
    {
      accessorKey: "assignedDate",
      header: "Assigned Date",
      cell: ({ row }) => {
        const d = row.original.assignedDate;
        return <div>{d ? format(d, "dd/MM/yyyy") : "-"}</div>;
      },
    },
    {
      accessorKey: "deliveryDate",
      header: "Event Date",
      cell: ({ row }) => {
        const d = row.original.deliveryDate;
        return <div>{d ? format(d, "dd/MM/yyyy") : "-"}</div>;
      },
    },
    {
      accessorKey: "eventTime",
      header: "Event Time",
      cell: ({ row }) => <div>{convertTo12Hour(row.getValue("eventTime"))}</div>,
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ row }) => {
        const d = row.original.createdAt;
        return <div>{d ? format(d, "yyyy-MM-dd HH:mm") : "-"}</div>;
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
  ];
}
