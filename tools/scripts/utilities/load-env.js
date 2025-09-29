#!/usr/bin/env node
/**
 * Environment Variable Loader for Claude Code
 *
 * Always loads from .env.local first, then supplements with process.env
 * Usage: const env = require('./tools/scripts/utilities/load-env.js');
 */

const fs = require('fs');
const path = require('path');

// Find project root
const projectRoot = path.resolve(__dirname, '../../../');
const envLocalPath = path.join(projectRoot, '.env.local');

function loadEnvironment() {
    const env = { ...process.env };

    // Always load .env.local first if it exists
    if (fs.existsSync(envLocalPath)) {
        const envContent = fs.readFileSync(envLocalPath, 'utf8');
        const lines = envContent.split('\n');

        for (const line of lines) {
            // Skip comments and empty lines
            if (line.trim() === '' || line.trim().startsWith('#')) {
                continue;
            }

            // Parse KEY=VALUE format
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();

                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                env[key] = value;
            }
        }

        console.log('✅ Environment loaded from .env.local');
    } else {
        console.log('⚠️  .env.local not found, using process.env only');
    }

    return env;
}

// Load and expose environment
const env = loadEnvironment();

// Helper functions
env.getSupabaseUrl = () => env.NEXT_PUBLIC_SUPABASE_URL;
env.getSupabaseKey = () => env.SUPABASE_SERVICE_ROLE_KEY;
env.getGeminiKey = () => env.GOOGLE_AI_API_KEY;
env.getPostgresUrl = () => env.POSTGRES_URL_NON_POOLING;

// Status check function
env.checkStatus = () => {
    console.log('🔍 Environment Status Check:');
    console.log('=====================================');
    console.log('Supabase URL:', env.getSupabaseUrl() ? '✅ Available' : '❌ Missing');
    console.log('Supabase Service Key:', env.getSupabaseKey() ? '✅ Available' : '❌ Missing');
    console.log('Gemini API Key:', env.getGeminiKey() ? '✅ Available' : '❌ Missing');
    console.log('Postgres URL:', env.getPostgresUrl() ? '✅ Available' : '❌ Missing');
    console.log('=====================================');
};

// If run directly, show status
if (require.main === module) {
    env.checkStatus();
}

module.exports = env;