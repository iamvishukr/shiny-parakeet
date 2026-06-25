"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ServiceRequest } from "../types";
import { formatDate } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ServiceRequest | null;
  onApprove: (request: ServiceRequest, note: string) => void;
  onReject: (request: ServiceRequest, note: string) => void;
}

export default function ReviewRequestModal({
  open,
  onOpenChange,
  request,
  onApprove,
  onReject,
}: Props) {
  const [note, setNote] = useState("");

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request details */}
          <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{request.employeeName}</p>
                <p className="text-xs text-muted-foreground">
                  Requested on {formatDate(request.createdAt)}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${request.type === "leave_request"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
                  }`}
              >
                {request.type === "leave_request" ? "Leave Request" : "Comp-Off Request"}
              </span>
            </div>

            {request.type === "leave_request" && (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span className="font-medium">{request.leaveType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days: </span>
                    <span className="font-medium">
                      {request.days}
                      {request.halfDay && " (Half Day)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">From: </span>
                    <span>{formatDate(request.fromDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">To: </span>
                    <span>{formatDate(request.toDate)}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Reason: </span>
                  <span>{request.reason}</span>
                </div>
              </>
            )}

            {request.type === "compoff_request" && (
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Work Date: </span>
                  <span className="font-medium">{formatDate(request.workDate)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reason: </span>
                  <span>{request.workReason}</span>
                </div>
              </div>
            )}
          </div>

          {/* Admin note */}
          <div className="space-y-1">
            <Label>Review Note (optional)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[60px]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => { onApprove(request, note); setNote("") }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
            <Button
              onClick={() => { onReject(request, note); setNote("") }}
              variant="destructive"
              className="flex-1"
            >
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
