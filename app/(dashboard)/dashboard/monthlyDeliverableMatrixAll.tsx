"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

/* ===================== Types ===================== */

interface DeliverableItem {
  name: string;
  qty?: string | number;
  assignedEmployees?: string[];
  projectId?: string;
  projectName?: string;
  projectDate?: string;
}

interface CellData {
  required: number;
  assigned: string[];
}

interface ItemsDateMatrix {
  [itemName: string]: {
    [date: string]: CellData;
  };
}

interface UserMap {
  [uid: string]: string;
}

/* ===================== Component ===================== */

export default function MonthlyDeliverableItemMatrix() {
  const today = new Date();

  const [month, setMonth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedMonthDeliverableItem");
      if (saved !== null) return Number(saved);
    }
    return today.getMonth();
  });

  const [year, setYear] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedYearDeliverableItem");
      if (saved !== null) return Number(saved);
    }
    return today.getFullYear();
  });

  const [deliverablesData, setDeliverablesData] = useState<DeliverableItem[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);

  /* ---------------- Fetch All Projects ---------------- */
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      const snap = await getDocs(collection(firestore, "projects"));
      const allItems: DeliverableItem[] = [];

      snap.forEach((doc) => {
        if (doc.data().status !== "Cancelled") {
          const projectData = doc.data();
          const projectDeliverables = (projectData.deliverables || []) as any[];

          // Resolve project date
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
              projectDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
            }
          }

          projectDeliverables.forEach((item) => {
            allItems.push({
              name: item.name || "Unknown",
              qty: item.qty,
              assignedEmployees: Array.isArray(item.assignedEmployees) ? item.assignedEmployees : [],
              projectId: doc.id,
              projectName: projectData.projectName,
              projectDate: projectDateStr,
            });
          });
        }
      });

      setDeliverablesData(allItems);
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
        map[doc.id] = doc.data().name || "Unknown";
      });

      setUsers(map);
    }

    fetchUsers();
  }, []);

  /* ---------------- Month Dates ---------------- */
  const monthDates = useMemo(() => {
    const dates: string[] = [];
    const d = new Date(year, month, 1);

    while (d.getMonth() === month) {
      d.setDate(d.getDate() + 1);
      dates.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
    }

    return dates;
  }, [month, year]);

  /* ---------------- Build Matrix ---------------- */
  const matrix = useMemo<ItemsDateMatrix>(() => {
    const result: ItemsDateMatrix = {};

    deliverablesData.forEach((item) => {
      if (!item.projectDate) return;

      const [y, m] = item.projectDate.split("-").map(Number);
      if (y !== year || m - 1 !== month) return;

      const itemName = item.name.trim();
      if (!itemName) return;

      let requiredCount = parseInt(String(item.qty || "0"), 10);
      if (isNaN(requiredCount) || requiredCount <= 0) requiredCount = 1; // Default to 1 if not parseable

      const assignedIds = item.assignedEmployees || [];
      const assignedNames = assignedIds.map((uid) => users[uid] || "Unknown");

      if (!result[itemName]) result[itemName] = {};
      if (!result[itemName][item.projectDate]) {
        result[itemName][item.projectDate] = {
          required: 0,
          assigned: [],
        };
      }

      result[itemName][item.projectDate].required += requiredCount;
      result[itemName][item.projectDate].assigned.push(...assignedNames);
    });

    return result;
  }, [deliverablesData, users, month, year]);

  const sortedItems = Object.keys(matrix).sort();

  /* ---------------- Month Picker ---------------- */
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    setYear(y);
    setMonth(m - 1);
    localStorage.setItem("selectedMonthDeliverableItem", String(m - 1));
    localStorage.setItem("selectedYearDeliverableItem", String(y));
  };

  if (loading) return <p>Loading Requirements...</p>;

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Monthly Deliverables Requirement vs Assignment</h2>

        <input
          type="month"
          value={`${year}-${String(month + 1).padStart(2, "0")}`}
          onChange={handleMonthChange}
          className="rounded-md border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-max w-full text-sm border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="sticky left-0 bg-gray-100 px-3 py-2 text-left z-20 shadow-[1px_0_0_#e5e7eb]">Deliverable Item</th>

              {monthDates.map((date) => (
                <th key={date} className="px-2 py-2 text-center">
                  <div className="text-xs text-gray-500">
                    {new Date(date).toLocaleDateString("en-IN", {
                      weekday: "short",
                    })}
                  </div>
                  <div className="font-semibold">{date.split("-")[2]}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={monthDates.length + 1} className="py-8 text-center text-gray-500 bg-white">
                  No deliverables requirement for the selected month.
                </td>
              </tr>
            ) : (
              sortedItems.map((itemName) => (
                <tr key={itemName} className="border-b-2 border-gray-200 hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium capitalize shadow-[1px_0_0_#e5e7eb] z-10">{itemName}</td>

                  {monthDates.map((date) => {
                    const cell = matrix[itemName]?.[date];

                    if (!cell || cell.required === 0) {
                      return <td key={date} className="px-2 py-2 text-center text-gray-400"></td>;
                    }

                    return (
                      <td key={date} className="px-2 py-2 align-top">
                        <div className="mb-1 rounded bg-yellow-50 border border-yellow-200 px-2 py-1 text-xs text-center">
                          Required: {cell.required}
                        </div>

                        {cell.assigned.length > 0 && (
                          <div className="rounded bg-teal-50 border border-teal-200 px-2 py-1 text-xs">
                            Assigned ({cell.assigned.length}):
                            <br />
                            {cell.assigned.join(", ")}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
