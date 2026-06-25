"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusNote: string;
  onSubmit: (status: string) => void;
}

export default function UpdateTaskStatusModal({ open, onOpenChange, statusNote, onSubmit }: Props) {
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (statusNote) {
      setStatus(statusNote ?? "");
    }
  }, [statusNote]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Task Status</DialogTitle>
        </DialogHeader>

        {/* Status Input */}
        <div className="space-y-4">
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="Enter task status"
            className="w-full rounded-md border px-3 py-2"
          />
          <Button onClick={() => onSubmit(status)} className="w-full" disabled={!status.trim()}>
            Update Status
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
