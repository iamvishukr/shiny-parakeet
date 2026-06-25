"use client";

import { LeaveBalanceEntry } from "./types";

interface Props {
  typeId: string;
  typeName: string;
  balance: LeaveBalanceEntry;
  description?: string;
}

export default function LeaveBalanceCard({ typeId, typeName, balance, description }: Props) {
  const percentage = balance.total > 0 ? (balance.used / balance.total) * 100 : 0;

  const getBarColor = () => {
    if (typeId === "CompOff") return "bg-purple-500";
    if (percentage > 80) return "bg-red-500";
    if (percentage > 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{typeName}</h3>
        <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
          {typeId}
        </span>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">{balance.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div>
          <div className="text-lg font-bold text-orange-600">{balance.used}</div>
          <div className="text-xs text-muted-foreground">Used</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">{balance.available}</div>
          <div className="text-xs text-muted-foreground">Available</div>
        </div>
      </div>

      {/* Progress bar */}
      {balance.total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getBarColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}

      {/* Next Expiry Info */}
      {balance.nextExpiryDate && balance.nextExpiryAmount && balance.nextExpiryAmount > 0 && (
        <div className="text-xs text-muted-foreground flex items-center justify-between border-t pt-2 mt-2">
          <span>Expires Next:</span>
          <span className="font-medium text-red-500">
            {balance.nextExpiryAmount} on {new Date(balance.nextExpiryDate).toLocaleDateString("en-GB")}
          </span>
        </div>
      )}
    </div>
  );
}
