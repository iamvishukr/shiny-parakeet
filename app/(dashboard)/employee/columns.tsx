// columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Employee } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
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
import React from "react";
import EmployeeDetails from "./EmployeeDetails";
import EmployeeSalary from "./EmployeeSalary";
import EmployeeAttendence from "./EmployeeAttendence";

export function getEmployeeColumns(
  onEdit: (emp: Employee) => void,
  openPopup: (title: string, content: React.ReactNode) => void
): ColumnDef<Employee>[] {
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
      accessorKey: "empId",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Emp ID"
        />
      ),
      cell: ({ row }) => <div>{row.getValue("empId")}</div>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Name"
        />
      ),
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Email"
        />
      ),
      cell: ({ row }) => <div>{row.getValue("email")}</div>,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <div>{row.getValue("phone")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => <div>{row.getValue("gender")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "bloodGroup",
      header: "Blood Group",
      cell: ({ row }) => <div>{row.getValue("bloodGroup")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "salary",
      header: "Salary",
      cell: ({ row }) => <div>{row.getValue("salary")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "accessLevel",
      header: "Access Level",
      cell: ({ row }) => (
        <div>
          {row.getValue("accessLevel") === "Staff" ? "Employee" : row.getValue("accessLevel")}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "employmentType",
      header: "Employment Type",
      cell: ({ row }) => <div>{row.getValue("employmentType")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "salaryStatus",
      header: "Salary Status",
      cell: ({ row }) => <div>{row.getValue("salaryStatus")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "profileStatus",
      header: "Status",
      cell: ({ row }) => <div>{row.getValue("profileStatus")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ row }) => {
        const dateValue = row.getValue("createdAt") as string;
        return <div>{dateValue ? new Date(dateValue).toLocaleDateString() : "-"}</div>;
      },
      // Add filter function for date range filtering with ISO format support
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const { startDate, endDate } = filterValue;
        const cellValue = row.getValue(columnId) as string;

        if (!cellValue) return false;

        // ISO format "2025-10-24T11:29:29.794Z" can be parsed directly by Date constructor
        const eventDate = new Date(cellValue);
        if (isNaN(eventDate.getTime())) return false;

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
        const emp = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuItem
                onClick={() => openPopup("Employee Details", <EmployeeDetails employee={emp} />)}
              >
                View
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  openPopup("Employee Attendence", <EmployeeAttendence employee={emp} />)
                }
              >
                View Attendence
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => openPopup("Salary Info", <EmployeeSalary employee={emp} />)}
              >
                Salary
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => onEdit(emp)}>Edit</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    },
  ];
}
