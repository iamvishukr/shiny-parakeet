"use client";

import type React from "react";
import { useState, useMemo, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { Employee } from "./types";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface EmployeeSalaryProps {
  employee: Employee;
}

interface SalaryRecord {
  month: string; // YYYY-MM format
  paidSalary: number;
  status: string;
  transactionId: string;
}

const ROWS_PER_PAGE = 10;

const EmployeeSalary: React.FC<EmployeeSalaryProps> = ({ employee }) => {
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSalaryHistory = async () => {
      if (!employee.uId) return;

      setIsLoading(true);
      try {
        const salaryColRef = collection(firestore, "users", employee.uId, "salaryHistory");
        const snapshot = await getDocs(salaryColRef);

        const records: SalaryRecord[] = snapshot.docs.map(
          (doc) =>
            ({
              transactionId: doc.id,
              ...doc.data(),
            } as SalaryRecord)
        );

        // Sort by month descending (YYYY-MM format)
        records.sort((a, b) => (b.month || "").localeCompare(a.month || ""));

        setSalaryRecords(records);
      } catch (error) {
        console.error("Error fetching salary history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalaryHistory();
  }, [employee.uId]);

  // Filter salary data based on date range
  const filteredData = useMemo(() => {
    return salaryRecords.filter((record) => {
      if (!record.month) return false;

      // Convert YYYY-MM to Date for comparison
      const [year, month] = record.month.split("-");
      const recordDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1);

      if (fromDate && recordDate < fromDate) return false;
      if (toDate && recordDate > toDate) return false;

      return true;
    });
  }, [salaryRecords, fromDate, toDate]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filteredData.slice(start, start + ROWS_PER_PAGE);
  }, [filteredData, page]);

  // Helper to format YYYY-MM to "Month Year"
  const formatMonthYear = (monthKey: string) => {
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
    const [year, month] = monthKey.split("-");
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1);
    return format(date, "MMMM yyyy");
  };

  return (
    <div className="p-2">
      {/* Header with date range filters */}
      <div className="flex justify-end gap-2 mb-4">
        {/* From Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[150px] justify-start text-left font-normal bg-transparent"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, "MMM yyyy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Calendar
              mode="single"
              selected={fromDate ?? undefined}
              onSelect={(date) => {
                setFromDate(date ?? null);
                setPage(1); // reset pagination
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* To Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[150px] justify-start text-left font-normal bg-transparent"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, "MMM yyyy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Calendar
              mode="single"
              selected={toDate ?? undefined}
              onSelect={(date) => {
                setToDate(date ?? null);
                setPage(1); // reset pagination
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Scrollable Table */}
      <div className="max-h-[60vh] overflow-y-auto border rounded-md">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border px-3 py-2 text-left">Month-Year</th>
              <th className="border px-3 py-2 text-left">Salary Status</th>
              <th className="border px-3 py-2 text-left">Paid Salary</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center py-3 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((record) => (
                <tr key={record.transactionId}>
                  <td className="border px-3 py-2">{formatMonthYear(record.month)}</td>
                  <td
                    className={`border px-3 py-2 capitalize ${
                      record.status === "paid" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {record.status}
                  </td>
                  <td className="border px-3 py-2">₹{record.paidSalary?.toLocaleString() || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-3 text-gray-500">
                  No salary data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-3 text-sm">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSalary;
