import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeliverableOption {
  deliverableId: string;
  name: string;
}

interface DeliverableRow {
  id: string;
  name: string;
  qty: string;
  description: string;
  isNew?: boolean;
}

interface DeliverablesTableSectionProps {
  deliverablesData: DeliverableRow[];
  deliverableOptions: DeliverableOption[];
  onChange: (index: number, field: "name" | "qty" | "description", value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
}

export const DeliverablesTableSection: React.FC<DeliverablesTableSectionProps> = ({
  deliverablesData,
  deliverableOptions,
  onChange,
  onAddRow,
  onRemoveRow,
}) => {
  return (
    <div className="bg-white rounded-lg border p-4 mt-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Deliverables</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Sl No.</th>
              <th className="border px-2 py-1">Deliverable Name</th>
              <th className="border px-2 py-1">Qty Details</th>
              <th className="border px-2 py-1">Description</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliverablesData.map((row, idx) => (
              <tr key={row.id}>
                <td className="border px-2 py-1 text-center">{idx + 1}</td>
                <td className="border px-2 py-1">
                  {row.isNew ? (
                    <Select
                      value={row.name}
                      onValueChange={(value) => onChange(idx, "name", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select deliverable" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliverableOptions.map((option) => (
                          <SelectItem key={option.deliverableId} value={option.deliverableId}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="px-2 py-1">{row.name}</div>
                  )}
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={row.qty}
                    onChange={(e) => onChange(idx, "qty", e.target.value)}
                    className="w-full border rounded px-1 py-0.5"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => onChange(idx, "description", e.target.value)}
                    className="w-full border rounded px-1 py-0.5"
                  />
                </td>
                <td className="border px-2 py-1 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveRow(idx)}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" onClick={onAddRow} className="mt-2">
        Add Row
      </Button>
    </div>
  );
};
