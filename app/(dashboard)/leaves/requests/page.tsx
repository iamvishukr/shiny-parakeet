"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { firestore } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { GenericTable } from "@/components/shared/GenericTable";
import Pagination from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ServiceRequest,
  LeaveType,
  LeaveBalance,
  LEAVE_POLICY_COLLECTION,
  LEAVE_POLICY_DOC,
  LEAVE_BALANCES_COLLECTION,
  LEAVE_REQUESTS_COLLECTION,
  DEFAULT_LEAVE_TYPES,
  LeavePolicy,
} from "../types";
import { getDayName } from "@/lib/utils";
import { getRequestColumns } from "./columns";
import RaiseLeaveRequestModal from "./RaiseLeaveRequestModal";
import RaiseCompOffRequestModal from "./RaiseCompOffRequestModal";
import ReviewRequestModal from "./ReviewRequestModal";

export default function RequestsPage() {
  const { user, role } = useAuth();
  const isStaff = role?.toLowerCase() === "staff";

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(DEFAULT_LEAVE_TYPES);
  const [myBalance, setMyBalance] = useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [compOffModalOpen, setCompOffModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<ServiceRequest | null>(null);

  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Apply status filter
  useEffect(() => {
    const col = table.getColumn("status");
    if (col) {
      col.setFilterValue(statusFilter === "all" ? undefined : statusFilter);
    }
  }, [statusFilter]);

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

  // Fetch own balance (for staff to validate leave requests)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(firestore, LEAVE_BALANCES_COLLECTION, user.uid), (snap) => {
      if (snap.exists()) {
        setMyBalance(snap.data() as LeaveBalance);
      } else {
        setMyBalance({
          employeeId: user.uid,
          year: new Date().getFullYear(),
          balances: {},
          transactions: [],
        });
      }
    });
    return () => unsub();
  }, [user]);

  // Fetch requests
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    let q;
    if (isStaff) {
      q = query(
        collection(firestore, LEAVE_REQUESTS_COLLECTION),
        where("employeeId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(firestore, LEAVE_REQUESTS_COLLECTION),
        orderBy("createdAt", "desc")
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const list: ServiceRequest[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), requestId: d.id } as ServiceRequest);
      });
      setRequests(list);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user, isStaff]);

  // Handle opening review modal
  const handleReview = useCallback((req: ServiceRequest) => {
    setReviewingRequest(req);
    setReviewModalOpen(true);
  }, []);

  const columns = useMemo(
    () => getRequestColumns(isStaff ? undefined:handleReview),
    [isStaff, handleReview]
  );

  const table = useReactTable({
    data: requests,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // ── Submit Leave Request ──
  const handleSubmitLeave = async (data: {
    leaveType: string;
    fromDate: string;
    toDate: string;
    days: number;
    halfDay: boolean;
    reason: string;
  }) => {
    if (!user) return;

    // Prevent duplicate/overlapping leave requests
    const hasOverlap = requests.some((req) => {
      if (
        req.type === "leave_request" &&
        req.employeeId === user.uid &&
        (req.status === "pending" || req.status === "approved")
      ) {
        return (
          new Date(req.fromDate) <= new Date(data.toDate) &&
          new Date(req.toDate) >= new Date(data.fromDate)
        );
      }
      return false;
    });

    if (hasOverlap) {
      toast.error("You have already applied for leave during these dates.");
      return;
    }

    try {
      await addDoc(collection(firestore, LEAVE_REQUESTS_COLLECTION), {
        type: "leave_request",
        employeeId: user.uid,
        employeeName: user.displayName || "Unknown",
        leaveType: data.leaveType,
        fromDate: data.fromDate,
        toDate: data.toDate,
        days: data.days,
        halfDay: data.halfDay,
        reason: data.reason,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: "",
        createdAt: new Date().toISOString(),
      });

      toast.success("Leave request submitted!");
      setLeaveModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit leave request");
    }
  };

  // ── Submit Comp-Off Request ──
  const handleSubmitCompOff = async (data: { workDate: string; workReason: string }) => {
    if (!user) return;

    // Prevent duplicate comp-off requests for the same date
    const hasExisting = requests.some((req) => {
      return (
        req.type === "compoff_request" &&
        req.employeeId === user.uid &&
        req.workDate === data.workDate &&
        (req.status === "pending" || req.status === "approved")
      );
    });

    if (hasExisting) {
      toast.error("You have already applied for comp-off for this date.");
      return;
    }

    try {
      await addDoc(collection(firestore, LEAVE_REQUESTS_COLLECTION), {
        type: "compoff_request",
        employeeId: user.uid,
        employeeName: user.displayName || "Unknown",
        workDate: data.workDate,
        workReason: data.workReason,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: "",
        createdAt: new Date().toISOString(),
      });

      toast.success("Comp-off request submitted!");
      setCompOffModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit comp-off request");
    }
  };

  // ── Approve Request ──
  const handleApprove = async (request: ServiceRequest, note: string) => {
    if (!user) return;

    try {
      const requestRef = doc(firestore, LEAVE_REQUESTS_COLLECTION, request.requestId);

      // Update request status
      await updateDoc(requestRef, {
        status: "approved",
        reviewedBy: user.uid,
        reviewedAt: new Date().toISOString(),
        reviewNote: note,
      });

      // Update leave balance
      const balanceRef = doc(firestore, LEAVE_BALANCES_COLLECTION, request.employeeId);
      const balanceSnap = await getDoc(balanceRef);

      const currentBalance: LeaveBalance = balanceSnap.exists()
        ? (balanceSnap.data() as LeaveBalance)
        : {
            employeeId: request.employeeId,
            year: new Date().getFullYear(),
            balances: {},
            transactions: [],
          };

      if (request.type === "leave_request") {
        // Debit leave balance
        const leaveType = request.leaveType;
        const current = currentBalance.balances[leaveType] || { total: 0, used: 0, available: 0 };
        currentBalance.balances[leaveType] = {
          total: current.total,
          used: current.used + request.days,
          available: current.available - request.days,
        };
        currentBalance.transactions.push({
          type: "debit",
          leaveType,
          amount: request.days,
          date: new Date().toISOString(),
          note: `Leave: ${request.fromDate} to ${request.toDate}`,
          requestId: request.requestId,
        });

        // Auto-update attendance records
        const from = new Date(request.fromDate);
        const to = new Date(request.toDate);
        
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          const dayName = getDayName(dateStr);
          const attRef = doc(firestore, "attendance", dateStr);
          
          try {
            const attSnap = await getDoc(attRef);
            let attData: any = {
              date: dateStr,
              day: dayName,
              employees: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            if (attSnap.exists()) {
              attData = {
                ...attSnap.data(),
                updatedAt: new Date()
              };
            }
            
            if (!attData.employees) {
              attData.employees = {};
            }
            
            attData.employees[request.employeeId] = {
              employeeId: request.employeeId,
              employeeName: request.employeeName,
              status: request.halfDay ? "half-day" : "leave",
              timestamp: new Date()
            };
            
            await setDoc(attRef, attData, { merge: true });
          } catch (err) {
            console.error("Failed to update attendance for", dateStr, err);
          }
        }
      } else if (request.type === "compoff_request") {
        // Credit comp-off balance
        const current = currentBalance.balances["CompOff"] || { total: 0, used: 0, available: 0 };

        currentBalance.balances["CompOff"] = {
          total: current.total + 1,
          used: current.used,
          available: current.available + 1,
        };

        const transactionDate = new Date();
        let expiryDate: string | undefined = undefined;
        const lt = leaveTypes.find((t) => t.id === "CompOff");
        if (lt && !lt.carryForward) {
          const expiry = new Date(transactionDate.getFullYear(), 11, 31, 23, 59, 59, 999);
          expiryDate = expiry.toISOString();
        }

        currentBalance.transactions.push({
          type: "credit",
          leaveType: "CompOff",
          amount: 1,
          date: transactionDate.toISOString(),
          note: `Extra work on ${request.workDate}`,
          requestId: request.requestId,
          ...(expiryDate ? { expiryDate } : {}),
        });
      }

      await updateDoc(balanceRef, {
        balances: currentBalance.balances,
        transactions: currentBalance.transactions,
      }).catch(async () => {
        // Doc doesn't exist yet, use setDoc
        const { setDoc } = await import("firebase/firestore");
        await setDoc(balanceRef, currentBalance);
      });

      // Send notification
      await addDoc(collection(firestore, "notifications"), {
        title: `${request.type === "leave_request" ? "Leave" : "Comp-Off"} Request Approved`,
        body: `Your ${request.type === "leave_request" ? "leave" : "comp-off"} request has been approved.${note ? ` Note: ${note}` : ""}`,
        employeeId: request.employeeId,
        read: false,
        createdAt: Timestamp.now(),
      });

      toast.success("Request approved!");
      setReviewModalOpen(false);
      setReviewingRequest(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve request");
    }
  };

  // ── Reject Request ──
  const handleReject = async (request: ServiceRequest, note: string) => {
    if (!user) return;

    try {
      const requestRef = doc(firestore, LEAVE_REQUESTS_COLLECTION, request.requestId);
      await updateDoc(requestRef, {
        status: "rejected",
        reviewedBy: user.uid,
        reviewedAt: new Date().toISOString(),
        reviewNote: note,
      });

      // Send notification
      await addDoc(collection(firestore, "notifications"), {
        title: `${request.type === "leave_request" ? "Leave" : "Comp-Off"} Request Rejected`,
        body: `Your ${request.type === "leave_request" ? "leave" : "comp-off"} request has been rejected.${note ? ` Reason: ${note}` : ""}`,
        employeeId: request.employeeId,
        read: false,
        createdAt: Timestamp.now(),
      });

      toast.success("Request rejected.");
      setReviewModalOpen(false);
      setReviewingRequest(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading requests...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Leave Requests</h1>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Raise request buttons */}
          <Button onClick={() => setLeaveModalOpen(true)}>
            + Leave Request
          </Button>
          <Button variant="outline" onClick={() => setCompOffModalOpen(true)}>
            + Comp-Off Request
          </Button>
        </div>
      </div>

      <GenericTable table={table} />
      <Pagination table={table} />

      {/* Modals */}
      <RaiseLeaveRequestModal
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        leaveTypes={leaveTypes}
        balances={myBalance?.balances ?? {}}
        onSubmit={handleSubmitLeave}
      />

      <RaiseCompOffRequestModal
        open={compOffModalOpen}
        onOpenChange={setCompOffModalOpen}
        onSubmit={handleSubmitCompOff}
      />

      <ReviewRequestModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        request={reviewingRequest}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
