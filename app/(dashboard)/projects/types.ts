import { Expense } from "@/hooks/useProjectForm";
import { Timestamp } from "firebase/firestore";

export interface TransactionItem {
  id: string;
  date: string;
  type: "credit" | "debit";
  amount: number;
  purpose?: string;
  createdAt?: Timestamp; // Firestore timestamp
}
export interface Project {
  projectId: string;
  clientName: string;
  projectName: string;
  dates: string;
  venues: string;
  eventName: string;
  event: string;
  package: string;
  status: string;
  shoot?: string;
  shoots?: {
    id: string;
    day: string;
    venue: string;
    ritual: string;
    date: string;
    time: string;
    traditionalPhotographer: string;
    traditionalVideographer: string;
    candid: string;
    cinemetographer: string;
    assistant: string;
    drone: string;
    other: string;
  }[];
  deliverables:
    | string[]
    | {
        id: string;
        name: string;
        qty: string;
      }[];
  price: number;
  extraExpenses: Expense[];
  discount: number;
  finalAmount: number;
  transactionHistory?: TransactionItem[];
  // advance: number;
  // due: number;
  note: string;
  createdAt: Date;
  accessorKey?: string;
}

export interface Client {
  clientId: string;
  name: string;
}

export interface Event {
  eventId: string;
  name: string;
}

export interface Package {
  packageId: string;
  name: string;
  eventId: string; // Added to link package to event
}

export interface Shoot {
  shootId: string;
  name: string;
}

export interface Deliverable {
  deliverableId: string;
  name: string;
  description?: string;
}

export const roleColumnVisibilityMap: Record<string, string[]> = {
  admin: [
    "select",
    "slno",
    "clientName",
    "projectName",
    "eventName",
    "dates",
    "venues",
    "price",
    "discount",
    "finalAmount",
    "dueAmount",
    "status",
    "createdAt",
    "actions",
  ],
  manager: [
    "select",
    "slno",
    "clientName",
    "projectName",
    "eventName",
    "dates",
    "venues",
    "status",
    "createdAt",
    "actions",
  ],
};
