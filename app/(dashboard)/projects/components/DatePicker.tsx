import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  label: string;
  required?: boolean;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  label,
  required = false,
  value,
  onChange,
  disabled = false,
}: DatePickerProps) {
  // Convert Date to YYYY-MM-DD format for input
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return "";
    return date.toISOString().split('T')[0];
  };

  // Convert YYYY-MM-DD string to Date
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    if (dateString) {
      const date = new Date(dateString);
      onChange(date);
    } else {
      onChange(undefined);
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  // const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && "*"}
      </Label>
      <Input
        type="date"
        className="h-10 w-full"
        value={formatDateForInput(value)}
        onChange={handleDateChange}
        // min={today}
        disabled={disabled}
        required={required}
      />
    </div>
  );
} 