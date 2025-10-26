#!/usr/bin/env node
/**
 * Environment Variable Loader for Claude Code
 *
 * Always loads from .env.local first, then supplements with process.env
 * Usage: import env from './tools/scripts/utilities/load-env';
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(__dirname, '../../../');
const envLocalPath = path.join(projectRoot, '.env.local');

interface Env extends Record<string, string | undefined | (() => string | undefined) | (() => void)> {
  getSupabaseUrl: () => string | undefined;
  getSupabaseKey: () => string | undefined;
  getGeminiKey: () => string | undefined;
  getPostgresUrl: () => string | undefined;
  checkStatus: () => void;
}

function loadEnvironment(): Env {
    const env: any = { ...process.env };

    if (fs.existsSync(envLocalPath)) {
        const envContent = fs.readFileSync(envLocalPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            if (line.trim() === '' || line.trim().startsWith('#')) continue;
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        }
        console.log('✅ Environment loaded from .env.local');
    } else {
        console.log('⚠️  .env.local not found, using process.env only');
    }

    env.getSupabaseUrl = () => env.NEXT_PUBLIC_SUPABASE_URL;
    env.getSupabaseKey = () => env.SUPABASE_SERVICE_ROLE_KEY;
    env.getGeminiKey = () => env.GOOGLE_AI_API_KEY;
    env.getPostgresUrl = () => env.POSTGRES_URL_NON_POOLING;

    env.checkStatus = () => {
        console.log('🔍 Environment Status Check:');
        console.log('=====================================');
        console.log('Supabase URL:', env.getSupabaseUrl() ? '✅ Available' : '❌ Missing');
        console.log('Supabase Service Key:', env.getSupabaseKey() ? '✅ Available' : '❌ Missing');
        console.log('Gemini API Key:', env.getGeminiKey() ? '✅ Available' : '❌ Missing');
        console.log('Postgres URL:', env.getPostgresUrl() ? '✅ Available' : '❌ Missing');
        console.log('=====================================');
    };

    return env as Env;
}

const env = loadEnvironment();

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    env.checkStatus();
}

export default env;