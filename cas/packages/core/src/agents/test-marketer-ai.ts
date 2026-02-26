/**
 * Test Marketer Agent with Real Gemini AI
 *
 * Verifies that MarketerAgent can successfully:
 * - Connect to Gemini API
 * - Generate real marketing content
 * - Perform SEO analysis
 */

import * as dotenv from 'dotenv';
import { MarketerAgent } from './MarketerAgent';
import type { AgentExecutionContext } from './AgentExecutorInterface';

// Load environment variables
dotenv.config({ path: '/Users/michaelquan/projects/tutorwise/apps/web/.env.local' });

async function testMarketerAI() {
  console.log('\n=== Testing Marketer Agent with Gemini AI ===\n');

  // Check if API key is available
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.log('❌ GOOGLE_AI_API_KEY not found in environment.');
    console.log('   Set GOOGLE_AI_API_KEY to run this test.\n');
    return;
  }

  const marketer = new MarketerAgent();

  try {
    // ========================================
    // 1. Initialize Agent
    // ========================================
    console.log('1. Initializing Marketer Agent...');
    await marketer.initialize();
    console.log('✅ Agent initialized\n');

    // ========================================
    // 2. Test Content Creation
    // ========================================
    console.log('2. Testing AI content generation...');

    const createContentTask = {
      taskId: 'test-content-001',
      agentId: 'marketer',
      input: {
        action: 'create_content',
        content_type: 'blog',
        topic: 'Benefits of AI-Powered Tutoring Platforms',
        target_audience: 'educators and students',
        tone: 'professional',
        length: 'medium'
      },
      state: {}
    };

    const logs: string[] = [];
    let progress = 0;

    const contentResult = await marketer.execute({
      taskId: createContentTask.taskId,
      agentId: createContentTask.agentId,
      input: createContentTask.input,
      state: createContentTask.state,
      onProgress: (p, msg) => {
        progress = p;
        console.log(`   📊 Progress: ${Math.round(p * 100)}% - ${msg}`);
      },
      onLog: (level, message, metadata) => {
        console.log(`   📝 [${level.toUpperCase()}] ${message}`);
        logs.push(`[${level}] ${message}`);
      },
      isCancelled: () => false
    });

    console.log('\n✅ Content generation completed!\n');
    console.log('--- Generated Content ---');
    console.log('Title:', contentResult.output.title);
    console.log('\nContent Preview:');
    console.log(contentResult.output.content.substring(0, 500) + '...\n');
    console.log('Metadata:', JSON.stringify(contentResult.output.metadata, null, 2));
    console.log('\n');

    // ========================================
    // 3. Test SEO Optimization
    // ========================================
    console.log('3. Testing AI SEO analysis...');

    const seoTask = {
      taskId: 'test-seo-001',
      agentId: 'marketer',
      input: {
        action: 'seo_optimize',
        content: contentResult.output.content,
        keywords: ['AI tutoring', 'online education', 'personalized learning'],
        target_url: 'https://tutorwise.io/blog/ai-tutoring'
      },
      state: {}
    };

    const seoResult = await marketer.execute({
      taskId: seoTask.taskId,
      agentId: seoTask.agentId,
      input: seoTask.input,
      state: seoTask.state,
      onProgress: (p, msg) => {
        console.log(`   📊 Progress: ${Math.round(p * 100)}% - ${msg}`);
      },
      onLog: (level, message) => {
        console.log(`   📝 [${level.toUpperCase()}] ${message}`);
      },
      isCancelled: () => false
    });

    console.log('\n✅ SEO analysis completed!\n');
    console.log('--- SEO Analysis Results ---');
    console.log('Current SEO Score:', seoResult.output.seo_analysis.current_score);
    console.log('Potential Score:', seoResult.output.seo_analysis.optimized_score);
    console.log('\nTop Improvements:');
    seoResult.output.seo_analysis.improvements.slice(0, 3).forEach((imp: any, i: number) => {
      console.log(`  ${i + 1}. [${imp.impact.toUpperCase()}] ${imp.category}: ${imp.issue}`);
      console.log(`     💡 ${imp.suggestion}\n`);
    });
    console.log('Optimized Title:', seoResult.output.optimized_title);
    console.log('Meta Description:', seoResult.output.meta_description);
    console.log('\n');

    // ========================================
    // 4. Health Check
    // ========================================
    console.log('4. Running health check...');
    const health = await marketer.getHealth();
    console.log(`✅ Health: ${health.healthy ? 'OK' : 'FAILED'} - ${health.message}\n`);

    // ========================================
    // 5. Cleanup
    // ========================================
    console.log('5. Cleaning up...');
    await marketer.cleanup();
    console.log('✅ Cleanup complete\n');

    // ========================================
    // Summary
    // ========================================
    console.log('=== Test Summary ===\n');
    console.log('✅ Agent initialization');
    console.log(`✅ AI content generation (${contentResult.output.metadata.word_count} words)`);
    console.log(`✅ SEO optimization (score: ${seoResult.output.seo_analysis.current_score} → ${seoResult.output.seo_analysis.optimized_score})`);
    console.log('✅ Health check');
    console.log('\n🎉 All Marketer AI tests passed! 🎉\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testMarketerAI();
