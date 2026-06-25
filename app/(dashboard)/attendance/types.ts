export interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  status: "present" | "absent" | "half-day" | "leave" | "holiday";
  timestamp: Date;
}
export interface AuthUser {
  permissions?: string[]; // ✅ explicitly a string array
  // other fields...
}

export interface DailyAttendance {
  date: string; // Format: YYYY-MM-DD
  day: string; // Monday, Tuesday, etc.
  employees: Record<string, AttendanceRecord>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyAttendance {
  month: string; // Format: YYYY-MM
  year: number;
  dailyRecords: Record<string, DailyAttendance>;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays?: number;
  totalDays: number;
  unmarkedDays: number;
}

export interface AttendanceFormData {
  date: string;
  day: string;
  employeeAttendance: Record<
    string,
    {
      employeeId: string;
      employeeName: string;
      status: "present" | "absent" | "half-day";
    }
  >;
}

export const years = Array.from({ length: 10 }, (_, i) => String(2020 + i)); // 2020–2029
export const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
