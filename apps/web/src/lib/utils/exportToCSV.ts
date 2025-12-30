/**
 * Filename: src/lib/utils/exportToCSV.ts
 * Purpose: Shared utility for exporting data to CSV files
 * Created: 2025-12-30
 */

export interface CSVColumn<T> {
  key: keyof T | string;
  header: string;
  format?: (value: any, row: T) => string;
}

export interface ExportToCSVOptions {
  includeTimestamp?: boolean;
  delimiter?: string;
}

/**
 * Export data to CSV file
 * @param data - Array of objects to export
 * @param columns - Column definitions with headers and formatters
 * @param filename - Base filename (without extension or timestamp)
 * @param options - Optional configuration
 */
export function exportToCSV<T>(
  data: T[],
  columns: CSVColumn<T>[],
  filename: string,
  options: ExportToCSVOptions = {}
): void {
  const {
    includeTimestamp = true,
    delimiter = ',',
  } = options;

  // Generate CSV content
  const headers = columns.map((col) => col.header).join(delimiter);

  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value: any;

        // Handle nested keys (e.g., 'user.name')
        if (typeof col.key === 'string' && col.key.includes('.')) {
          const keys = col.key.split('.');
          value = keys.reduce((obj: any, key) => obj?.[key], row);
        } else {
          value = row[col.key as keyof T];
        }

        // Apply formatter if provided
        if (col.format) {
          value = col.format(value, row);
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }

        // Convert to string and escape
        const stringValue = String(value);

        // Escape quotes and wrap in quotes if contains delimiter, quotes, or newlines
        if (
          stringValue.includes(delimiter) ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      })
      .join(delimiter);
  });

  const csvContent = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  // Add timestamp to filename if enabled
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().split('T')[0]}`
    : '';
  const fullFilename = `${filename}${timestamp}.csv`;

  // Create download link
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fullFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Common formatters for CSV export
 */
export const CSVFormatters = {
  date: (value: string | Date) => {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleDateString('en-GB');
  },

  datetime: (value: string | Date) => {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleString('en-GB');
  },

  currency: (value: number, currency: string = 'GBP') => {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(value);
  },

  percentage: (value: number, decimals: number = 1) => {
    if (value === null || value === undefined) return '';
    return `${value.toFixed(decimals)}%`;
  },

  boolean: (value: boolean) => {
    return value ? 'Yes' : 'No';
  },

  array: (value: any[]) => {
    if (!Array.isArray(value)) return '';
    return value.join('; ');
  },
};
