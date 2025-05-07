/**
 * Collection of helper functions for the application
 */

/**
 * Generates a random UUID v4 string
 * @returns {string} A UUID v4 formatted string
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Format a date to a localized string representation
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

/**
 * Format a date to a localized time representation
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Truncate a string to a maximum length and add ellipsis if needed
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Truncated string
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}