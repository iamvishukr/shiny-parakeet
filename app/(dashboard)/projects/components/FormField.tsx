import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FormFieldProps {
  label: string;
  required?: boolean;
  type?: "text" | "number" | "select";
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  options?: Array<{ id: string; name: string }>;
  min?: number;
  readOnly?: boolean;
  className?: string;
}

export function FormField({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder,
  options = [],
  min,
  readOnly = false,
  className = "",
}: FormFieldProps) {
  const renderField = () => {
    if (type === "select") {
      // Ensure value is a string and handle empty values
      const selectValue = value ? String(value) : "";
      
      return (
        <select
          value={selectValue}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          className={`h-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
          disabled={readOnly}
          required={required}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      );
    }

    return (
      <Input
        className={`h-10 w-full ${className}`}
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        min={min}
        readOnly={readOnly}
        required={required}
      />
    );
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && "*"}
      </Label>
      {renderField()}
    </div>
  );
} 