"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

/* ===================== Types ===================== */

type AssignedEmployees = {
  [role: string]: string[]; // role -> array of userIds
};

interface Shoot {
  date: string; // "YYYY-MM-DD"
  ritual: string;
  assignedEmployees?: AssignedEmployees;
  projectId?: string;
  projectName?: string;
}

interface EmployeeAssignment {
  role: string;
  shootItem: string;
  projectId?: string;
  projectName?: string;
}

type EmployeeDateMap = {
  [date: string]: EmployeeAssignment[];
};

type EmployeeMatrix = {
  [employeeId: string]: EmployeeDateMap;
};

interface UserMap {
  [userId: string]: string; // userId -> name
}

/* ===================== Component ===================== */

export default function MonthlyShootMatrixAllProjects() {
  const [shoots, setShoots] = useState<Shoot[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedMonth");
      if (saved !== null) return Number(saved);
    }
    return today.getMonth();
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedYear");
      if (saved !== null) return Number(saved);
    }
    return today.getFullYear();
  });

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    localStorage.setItem("selectedMonth", String(m - 1));
    localStorage.setItem("selectedYear", String(y));
    setSelectedYear(y);
    setSelectedMonth(m - 1); // JS month is 0-based
  };

  /* ---------------- Fetch All Projects ---------------- */
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);

      const projectSnap = await getDocs(collection(firestore, "projects"));
      const allShoots: Shoot[] = [];

      projectSnap.forEach((doc) => {
        if (doc.data().status === "Cancelled") return;
        const projectShoots = (doc.data().shoots || []) as Shoot[];

        projectShoots.forEach((shoot) => {
          allShoots.push({
            ...shoot,
            projectId: doc.id,
            projectName: doc.data().projectName,
          });
        });
      });

      setShoots(allShoots);
      setLoading(false);
    }

    fetchProjects();
  }, []);

  /* ---------------- Fetch Users ---------------- */
  useEffect(() => {
    async function fetchUsers() {
      const snap = await getDocs(collection(firestore, "users"));
      const map: UserMap = {};

      snap.forEach((doc) => {
        const data = doc.data();
        if (data?.name) {
          map[doc.id] = data.name as string;
        }
      });

      setUsers(map);
    }

    fetchUsers();
  }, []);

  /* ---------------- Month Dates ---------------- */
  const monthDates = useMemo<string[]>(() => {
    const dates: string[] = [];
    const d = new Date(selectedYear, selectedMonth, 1);

    while (d.getMonth() === selectedMonth) {
      d.setDate(d.getDate() + 1);
      dates.push(d.toISOString().split("T")[0]);
    }

    return dates;
  }, [selectedMonth, selectedYear]);

  /* ---------------- Build Employee × Date Map ---------------- */
  const employeeMatrix = useMemo<EmployeeMatrix>(() => {
    const map: EmployeeMatrix = {};

    shoots.forEach((shoot) => {
      if (!shoot.date) return;

      const [y, m] = shoot.date.split("-").map(Number);
      if (y !== selectedYear || m - 1 !== selectedMonth) return;

      Object.entries(shoot.assignedEmployees || {}).forEach(([role, employeeIds]) => {
        employeeIds.forEach((uid: string) => {
          if (!map[uid]) map[uid] = {};
          if (!map[uid][shoot.date]) map[uid][shoot.date] = [];

          map[uid][shoot.date].push({
            role,
            shootItem: shoot.ritual,
            projectId: shoot.projectId,
            projectName: shoot.projectName,
          });
        });
      });
    });

    return map;
  }, [shoots, selectedMonth, selectedYear]);

  /* ---------------- Employees in This Month ---------------- */
  const employeeIds = useMemo<string[]>(() => Object.keys(employeeMatrix), [employeeMatrix]);

  if (loading) return <p>Loading...</p>;

  /* ---------------- Render Table ---------------- */
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold">Employee Shoot Schedule</h2>

        <input
          type="month"
          value={`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`}
          onChange={handleMonthChange}
          className="rounded-md border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border shadow-sm">
        <table className="min-w-max w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-100 border-b px-3 py-2 text-left font-semibold">
                Employee
              </th>

              {monthDates.map((date) => (
                <th key={date} className="border-b px-2 py-2 text-center font-medium">
                  <div className="text-xs text-gray-500">
                    {new Date(date).toLocaleDateString("en-IN", { weekday: "short" })}
                  </div>
                  <div className="text-sm font-semibold">{date.split("-")[2]}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {employeeIds.map((uid) => (
              <tr key={uid} className="hover:bg-gray-50 transition-colors">
                <td className="sticky left-0 bg-white border-b px-3 py-2 font-medium whitespace-nowrap">
                  {users[uid] ?? "Unknown"}
                </td>

                {monthDates.map((date) => (
                  <td key={date} className="border-b px-2 py-2 align-top ">
                    {employeeMatrix[uid]?.[date]?.length &&
                      employeeMatrix[uid][date].map((item: EmployeeAssignment, idx: number) => (
                        <div
                          key={idx}
                          className="mb-1 rounded-md bg-blue-50 border border-blue-100 px-2 py-1"
                        >
                          <div className="text-xs font-semibold text-blue-700">{item.role}</div>
                          <div className="text-xs text-gray-600">({item.shootItem})</div>
                          {item.projectName && (
                            <div className="text-[10px] text-gray-400">{item.projectName}</div>
                          )}
                        </div>
                      ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
