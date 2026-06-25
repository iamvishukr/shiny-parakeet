"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  Calendar,
  Users,
  Camera,
  FolderKanban,
  IndianRupee,
  Bot,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wallet,
  FileCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { fetchDashboardData, type DashboardData } from "@/lib/firebase-data-fetcher";
import { useAuth } from "@/context/AuthProvider";
import { Input } from "@/components/ui/input";
import MonthlyShootMatrixAllProjects from "./monthlyShootMatrix";
import MonthlyShootItemMatrix from "./monthlyShootMatrixAll";
import ProjectDeliverableStatusMatrix from "./projectDeliverableStatusMatrix";

// Professional color palette
const CHART_COLORS = {
  primary: "#2563eb",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0891b2",
  purple: "#7c3aed",
};

const STATUS_COLORS: Record<string, string> = {
  // Task statuses
  Completed: "#16a34a",
  completed: "#16a34a",
  Ongoing: "#2563eb",
  ongoing: "#2563eb",
  Pending: "#d97706",
  pending: "#d97706",
  Upcoming: "#8b5cf6",
  upcoming: "#8b5cf6",
  Today: "#0891b2",
  today: "#0891b2",
  // Project statuses
  Active: "#16a34a",
  active: "#16a34a",
  "In Progress": "#2563eb",
  "in-progress": "#2563eb",
  Done: "#7c3aed",
  done: "#7c3aed",
  Cancelled: "#dc2626",
  cancelled: "#dc2626",
};

const defaultData: DashboardData = {
  attendance: [],
  clients: [],
  deliverables: [],
  enquiry: [],
  events: [],
  packages: [],
  projects: [],
  salary: [],
  shoots: [],
  tasks: [],
  transactions: [],
  shootTasks: [],
  deliverableTasks: [],
  dueData: 0,
};

const FILTER_KEY = "dashboard_filter";
export default function DashboardPage() {
  const [filter, setFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "today"; // default
    return localStorage.getItem(FILTER_KEY) || "today";
  });
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(FILTER_KEY, filter);
    }
  }, [filter]);

  const [dashboardData, setDashboardData] = useState<DashboardData>(defaultData);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const { role } = useAuth();
  const isAdmin = role?.toLowerCase() === "admin";
  const isStaff = role?.toLowerCase() === "staff";

  const filterOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this-week", label: "This Week" },
    { value: "this-month", label: "This Month" },
    { value: "current-year", label: "Current Year" },
    { value: "previous-year", label: "Previous Year" },
    { value: "all-time", label: "All Time" },
    { value: "custom-range", label: "Custom Range" },
  ];

  useEffect(() => {
    if ((filter === "custom-range" || filter.includes("|")) && fromDate && toDate) {
      const encoded = `${fromDate}|${toDate}`;

      if (filter !== encoded) {
        setFilter(encoded);
      }
    }
  }, [fromDate, toDate, filter]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const data = await fetchDashboardData(filter);
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        setDashboardData(defaultData);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [filter]);

  const metrics = useMemo(() => {
    const totalClients = dashboardData.clients.reduce((acc, item) => acc + item.count, 0);

    // Projects - actual status is lowercase "pending"
    const pendingProjects = dashboardData.projects
      .filter((p) => ["pending", "Pending"].includes(p.status))
      .reduce((acc, p) => acc + p.count, 0);
    const completedProjects = dashboardData.projects
      .filter((p) => ["completed", "Completed", "done", "Done"].includes(p.status))
      .reduce((acc, p) => acc + p.count, 0);
    const activeProjects = dashboardData.projects
      .filter((p) =>
        ["active", "Active", "ongoing", "Ongoing", "in-progress", "In Progress"].includes(p.status)
      )
      .reduce((acc, p) => acc + p.count, 0);
    const totalProjects = dashboardData.projects.reduce((acc, item) => acc + item.count, 0);

    // Tasks - actual statuses: Upcoming, Pending, Completed, Ongoing
    const upcomingTasks = dashboardData.tasks
      .filter((t) => ["Upcoming", "upcoming"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const pendingTasks = dashboardData.tasks
      .filter((t) => ["Pending", "pending"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const ongoingTasks = dashboardData.tasks
      .filter((t) =>
        ["Ongoing", "ongoing", "In Progress", "in-progress", "Today", "today"].includes(t.status)
      )
      .reduce((acc, t) => acc + t.count, 0);
    const completedTasks = dashboardData.tasks
      .filter((t) => ["Completed", "completed", "Done", "done"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const totalTasks = dashboardData.tasks.reduce((acc, item) => acc + item.count, 0);

    // Shoot tasks breakdown
    const shootTasksUpcoming = dashboardData.shootTasks
      .filter((t) => ["Upcoming", "upcoming"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const shootTasksPending = dashboardData.shootTasks
      .filter((t) => ["Pending", "pending", "Today", "today"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const shootTasksCompleted = dashboardData.shootTasks
      .filter((t) => ["Completed", "completed"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const totalShootTasks = dashboardData.shootTasks.reduce((acc, t) => acc + t.count, 0);

    // Deliverable tasks breakdown
    const deliverableTasksPending = dashboardData.deliverableTasks
      .filter((t) => ["Pending", "pending", "Upcoming", "upcoming"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const deliverableTasksOngoing = dashboardData.deliverableTasks
      .filter((t) => ["Ongoing", "ongoing", "In Progress", "in-progress"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const deliverableTasksCompleted = dashboardData.deliverableTasks
      .filter((t) => ["Completed", "completed", "Done", "done"].includes(t.status))
      .reduce((acc, t) => acc + t.count, 0);
    const totalDeliverableTasks = dashboardData.deliverableTasks.reduce(
      (acc, t) => acc + t.count,
      0
    );

    const totalRevenue = dashboardData.transactions.reduce(
      (acc, item) => acc + (item.credit || 0),
      0
    );
    const totalExpenses = dashboardData.transactions.reduce(
      (acc, item) => acc + (item.debit || 0),
      0
    );
    const netProfit = totalRevenue - totalExpenses;
    const totalEnquiries = dashboardData.enquiry.reduce((acc, item) => acc + item.count, 0);
    const presentDays = dashboardData.attendance.reduce((acc, item) => acc + item.present, 0);
    const absentDays = dashboardData.attendance.reduce((acc, item) => acc + item.absent, 0);
    const halfDays = dashboardData.attendance.reduce(
      (acc, item) => acc + (item["half-day"] || 0),
      0
    );
    const totalAttendance = dashboardData.attendance.reduce((acc, item) => acc + item.total, 0);
    const attendanceRate =
      totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalSalary = dashboardData.salary.reduce((acc, item) => acc + item.amount, 0);

    return {
      totalClients,
      pendingProjects,
      activeProjects,
      completedProjects,
      totalProjects,
      upcomingTasks,
      pendingTasks,
      ongoingTasks,
      completedTasks,
      totalTasks,
      // Shoot tasks
      shootTasksUpcoming,
      shootTasksPending,
      shootTasksCompleted,
      totalShootTasks,
      // Deliverable tasks
      deliverableTasksPending,
      deliverableTasksOngoing,
      deliverableTasksCompleted,
      totalDeliverableTasks,
      totalRevenue,
      totalExpenses,
      netProfit,
      totalEnquiries,
      presentDays,
      absentDays,
      halfDays,
      totalAttendance,
      attendanceRate,
      taskCompletionRate,
      totalSalary,
    };
  }, [dashboardData]);

  // Task distribution with colors
  const taskDistribution = useMemo(() => {
    return dashboardData.tasks.map((task) => ({
      ...task,
      fill: STATUS_COLORS[task.status] || CHART_COLORS.info,
    }));
  }, [dashboardData.tasks]);

  // Project distribution with colors
  const projectDistribution = useMemo(() => {
    return dashboardData.projects.map((project) => ({
      ...project,
      fill: STATUS_COLORS[project.status] || CHART_COLORS.info,
    }));
  }, [dashboardData.projects]);

  // Shoot tasks distribution
  const shootTaskDistribution = useMemo(() => {
    return dashboardData.shootTasks.map((task) => ({
      ...task,
      fill: STATUS_COLORS[task.status] || CHART_COLORS.info,
    }));
  }, [dashboardData.shootTasks]);

  // Deliverable tasks distribution
  const deliverableTaskDistribution = useMemo(() => {
    return dashboardData.deliverableTasks.map((task) => ({
      ...task,
      fill: STATUS_COLORS[task.status] || CHART_COLORS.info,
    }));
  }, [dashboardData.deliverableTasks]);

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-lg text-muted-foreground">Loading dashboard...</span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your business performance</p>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={filter.includes("|") ? "custom-range" : filter}
              onValueChange={setFilter}
            >
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 👇 Custom range inputs */}
            {(filter === "custom-range" || filter.includes("|")) && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-[140px]"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards - Time Dependent Metrics */}
        {isAdmin && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <IndianRupee className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString()}</div>
                <div className="flex items-center gap-1 mt-1">
                  {metrics.netProfit >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={`text-xs ${metrics.netProfit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    Net: ₹{metrics.netProfit.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Expenses
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{metrics.totalExpenses.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Total outgoing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Dues
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{dashboardData.dueData.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Total outgoing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  New Clients
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalClients}</div>
                <p className="text-xs text-muted-foreground mt-1">In selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Enquiries
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalEnquiries}</div>
                <p className="text-xs text-muted-foreground mt-1">Leads to follow</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}

        {!isStaff && (
          <>
            <div>
              <MonthlyShootMatrixAllProjects />
            </div>
            <div>
              <MonthlyShootItemMatrix />
            </div>
            <div>
              <ProjectDeliverableStatusMatrix />
            </div>
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Shoot Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                    <Camera className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Shoot Tasks</CardTitle>
                    <CardDescription>Photography assignments</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{metrics.totalShootTasks}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {shootTaskDistribution.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {metrics.shootTasksUpcoming}
                      </div>
                      <div className="text-xs text-purple-600">Upcoming</div>
                    </div>
                    <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="text-lg font-bold text-amber-600">
                        {metrics.shootTasksPending}
                      </div>
                      <div className="text-xs text-amber-600">Pending</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {metrics.shootTasksCompleted}
                      </div>
                      <div className="text-xs text-green-600">Completed</div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={shootTaskDistribution} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                      <YAxis
                        dataKey="status"
                        type="category"
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {shootTaskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                  No shoot tasks
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 bg-transparent"
                onClick={() => handleNavigate("/task")}
              >
                View Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Deliverable Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Deliverable Tasks</CardTitle>
                    <CardDescription>Editing & delivery</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{metrics.totalDeliverableTasks}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {deliverableTaskDistribution.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="text-lg font-bold text-amber-600">
                        {metrics.deliverableTasksPending}
                      </div>
                      <div className="text-xs text-amber-600">Pending</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {metrics.deliverableTasksOngoing}
                      </div>
                      <div className="text-xs text-blue-600">Ongoing</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {metrics.deliverableTasksCompleted}
                      </div>
                      <div className="text-xs text-green-600">Completed</div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={deliverableTaskDistribution} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                      <YAxis
                        dataKey="status"
                        type="category"
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {deliverableTaskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                  No deliverable tasks
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 bg-transparent"
                onClick={() => handleNavigate("/task/indoor")}
              >
                View Task
              </Button>
            </CardContent>
          </Card>

          {/* Quick Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
              <CardDescription>Key metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-semibold">{metrics.pendingProjects}</div>
                  <div className="text-xs text-muted-foreground">Pending Projects</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">{metrics.ongoingTasks}</div>
                  <div className="text-xs text-muted-foreground">Ongoing Tasks</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <div className="font-semibold">{metrics.totalShootTasks}</div>
                  <div className="text-xs text-muted-foreground">Total Shoots</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold">{metrics.taskCompletionRate}%</div>
                  <div className="text-xs text-muted-foreground">Task Completion</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold">{metrics.attendanceRate}%</div>
                  <div className="text-xs text-muted-foreground">Attendance Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Attendance */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Attendance</CardTitle>
                <CardDescription>Daily attendance tracking</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleNavigate("/attendance")}>
                View Details <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{metrics.presentDays}</div>
                  <div className="text-xs text-green-600">Present</div>
                </div>
                <div className="text-center p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-lg font-bold text-amber-600">{metrics.halfDays}</div>
                  <div className="text-xs text-amber-600">Half Day</div>
                </div>
                <div className="text-center p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{metrics.absentDays}</div>
                  <div className="text-xs text-red-600">Absent</div>
                </div>
                <div className="text-center p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{metrics.attendanceRate}%</div>
                  <div className="text-xs text-blue-600">Rate</div>
                </div>
              </div>
              {dashboardData.attendance.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashboardData.attendance} barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                    <Bar
                      dataKey="present"
                      fill={CHART_COLORS.success}
                      name="Present"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="half-day"
                      fill={CHART_COLORS.warning}
                      name="Half Day"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="absent"
                      fill={CHART_COLORS.danger}
                      name="Absent"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No attendance data
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Tasks Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Tasks</CardTitle>
                  <CardDescription>Combined overview</CardDescription>
                </div>
                <Badge variant="secondary">{metrics.totalTasks} Total</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{metrics.taskCompletionRate}%</span>
                </div>
                <Progress value={metrics.taskCompletionRate} className="h-2" />
              </div>

              <div className="space-y-2">
                {taskDistribution.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: task.fill }}
                      />
                      <span className="text-sm">{task.status}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {task.count}
                    </Badge>
                  </div>
                ))}
              </div>

              {(metrics.pendingTasks > 0 || metrics.upcomingTasks > 0) && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    {metrics.pendingTasks + metrics.upcomingTasks} tasks need attention
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full bg-transparent"
                onClick={() => handleNavigate("/task")}
              >
                Manage Tasks
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Financial Chart */}
          {isAdmin && (
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Financial Overview</CardTitle>
                  <CardDescription>Revenue vs Expenses</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigate("/accounts/transaction")}
                >
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {dashboardData.transactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dashboardData.transactions}>
                      <defs>
                        <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, ""]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="credit"
                        stroke={CHART_COLORS.success}
                        fill="url(#colorCredit)"
                        name="Revenue"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="debit"
                        stroke={CHART_COLORS.danger}
                        fill="url(#colorDebit)"
                        name="Expenses"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    No transaction data for selected period
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project Status - Current State */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>Current status</CardDescription>
                </div>
                <Badge variant="secondary">{metrics.totalProjects} Total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {projectDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={projectDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {projectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {projectDistribution.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="capitalize">{item.status}</span>
                        </div>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No projects
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 bg-transparent"
                onClick={() => handleNavigate("/projects")}
              >
                Manage Projects
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Fourth Row - Salary */}
        {isAdmin && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Salary Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Salary Disbursement</CardTitle>
                  <CardDescription>Monthly payroll</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigate("/accounts/salary")}
                >
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {dashboardData.salary.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dashboardData.salary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, "Amount"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.primary, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No salary data
                  </div>
                )}
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Disbursed</span>
                  <span className="font-semibold">₹{metrics.totalSalary.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Client Growth */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Client Growth</CardTitle>
                  <CardDescription>New clients over time</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleNavigate("/clients")}>
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {dashboardData.clients.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dashboardData.clients}>
                      <defs>
                        <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={CHART_COLORS.primary}
                        fill="url(#colorClients)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No client data
                  </div>
                )}
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Clients</span>
                  <span className="font-semibold">{metrics.totalClients}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
