"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import Pagination from "@/components/shared/Pagination";
import TableSkeleton from "@/components/shared/skeletons/TableSkeleton";
import { getTaskColumns, RawTask, Task } from "./column";
import { useAuth } from "@/context/AuthProvider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, ChevronDown, ChevronRight, X } from "lucide-react";
import { cn, convertTo12Hour } from "@/lib/utils";
import { format, isWithinInterval } from "date-fns";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select } from "@radix-ui/react-select";
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { STATUS_OPTIONS } from "../types";

interface Shoot {
  id: string;
  date: string;
  time: string;
  ritual: string;
}

export default function TasksTable() {
  const { role, user } = useAuth();
  const isStaff = role?.toLowerCase() === "staff";
  const [isLoading, setIsLoading] = useState(true);
  const [flatTasks, setFlatTasks] = useState<Task[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "deliveryDate", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    assignedDate: false,
    createdAt: false,
    employeeName: !isStaff,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [searchValue, setSearchValue] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [projectsMap, setProjectsMap] = useState<
    Record<string, { name: string; status: string; shoots: Shoot[] }>
  >({});

  // columns (inline for clarity)
  const columns = getTaskColumns();

  const table = useReactTable({
    data: flatTasks,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredData = useMemo(() => {
    let result = flatTasks;

    // Filter by search value (task name)
    if (searchValue) {
      result = result.filter((task) => task.name.toLowerCase().includes(searchValue.toLowerCase()));
    }

    // Filter by date range (delivery date)
    if (dateRange?.from) {
      result = result.filter((task) => {
        if (!task.deliveryDate) return false;
        if (dateRange.to) {
          return isWithinInterval(task.deliveryDate, {
            start: dateRange.from!,
            end: dateRange.to,
          });
        }
        return task.deliveryDate >= dateRange.from!;
      });
    }

    // Filter by status
    if (statusFilter && statusFilter !== "All") {
      result = result.filter((task) => task.status === statusFilter);
    }

    return result;
  }, [searchValue, dateRange, statusFilter, flatTasks]);

  // Subscribe to users collection to build map userId -> name
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(firestore, "users"), (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((d) => {
        const dt = d.data();
        map[d.id] = dt.name || dt.email || "Unknown";
      });
      setUsersMap(map);
    });
    return () => unsubUsers();
  }, []);

  // Subscribe to projects collection first
  useEffect(() => {
    const unsubProjects = onSnapshot(collection(firestore, "projects"), (snap) => {
      const map: Record<string, { name: string; status: string; shoots: [] }> = {};
      snap.forEach((doc) => {
        const data = doc.data();
        map[doc.id] = {
          name: data.projectName ?? "",
          status: data.status ?? "",
          shoots: data.shoots ?? [],
        };
      });
      setProjectsMap(map);
    });

    return () => unsubProjects();
  }, []);

  // Subscribe to task collection (one doc per user, each has tasks array)
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    let unsub: () => void;

    if (isStaff) {
      const userDocRef = doc(firestore, "task", user.uid);

      unsub = onSnapshot(userDocRef, (docSnap) => {
        const all: Task[] = [];

        if (docSnap.exists()) {
          const docData = docSnap.data() || {};
          const tasks: RawTask[] = Array.isArray(docData.tasks) ? docData.tasks : [];

          tasks.forEach((t) => {
            if (t.type !== "shoot") return;
            if (!t.projectId) return console.warn(`Task ${t.taskId} missing projectId.`);

            const project = projectsMap[t.projectId];
            if (!project || project.shoots.every((shoot) => shoot.id !== t.shootId)) {
              console.warn(`Project ${t.projectId} not found for task ${t.taskId}.`);
              return;
            }

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const assignedDate = new Date(t.assignedDate || now);
            const createdAt = new Date(t.createdAt || now);
            const shoot = project.shoots.find((s) => s.id === t.shootId);

            const deliveryDate = shoot ? new Date(shoot.date) : undefined;
            const eventTime = shoot?.time;
            const ritual = shoot?.ritual;

            let projectStatus = "Pending";
            if (["Cancelled", "Postponed", "Not Confirmed"].includes(project.status)) {
              projectStatus = project.status;
            } else if (deliveryDate) {
              if (now.getTime() > deliveryDate.getTime()) {
                projectStatus = "Completed";
              } else if (now.toDateString() === deliveryDate.toDateString()) {
                projectStatus = "Ongoing";
              }
            }

            const name = `${project.name}_${ritual}`;

            all.push({
              id: t.taskId,
              raw: t,
              name,
              employeeId: t.employeeId || user.uid,
              employeeName: usersMap[user.uid],
              deliveryDate,
              assignedDate,
              eventTime,
              createdAt,
              status: projectStatus,
              projectId: t.projectId,
              shootId: t.shootId,
              role: t.role,
            });
          });
        }

        all.sort((a, b) => (b.deliveryDate?.getTime() ?? 0) - (a.deliveryDate?.getTime() ?? 0));
        setFlatTasks(all);
        setIsLoading(false);
      });
    } else {
      // -----------------------------------------
      // ✅ ADMIN / MANAGER → Fetch entire task collection
      // -----------------------------------------
      unsub = onSnapshot(collection(firestore, "task"), (snapshot) => {
        const all: Task[] = [];

        snapshot.forEach((docSnap) => {
          const userId = docSnap.id;
          const docData = docSnap.data() || {};
          const tasks: RawTask[] = Array.isArray(docData.tasks) ? docData.tasks : [];

          tasks.forEach((t) => {
            if (t.type !== "shoot") return;
            if (!t.projectId) return console.warn(`Task ${t.taskId} missing projectId.`);

            const project = projectsMap[t.projectId];
            if (!project || project.shoots.every((shoot) => shoot.id !== t.shootId)) {
              console.warn(`Project ${t.projectId} not found for task ${t.taskId}.`);
              return;
            }

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const assignedDate = new Date(t.assignedDate || now);
            const createdAt = new Date(t.createdAt || now);
            const shoot = project.shoots.find((s) => s.id === t.shootId);

            const deliveryDate = shoot ? new Date(shoot.date) : undefined;
            const eventTime = shoot?.time;
            const ritual = shoot?.ritual;

            let projectStatus = "Pending";
            if (["Cancelled", "Postponed", "Not Confirmed"].includes(project.status)) {
              projectStatus = project.status;
            } else if (deliveryDate) {
              if (now.getTime() > deliveryDate.getTime()) {
                projectStatus = "Completed";
              } else if (now.toDateString() === deliveryDate.toDateString()) {
                projectStatus = "Ongoing";
              }
            }

            const name = `${project.name}_${ritual}`;

            all.push({
              id: t.taskId,
              raw: t,
              name,
              employeeId: t.employeeId || userId,
              employeeName: usersMap[userId],
              deliveryDate,
              assignedDate,
              eventTime,
              createdAt,
              status: projectStatus,
              projectId: t.projectId,
              shootId: t.shootId,
              role: t.role,
            });
          });
        });

        all.sort((a, b) => (b.deliveryDate?.getTime() ?? 0) - (a.deliveryDate?.getTime() ?? 0));
        setFlatTasks(all);
        setIsLoading(false);
      });
    }

    return () => unsub && unsub();
  }, [user, isStaff, usersMap, projectsMap]);

  const groupedTasks = useMemo(() => {
    const groups: Map<string, Task[]> = new Map();

    filteredData.forEach((task) => {
      const groupName = task.name;
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(task);
    });

    return Array.from(groups.entries()).map(([name, tasks]) => ({
      name,
      tasks,
    }));
  }, [filteredData]);

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchValue("");
    setDateRange(undefined);
    setStatusFilter("All");
  };

  const visibleColumns = table.getVisibleFlatColumns();
  const hasActiveFilters = searchValue || dateRange?.from || statusFilter !== "All";

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Outdoor Tasks</h1>
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 py-4">
            <Input
              placeholder="Search by task name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="max-w-sm"
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Filter by event date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="h-9 px-3">
                <X className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>

          {/* Grouped table with collapsible rows */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    <TableHead className="w-10"></TableHead>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {groupedTasks.length > 0 ? (
                  groupedTasks.map((group) => {
                    const isExpanded = expandedGroups.has(group.name);

                    return (
                      <React.Fragment key={group.name}>
                        {/* Group Header Row - Clickable to expand */}
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50 bg-muted/30 font-medium"
                          onClick={() => toggleGroup(group.name)}
                        >
                          <TableCell className="w-10">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>

                          <TableCell></TableCell>
                          <TableCell colSpan={2}>
                            {group.name}
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              ({group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"})
                            </span>
                          </TableCell>
                          {!isStaff && <TableCell>—</TableCell>}
                          <TableCell>—</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell>
                            <span
                              className={
                                {
                                  Pending: "text-yellow-600",
                                  Ongoing: "text-blue-600",
                                  Completed: "text-green-600",
                                  Cancelled: "text-red-600",
                                  Postponed: "text-purple-600",
                                }[group.tasks[0].status] || ""
                              }
                            >
                              {group.tasks[0].status}
                            </span>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Content - Individual Tasks */}
                        {isExpanded &&
                          group.tasks.map((task, taskIndex) => (
                            <TableRow key={task.id} className="bg-background">
                              <TableCell className="w-10"></TableCell>
                              <TableCell>{taskIndex + 1}</TableCell>
                              <TableCell>{task.name}</TableCell>
                              {!isStaff && <TableCell>{task.employeeName}</TableCell>}
                              <TableCell>{task.role}</TableCell>
                              <TableCell>
                                {task.deliveryDate ? format(task.deliveryDate, "dd/MM/yyyy") : "-"}
                              </TableCell>
                              <TableCell>{convertTo12Hour(task.eventTime)}</TableCell>
                              <TableCell>
                                <span
                                  className={
                                    {
                                      Pending: "text-yellow-600",
                                      Ongoing: "text-blue-600",
                                      Completed: "text-green-600",
                                      Cancelled: "text-red-600",
                                      Postponed: "text-purple-600",
                                    }[task.status] || ""
                                  }
                                >
                                  {task.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Pagination table={table} />
    </div>
  );
}
