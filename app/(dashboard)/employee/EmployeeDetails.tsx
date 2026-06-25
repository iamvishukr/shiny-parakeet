"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { firestore } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Employee {
  uId: string
  empId?: string
  name: string
  email?: string
  aadhaar?: string
  phone?: string
  gender?: string
  bloodGroup?: string
  dob?: string
  address?: string
  profileStatus?: string
  employmentType?: string
  salary?: string
  salaryAmountHistory?: { salary: string; effectiveFrom: string }[]
}

interface EmployeeDetailsProps {
  employee: Employee
}

interface SalaryRecord {
  month: string // YYYY-MM format
  paidSalary: number
  status: string
  transactionId: string
}

const months = [
  { val: "01", name: "January" },
  { val: "02", name: "February" },
  { val: "03", name: "March" },
  { val: "04", name: "April" },
  { val: "05", name: "May" },
  { val: "06", name: "June" },
  { val: "07", name: "July" },
  { val: "08", name: "August" },
  { val: "09", name: "September" },
  { val: "10", name: "October" },
  { val: "11", name: "November" },
  { val: "12", name: "December" },
]

const InfoRow = ({ label, value }: { label: string; value?: string | number }) => (
  <div className="flex flex-col">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-base font-medium text-gray-900">{value || "-"}</span>
  </div>
)

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ employee }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSalaryHistory = async () => {
      if (!employee.uId) return

      setIsLoading(true)
      try {
        const salaryColRef = collection(firestore, "users", employee.uId, "salaryHistory")
        const snapshot = await getDocs(salaryColRef)

        const records: SalaryRecord[] = snapshot.docs.map(
          (doc) =>
            ({
              transactionId: doc.id,
              ...doc.data(),
            }) as SalaryRecord,
        )

        setSalaryRecords(records)
      } catch (error) {
        console.error("Error fetching salary history:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSalaryHistory()
  }, [employee.uId])

  const getSalaryForMonth = (year: number, monthVal: string) => {
    const key = `${year}-${monthVal}`
    const matchingRecords = salaryRecords.filter((r) => r.month === key)

    if (matchingRecords.length === 0) return null

    // Consolidate: sum all payments for this month
    const totalPaid = matchingRecords.reduce((sum, r) => sum + (r.paidSalary || 0), 0)
    const allPaid = matchingRecords.every((r) => r.status === "paid")

    return {
      status: allPaid ? "paid" : "partial",
      paidSalary: totalPaid,
      count: matchingRecords.length,
    }
  }

  // Sort salary amount history newest first
  const sortedAmountHistory = [...(employee.salaryAmountHistory || [])].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom)
  )

  if (!employee) return null

  return (
    <div className="p-4 space-y-6">
      {/* Basic Info */}
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 capitalize">
            <InfoRow label="Employee ID" value={employee.empId} />
            <InfoRow label="UID" value={employee.uId} />
            <InfoRow label="Name" value={employee.name} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Aadhaar" value={employee.aadhaar} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Gender" value={employee.gender} />
            <InfoRow label="Blood Group" value={employee.bloodGroup} />
            <InfoRow
              label="Date of Birth"
              value={
                employee.dob
                  ? new Date(employee.dob + "T00:00:00").toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                  : "-"
              }
            />
            <InfoRow label="Address" value={employee.address} />
            <InfoRow label="Profile Status" value={employee.profileStatus} />
            <InfoRow label="Employment Type" value={employee.employmentType} />
            <InfoRow label="Current Salary" value={employee.salary ? `₹${Number(employee.salary).toLocaleString()}` : "-"} />
          </div>
        </CardContent>
      </Card>

      {/* Salary Revision History */}
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Salary Revision History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedAmountHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 border text-left">Effective From</th>
                    <th className="px-4 py-2 border text-left">Salary</th>
                    <th className="px-4 py-2 border text-left">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAmountHistory.map((entry, idx) => {
                    const prevEntry = sortedAmountHistory[idx + 1]
                    const currentSal = Number(entry.salary)
                    const prevSal = prevEntry ? Number(prevEntry.salary) : null
                    const diff = prevSal !== null ? currentSal - prevSal : null

                    return (
                      <tr key={entry.effectiveFrom + entry.salary} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border">{formatDate(entry.effectiveFrom)}</td>
                        <td className="px-4 py-2 border font-medium">₹{currentSal.toLocaleString()}</td>
                        <td className="px-4 py-2 border">
                          {diff !== null ? (
                            <span className={diff > 0 ? "text-green-600 font-medium" : diff < 0 ? "text-red-600 font-medium" : "text-gray-500"}>
                              {diff > 0 ? `▲ +₹${diff.toLocaleString()}` : diff < 0 ? `▼ -₹${Math.abs(diff).toLocaleString()}` : "No change"}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Initial salary</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No salary revisions recorded yet. History will appear when salary is updated.</p>
          )}
        </CardContent>
      </Card>

      {/* Salary History */}
      <Card className="shadow-md rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold">Salary History</CardTitle>

          {/* Year Filter */}
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const year = new Date().getFullYear() - i
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              )
            })}
          </select>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 border">Month</th>
                  <th className="px-4 py-2 border">Status</th>
                  <th className="px-4 py-2 border">Total Paid Salary</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-3 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  months.map((month) => {
                    const salaryInfo = getSalaryForMonth(selectedYear, month.val)

                    return (
                      <tr key={month.val} className="text-center capitalize">
                        <td className="px-4 py-2 border font-medium">{month.name}</td>
                        <td
                          className={`px-4 py-2 border ${salaryInfo?.status === "paid" ? "text-green-600" : "text-red-600"
                            }`}
                        >
                          {salaryInfo ? (
                            <>
                              {salaryInfo.status}
                              {salaryInfo.count > 1 && (
                                <span className="ml-1 text-xs text-gray-500">({salaryInfo.count} payments)</span>
                              )}
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-2 border">
                          {salaryInfo ? `₹${salaryInfo.paidSalary.toLocaleString()}` : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EmployeeDetails
