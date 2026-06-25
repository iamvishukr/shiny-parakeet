import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import SortButton from "@/components/shared/sortButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { format } from "date-fns";

export interface DeliverableRow {
  id: string;
  name: string;
  qty: string;
  projectName: string;
  assignedEmployees?: string[];
  createdAt?: string;
  completeDate?: string;
  deliveryDate: string;
  _projectId?: string;
  assignedDate: string;
  projectDate?: string;
}

export interface Employee {
  uId: string;
  empId: string;
  name: string;
  email: string;
  phone: string;
  gender: "Male" | "Female" | "Other" | "";
  address: string;
  salary: string;
  paidSalary: number;
  profileStatus: string;
  userType: string;
  createdAt: string;
}

export function getDeliverableColumns(
  onEdit: (deliverable: DeliverableRow) => void,
  onAssignEmployee: (deliverable: DeliverableRow) => void,
  employeeMap: Record<string, string>
): ColumnDef<DeliverableRow>[] {
  return [
    {
      accessorKey: "Sl No",
      header: "Sl No",
      cell: (info) => info.row.index + 1,
    },
    {
      accessorKey: "projectName",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Project Name"
        />
      ),
      cell: ({ row }) => <div>{row.getValue("projectName")}</div>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Task"
        />
      ),
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "qty",
      header: "Quantity",
      cell: ({ row }) => <div>{row.getValue("qty")}</div>,
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
        const d = row.getValue("projectDate") as string;
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
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Task Creation Date"
        />
      ),
      cell: ({ row }) => (
        <div>
          {row.getValue("createdAt") ? new Date(row.getValue("createdAt")).toLocaleString() : "-"}
        </div>
      ),
    },
    {
      accessorKey: "assignedEmployees",
      header: "Assigned Persons",
      cell: ({ row }) => {
        const ids = row.getValue("assignedEmployees") || [];
        if (!Array.isArray(ids) || ids.length === 0) return "-";
        return ids.map((id) => employeeMap[id] || id).join(", ");
      },
    },
    {
      id: "assignedDateFetched",
      header: "Assigned Date",
      cell: ({ row }) => {
        const deliverable = row.original;
        if (
          !Array.isArray(deliverable.assignedEmployees) ||
          deliverable.assignedEmployees.length === 0
        )
          return "-";
        return (
          <div>
            {deliverable.assignedDate ? format(deliverable.assignedDate, "dd/MM/yyyy") : "-"}
          </div>
        );
      },
    },
    {
      id: "completeDateFetched",
      header: "Task Completion Date",
      cell: ({ row }) => {
        const deliverable = row.original;
        if (
          !Array.isArray(deliverable.assignedEmployees) ||
          deliverable.assignedEmployees.length === 0
        )
          return "-";
        return (
          <div>
            {deliverable.deliveryDate ? format(deliverable.deliveryDate, "dd/MM/yyyy") : "-"}
          </div>
        );
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
              <DropdownMenuItem onClick={() => onAssignEmployee(deliverable)}>
                Assign Employee
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
