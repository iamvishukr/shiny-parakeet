import React from "react";
import { FormField } from "./FormField";
import { DatePicker } from "./DatePicker";
import { Client } from "../types";

interface BasicInformationSectionProps {
  formData: {
    clientName: string;
    projectName: string;
    dates: Date | undefined;
    venues: string;
  };
  clients: Client[];
  onInputChange: (
    field: string,
    value: string | number | Date | undefined
  ) => void;
}

export function BasicInformationSection({
  formData,
  clients,
  onInputChange,
}: BasicInformationSectionProps) {
  const clientOptions = clients.map((client) => ({
    id: client.clientId,
    name: client.name,
  }));

  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">
        Basic Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Client Name"
          type="select"
          value={formData.clientName}
          onChange={(value) => onInputChange("clientName", value)}
          placeholder="Select client"
          options={clientOptions}
          required
        />

        <FormField
          label="Project Name"
          value={formData.projectName}
          onChange={(value) => onInputChange("projectName", value)} // editable
          placeholder="Enter project name"
          required
        />

        <DatePicker
          label="Date"
          value={formData.dates}
          onChange={(date) => onInputChange("dates", date)}
          placeholder="Select date"
          required
        />

        <FormField
          label="Venue"
          value={formData.venues}
          onChange={(value) => onInputChange("venues", value)}
          placeholder="Enter venue(s)"
          required
        />
      </div>
    </div>
  );
}
