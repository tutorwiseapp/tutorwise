/*
 * Filename: src/lib/utils/getErrorMessage.ts
 * Purpose: Provides a centralized, type-safe utility for parsing error messages.
 * Change History:
 * C001 - 2025-08-21 : 21:00 - Initial creation.
 * Last Modified: 2025-08-21 : 21:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This utility was created to centralize and harden error handling across the application. It can safely extract a meaningful message from various error types (standard Error objects, Stripe errors, API JSON responses, etc.), providing a consistent and reliable way to generate user-facing error messages.
 * Impact Analysis: Improves the robustness and maintainability of all data-fetching components.
 */

export const getErrorMessage = (error: unknown): string => {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String(error.message);
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = "An unknown error occurred. Please try again.";
  }

  return message;
};