"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

/* ===================== Types ===================== */

interface Deliverable {
  name: string;
  qty?: string | number;
  assignedEmployees?: string[];
  projectId?: string;
  projectName?: string;
  projectDate?: string;
}

interface EmployeeAssignment {
  deliverableName: string;
  qty: string | number;
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

export default function MonthlyDeliverableMatrixAllProjects() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const today = new Date();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedDeliverableMonth");
      if (saved !== null) return Number(saved);
    }
    return today.getMonth();
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedDeliverableYear");
      if (saved !== null) return Number(saved);
    }
    return today.getFullYear();
  });

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    localStorage.setItem("selectedDeliverableMonth", String(m - 1));
    localStorage.setItem("selectedDeliverableYear", String(y));
    setSelectedYear(y);
    setSelectedMonth(m - 1); // JS month is 0-based
  };

  /* ---------------- Fetch All Projects ---------------- */
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);

      const projectSnap = await getDocs(collection(firestore, "projects"));
      const allDeliverables: Deliverable[] = [];

      projectSnap.forEach((doc) => {
        if (doc.data().status === "Cancelled") return;
        const projectData = doc.data();
        const projectDeliverables = (projectData.deliverables || []) as any[];

        // Extract the project date properly
        let projectDateStr = "";
        if (projectData.dates) {
          let dateObj: Date | null = null;
          if (projectData.dates.toDate) {
            dateObj = projectData.dates.toDate();
          } else if (typeof projectData.dates === "string") {
            const onlyDate = projectData.dates.split("T")[0];
            dateObj = new Date(onlyDate + "T00:00:00");
          }
          if (dateObj) {
            // Convert to local YYYY-MM-DD
            projectDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
          }
        }

        projectDeliverables.forEach((deliverable) => {
          allDeliverables.push({
            name: deliverable.name || "",
            qty: deliverable.qty || "",
            assignedEmployees: Array.isArray(deliverable.assignedEmployees) ? deliverable.assignedEmployees : [],
            projectId: doc.id,
            projectName: projectData.projectName,
            projectDate: projectDateStr,
          });
        });
      });

      setDeliverables(allDeliverables);
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
      dates.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
    }

    return dates;
  }, [selectedMonth, selectedYear]);

  /* ---------------- Build Employee × Date Map ---------------- */
  const employeeMatrix = useMemo<EmployeeMatrix>(() => {
    const map: EmployeeMatrix = {};

    deliverables.forEach((deliverable) => {
      if (!deliverable.projectDate) return;

      const [y, m] = deliverable.projectDate.split("-").map(Number);
      if (y !== selectedYear || m - 1 !== selectedMonth) return;

      const employees = deliverable.assignedEmployees || [];
      
      // If no employees assigned, maybe assign to "Unassigned" row? 
      // The shoot matrix ignores unassigned, but deliverables might be useful to track.
      // For now, mirroring shoot matrix, we only plot assigned employees
      employees.forEach((uid: string) => {
        if (!map[uid]) map[uid] = {};
        if (!map[uid][deliverable.projectDate!]) map[uid][deliverable.projectDate!] = [];

        map[uid][deliverable.projectDate!].push({
          deliverableName: deliverable.name,
          qty: deliverable.qty || "",
          projectId: deliverable.projectId,
          projectName: deliverable.projectName,
        });
      });
    });

    return map;
  }, [deliverables, selectedMonth, selectedYear]);

  /* ---------------- Employees in This Month ---------------- */
  const employeeIds = useMemo<string[]>(() => Object.keys(employeeMatrix), [employeeMatrix]);

  if (loading) return <p>Loading Deliverables Matrix...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold">Employee Deliverables Schedule</h2>

        <input
          type="month"
          value={`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`}
          onChange={handleMonthChange}
          className="rounded-md border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            {employeeIds.length === 0 ? (
              <tr>
                <td colSpan={monthDates.length + 1} className="py-8 text-center text-gray-500 bg-white">
                  No deliverables assigned for the selected month.
                </td>
              </tr>
            ) : (
              employeeIds.map((uid) => (
                <tr key={uid} className="hover:bg-gray-50 transition-colors">
                  <td className="sticky left-0 bg-white border-b px-3 py-2 font-medium whitespace-nowrap">
                    {users[uid] ?? "Unknown"}
                  </td>

                  {monthDates.map((date) => (
                    <td key={date} className="border-b px-2 py-2 align-top ">
                      {employeeMatrix[uid]?.[date]?.length > 0 &&
                        employeeMatrix[uid][date].map((item: EmployeeAssignment, idx: number) => (
                          <div
                            key={idx}
                            className="mb-1 rounded-md bg-teal-50 border border-teal-100 px-2 py-1"
                          >
                            <div className="text-xs font-semibold text-teal-700">{item.deliverableName}</div>
                            {item.qty && <div className="text-xs text-gray-600">Qty: {item.qty}</div>}
                            {item.projectName && (
                              <div className="text-[10px] text-gray-400 truncate max-w-[120px]" title={item.projectName}>
                                {item.projectName}
                              </div>
                            )}
                          </div>
                        ))}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
