import {
  fetchAttendanceData,
  fetchClientsData,
  fetchDeliverablesData,
  fetchDues,
  fetchEnquiryData,
  fetchEventsData,
  fetchPackagesData,
  fetchProjectsData,
  fetchSalaryData,
  fetchShootsData,
  fetchTasksData,
  fetchTransactionsData,
} from "./firebase-service"

export interface DashboardData {
  attendance: Array<{
    date: string
    present: number
    "half-day": number
    absent: number
    total: number
  }>
  clients: Array<{ month: string; count: number }>
  deliverables: Array<{ name: string; count: number }>
  enquiry: Array<{ date: string; count: number }>
  events: Array<{ name: string; count: number }>
  packages: Array<{ name: string; price: number; count: number }>
  projects: Array<{ status: string; count: number }>
  salary: Array<{ month: string; amount: number }>
  shoots: Array<{ name: string; count: number }>
  tasks: Array<{ status: string; count: number; type?: string }>
  transactions: Array<{ date: string; credit: number; debit: number }>
  shootTasks: Array<{ status: string; count: number }>
  deliverableTasks: Array<{ status: string; count: number }>
  dueData: number
}

export const fetchDashboardData = async (filter: string): Promise<DashboardData> => {
  try {
    const [
      attendanceData,
      clientsData,
      deliverablesData,
      enquiryData,
      eventsData,
      packagesData,
      projectsData,
      salaryData,
      shootsData,
      tasksData,
      transactionsData,
      dueData
    ] = await Promise.all([
      fetchAttendanceData(filter),
      fetchClientsData(filter),
      fetchDeliverablesData(),
      fetchEnquiryData(filter),
      fetchEventsData(),
      fetchPackagesData(),
      fetchProjectsData(filter),
      fetchSalaryData(filter),
      fetchShootsData(),
      fetchTasksData(filter),
      fetchTransactionsData(filter),
      fetchDues()
    ])

    const attendance = attendanceData.map((record) => {
      return {
        date: record.date,
        present: record.present || 0,
        "half-day": record.halfDay || 0,
        absent: record.absent || 0,
        total: record.total || 0,
      }
    })

    const clientsByMonth = clientsData.reduce(
      (acc, client) => {
        const dateStr = client.createdAt
        if (!dateStr) return acc

        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return acc

        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        acc[monthKey] = (acc[monthKey] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const clients = Object.entries(clientsByMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA.getTime() - dateB.getTime()
      })

    const deliverables = deliverablesData.map((deliverable) => ({
      name: deliverable.name || "Unknown",
      count: 1,
    }))

    const enquiryByDate = enquiryData.reduce(
      (acc, enquiry) => {
        const dateStr = enquiry.createdAt
        if (!dateStr) return acc

        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return acc

        const dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        acc[dateKey] = (acc[dateKey] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const enquiry = Object.entries(enquiryByDate).map(([date, count]) => ({
      date,
      count,
    }))

    const events = eventsData.map((event) => ({
      name: event.name || "Unknown",
      count: 1,
    }))

    const packages = packagesData.map((pkg) => ({
      name: pkg.name || "Unknown",
      price: pkg.price || 0,
      count: 1,
    }))

    const projectsByStatus = projectsData.reduce(
      (acc, project) => {
        const status = project.status || "Active"
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const projects = Object.entries(projectsByStatus).map(([status, count]) => ({
      status,
      count,
    }))

    const salaryByMonth = salaryData.reduce(
      (acc, salary) => {
        const dateStr = salary.date
        if (!dateStr) return acc

        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return acc

        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        const employees = Object.values(salary.employees || {})
        const totalAmount = employees.reduce((sum, emp) => sum + (emp.amount || 0), 0)
        acc[monthKey] = (acc[monthKey] || 0) + totalAmount
        return acc
      },
      {} as Record<string, number>,
    )

    const salary = Object.entries(salaryByMonth).map(([month, amount]) => ({
      month,
      amount,
    }))

    const shoots = shootsData.map((shoot) => ({
      name: shoot.name || "Unknown",
      count: 1,
    }))

    const shootTasksByStatus = tasksData
      .filter((task) => task.type === "shoot")
      .reduce(
        (acc, task) => {
          const status = task.status
          acc[status] = (acc[status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    const deliverableTasksByStatus = tasksData
      .filter((task) => task.type === "deliverable")
      .reduce(
        (acc, task) => {
          const status = task.status
          acc[status] = (acc[status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    const allTasksByStatus = tasksData.reduce(
      (acc, task) => {
        const status = task.status
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const tasks = Object.entries(allTasksByStatus).map(([status, count]) => ({
      status,
      count,
    }))

    const shootTasks = Object.entries(shootTasksByStatus).map(([status, count]) => ({
      status,
      count,
    }))

    const deliverableTasks = Object.entries(deliverableTasksByStatus).map(([status, count]) => ({
      status,
      count,
    }))

    const transactionsByDate = transactionsData.reduce(
      (acc, transaction) => {
        const date = transaction.date
        if (!date) return acc

        if (!acc[date]) {
          acc[date] = { credit: 0, debit: 0 }
        }

        const items = transaction.items || []
        items.forEach((item) => {
          if (item.type === "credit") {
            acc[date].credit += item.amount || 0
          } else if (item.type === "debit") {
            acc[date].debit += item.amount || 0
          }
        })

        return acc
      },
      {} as Record<string, { credit: number; debit: number }>,
    )

    const transactions = Object.entries(transactionsByDate)
      .map(([date, data]) => ({
        date,
        credit: data.credit,
        debit: data.debit,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      attendance,
      clients,
      deliverables,
      enquiry,
      events,
      packages,
      projects,
      salary,
      shoots,
      tasks,
      transactions,
      shootTasks,
      deliverableTasks,
      dueData
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return {
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
      dueData: 0
    }
  }
}
