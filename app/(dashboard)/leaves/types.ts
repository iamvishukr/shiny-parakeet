// ─── Leave Type (from policy config) ───
export interface LeaveType {
  id: string; // "CL", "SL", "CompOff"
  name: string;
  quotaPerQuarter: number;
  carryForward: boolean;
  description?: string;
}

export interface LeavePolicy {
  leaveTypes: LeaveType[];
  updatedAt: string;
  updatedBy: string;
}

// ─── Leave Balance (per employee) ───
export interface LeaveTransaction {
  type: "credit" | "debit";
  leaveType: string; // leave type id
  amount: number;
  date: string;
  note: string;
  quarter?: string; // "Q1", "Q2", etc.
  requestId?: string;
  expiryDate?: string; // date string when this credit expires
}

export interface LeaveBalanceEntry {
  total: number;
  used: number;
  available: number;
  expired?: number; // dynamically calculated at view time
  nextExpiryDate?: string;
  nextExpiryAmount?: number;
}

export interface LeaveBalance {
  employeeId: string;
  year: number;
  balances: Record<string, LeaveBalanceEntry>;
  transactions: LeaveTransaction[];
}

// ─── Service Requests ───
export type RequestType = "leave_request" | "compoff_request";
export type RequestStatus = "pending" | "approved" | "rejected";

export interface BaseRequest {
  requestId: string;
  type: RequestType;
  employeeId: string;
  employeeName: string;
  status: RequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
  createdAt: string;
}

export interface LeaveRequest extends BaseRequest {
  type: "leave_request";
  leaveType: string; // leave type id
  fromDate: string;
  toDate: string;
  days: number;
  halfDay: boolean;
  reason: string;
}

export interface CompOffRequest extends BaseRequest {
  type: "compoff_request";
  workDate: string;
  workReason: string;
}

export type ServiceRequest = LeaveRequest | CompOffRequest;

// ─── Helpers ───
export const LEAVE_POLICY_DOC = "config";
export const LEAVE_POLICY_COLLECTION = "leavePolicy";
export const LEAVE_BALANCES_COLLECTION = "leaveBalances";
export const LEAVE_REQUESTS_COLLECTION = "leaveRequests";

export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  {
    id: "CL",
    name: "Casual Leave",
    quotaPerQuarter: 3,
    carryForward: false,
    description: "General purpose leave",
  },
  {
    id: "SL",
    name: "Sick Leave",
    quotaPerQuarter: 2,
    carryForward: false,
    description: "Medical leave",
  },
  {
    id: "CompOff",
    name: "Comp-Off",
    quotaPerQuarter: 0,
    carryForward: false,
    description: "Earned via extra work days",
  },
];
