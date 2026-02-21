// CAS Feedback Processor Edge Function
// Analyzes Sage/Lexi feedback and generates tasks for CAS Planner and reports for CAS Analyst

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'tutorwise-cron-2024-cas-feedback';

interface FeedbackPattern {
  pattern: string;
  agent: 'sage' | 'lexi';
  topic?: string;
  subject?: string;
  count: number;
  feedbackIds: string[];
  userIds: string[];
  negativeRate: number;
  firstOccurrence: string;
}

interface PlannerTask {
  title: string;
  description: string;
  task_type: string;
  priority: string;
  source: string;
  source_agent: string;
  source_data: Record<string, any>;
  pattern_detected: string;
  occurrence_count: number;
  affected_users_count: number;
  first_occurrence_at: string;
  estimated_impact: string;
}

interface AnalystReport {
  report_type: string;
  title: string;
  summary: string;
  agent_scope: string;
  time_period_start: string;
  time_period_end: string;
  metrics: Record<string, any>;
  findings: Array<Record<string, any>>;
  recommendations: Array<Record<string, any>>;
  data_sources: Record<string, any>;
  sample_feedback_ids: string[];
  severity: string;
  estimated_impact: string;
  affected_users_count: number;
}

// Detect patterns in unprocessed feedback
async function detectFeedbackPatterns(
  supabase: any,
  lookbackHours: number = 24
): Promise<FeedbackPattern[]> {
  const startTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  // Get unprocessed negative feedback
  const { data: feedback, error } = await supabase
    .from('ai_feedback')
    .select('*')
    .eq('processed', false)
    .eq('rating', 'thumbs_down')
    .gte('created_at', startTime.toISOString());

  if (error || !feedback || feedback.length === 0) {
    console.log('No unprocessed negative feedback found');
    return [];
  }

  console.log(`Analyzing ${feedback.length} unprocessed negative feedback entries`);

  // Group by agent + topic/subject
  const patternMap: Map<string, FeedbackPattern> = new Map();

  for (const item of feedback) {
    const agent = item.agent_type;
    const context = item.context || {};
    const topic = context.topic || context.subject || 'general';

    const patternKey = `${agent}_${topic}`;

    if (!patternMap.has(patternKey)) {
      patternMap.set(patternKey, {
        pattern: patternKey,
        agent,
        topic,
        subject: context.subject,
        count: 0,
        feedbackIds: [],
        userIds: [],
        negativeRate: 0,
        firstOccurrence: item.created_at,
      });
    }

    const pattern = patternMap.get(patternKey)!;
    pattern.count++;
    pattern.feedbackIds.push(item.id);
    if (!pattern.userIds.includes(item.user_id)) {
      pattern.userIds.push(item.user_id);
    }
    if (new Date(item.created_at) < new Date(pattern.firstOccurrence)) {
      pattern.firstOccurrence = item.created_at;
    }
  }

  // Filter patterns with significant occurrence (3+ feedback or 2+ users)
  const significantPatterns = Array.from(patternMap.values()).filter(
    (p) => p.count >= 3 || p.userIds.length >= 2
  );

  console.log(`Detected ${significantPatterns.length} significant patterns`);
  return significantPatterns;
}

// Generate CAS Planner tasks from patterns
function generatePlannerTasks(patterns: FeedbackPattern[]): PlannerTask[] {
  const tasks: PlannerTask[] = [];

  for (const pattern of patterns) {
    // Determine priority based on count and affected users
    let priority = 'low';
    if (pattern.count >= 10 || pattern.userIds.length >= 5) {
      priority = 'critical';
    } else if (pattern.count >= 5 || pattern.userIds.length >= 3) {
      priority = 'high';
    } else if (pattern.count >= 3 || pattern.userIds.length >= 2) {
      priority = 'medium';
    }

    // Determine task type
    let taskType = 'content_gap';
    if (pattern.topic && pattern.topic !== 'general') {
      taskType = 'curriculum_fix';
    }

    const task: PlannerTask = {
      title: `${pattern.agent === 'sage' ? 'Sage' : 'Lexi'}: High negative feedback on ${pattern.topic || 'general interactions'}`,
      description: `Detected ${pattern.count} negative feedback instances from ${pattern.userIds.length} users on topic "${pattern.topic}". Investigation needed to identify root cause and implement fix.`,
      task_type: taskType,
      priority,
      source: 'feedback_processor',
      source_agent: pattern.agent,
      source_data: {
        feedbackIds: pattern.feedbackIds,
        userIds: pattern.userIds,
        topic: pattern.topic,
        subject: pattern.subject,
      },
      pattern_detected: pattern.pattern,
      occurrence_count: pattern.count,
      affected_users_count: pattern.userIds.length,
      first_occurrence_at: pattern.firstOccurrence,
      estimated_impact: pattern.userIds.length >= 5 ? 'high' : pattern.userIds.length >= 2 ? 'medium' : 'low',
    };

    tasks.push(task);
  }

  return tasks;
}

// Generate CAS Analyst report
function generateAnalystReport(
  patterns: FeedbackPattern[],
  totalFeedback: number,
  timeStart: string,
  timeEnd: string
): AnalystReport {
  const sagePatterns = patterns.filter((p) => p.agent === 'sage');
  const lexiPatterns = patterns.filter((p) => p.agent === 'lexi');

  const totalNegative = patterns.reduce((sum, p) => sum + p.count, 0);
  const affectedUsers = new Set(patterns.flatMap((p) => p.userIds)).size;

  const findings = patterns.map((p) => ({
    type: 'pattern',
    agent: p.agent,
    topic: p.topic,
    severity: p.count >= 10 ? 'critical' : p.count >= 5 ? 'high' : 'medium',
    description: `${p.count} negative feedback instances on "${p.topic}" from ${p.userIds.length} users`,
    affectedCount: p.userIds.length,
  }));

  const recommendations = [];
  if (sagePatterns.length > 0) {
    recommendations.push({
      priority: 'high',
      action: `Review Sage curriculum content for topics: ${sagePatterns.map((p) => p.topic).join(', ')}`,
      expectedImpact: 'Improve student satisfaction and learning outcomes',
    });
  }
  if (lexiPatterns.length > 0) {
    recommendations.push({
      priority: 'high',
      action: `Review Lexi help documentation and responses for: ${lexiPatterns.map((p) => p.topic).join(', ')}`,
      expectedImpact: 'Reduce support friction and improve platform usability',
    });
  }

  let severity: string = 'low';
  if (totalNegative >= 20 || affectedUsers >= 10) {
    severity = 'critical';
  } else if (totalNegative >= 10 || affectedUsers >= 5) {
    severity = 'high';
  } else if (totalNegative >= 5 || affectedUsers >= 2) {
    severity = 'medium';
  }

  return {
    report_type: 'feedback_pattern',
    title: `Feedback Pattern Analysis: ${patterns.length} patterns detected`,
    summary: `Analyzed ${totalFeedback} feedback entries and detected ${patterns.length} significant negative patterns affecting ${affectedUsers} users. ${sagePatterns.length} Sage issues, ${lexiPatterns.length} Lexi issues.`,
    agent_scope: sagePatterns.length > 0 && lexiPatterns.length > 0 ? 'both' : sagePatterns.length > 0 ? 'sage' : 'lexi',
    time_period_start: timeStart,
    time_period_end: timeEnd,
    metrics: {
      totalFeedback,
      totalNegative,
      patternsDetected: patterns.length,
      sagePatterns: sagePatterns.length,
      lexiPatterns: lexiPatterns.length,
      affectedUsers,
    },
    findings,
    recommendations,
    data_sources: {
      feedbackCount: totalFeedback,
      patternCount: patterns.length,
      dateRange: `${timeStart} to ${timeEnd}`,
    },
    sample_feedback_ids: patterns.flatMap((p) => p.feedbackIds).slice(0, 20),
    severity,
    estimated_impact: affectedUsers >= 10 ? 'high' : affectedUsers >= 5 ? 'medium' : 'low',
    affected_users_count: affectedUsers,
  };
}

// Main function
Deno.serve(async (req) => {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const timeEnd = new Date().toISOString();
    const timeStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log('=== CAS Feedback Processor ===');
    console.log(`Processing feedback from ${timeStart} to ${timeEnd}`);

    // Step 1: Detect patterns
    const patterns = await detectFeedbackPatterns(supabase, 24);

    if (patterns.length === 0) {
      console.log('No significant patterns detected');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No significant patterns detected',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: Generate Planner tasks
    const tasks = generatePlannerTasks(patterns);
    console.log(`Generated ${tasks.length} planner tasks`);

    // Insert tasks (check for duplicates first)
    const insertedTasks = [];
    for (const task of tasks) {
      // Check if task with same pattern already exists
      const { data: existing } = await supabase
        .from('cas_planner_tasks')
        .select('id')
        .eq('pattern_detected', task.pattern_detected)
        .eq('status', 'pending')
        .maybeSingle();

      if (!existing) {
        const { data, error } = await supabase
          .from('cas_planner_tasks')
          .insert(task)
          .select()
          .single();

        if (!error && data) {
          insertedTasks.push(data.id);
        }
      } else {
        console.log(`Task for pattern ${task.pattern_detected} already exists`);
      }
    }

    // Step 3: Generate Analyst report
    const totalFeedback = patterns.reduce((sum, p) => sum + p.count, 0);
    const report = generateAnalystReport(patterns, totalFeedback, timeStart, timeEnd);
    console.log(`Generated analyst report: ${report.title}`);

    const { data: reportData, error: reportError } = await supabase
      .from('cas_analyst_reports')
      .insert({
        ...report,
        related_planner_tasks: insertedTasks,
      })
      .select()
      .single();

    if (reportError) {
      console.error('Failed to insert analyst report:', reportError);
    }

    // Step 4: Mark feedback as processed
    const allFeedbackIds = patterns.flatMap((p) => p.feedbackIds);
    if (allFeedbackIds.length > 0) {
      const { error: updateError } = await supabase
        .from('ai_feedback')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in('id', allFeedbackIds);

      if (updateError) {
        console.error('Failed to mark feedback as processed:', updateError);
      } else {
        console.log(`Marked ${allFeedbackIds.length} feedback entries as processed`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        patterns: patterns.length,
        tasks: {
          generated: tasks.length,
          inserted: insertedTasks.length,
        },
        report: {
          id: reportData?.id,
          severity: report.severity,
          affected_users: report.affected_users_count,
        },
        feedback_processed: allFeedbackIds.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('CAS Feedback Processor Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
