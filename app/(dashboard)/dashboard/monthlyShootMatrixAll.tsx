"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

/* ===================== Types ===================== */

type AssignedEmployees = {
  [role: string]: string[]; // role -> userIds
};

interface Shoot {
  date: string; // YYYY-MM-DD
  assignedEmployees?: AssignedEmployees;

  // required counts (stored as string numbers)
  assistant?: string;
  candid?: string;
  cinematographer?: string;
  drone?: string;
  other?: string;
  traditionalPhotographer?: string;
  traditionalVideographer?: string;
  cinemetographer?: string;
}

interface CellData {
  required: number;
  assigned: string[];
}

interface RoleDateMatrix {
  [role: string]: {
    [date: string]: CellData;
  };
}

interface UserMap {
  [uid: string]: string;
}

/* ===================== Component ===================== */

export default function MonthlyShootItemMatrix() {
  const today = new Date();

  const [month, setMonth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedMonthShootItem");
      if (saved !== null) return Number(saved);
    }
    return today.getMonth();
  });

  const [year, setYear] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedYearShootItem");
      if (saved !== null) return Number(saved);
    }
    return today.getFullYear();
  });

  const [shoots, setShoots] = useState<Shoot[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);

  /* ---------------- Fetch All Projects ---------------- */
  useEffect(() => {
    async function fetchProjects() {
      const snap = await getDocs(collection(firestore, "projects"));
      const allShoots: Shoot[] = [];
      snap.forEach((doc) => {
        if (doc.data().status != "Cancelled") {
          const projectShoots = doc.data().shoots || [];
          projectShoots.forEach((s: Shoot) => allShoots.push(s));
        }
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
        map[doc.id] = doc.data().name;
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
      dates.push(d.toISOString().split("T")[0]);
    }

    return dates;
  }, [month, year]);

  /* ---------------- Build Matrix ---------------- */
  const matrix = useMemo<RoleDateMatrix>(() => {
    const result: RoleDateMatrix = {};

    shoots.forEach((shoot) => {
      if (!shoot.date) return;

      const [y, m] = shoot.date.split("-").map(Number);
      if (y !== year || m - 1 !== month) return;

      const roles = [
        "assistant",
        "candid",
        "cinematographer",
        "drone",
        "other",
        "traditionalPhotographer",
        "traditionalVideographer",
      ] as const;

      roles.forEach((role) => {
        let requiredCount = 0;
        requiredCount =
          role === "cinematographer"
            ? Number(shoot["cinemetographer"])
            : (requiredCount = Number(shoot[role] || 0));
        const assignedIds = shoot.assignedEmployees?.[role] || [];
        const assignedNames = assignedIds.map((uid) => users[uid] || "Unknown");

        if (!result[role]) result[role] = {};
        if (!result[role][shoot.date]) {
          result[role][shoot.date] = {
            required: 0,
            assigned: [],
          };
        }

        result[role][shoot.date].required += requiredCount;
        result[role][shoot.date].assigned.push(...assignedNames);
      });
    });

    return result;
  }, [shoots, users, month, year]);

  const roles = Object.keys(matrix);

  /* ---------------- Month Picker ---------------- */
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    setYear(y);
    setMonth(m - 1);
    localStorage.setItem("selectedMonthShootItem", String(m - 1));
    localStorage.setItem("selectedYearShootItem", String(y));
  };

  if (loading) return <p>Loading...</p>;

  /* ---------------- Render ---------------- */
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Monthly Shoot Requirement vs Assignment</h2>

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
              <th className="sticky left-0 bg-gray-100 px-3 py-2 text-left">Shoot Item</th>

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
            {roles.map((role) => (
              <tr key={role} className="border-b-2 border-gray-200 hover:bg-gray-50">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium capitalize ">{role}</td>

                {monthDates.map((date) => {
                  const cell = matrix[role]?.[date];

                  if (!cell || cell.required === 0) {
                    return <td key={date} className="px-2 py-2 text-center text-gray-400"></td>;
                  }

                  return (
                    <td key={date} className="px-2 py-2">
                      <div className="mb-1 rounded bg-yellow-50 border border-yellow-200 px-2 py-1 text-xs text-center">
                        Required: {cell.required}
                      </div>

                      <div className="rounded bg-green-50 border border-green-200 px-2 py-1 text-xs">
                        Assigned ({cell.assigned.length}):
                        <br />
                        {cell.assigned.join(", ")}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
