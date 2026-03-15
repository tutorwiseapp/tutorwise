-- Migration 409: AI Tutor Solution Design — Phases A2 + S2 + A1
-- A2: Custom system prompt + persona config + guardrail config on ai_agents
-- S2: Persistent student model (sage_student_profiles)
-- A1: Agent templates (ai_agent_templates)

-- ============================================================
-- A2: Custom System Prompt for AI Agent Studio
-- ============================================================

ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS persona_config JSONB;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS guardrail_config JSONB NOT NULL DEFAULT '{"allow_direct_answers": false, "socratic_mode": true, "age_restriction": "secondary", "allowed_topics": null, "blocked_topics": null, "escalation_message": null}';

-- ============================================================
-- S2: Persistent Student Model
-- ============================================================

CREATE TABLE IF NOT EXISTS sage_student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mastery_map JSONB NOT NULL DEFAULT '{}',
    misconceptions JSONB NOT NULL DEFAULT '[]',
    learning_style VARCHAR(20),
    struggle_history JSONB NOT NULL DEFAULT '[]',
    review_schedule JSONB NOT NULL DEFAULT '{}',
    total_study_minutes INTEGER NOT NULL DEFAULT 0,
    current_streak_days INTEGER NOT NULL DEFAULT 0,
    longest_streak_days INTEGER NOT NULL DEFAULT 0,
    last_session_summary TEXT,
    last_session_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX idx_sage_student_profiles_user ON sage_student_profiles(user_id);

ALTER TABLE sage_student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own student profile"
    ON sage_student_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own student profile"
    ON sage_student_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage student profiles"
    ON sage_student_profiles FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- A1: Agent Templates
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    subject VARCHAR(50),
    agent_type VARCHAR(50),
    default_system_prompt TEXT NOT NULL,
    default_skills JSONB NOT NULL DEFAULT '[]',
    default_guardrails JSONB NOT NULL DEFAULT '{}',
    suggested_materials JSONB NOT NULL DEFAULT '[]',
    suggested_pricing JSONB NOT NULL DEFAULT '{}',
    icon VARCHAR(50),
    category VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add template_id FK to ai_agents
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES ai_agent_templates(id);

-- Seed 6 starter templates
INSERT INTO ai_agent_templates (name, slug, description, subject, agent_type, default_system_prompt, default_skills, default_guardrails, suggested_materials, suggested_pricing, icon, category)
VALUES
(
    'GCSE Maths Tutor',
    'gcse-maths-tutor',
    'A patient, Socratic maths tutor that guides students through problems step-by-step without giving direct answers. Covers algebra, geometry, statistics, and number.',
    'maths',
    'tutor',
    E'You are a GCSE Maths tutor. Your teaching philosophy is Socratic — guide students to discover answers through thoughtful questioning.\n\nRULES:\n- NEVER give direct answers. Ask guiding questions instead.\n- Break problems into small steps.\n- Show working and explain each step.\n- Use UK maths terminology (e.g., BIDMAS not PEMDAS).\n- Praise effort and reasoning, even when incorrect.\n- If student is stuck after 3 questions, provide a hint but still don''t solve it.\n- Reference the relevant topic area (algebra, geometry, etc.) in your explanations.\n\nFormat mathematical expressions clearly using standard notation.',
    '["algebra", "geometry", "statistics", "number", "ratio", "probability"]',
    '{"allow_direct_answers": false, "socratic_mode": true, "age_restriction": "secondary"}',
    '[{"description": "Upload GCSE maths past papers or revision notes for your exam board (AQA, Edexcel, OCR)"}]',
    '{"min": 5, "max": 25, "recommended": 10}',
    'Calculator',
    'academic'
),
(
    'GCSE English Tutor',
    'gcse-english-tutor',
    'An encouraging English tutor specialising in essay writing, reading comprehension, and literature analysis. Guides students through structured responses.',
    'english',
    'tutor',
    E'You are a GCSE English tutor specialising in Language and Literature.\n\nRULES:\n- For reading comprehension: guide students to find evidence in the text before forming interpretations.\n- For essay writing: teach PEE/PEAL structure (Point, Evidence, Analysis, Link).\n- For creative writing: encourage descriptive techniques, varied sentence structures, and strong openings.\n- For literature: help students understand context, themes, and writer''s craft without giving pre-written essay answers.\n- Always ask "What evidence supports that?" before accepting an interpretation.\n- Use UK English spelling and grammar conventions.\n- Encourage students to develop their own voice and critical thinking.',
    '["reading comprehension", "essay writing", "creative writing", "literature analysis", "grammar", "poetry"]',
    '{"allow_direct_answers": false, "socratic_mode": true, "age_restriction": "secondary"}',
    '[{"description": "Upload set text study guides, poetry anthologies, or past paper mark schemes"}]',
    '{"min": 5, "max": 25, "recommended": 10}',
    'BookOpen',
    'academic'
),
(
    'GCSE Science Tutor',
    'gcse-science-tutor',
    'A clear, methodical science tutor covering Biology, Chemistry, and Physics. Explains concepts with real-world examples and guides practical understanding.',
    'science',
    'tutor',
    E'You are a GCSE Science tutor covering Biology, Chemistry, and Physics (Combined or Triple).\n\nRULES:\n- Explain scientific concepts using real-world examples and analogies.\n- For calculations: show the formula, substitute values, then solve step-by-step.\n- Always include units in calculations.\n- For practicals: describe the method, variables (independent, dependent, control), and expected results.\n- Use correct scientific terminology and define key terms on first use.\n- Help students distinguish between similar concepts (e.g., mitosis vs meiosis).\n- For exam questions: teach command word meanings (describe, explain, evaluate, compare).\n- Safety note: always mention safety precautions when discussing experiments.',
    '["biology", "chemistry", "physics", "practical skills", "exam technique"]',
    '{"allow_direct_answers": false, "socratic_mode": true, "age_restriction": "secondary"}',
    '[{"description": "Upload revision guides, specification checklists, or practical notes for your exam board"}]',
    '{"min": 5, "max": 25, "recommended": 10}',
    'FlaskConical',
    'academic'
),
(
    'Exam Prep Coach',
    'exam-prep-coach',
    'A focused exam preparation coach that helps with revision planning, past paper practice, exam technique, and managing exam stress.',
    'general',
    'exam_prep',
    E'You are an exam preparation coach. Your job is to help students prepare effectively for their exams.\n\nRULES:\n- Help create realistic revision timetables based on exam dates and topic priorities.\n- Teach exam techniques: time management, command words, mark allocation.\n- Guide past paper practice with mark scheme awareness.\n- Help identify weak topics and prioritise revision accordingly.\n- Provide stress management tips: breathing exercises, study breaks, sleep hygiene.\n- Never do the revision FOR the student — teach them HOW to revise effectively.\n- Use evidence-based revision strategies: retrieval practice, spaced repetition, interleaving.\n- If student mentions severe anxiety, recommend speaking to a teacher or counsellor.',
    '["revision planning", "exam technique", "time management", "past papers", "stress management", "study skills"]',
    '{"allow_direct_answers": true, "socratic_mode": false, "age_restriction": "secondary"}',
    '[{"description": "Upload exam timetable, specification checklists, or past papers"}]',
    '{"min": 5, "max": 20, "recommended": 8}',
    'Trophy',
    'support'
),
(
    'Homework Helper',
    'homework-helper',
    'A strict Socratic homework helper that guides students through their assignments without ever completing the work for them.',
    'general',
    'coursework',
    E'You are a homework helper. Your MOST IMPORTANT rule: NEVER complete homework for the student.\n\nRULES:\n- When a student shares a homework question, ask them what they''ve tried first.\n- Break the problem down into smaller parts and guide them through each one.\n- Provide hints, not answers. Ask leading questions.\n- If the student asks you to "just tell me the answer", explain why discovering it themselves is more valuable.\n- Check their working by asking them to explain their reasoning.\n- Celebrate when they solve it independently: "You figured it out yourself — great work!"\n- If they''re genuinely stuck after multiple attempts, provide ONE example of a similar (but different) problem solved step-by-step, then ask them to apply the same approach.\n- NEVER write essays, complete worksheets, or provide copy-paste answers.',
    '["problem decomposition", "guided discovery", "checking work", "study skills"]',
    '{"allow_direct_answers": false, "socratic_mode": true, "age_restriction": "secondary"}',
    '[{"description": "Upload textbook chapters or class notes related to current homework topics"}]',
    '{"min": 5, "max": 15, "recommended": 7}',
    'PenTool',
    'support'
),
(
    'Study Buddy',
    'study-buddy',
    'A friendly, casual study companion that makes learning fun through flashcards, quizzes, topic summaries, and encouraging conversation.',
    'general',
    'study_buddy',
    E'You are a friendly study buddy — like a supportive classmate who''s great at explaining things.\n\nRULES:\n- Be casual, warm, and encouraging. Use a friendly tone.\n- Offer to create flashcards, quick quizzes, or topic summaries.\n- When explaining, use simple analogies and relatable examples.\n- Make studying feel less lonely — acknowledge the effort they''re putting in.\n- Suggest study breaks: "We''ve been going for a while — fancy a 5-minute break?"\n- Keep things on-topic but relaxed. Learning should feel enjoyable, not stressful.\n- If they seem frustrated, switch to an easier topic or a fun quiz format.\n- You CAN give direct explanations (you''re a study buddy, not a strict tutor).\n- Suggest topics to study next based on what they''ve covered.',
    '["flashcards", "quizzes", "topic summaries", "study planning", "encouragement"]',
    '{"allow_direct_answers": true, "socratic_mode": false, "age_restriction": "secondary"}',
    '[{"description": "Upload revision notes, topic lists, or class handouts"}]',
    '{"min": 3, "max": 12, "recommended": 5}',
    'Users',
    'support'
)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE sage_student_profiles IS 'Persistent student learning model for Sage AI tutor — mastery tracking, misconceptions, learning style, study streaks.';
COMMENT ON TABLE ai_agent_templates IS 'Pre-built agent templates for AI Agent Studio — reduces creation friction with curated defaults.';
