"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { firestore } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  LeaveType,
  LeaveBalance,
  LeaveBalanceEntry,
  LeavePolicy,
  LEAVE_POLICY_COLLECTION,
  LEAVE_POLICY_DOC,
  LEAVE_BALANCES_COLLECTION,
  DEFAULT_LEAVE_TYPES,
} from "../types";
import { getQuarter } from "@/lib/utils";
import AdjustBalanceModal from "./AdjustBalanceModal";
import { calculateDynamicBalances } from "../leaveUtils";

interface EmployeeInfo {
  uId: string;
  name: string;
}

export default function ManageBalancesPage() {
  const { user, role } = useAuth();
  const isStaff = role?.toLowerCase() === "staff";

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(DEFAULT_LEAVE_TYPES);
  const [employees, setEmployees] = useState<EmployeeInfo[]>([]);
  const [balances, setBalances] = useState<Record<string, LeaveBalance>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustEmployee, setAdjustEmployee] = useState<EmployeeInfo | null>(null);

  const currentYear = new Date().getFullYear();
  const currentQuarter = getQuarter(new Date());

  // Fetch leave policy
  useEffect(() => {
    const unsub = onSnapshot(
      doc(firestore, LEAVE_POLICY_COLLECTION, LEAVE_POLICY_DOC),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as LeavePolicy;
          setLeaveTypes(data.leaveTypes || DEFAULT_LEAVE_TYPES);
        }
      }
    );
    return () => unsub();
  }, []);

  // Fetch employees
  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "users"), (snap) => {
      const list: EmployeeInfo[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.profileStatus !== "Inactive" && data.employmentType !== "Freelancer") {
          list.push({ uId: d.id, name: data.name || data.email || "Unknown" });
        }
      });
      setEmployees(list);
    });
    return () => unsub();
  }, []);

  // Fetch all balances
  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, LEAVE_BALANCES_COLLECTION), (snap) => {
      const map: Record<string, LeaveBalance> = {};
      snap.forEach((d) => {
        const rawBalance = d.data() as LeaveBalance;
        map[d.id] = calculateDynamicBalances(rawBalance, leaveTypes);
      });
      setBalances(map);
      setIsLoading(false);
    });
    return () => unsub();
  }, [leaveTypes]);

  const getBalance = (empId: string, typeId: string): LeaveBalanceEntry => {
    return balances[empId]?.balances?.[typeId] || { total: 0, used: 0, available: 0 };
  };

  // ── Apply Quarterly Quota to ALL employees ──
  const handleApplyQuarterlyQuota = async () => {
    if (!user) return;

    const quotaKey = `${currentYear}-${currentQuarter}`;

    // Filter leave types that have a per-quarter quota (skip comp-off which is earned)
    const allocatableTypes = leaveTypes.filter(
      (lt) => lt.quotaPerQuarter > 0 && lt.id !== "CompOff"
    );

    if (allocatableTypes.length === 0) {
      toast.error("No leave types with quarterly quotas configured.");
      return;
    }

    const confirmed = window.confirm(
      `Apply ${currentQuarter} ${currentYear} quota to all ${employees.length} employees?\n\n` +
      allocatableTypes.map((lt) => `• ${lt.name}: ${lt.quotaPerQuarter} days`).join("\n") +
      `\n\nThis will credit the above leaves to every employee who hasn't received them yet for ${currentQuarter}.`
    );
    if (!confirmed) return;

    setIsApplying(true);
    let applied = 0;
    let skipped = 0;

    try {
      for (const emp of employees) {
        const balRef = doc(firestore, LEAVE_BALANCES_COLLECTION, emp.uId);
        const balSnap = await getDoc(balRef);

        const current: LeaveBalance = balSnap.exists()
          ? (balSnap.data() as LeaveBalance)
          : {
            employeeId: emp.uId,
            year: currentYear,
            balances: {},
            transactions: [],
          };

        // Check if quota already applied for this quarter
        const quotaApplied: Record<string, boolean> =
          (current as LeaveBalance & { quotaApplied?: Record<string, boolean> }).quotaApplied || {};

        if (quotaApplied[quotaKey]) {
          skipped++;
          continue;
        }

        // Credit each allocatable leave type
        for (const lt of allocatableTypes) {
          const entry = current.balances[lt.id] || { total: 0, used: 0, available: 0 };
          entry.total += lt.quotaPerQuarter;
          entry.available += lt.quotaPerQuarter;
          current.balances[lt.id] = entry;

          const transactionDate = new Date();
          let expiryDate: string | undefined = undefined;
          if (!lt.carryForward) {
            const expiry = new Date(transactionDate.getFullYear(), 11, 31, 23, 59, 59, 999);
            expiryDate = expiry.toISOString();
          }

          current.transactions.push({
            type: "credit",
            leaveType: lt.id,
            amount: lt.quotaPerQuarter,
            date: transactionDate.toISOString(),
            note: `${currentQuarter} ${currentYear} quarterly allotment`,
            quarter: currentQuarter,
            ...(expiryDate ? { expiryDate } : {}),
          });
        }

        quotaApplied[quotaKey] = true;

        const saveData = {
          ...current,
          quotaApplied,
        };

        if (balSnap.exists()) {
          await updateDoc(balRef, saveData);
        } else {
          await setDoc(balRef, saveData);
        }
        applied++;
      }

      toast.success(
        `Quarterly quota applied! ${applied} employee(s) credited${skipped > 0 ? `, ${skipped} already had ${currentQuarter} quota` : ""}.`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to apply quarterly quota");
    } finally {
      setIsApplying(false);
    }
  };

  const handleAdjust = (emp: EmployeeInfo) => {
    setAdjustEmployee(emp);
    setAdjustOpen(true);
  };

  const handleAdjustSubmit = async (data: {
    action: "credit" | "debit";
    leaveType: string;
    amount: number;
    note: string;
  }) => {
    if (!adjustEmployee || !user) return;

    try {
      const balRef = doc(firestore, LEAVE_BALANCES_COLLECTION, adjustEmployee.uId);
      const balSnap = await getDoc(balRef);

      const current: LeaveBalance = balSnap.exists()
        ? (balSnap.data() as LeaveBalance)
        : {
          employeeId: adjustEmployee.uId,
          year: new Date().getFullYear(),
          balances: {},
          transactions: [],
        };

      const entry = current.balances[data.leaveType] || { total: 0, used: 0, available: 0 };

      if (data.action === "credit") {
        entry.total += data.amount;
        entry.available += data.amount;
      } else {
        entry.used += data.amount;
        entry.available -= data.amount;
      }

      current.balances[data.leaveType] = entry;

      const lt = leaveTypes.find(t => t.id === data.leaveType);
      const transactionDate = new Date();
      let expiryDate: string | undefined = undefined;
      if (data.action === "credit" && lt && !lt.carryForward) {
        const expiry = new Date(transactionDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        expiryDate = expiry.toISOString();
      }

      current.transactions.push({
        type: data.action,
        leaveType: data.leaveType,
        amount: data.amount,
        date: transactionDate.toISOString(),
        note: `Admin: ${data.note}`,
        ...(expiryDate ? { expiryDate } : {}),
      });

      if (balSnap.exists()) {
        await updateDoc(balRef, {
          balances: current.balances,
          transactions: current.transactions,
        });
      } else {
        await setDoc(balRef, current);
      }

      toast.success(`Balance ${data.action === "credit" ? "credited" : "debited"} successfully!`);
      setAdjustOpen(false);
      setAdjustEmployee(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to adjust balance");
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
    return <div className="flex items-center justify-center p-8">Loading balances...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Manage Leave Balances</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentQuarter} {currentYear}
          </span>
          <Button onClick={handleApplyQuarterlyQuota} disabled={isApplying}>
            {isApplying ? "Applying..." : `Apply ${currentQuarter} Quota to All`}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Click <strong>&quot;Apply {currentQuarter} Quota to All&quot;</strong> to credit the configured quarterly leave quotas from the policy to every employee.
        Employees who already received this quarter&apos;s quota will be skipped.
      </p>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium sticky left-0 bg-muted/50 min-w-40">
                  Employee
                </th>
                {leaveTypes.map((lt) => (
                  <th key={lt.id} className="p-3 text-center font-medium min-w-32" colSpan={3}>
                    {lt.name}
                  </th>
                ))}
                <th className="p-3 text-center font-medium min-w-24">Actions</th>
              </tr>
              <tr className="border-b bg-muted/30">
                <th className="p-2 sticky left-0 bg-muted/30" />
                {leaveTypes.map((lt) => (
                  <React.Fragment key={lt.id}>
                    <th className="p-2 text-center text-xs text-muted-foreground">Total</th>
                    <th className="p-2 text-center text-xs text-muted-foreground">Used</th>
                    <th className="p-2 text-center text-xs text-muted-foreground">Avail</th>
                  </React.Fragment>
                ))}
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.uId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">{emp.name}</td>
                  {leaveTypes.map((lt) => {
                    const bal = getBalance(emp.uId, lt.id);
                    return (
                      <React.Fragment key={lt.id}>
                        <td className="p-3 text-center text-blue-600 font-medium">{bal.total}</td>
                        <td className="p-3 text-center text-orange-600 font-medium">{bal.used}</td>
                        <td className="p-3 text-center text-green-600 font-medium">
                          {bal.available}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="p-3 text-center">
                    <Button size="sm" variant="outline" onClick={() => handleAdjust(emp)}>
                      Adjust
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adjustEmployee && (
        <AdjustBalanceModal
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          employeeName={adjustEmployee.name}
          leaveTypes={leaveTypes}
          onSubmit={handleAdjustSubmit}
        />
      )}
    </div>
  );
}
