import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChevronDown, MoreHorizontal, Plus, Calendar } from "lucide-react";
import { CSVLink } from "react-csv";
import { Table } from "@tanstack/react-table";
import { Project } from "../types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthProvider";

interface ProjectsTableProps {
  table: Table<Project>;
  data: Project[];
  onEdit: (project: Project) => void;
  onView: (project: Project) => void;
  onBulkDelete: (projects: Project[]) => void;
}

export function ProjectsTable({ table, data, onBulkDelete }: ProjectsTableProps) {
  const router = useRouter();
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const { role } = useAuth();

  // Get current date filter value
  const currentDateFilter = table.getColumn("dates")?.getFilterValue() as
    | { startDate: string; endDate: string }
    | undefined;

  const [startDate, setStartDate] = useState<string>(currentDateFilter?.startDate || "");
  const [endDate, setEndDate] = useState<string>(currentDateFilter?.endDate || "");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Sync with table filter state
  useEffect(() => {
    if (currentDateFilter) {
      setStartDate(currentDateFilter.startDate);
      setEndDate(currentDateFilter.endDate);
    }
  }, [currentDateFilter]);

  // Apply date filter to the table
  const applyDateFilter = () => {
    const dateColumn = table.getColumn("dates");
    if (dateColumn && startDate && endDate) {
      dateColumn.setFilterValue({ startDate, endDate });
    }
    setDatePopoverOpen(false);
  };

  // Reset date filter
  const resetDateFilter = () => {
    const dateColumn = table.getColumn("dates");
    if (dateColumn) {
      dateColumn.setFilterValue(undefined);
    }
    setStartDate("");
    setEndDate("");
    setDatePopoverOpen(false);
  };

  // Quick date range functions
  const setToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const setThisYear = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
      <div className="flex justify-between sm:justify-start items-center gap-4">
        <Button onClick={() => router.push("/projects/add")}>
          Add New Project
          <Plus className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
        {/* 📅 Date Range Filter */}
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Calendar className="mr-2 h-4 w-4" />
              {startDate && endDate ? `${startDate} → ${endDate}` : "Select Date Range"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 space-y-4" align="start">
            {/* Quick Date Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={setToday} className="text-xs">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={setThisMonth} className="text-xs">
                This Month
              </Button>
              {/* <Button variant="outline" size="sm" onClick={setLastMonth} className="text-xs">
                Last Month
              </Button>
              <Button variant="outline" size="sm" onClick={setLast30Days} className="text-xs">
                Last 30 Days
              </Button> */}
              <Button
                variant="outline"
                size="sm"
                onClick={setThisYear}
                className="text-xs col-span-2"
              >
                This Year
              </Button>
            </div>

            {/* Date Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">From Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs block"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">To Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs block"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={resetDateFilter}>
                Reset
              </Button>
              <Button size="sm" onClick={applyDateFilter}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* 🔍 Project Name Filter */}
        <Input
          placeholder="Filter by Project Name..."
          value={(table.getColumn("projectName")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("projectName")?.setFilterValue(e.target.value)}
          className="max-w-sm w-full sm:w-[200px]"
        />

        {/* ⚙️ Status Filter */}
        <Select
          value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
          onValueChange={(value) =>
            table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="ongoing">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* 📊 Column Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
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

        {/* 📤 Export + Bulk Actions */}
        <div className="hidden sm:flex gap-2">
          <CSVLink data={data} filename="projects.csv">
            <Button variant="outline">Export CSV</Button>
          </CSVLink>
          {role === "admin" && (<DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={selectedRows.length === 0}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => onBulkDelete(selectedRows.map((row) => row.original))}
                className="text-red-600"
              >
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>)}
        </div>
      </div>
    </div>
  );
}
