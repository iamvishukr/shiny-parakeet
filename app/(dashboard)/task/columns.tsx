import { ColumnDef } from "@tanstack/react-table";
import SortButton from "@/components/shared/sortButton";
import { getEmployeeNames } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

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

export function getShootColumns(employees: { uId: string; name: string }[]): ColumnDef<ShootRow>[] {
  return [
    {
      id: "slno",
      header: "Sl No",
      cell: ({ row }) => {
        if (row.getCanExpand()) {
          return (
            <span className="cursor-pointer font-semibold" onClick={row.getToggleExpandedHandler()}>
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          );
        }

        return <span className="pl-4">{row.index + 1}</span>;
      },
    },
    {
      accessorKey: "projectName",
      header: "Project",
      cell: ({ row, getValue }) => {
        if (!row.getCanExpand()) {
          return <span className="pl-6">{String(getValue())}</span>;
        }

        return (
          <div
            className="flex items-center gap-2 font-semibold cursor-pointer"
            onClick={row.getToggleExpandedHandler()}
          >
            {String(getValue())}

            <span className="text-xs text-muted-foreground">({row.subRows?.length})</span>
          </div>
        );
      },
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
      cell: ({ row, getValue }) => {
        if (row.getCanExpand()) {
          return "—";
        }

        const value = getValue() as string | undefined;
        if (!value) return "—";

        return new Date(value).toLocaleDateString("en-GB");
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        if (row.getCanExpand()) return false;

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
      id: "status",
      accessorFn: (row) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (["Cancelled", "Postponed", "Not Confirmed"].includes(row.status)) {
          return row.status;
        }

        if (row.date) {
          const eventDate = new Date(row.date);
          eventDate.setHours(0, 0, 0, 0);

          if (now > eventDate) return "Completed";
          if (now.getTime() === eventDate.getTime()) return "Ongoing";
        }

        return "Pending";
      },
      header: "Status",
      cell: ({ row, getValue }) => {
        const classes: Record<string, string> = {
          Pending: "text-yellow-600",
          Ongoing: "text-blue-600",
          Completed: "text-green-600",
          Cancelled: "text-red-600",
          Postponed: "text-purple-600",
        };
        if (row.getCanExpand()) {
          return "—";
        }

        const value = getValue() as string | undefined;
        if (!value) return "—";

        return <span className={classes[value]}>{value}</span>;
      },
      filterFn: (row, columnId, filterValue) => {
        // Parent rows must NOT pass independently — return false so
        // filterFromLeafRows only shows them when children match
        if (row.getCanExpand()) return false;
        if (!filterValue) return true;
        const cellValue = row.getValue(columnId) as string;
        return cellValue?.toLowerCase().includes((filterValue as string).toLowerCase());
      },
    },
  ];
}
