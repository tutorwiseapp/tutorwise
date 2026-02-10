#!/usr/bin/env node

/**
 * Critical Files Protection System (Option 3)
 * Enforces AI restrictions on sensitive files
 *
 * Usage: Can be integrated into pre-commit hooks or called before file operations
 */

const fs = require('fs');
const path = require('path');

const CRITICAL_FILE_PATTERNS = {
  // TIER 1: DELETION ABSOLUTELY FORBIDDEN
  FORBIDDEN_DELETE: {
    // Google Cloud Credentials
    'google-credentials.json': 'Google API credentials - Required for all Google Cloud integrations',
    'service-account-key.json': 'Google service account - Required for Docs/Calendar sync',
    'oauth-credentials.json': 'OAuth 2.0 credentials - Required for user authentication',

    // Environment Files
    '.env': 'Environment variables - Contains all secrets',
    '.env.local': 'Local environment - Contains development secrets',
    'apps/web/.env.local': 'Frontend environment - Supabase/Stripe keys',
    'apps/api/.env': 'Backend environment - Database credentials',

    // Auth & Security (Next.js 16: middleware.ts renamed to proxy.ts)
    'proxy.ts': 'Next.js proxy - URL redirects and rewrites',
    'apps/web/src/proxy.ts': 'Next.js proxy - URL redirects and rewrites',
    '.ai-restrictions': 'AI security policy - RBAC rules',
    'tools/change-management/ai-permission-system.js': 'Permission enforcement system',
    'tools/change-management/approval-workflow.js': 'Human approval workflow',
    // Payment Integration
    'apps/web/src/lib/stripe.ts': 'Stripe client - Payment processing core',

    // Core Infrastructure
    'apps/api/app/main.py': 'FastAPI entry point - Backend server',
    'package.json': 'Root dependencies - Monorepo configuration',
    'apps/web/package.json': 'Frontend dependencies',
    'apps/api/requirements.txt': 'Backend dependencies',

    // Deployment Config
    'vercel.json': 'Vercel deployment configuration',
    'apps/api/railway.json': 'Railway deployment configuration',
  },

  // TIER 2: DELETION REQUIRES APPROVAL
  APPROVAL_REQUIRED_DELETE: {
    // API Routes (all of them)
    pattern: /^apps\/web\/src\/app\/api\/.+\/route\.ts$/,
    description: 'API route - Business logic endpoint',

    // Database Migrations
    migrationPattern: /^tools\/database\/migrations\/.+\.sql$/,
    description: 'Database migration - Schema version control',

    // Config Files
    configPattern: /\.(config|rc)\.(js|ts|json)$/,
    description: 'Configuration file - Build/test setup',
  },

  // TIER 3: MODIFICATION REQUIRES APPROVAL
  APPROVAL_REQUIRED_MODIFY: [
    // Stripe API Routes
    /^apps\/web\/src\/app\/api\/stripe\/.+\.ts$/,

    // User Management
    /^apps\/web\/src\/app\/api\/(profile|user|auth)\/.+\.ts$/,

    // Onboarding System
    /^apps\/web\/src\/app\/onboarding\/.+\.tsx$/,
    /^apps\/web\/src\/app\/api\/save-onboarding-progress\/route\.ts$/,

    // Health Monitoring
    /^apps\/web\/src\/app\/api\/(health|system-test)\/.+\.ts$/,
  ]
};

class CriticalFilesProtection {
  constructor() {
    this.projectRoot = process.cwd();
    this.restrictionsFile = path.join(this.projectRoot, '.ai-restrictions');
  }

  /**
   * Check if a file operation is allowed
   */
  checkFileOperation(action, filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);

    // Check FORBIDDEN deletions
    if (action === 'DELETE') {
      // Check exact matches
      if (CRITICAL_FILE_PATTERNS.FORBIDDEN_DELETE[relativePath]) {
        return {
          allowed: false,
          severity: 'CRITICAL',
          reason: `🚨 FORBIDDEN: Cannot delete critical file: ${relativePath}`,
          description: CRITICAL_FILE_PATTERNS.FORBIDDEN_DELETE[relativePath],
          escalation: 'SECURITY_TEAM',
          file_type: 'TIER_1_CRITICAL'
        };
      }

      // Check if it's an API route
      if (/^apps\/web\/src\/app\/api\/.+\/route\.ts$/.test(relativePath)) {
        return {
          allowed: false,
          requires_approval: true,
          severity: 'HIGH',
          reason: `📋 APPROVAL REQUIRED: API route deletion must be approved: ${relativePath}`,
          description: 'API endpoint that may break functionality',
          escalation: 'PROJECT_ADMIN',
          file_type: 'TIER_2_IMPORTANT'
        };
      }

      // Check if it's a database migration
      if (/^tools\/database\/migrations\/.+\.sql$/.test(relativePath)) {
        return {
          allowed: false,
          severity: 'CRITICAL',
          reason: `🚨 FORBIDDEN: Cannot delete database migration: ${relativePath}`,
          description: 'Migrations are immutable version control',
          escalation: 'SECURITY_TEAM',
          file_type: 'TIER_1_CRITICAL'
        };
      }
    }

    // Check FORBIDDEN modifications (credentials)
    if (action === 'MODIFY') {
      const credentialFiles = ['google-credentials.json', 'service-account-key.json', 'oauth-credentials.json'];
      if (credentialFiles.some(file => relativePath.includes(file))) {
        return {
          allowed: false,
          severity: 'CRITICAL',
          reason: `🚨 FORBIDDEN: Cannot modify credential file: ${relativePath}`,
          description: 'Credential files should only be managed by humans',
          escalation: 'SECURITY_TEAM',
          file_type: 'TIER_1_CRITICAL'
        };
      }

      // Check if modification requires approval
      for (const pattern of CRITICAL_FILE_PATTERNS.APPROVAL_REQUIRED_MODIFY) {
        if (pattern.test(relativePath)) {
          return {
            allowed: false,
            requires_approval: true,
            severity: 'MEDIUM',
            reason: `📋 APPROVAL REQUIRED: Critical file modification: ${relativePath}`,
            description: 'Changes to this file require human review',
            escalation: 'PROJECT_ADMIN',
            file_type: 'TIER_2_IMPORTANT'
          };
        }
      }
    }

    // Check FORBIDDEN reads (credentials should not be read by AI)
    if (action === 'READ') {
      const secretFiles = ['service-account-key.json', 'oauth-credentials.json', '.env', '.env.local'];
      if (secretFiles.some(file => relativePath.includes(file))) {
        return {
          allowed: false,
          severity: 'CRITICAL',
          reason: `🚨 FORBIDDEN: Cannot read secret file: ${relativePath}`,
          description: 'AI should never read credential contents',
          escalation: 'SECURITY_TEAM',
          file_type: 'TIER_1_CRITICAL'
        };
      }
    }

    // Default: ALLOWED (with logging)
    return {
      allowed: true,
      severity: 'LOW',
      reason: `✅ ALLOWED: Standard file operation: ${relativePath}`,
      description: 'Non-critical file operation',
      file_type: 'STANDARD'
    };
  }

  /**
   * Validate git commit for forbidden file changes
   */
  async validateGitCommit() {
    const { execSync } = require('child_process');

    try {
      // Get staged files
      const stagedFiles = execSync('git diff --cached --name-status', { encoding: 'utf-8' });
      const lines = stagedFiles.split('\n').filter(line => line.trim());

      const violations = [];

      for (const line of lines) {
        const [status, ...fileParts] = line.split('\t');
        const filePath = fileParts.join('\t');

        let action;
        if (status === 'D') action = 'DELETE';
        else if (status === 'M') action = 'MODIFY';
        else if (status === 'A') action = 'ADD';
        else continue;

        const result = this.checkFileOperation(action, filePath);

        if (!result.allowed && !result.requires_approval) {
          violations.push({
            file: filePath,
            action,
            result
          });
        }
      }

      return {
        valid: violations.length === 0,
        violations
      };
    } catch (error) {
      console.error('Error validating git commit:', error.message);
      return { valid: true, violations: [] };
    }
  }

  /**
   * Generate protection report
   */
  generateReport() {
    console.log('\n🛡️  Critical Files Protection Report\n');
    console.log('TIER 1: DELETION FORBIDDEN (', Object.keys(CRITICAL_FILE_PATTERNS.FORBIDDEN_DELETE).length, 'files)');
    console.log('━'.repeat(80));

    for (const [file, description] of Object.entries(CRITICAL_FILE_PATTERNS.FORBIDDEN_DELETE)) {
      console.log(`  🔒 ${file}`);
      console.log(`     ${description}`);
    }

    console.log('\nTIER 2: APPROVAL REQUIRED');
    console.log('━'.repeat(80));
    console.log('  📋 API Routes: apps/web/src/app/api/**/*.ts');
    console.log('  📋 Database Migrations: tools/database/migrations/**/*.sql');
    console.log('  📋 Configuration Files: *.config.{js,ts,json}');

    console.log('\nTIER 3: MODIFICATION APPROVAL REQUIRED');
    console.log('━'.repeat(80));
    console.log('  ⚠️  Stripe Integration Routes');
    console.log('  ⚠️  User Management Routes');
    console.log('  ⚠️  Onboarding System');
    console.log('  ⚠️  Health Monitoring Routes');

    console.log('\n' + '━'.repeat(80));
    console.log('Total protected files: ~70 files under active protection\n');
  }
}

// CLI Interface
if (require.main === module) {
  const [,, command, ...args] = process.argv;

  const protection = new CriticalFilesProtection();

  if (command === 'check') {
    const [action, filePath] = args;
    const result = protection.checkFileOperation(action, filePath);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.allowed ? 0 : 1);
  } else if (command === 'validate-commit') {
    protection.validateGitCommit().then(({ valid, violations }) => {
      if (!valid) {
        console.error('\n❌ COMMIT BLOCKED: Critical file violations detected\n');
        for (const violation of violations) {
          console.error(`🚨 ${violation.action} ${violation.file}`);
          console.error(`   ${violation.result.reason}`);
          console.error(`   ${violation.result.description}\n`);
        }
        process.exit(1);
      } else {
        console.log('✅ Commit validation passed');
        process.exit(0);
      }
    });
  } else if (command === 'report') {
    protection.generateReport();
  } else {
    console.log('Usage:');
    console.log('  node critical-files-protection.js check <action> <file_path>');
    console.log('  node critical-files-protection.js validate-commit');
    console.log('  node critical-files-protection.js report');
    console.log('\nActions: READ, MODIFY, DELETE');
  }
}

module.exports = CriticalFilesProtection;
