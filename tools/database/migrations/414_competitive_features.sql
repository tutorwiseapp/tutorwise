-- Migration 414: Competitive Features — Gamification, LTI, Enhanced Grading
-- Priorities 1-4 from competitive gap analysis

-- Priority 2: Gamification — Student XP, levels, badges (extends referral system to learning)
CREATE TABLE IF NOT EXISTS sage_student_xp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    xp_this_week INTEGER NOT NULL DEFAULT 0,
    week_start DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id)
);

CREATE TABLE IF NOT EXISTS sage_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(300) NOT NULL,
    icon VARCHAR(30) NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    requirement_type VARCHAR(40) NOT NULL,
    requirement_value INTEGER NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sage_student_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES sage_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, badge_id)
);

CREATE INDEX idx_sage_student_badges_student ON sage_student_badges(student_id);

-- Seed default learning badges
INSERT INTO sage_badges (slug, name, description, icon, tier, requirement_type, requirement_value, xp_reward, sort_order) VALUES
('first-session', 'First Steps', 'Complete your first tutoring session', 'Sparkles', 'bronze', 'sessions_completed', 1, 10, 1),
('five-sessions', 'Getting Started', 'Complete 5 tutoring sessions', 'Rocket', 'bronze', 'sessions_completed', 5, 25, 2),
('twenty-sessions', 'Dedicated Learner', 'Complete 20 tutoring sessions', 'GraduationCap', 'silver', 'sessions_completed', 20, 50, 3),
('fifty-sessions', 'Study Champion', 'Complete 50 tutoring sessions', 'Trophy', 'gold', 'sessions_completed', 50, 100, 4),
('first-mastery', 'Topic Master', 'Achieve 80%+ mastery in any topic', 'Star', 'bronze', 'topics_mastered', 1, 20, 5),
('five-mastery', 'Knowledge Builder', 'Achieve 80%+ mastery in 5 topics', 'Zap', 'silver', 'topics_mastered', 5, 50, 6),
('ten-mastery', 'Subject Expert', 'Achieve 80%+ mastery in 10 topics', 'Crown', 'gold', 'topics_mastered', 10, 100, 7),
('three-day-streak', 'Getting Consistent', 'Study 3 days in a row', 'Flame', 'bronze', 'streak_days', 3, 15, 8),
('seven-day-streak', 'Week Warrior', 'Study 7 days in a row', 'Flame', 'silver', 'streak_days', 7, 30, 9),
('thirty-day-streak', 'Unstoppable', 'Study 30 days in a row', 'Flame', 'gold', 'streak_days', 30, 100, 10),
('first-assessment', 'Test Taker', 'Complete your first assessment', 'ClipboardCheck', 'bronze', 'assessments_completed', 1, 15, 11),
('perfect-score', 'Perfect Score', 'Score 100% on any assessment', 'Target', 'gold', 'perfect_assessments', 1, 75, 12),
('misconception-cleared', 'Myth Buster', 'Clear your first misconception', 'Lightbulb', 'bronze', 'misconceptions_cleared', 1, 10, 13),
('five-misconceptions', 'Deep Thinker', 'Clear 5 misconceptions', 'Brain', 'silver', 'misconceptions_cleared', 5, 40, 14),
('hour-studied', 'First Hour', 'Study for a total of 60 minutes', 'Clock', 'bronze', 'study_minutes', 60, 10, 15),
('ten-hours', 'Dedicated Student', 'Study for a total of 10 hours', 'Clock', 'silver', 'study_minutes', 600, 50, 16)
ON CONFLICT (slug) DO NOTHING;

-- Priority 3: LTI Integration
CREATE TABLE IF NOT EXISTS lti_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer VARCHAR(500) NOT NULL UNIQUE,
    client_id VARCHAR(200) NOT NULL,
    deployment_id VARCHAR(200),
    auth_endpoint VARCHAR(500) NOT NULL,
    token_endpoint VARCHAR(500) NOT NULL,
    jwks_endpoint VARCHAR(500) NOT NULL,
    platform_name VARCHAR(200),
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lti_launches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    lti_user_id VARCHAR(200) NOT NULL,
    tutorwise_user_id UUID REFERENCES profiles(id),
    course_id VARCHAR(200),
    resource_link_id VARCHAR(200),
    roles JSONB DEFAULT '[]',
    custom_params JSONB DEFAULT '{}',
    lineitem_url VARCHAR(500),
    launched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lti_launches_platform ON lti_launches(platform_id, launched_at DESC);
CREATE INDEX idx_lti_launches_user ON lti_launches(lti_user_id, platform_id);

-- Priority 4: Enhanced grading — rubric evaluation results
CREATE TABLE IF NOT EXISTS sage_grading_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES sage_assessments(id) ON DELETE CASCADE,
    question_id UUID,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_answer TEXT NOT NULL,
    evaluation JSONB NOT NULL,
    grading_method VARCHAR(20) NOT NULL CHECK (grading_method IN ('deterministic', 'rubric_llm', 'hybrid')),
    llm_model VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sage_grading_student ON sage_grading_results(student_id, created_at DESC);

COMMENT ON TABLE sage_student_xp IS 'Student XP and level tracking for gamification.';
COMMENT ON TABLE sage_badges IS 'Badge definitions with tier, requirement type, and XP reward.';
COMMENT ON TABLE sage_student_badges IS 'Badges earned by students.';
COMMENT ON TABLE lti_platforms IS 'Registered LTI 1.3 platform configurations for school integration.';
COMMENT ON TABLE lti_launches IS 'LTI launch records linking platform users to TutorWise accounts.';
COMMENT ON TABLE sage_grading_results IS 'Detailed grading results from deterministic and LLM rubric evaluation.';
