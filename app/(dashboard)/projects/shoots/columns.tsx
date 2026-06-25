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
import { getEmployeeNames } from "@/lib/utils";

export interface ShootRow {
  id: string;
  projectId: string;
  projectName: string;
  venue: string;
  day: string;
  ritual: string;
  date: string;
  traditionalPhotographer: string;
  traditionalVideographer: string;
  candid: string;
  cinemetographer: string;
  assistant: string;
  drone: string;
  other: string;
  assignedEmployees?: { [role: string]: string[] };
  status: string;
}

export function getShootColumns(
  onAssignEmployee: (shoot: ShootRow) => void,
  employees: { uId: string; name: string }[]
): ColumnDef<ShootRow>[] {
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
      accessorKey: "venue",
      header: "Venue",
      cell: ({ row }) => <div>{row.getValue("venue")}</div>,
    },
    {
      accessorKey: "ritual",
      header: "Event",
      cell: ({ row }) => <div>{row.getValue("ritual")}</div>,
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
          label="Date"
        />
      ),
      cell: ({ row }) => <div>{new Date(row.getValue("date")).toLocaleDateString("en-GB")}</div>,
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
      accessorKey: "traditionalPhotographer",
      header: "Traditional Photographer",
      cell: ({ row }) => {
        const assigned = row.original.assignedEmployees?.traditionalPhotographer || [];
        const originalValue = row.getValue("traditionalPhotographer") as string;
        const names = getEmployeeNames(assigned, employees);

        return (
          <div>
            {assigned.length > 0 ? assigned.length : originalValue}
            {assigned.length > 0 && (
              <span className="ml-2 text-gray-500">({names.join(", ")})</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "traditionalVideographer",
      header: "Traditional Videographer",
      cell: ({ row }) => {
        const assigned = row.original.assignedEmployees?.traditionalVideographer || [];
        const originalValue = row.getValue("traditionalVideographer") as string;
        const names = getEmployeeNames(assigned, employees);

        return (
          <div>
            {assigned.length > 0 ? assigned.length : originalValue}
            {assigned.length > 0 && (
              <span className="ml-2 text-gray-500">({names.join(", ")})</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "candid",
      header: "Candid",
      cell: ({ row }) => {
        const assigned = row.original.assignedEmployees?.candid || [];
        const originalValue = row.getValue("candid") as string;
        const names = getEmployeeNames(assigned, employees);

        return (
          <div>
            {assigned.length > 0 ? assigned.length : originalValue}
            {assigned.length > 0 && (
              <span className="ml-2 text-gray-500">({names.join(", ")})</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "cinemetographer",
      header: "Cinematographer",
      cell: ({ row }) => {
        const assigned = row.original.assignedEmployees?.cinematographer || [];
        const originalValue = row.getValue("cinemetographer") as string;
        const names = getEmployeeNames(assigned, employees);

        return (
          <div>
            {assigned.length > 0 ? assigned.length : originalValue}
            {assigned.length > 0 && (
              <span className="ml-2 text-gray-500">({names.join(", ")})</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "assistant",
      header: "Assistant",
      cell: ({ row }) => {
        const assigned = row.original.assignedEmployees?.assistant || [];
        const originalValue = row.getValue("assistant") as string;
        const names = getEmployeeNames(assigned, employees);

        return (
          <div>
            {assigned.length > 0 ? assigned.length : originalValue}
            {assigned.length > 0 && (
              <span className="ml-2 text-gray-500">({names.join(", ")})</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "drone",
      header: "Drone",
      cell: ({ row }) => {
        const assigned = row.original.assignedEmployees?.drone || [];
        const originalValue = row.getValue("drone") as string;
        const names = getEmployeeNames(assigned, employees);

        return (
          <div>
            {assigned.length > 0 ? assigned.length : originalValue}
            {assigned.length > 0 && (
              <span className="ml-2 text-gray-500">({names.join(", ")})</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "other",
      header: "Others",
      cell: ({ row }) => {
        const assigned = row.original.assignedEmployees?.others || [];
        const originalValue = row.getValue("other") as string;
        const names = getEmployeeNames(assigned, employees);

        return (
          <div>
            {assigned.length > 0 ? assigned.length : originalValue}
            {assigned.length > 0 && (
              <span className="ml-2 text-gray-500">({names.join(", ")})</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const shoot = row.original;
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
              <DropdownMenuItem onClick={() => onAssignEmployee(shoot)}>
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
