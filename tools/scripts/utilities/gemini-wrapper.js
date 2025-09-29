#!/usr/bin/env node
/**
 * Gemini CLI Wrapper for Claude Code
 *
 * Provides a working alternative when the Python CLI has issues
 * Usage: node tools/scripts/utilities/gemini-wrapper.js [command] [options]
 */

const { spawn } = require('child_process');
const env = require('./load-env.js');

function runGeminiCLI(args = []) {
    console.log('🔷 Starting Gemini CLI...');
    console.log('💡 Tip: Type "quit" or press Ctrl+C to exit');
    console.log('=====================================\n');

    // Check if API key is available
    if (!env.getGeminiKey()) {
        console.log('❌ Error: GOOGLE_AI_API_KEY not found');
        console.log('   Make sure your .env.local file contains the API key');
        process.exit(1);
    }

    console.log('✅ API Key loaded successfully');

    // Set up environment for Python script
    const processEnv = {
        ...process.env,
        ...env  // Include all env vars from .env.local
    };

    // Run the Python CLI
    const pythonProcess = spawn('python3', ['.ai/scripts/gemini-cli.py', ...args], {
        stdio: 'inherit',
        env: processEnv,
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
        process.exit(code);
    });
}

function showUsage() {
    console.log(`
🔷 Gemini CLI Wrapper

Usage:
  node tools/scripts/utilities/gemini-wrapper.js [command] [options]

Examples:
  node tools/scripts/utilities/gemini-wrapper.js --interactive
  node tools/scripts/utilities/gemini-wrapper.js chat --query "How do I implement authentication?"
  node tools/scripts/utilities/gemini-wrapper.js --help

Available commands: chat, analyze, review, debug, plan

Options:
  --interactive, -i     Interactive mode
  --query, -q          Query or question
  --ticket, -t         Jira ticket key
  --minimal, -m        Use minimal context
  --stream, -s         Stream response
  --help, -h           Show help

💡 Pro tip: Just ask Claude Code to run Gemini commands for you!
`);
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Default to interactive mode
        runGeminiCLI(['--interactive']);
    } else if (args[0] === '--help' || args[0] === '-h') {
        showUsage();
    } else {
        runGeminiCLI(args);
    }
}

module.exports = { runGeminiCLI };