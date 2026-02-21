import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from apps/web
config({ path: resolve(__dirname, '../../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Ensure apps/web/.env.local is configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getMetrics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Sage sessions
  const { data: sageSessions } = await supabase
    .from('sage_sessions')
    .select('id, user_id, message_count, started_at, ended_at')
    .gte('started_at', thirtyDaysAgo.toISOString());

  // Sage knowledge chunks
  const { data: sageChunks } = await supabase
    .from('sage_knowledge_chunks')
    .select('id, document_id');

  // Sage feedback
  const { data: sageFeedback } = await supabase
    .from('ai_feedback')
    .select('rating')
    .eq('agent_type', 'sage')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Lexi sessions
  const { data: lexiSessions } = await supabase
    .from('lexi_sessions')
    .select('id, user_id, message_count, started_at, ended_at')
    .gte('started_at', thirtyDaysAgo.toISOString());

  // Lexi feedback
  const { data: lexiFeedback } = await supabase
    .from('ai_feedback')
    .select('rating')
    .eq('agent_type', 'lexi')
    .gte('created_at', thirtyDaysAgo.toISOString());

  console.log('=== SAGE METRICS (Last 30 Days) ===');
  if (sageSessions && sageSessions.length > 0) {
    const uniqueUsers = new Set(sageSessions.map(s => s.user_id)).size;
    const avgMessages = sageSessions.reduce((sum, s) => sum + (s.message_count || 0), 0) / sageSessions.length;
    const sessionsWithTime = sageSessions.filter(s => s.started_at && s.ended_at);
    const avgLength = sessionsWithTime.length > 0 
      ? sessionsWithTime.reduce((sum, s) => {
          const start = new Date(s.started_at!).getTime();
          const end = new Date(s.ended_at!).getTime();
          return sum + (end - start) / 1000 / 60;
        }, 0) / sessionsWithTime.length
      : 0;

    console.log(`Sessions: ${sageSessions.length}`);
    console.log(`Unique Users: ${uniqueUsers}`);
    console.log(`Avg Messages/Session: ${avgMessages.toFixed(1)}`);
    console.log(`Avg Session Length: ${avgLength.toFixed(1)} min`);
  } else {
    console.log('Sessions: 0');
    console.log('No data yet');
  }

  if (sageChunks && sageChunks.length > 0) {
    const uniqueDocs = new Set(sageChunks.map(c => c.document_id)).size;
    console.log(`Knowledge Chunks: ${sageChunks.length}`);
    console.log(`Unique Documents: ${uniqueDocs}`);
  } else {
    console.log('Knowledge Chunks: 0');
  }

  if (sageFeedback && sageFeedback.length > 0) {
    const thumbsUp = sageFeedback.filter(f => f.rating === 'thumbs_up').length;
    const thumbsDown = sageFeedback.filter(f => f.rating === 'thumbs_down').length;
    const total = thumbsUp + thumbsDown;
    const positiveRate = total > 0 ? thumbsUp / total * 100 : 0;
    console.log(`Feedback: ${sageFeedback.length} total (${thumbsUp} 👍, ${thumbsDown} 👎)`);
    console.log(`Positive Rate: ${positiveRate.toFixed(1)}%`);
  } else {
    console.log('Feedback: 0');
  }

  console.log('\n=== LEXI METRICS (Last 30 Days) ===');
  if (lexiSessions && lexiSessions.length > 0) {
    const uniqueUsers = new Set(lexiSessions.map(s => s.user_id)).size;
    const avgMessages = lexiSessions.reduce((sum, s) => sum + (s.message_count || 0), 0) / lexiSessions.length;
    const sessionsWithTime = lexiSessions.filter(s => s.started_at && s.ended_at);
    const avgLength = sessionsWithTime.length > 0
      ? sessionsWithTime.reduce((sum, s) => {
          const start = new Date(s.started_at!).getTime();
          const end = new Date(s.ended_at!).getTime();
          return sum + (end - start) / 1000 / 60;
        }, 0) / sessionsWithTime.length
      : 0;

    console.log(`Sessions: ${lexiSessions.length}`);
    console.log(`Unique Users: ${uniqueUsers}`);
    console.log(`Avg Messages/Session: ${avgMessages.toFixed(1)}`);
    console.log(`Avg Session Length: ${avgLength.toFixed(1)} min`);
  } else {
    console.log('Sessions: 0');
    console.log('No data yet');
  }

  if (lexiFeedback && lexiFeedback.length > 0) {
    const thumbsUp = lexiFeedback.filter(f => f.rating === 'thumbs_up').length;
    const thumbsDown = lexiFeedback.filter(f => f.rating === 'thumbs_down').length;
    const total = thumbsUp + thumbsDown;
    const positiveRate = total > 0 ? thumbsUp / total * 100 : 0;
    console.log(`Feedback: ${lexiFeedback.length} total (${thumbsUp} 👍, ${thumbsDown} 👎)`);
    console.log(`Positive Rate: ${positiveRate.toFixed(1)}%`);
  } else {
    console.log('Feedback: 0');
  }
}

getMetrics().catch(console.error);
