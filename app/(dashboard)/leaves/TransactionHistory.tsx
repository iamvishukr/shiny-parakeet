"use client";

import { LeaveTransaction } from "./types";
import { formatDate } from "@/lib/utils";

interface Props {
  transactions: LeaveTransaction[];
}

export default function TransactionHistory({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No transactions yet.
      </p>
    );
  }

  // Sort by date descending (most recent first)
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Date</th>
            <th className="p-3 text-left font-medium">Type</th>
            <th className="p-3 text-left font-medium">Leave</th>
            <th className="p-3 text-center font-medium">Amount</th>
            <th className="p-3 text-left font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((tx, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="p-3 whitespace-nowrap">{formatDate(tx.date)}</td>
              <td className="p-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    tx.type === "credit"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {tx.type === "credit" ? "+ Credit" : "− Debit"}
                </span>
              </td>
              <td className="p-3">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                  {tx.leaveType}
                </span>
              </td>
              <td className="p-3 text-center font-medium">
                {tx.type === "credit" ? "+" : "−"}{tx.amount}
              </td>
              <td className="p-3 text-muted-foreground">{tx.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
