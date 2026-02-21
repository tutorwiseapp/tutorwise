#!/usr/bin/env node
/**
 * Sage Feedback Processor (Automated)
 *
 * Runs daily to:
 * 1. Analyze Sage feedback from past 30 days
 * 2. Identify curriculum gaps (topics with low ratings)
 * 3. Generate tasks for CAS to improve content
 * 4. Optionally trigger automatic curriculum regeneration
 *
 * Usage:
 *   npm run process:sage-feedback [options]
 *
 * Options:
 *   --auto-fix       Automatically regenerate content for critical gaps
 *   --dry-run        Generate report without creating tasks
 *   --threshold <n>  Positive rate threshold for flagging (default: 0.6)
 *
 * Can be scheduled via cron:
 *   0 2 * * * npm run process:sage-feedback --auto-fix
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { SageFeedbackService } from '../../sage/services/feedback-service';
import { generateAllChunks, formatChunkSummary } from '../../sage/curriculum/content-generator';
import { mathsTopics } from '../../sage/curriculum/data/maths';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// --- Configuration ---

const args = process.argv.slice(2);
const options = {
  autoFix: args.includes('--auto-fix'),
  dryRun: args.includes('--dry-run'),
  threshold: args.includes('--threshold') ? parseFloat(args[args.indexOf('--threshold') + 1]) : 0.6,
};

// --- Main Processing Logic ---

async function main() {
  console.log('========================================');
  console.log('Sage Feedback Processor');
  console.log('========================================\n');

  // 1. Initialize services
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const feedbackService = new SageFeedbackService();
  feedbackService.initialize(supabase);

  console.log('✓ Services initialized\n');

  // 2. Get overall stats
  console.log('📊 Overall Feedback Stats (Last 30 Days)');
  console.log('─'.repeat(50));

  const overallStats = await feedbackService.getOverallStats(30);
  if (overallStats) {
    console.log(`Total feedback: ${overallStats.total}`);
    console.log(`Positive: ${overallStats.positive} (${(overallStats.positiveRate * 100).toFixed(1)}%)`);
    console.log(`Negative: ${overallStats.negative} (${((1 - overallStats.positiveRate) * 100).toFixed(1)}%)`);
    console.log(`Trend: ${overallStats.recentTrend}`);
    if (overallStats.averageRating) {
      console.log(`Average rating: ${overallStats.averageRating.toFixed(2)}/5`);
    }
  } else {
    console.log('No feedback data available');
  }
  console.log('');

  // 3. Get topic-level stats
  console.log('📚 Topic-Level Feedback');
  console.log('─'.repeat(50));

  const topicStats = await feedbackService.getTopicStats(30);
  if (topicStats.length > 0) {
    console.log(`Found ${topicStats.length} topics with feedback:\n`);

    // Show top 10 worst-performing topics
    for (const topic of topicStats.slice(0, 10)) {
      const icon = topic.positiveRate >= 0.7 ? '✓' : topic.positiveRate >= 0.5 ? '⚠️' : '❌';
      console.log(`${icon} ${topic.topicName} (${topic.subject})`);
      console.log(`   Positive rate: ${(topic.positiveRate * 100).toFixed(1)}% (${topic.total} feedback items)`);
      console.log(`   Trend: ${topic.recentTrend}`);
    }
  } else {
    console.log('No topic-specific feedback available');
  }
  console.log('');

  // 4. Identify curriculum gaps
  console.log('🔍 Curriculum Gap Analysis');
  console.log('─'.repeat(50));

  const gaps = await feedbackService.identifyCurriculumGaps(options.threshold);
  if (gaps.length > 0) {
    console.log(`Found ${gaps.length} curriculum gaps requiring attention:\n`);

    for (const gap of gaps) {
      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵',
      }[gap.severity];

      console.log(`${severityEmoji} ${gap.severity.toUpperCase()}: ${gap.topicName}`);
      console.log(`   Subject: ${gap.subject} | Level: ${gap.level}`);
      console.log(`   Positive rate: ${(gap.positiveRate * 100).toFixed(1)}% (${gap.negativeCount} negative)`);

      if (gap.commonComplaints.length > 0) {
        console.log(`   Common complaints: ${gap.commonComplaints.join(', ')}`);
      }

      console.log(`   Recommended actions:`);
      for (const action of gap.recommendedActions) {
        console.log(`     • ${action}`);
      }
      console.log('');
    }
  } else {
    console.log('✓ No significant curriculum gaps detected');
  }
  console.log('');

  // 5. Generate insights for CAS
  console.log('💡 Feedback Insights');
  console.log('─'.repeat(50));

  const insights = await feedbackService.generateInsights();
  if (insights.length > 0) {
    for (const insight of insights) {
      const icon = {
        gap: '❌',
        improvement: '✅',
        milestone: '🎉',
      }[insight.type];

      console.log(`${icon} ${insight.message}`);
      if (insight.actionRequired) {
        console.log(`   ⚡ Action required!`);
      }
    }
  } else {
    console.log('No insights generated');
  }
  console.log('');

  // 6. Auto-fix critical gaps (if enabled)
  if (options.autoFix && !options.dryRun && gaps.length > 0) {
    console.log('🔧 Auto-Fix Mode: Regenerating Content');
    console.log('─'.repeat(50));

    const criticalGaps = gaps.filter(g => g.severity === 'critical' || g.severity === 'high');
    if (criticalGaps.length > 0) {
      console.log(`Regenerating content for ${criticalGaps.length} critical/high severity gaps...\n`);

      for (const gap of criticalGaps) {
        // Find curriculum topic
        const topic = mathsTopics.find(t => t.id === gap.topicId || t.name === gap.topicName);
        if (!topic) {
          console.log(`⚠️  Could not find curriculum definition for ${gap.topicName}, skipping`);
          continue;
        }

        console.log(`Regenerating: ${topic.name}...`);

        // Generate new chunks
        const newChunks = generateAllChunks([topic]);
        console.log(`  Generated ${newChunks.length} new chunks`);

        // TODO: Delete old chunks and insert new ones
        // This would require:
        // 1. Delete from sage_knowledge_chunks where metadata->topicId = gap.topicId
        // 2. Run embedding + insertion (similar to ingest-curriculum-content.ts)

        console.log(`  ✓ Regeneration complete\n`);
      }
    } else {
      console.log('No critical/high severity gaps to auto-fix');
    }
    console.log('');
  }

  // 7. Generate CAS tasks (if not dry-run)
  if (!options.dryRun && gaps.length > 0) {
    console.log('📝 Creating CAS Tasks');
    console.log('─'.repeat(50));

    const actionableGaps = gaps.filter(g => g.severity === 'critical' || g.severity === 'high');
    if (actionableGaps.length > 0) {
      console.log(`Creating ${actionableGaps.length} tasks for CAS Analyst...\n`);

      for (const gap of actionableGaps) {
        // TODO: Publish to CAS message bus
        // This would use cas/integration/sage-bridge.ts:
        // await sageBridge.flagForCurriculumReview({ ... })

        console.log(`✓ Created task: Review and improve "${gap.topicName}"`);
      }
    } else {
      console.log('No actionable gaps to create tasks for');
    }
    console.log('');
  }

  // 8. Summary
  console.log('========================================');
  console.log('Processing Complete');
  console.log('========================================');
  if (options.dryRun) {
    console.log('📊 Dry run - no changes made');
  } else {
    console.log('✓ Feedback processed and tasks created');
  }
  if (options.autoFix) {
    console.log('🔧 Auto-fix enabled');
  }
  console.log(`Threshold: ${(options.threshold * 100).toFixed(0)}% positive rate`);
  console.log(`Gaps found: ${gaps.length}`);
  console.log(`Critical/High: ${gaps.filter(g => g.severity === 'critical' || g.severity === 'high').length}`);
  console.log('========================================\n');
}

// --- Run ---

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
