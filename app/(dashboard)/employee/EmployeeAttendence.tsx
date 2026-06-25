"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Employee } from "./types";
import { collection, onSnapshot, DocumentData } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { getCurrentMonth, getDaysInMonth, getDayName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  employee: Employee;
}

/* ================== HELPERS ================== */

const getAttendanceValue = (status: string) => {
  switch (status) {
    case "present":
    case "leave":
    case "holiday":
      return 1;
    case "half-day":
      return 0.5;
    default:
      return 0;
  }
};

/**
 * Find the correct salary for a given month from salary history.
 * Picks the last entry whose effectiveFrom <= last day of the month.
 * Falls back to employee.salary if no history exists.
 */
const getSalaryForMonth = (employee: Employee, month: string): number => {
  const history = employee.salaryAmountHistory;
  if (!history || history.length === 0) {
    return Number(employee.salary);
  }

  // Build the last day of the month for comparison (YYYY-MM-DD)
  const [y, m] = month.split("-");
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const monthEnd = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

  // Sort ascending by effectiveFrom
  const sorted = [...history].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom)
  );

  // Find the last entry that started on or before the end of the month
  let applicableSalary = sorted[0].salary; // default to earliest entry
  for (const entry of sorted) {
    if (entry.effectiveFrom <= monthEnd) {
      applicableSalary = entry.salary;
    } else {
      break;
    }
  }

  return Number(applicableSalary);
};

/* ================== COMPONENT ================== */

export default function EmployeeAttendance({ employee }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth()); // YYYY-MM
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [lastMonthSalary, setLastMonthSalary] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const daysInMonth = getDaysInMonth(selectedMonth);
  const monthlySalary = getSalaryForMonth(employee, selectedMonth);
  const salaryPerDay = monthlySalary / daysInMonth;

  /* ================== LOAD CURRENT MONTH ================== */
  useEffect(() => {
    setIsLoading(true);

    const unsub = onSnapshot(collection(firestore, "attendance"), (snapshot) => {
      const records: Record<string, string> = {};

      snapshot.docs.forEach((doc) => {
        const data: DocumentData = doc.data();
        if (data.date?.startsWith(selectedMonth) && data.employees?.[employee.uId]) {
          records[data.date] = data.employees[employee.uId].status;
        }
      });

      setAttendanceRecords(records);
      setIsLoading(false);
    });

    return () => unsub();
  }, [selectedMonth, employee.uId]);

  /* ================== CURRENT MONTH SUMMARY ================== */
  const { presentDays, halfDays, absentDays, leaveDays, holidayDays, payableDays } = useMemo(() => {
    let present = 0;
    let half = 0;
    let leaves = 0;
    let holidays = 0;
    let payable = 0;

    Object.values(attendanceRecords).forEach((status) => {
      if (status === "present") {
        present++;
        payable += 1;
      } else if (status === "half-day") {
        half++;
        payable += 0.5;
      } else if (status === "leave") {
        leaves++;
        payable += 1;
      } else if (status === "holiday") {
        holidays++;
        payable += 1;
      }
    });

    return {
      presentDays: present,
      halfDays: half,
      leaveDays: leaves,
      holidayDays: holidays,
      absentDays: daysInMonth - present - half - leaves - holidays,
      payableDays: payable,
    };
  }, [attendanceRecords, daysInMonth]);

  const currentMonthSalary = payableDays * salaryPerDay;

  /* ================== PREVIOUS MONTH SALARY ================== */
  useEffect(() => {
    const [y, m] = selectedMonth.split("-");
    const prevDate = new Date(Number(y), Number(m) - 2);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const prevMonthDays = getDaysInMonth(prevMonth);
    const prevMonthlySalary = getSalaryForMonth(employee, prevMonth);
    const prevSalaryPerDay = prevMonthlySalary / prevMonthDays;

    const unsub = onSnapshot(collection(firestore, "attendance"), (snapshot) => {
      let payable = 0;

      snapshot.docs.forEach((doc) => {
        const data: DocumentData = doc.data();
        if (data.date?.startsWith(prevMonth) && data.employees?.[employee.uId]) {
          payable += getAttendanceValue(data.employees[employee.uId].status);
        }
      });

      setLastMonthSalary(payable * prevSalaryPerDay);
    });

    return () => unsub();
  }, [selectedMonth, employee.salary, employee.uId, employee.salaryAmountHistory]);

  /* ================== TABLE DATES ================== */
  const monthDates = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      return `${selectedMonth}-${String(i + 1).padStart(2, "0")}`;
    });
  }, [selectedMonth, daysInMonth]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-500 text-white";
      case "half-day":
        return "bg-yellow-500 text-white";
      case "leave":
        return "bg-purple-500 text-white";
      case "holiday":
        return "bg-blue-500 text-white";
      default:
        return "bg-red-500 text-white";
    }
  };

  /* ================== LOADER ================== */
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  /* ================== UI ================== */
  return (
    <div className="p-4 space-y-6">
      {/* Month Selector */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="text-sm block mb-1">Select Month</label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Current Month Salary</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            ₹{currentMonthSalary.toFixed(2)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Month Salary</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            ₹{lastMonthSalary.toFixed(2)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p>✅ Present: {presentDays}</p>
            <p>🌓 Half Day: {halfDays}</p>
            <p>🏖️ Leave: {leaveDays}</p>
            <p>🎉 Holiday: {holidayDays}</p>
            <p>❌ Absent: {absentDays}</p>
            <div className="mt-2 pt-2 border-t font-semibold">
              <p>💰 Payable Days: {payableDays}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="border px-3 py-2">Date</th>
              <th className="border px-3 py-2">Day</th>
              <th className="border px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {monthDates.map((date) => {
              const status = attendanceRecords[date] || "absent";
              return (
                <tr key={date}>
                  <td className="border px-3 py-2">{date.split("-")[2]}</td>
                  <td className="border px-3 py-2">{getDayName(date)}</td>
                  <td className="border px-3 py-2">
                    <Badge className={getStatusColor(status)}>
                      {status === "present"
                        ? "Present"
                        : status === "half-day"
                          ? "Half Day"
                          : status === "leave"
                            ? "Leave"
                            : status === "holiday"
                              ? "Holiday"
                              : "Absent"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
