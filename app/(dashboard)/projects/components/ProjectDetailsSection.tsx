import React from "react";
import { FormField } from "./FormField";
import { Event, Package } from "../types";
import HybridSelect from "@/components/shared/HybridSelect";

interface ProjectDetailsSectionProps {
  formData: {
    event: string;
    package: string;
    // shoot: string; // Remove shoot
    status: string;
  };
  events: Event[];
  packages: Package[];
  // shoots: Shoot[]; // Remove shoots
  onInputChange: (field: string, value: string | number) => void;
}

export function ProjectDetailsSection({
  formData,
  events,
  packages,
  onInputChange,
}: ProjectDetailsSectionProps) {
  const eventOptions = [
    ...events.map((event) => ({
      id: event.eventId,
      name: event.name,
    })),
  ];

  const packageOptions = packages.map((pkg) => ({
    id: pkg.packageId,
    name: pkg.name,
  }));

  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Project Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HybridSelect
          label="Project Type"
          options={eventOptions}
          value={formData.event}
          onChange={(val) => {
            const selectedOption = eventOptions.find((option) => option.id === val);
            onInputChange("event", val); // store value
            onInputChange("eventName", selectedOption?.name || val); // store label
          }}
        />

        <FormField
          label="Package"
          type="select"
          value={formData.package}
          onChange={(value) => onInputChange("package", value)}
          placeholder="Select package"
          options={packageOptions}
        />
        <FormField
          label="Status"
          type="select"
          value={formData.status}
          onChange={(value) => onInputChange("status", value)}
          placeholder="Select Status"
          options={[
            { id: "Pending", name: "Pending" },
            { id: "Cancelled", name: "Cancelled" },
            { id: "Postponed", name: "Postponed" },
            { id: "Resumed", name: "Resumed" },
            { id: "Not Confirmed", name: "Not Confirmed" },
          ]}
        />
      </div>
    </div>
  );
}
