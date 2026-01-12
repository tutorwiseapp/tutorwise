-- Migration: 169_seed_form_config_account_role_specific.sql
-- Purpose: Create separate account contexts for tutor, agent, and client
-- Split the generic 'account' context into role-specific contexts
-- Date: 2026-01-12

-- ============================================================================
-- ACCOUNT.TUTOR - TUTOR ACCOUNT MANAGEMENT FORMS
-- ============================================================================

-- Field: gender
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'gender', 'account.tutor', 'Gender', 'Select gender', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'gender', 'account.tutor', 'Male', 'Male', 0),
('option', 'gender', 'account.tutor', 'Female', 'Female', 1),
('option', 'gender', 'account.tutor', 'Other', 'Other', 2),
('option', 'gender', 'account.tutor', 'Prefer not to say', 'Prefer not to say', 3);

-- Field: status
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'account.tutor', 'Status', 'Select status', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'account.tutor', 'Professional Tutor', 'Professional Tutor', 0),
('option', 'status', 'account.tutor', 'Solo Tutor', 'Solo Tutor', 1),
('option', 'status', 'account.tutor', 'Part-time Tutor', 'Part-time Tutor', 2);

-- Field: academicQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'account.tutor', 'Academic Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'account.tutor', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'account.tutor', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'account.tutor', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'account.tutor', 'Professional Certificate', 'Professional Certificate', 3);

-- Field: keyStages
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'account.tutor', 'Key Stages', 'Select key stages', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'account.tutor', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'account.tutor', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'account.tutor', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'account.tutor', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: teachingProfessionalQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'account.tutor', 'Teaching Professional Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'account.tutor', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'account.tutor', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'account.tutor', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'account.tutor', 'None', 'None', 3);

-- Field: subjects
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'account.tutor', 'Subjects', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'account.tutor', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'account.tutor', 'English', 'English', 1),
('option', 'subjects', 'account.tutor', 'Science', 'Science', 2),
('option', 'subjects', 'account.tutor', 'Physics', 'Physics', 3),
('option', 'subjects', 'account.tutor', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'account.tutor', 'Biology', 'Biology', 5),
('option', 'subjects', 'account.tutor', 'History', 'History', 6),
('option', 'subjects', 'account.tutor', 'Geography', 'Geography', 7),
('option', 'subjects', 'account.tutor', 'Languages', 'Languages', 8);

-- Field: teachingExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'account.tutor', 'Teaching Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'account.tutor', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'account.tutor', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'account.tutor', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2);

-- Field: sessionType
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'account.tutor', 'Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'account.tutor', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'account.tutor', 'Group Session', 'Group Session', 1);

-- Field: tutoringExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'account.tutor', 'Tutoring Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'account.tutor', 'New Tutor (0-2 years)', 'New Tutor (0-2 years)', 0),
('option', 'tutoringExperience', 'account.tutor', 'Experienced Tutor (3-5 years)', 'Experienced Tutor (3-5 years)', 1),
('option', 'tutoringExperience', 'account.tutor', 'Expert Tutor (5+ years)', 'Expert Tutor (5+ years)', 2);

-- Field: deliveryMode
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'account.tutor', 'Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'account.tutor', 'Online', 'Online', 0),
('option', 'deliveryMode', 'account.tutor', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'account.tutor', 'Hybrid', 'Hybrid', 2);

-- Field: proofOfAddressType
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'proofOfAddressType', 'account.tutor', 'Document Type', 'Select document type', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'proofOfAddressType', 'account.tutor', 'Utility Bill', 'Utility Bill', 0),
('option', 'proofOfAddressType', 'account.tutor', 'Bank Statement', 'Bank Statement', 1),
('option', 'proofOfAddressType', 'account.tutor', 'Tax Bill', 'Tax Bill', 2),
('option', 'proofOfAddressType', 'account.tutor', 'Solicitor Letter', 'Solicitor Letter', 3);


-- ============================================================================
-- ACCOUNT.AGENT - AGENT ACCOUNT MANAGEMENT FORMS
-- ============================================================================

-- Field: gender
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'gender', 'account.agent', 'Gender', 'Select gender', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'gender', 'account.agent', 'Male', 'Male', 0),
('option', 'gender', 'account.agent', 'Female', 'Female', 1),
('option', 'gender', 'account.agent', 'Other', 'Other', 2),
('option', 'gender', 'account.agent', 'Prefer not to say', 'Prefer not to say', 3);

-- Field: status
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'account.agent', 'Status', 'Select status', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'account.agent', 'Professional Agent', 'Professional Agent', 0),
('option', 'status', 'account.agent', 'Solo Agent', 'Solo Agent', 1),
('option', 'status', 'account.agent', 'Part-time Agent', 'Part-time Agent', 2);

-- Field: academicQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'account.agent', 'Academic Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'account.agent', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'account.agent', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'account.agent', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'account.agent', 'Professional Certificate', 'Professional Certificate', 3);

-- Field: keyStages
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'account.agent', 'Key Stages', 'Select key stages', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'account.agent', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'account.agent', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'account.agent', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'account.agent', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: teachingProfessionalQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'account.agent', 'Teaching Professional Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'account.agent', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'account.agent', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'account.agent', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'account.agent', 'None', 'None', 3);

-- Field: subjects
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'account.agent', 'Subjects', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'account.agent', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'account.agent', 'English', 'English', 1),
('option', 'subjects', 'account.agent', 'Science', 'Science', 2),
('option', 'subjects', 'account.agent', 'Physics', 'Physics', 3),
('option', 'subjects', 'account.agent', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'account.agent', 'Biology', 'Biology', 5),
('option', 'subjects', 'account.agent', 'History', 'History', 6),
('option', 'subjects', 'account.agent', 'Geography', 'Geography', 7),
('option', 'subjects', 'account.agent', 'Languages', 'Languages', 8);

-- Field: teachingExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'account.agent', 'Teaching Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'account.agent', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'account.agent', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'account.agent', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2);

-- Field: sessionType
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'account.agent', 'Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'account.agent', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'account.agent', 'Group Session', 'Group Session', 1);

-- Field: tutoringExperience (renamed to agentExperience for agents)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'account.agent', 'Agent Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'account.agent', 'New Agent (0-2 years)', 'New Agent (0-2 years)', 0),
('option', 'tutoringExperience', 'account.agent', 'Experienced Agent (3-5 years)', 'Experienced Agent (3-5 years)', 1),
('option', 'tutoringExperience', 'account.agent', 'Expert Agent (5+ years)', 'Expert Agent (5+ years)', 2);

-- Field: deliveryMode
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'account.agent', 'Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'account.agent', 'Online', 'Online', 0),
('option', 'deliveryMode', 'account.agent', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'account.agent', 'Hybrid', 'Hybrid', 2);

-- Field: proofOfAddressType
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'proofOfAddressType', 'account.agent', 'Document Type', 'Select document type', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'proofOfAddressType', 'account.agent', 'Utility Bill', 'Utility Bill', 0),
('option', 'proofOfAddressType', 'account.agent', 'Bank Statement', 'Bank Statement', 1),
('option', 'proofOfAddressType', 'account.agent', 'Tax Bill', 'Tax Bill', 2),
('option', 'proofOfAddressType', 'account.agent', 'Solicitor Letter', 'Solicitor Letter', 3);


-- ============================================================================
-- ACCOUNT.CLIENT - CLIENT ACCOUNT MANAGEMENT FORMS
-- ============================================================================

-- Field: gender
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'gender', 'account.client', 'Gender', 'Select gender', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'gender', 'account.client', 'Male', 'Male', 0),
('option', 'gender', 'account.client', 'Female', 'Female', 1),
('option', 'gender', 'account.client', 'Other', 'Other', 2),
('option', 'gender', 'account.client', 'Prefer not to say', 'Prefer not to say', 3);

-- Field: educationLevel
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'educationLevel', 'account.client', 'Education Level', 'Select education level', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'educationLevel', 'account.client', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'educationLevel', 'account.client', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'educationLevel', 'account.client', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'educationLevel', 'account.client', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3),
('option', 'educationLevel', 'account.client', 'University', 'University', 4),
('option', 'educationLevel', 'account.client', 'Adult Education', 'Adult Education', 5);

-- Field: subjects (Subjects Needed)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'account.client', 'Subjects Needed', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'account.client', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'account.client', 'English', 'English', 1),
('option', 'subjects', 'account.client', 'Science', 'Science', 2),
('option', 'subjects', 'account.client', 'Physics', 'Physics', 3),
('option', 'subjects', 'account.client', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'account.client', 'Biology', 'Biology', 5),
('option', 'subjects', 'account.client', 'History', 'History', 6),
('option', 'subjects', 'account.client', 'Geography', 'Geography', 7),
('option', 'subjects', 'account.client', 'Languages', 'Languages', 8);

-- Field: learningGoals
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'learningGoals', 'account.client', 'Learning Goals', 'Select learning goals', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'learningGoals', 'account.client', 'Improve grades', 'Improve grades', 0),
('option', 'learningGoals', 'account.client', 'Exam preparation', 'Exam preparation', 1),
('option', 'learningGoals', 'account.client', 'Catch up on missed work', 'Catch up on missed work', 2),
('option', 'learningGoals', 'account.client', 'Advance ahead of class', 'Advance ahead of class', 3),
('option', 'learningGoals', 'account.client', 'Build confidence', 'Build confidence', 4),
('option', 'learningGoals', 'account.client', 'Learn new skill', 'Learn new skill', 5),
('option', 'learningGoals', 'account.client', 'Personal development', 'Personal development', 6);

-- Field: learningPreferences
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'learningPreferences', 'account.client', 'Learning Preferences', 'Select learning preferences', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'learningPreferences', 'account.client', 'Visual learning', 'Visual learning', 0),
('option', 'learningPreferences', 'account.client', 'Auditory learning', 'Auditory learning', 1),
('option', 'learningPreferences', 'account.client', 'Hands-on practice', 'Hands-on practice', 2),
('option', 'learningPreferences', 'account.client', 'Reading/writing', 'Reading/writing', 3),
('option', 'learningPreferences', 'account.client', 'Group discussion', 'Group discussion', 4),
('option', 'learningPreferences', 'account.client', 'Flexible approach', 'Flexible approach', 5);

-- Field: specialNeeds
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'specialNeeds', 'account.client', 'Special Educational Needs', 'Select special needs (if any)', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'specialNeeds', 'account.client', 'Dyslexia', 'Dyslexia', 0),
('option', 'specialNeeds', 'account.client', 'Dyscalculia', 'Dyscalculia', 1),
('option', 'specialNeeds', 'account.client', 'ADHD', 'ADHD', 2),
('option', 'specialNeeds', 'account.client', 'Autism Spectrum', 'Autism Spectrum', 3),
('option', 'specialNeeds', 'account.client', 'Speech/Language difficulties', 'Speech/Language difficulties', 4),
('option', 'specialNeeds', 'account.client', 'Hearing impairment', 'Hearing impairment', 5),
('option', 'specialNeeds', 'account.client', 'Visual impairment', 'Visual impairment', 6),
('option', 'specialNeeds', 'account.client', 'Physical disability', 'Physical disability', 7),
('option', 'specialNeeds', 'account.client', 'Gifted and talented', 'Gifted and talented', 8),
('option', 'specialNeeds', 'account.client', 'English as Additional Language (EAL)', 'English as Additional Language (EAL)', 9),
('option', 'specialNeeds', 'account.client', 'None', 'None', 10);

-- Field: sessionsPerWeek
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionsPerWeek', 'account.client', 'Sessions Per Week', 'Select sessions per week', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionsPerWeek', 'account.client', '1', '1', 0),
('option', 'sessionsPerWeek', 'account.client', '2', '2', 1),
('option', 'sessionsPerWeek', 'account.client', '3', '3', 2),
('option', 'sessionsPerWeek', 'account.client', '4', '4', 3),
('option', 'sessionsPerWeek', 'account.client', '5+', '5+', 4);

-- Field: sessionDuration
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionDuration', 'account.client', 'Session Duration', 'Select session duration', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionDuration', 'account.client', '30 minutes', '30 minutes', 0),
('option', 'sessionDuration', 'account.client', '1 hour', '1 hour', 1),
('option', 'sessionDuration', 'account.client', '1.5 hours', '1.5 hours', 2),
('option', 'sessionDuration', 'account.client', '2 hours', '2 hours', 3);

-- Field: sessionType (Preferred Session Type)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'account.client', 'Preferred Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'account.client', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'account.client', 'Group Session', 'Group Session', 1);

-- Field: deliveryMode (Preferred Delivery Mode)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'account.client', 'Preferred Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'account.client', 'Online', 'Online', 0),
('option', 'deliveryMode', 'account.client', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'account.client', 'Hybrid', 'Hybrid', 2);
