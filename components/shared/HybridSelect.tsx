import React, { useEffect, useState } from "react";

interface Option {
  id?: string | number;
  name: string;
}

interface HybridSelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

const HybridSelect: React.FC<HybridSelectProps> = ({ label, options, value, onChange }) => {
  const [customValue, setCustomValue] = useState<string>("");
  const [isOtherSelected, setIsOtherSelected] = useState<boolean>(false);

  // 🔹 Detect if current value is not in options → treat it as custom
  useEffect(() => {
    if ((value || value === "") && !options.some((opt) => (opt.id ?? opt.name) === value)) {
      setIsOtherSelected(true);
      setCustomValue(value);
    } else {
      setIsOtherSelected(false);
      setCustomValue("");
    }
  }, [value, options]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val !== "other") {
      setIsOtherSelected(false);
      setCustomValue("");
      onChange(val);
    } else {
      setIsOtherSelected(true);
      onChange(customValue || ""); // keep current custom value if exists
    }
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomValue(val);
    onChange(val);
  };
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}

      <select
        className="w-full border rounded p-2"
        value={isOtherSelected ? "other" : value}
        onChange={handleSelectChange}
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt.id ?? opt.name} value={opt.id ?? opt.name}>
            {opt.name}
          </option>
        ))}
        <option value="other">Other</option>
      </select>

      {isOtherSelected && (
        <input
          type="text"
          className="w-full border rounded p-2"
          placeholder={`Enter custom ${label}`}
          value={customValue}
          onChange={handleCustomInput}
        />
      )}
    </div>
  );
};

export default React.memo(HybridSelect);
