"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { workDate: string; workReason: string }) => void;
}

export default function RaiseCompOffRequestModal({ open, onOpenChange, onSubmit }: Props) {
  const [workDate, setWorkDate] = useState("");
  const [workReason, setWorkReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setWorkDate("");
      setWorkReason("");
      setError("");
    }
  }, [open]);

  const handleSubmit = () => {
    setError("");

    if (!workDate || !workReason.trim()) {
      setError("All fields are required.");
      return;
    }

    // Work date should be in the past
    if (new Date(workDate) > new Date()) {
      setError("Work date cannot be in the future.");
      return;
    }

    onSubmit({ workDate, workReason: workReason.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raise Comp-Off Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Request compensatory leave for extra work done on a non-working day.
          </p>

          {/* Work Date */}
          <div className="space-y-1">
            <Label>Date Worked</Label>
            <input
              type="date"
              value={workDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <Label>Work Reason</Label>
            <textarea
              value={workReason}
              onChange={(e) => setWorkReason(e.target.value)}
              placeholder="What work did you do? (e.g., Shoot for XYZ project)"
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleSubmit} className="w-full" disabled={!workDate || !workReason.trim()}>
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
