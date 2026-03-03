import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea número con separadores de miles (sin decimales)
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return Math.round(num).toLocaleString('es-MX');
}

/**
 * Parsea string formateado a número
 */
export function parseFormattedNumber(value: string): number {
  const cleaned = value.replace(/,/g, '').replace(/\./g, '');
  return parseFloat(cleaned) || 0;
}
