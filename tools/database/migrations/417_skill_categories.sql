-- Migration 417: skill_categories taxonomy table
-- Creates a full 5-domain category taxonomy for agents and skills.
-- Renames specialist_agents.department → category.
-- Adds optional sub_category column for education subject specialisation.

-- ── 1. Create skill_categories table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skill_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        UNIQUE NOT NULL,
  label       TEXT        NOT NULL,
  domain      TEXT        NOT NULL CHECK (domain IN ('human', 'ai', 'enterprise', 'education', 'workspace')),
  parent_slug TEXT        REFERENCES skill_categories(slug),
  color       TEXT        NOT NULL DEFAULT '#6b7280',
  description TEXT,
  built_in    BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read skill_categories"  ON skill_categories FOR SELECT USING (true);
CREATE POLICY "Admin manage skill_categories" ON skill_categories FOR ALL    USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_skill_categories_domain ON skill_categories(domain);
CREATE INDEX IF NOT EXISTS idx_skill_categories_parent ON skill_categories(parent_slug);

-- ── 2. Seed — HUMAN domain ────────────────────────────────────────────────────

INSERT INTO skill_categories (slug, label, domain, parent_slug, color, description, sort_order) VALUES
  ('hr',          'Human Resources',      'human', NULL, '#f97316', 'Recruitment, onboarding, compliance, wellbeing',        10),
  ('engineering', 'Engineering',          'human', NULL, '#6366f1', 'Software development, architecture, DevOps',            20),
  ('technology',  'Technology',           'human', NULL, '#64748b', 'Systems, networking, cloud, security operations',       30),
  ('data-science','Data Science',         'human', NULL, '#3b82f6', 'ML, statistics, modelling, experimentation',            40),
  ('analytics',   'Analytics & BI',       'human', NULL, '#0891b2', 'Reporting, dashboards, KPIs, attribution',              50),
  ('marketing',   'Marketing',            'human', NULL, '#ec4899', 'Brand, campaigns, content, SEO, growth',                60),
  ('sales',       'Sales',                'human', NULL, '#0ea5e9', 'Pipeline, CRM, outreach, closing',                      70),
  ('finance',     'Finance & Accounting', 'human', NULL, '#10b981', 'Revenue, forecasting, budgets, payroll',                80),
  ('legal',       'Legal & Compliance',   'human', NULL, '#94a3b8', 'Contracts, GDPR, IP, regulatory',                       90),
  ('operations',  'Operations',           'human', NULL, '#14b8a6', 'Process, logistics, vendor management',                100),
  ('product',     'Product Management',   'human', NULL, '#8b5cf6', 'Roadmap, specs, discovery, prioritisation',            110),
  ('strategy',    'Strategy',             'human', NULL, '#7c3aed', 'OKRs, market positioning, planning',                  120),
  ('support',     'Customer Support',     'human', NULL, '#84cc16', 'Tickets, resolution, SLAs, escalation',               130),
  ('security',    'Security',             'human', NULL, '#ef4444', 'Threat modelling, pen testing, compliance',            140),
  ('quality',     'Quality Assurance',    'human', NULL, '#f59e0b', 'Testing, standards, audits, sign-off',                150)
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Seed — AI domain ───────────────────────────────────────────────────────

INSERT INTO skill_categories (slug, label, domain, parent_slug, color, description, sort_order) VALUES
  ('ai-reasoning',     'Reasoning & Planning',  'ai', NULL, '#7c3aed', 'Multi-step planning, chain-of-thought, decomposition',  10),
  ('ai-language',      'Language & NLP',        'ai', NULL, '#6366f1', 'Text analysis, summarisation, generation, translation', 20),
  ('ai-tools',         'Tool Use & Automation', 'ai', NULL, '#0891b2', 'API calling, ReAct loops, function execution',          30),
  ('ai-memory',        'Memory & Context',      'ai', NULL, '#14b8a6', 'Episodic recall, fact extraction, context management',  40),
  ('ai-retrieval',     'Knowledge Retrieval',   'ai', NULL, '#3b82f6', 'RAG, semantic search, chunk ranking',                  50),
  ('ai-orchestration', 'Agent Orchestration',   'ai', NULL, '#8b5cf6', 'Multi-agent coordination, delegation, synthesis',      60),
  ('ai-safety',        'Safety & Alignment',    'ai', NULL, '#ef4444', 'Guardrails, output validation, harm prevention',       70),
  ('ai-vision',        'Vision & Multimodal',   'ai', NULL, '#ec4899', 'Image analysis, document parsing, OCR',                80)
ON CONFLICT (slug) DO NOTHING;

-- ── 4. Seed — ENTERPRISE domain (formerly Generic) ───────────────────────────

INSERT INTO skill_categories (slug, label, domain, parent_slug, color, description, sort_order) VALUES
  ('research',         'Research & Analysis',   'enterprise', NULL, '#3b82f6', 'Investigation, synthesis, evidence gathering',          10),
  ('communication',    'Communication',         'enterprise', NULL, '#0ea5e9', 'Writing, presenting, stakeholder management',           20),
  ('project-mgmt',     'Project Management',    'enterprise', NULL, '#f97316', 'Planning, tracking, risk, delivery',                    30),
  ('data-processing',  'Data Processing',       'enterprise', NULL, '#14b8a6', 'ETL, cleaning, transformation, validation',             40),
  ('content-creation', 'Content Creation',      'enterprise', NULL, '#ec4899', 'Copywriting, editing, multimedia, publishing',          50),
  ('decision-making',  'Decision Intelligence', 'enterprise', NULL, '#7c3aed', 'Trade-off analysis, scoring, recommendation',           60)
ON CONFLICT (slug) DO NOTHING;

-- ── 5. Seed — EDUCATION domain (top-level + subject sub-categories) ──────────

INSERT INTO skill_categories (slug, label, domain, parent_slug, color, description, sort_order) VALUES
  ('education',         'Education',              'education', NULL,        '#006C67', 'Learning, curriculum, pedagogy, assessment',                10),
  ('curriculum',        'Curriculum Design',      'education', NULL,        '#006C67', 'Spec mapping, topic sequencing, learning objectives',       20),
  ('assessment',        'Assessment & Testing',   'education', NULL,        '#f59e0b', 'Quizzes, rubrics, grading, feedback',                       30),
  ('pedagogy',          'Teaching Methods',       'education', NULL,        '#10b981', 'Socratic, direct instruction, scaffolding, SEN/SEND',       40),
  ('student-analytics', 'Student Analytics',      'education', NULL,        '#3b82f6', 'Progress tracking, mastery, misconception detection',       50),
  ('edtech',            'EdTech & Platforms',     'education', NULL,        '#ec4899', 'LMS, AI tutoring tools, accessibility',                     60),
  ('safeguarding',      'Safeguarding',           'education', NULL,        '#ef4444', 'Child protection, KCSIE, age-appropriate content',         70),
  -- Subject sub-categories (parent_slug = 'education')
  ('subject-maths',     'Mathematics',            'education', 'education', '#6366f1', 'Arithmetic through calculus, KS1–A-Level',                 80),
  ('subject-science',   'Sciences',               'education', 'education', '#14b8a6', 'Biology, Chemistry, Physics, Primary science',             90),
  ('subject-english',   'English & Languages',    'education', 'education', '#0ea5e9', 'Language, Literature, MFL',                               100),
  ('subject-humanities','Humanities',             'education', 'education', '#f97316', 'History, Geography, RE, Social Sciences',                 110),
  ('subject-computing', 'Computing & CS',         'education', 'education', '#8b5cf6', 'Programming, algorithms, systems, databases',             120),
  ('subject-business',  'Business & Economics',   'education', 'education', '#10b981', 'Business Studies, Economics, Accounting',                 130)
ON CONFLICT (slug) DO NOTHING;

-- ── 6. Seed — WORKSPACE domain (product-agnostic, formerly Platform) ─────────

INSERT INTO skill_categories (slug, label, domain, parent_slug, color, description, sort_order) VALUES
  ('ws-marketplace', 'Marketplace',       'workspace', NULL, '#0891b2', 'Supply/demand, listing quality, search optimisation', 10),
  ('ws-bookings',    'Bookings & Sessions','workspace', NULL, '#10b981', 'Lifecycle, disputes, attendance, fulfilment',         20),
  ('ws-revenue',     'Revenue & Payments','workspace', NULL, '#059669', 'Payments, commissions, payouts',                      30),
  ('ws-growth',      'Growth & Referrals','workspace', NULL, '#8b5cf6', 'Referral funnel, virality, acquisition',              40),
  ('ws-content',     'Resources & Content','workspace',NULL, '#f59e0b', 'Articles, SEO, editorial pipeline',                   50),
  ('ws-quality',     'Tutor Quality',     'workspace', NULL, '#006C67', 'Profile completeness, onboarding, CaaS score',        60),
  ('ws-health',      'Platform Health',   'workspace', NULL, '#ef4444', 'Uptime, errors, performance, alerts',                 70),
  ('ws-compliance',  'Platform Compliance','workspace',NULL, '#94a3b8', 'GDPR, DBS, safeguarding, T&Cs',                       80)
ON CONFLICT (slug) DO NOTHING;

-- ── 7. Rename department → category on specialist_agents ─────────────────────

ALTER TABLE specialist_agents RENAME COLUMN department TO category;

-- ── 8. Add sub_category column (optional, for education subject specialisation)

ALTER TABLE specialist_agents ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- ── 9. Normalise existing built-in agent categories to new slugs ──────────────

UPDATE specialist_agents SET category = 'engineering'
  WHERE category IN ('Development', 'Engineering', 'development');

UPDATE specialist_agents SET category = 'quality'
  WHERE category IN ('Quality', 'QA', 'quality');

UPDATE specialist_agents SET category = 'security'
  WHERE category IN ('Security', 'security');

UPDATE specialist_agents SET category = 'marketing'
  WHERE category IN ('Marketing', 'marketing');

UPDATE specialist_agents SET category = 'analytics'
  WHERE category IN ('Analytics', 'analytics');

UPDATE specialist_agents SET category = 'operations'
  WHERE category IN ('Planning', 'Operations', 'planning', 'operations');

UPDATE specialist_agents SET category = 'strategy'
  WHERE category IN ('Strategy', 'strategy');

UPDATE specialist_agents SET category = 'finance'
  WHERE category IN ('Finance', 'finance');

UPDATE specialist_agents SET category = 'hr'
  WHERE category IN ('HR', 'hr', 'Human Resources');

UPDATE specialist_agents SET category = 'legal'
  WHERE category IN ('Legal', 'legal');

UPDATE specialist_agents SET category = 'product'
  WHERE category IN ('Product', 'product');

UPDATE specialist_agents SET category = 'sales'
  WHERE category IN ('Sales', 'sales');

UPDATE specialist_agents SET category = 'support'
  WHERE category IN ('Support', 'support');
