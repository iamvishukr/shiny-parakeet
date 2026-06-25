import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date and Month utilities for attendance system
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getDaysInMonth(month: string): number {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum, 0).getDate();
}

export function getMonthName(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getPreviousMonth(currentMonth: string): string {
  const [year, monthNum] = currentMonth.split("-").map(Number);
  if (monthNum === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(monthNum - 1).padStart(2, "0")}`;
}

export function getNextMonth(currentMonth: string): string {
  const [year, monthNum] = currentMonth.split("-").map(Number);
  if (monthNum === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(monthNum + 1).padStart(2, "0")}`;
}

export function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function parseDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day + 1); // month is 0-based
}
export const getEmployeeNames = (ids: string[], allEmployees: { uId: string; name: string }[]) => {
  return ids.map((id) => allEmployees.find((emp) => emp.uId === id)?.name || id).filter(Boolean);
};

/** Utility function to assign permissions based on role */
export function getPermissionsByRole(role: string): string[] {
  switch (role) {
    case "admin":
      return [
        "dashboard",
        "employee",
        "attendance",
        "accounts",
        "projects",
        "clients",
        "enquiry",
        "events",
        "packages",
        "shoots",
        "deliverables",
        "task",
        "indoor task",
        "outdoor task",
        "other task",
        "shoots",
        "deliverables",
        "attendance add",
        "profile",
        "notification",
        "invoice",
        "leaves",
        "leaves manage",
        "leaves policy",
      ];
    case "manager":
      return [
        "dashboard",
        "projects",
        "task",
        "assign",
        "indoor task",
        "outdoor task",
        "other task",
        "shoots",
        "deliverables",
        "attendance",
        "attendance add",
        "profile",
        "notification",
        "leaves",
        "leaves manage",
        "leaves policy",
      ];
    case "staff":
      return [
        "task",
        "indoor task",
        "outdoor task",
        "other task",
        "attendance",
        "profile",
        "notification",
        "leaves",
      ];
    default:
      return ["profile"];
  }
}

export function checkEmpty(text: string, replacement: string = "-") {
  return text === "" ? replacement : text;
}

export function convertTo12Hour(time24?: string): string {
  if (!time24) return "-";

  const [hourStr, minute] = time24.split(":");
  let hour = parseInt(hourStr, 10);

  if (isNaN(hour) || isNaN(parseInt(minute))) return time24;

  const ampm = hour >= 12 ? "PM" : "AM";

  // Convert 0 → 12 AM, and 13–23 → 1–11 PM
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${ampm}`;
}

export function getQuarter(date: Date): string {
  const month = date.getMonth(); // 0-based
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}

export function calculateLeaveDays(
  fromDate: string,
  toDate: string,
  halfDay: boolean
): number {
  if (halfDay) return 0.5;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to.getTime() - from.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}
