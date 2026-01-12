-- Migration: 165_seed_form_config_professional_details.sql
-- Purpose: Seed form_config table with Professional Details form configurations
-- This includes all dropdown options and field metadata for tutor, agent, and client roles

-- ============================================================================
-- TUTOR ONBOARDING - PROFESSIONAL DETAILS
-- ============================================================================

-- Field: bio (About You)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bio', 'onboarding.tutor', 'About You', 'Describe your tutoring or teaching style, strengths, and what areas you specialise in', 'Minimum 50 characters required', 0);

-- Field: bioVideoUrl
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bioVideoUrl', 'onboarding.tutor', '30-Second Intro Video (Optional)', 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points', '', 0);

-- Field: status
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'onboarding.tutor', 'Status', 'Select status', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'onboarding.tutor', 'Professional Tutor', 'Professional Tutor', 0),
('option', 'status', 'onboarding.tutor', 'Solo Tutor', 'Solo Tutor', 1),
('option', 'status', 'onboarding.tutor', 'Part-time Tutor', 'Part-time Tutor', 2);

-- Field: academicQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'onboarding.tutor', 'Academic Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'onboarding.tutor', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'onboarding.tutor', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'onboarding.tutor', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'onboarding.tutor', 'Professional Certificate', 'Professional Certificate', 3);

-- Field: teachingProfessionalQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'onboarding.tutor', 'Teaching Professional Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'onboarding.tutor', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'onboarding.tutor', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'onboarding.tutor', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'onboarding.tutor', 'None', 'None', 3);

-- Field: teachingExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'onboarding.tutor', 'Teaching Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'onboarding.tutor', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'onboarding.tutor', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'onboarding.tutor', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2);

-- Field: tutoringExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'onboarding.tutor', 'Tutoring Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'onboarding.tutor', 'New Tutor (0-2 years)', 'New Tutor (0-2 years)', 0),
('option', 'tutoringExperience', 'onboarding.tutor', 'Experienced Tutor (3-5 years)', 'Experienced Tutor (3-5 years)', 1),
('option', 'tutoringExperience', 'onboarding.tutor', 'Expert Tutor (5+ years)', 'Expert Tutor (5+ years)', 2);

-- Field: keyStages
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'onboarding.tutor', 'Key Stages', 'Select key stages', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'onboarding.tutor', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'onboarding.tutor', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'onboarding.tutor', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'onboarding.tutor', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: subjects
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'onboarding.tutor', 'Subjects', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'onboarding.tutor', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'onboarding.tutor', 'English', 'English', 1),
('option', 'subjects', 'onboarding.tutor', 'Science', 'Science', 2),
('option', 'subjects', 'onboarding.tutor', 'Physics', 'Physics', 3),
('option', 'subjects', 'onboarding.tutor', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'onboarding.tutor', 'Biology', 'Biology', 5),
('option', 'subjects', 'onboarding.tutor', 'History', 'History', 6),
('option', 'subjects', 'onboarding.tutor', 'Geography', 'Geography', 7),
('option', 'subjects', 'onboarding.tutor', 'Languages', 'Languages', 8);

-- Field: sessionType
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'onboarding.tutor', 'Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'onboarding.tutor', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'onboarding.tutor', 'Group Session', 'Group Session', 1);

-- Field: deliveryMode
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'onboarding.tutor', 'Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'onboarding.tutor', 'Online', 'Online', 0),
('option', 'deliveryMode', 'onboarding.tutor', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'onboarding.tutor', 'Hybrid', 'Hybrid', 2);

-- Field: oneOnOneRate
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'oneOnOneRate', 'onboarding.tutor', 'One-on-One Session Rate (1 hour session, 1 student)', '£50', 0);

-- Field: groupSessionRate
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'groupSessionRate', 'onboarding.tutor', 'Group Session Rate (1 hour session, 1 student)', '£25', 0);


-- ============================================================================
-- AGENT ONBOARDING - PROFESSIONAL DETAILS
-- ============================================================================

-- Field: bio (About You)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bio', 'onboarding.agent', 'About You', 'Describe your agency services, expertise, and what makes your educational services unique', 'Minimum 50 characters required', 0);

-- Field: bioVideoUrl
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bioVideoUrl', 'onboarding.agent', '30-Second Intro Video (Optional)', 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points', '', 0);

-- Field: status
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'onboarding.agent', 'Status', 'Select status', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'onboarding.agent', 'Professional Agent', 'Professional Agent', 0),
('option', 'status', 'onboarding.agent', 'Solo Agent', 'Solo Agent', 1),
('option', 'status', 'onboarding.agent', 'Part-time Agent', 'Part-time Agent', 2);

-- Field: academicQualifications (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'onboarding.agent', 'Academic Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'onboarding.agent', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'onboarding.agent', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'onboarding.agent', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'onboarding.agent', 'Professional Certificate', 'Professional Certificate', 3);

-- Field: teachingProfessionalQualifications (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'onboarding.agent', 'Teaching Professional Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'onboarding.agent', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'onboarding.agent', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'onboarding.agent', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'onboarding.agent', 'None', 'None', 3);

-- Field: teachingExperience (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'onboarding.agent', 'Teaching Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'onboarding.agent', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'onboarding.agent', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'onboarding.agent', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2);

-- Field: tutoringExperience (renamed to agentExperience for agents)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'onboarding.agent', 'Agent Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'onboarding.agent', 'New Agent (0-2 years)', 'New Agent (0-2 years)', 0),
('option', 'tutoringExperience', 'onboarding.agent', 'Experienced Agent (3-5 years)', 'Experienced Agent (3-5 years)', 1),
('option', 'tutoringExperience', 'onboarding.agent', 'Expert Agent (5+ years)', 'Expert Agent (5+ years)', 2);

-- Field: keyStages (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'onboarding.agent', 'Key Stages', 'Select key stages', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'onboarding.agent', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'onboarding.agent', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'onboarding.agent', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'onboarding.agent', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: subjects (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'onboarding.agent', 'Subjects', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'onboarding.agent', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'onboarding.agent', 'English', 'English', 1),
('option', 'subjects', 'onboarding.agent', 'Science', 'Science', 2),
('option', 'subjects', 'onboarding.agent', 'Physics', 'Physics', 3),
('option', 'subjects', 'onboarding.agent', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'onboarding.agent', 'Biology', 'Biology', 5),
('option', 'subjects', 'onboarding.agent', 'History', 'History', 6),
('option', 'subjects', 'onboarding.agent', 'Geography', 'Geography', 7),
('option', 'subjects', 'onboarding.agent', 'Languages', 'Languages', 8);

-- Field: sessionType (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'onboarding.agent', 'Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'onboarding.agent', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'onboarding.agent', 'Group Session', 'Group Session', 1);

-- Field: deliveryMode (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'onboarding.agent', 'Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'onboarding.agent', 'Online', 'Online', 0),
('option', 'deliveryMode', 'onboarding.agent', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'onboarding.agent', 'Hybrid', 'Hybrid', 2);

-- Field: oneOnOneRate (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'oneOnOneRate', 'onboarding.agent', 'One-on-One Session Rate (1 hour session, 1 student)', '£50', 0);

-- Field: groupSessionRate (same as tutor)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'groupSessionRate', 'onboarding.agent', 'Group Session Rate (1 hour session, 1 student)', '£25', 0);


-- ============================================================================
-- CLIENT ONBOARDING - PROFESSIONAL DETAILS
-- ============================================================================

-- Field: bio (About Your Learning Needs)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bio', 'onboarding.client', 'About Your Learning Needs', 'Describe what you''re looking for in a tutor and your learning goals', 'Minimum 50 characters required', 0);

-- Field: bioVideoUrl (not used for clients, but keeping for consistency)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bioVideoUrl', 'onboarding.client', '30-Second Intro Video (Optional)', 'Paste YouTube, Loom, or Vimeo URL', '', 0);

-- Field: status (Who Needs Tutoring?)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'onboarding.client', 'Who Needs Tutoring?', 'Select who needs tutoring', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'onboarding.client', 'Myself (Adult learner)', 'Myself (Adult learner)', 0),
('option', 'status', 'onboarding.client', 'My child/children', 'My child/children', 1),
('option', 'status', 'onboarding.client', 'Other family member', 'Other family member', 2);

-- Field: academicQualifications (Preferred Tutor Qualifications - OPTIONAL)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'onboarding.client', 'Preferred Tutor Qualifications (Optional)', 'Select preferred qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'onboarding.client', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'onboarding.client', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'onboarding.client', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'onboarding.client', 'Professional Certificate', 'Professional Certificate', 3),
('option', 'academicQualifications', 'onboarding.client', 'No preference', 'No preference', 4);

-- Field: teachingProfessionalQualifications (Preferred Teaching Credentials - OPTIONAL)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'onboarding.client', 'Preferred Teaching Credentials (Optional)', 'Select preferred credentials', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'onboarding.client', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'onboarding.client', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'onboarding.client', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'onboarding.client', 'No preference', 'No preference', 3);

-- Field: teachingExperience (Preferred Teaching Background - OPTIONAL)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'onboarding.client', 'Preferred Teaching Background (Optional)', 'Select preferred experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'onboarding.client', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'onboarding.client', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'onboarding.client', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2),
('option', 'teachingExperience', 'onboarding.client', 'No preference', 'No preference', 3);

-- Field: tutoringExperience (same as tutor but required for clients)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'onboarding.client', 'Preferred Tutoring Experience', 'Select preferred experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'onboarding.client', 'New Tutor (0-2 years)', 'New Tutor (0-2 years)', 0),
('option', 'tutoringExperience', 'onboarding.client', 'Experienced Tutor (3-5 years)', 'Experienced Tutor (3-5 years)', 1),
('option', 'tutoringExperience', 'onboarding.client', 'Expert Tutor (5+ years)', 'Expert Tutor (5+ years)', 2),
('option', 'tutoringExperience', 'onboarding.client', 'No preference', 'No preference', 3);

-- Field: keyStages (Student's Education Level)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'onboarding.client', 'Student''s Education Level', 'Select education level', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'onboarding.client', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'onboarding.client', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'onboarding.client', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'onboarding.client', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: subjects (Subjects Needed)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'onboarding.client', 'Subjects Needed', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'onboarding.client', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'onboarding.client', 'English', 'English', 1),
('option', 'subjects', 'onboarding.client', 'Science', 'Science', 2),
('option', 'subjects', 'onboarding.client', 'Physics', 'Physics', 3),
('option', 'subjects', 'onboarding.client', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'onboarding.client', 'Biology', 'Biology', 5),
('option', 'subjects', 'onboarding.client', 'History', 'History', 6),
('option', 'subjects', 'onboarding.client', 'Geography', 'Geography', 7),
('option', 'subjects', 'onboarding.client', 'Languages', 'Languages', 8);

-- Field: sessionType (Preferred Session Type)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'onboarding.client', 'Preferred Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'onboarding.client', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'onboarding.client', 'Group Session', 'Group Session', 1);

-- Field: deliveryMode (Preferred Delivery Mode)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'onboarding.client', 'Preferred Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'onboarding.client', 'Online', 'Online', 0),
('option', 'deliveryMode', 'onboarding.client', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'onboarding.client', 'Hybrid', 'Hybrid', 2);

-- Field: oneOnOneRate (Budget for One-on-One Sessions)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'oneOnOneRate', 'onboarding.client', 'Budget for One-on-One Sessions (per hour)', '£50', 0);

-- Field: groupSessionRate (Budget for Group Sessions - OPTIONAL)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'groupSessionRate', 'onboarding.client', 'Budget for Group Sessions (per hour, per student) - Optional', '£25', 0);
