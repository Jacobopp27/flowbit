import { formatNumber, parseFormattedNumber } from "@/lib/utils";
import { useState, useEffect } from "react";

interface FormattedNumberInputProps {
  value?: number | null;
  onChange: (value: number | undefined) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  step?: number;
  required?: boolean;
}

export function FormattedNumberInput({
  value,
  onChange,
  className = "",
  placeholder = "0",
  min = 0,
  step = 0.01,
  required = false,
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (value === null || value === undefined || value === 0) return '';
    return formatNumber(value);
  });

  useEffect(() => {
    if (value === null || value === undefined || value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatNumber(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;

    // Solo permitir números y comas
    rawValue = rawValue.replace(/[^\d,]/g, '');

    // Si está vacío, llamar onChange con undefined
    if (rawValue === '' || rawValue === '0') {
      setDisplayValue('');
      onChange(undefined);
      return;
    }

    const numericValue = parseFormattedNumber(rawValue);
    onChange(numericValue);
    setDisplayValue(formatNumber(numericValue));
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      placeholder={placeholder}
      required={required}
    />
  );
}
