/**
 * Filename: formHelpers.ts
 * Purpose: Shared utility functions for form components
 * Created: 2026-01-09
 */

/**
 * Truncates text with ellipsis if it exceeds the specified length
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 30)
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number = 30): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Formats multi-select trigger label based on number of selected items
 * - 0 items: Shows placeholder
 * - 1 item: Shows item name (truncated if > 30 chars)
 * - 2 items: Shows "Item1, Item2" (both truncated if needed)
 * - 3+ items: Shows "Item1, Item2, +X" (both truncated if needed)
 *
 * @param selectedValues - Array of selected value strings
 * @param placeholder - Placeholder text when no items selected
 * @returns Formatted label string
 *
 * @example
 * formatMultiSelectLabel([], 'Select subjects')
 * // Returns: "Select subjects"
 *
 * formatMultiSelectLabel(['Mathematics'], 'Select subjects')
 * // Returns: "Mathematics"
 *
 * formatMultiSelectLabel(['Mathematics', 'Science'], 'Select subjects')
 * // Returns: "Mathematics, Science"
 *
 * formatMultiSelectLabel(['Mathematics', 'Science', 'History', 'Geography'], 'Select subjects')
 * // Returns: "Mathematics, Science, +2"
 *
 * formatMultiSelectLabel(['Advanced Placement Calculus BC with Additional Topics'], 'Select subjects')
 * // Returns: "Advanced Placement Calculus BC..."
 */
export const formatMultiSelectLabel = (
  selectedValues: string[],
  placeholder: string
): string => {
  if (selectedValues.length === 0) return placeholder;

  if (selectedValues.length === 1) {
    return truncateText(selectedValues[0]);
  }

  if (selectedValues.length === 2) {
    return `${truncateText(selectedValues[0])}, ${truncateText(selectedValues[1])}`;
  }

  return `${truncateText(selectedValues[0])}, ${truncateText(selectedValues[1])}, +${selectedValues.length - 2}`;
};
