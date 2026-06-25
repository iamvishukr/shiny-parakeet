"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ServiceRequest } from "../types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export function getRequestColumns(
  onReview?: (request: ServiceRequest) => void
): ColumnDef<ServiceRequest>[] {
  return [
    {
      accessorKey: "employeeName",
      header: "Employee",
    },
    {
      accessorKey: "type",
      header: "Request Type",
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              type === "leave_request"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {type === "leave_request" ? "Leave" : "Comp-Off"}
          </span>
        );
      },
    },
    {
      id: "details",
      header: "Details",
      cell: ({ row }) => {
        const req = row.original;
        if (req.type === "leave_request") {
          return (
            <div className="text-sm">
              <div>
                <span className="font-medium">{req.leaveType}</span>
                {req.halfDay && <span className="text-xs text-muted-foreground ml-1">(Half Day)</span>}
              </div>
              <div className="text-muted-foreground">
                {formatDate(req.fromDate)} → {formatDate(req.toDate)} ({req.days} day{req.days !== 1 ? "s" : ""})
              </div>
            </div>
          );
        } else {
          return (
            <div className="text-sm">
              <div className="font-medium">Worked: {formatDate(req.workDate)}</div>
              <div className="text-muted-foreground">{req.workReason}</div>
            </div>
          );
        }
      },
    },
    {
      id: "reason",
      header: "Reason",
      cell: ({ row }) => {
        const req = row.original;
        if (req.type === "leave_request") {
          return <span className="text-sm">{req.reason}</span>;
        }
        return <span className="text-sm text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const colors: Record<string, string> = {
          pending: "bg-yellow-100 text-yellow-700",
          approved: "bg-green-100 text-green-700",
          rejected: "bg-red-100 text-red-700",
        };
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || ""}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
      filterFn: (row, id, value) => {
        if (!value || value === "all") return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Requested On",
      cell: ({ row }) => {
        return <span className="text-sm">{formatDate(row.original.createdAt)}</span>;
      },
    },
    ...(onReview
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }: { row: { original: ServiceRequest } }) => {
              if (row.original.status !== "pending") {
                return (
                  <span className="text-xs text-muted-foreground">
                    {row.original.reviewNote || "—"}
                  </span>
                );
              }
              return (
                <Button size="sm" variant="outline" onClick={() => onReview(row.original)}>
                  Review
                </Button>
              );
            },
          } as ColumnDef<ServiceRequest>,
        ]
      : []),
  ];
}
