"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { firestore } from "@/lib/firebase"
import type { SalaryEntry } from "../transaction/types"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table"
import { GenericTable } from "@/components/shared/GenericTable"
import Pagination from "@/components/shared/Pagination"
import TableSkeleton from "@/components/shared/skeletons/TableSkeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { CSVLink } from "react-csv"
import { ClientOnly } from "@/components/ClientOnly"

interface SalaryTableItem extends SalaryEntry {
  date: string
}

const getSalaryColumns = (): ColumnDef<SalaryTableItem>[] => [
  {
    accessorKey: "Sl No",
    header: "Sl No",
    cell: (info) => info.row.index + 1,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const d = row.original.date
      if (!d) return "-"

      // If it's in YYYY-MM format, parse and format it
      if (/^\d{4}-\d{2}$/.test(d)) {
        const [year, month] = d.split("-")
        const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
        return <div>{format(date, "MMMM yyyy")}</div>
      }

      // Otherwise try to parse as a regular date
      try {
        return <div>{format(new Date(d), "MMMM yyyy")}</div>
      } catch {
        return <div>{d}</div>
      }
    },
  },
  {
    accessorKey: "employeeName",
    header: "Employee Name",
    cell: ({ row }) => row.original.employeeName || "-",
  },
  {
    accessorKey: "amount",
    header: "Salary Amount",
    cell: ({ row }) => `₹${(row.original.amount || 0).toLocaleString()}`,
  },
  {
    accessorKey: "timestamp",
    header: "Paid At",
    cell: ({ row }) => {
      const ts = row.original.timestamp

      let date: Date | null = null

      if (!ts) {
        date = null
      } else if (ts instanceof Date) {
        date = ts
      } else if (typeof ts === "string") {
        date = new Date(ts)
      } else if (typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function") {
        // Firestore Timestamp
        date = ts.toDate()
      } else if (typeof ts === "object" && "seconds" in ts) {
        // Firestore stored timestamp as plain object
        date = new Date(ts.seconds * 1000)
      }

      return <div>{date ? format(date, "dd/MM/yyyy HH:mm") : "-"}</div>
    },
  },
]

export default function SalaryPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<SalaryTableItem[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")

  useEffect(() => {
    const loadSalary = async () => {
      setIsLoading(true)

      try {
        const usersSnap = await getDocs(collection(firestore, "users"))
        const allItems: SalaryTableItem[] = []

        for (const userDoc of usersSnap.docs) {
          const userId = userDoc.id
          const userData = userDoc.data()
          const employeeName = userData?.name || userData?.fullName || userData?.employeeName || "Unknown"

          const salaryColRef = collection(firestore, "users", userId, "salaryHistory")

          const salarySnap = await getDocs(salaryColRef)

          salarySnap.forEach((salaryDoc) => {
            const d = salaryDoc.data()
            const monthKey = d.month // YYYY-MM format stored in the document data

            allItems.push({
              employeeName,
              amount: d.paidSalary || 0,
              timestamp: d.updatedAt || d.createdAt || null,
              date: monthKey, // YYYY-MM format for consistent filtering
            })
          })
        }

        // Sort by date descending (YYYY-MM format sorts correctly as strings)
        allItems.sort((a, b) => (a.date > b.date ? -1 : 1))

        setData(allItems)
      } catch (err) {
        console.error(err)
      }

      setIsLoading(false)
    }

    loadSalary()
  }, [])

  const employeeNames = useMemo(() => {
    const names = data.map((item) => item.employeeName).filter(Boolean)
    return Array.from(new Set(names)).sort()
  }, [data])

  const filteredData = useMemo(() => {
    let filtered = data

    if (startDate || endDate) {
      filtered = filtered.filter((t) => {
        const itemMonth = t.date // Already in YYYY-MM format

        if (!itemMonth) return false

        // Convert filter dates (YYYY-MM-DD) to YYYY-MM for comparison
        const startMonth = startDate ? startDate.substring(0, 7) : null
        const endMonth = endDate ? endDate.substring(0, 7) : null

        if (startMonth && itemMonth < startMonth) return false
        if (endMonth && itemMonth > endMonth) return false

        return true
      })
    }

    if (selectedEmployee && selectedEmployee !== "all") {
      filtered = filtered.filter((t) => t.employeeName === selectedEmployee)
    }

    return filtered
  }, [data, startDate, endDate, selectedEmployee])

  const summary = useMemo(() => {
    const totalSalary = filteredData.reduce((sum, item) => sum + (item.amount || 0), 0)
    const totalRecords = filteredData.length

    const employeeBreakdown = filteredData.reduce(
      (acc, item) => {
        const empName = item.employeeName || "Unknown"
        if (!acc[empName]) {
          acc[empName] = {
            totalAmount: 0,
            paymentCount: 0,
            firstPayment: item.date,
            lastPayment: item.date,
          }
        }
        acc[empName].totalAmount += item.amount || 0
        acc[empName].paymentCount += 1

        if (item.date < acc[empName].firstPayment) {
          acc[empName].firstPayment = item.date
        }
        if (item.date > acc[empName].lastPayment) {
          acc[empName].lastPayment = item.date
        }

        return acc
      },
      {} as Record<string, { totalAmount: number; paymentCount: number; firstPayment: string; lastPayment: string }>,
    )

    const monthlyBreakdown = filteredData.reduce(
      (acc, item) => {
        const monthYear = item.date // Already in YYYY-MM format
        if (!acc[monthYear]) {
          acc[monthYear] = 0
        }
        acc[monthYear] += item.amount || 0
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalSalary,
      totalRecords,
      employeeBreakdown,
      monthlyBreakdown,
      selectedEmployee,
    }
  }, [filteredData, selectedEmployee])

  const columns = useMemo(() => getSalaryColumns(), [])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  })

  const resetFilters = () => {
    setStartDate("")
    setEndDate("")
    setSelectedEmployee("all")
  }
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salary Records</h1>
          <p className="text-muted-foreground">View all employee salary payments</p>
        </div>
        <div className="flex items-center gap-2">
          <ClientOnly>
            <CSVLink
              data={filteredData}
              filename={`salary-${selectedEmployee !== "all" ? selectedEmployee : "all"}-${
                startDate || "all"
              }-${endDate || "all"}.csv`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Export CSV
            </CSVLink>
          </ClientOnly>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Records</h3>
          <p className="text-2xl font-bold">{summary.totalRecords}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Salary Paid</h3>
          <p className="text-2xl font-bold text-green-600">₹{summary.totalSalary.toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Date Range</h3>
          <p className="text-sm">{startDate && endDate ? `${startDate} to ${endDate}` : "All dates"}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Employee Filter</h3>
          <p className="text-sm">{selectedEmployee !== "all" ? selectedEmployee : "All Employees"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
        <div>
          <Label htmlFor="start-date" className="text-sm font-medium">
            Start Date
          </Label>
          <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="end-date" className="text-sm font-medium">
            End Date
          </Label>
          <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="employee-filter" className="text-sm font-medium">
            Employee
          </Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger id="employee-filter">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employeeNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={resetFilters} className="w-full bg-transparent">
            Reset Filters
          </Button>
        </div>
      </div>

      {selectedEmployee !== "all" && (
        <div className="border rounded-lg p-6 bg-blue-50/50">
          <h3 className="text-lg font-semibold mb-4">Summary for {selectedEmployee}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="text-sm font-medium text-muted-foreground">Total Payments</h4>
              <p className="text-2xl font-bold text-blue-600">
                {summary.employeeBreakdown[selectedEmployee]?.paymentCount || 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="text-sm font-medium text-muted-foreground">Total Amount</h4>
              <p className="text-2xl font-bold text-green-600">
                ₹{summary.employeeBreakdown[selectedEmployee]?.totalAmount.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="text-sm font-medium text-muted-foreground">Payment Period</h4>
              <p className="text-sm">
                {summary.employeeBreakdown[selectedEmployee]?.firstPayment
                  ? (() => {
                      const first = summary.employeeBreakdown[selectedEmployee].firstPayment
                      const last = summary.employeeBreakdown[selectedEmployee].lastPayment

                      const parseMonth = (ym: string) => {
                        const [year, month] = ym.split("-")
                        return new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
                      }

                      return `${format(parseMonth(first), "MMM yyyy")} - ${format(parseMonth(last), "MMM yyyy")}`
                    })()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {Object.keys(summary.monthlyBreakdown).length > 0 && (
        <div className="border rounded-lg p-6 bg-green-50/50">
          <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(summary.monthlyBreakdown)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([monthYear, amount]) => {
                const [year, month] = monthYear.split("-")
                const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)

                return (
                  <div key={monthYear} className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium text-sm text-muted-foreground">{format(date, "MMM yyyy")}</h4>
                    <p className="text-xl font-bold text-green-600 mt-2">₹{amount.toLocaleString()}</p>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton columnCount={5} rowCount={5} />
      ) : (
        <>
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}
    </div>
  )
}
