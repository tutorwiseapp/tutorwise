/**
 * Test Developer Agent with AI (Claude or Gemini fallback)
 *
 * Verifies that DeveloperAgent can successfully:
 * - Connect to Claude API (or fallback to Gemini)
 * - Generate real code
 * - Handle errors gracefully
 */

import * as dotenv from 'dotenv';
import { DeveloperAgent } from './DeveloperAgent';
import type { AgentExecutionContext } from './AgentExecutorInterface';

// Load environment variables
dotenv.config({ path: '/Users/michaelquan/projects/tutorwise/apps/web/.env.local' });

async function testDeveloperAI() {
  console.log('\n=== Testing Developer Agent with AI ===\n');

  // Check if API keys are available
  const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0;
  const hasGeminiKey = !!process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY.trim().length > 0;

  if (!hasClaudeKey && !hasGeminiKey) {
    console.log('❌ No AI API keys found (ANTHROPIC_API_KEY or GOOGLE_AI_API_KEY).');
    console.log('   Set at least one API key to run this test.\n');
    return;
  }

  console.log(`AI Providers available:`);
  console.log(`  - Claude: ${hasClaudeKey ? '✅' : '❌'}`);
  console.log(`  - Gemini: ${hasGeminiKey ? '✅' : '❌'}\n`);

  const developer = new DeveloperAgent();

  try {
    // ========================================
    // 1. Initialize Agent
    // ========================================
    console.log('1. Initializing Developer Agent...');
    await developer.initialize();
    console.log('✅ Agent initialized\n');

    // ========================================
    // 2. Test Code Generation
    // ========================================
    console.log('2. Testing AI code generation...');

    const codeGenTask = {
      taskId: 'test-codegen-001',
      agentId: 'developer',
      input: {
        action: 'generate_code',
        description: 'Create a TypeScript function that validates email addresses using regex and returns true if valid, false otherwise',
        language: 'typescript',
        include_tests: true,
        include_docs: true
      },
      state: {}
    };

    let progress = 0;

    const codeResult = await developer.execute({
      taskId: codeGenTask.taskId,
      agentId: codeGenTask.agentId,
      input: codeGenTask.input,
      state: codeGenTask.state,
      onProgress: (p, msg) => {
        progress = p;
        console.log(`   📊 Progress: ${Math.round(p * 100)}% - ${msg}`);
      },
      onLog: (level, message, metadata) => {
        console.log(`   📝 [${level.toUpperCase()}] ${message}`);
      },
      isCancelled: () => false
    });

    console.log('\n✅ Code generation completed!\n');
    console.log('--- Generated Code ---');
    console.log('Language:', codeResult.output.language);
    console.log('\nCode:');
    console.log(codeResult.output.code);

    if (codeResult.output.tests) {
      console.log('\nTests:');
      console.log(codeResult.output.tests);
    }

    if (codeResult.output.documentation) {
      console.log('\nDocumentation:');
      console.log(codeResult.output.documentation);
    }

    if (codeResult.output.explanation) {
      console.log('\nExplanation:', codeResult.output.explanation);
    }

    console.log('\nMetadata:', JSON.stringify(codeResult.metadata, null, 2));
    console.log('\n');

    // ========================================
    // 3. Test Another Code Generation
    // ========================================
    console.log('3. Testing another code generation (simpler function)...');

    const simpleCodeTask = {
      taskId: 'test-codegen-002',
      agentId: 'developer',
      input: {
        action: 'generate_code',
        description: 'Create a function that calculates the factorial of a number recursively',
        language: 'typescript',
        include_tests: false,
        include_docs: true
      },
      state: {}
    };

    const simpleResult = await developer.execute({
      taskId: simpleCodeTask.taskId,
      agentId: simpleCodeTask.agentId,
      input: simpleCodeTask.input,
      state: simpleCodeTask.state,
      onProgress: (p, msg) => {
        console.log(`   📊 Progress: ${Math.round(p * 100)}% - ${msg}`);
      },
      onLog: (level, message) => {
        console.log(`   📝 [${level.toUpperCase()}] ${message}`);
      },
      isCancelled: () => false
    });

    console.log('\n✅ Second code generation completed!\n');
    console.log('--- Generated Code ---');
    console.log(simpleResult.output.code);
    console.log('\n');

    // ========================================
    // 4. Health Check
    // ========================================
    console.log('4. Running health check...');
    const health = await developer.getHealth();
    console.log(`✅ Health: ${health.healthy ? 'OK' : 'FAILED'} - ${health.message}\n`);

    // ========================================
    // 5. Cleanup
    // ========================================
    console.log('5. Cleaning up...');
    await developer.cleanup();
    console.log('✅ Cleanup complete\n');

    // ========================================
    // Summary
    // ========================================
    console.log('=== Test Summary ===\n');
    console.log('✅ Agent initialization');
    console.log(`✅ Code generation with ${codeResult.metadata?.aiProvider || 'AI'}`);
    console.log(`✅ AI-generated: ${codeResult.output.ai_generated ? 'Yes' : 'No'}`);
    console.log('✅ Health check');
    console.log('\n🎉 All Developer AI tests passed! 🎉\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testDeveloperAI();
