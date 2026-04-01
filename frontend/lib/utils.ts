/**
 * Utility functions for the frontend
 */

/**
 * Combines class names conditionally
 * Simple implementation without external dependencies
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Format number with locale-specific thousands separator
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

/**
 * Format date to locale string
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

/**
 * Format short date (day/month)
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}
