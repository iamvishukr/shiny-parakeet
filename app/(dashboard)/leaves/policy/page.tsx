"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { firestore } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LeaveType,
  LeavePolicy,
  LEAVE_POLICY_COLLECTION,
  LEAVE_POLICY_DOC,
  DEFAULT_LEAVE_TYPES,
} from "../types";

export default function PolicySettingsPage() {
  const { user, role } = useAuth();

  const isStaff = role?.toLowerCase() === "staff";

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(DEFAULT_LEAVE_TYPES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current policy
  useEffect(() => {
    const unsub = onSnapshot(
      doc(firestore, LEAVE_POLICY_COLLECTION, LEAVE_POLICY_DOC),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as LeavePolicy;
          setLeaveTypes(data.leaveTypes || DEFAULT_LEAVE_TYPES);
        }
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const updateLeaveType = (index: number, updates: Partial<LeaveType>) => {
    setLeaveTypes((prev) =>
      prev.map((lt, i) => (i === index ? { ...lt, ...updates } : lt))
    );
  };

  const addLeaveType = () => {
    const newId = `LT${Date.now()}`;
    setLeaveTypes((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        quotaPerQuarter: 0,
        carryForward: false,
        description: "",
      },
    ]);
  };

  const removeLeaveType = (index: number) => {
    // Don't allow removing CompOff
    if (leaveTypes[index].id === "CompOff") {
      toast.error("Cannot remove Comp-Off leave type.");
      return;
    }
    setLeaveTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate
    const hasEmpty = leaveTypes.some((lt) => !lt.name.trim() || !lt.id.trim());
    if (hasEmpty) {
      toast.error("All leave types must have a name and ID.");
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(firestore, LEAVE_POLICY_COLLECTION, LEAVE_POLICY_DOC), {
        leaveTypes,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      });
      toast.success("Leave policy saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save leave policy");
    } finally {
      setIsSaving(false);
    }
  };

  if (isStaff) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Access denied. Admin only.
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading policy...</div>;
  }

  return (
    <div className="space-y-6 p-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leave Policy Settings</h1>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Policy"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure leave types, quotas per quarter, and carry-forward rules.
      </p>

      <div className="space-y-4">
        {leaveTypes.map((lt, index) => (
          <div key={lt.id} className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                {lt.id}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => removeLeaveType(index)}
              >
                Remove
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <Label>Name</Label>
                <input
                  type="text"
                  value={lt.name}
                  onChange={(e) => updateLeaveType(index, { name: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              {/* Quota per Quarter */}
              <div className="space-y-1">
                <Label>Quota per Quarter</Label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={lt.quotaPerQuarter}
                  onChange={(e) =>
                    updateLeaveType(index, { quotaPerQuarter: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description</Label>
              <input
                type="text"
                value={lt.description || ""}
                onChange={(e) => updateLeaveType(index, { description: e.target.value })}
                placeholder="Short description..."
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-6">
              {/* Carry Forward */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`carry-${index}`}
                  checked={lt.carryForward}
                  onCheckedChange={(checked) =>
                    updateLeaveType(index, { carryForward: checked === true })
                  }
                />
                <Label htmlFor={`carry-${index}`}>Carry Forward</Label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addLeaveType} className="w-full">
        + Add Leave Type
      </Button>
    </div>
  );
}
