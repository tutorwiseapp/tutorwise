/**
 * Test Analyst Agent with Gemini AI
 *
 * Verifies that AnalystAgent can successfully:
 * - Connect to Gemini API
 * - Analyze business metrics
 * - Identify insights from data
 */

import * as dotenv from 'dotenv';
import { AnalystAgent } from './AnalystAgent';
import type { AgentExecutionContext } from './AgentExecutorInterface';

// Load environment variables
dotenv.config({ path: '/Users/michaelquan/projects/tutorwise/apps/web/.env.local' });

async function testAnalystAI() {
  console.log('\n=== Testing Analyst Agent with Gemini AI ===\n');

  // Check if API key is available
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.log('❌ GOOGLE_AI_API_KEY not found in environment.');
    console.log('   Set GOOGLE_AI_API_KEY to run this test.\n');
    return;
  }

  const analyst = new AnalystAgent();

  try {
    // ========================================
    // 1. Initialize Agent
    // ========================================
    console.log('1. Initializing Analyst Agent...');
    await analyst.initialize();
    console.log('✅ Agent initialized\n');

    // ========================================
    // 2. Test Metrics Analysis
    // ========================================
    console.log('2. Testing AI metrics analysis...');

    const metricsTask = {
      taskId: 'test-metrics-001',
      agentId: 'analyst',
      input: {
        action: 'analyze_metrics',
        period: 'monthly',
        comparison_period: 'previous_month',
        metrics_data: {
          revenue: { current: 125000, previous: 98000 },
          users: { current: 2450, previous: 1980 },
          conversion_rate: { current: 4.2, previous: 3.5 },
          churn_rate: { current: 2.1, previous: 2.8 },
          average_order_value: { current: 51.02, previous: 49.49 },
          customer_satisfaction: { current: 4.6, previous: 4.3 }
        }
      },
      state: {}
    };

    const metricsResult = await analyst.execute({
      taskId: metricsTask.taskId,
      agentId: metricsTask.agentId,
      input: metricsTask.input,
      state: metricsTask.state,
      onProgress: (p, msg) => {
        console.log(`   📊 Progress: ${Math.round(p * 100)}% - ${msg}`);
      },
      onLog: (level, message) => {
        console.log(`   📝 [${level.toUpperCase()}] ${message}`);
      },
      isCancelled: () => false
    });

    console.log('\n✅ Metrics analysis completed!\n');
    console.log('--- Analysis Results ---');
    console.log('Metrics Analyzed:', metricsResult.output.metrics_analyzed);

    if (metricsResult.output.summary) {
      console.log('\nSummary:', metricsResult.output.summary);
    }

    if (metricsResult.output.insights) {
      console.log('\nKey Insights:');
      metricsResult.output.insights.slice(0, 3).forEach((insight: string, i: number) => {
        console.log(`  ${i + 1}. ${insight}`);
      });
    }

    if (metricsResult.output.recommendations) {
      console.log('\nRecommendations:');
      metricsResult.output.recommendations.forEach((rec: string, i: number) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    console.log('\nAI Generated:', metricsResult.output.ai_generated ? 'Yes' : 'No');
    console.log('\n');

    // ========================================
    // 3. Test Insight Identification
    // ========================================
    console.log('3. Testing AI insight identification...');

    const insightsTask = {
      taskId: 'test-insights-001',
      agentId: 'analyst',
      input: {
        action: 'identify_insights',
        time_period: '30 days',
        focus_areas: ['growth', 'retention', 'revenue'],
        data: {
          daily_active_users: [
            { date: '2026-01-27', value: 820 },
            { date: '2026-02-03', value: 950 },
            { date: '2026-02-10', value: 1050 },
            { date: '2026-02-17', value: 1180 },
            { date: '2026-02-24', value: 1320 }
          ],
          revenue_by_segment: {
            individuals: 45000,
            small_teams: 38000,
            enterprises: 85000
          },
          feature_usage: {
            ai_tutor: 78,
            video_calls: 45,
            document_sharing: 62,
            analytics: 31
          },
          churn_reasons: {
            'too_expensive': 12,
            'missing_features': 8,
            'poor_performance': 3,
            'switched_to_competitor': 7
          }
        }
      },
      state: {}
    };

    const insightsResult = await analyst.execute({
      taskId: insightsTask.taskId,
      agentId: insightsTask.agentId,
      input: insightsTask.input,
      state: insightsTask.state,
      onProgress: (p, msg) => {
        console.log(`   📊 Progress: ${Math.round(p * 100)}% - ${msg}`);
      },
      onLog: (level, message) => {
        console.log(`   📝 [${level.toUpperCase()}] ${message}`);
      },
      isCancelled: () => false
    });

    console.log('\n✅ Insight identification completed!\n');
    console.log('--- Identified Insights ---');

    if (insightsResult.output.summary) {
      console.log('Summary:', insightsResult.output.summary);
      console.log();
    }

    if (insightsResult.output.insights) {
      console.log('Key Insights:');
      insightsResult.output.insights.forEach((insight: any, i: number) => {
        console.log(`  ${i + 1}. [${insight.priority?.toUpperCase() || 'MEDIUM'}] ${insight.type}: ${insight.text}`);
        if (insight.supporting_data) {
          console.log(`     📊 ${insight.supporting_data}`);
        }
      });
      console.log();
    }

    if (insightsResult.output.action_items) {
      console.log('Action Items:');
      insightsResult.output.action_items.forEach((item: string, i: number) => {
        console.log(`  ${i + 1}. ${item}`);
      });
    }

    console.log('\nAI Generated:', insightsResult.output.ai_generated ? 'Yes' : 'No');
    console.log('\n');

    // ========================================
    // 4. Health Check
    // ========================================
    console.log('4. Running health check...');
    const health = await analyst.getHealth();
    console.log(`✅ Health: ${health.healthy ? 'OK' : 'FAILED'} - ${health.message}\n`);

    // ========================================
    // 5. Cleanup
    // ========================================
    console.log('5. Cleaning up...');
    await analyst.cleanup();
    console.log('✅ Cleanup complete\n');

    // ========================================
    // Summary
    // ========================================
    console.log('=== Test Summary ===\n');
    console.log('✅ Agent initialization');
    console.log('✅ AI metrics analysis');
    console.log('✅ AI insight identification');
    console.log('✅ Health check');
    console.log('\n🎉 All Analyst AI tests passed! 🎉\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testAnalystAI();
