import { Timestamp } from "firebase/firestore";

export type TransactionType = "credit" | "debit";
export type CreditMode = "cash" | "online";
export type DebitType = "employee_salary" | "office_saman" | "project";
export type CreditSourceType = "project" | "other";

// ---------------- SALARY ENTRY ----------------
export interface SalaryEntry {
  employeeId?: string;
  employeeName: string;
  amount: number;
  timestamp: Date | Timestamp | { seconds: number; nanoseconds?: number } | string | null;
  date?: string;
}

// ---------------- BASE TRANSACTION ----------------
export interface TransactionItemBase {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  status: TransactionType; // duplicated for UI

  purpose: string;
  amount: number;

  timestamp?: Date;
  createdAt: Date | string | { seconds: number };
}

// ---------------- CREDIT ----------------
export interface CreditTransactionItem extends TransactionItemBase {
  type: "credit";
  status: "credit";

  mode: CreditMode;
  utr?: string;

  sourceType: CreditSourceType;
  sourceValue: string; // projectId or text
}

// ---------------- DEBIT ----------------
export interface DebitTransactionItem extends TransactionItemBase {
  type: "debit";
  status: "debit";

  debitType: DebitType;
  mode: CreditMode;
  utr?: string;

  employees?: SalaryEntry[];
  projectId?: string;
  sourceValue?: string;
  selectedEmployeeIds?: string;
  salaryMonth?: string; // YYYY-MM
  salaryYear?: string; // YYYY
}

// ------------- UNION TYPE ----------------
export type TransactionItem = CreditTransactionItem | DebitTransactionItem;

// ------------- DOCS ----------------
export interface TransactionsDoc {
  date: string;
  createdAt: Date | Timestamp | { seconds: number } | string;
  updatedAt: Date;
  items: TransactionItem[];
}

export interface SalaryDoc {
  date: string;
  createdAt: Date;
  updatedAt: Date;
  employees: SalaryEntry[];
}

export interface UserDoc {
  uId: string;
  name: string;
}
