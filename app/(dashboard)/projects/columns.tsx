import { ColumnDef } from "@tanstack/react-table";
import { Project } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import SortButton from "@/components/shared/sortButton";

export function getProjectColumns(
  onEdit: (project: Project) => void,
  onView: (project: Project) => void,
  role: string,
): ColumnDef<Project>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "",
      header: "Sl No",
      cell: (info) => info.row.index + 1,
      enableSorting: false,
    },
    {
      accessorKey: "clientName",
      header: "Client Name",
      cell: (info) => info.getValue(),
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "projectName",
      header: "Project Name",
      cell: (info) => info.getValue(),
      enableColumnFilter: true,
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "eventName",
      header: "Project Type",
      cell: (info) => info.getValue(),
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "dates",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Date"
        />
      ),
      cell: (info) => {
        const value = info.getValue();

        if (!value) return "-";

        let date: Date | null = null;

        if (value instanceof Timestamp) {
          date = value.toDate();
        } else if (typeof value === "string") {
          const onlyDate = value.split("T")[0];
          date = new Date(onlyDate + "T00:00:00");
        }

        return date ? format(date, "dd/MM/yyyy") : "-";
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue?.startDate || !filterValue?.endDate) return true;

        const rowValue = row.getValue(columnId);
        if (!rowValue) return false;

        let rowDate: Date;

        if (rowValue instanceof Timestamp) {
          rowDate = rowValue.toDate();
        } else if (typeof rowValue === "string" || typeof rowValue === "number") {
          rowDate = new Date(rowValue);
        } else {
          rowDate = new Date();
        }

        const start = new Date(filterValue.startDate);
        const end = new Date(filterValue.endDate);

        // Normalize time
        rowDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return rowDate >= start && rowDate <= end;
      },
      enableSorting: true,
    },
    {
      accessorKey: "venues",
      header: "Venue",
      cell: (info) => info.getValue(),
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: (info) => {
        const value = info.getValue();
        return `₹${Number(value || 0).toLocaleString("en-IN")}`;
      },
      enableHiding: true,
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "discount",
      header: "Discount",
      cell: (info) => {
        const value = info.getValue();
        return `₹${Number(value || 0).toLocaleString("en-IN")}`;
      },
      enableHiding: true,
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "finalAmount",
      header: "Final Amount",
      cell: (info) => {
        const value = info.getValue();
        return `₹${Number(value || 0).toLocaleString("en-IN")}`;
      },
      enableHiding: true,
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      id: "dueAmount",
      header: "Due Amount",
      cell: ({ row }) => {
        const project = row.original;

        const finalAmount = Number(project.finalAmount || 0);
        let totalPaid = 0;

        if (project.transactionHistory && Array.isArray(project.transactionHistory)) {
          project.transactionHistory.forEach((transaction) => {
            if (transaction && transaction.type === "credit" && transaction.amount) {
              totalPaid += Number(transaction.amount || 0);
            }
          });
        }

        const dueAmount = finalAmount - totalPaid;
        let textColor = "text-green-600 font-semibold";
        if (dueAmount > 0) {
          textColor = "text-red-600 font-semibold";
        } else if (dueAmount < 0) {
          textColor = "text-blue-600 font-semibold";
        }

        const formattedAmount = `₹${Math.abs(dueAmount).toLocaleString("en-IN")}`;

        if (dueAmount < 0) {
          return <span className={textColor}>-{formattedAmount} (Over)</span>;
        }

        return <span className={textColor}>{formattedAmount}</span>;
      },
      enableHiding: true,
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue<string | undefined>() || "";

        let bg = "bg-gray-200 text-gray-800";
        if (status === "pending") bg = "bg-blue-500 text-white";
        if (status === "ongoing") bg = "bg-yellow-400 text-black";
        if (status === "completed") bg = "bg-green-500 text-white";

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bg}`}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "N/A"}
          </span>
        );
      },
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: (info) => {
        const value = info.getValue();
        if (!value) return "-";
        return format(new Date(value as Date), "yyyy-MM-dd HH:mm");
      },
      enableHiding: true,
      enableSorting: true,
      sortingFn: "datetime",
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
            <DropdownMenuItem onClick={() => onView(row.original)}>View</DropdownMenuItem>
            {role.toLowerCase() === "admin" && (
              <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];
}
