#!/usr/bin/env node
/**
 * Claude Code Permission Checker
 *
 * Simple utility to check if an action is allowed according to RBAC file
 * Usage: node tools/scripts/utilities/check-claude-permissions.ts <action> <environment>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// Assuming load-env.js is converted or can be imported. For now, let's handle it.
// import env from './load-env';
require('./load-env');


// --- Interfaces ---

interface Restriction {
  action: string;
  permission: 'FORBIDDEN';
  description: string;
  requires_approval: boolean;
}

interface ApprovalItem {
  action: string;
  reason: string;
}

interface EnvironmentConfig {
  access_level: 'FULL' | 'RESTRICTED';
  restrictions: string;
}

interface RBACConfig {
  restrictions: Record<string, Restriction[]>;
  requires_approval: ApprovalItem[];
  environments: Record<string, EnvironmentConfig>;
}

const rbacPath = path.join(__dirname, '../../configs/claude-rbac-permissions.yml');

export function loadRBACConfig(): RBACConfig {
    try {
        const fileContents = fs.readFileSync(rbacPath, 'utf8');
        return yaml.load(fileContents) as RBACConfig;
    } catch (error: any) {
        console.error('❌ Could not load RBAC configuration:', error.message);
        process.exit(1);
    }
}

export function checkPermission(action: string, environment = 'development'): boolean | 'approval_required' {
    const rbac = loadRBACConfig();

    console.log(`🔍 Checking permission for: ${action} in ${environment}`);
    console.log('=====================================');

    for (const category in rbac.restrictions) {
        for (const restriction of rbac.restrictions[category]) {
            if (restriction.action.toLowerCase().includes(action.toLowerCase())) {
                if (restriction.permission === 'FORBIDDEN') {
                    console.log('🚫 ACTION FORBIDDEN');
                    console.log(`   Reason: ${restriction.description}`);
                    console.log(`   Requires Approval: ${restriction.requires_approval}`);
                    return false;
                }
            }
        }
    }

    for (const approvalItem of rbac.requires_approval || []) {
        if (approvalItem.action.toLowerCase().includes(action.toLowerCase())) {
            console.log('⚠️  ACTION REQUIRES APPROVAL');
            console.log(`   Reason: ${approvalItem.reason}`);
            console.log('   Please ask user for permission before proceeding');
            return 'approval_required';
        }
    }

    const envConfig = rbac.environments[environment];
    if (envConfig) {
        console.log(`📍 Environment: ${environment}`);
        console.log(`   Access Level: ${envConfig.access_level}`);
        console.log(`   Restrictions: ${envConfig.restrictions}`);
        if (envConfig.access_level === 'RESTRICTED' && environment === 'production') {
            console.log('⚠️  PRODUCTION ENVIRONMENT - Extra caution required');
        }
    }

    console.log('✅ ACTION ALLOWED');
    console.log('   Proceed with normal safety measures');
    return true;
}

function showHelp(): void {
    console.log(`
Claude Code Permission Checker...
`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showHelp();
        process.exit(0);
    }
    const action = args[0];
    const environment = args[1] || 'development';
    const result = checkPermission(action, environment);
    if (result === false) process.exit(1);
    if (result === 'approval_required') process.exit(2);
    process.exit(0);
}