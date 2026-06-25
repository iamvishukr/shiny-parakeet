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
import { LeaveType } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  leaveTypes: LeaveType[];
  onSubmit: (data: {
    action: "credit" | "debit";
    leaveType: string;
    amount: number;
    note: string;
  }) => void;
}

export default function AdjustBalanceModal({
  open,
  onOpenChange,
  employeeName,
  leaveTypes,
  onSubmit,
}: Props) {
  const [action, setAction] = useState<"credit" | "debit">("credit");
  const [leaveType, setLeaveType] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setAction("credit");
      setLeaveType("");
      setAmount("");
      setNote("");
      setError("");
    }
  }, [open]);

  const handleSubmit = () => {
    setError("");
    const numAmount = parseFloat(amount);

    if (!leaveType || !amount || isNaN(numAmount) || numAmount <= 0) {
      setError("All fields are required and amount must be positive.");
      return;
    }

    if (!note.trim()) {
      setError("Please provide a note for this adjustment.");
      return;
    }

    onSubmit({ action, leaveType, amount: numAmount, note: note.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Balance — {employeeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action */}
          <div className="space-y-1">
            <Label>Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as "credit" | "debit")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit (Add)</SelectItem>
                <SelectItem value="debit">Debit (Deduct)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Leave Type */}
          <div className="space-y-1">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label>Amount (days)</Label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 1 or 0.5"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label>Note</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for adjustment..."
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[60px]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleSubmit}
            className={`w-full ${action === "credit" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {action === "credit" ? "Credit" : "Debit"} Balance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
