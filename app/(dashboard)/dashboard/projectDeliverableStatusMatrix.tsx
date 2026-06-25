"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

/* ===================== Types ===================== */

interface RawDeliverable {
  name: string;
  status?: string;
  qty?: string | number;
  assignedEmployees?: string[];
}

interface ProjectRow {
  projectId: string;
  projectName: string;
  projectDate: string; // YYYY-MM-DD
  deliverables: {
    name: string;
    status: string;
    qty: string | number;
    hasAssigned: boolean;
  }[];
}

/* ===================== Helpers ===================== */

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "bg-green-100 border-green-300", text: "text-green-700", label: "Completed" },
  ongoing: { bg: "bg-blue-100 border-blue-300", text: "text-blue-700", label: "Ongoing" },
  pending: { bg: "bg-amber-100 border-amber-300", text: "text-amber-700", label: "Pending" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status.toLowerCase()] || { bg: "bg-gray-100 border-gray-300", text: "text-gray-600", label: status || "—" };
}

/* ===================== Component ===================== */

export default function ProjectDeliverableStatusMatrix() {
  const today = new Date();

  const [month, setMonth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedMonthProjDelStatus");
      if (saved !== null) return Number(saved);
    }
    return today.getMonth();
  });

  const [year, setYear] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedYearProjDelStatus");
      if (saved !== null) return Number(saved);
    }
    return today.getFullYear();
  });

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- Fetch Projects ---------------- */
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);

      const snap = await getDocs(collection(firestore, "projects"));
      const rows: ProjectRow[] = [];

      snap.forEach((doc) => {
        const data = doc.data();

        // Skip cancelled / not confirmed
        if (["Cancelled", "Not Confirmed"].includes(data.status)) return;

        // Resolve project date to YYYY-MM-DD
        let projectDateStr = "";
        if (data.dates) {
          let dateObj: Date | null = null;
          if (data.dates instanceof Timestamp) {
            dateObj = data.dates.toDate();
          } else if (data.dates?.toDate) {
            dateObj = data.dates.toDate();
          } else if (typeof data.dates === "string") {
            const onlyDate = data.dates.split("T")[0];
            dateObj = new Date(onlyDate + "T00:00:00");
          }
          if (dateObj && !isNaN(dateObj.getTime())) {
            projectDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
          }
        }

        if (!projectDateStr) return; // skip projects without a date

        const rawDeliverables = (data.deliverables || []) as RawDeliverable[];

        rows.push({
          projectId: doc.id,
          projectName: data.projectName || "Untitled",
          projectDate: projectDateStr,
          deliverables: rawDeliverables.map((d) => ({
            name: d.name || "Unknown",
            status: d.status || "pending",
            qty: d.qty || "",
            hasAssigned: Array.isArray(d.assignedEmployees) && d.assignedEmployees.length > 0,
          })),
        });
      });

      setProjects(rows);
      setLoading(false);
    }

    fetchProjects();
  }, []);

  /* ---------------- Filter by selected month/year ---------------- */
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const [y, m] = p.projectDate.split("-").map(Number);
      return y === year && m - 1 === month;
    });
  }, [projects, month, year]);

  /* ---------------- Collect all unique deliverable names (columns) ---------------- */
  const allDeliverableNames = useMemo<string[]>(() => {
    const namesSet = new Set<string>();
    filteredProjects.forEach((p) => {
      p.deliverables.forEach((d) => namesSet.add(d.name));
    });
    return Array.from(namesSet).sort();
  }, [filteredProjects]);

  /* ---------------- Month Picker ---------------- */
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    setYear(y);
    setMonth(m - 1);
    localStorage.setItem("selectedMonthProjDelStatus", String(m - 1));
    localStorage.setItem("selectedYearProjDelStatus", String(y));
  };

  if (loading) return <p>Loading Deliverables Status...</p>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h2 className="text-lg font-semibold">Project Deliverables Status</h2>

        <input
          type="month"
          value={`${year}-${String(month + 1).padStart(2, "0")}`}
          onChange={handleMonthChange}
          className="rounded-md border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border shadow-sm">
        <table className="min-w-max w-full text-sm border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-100 px-3 py-2 text-left font-semibold border-b shadow-[1px_0_0_#e5e7eb]">
                Project
              </th>
              {allDeliverableNames.map((name) => (
                <th key={name} className="px-3 py-2 text-center font-medium border-b whitespace-nowrap">
                  {name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={allDeliverableNames.length + 1}
                  className="py-8 text-center text-gray-500 bg-white"
                >
                  No projects found for the selected month.
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => (
                <tr key={project.projectId} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium whitespace-nowrap shadow-[1px_0_0_#e5e7eb] z-10">
                    <div>{project.projectName}</div>
                    <div className="text-[10px] text-gray-400">
                      {new Date(project.projectDate + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </td>
                  {allDeliverableNames.map((name) => {
                    // Find deliverable in this project that matches the column name
                    const deliverable = project.deliverables.find((d) => d.name === name);

                    if (!deliverable) {
                      return (
                        <td key={name} className="px-2 py-2 text-center text-gray-300">
                          —
                        </td>
                      );
                    }

                    const style = getStatusStyle(deliverable.status);

                    return (
                      <td key={name} className="px-2 py-2 align-top">
                        <div
                          className={`rounded-md border px-2 py-1 text-center text-xs font-medium ${style.bg} ${style.text}`}
                        >
                          {style.label}
                        </div>
                        {deliverable.qty && (
                          <div className="text-[10px] text-gray-400 text-center mt-0.5">
                            Qty: {deliverable.qty}
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

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        {Object.entries(STATUS_STYLES).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`h-2.5 w-2.5 rounded-full border ${val.bg}`} />
            <span>{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
