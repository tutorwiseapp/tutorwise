-- Migration: 168_seed_form_config_organisation_forms.sql
-- Purpose: Seed form_config table with Organisation form configurations
-- This duplicates onboarding fields to organisation contexts since they haven't been customized yet
-- Date: 2026-01-12

-- ============================================================================
-- ORGANISATION.TUTOR - DUPLICATE OF ONBOARDING.TUTOR
-- ============================================================================

-- Field: bio (About You)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bio', 'organisation.tutor', 'About You', 'Describe your tutoring or teaching style, strengths, and what areas you specialise in', 'Minimum 50 characters required', 0);

-- Field: bioVideoUrl
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bioVideoUrl', 'organisation.tutor', '30-Second Intro Video (Optional)', 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points', '', 0);

-- Field: status
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'organisation.tutor', 'Status', 'Select status', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'organisation.tutor', 'Professional Tutor', 'Professional Tutor', 0),
('option', 'status', 'organisation.tutor', 'Solo Tutor', 'Solo Tutor', 1),
('option', 'status', 'organisation.tutor', 'Part-time Tutor', 'Part-time Tutor', 2);

-- Field: academicQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'organisation.tutor', 'Academic Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'organisation.tutor', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'organisation.tutor', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'organisation.tutor', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'organisation.tutor', 'Professional Certificate', 'Professional Certificate', 3);

-- Field: teachingProfessionalQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'organisation.tutor', 'Teaching Professional Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'organisation.tutor', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'organisation.tutor', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'organisation.tutor', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'organisation.tutor', 'None', 'None', 3);

-- Field: teachingExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'organisation.tutor', 'Teaching Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'organisation.tutor', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'organisation.tutor', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'organisation.tutor', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2);

-- Field: tutoringExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'organisation.tutor', 'Tutoring Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'organisation.tutor', 'New Tutor (0-2 years)', 'New Tutor (0-2 years)', 0),
('option', 'tutoringExperience', 'organisation.tutor', 'Experienced Tutor (3-5 years)', 'Experienced Tutor (3-5 years)', 1),
('option', 'tutoringExperience', 'organisation.tutor', 'Expert Tutor (5+ years)', 'Expert Tutor (5+ years)', 2);

-- Field: keyStages
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'organisation.tutor', 'Key Stages', 'Select key stages', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'organisation.tutor', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'organisation.tutor', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'organisation.tutor', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'organisation.tutor', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: subjects
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'organisation.tutor', 'Subjects', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'organisation.tutor', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'organisation.tutor', 'English', 'English', 1),
('option', 'subjects', 'organisation.tutor', 'Science', 'Science', 2),
('option', 'subjects', 'organisation.tutor', 'Physics', 'Physics', 3),
('option', 'subjects', 'organisation.tutor', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'organisation.tutor', 'Biology', 'Biology', 5),
('option', 'subjects', 'organisation.tutor', 'History', 'History', 6),
('option', 'subjects', 'organisation.tutor', 'Geography', 'Geography', 7),
('option', 'subjects', 'organisation.tutor', 'Languages', 'Languages', 8);

-- Field: sessionType
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'organisation.tutor', 'Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'organisation.tutor', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'organisation.tutor', 'Group Session', 'Group Session', 1);

-- Field: deliveryMode
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'organisation.tutor', 'Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'organisation.tutor', 'Online', 'Online', 0),
('option', 'deliveryMode', 'organisation.tutor', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'organisation.tutor', 'Hybrid', 'Hybrid', 2);

-- Field: oneOnOneRate
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'oneOnOneRate', 'organisation.tutor', 'One-on-One Session Rate (1 hour session, 1 student)', '£50', 0);

-- Field: groupSessionRate
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'groupSessionRate', 'organisation.tutor', 'Group Session Rate (1 hour session, 1 student)', '£25', 0);


-- ============================================================================
-- ORGANISATION.AGENT - DUPLICATE OF ONBOARDING.AGENT
-- ============================================================================

-- Field: bio (About You)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bio', 'organisation.agent', 'About You', 'Describe your agency services, expertise, and what makes your educational services unique', 'Minimum 50 characters required', 0);

-- Field: bioVideoUrl
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bioVideoUrl', 'organisation.agent', '30-Second Intro Video (Optional)', 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points', '', 0);

-- Field: status
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'organisation.agent', 'Status', 'Select status', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'organisation.agent', 'Professional Agent', 'Professional Agent', 0),
('option', 'status', 'organisation.agent', 'Solo Agent', 'Solo Agent', 1),
('option', 'status', 'organisation.agent', 'Part-time Agent', 'Part-time Agent', 2);

-- Field: academicQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'organisation.agent', 'Academic Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'organisation.agent', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'organisation.agent', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'organisation.agent', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'organisation.agent', 'Professional Certificate', 'Professional Certificate', 3);

-- Field: teachingProfessionalQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'organisation.agent', 'Teaching Professional Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'organisation.agent', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'organisation.agent', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'organisation.agent', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'organisation.agent', 'None', 'None', 3);

-- Field: teachingExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'organisation.agent', 'Teaching Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'organisation.agent', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'organisation.agent', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'organisation.agent', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2);

-- Field: tutoringExperience (renamed to agentExperience for agents)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'organisation.agent', 'Agent Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'organisation.agent', 'New Agent (0-2 years)', 'New Agent (0-2 years)', 0),
('option', 'tutoringExperience', 'organisation.agent', 'Experienced Agent (3-5 years)', 'Experienced Agent (3-5 years)', 1),
('option', 'tutoringExperience', 'organisation.agent', 'Expert Agent (5+ years)', 'Expert Agent (5+ years)', 2);

-- Field: keyStages
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'organisation.agent', 'Key Stages', 'Select key stages', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'organisation.agent', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'organisation.agent', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'organisation.agent', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'organisation.agent', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: subjects
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'organisation.agent', 'Subjects', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'organisation.agent', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'organisation.agent', 'English', 'English', 1),
('option', 'subjects', 'organisation.agent', 'Science', 'Science', 2),
('option', 'subjects', 'organisation.agent', 'Physics', 'Physics', 3),
('option', 'subjects', 'organisation.agent', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'organisation.agent', 'Biology', 'Biology', 5),
('option', 'subjects', 'organisation.agent', 'History', 'History', 6),
('option', 'subjects', 'organisation.agent', 'Geography', 'Geography', 7),
('option', 'subjects', 'organisation.agent', 'Languages', 'Languages', 8);

-- Field: sessionType
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'organisation.agent', 'Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'organisation.agent', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'organisation.agent', 'Group Session', 'Group Session', 1);

-- Field: deliveryMode
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'organisation.agent', 'Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'organisation.agent', 'Online', 'Online', 0),
('option', 'deliveryMode', 'organisation.agent', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'organisation.agent', 'Hybrid', 'Hybrid', 2);

-- Field: oneOnOneRate
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'oneOnOneRate', 'organisation.agent', 'One-on-One Session Rate (1 hour session, 1 student)', '£50', 0);

-- Field: groupSessionRate
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'groupSessionRate', 'organisation.agent', 'Group Session Rate (1 hour session, 1 student)', '£25', 0);


-- ============================================================================
-- ORGANISATION.CLIENT - DUPLICATE OF ONBOARDING.CLIENT
-- ============================================================================

-- Field: bio (About Your Learning Needs)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bio', 'organisation.client', 'About Your Learning Needs', 'Describe what you''re looking for in a tutor and your learning goals', 'Minimum 50 characters required', 0);

-- Field: bioVideoUrl (not used for clients, but keeping for consistency)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, field_help_text, display_order) VALUES
('field_meta', 'bioVideoUrl', 'organisation.client', '30-Second Intro Video (Optional)', 'Paste YouTube, Loom, or Vimeo URL', '', 0);

-- Field: status (Who Needs Tutoring?)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'organisation.client', 'Who Needs Tutoring?', 'Select who needs tutoring', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'organisation.client', 'Myself (Adult learner)', 'Myself (Adult learner)', 0),
('option', 'status', 'organisation.client', 'My child/children', 'My child/children', 1),
('option', 'status', 'organisation.client', 'Other family member', 'Other family member', 2);

-- Field: academicQualifications (Preferred Tutor Qualifications - OPTIONAL)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'organisation.client', 'Preferred Tutor Qualifications (Optional)', 'Select preferred qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'organisation.client', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'organisation.client', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'organisation.client', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'organisation.client', 'Professional Certificate', 'Professional Certificate', 3),
('option', 'academicQualifications', 'organisation.client', 'No preference', 'No preference', 4);

-- Field: teachingProfessionalQualifications (Preferred Teaching Credentials - OPTIONAL)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'organisation.client', 'Preferred Teaching Credentials (Optional)', 'Select preferred credentials', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'organisation.client', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'organisation.client', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'organisation.client', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'organisation.client', 'No preference', 'No preference', 3);

-- Field: teachingExperience (Preferred Teaching Background - OPTIONAL)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'organisation.client', 'Preferred Teaching Background (Optional)', 'Select preferred experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'organisation.client', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'organisation.client', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'organisation.client', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2),
('option', 'teachingExperience', 'organisation.client', 'No preference', 'No preference', 3);

-- Field: tutoringExperience (same as tutor but required for clients)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'organisation.client', 'Preferred Tutoring Experience', 'Select preferred experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'organisation.client', 'New Tutor (0-2 years)', 'New Tutor (0-2 years)', 0),
('option', 'tutoringExperience', 'organisation.client', 'Experienced Tutor (3-5 years)', 'Experienced Tutor (3-5 years)', 1),
('option', 'tutoringExperience', 'organisation.client', 'Expert Tutor (5+ years)', 'Expert Tutor (5+ years)', 2),
('option', 'tutoringExperience', 'organisation.client', 'No preference', 'No preference', 3);

-- Field: keyStages (Student's Education Level)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'organisation.client', 'Student''s Education Level', 'Select education level', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'organisation.client', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'organisation.client', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'organisation.client', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'organisation.client', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: subjects (Subjects Needed)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'organisation.client', 'Subjects Needed', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'organisation.client', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'organisation.client', 'English', 'English', 1),
('option', 'subjects', 'organisation.client', 'Science', 'Science', 2),
('option', 'subjects', 'organisation.client', 'Physics', 'Physics', 3),
('option', 'subjects', 'organisation.client', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'organisation.client', 'Biology', 'Biology', 5),
('option', 'subjects', 'organisation.client', 'History', 'History', 6),
('option', 'subjects', 'organisation.client', 'Geography', 'Geography', 7),
('option', 'subjects', 'organisation.client', 'Languages', 'Languages', 8);

-- Field: sessionType (Preferred Session Type)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'organisation.client', 'Preferred Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'organisation.client', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'organisation.client', 'Group Session', 'Group Session', 1);

-- Field: deliveryMode (Preferred Delivery Mode)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'organisation.client', 'Preferred Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'organisation.client', 'Online', 'Online', 0),
('option', 'deliveryMode', 'organisation.client', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'organisation.client', 'Hybrid', 'Hybrid', 2);

-- Field: oneOnOneRate (Budget for One-on-One Sessions)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'oneOnOneRate', 'organisation.client', 'Budget for One-on-One Sessions (per hour)', '£50', 0);

-- Field: groupSessionRate (Budget for Group Sessions - OPTIONAL)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'groupSessionRate', 'organisation.client', 'Budget for Group Sessions (per hour, per student) - Optional', '£25', 0);
