/**
 * Base Email Template System
 *
 * Implements the Tutorwise Design System for emails:
 * - Primary: #006c67 (teal)
 * - Primary Light: #E6F0F0 (header background)
 * - Text Primary: #202124
 * - Text Secondary: #5f6368
 * - Border: #e5e7eb
 * - Border Radius: 8px
 * - Font: Inter (with system fallbacks)
 */

// Design tokens
const tokens = {
  colors: {
    primary: '#006c67',
    primaryLight: '#E6F0F0',
    primaryDark: '#005550',
    textPrimary: '#202124',
    textSecondary: '#5f6368',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    background: '#f3f4f6',
    white: '#ffffff',
    success: '#059669',
    successLight: '#E8F5E9',
    warning: '#d97706',
    warningLight: '#FFF8E1',
    error: '#d32f2f',
    errorLight: '#FFEBEE',
  },
  fonts: {
    family:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  spacing: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
  },
  borderRadius: '8px',
};

export type EmailVariant = 'default' | 'success' | 'warning' | 'error';

interface HeaderConfig {
  background: string;
  textColor: string;
}

const variantConfig: Record<EmailVariant, HeaderConfig> = {
  default: {
    background: tokens.colors.primaryLight,
    textColor: tokens.colors.primary,
  },
  success: {
    background: tokens.colors.successLight,
    textColor: tokens.colors.success,
  },
  warning: {
    background: tokens.colors.warningLight,
    textColor: tokens.colors.warning,
  },
  error: {
    background: tokens.colors.errorLight,
    textColor: tokens.colors.error,
  },
};

export interface EmailTemplateOptions {
  /** Header headline text */
  headline: string;
  /** Email variant for header styling */
  variant?: EmailVariant;
  /** Recipient name for greeting */
  recipientName?: string;
  /** Main body content (HTML string) */
  body: string;
  /** Primary CTA button */
  cta?: {
    text: string;
    url: string;
  };
  /** Optional highlight box */
  highlight?: {
    label: string;
    value: string;
    /** Optional secondary value */
    sublabel?: string;
    subvalue?: string;
  };
  /** Optional footer note */
  footerNote?: string;
}

/**
 * Generates a complete email HTML using the Tutorwise design system
 */
export function generateEmailTemplate(options: EmailTemplateOptions): string {
  const {
    headline,
    variant = 'default',
    recipientName,
    body,
    cta,
    highlight,
    footerNote,
  } = options;

  const config = variantConfig[variant];

  const greeting = recipientName ? `<p style="margin: 0 0 16px 0; font-size: 16px; color: ${tokens.colors.textPrimary};">Hi ${recipientName},</p>` : '';

  const highlightSection = highlight
    ? `
    <div style="background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">${highlight.label}</p>
      <p style="margin: 4px 0 0 0; font-size: 32px; font-weight: 700; color: ${config.textColor};">${highlight.value}</p>
      ${
        highlight.sublabel && highlight.subvalue
          ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${tokens.colors.border};">
          <p style="margin: 0; font-size: 12px; color: ${tokens.colors.textMuted};">${highlight.sublabel}</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 600; color: ${tokens.colors.textPrimary};">${highlight.subvalue}</p>
        </div>
      `
          : ''
      }
    </div>
  `
    : '';

  const ctaSection = cta
    ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${cta.url}" style="display: inline-block; background: ${tokens.colors.primary}; color: ${tokens.colors.white}; padding: 14px 32px; text-decoration: none; border-radius: ${tokens.borderRadius}; font-size: 16px; font-weight: 600;">${cta.text}</a>
    </div>
  `
    : '';

  const footerNoteSection = footerNote
    ? `<p style="margin: 24px 0 0 0; font-size: 14px; color: ${tokens.colors.textMuted}; font-style: italic;">${footerNote}</p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background: ${tokens.colors.background}; font-family: ${tokens.fonts.family};">
  <div style="max-width: 600px; margin: 0 auto; padding: ${tokens.spacing.lg};">
    <!-- Email Card -->
    <div style="background: ${tokens.colors.white}; border-radius: ${tokens.borderRadius}; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); overflow: hidden;">

      <!-- Header -->
      <div style="background: ${config.background}; padding: ${tokens.spacing.lg}; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: ${config.textColor};">${headline}</h1>
      </div>

      <!-- Body -->
      <div style="padding: ${tokens.spacing.lg};">
        ${greeting}
        <div style="font-size: 16px; line-height: 1.6; color: ${tokens.colors.textSecondary};">
          ${body}
        </div>
        ${highlightSection}
        ${ctaSection}
        ${footerNoteSection}
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid ${tokens.colors.border}; padding: 24px ${tokens.spacing.lg}; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${tokens.colors.primary};">Tutorwise</p>
        <p style="margin: 0; font-size: 12px; color: ${tokens.colors.textMuted};">&copy; ${new Date().getFullYear()} Tutorwise. All rights reserved.</p>
      </div>

    </div>
  </div>
</body>
</html>
`.trim();
}

/**
 * Helper to create simple paragraph content
 */
export function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px 0;">${text}</p>`;
}

/**
 * Helper to create bold text
 */
export function bold(text: string): string {
  return `<strong style="color: ${tokens.colors.textPrimary};">${text}</strong>`;
}

/**
 * Helper to create a link
 */
export function link(text: string, url: string): string {
  return `<a href="${url}" style="color: ${tokens.colors.primary}; text-decoration: underline;">${text}</a>`;
}

/**
 * Helper to create a two-column info row (table-based for email client compatibility)
 */
export function infoRow(label: string, value: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
      <tr>
        <td style="padding: 8px 0; color: ${tokens.colors.textMuted}; font-size: 15px;">${label}</td>
        <td style="padding: 8px 0; color: ${tokens.colors.textPrimary}; font-weight: 500; font-size: 15px; text-align: right;">${value}</td>
      </tr>
    </table>
  `;
}

/**
 * Helper to create a stage transition display
 */
export function stageTransition(from: string, to: string): string {
  return `
    <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin: 24px 0;">
      <span style="background: ${tokens.colors.textMuted}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px;">${from}</span>
      <span style="font-size: 20px; color: ${tokens.colors.textMuted};">&rarr;</span>
      <span style="background: ${tokens.colors.success}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px;">${to}</span>
    </div>
  `;
}

export { tokens };
