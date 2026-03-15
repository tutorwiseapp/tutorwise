/**
 * Built-in Tool Handlers for AI Agent Studio
 *
 * 8 built-in tools that marketplace agents can invoke during sessions.
 * Each handler receives validated params and execution context.
 *
 * @module lib/ai-agents/tools/handlers
 */

import { registerHandler, type ToolCallResult, type ToolExecutionContext } from './registry';

// --- generate-quiz ---
registerHandler('generate-quiz', async (params, ctx): Promise<ToolCallResult> => {
  const topic = params.topic as string;
  const difficulty = (params.difficulty as number) || 3;
  const count = (params.question_count as number) || 5;

  // Pull from problem bank if available
  const { data: problems } = await ctx.supabase
    .from('sage_problem_bank')
    .select('question_text, question_latex, difficulty, hints')
    .ilike('topic', `%${topic}%`)
    .gte('difficulty', Math.max(1, difficulty - 1))
    .lte('difficulty', Math.min(5, difficulty + 1))
    .limit(count);

  if (problems && problems.length > 0) {
    return {
      success: true,
      data: {
        quiz: problems.map((p, i) => ({
          number: i + 1,
          question: p.question_latex || p.question_text,
          difficulty: p.difficulty,
          hint: p.hints?.[0] || null,
        })),
        source: 'problem_bank',
        topic,
      },
      duration_ms: 0,
    };
  }

  // Fallback: generate template questions
  return {
    success: true,
    data: {
      quiz: Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        question: `Practice question ${i + 1} on ${topic} (difficulty ${difficulty}/5)`,
        difficulty,
        hint: null,
      })),
      source: 'generated',
      topic,
      note: 'No matching problems in bank — these are template placeholders. Explain the topic and create questions based on your knowledge.',
    },
    duration_ms: 0,
  };
});

// --- create-flashcards ---
registerHandler('create-flashcards', async (params, _ctx): Promise<ToolCallResult> => {
  const topic = params.topic as string;
  const count = (params.count as number) || 10;

  return {
    success: true,
    data: {
      instruction: `Create ${count} flashcard Q&A pairs about "${topic}". Format each as:\n\nQ: [question]\nA: [concise answer]\n\nKeep answers brief (1-2 sentences). Cover key definitions, formulas, and concepts.`,
      count,
      topic,
    },
    duration_ms: 0,
  };
});

// --- schedule-revision ---
registerHandler('schedule-revision', async (params, ctx): Promise<ToolCallResult> => {
  const topic = params.topic as string;
  const date = params.date as string;
  const time = (params.time as string) || '18:00';

  // Create platform notification
  const { error } = await ctx.supabase.from('platform_notifications').insert({
    user_id: ctx.studentId,
    type: 'revision_reminder',
    title: `Revision Reminder: ${topic}`,
    message: `Time to review ${topic}! Open Sage to start your revision session.`,
    scheduled_for: `${date}T${time}:00Z`,
    metadata: { topic, source: 'ai_agent', agent_id: ctx.agentId },
  });

  return {
    success: !error,
    data: error ? undefined : { scheduled: `${date} at ${time}`, topic },
    error: error?.message,
    duration_ms: 0,
  };
});

// --- send-progress-summary ---
registerHandler('send-progress-summary', async (_params, ctx): Promise<ToolCallResult> => {
  // Get recent messages from this session
  const { data: messages } = await ctx.supabase
    .from('ai_agent_messages')
    .select('role, content')
    .eq('session_id', ctx.sessionId)
    .order('created_at', { ascending: true })
    .limit(20);

  if (!messages || messages.length === 0) {
    return {
      success: true,
      data: { sent: false, reason: 'No messages in session to summarise.' },
      duration_ms: 0,
    };
  }

  // Get linked parent/tutor
  const { data: links } = await ctx.supabase
    .from('profile_graph')
    .select('target_id, relationship_type')
    .eq('source_id', ctx.studentId)
    .in('relationship_type', ['GUARDIAN', 'BOOKING']);

  const recipientIds = (links || []).map((l: any) => l.target_id);

  if (recipientIds.length === 0) {
    return {
      success: true,
      data: { sent: false, reason: 'No linked parent or tutor found.' },
      duration_ms: 0,
    };
  }

  // Create notification for each linked person
  const topicsCovered = messages
    .filter((m: any) => m.role === 'user')
    .map((m: any) => m.content.substring(0, 50))
    .slice(0, 3);

  for (const recipientId of recipientIds) {
    await ctx.supabase.from('platform_notifications').insert({
      user_id: recipientId,
      type: 'session_summary',
      title: 'AI Tutor Session Summary',
      message: `Your student completed a tutoring session. Topics discussed: ${topicsCovered.join(', ')}`,
      metadata: { session_id: ctx.sessionId, agent_id: ctx.agentId },
    });
  }

  return {
    success: true,
    data: { sent: true, recipients: recipientIds.length },
    duration_ms: 0,
  };
});

// --- create-study-plan ---
registerHandler('create-study-plan', async (params, _ctx): Promise<ToolCallResult> => {
  const subject = params.subject as string;
  const examDate = params.exam_date as string;
  const topics = (params.topics as string[]) || [];

  const examDateObj = new Date(examDate);
  const now = new Date();
  const weeksUntilExam = Math.max(1, Math.ceil(
    (examDateObj.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)
  ));

  return {
    success: true,
    data: {
      instruction: `Create a ${weeksUntilExam}-week study plan for ${subject}. Exam date: ${examDate}.` +
        (topics.length > 0 ? ` Topics to cover: ${topics.join(', ')}.` : '') +
        ` Use these evidence-based strategies: spaced repetition (revisit topics at increasing intervals), interleaving (mix topics within sessions), retrieval practice (test yourself before re-reading).` +
        ` Format as a weekly schedule with specific topics per day.`,
      weeks: weeksUntilExam,
      subject,
      exam_date: examDate,
      topics,
    },
    duration_ms: 0,
  };
});

// --- check-answer ---
registerHandler('check-answer', async (params, _ctx): Promise<ToolCallResult> => {
  const expression = params.expression as string;
  const expectedAnswer = params.expected_answer as string;

  try {
    // Dynamic import to avoid loading math libs at module scope
    const { solveMathFromMessage } = await import('@sage/math/hybrid-solver');
    const solutions = solveMathFromMessage(expression);

    if (solutions.length === 0) {
      return {
        success: true,
        data: {
          verified: false,
          reason: 'Could not parse expression for verification.',
          expression,
          expected: expectedAnswer,
        },
        duration_ms: 0,
      };
    }

    const actualAnswer = solutions[0].result;
    const isCorrect = String(actualAnswer).trim() === String(expectedAnswer).trim();

    return {
      success: true,
      data: {
        verified: true,
        correct: isCorrect,
        expression,
        expected: expectedAnswer,
        actual: actualAnswer,
        steps: solutions[0].steps,
      },
      duration_ms: 0,
    };
  } catch {
    return {
      success: true,
      data: {
        verified: false,
        reason: 'Math solver could not process this expression.',
        expression,
        expected: expectedAnswer,
      },
      duration_ms: 0,
    };
  }
});

// --- lookup-curriculum ---
registerHandler('lookup-curriculum', async (params, ctx): Promise<ToolCallResult> => {
  const topic = params.topic as string;
  const examBoard = params.exam_board as string | undefined;

  // Search sage_knowledge_chunks for curriculum content
  const { data: chunks } = await ctx.supabase
    .from('sage_knowledge_chunks')
    .select('content, metadata')
    .ilike('content', `%${topic}%`)
    .limit(3);

  return {
    success: true,
    data: {
      topic,
      exam_board: examBoard || 'any',
      results: (chunks || []).map((c: any) => ({
        content: c.content?.substring(0, 500),
        metadata: c.metadata,
      })),
      note: chunks && chunks.length > 0
        ? `Found ${chunks.length} curriculum entries.`
        : 'No curriculum data found for this topic. Use your general knowledge.',
    },
    duration_ms: 0,
  };
});

// --- search-materials ---
registerHandler('search-materials', async (params, ctx): Promise<ToolCallResult> => {
  const query = params.query as string;

  // Use the existing RAG retrieval
  try {
    const { retrieveContext } = await import('@/lib/ai-agents/rag-retrieval');
    const result = await retrieveContext(query, ctx.agentId, 3);

    return {
      success: true,
      data: {
        results: result.chunks.map((c: any, i: number) => ({
          index: i + 1,
          text: c.text?.substring(0, 500),
          source: c.source,
          similarity: c.similarity,
        })),
        count: result.chunks.length,
        used_fallback: result.usedFallback,
      },
      duration_ms: 0,
    };
  } catch {
    return {
      success: true,
      data: { results: [], count: 0, note: 'Material search unavailable.' },
      duration_ms: 0,
    };
  }
});
