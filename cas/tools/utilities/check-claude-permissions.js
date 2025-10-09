#!/usr/bin/env node
/**
 * Claude Code Permission Checker
 *
 * Simple utility to check if an action is allowed according to RBAC file
 * Usage: node tools/scripts/utilities/check-claude-permissions.js <action> <environment>
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const env = require('./load-env.js');

// Load RBAC configuration
const rbacPath = path.join(__dirname, '../../configs/claude-rbac-permissions.yml');

function loadRBACConfig() {
    try {
        const fileContents = fs.readFileSync(rbacPath, 'utf8');
        return yaml.load(fileContents);
    } catch (error) {
        console.error('❌ Could not load RBAC configuration:', error.message);
        process.exit(1);
    }
}

function checkPermission(action, environment = 'development') {
    const rbac = loadRBACConfig();

    console.log(`🔍 Checking permission for: ${action} in ${environment}`);
    console.log('=====================================');

    // Check if action is explicitly forbidden
    const restrictions = rbac.restrictions;
    for (const category in restrictions) {
        const categoryRestrictions = restrictions[category];
        for (const restriction of categoryRestrictions) {
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

    // Check if action requires approval
    const requiresApproval = rbac.requires_approval || [];
    for (const approvalItem of requiresApproval) {
        if (approvalItem.action.toLowerCase().includes(action.toLowerCase())) {
            console.log('⚠️  ACTION REQUIRES APPROVAL');
            console.log(`   Reason: ${approvalItem.reason}`);
            console.log('   Please ask user for permission before proceeding');
            return 'approval_required';
        }
    }

    // Check environment-specific restrictions
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

function showHelp() {
    console.log(`
Claude Code Permission Checker

Usage:
  node check-claude-permissions.js <action> [environment]

Examples:
  node check-claude-permissions.js "DELETE DATABASE" production
  node check-claude-permissions.js "CREATE TABLE" development
  node check-claude-permissions.js "UPDATE CODE" staging

Environments: development, staging, production (default: development)
`);
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showHelp();
        process.exit(0);
    }

    const action = args[0];
    const environment = args[1] || 'development';

    const result = checkPermission(action, environment);

    // Exit with appropriate code
    if (result === false) {
        process.exit(1); // Forbidden
    } else if (result === 'approval_required') {
        process.exit(2); // Needs approval
    } else {
        process.exit(0); // Allowed
    }
}

module.exports = { checkPermission, loadRBACConfig };