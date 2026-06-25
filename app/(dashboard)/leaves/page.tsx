"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { firestore } from "@/lib/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import LeaveBalanceCard from "./LeaveBalanceCard";
import TransactionHistory from "./TransactionHistory";
import {
  LeaveBalance,
  LeavePolicy,
  LeaveType,
  LEAVE_POLICY_COLLECTION,
  LEAVE_POLICY_DOC,
  LEAVE_BALANCES_COLLECTION,
  DEFAULT_LEAVE_TYPES,
} from "./types";
import { calculateDynamicBalances } from "./leaveUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface UserInfo {
  uId: string;
  name: string;
}

export default function MyLeavesPage() {
  const { user, role } = useAuth();
  const isAdmin = role?.toLowerCase() === "admin";
  const isStaff = role?.toLowerCase() === "staff";

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(DEFAULT_LEAVE_TYPES);
  const [allBalances, setAllBalances] = useState<Record<string, LeaveBalance>>({});
  const [employees, setEmployees] = useState<UserInfo[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch leave policy
  useEffect(() => {
    const unsub = onSnapshot(
      doc(firestore, LEAVE_POLICY_COLLECTION, LEAVE_POLICY_DOC),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as LeavePolicy;
          setLeaveTypes(data.leaveTypes || DEFAULT_LEAVE_TYPES);
        }
      },
      (err) => {
        console.error("Error loading leave policy:", err);
      }
    );
    return () => unsub();
  }, []);

  // Fetch employees (for admin/manager)
  useEffect(() => {
    if (isStaff) return;

    const unsub = onSnapshot(collection(firestore, "users"), (snap) => {
      const list: UserInfo[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.employmentType !== "Freelancer") {
          list.push({ uId: d.id, name: data.name || data.email || "Unknown" });
        }
      });
      setEmployees(list);
    });
    return () => unsub();
  }, [isStaff]);

  // Fetch leave balances
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    let unsub: () => void;

    if (isStaff) {
      // Staff: only own balance
      unsub = onSnapshot(doc(firestore, LEAVE_BALANCES_COLLECTION, user.uid), (snap) => {
        const map: Record<string, LeaveBalance> = {};
        if (snap.exists()) {
          const rawBalance = snap.data() as LeaveBalance;
          map[user.uid] = calculateDynamicBalances(rawBalance, leaveTypes);
        } else {
          // No balance doc yet, show empty
          map[user.uid] = {
            employeeId: user.uid,
            year: new Date().getFullYear(),
            balances: {},
            transactions: [],
          };
        }
        setAllBalances(map);
        setIsLoading(false);
      });
    } else {
      // Admin/Manager: all balances
      unsub = onSnapshot(collection(firestore, LEAVE_BALANCES_COLLECTION), (snap) => {
        const map: Record<string, LeaveBalance> = {};
        snap.forEach((d) => {
          const rawBalance = d.data() as LeaveBalance;
          map[d.id] = calculateDynamicBalances(rawBalance, leaveTypes);
        });
        setAllBalances(map);
        setIsLoading(false);
      });
    }

    return () => unsub && unsub();
  }, [user, isStaff, leaveTypes]);

  // Which employee to display
  const viewEmployeeId = isStaff ? user?.uid ?? "" : selectedEmployee || user?.uid || "";
  const currentBalance = allBalances[viewEmployeeId];

  const balanceCards = useMemo(() => {
    if (!currentBalance) return [];
    return leaveTypes.map((lt) => ({
      typeId: lt.id,
      typeName: lt.name,
      description: lt.description,
      balance: currentBalance.balances[lt.id] || { total: 0, used: 0, available: 0 },
    }));
  }, [leaveTypes, currentBalance]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading leave balances...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <h1 className="text-2xl font-bold">My Leaves</h1>
          <span className="text-sm text-red-500 font-medium">
            * Non-carry forward leaves will expire after this  year
          </span>
        </div>

        {/* Employee selector for admin/manager */}
        {!isStaff && employees.length > 0 && (
          <div className="flex items-center gap-2">
            <Label>Employee</Label>
            <Select value={viewEmployeeId} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.uId} value={emp.uId}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Balance Cards */}
      {balanceCards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {balanceCards.map((card) => (
            <LeaveBalanceCard
              key={card.typeId}
              typeId={card.typeId}
              typeName={card.typeName}
              balance={card.balance}
              description={card.description}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-8 text-muted-foreground border rounded-lg">
          No leave balances found. Admin needs to set up leave policy and allocate balances.
        </div>
      )}

      {/* Transaction History */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Transaction History</h2>
        <TransactionHistory transactions={currentBalance?.transactions ?? []} />
      </div>
    </div>
  );
}
