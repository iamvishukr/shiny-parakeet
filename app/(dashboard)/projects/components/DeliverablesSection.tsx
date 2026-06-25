import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Deliverable } from "../types";

interface DeliverablesSectionProps {
  deliverables: Deliverable[];
  selectedDeliverables: string[];
  onDeliverableChange: (deliverableId: string, checked: boolean) => void;
}

export function DeliverablesSection({
  deliverables,
  selectedDeliverables,
  onDeliverableChange,
}: DeliverablesSectionProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Deliverables *</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-3 border rounded-md bg-gray-50">
        {deliverables.map((deliverable) => (
          <div key={deliverable.deliverableId} className="flex items-center space-x-2">
            <Checkbox
              id={deliverable.deliverableId}
              checked={selectedDeliverables.includes(deliverable.deliverableId)}
              onCheckedChange={(checked) => 
                onDeliverableChange(deliverable.deliverableId, checked as boolean)
              }
            />
            <Label htmlFor={deliverable.deliverableId} className="text-sm">
              {deliverable.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
} 