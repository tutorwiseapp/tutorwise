#!/usr/bin/env node
/**
 * Gemini CLI Wrapper for Claude Code
 *
 * Provides a working alternative when the Python CLI has issues
 * Usage: node tools/scripts/utilities/gemini-wrapper.ts [command] [options]
 */

import { spawn } from 'child_process';
import env from './load-env';
import { fileURLToPath } from 'url';

export function runGeminiCLI(args: string[] = []): void {
    console.log('🔷 Starting Gemini CLI...');
    console.log('💡 Tip: Type "quit" or press Ctrl+C to exit');
    console.log('=====================================\n');

    if (!env.getGeminiKey()) {
        console.log('❌ Error: GOOGLE_AI_API_KEY not found');
        console.log('   Make sure your .env.local file contains the API key');
        process.exit(1);
    }

    console.log('✅ API Key loaded successfully');

    // Create clean env object without methods
    const { getSupabaseUrl, getSupabaseKey, getGeminiKey, getPostgresUrl, checkStatus, ...envVars } = env as any;
    const processEnv = { ...process.env, ...envVars };

    const pythonProcess = spawn('python3', ['.ai/scripts/gemini-cli.py', ...args], {
        stdio: 'inherit',
        env: processEnv as NodeJS.ProcessEnv,
        cwd: process.cwd()
    });

    pythonProcess.on('error', (error) => {
        console.log('\n❌ Failed to start Gemini CLI:');
        console.log(`   ${error.message}`);
        console.log('\nAlternatives:');
        console.log('1. Ask Claude Code to run Gemini commands for you');
        console.log('2. Check Python dependencies: pip3 install google-generativeai python-dotenv');
        console.log('3. Use direct API calls (I can help with this)');
        process.exit(1);
    });

    pythonProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.log('\n⚠️  Gemini CLI exited with errors');
            console.log('\n💡 Alternative: Ask Claude Code to help!');
            console.log('   Just say: "Use Gemini to help me with [your question]"');
        }
        process.exit(code ?? 1);
    });
}

function showUsage(): void {
    console.log(`
🔷 Gemini CLI Wrapper...
`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        runGeminiCLI(['--interactive']);
    } else if (args[0] === '--help' || args[0] === '-h') {
        showUsage();
    } else {
        runGeminiCLI(args);
    }
}