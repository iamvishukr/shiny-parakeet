"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collection, doc, getDocs, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { toast } from "sonner";
import { getCurrentMonth, getDaysInMonth, getDayName } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import { ClientOnly } from "@/components/ClientOnly";
import { months, years } from "../types";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  uId: string;
  name: string;
  email: string;
  accessLevelMap: Record<string, boolean>;
  userType: string;
  employmentType?: string;
}

interface AttendanceEmployee {
  employeeId: string;
  employeeName: string;
  status: "present" | "absent" | "half-day" | "leave" | "holiday";
  timestamp: Date;
}

interface AttendanceDocument {
  date: string;
  day: string;
  employees: Record<string, AttendanceEmployee>;
  createdAt: Date;
  updatedAt: Date;
}

export default function AddAttendancePage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, string>>>({});
  const [manuallyMarkedDays, setManuallyMarkedDays] = useState<Set<string>>(new Set());
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [includeFreelancers, setIncludeFreelancers] = useState(false);

  // Get current month and year
  const currentMonth = getCurrentMonth(); // "2025-01"
  const [initialYear, initialMonth] = currentMonth.split("-");

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonthOnly, setSelectedMonthOnly] = useState(initialMonth);

  useEffect(() => {
    setSelectedMonth(`${selectedYear}-${selectedMonthOnly}`);
  }, [selectedYear, selectedMonthOnly]);

  // Check if user has permission to edit attendance (admin or manager only)
  const checkPermission = useCallback(() => {
    if (!user || !role) {
      setHasPermission(false);
      return false;
    }

    const userRole = role.toLowerCase();
    const isAdminOrManager = ["admin", "manager"].includes(userRole);

    setHasPermission(isAdminOrManager);
    return isAdminOrManager;
  }, [user, role]);

  const loadEmployees = useCallback(async () => {
    try {
      const usersSnapshot = await getDocs(collection(firestore, "users"));
      const usersData = usersSnapshot.docs.map((doc) => ({
        uId: doc.id,
        ...doc.data(),
      })).filter((u: any) => u.profileStatus !== "Inactive") as User[];

      // Get current user's role
      const currentUserRole = role?.toLowerCase() || "staff";

      if (["admin", "manager"].includes(currentUserRole)) {
        // Admin and manager can see all users
        setEmployees(usersData);
      } else if (user) {
        // Regular staff can only see themselves
        setEmployees(usersData.filter((u) => u.uId === user.uid));
      } else {
        // If no user, show empty
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  }, [user, role]);

  const filteredEmployees = useMemo(() => {
    if (includeFreelancers) return employees;
    return employees.filter((e) => e.employmentType !== "Freelancer");
  }, [employees, includeFreelancers]);

  const loadExistingAttendance = useCallback(async () => {
    if (!selectedMonth || employees.length === 0) return;

    setIsLoading(true);
    try {
      const existingData: Record<string, Record<string, string>> = {};
      const markedDays = new Set<string>();
      const daysInSelectedMonth = getDaysInMonth(selectedMonth);

      // Initialize empty data
      employees.forEach((employee) => {
        existingData[employee.uId] = {};
      });

      // Load existing attendance records from Firebase
      for (let day = 1; day <= daysInSelectedMonth; day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
        const docRef = doc(firestore, "attendance", dateStr);

        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const attendanceRecord = docSnap.data() as AttendanceDocument;
            if (attendanceRecord.employees) {
              // Update existing data with saved attendance
              employees.forEach((employee) => {
                if (attendanceRecord.employees[employee.uId]) {
                  const status = attendanceRecord.employees[employee.uId].status;
                  existingData[employee.uId][dateStr] = status;
                  // Mark this day as manually marked
                  markedDays.add(`${employee.uId}-${dateStr}`);
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error loading attendance for ${dateStr}:`, error);
        }
      }

      setAttendanceData(existingData);
      setManuallyMarkedDays(markedDays);
    } catch (error) {
      console.error("Error loading existing attendance:", error);
      toast.error("Failed to load existing attendance");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, employees]);

  useEffect(() => {
    setSelectedMonth(currentMonth);
    loadEmployees();
    checkPermission();
  }, [currentMonth, loadEmployees, checkPermission]);

  useEffect(() => {
    if (selectedMonth && employees.length > 0) {
      loadExistingAttendance();
    }
  }, [selectedMonth, employees, loadExistingAttendance]);

  // Check permission on initial load and redirect if unauthorized
  useEffect(() => {
    if (user && role) {
      const userRole = role.toLowerCase();
      if (!["admin", "manager"].includes(userRole)) {
        toast.error("You don't have permission to access this page");
        router.push("/attendance");
      }
    }
  }, [user, role, router]);

  const handleAttendanceChange = (employeeId: string, date: string, status: string) => {
    // Only allow changes if user has permission
    if (!hasPermission) {
      toast.error("You don't have permission to update attendance");
      return;
    }

    const markedKey = `${employeeId}-${date}`;
    const newMarkedDays = new Set(manuallyMarkedDays);

    if (status === "dot") {
      // If setting to dot (not marked), remove from marked days and delete the record
      newMarkedDays.delete(markedKey);
      setAttendanceData((prev) => {
        const newData = { ...prev };
        if (newData[employeeId] && newData[employeeId][date]) {
          delete newData[employeeId][date];
        }
        return newData;
      });
    } else {
      // If setting to present/absent/half-day, add to marked days
      newMarkedDays.add(markedKey);
      setAttendanceData((prev) => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: status,
        },
      }));
    }

    setManuallyMarkedDays(newMarkedDays);
  };

  const handleSubmit = async () => {
    // Check if user has permission to add attendance (admin or manager only)
    if (!hasPermission) {
      toast.error("You don't have permission to update attendance");
      return;
    }

    setIsLoading(true);
    try {
      // Save attendance for each day where we have manually marked data
      for (let day = 1; day <= getDaysInMonth(selectedMonth); day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
        const dayName = getDayName(dateStr);

        const docRef = doc(firestore, "attendance", dateStr);
        const existingDoc = await getDoc(docRef);

        let dailyAttendance: Partial<AttendanceDocument>;

        if (existingDoc.exists()) {
          // Document exists, start with existing data
          const existingData = existingDoc.data() as AttendanceDocument;
          dailyAttendance = {
            ...existingData,
            updatedAt: new Date(),
          };

          // Ensure employees object exists
          if (!dailyAttendance.employees) {
            dailyAttendance.employees = {};
          }
        } else {
          // Document doesn't exist, create new one
          dailyAttendance = {
            date: dateStr,
            day: dayName,
            employees: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }

        // Update employee attendance only for manually marked entries
        employees.forEach((employee) => {
          const markedKey = `${employee.uId}-${dateStr}`;
          if (manuallyMarkedDays.has(markedKey)) {
            const status = attendanceData[employee.uId]?.[dateStr];
            if (status && status !== "dot") {
              dailyAttendance.employees![employee.uId] = {
                employeeId: employee.uId,
                employeeName: employee.name,
                status: status as "present" | "absent" | "half-day" | "leave" | "holiday",
                timestamp: new Date(),
              };
            } else {
              // Remove if status is dot or undefined
              if (dailyAttendance.employees && dailyAttendance.employees[employee.uId]) {
                delete dailyAttendance.employees[employee.uId];
              }
            }
          } else {
            // Remove employee from attendance record if not manually marked
            if (dailyAttendance.employees && dailyAttendance.employees[employee.uId]) {
              delete dailyAttendance.employees[employee.uId];
            }
          }
        });

        // Only save if there are employees with attendance data for this day
        if (Object.keys(dailyAttendance.employees!).length > 0) {
          await setDoc(docRef, dailyAttendance);
        } else {
          // If no employees have attendance data, delete the document to save space
          await deleteDoc(docRef);
        }
      }

      toast.success("Attendance saved successfully!");
      setIsEditing(false);
      // router.push("/attendance");
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setIsLoading(false);
    }
  };

  // Custom Select component with dot option
  const StatusSelect = ({
    value,
    onValueChange,
    isMarked,
    disabled = false,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    isMarked: boolean;
    disabled?: boolean;
  }) => {
    const displayValue = isMarked ? value : "dot";

    return (
      <Select value={displayValue} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={`w-20 h-8 ${getStatusColorClass(displayValue)} font-medium ${disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
        >
          <SelectValue>
            <div className="flex items-center justify-center w-full">
              {getStatusDisplayText(displayValue)}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dot" className="flex items-center">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 text-gray-400 text-lg">•</span>
              <span>Not Marked</span>
            </div>
          </SelectItem>
          <SelectItem value="present" className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Present</span>
            </div>
          </SelectItem>
          <SelectItem value="absent" className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Absent</span>
            </div>
          </SelectItem>
          <SelectItem value="half-day" className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Half Day</span>
            </div>
          </SelectItem>
          <SelectItem value="leave" className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Leave</span>
            </div>
          </SelectItem>
          <SelectItem value="holiday" className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Holiday</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    );
  };

  // Check if a day is manually marked for an employee
  const isManuallyMarked = (employeeId: string, dateStr: string) => {
    return manuallyMarkedDays.has(`${employeeId}-${dateStr}`);
  };

  // Get current status for display
  const getCurrentStatus = (employeeId: string, dateStr: string) => {
    const isMarked = isManuallyMarked(employeeId, dateStr);
    if (!isMarked) return "dot";
    return attendanceData[employeeId]?.[dateStr] || "dot";
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Attendance</h1>
            <p className="text-muted-foreground">
              {hasPermission
                ? "View and edit attendance for all employees for the selected month"
                : "View attendance for the selected month"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ClientOnly>
        <div className="space-y-4">
          {/* Month Selector + Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center space-x-4">
              <div>
                <Label>Year</Label>
                <Select
                  value={selectedYear}
                  onValueChange={(year) => setSelectedYear(year)}
                  disabled={isLoading}
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
                  onValueChange={(month) => setSelectedMonthOnly(month)}
                  disabled={isLoading}
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-freelancers-add"
                checked={includeFreelancers}
                onCheckedChange={(checked) => setIncludeFreelancers(checked === true)}
              />
              <Label htmlFor="include-freelancers-add">Include Freelancers</Label>
            </div>

            <div className="flex items-center space-x-2">
              {!isEditing && hasPermission ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2"
                  disabled={isLoading}
                >
                  <Edit3 className="h-4 w-4" />
                  <span>{isLoading ? "Loading..." : "Edit Attendance"}</span>
                </Button>
              ) : isEditing && hasPermission ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      loadExistingAttendance();
                    }}
                    className="flex items-center space-x-2"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isLoading ? "Saving..." : "Save Attendance"}</span>
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {/* Permission Warning for non-admin/manager */}
          {!hasPermission && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">View Only Mode</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      You are viewing attendance in read-only mode. Only administrators and managers
                      can edit attendance records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Table */}
          <div className="relative overflow-hidden border rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading attendance data...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {/* Fixed Employee Name Column */}
                      <th className="sticky left-0 z-10 p-2 text-left font-medium min-w-32 bg-muted/50 border-r">
                        Employee
                      </th>

                      {/* Scrollable Date Columns */}
                      {Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => {
                        const day = i + 1;
                        const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
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
                      <tr key={employee.uId} className="border-b group">
                        {/* Fixed Employee Name Cell */}
                        <td className="sticky left-0 z-10 p-2 font-medium bg-white border-r">
                          {employee.name}
                        </td>

                        {/* Scrollable Date Cells */}
                        {Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => {
                          const day = i + 1;
                          const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                          const isMarked = isManuallyMarked(employee.uId, dateStr);
                          const currentStatus = getCurrentStatus(employee.uId, dateStr);

                          return (
                            <td key={day} className="p-2 text-center">
                              {isEditing && hasPermission ? (
                                <StatusSelect
                                  value={currentStatus}
                                  onValueChange={(value) =>
                                    handleAttendanceChange(employee.uId, dateStr, value)
                                  }
                                  isMarked={isMarked}
                                  disabled={!hasPermission}
                                />
                              ) : (
                                <div className="flex items-center justify-center">
                                  <span
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getStatusColorClass(
                                      currentStatus
                                    )}`}
                                  >
                                    {getStatusText(currentStatus)}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Legend:</span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>Present</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span>Absent</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span>Half Day</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              <span>Leave</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span>Holiday</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 text-gray-400">•</span>
              <span>Not Marked (Absent)</span>
            </span>
          </div>
        </div>
      </ClientOnly>
    </div>
  );
}

// Helper functions for status display
function getStatusColorClass(status: string) {
  switch (status) {
    case "present":
      return "bg-green-500 text-white hover:bg-green-600 border-green-600";
    case "absent":
      return "bg-red-500 text-white hover:bg-red-600 border-red-600";
    case "half-day":
      return "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-600";
    case "leave":
      return "bg-purple-500 text-white hover:bg-purple-600 border-purple-600";
    case "holiday":
      return "bg-blue-500 text-white hover:bg-blue-600 border-blue-600";
    case "dot":
      return "bg-gray-200 text-gray-400 hover:bg-gray-300 border-gray-300";
    default:
      return "bg-gray-200 text-gray-400 hover:bg-gray-300 border-gray-300";
  }
}

function getStatusText(status: string) {
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
      return "•";
    default:
      return "•";
  }
}

function getStatusDisplayText(status: string) {
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
      return "•";
    default:
      return "•";
  }
}
