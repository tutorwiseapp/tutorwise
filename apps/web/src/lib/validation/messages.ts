/**
 * Enhanced validation messages for better UX
 * Provides clear, actionable feedback for form validation errors
 */

export const ValidationMessages = {
  // Common field validations
  required: (fieldName: string) => `${fieldName} is required`,

  minLength: (fieldName: string, min: number) =>
    `${fieldName} must be at least ${min} character${min === 1 ? '' : 's'}`,

  maxLength: (fieldName: string, max: number) =>
    `${fieldName} must be no more than ${max} character${max === 1 ? '' : 's'}`,

  email: () => 'Please enter a valid email address (e.g., name@example.com)',

  phone: () => 'Please enter a valid phone number (e.g., +44 20 1234 5678)',

  url: () => 'Please enter a valid URL (e.g., https://example.com)',

  // Number validations
  minValue: (fieldName: string, min: number) =>
    `${fieldName} must be at least ${min}`,

  maxValue: (fieldName: string, max: number) =>
    `${fieldName} must be no more than ${max}`,

  positive: (fieldName: string) => `${fieldName} must be a positive number`,

  // Selection validations
  minSelection: (fieldName: string, min: number) =>
    `Please select at least ${min} ${fieldName.toLowerCase()}`,

  maxSelection: (fieldName: string, max: number) =>
    `Please select no more than ${max} ${fieldName.toLowerCase()}`,

  // Password validations
  passwordStrength: () =>
    'Password must be at least 8 characters and include uppercase, lowercase, and numbers',

  passwordMatch: () => 'Passwords do not match',

  // File upload validations
  fileSize: (maxSizeMB: number) =>
    `File size must be less than ${maxSizeMB}MB`,

  fileType: (allowedTypes: string[]) =>
    `Only ${allowedTypes.join(', ')} files are allowed`,

  // Date validations
  dateFormat: () => 'Please enter a valid date (YYYY-MM-DD)',

  futureDate: () => 'Date must be in the future',

  pastDate: () => 'Date must be in the past',

  // Custom validations
  custom: (message: string) => message,
};

/**
 * Format Zod error messages for better UX
 */
export function formatZodError(error: any): string {
  if (!error?.issues || error.issues.length === 0) {
    return 'Validation failed';
  }

  const firstIssue = error.issues[0];
  const path = firstIssue.path.join('.');
  const fieldName = formatFieldName(path);

  // Map Zod error codes to user-friendly messages
  switch (firstIssue.code) {
    case 'too_small':
      if (firstIssue.type === 'string') {
        return ValidationMessages.minLength(fieldName, firstIssue.minimum);
      }
      if (firstIssue.type === 'array') {
        return ValidationMessages.minSelection(fieldName, firstIssue.minimum);
      }
      return ValidationMessages.minValue(fieldName, firstIssue.minimum);

    case 'too_big':
      if (firstIssue.type === 'string') {
        return ValidationMessages.maxLength(fieldName, firstIssue.maximum);
      }
      if (firstIssue.type === 'array') {
        return ValidationMessages.maxSelection(fieldName, firstIssue.maximum);
      }
      return ValidationMessages.maxValue(fieldName, firstIssue.maximum);

    case 'invalid_type':
      if (firstIssue.expected === 'string' && firstIssue.received === 'undefined') {
        return ValidationMessages.required(fieldName);
      }
      return `${fieldName} has an invalid type`;

    case 'invalid_string':
      if (firstIssue.validation === 'email') {
        return ValidationMessages.email();
      }
      if (firstIssue.validation === 'url') {
        return ValidationMessages.url();
      }
      return firstIssue.message;

    default:
      return firstIssue.message || 'Validation failed';
  }
}

/**
 * Convert field path to readable name
 */
export function formatFieldName(path: string): string {
  if (!path) return 'Field';

  return path
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get suggestion text based on validation error
 */
export function getValidationSuggestion(fieldName: string, _errorCode: string): string | null {
  const suggestions: Record<string, string> = {
    email: 'Make sure to include @ and a domain (e.g., gmail.com)',
    phone: 'Include country code and area code',
    password: 'Try using a mix of uppercase, lowercase, numbers, and symbols',
    bio: 'Share a bit about yourself - your experience, interests, or teaching style',
    title: 'Make it descriptive so students know what you offer',
    description: 'Include key details like your approach, experience, and what makes you unique',
  };

  const key = fieldName.toLowerCase().replace(/\s+/g, '_');
  return suggestions[key] || null;
}

/**
 * Validation message builder for forms
 */
export class ValidationMessageBuilder {
  private fieldName: string;

  constructor(fieldName: string) {
    this.fieldName = fieldName;
  }

  required() {
    return ValidationMessages.required(this.fieldName);
  }

  minLength(min: number) {
    return ValidationMessages.minLength(this.fieldName, min);
  }

  maxLength(max: number) {
    return ValidationMessages.maxLength(this.fieldName, max);
  }

  minValue(min: number) {
    return ValidationMessages.minValue(this.fieldName, min);
  }

  maxValue(max: number) {
    return ValidationMessages.maxValue(this.fieldName, max);
  }

  minSelection(min: number) {
    return ValidationMessages.minSelection(this.fieldName, min);
  }

  maxSelection(max: number) {
    return ValidationMessages.maxSelection(this.fieldName, max);
  }
}

/**
 * Create validation message builder for a field
 */
export function field(fieldName: string): ValidationMessageBuilder {
  return new ValidationMessageBuilder(fieldName);
}
