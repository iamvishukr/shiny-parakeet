"use client";

import React, { useState } from "react";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { Calendar, ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import { CSVLink } from "react-csv";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, Column } from "@tanstack/react-table";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface TableActionsProps<T extends object> {
  table: Table<T>;
  data: T[];
  menuContent?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  startDate?: string;
  endDate?: string;
  setStartDate?: (date: string) => void;
  setEndDate?: (date: string) => void;
  resetDateFilter?: () => void;
  searchPlaceholder?: string;
  statusFilter?: boolean;
  searchParam?: string;
  employeeParam?: string;
  employeeParamPlaceholder?: string;
  dateColumn?: string; // column name for date filtering
  showDateFilter?: boolean;
  showAdd?: boolean;
  // defaultFilterMonths?: number; // New prop for default month filter
}

function TableActions<T extends object>({
  table,
  data,
  menuContent,
  onOpenChange,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  resetDateFilter,
  searchPlaceholder = "Filter by Name...",
  statusFilter = false,
  searchParam = "name",
  dateColumn = "dateOfEvent", // default column name
  showDateFilter = true,
  employeeParam,
  employeeParamPlaceholder = "Search By Employee",
  showAdd = true,
}: // Default to 1 month
  TableActionsProps<T>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const [open, setOpen] = useState(false);

  // Apply date filter to the table column
  const applyDateFilter = () => {
    const dateCol = table.getColumn(dateColumn);
    if (dateCol) {
      dateCol.setFilterValue(startDate || endDate ? { startDate, endDate } : undefined);
    }
    setOpen(false);
  };

  // Reset date filter in the table column
  const handleResetDateFilter = () => {
    const dateCol = table.getColumn(dateColumn);
    if (dateCol) {
      dateCol.setFilterValue(undefined);
    }
    if (resetDateFilter) resetDateFilter();
  };

  // Removed the useEffect that applied default 1 month filter

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-4 flex-wrap">
      {/* ---- Left Section: Add + CSV + Actions ---- */}
      <div className="flex justify-between sm:justify-start items-center gap-2">
        {onOpenChange && showAdd && (
          <Button onClick={() => onOpenChange(true)}>
            Add New
            <Plus className="ml-2 h-4 w-4" />
          </Button>
        )}
        <div className="flex sm:hidden gap-1">
          <CSVLink data={data} filename="clients.csv">
            <Button variant="outline" size="icon">
              CSV
            </Button>
          </CSVLink>
          {menuContent && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={selectedRows.length === 0}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              {menuContent}
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ---- Right Section: Filters + Search + Columns ---- */}
      <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center flex-wrap">
        {/* 📅 Date Range Filter */}
        {showDateFilter && setEndDate && setStartDate && (
          <div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <div
                  className="w-[280px] h-9 flex items-center justify-between border rounded-md px-3 text-sm cursor-pointer bg-background"
                  onClick={() => setOpen(true)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate && endDate ? `${startDate} → ${endDate}` : "Select Date Range"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </div>
              </PopoverTrigger>

              <PopoverContent className="w-[280px] p-3 space-y-3" align="start">
                {/* 🔹 Quick Buttons */}
                <div className="flex gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const today = new Date().toISOString().split("T")[0];
                      setStartDate(today);
                      setEndDate(today);
                    }}
                  >
                    Today
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const now = new Date();
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                        .toISOString()
                        .split("T")[0];
                      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                        .toISOString()
                        .split("T")[0];

                      setStartDate(firstDay);
                      setEndDate(lastDay);
                    }}
                  >
                    This Month
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const now = new Date();
                      const firstDay = new Date(now.getFullYear(), 0, 1)
                        .toISOString()
                        .split("T")[0];
                      const lastDay = new Date(now.getFullYear(), 11, 31)
                        .toISOString()
                        .split("T")[0];

                      setStartDate(firstDay);
                      setEndDate(lastDay);
                    }}
                  >
                    This Year
                  </Button>
                </div>

                {/* 🔹 Date Inputs */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    From
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs block"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">To</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs block"
                  />
                </div>

                <div className="flex justify-between mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleResetDateFilter}
                  >
                    Reset
                  </Button>

                  <Button size="sm" className="text-xs" onClick={applyDateFilter}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* 🔍 Search */}
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchParam)?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn(searchParam ?? "name")?.setFilterValue(e.target.value)}
          className="max-w-sm w-full sm:w-[200px]"
        />

        {employeeParam && (
          <Input
            placeholder={employeeParamPlaceholder}
            value={(table.getColumn(employeeParam)?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn(employeeParam)?.setFilterValue(e.target.value)}
            className="max-w-sm w-full sm:w-[200px]"
          />
        )}

        {/* ⚙️ Status Filter */}
        {statusFilter && (
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) =>
              table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* 📊 Column Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Columns <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((col: Column<T, unknown>) => col.getCanHide())
              .map((col: Column<T, unknown>) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(val) => col.toggleVisibility(!!val)}
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 🧾 Export + Bulk Actions */}
        <div className="hidden sm:flex gap-1">
          <CSVLink data={data} filename="clients.csv">
            <Button variant="outline">Export CSV</Button>
          </CSVLink>
          {menuContent && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={selectedRows.length === 0}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              {menuContent}
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

export default TableActions;
