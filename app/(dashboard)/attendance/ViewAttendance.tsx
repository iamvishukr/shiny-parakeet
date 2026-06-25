"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { toast } from "sonner";
import { DailyAttendance, EmployeeAttendanceSummary, months, years } from "./types";
import { getCurrentMonth, getDaysInMonth, getDayName } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import { ClientOnly } from "@/components/ClientOnly";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  uId: string;
  name: string;
  email: string;
  accessLevelMap: Record<string, boolean>;
  userType: string;
  employmentType?: string;
  profileStatus?: string;
}

interface ViewAttendanceProps {
  selectedMonth?: string;
}

export default function ViewAttendance({ selectedMonth }: ViewAttendanceProps) {
  const { user, role } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, DailyAttendance>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [includeFreelancers, setIncludeFreelancers] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Get current month and year
  const defaultMonth = getCurrentMonth();
  const [selectedYear, selectedMonthOnly] = currentMonth
    ? currentMonth.split("-")
    : defaultMonth.split("-");
  const daysInMonth = getDaysInMonth(currentMonth || defaultMonth);

  const loadEmployees = useCallback(async () => {
    try {
      const usersSnapshot = await getDocs(collection(firestore, "users"));
      const usersData = usersSnapshot.docs.map((doc) => ({
        uId: doc.id,
        ...doc.data(),
      })) as User[];

      // Filter users based on permissions - only show users that current user can manage
      if (user) {
        if (["manager", "admin"].includes(role?.toLowerCase() ?? "staff")) {
          setEmployees(usersData);
        } else {
          // If no permissions, show only current user
          setEmployees(usersData.filter((u) => u.uId === user.uid));
        }
      } else {
        setEmployees(usersData);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  }, [user, role]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (!includeFreelancers) {
      result = result.filter((e) => e.employmentType !== "Freelancer");
    }
    if (!includeInactive) {
      result = result.filter((e) => e.profileStatus !== "Inactive");
    }
    return result;
  }, [employees, includeFreelancers, includeInactive]);

  const loadAttendanceRecords = useCallback(() => {
    if (!currentMonth) {
      setIsLoading(false);
      return () => { };
    }

    setIsLoading(true);

    // Listen to the entire attendance collection and filter client-side
    const unsubscribe = onSnapshot(
      collection(firestore, "attendance"),
      (snapshot) => {
        const records: Record<string, DailyAttendance> = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          // Check if the date starts with the current month
          if (data.date && typeof data.date === "string" && data.date.startsWith(currentMonth)) {
            records[data.date] = {
              ...data,
              employees: data.employees || {},
            } as DailyAttendance;
          }
        });

        setAttendanceRecords(records);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading attendance records:", error);
        toast.error("Failed to load attendance records");
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [currentMonth]);

  useEffect(() => {
    const monthToSet = selectedMonth || defaultMonth;
    setCurrentMonth(monthToSet);
    loadEmployees();
  }, [selectedMonth, defaultMonth, loadEmployees]);

  useEffect(() => {
    if (currentMonth && employees.length > 0) {
      const unsubscribe = loadAttendanceRecords();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentMonth, employees.length, loadAttendanceRecords]);

  // Check if attendance is marked for an employee on a specific date
  const isAttendanceMarked = (employeeId: string, date: string) => {
    const record = attendanceRecords[date];
    return !!(record && record.employees && record.employees[employeeId]);
  };

  const getAttendanceStatus = (employeeId: string, date: string) => {
    const record = attendanceRecords[date];
    if (!record || !record.employees || !record.employees[employeeId]) {
      return "dot"; // Return "dot" for unmarked attendance
    }
    return record.employees[employeeId].status || "dot";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-500 text-white";
      case "absent":
        return "bg-red-500 text-white";
      case "half-day":
        return "bg-yellow-500 text-white";
      case "leave":
        return "bg-purple-500 text-white";
      case "holiday":
        return "bg-blue-500 text-white";
      case "dot":
      default:
        return "bg-transparent text-gray-400"; // Transparent background for dots
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "present":
        return "P";
      case "absent":
        return "A";
      case "half-day":
        return "H";
      case "leave":
        return "L";
      case "holiday":
        return "HO";
      case "dot":
      default:
        return "•"; // Dot symbol for unmarked
    }
  };

  const calculateEmployeeSummary = (employeeId: string): EmployeeAttendanceSummary => {
    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let unmarkedDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;

    // Count days in the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
      const status = getAttendanceStatus(employeeId, dateStr);

      switch (status) {
        case "present":
          presentDays++;
          break;
        case "half-day":
          halfDays++;
          break;
        case "absent":
          absentDays++;
          break;
        case "leave":
          leaveDays++;
          break;
        case "holiday":
          holidayDays++;
          break;
        case "dot":
        default:
          unmarkedDays++;
      }
    }

    return {
      employeeId,
      employeeName: employees.find((emp) => emp.uId === employeeId)?.name || "",
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      holidayDays,
      unmarkedDays,
      totalDays: daysInMonth,
    };
  };

  // Debug: Log current state
  console.log("Current State:", {
    currentMonth,
    employeesCount: employees.length,
    attendanceRecordsCount: Object.keys(attendanceRecords).length,
    attendanceRecords: Object.keys(attendanceRecords),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">Loading attendance records...</div>
    );
  }

  return (
    <ClientOnly>
      <div className="space-y-6">
        {/* Month Selector */}
        <div className="flex items-center space-x-4">
          <div>
            <Label>Year</Label>
            <Select
              value={selectedYear}
              onValueChange={(year) => {
                setCurrentMonth(`${year}-${selectedMonthOnly}`);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Month</Label>
            <Select
              value={selectedMonthOnly}
              onValueChange={(month) => {
                setCurrentMonth(`${selectedYear}-${month}`);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-freelancers-view"
              checked={includeFreelancers}
              onCheckedChange={(checked) => setIncludeFreelancers(checked === true)}
            />
            <Label htmlFor="include-freelancers-view">Include Freelancers</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-inactive-view"
              checked={includeInactive}
              onCheckedChange={(checked) => setIncludeInactive(checked === true)}
            />
            <Label htmlFor="include-inactive-view">Include Inactive Employees</Label>
          </div>
        </div>

        {/* Attendance Summary */}
        {filteredEmployees.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredEmployees.map((employee) => {
              const summary = calculateEmployeeSummary(employee.uId);
              return (
                <div key={employee.uId} className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-medium">{employee.name}</h3>
                  <div className="grid grid-cols-6 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-semibold">{summary.presentDays}</div>
                      <div className="text-xs text-muted-foreground">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-semibold">{summary.absentDays}</div>
                      <div className="text-xs text-muted-foreground">Absent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-600 font-semibold">{summary.halfDays}</div>
                      <div className="text-xs text-muted-foreground">Half Day</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-600 font-semibold">{summary.leaveDays}</div>
                      <div className="text-xs text-muted-foreground">Leave</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-600 font-semibold">{summary.holidayDays || 0}</div>
                      <div className="text-xs text-muted-foreground">Holiday</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 font-semibold">{summary.unmarkedDays}</div>
                      <div className="text-xs text-muted-foreground">None</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Attendance Table */}
        {filteredEmployees.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="flex overflow-x-auto">
              {/* Fixed Employee Column */}
              <div className="sticky left-0 bg-white border-r shadow-r z-10">
                <table className="text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left font-medium min-w-32 w-32">Employee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.uId} className="border-b">
                        <td className="p-[10px] font-medium bg-white h-12 whitespace-nowrap overflow-hidden text-ellipsis">
                          {employee.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Scrollable Date Columns */}
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
                        const dayName = getDayName(dateStr);
                        return (
                          <th key={day} className="p-2 text-center font-medium min-w-20">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">{dayName}</span>
                              <span>{day}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.uId} className="border-b">
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;

                          // Check if it's a future date
                          const today = new Date();
                          const currentMonthYear = currentMonth.split("-");
                          const cellDate = new Date(
                            Number(currentMonthYear[0]),
                            Number(currentMonthYear[1]) - 1,
                            day,
                          );

                          const isFuture = cellDate > today;
                          const currentStatus = getAttendanceStatus(employee.uId, dateStr);
                          const isMarked = isAttendanceMarked(employee.uId, dateStr);

                          const showFutureMark = isFuture && (currentStatus === "leave" || currentStatus === "half-day");

                          return (
                            <td key={day} className="p-2 text-center h-12">
                              {isFuture && !showFutureMark ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mx-auto ${getStatusColor(
                                    currentStatus,
                                  )} ${!isMarked ? "border border-gray-300" : ""}`}
                                >
                                  {getStatusText(currentStatus)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            No employees found or no permission to view attendance.
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Legend:</span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>P - Present</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span>A - Absent</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            <span>H - Half Day</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            <span>L - Leave</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span>HO - Holiday</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 text-gray-400">•</span>
            <span>Not Marked</span>
          </span>
        </div>
      </div>
    </ClientOnly>
  );
}
