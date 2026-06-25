"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeaveType, LeaveBalanceEntry } from "../types";
import { calculateLeaveDays } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveTypes: LeaveType[];
  balances: Record<string, LeaveBalanceEntry>;
  onSubmit: (data: {
    leaveType: string;
    fromDate: string;
    toDate: string;
    days: number;
    halfDay: boolean;
    reason: string;
  }) => void;
}

export default function RaiseLeaveRequestModal({
  open,
  onOpenChange,
  leaveTypes,
  balances,
  onSubmit,
}: Props) {
  const [leaveType, setLeaveType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  // Reset form on open
  useEffect(() => {
    if (open) {
      setLeaveType("");
      setFromDate("");
      setToDate("");
      setHalfDay(false);
      setReason("");
      setError("");
    }
  }, [open]);

  // When half-day is toggled, set toDate same as fromDate
  useEffect(() => {
    if (halfDay && fromDate) {
      setToDate(fromDate);
    }
  }, [halfDay, fromDate]);

  const days = fromDate && toDate ? calculateLeaveDays(fromDate, toDate, halfDay) : 0;
  const availableBalance = leaveType ? (balances[leaveType]?.available ?? 0) : 0;

  const handleSubmit = () => {
    setError("");

    if (!leaveType || !fromDate || !toDate || !reason.trim()) {
      setError("All fields are required.");
      return;
    }

    if (new Date(toDate) < new Date(fromDate)) {
      setError("To date cannot be before from date.");
      return;
    }

    if (days > availableBalance) {
      setError(`Insufficient balance. Available: ${availableBalance}, Requested: ${days}`);
      return;
    }

    onSubmit({ leaveType, fromDate, toDate, days, halfDay, reason: reason.trim() });
  };

  // Filter to only leave types that are not comp-off (comp-off is earned, not requested directly here)
  const selectableTypes = leaveTypes.filter((lt) => lt.id !== "CompOff");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raise Leave Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Leave Type */}
          <div className="space-y-1">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {selectableTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name} (Available: {balances[lt.id]?.available ?? 0})
                  </SelectItem>
                ))}
                {/* Comp-off can be used as leave type */}
                {(balances["CompOff"]?.available ?? 0) > 0 && (
                  <SelectItem value="CompOff">
                    Comp-Off (Available: {balances["CompOff"]?.available ?? 0})
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Half Day Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="half-day"
              checked={halfDay}
              onCheckedChange={(checked) => setHalfDay(checked === true)}
            />
            <Label htmlFor="half-day">Half Day Leave</Label>
          </div>

          {/* From Date */}
          <div className="space-y-1">
            <Label>From Date</Label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* To Date */}
          {!halfDay && (
            <div className="space-y-1">
              <Label>To Date</Label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Days count */}
          {days > 0 && (
            <p className="text-sm text-muted-foreground">
              Total days: <span className="font-medium">{days}</span>
              {leaveType && (
                <span>
                  {" "} (Available: <span className="font-medium">{availableBalance}</span>)
                </span>
              )}
            </p>
          )}

          {/* Reason */}
          <div className="space-y-1">
            <Label>Reason</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need leave?"
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleSubmit} className="w-full" disabled={!leaveType || !fromDate || !reason.trim()}>
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
