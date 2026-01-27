#!/usr/bin/env npx tsx
/**
 * Tutorwise Email Testing Utility
 *
 * A CLI tool for testing email templates in development and staging environments.
 *
 * Usage:
 *   npx tsx tools/scripts/test-emails.ts [options] <command>
 *
 * Commands:
 *   send <type> <email>    Send a specific email type to the given address
 *   list                   List all available email types
 *   preview <type>         Preview email HTML in terminal (dry run)
 *   all <email>            Send all email types to the given address
 *
 * Examples:
 *   npx tsx tools/scripts/test-emails.ts send booking_confirmation admin@tutorwise.io
 *   npx tsx tools/scripts/test-emails.ts all admin@tutorwise.io
 *   npx tsx tools/scripts/test-emails.ts list
 *
 * Environment:
 *   CRON_SECRET            Required for authentication
 *   NEXT_PUBLIC_SITE_URL   API endpoint (default: https://www.tutorwise.io)
 */

import 'dotenv/config';

// ============================================================================
// Configuration
// ============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tutorwise.io';
const CRON_SECRET = process.env.CRON_SECRET;

interface EmailType {
  id: string;
  name: string;
  description: string;
  category: 'auth' | 'booking' | 'payment' | 'report';
}

const EMAIL_TYPES: EmailType[] = [
  // Auth
  { id: 'welcome', name: 'Welcome', description: 'Sent after email confirmation', category: 'auth' },
  { id: 'account_deleted', name: 'Account Deleted', description: 'Account deletion confirmation', category: 'auth' },

  // Booking
  { id: 'booking_request', name: 'Booking Request', description: 'New booking request to tutor', category: 'booking' },
  { id: 'booking_confirmation', name: 'Booking Confirmed', description: 'Confirmation to client', category: 'booking' },
  { id: 'booking_cancelled', name: 'Booking Cancelled', description: 'Cancellation notice', category: 'booking' },
  { id: 'session_reminder', name: 'Session Reminder', description: '24-hour reminder', category: 'booking' },

  // Payment
  { id: 'payment_receipt', name: 'Payment Receipt', description: 'After successful payment', category: 'payment' },
  { id: 'payment_failed', name: 'Payment Failed', description: 'When payment fails', category: 'payment' },
  { id: 'refund', name: 'Refund Processed', description: 'Refund confirmation', category: 'payment' },
  { id: 'withdrawal_processed', name: 'Withdrawal Processed', description: 'Payout sent to bank', category: 'payment' },
  { id: 'withdrawal_failed', name: 'Withdrawal Failed', description: 'Payout failed', category: 'payment' },

  // Reports
  { id: 'new_review', name: 'New Review', description: 'When someone leaves a review', category: 'report' },
  { id: 'tutor_report', name: 'Tutor Weekly Report', description: 'Weekly activity summary', category: 'report' },
  { id: 'agent_report', name: 'Agent Weekly Report', description: 'Weekly referral summary', category: 'report' },
];

// ============================================================================
// CLI Formatting
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string): void {
  console.log(message);
}

function success(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message: string): void {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

function warn(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function header(title: string): void {
  log('');
  log(`${colors.bold}${colors.cyan}📧 ${title}${colors.reset}`);
  log(`${'─'.repeat(50)}`);
}

// ============================================================================
// API Functions
// ============================================================================

async function sendTestEmail(type: string, to: string): Promise<boolean> {
  try {
    const response = await fetch(`${SITE_URL}/api/admin/test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({ type, to }),
    });

    const data = await response.json();

    if (response.ok) {
      return true;
    } else {
      error(`${type}: ${data.error}`);
      return false;
    }
  } catch (err) {
    error(`${type}: Network error - ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
}

// ============================================================================
// Commands
// ============================================================================

function listCommand(): void {
  header('Available Email Types');

  const categories = ['auth', 'booking', 'payment', 'report'] as const;
  const categoryNames = {
    auth: '🔐 Authentication',
    booking: '📅 Booking',
    payment: '💳 Payment',
    report: '📊 Reports',
  };

  for (const category of categories) {
    log('');
    log(`${colors.bold}${categoryNames[category]}${colors.reset}`);

    const emails = EMAIL_TYPES.filter(e => e.category === category);
    for (const email of emails) {
      log(`  ${colors.cyan}${email.id.padEnd(22)}${colors.reset} ${colors.dim}${email.description}${colors.reset}`);
    }
  }

  log('');
  log(`${colors.dim}Total: ${EMAIL_TYPES.length} email types${colors.reset}`);
}

async function sendCommand(type: string, to: string): Promise<void> {
  header(`Sending Test Email`);

  const emailType = EMAIL_TYPES.find(e => e.id === type);

  if (!emailType) {
    error(`Unknown email type: ${type}`);
    log(`\nRun ${colors.cyan}list${colors.reset} to see available types.`);
    process.exit(1);
  }

  log(`Type:      ${emailType.name}`);
  log(`Recipient: ${to}`);
  log(`Server:    ${SITE_URL}`);
  log('');

  const sent = await sendTestEmail(type, to);

  if (sent) {
    success(`Email sent successfully!`);
    log(`\n${colors.dim}Check ${to} for the test email.${colors.reset}`);
  } else {
    process.exit(1);
  }
}

async function allCommand(to: string): Promise<void> {
  header(`Sending All Test Emails`);

  log(`Recipient: ${to}`);
  log(`Server:    ${SITE_URL}`);
  log(`Count:     ${EMAIL_TYPES.length} emails`);
  log('');

  let successCount = 0;
  let failCount = 0;

  for (const emailType of EMAIL_TYPES) {
    process.stdout.write(`  ${emailType.id.padEnd(22)} `);

    const sent = await sendTestEmail(emailType.id, to);

    if (sent) {
      console.log(`${colors.green}✓${colors.reset}`);
      successCount++;
    } else {
      console.log(`${colors.red}✗${colors.reset}`);
      failCount++;
    }

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  log('');
  log(`${'─'.repeat(50)}`);
  log(`${colors.green}Sent: ${successCount}${colors.reset}  ${failCount > 0 ? `${colors.red}Failed: ${failCount}${colors.reset}` : ''}`);
}

function helpCommand(): void {
  log(`
${colors.bold}${colors.cyan}Tutorwise Email Testing Utility${colors.reset}

${colors.bold}USAGE${colors.reset}
  npx tsx tools/scripts/test-emails.ts <command> [arguments]

${colors.bold}COMMANDS${colors.reset}
  ${colors.cyan}send${colors.reset} <type> <email>    Send a specific email type
  ${colors.cyan}all${colors.reset} <email>            Send all email types
  ${colors.cyan}list${colors.reset}                   List all available email types
  ${colors.cyan}help${colors.reset}                   Show this help message

${colors.bold}EXAMPLES${colors.reset}
  ${colors.dim}# Send booking confirmation email${colors.reset}
  npx tsx tools/scripts/test-emails.ts send booking_confirmation admin@tutorwise.io

  ${colors.dim}# Send all test emails${colors.reset}
  npx tsx tools/scripts/test-emails.ts all admin@tutorwise.io

  ${colors.dim}# List available email types${colors.reset}
  npx tsx tools/scripts/test-emails.ts list

${colors.bold}ENVIRONMENT${colors.reset}
  CRON_SECRET             Required for API authentication
  NEXT_PUBLIC_SITE_URL    API endpoint (default: https://www.tutorwise.io)
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  // Check for CRON_SECRET
  if (!CRON_SECRET && command !== 'list' && command !== 'help') {
    error('CRON_SECRET environment variable is not set');
    log(`\n${colors.dim}Set CRON_SECRET in your .env.local file or environment.${colors.reset}`);
    process.exit(1);
  }

  switch (command) {
    case 'list':
      listCommand();
      break;

    case 'send':
      if (args.length < 3) {
        error('Missing arguments');
        log(`\nUsage: send <type> <email>`);
        log(`Example: send booking_confirmation admin@tutorwise.io`);
        process.exit(1);
      }
      await sendCommand(args[1], args[2]);
      break;

    case 'all':
      if (args.length < 2) {
        error('Missing email address');
        log(`\nUsage: all <email>`);
        log(`Example: all admin@tutorwise.io`);
        process.exit(1);
      }
      await allCommand(args[1]);
      break;

    case 'help':
    case '--help':
    case '-h':
      helpCommand();
      break;

    default:
      if (!command) {
        helpCommand();
      } else {
        error(`Unknown command: ${command}`);
        log(`\nRun ${colors.cyan}help${colors.reset} to see available commands.`);
        process.exit(1);
      }
  }
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
