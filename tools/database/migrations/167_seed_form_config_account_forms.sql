-- Migration: 167_seed_form_config_account_forms.sql
-- Purpose: Seed form_config table with configurations for Account forms
-- Covers PersonalInfoForm and ProfessionalInfoForm

-- ============================================================================
-- PERSONAL INFO FORM (ACCOUNT) - Shared across all users
-- ============================================================================

-- Field: gender
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'gender', 'account', 'Gender', 'Select gender', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'gender', 'account', 'Male', 'Male', 0),
('option', 'gender', 'account', 'Female', 'Female', 1),
('option', 'gender', 'account', 'Other', 'Other', 2),
('option', 'gender', 'account', 'Prefer not to say', 'Prefer not to say', 3);


-- ============================================================================
-- PROFESSIONAL INFO FORM (ACCOUNT) - Shared across all users
-- ============================================================================

-- Field: status
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'status', 'account', 'Status', 'Select status', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'status', 'account', 'Professional Tutor', 'Professional Tutor', 0),
('option', 'status', 'account', 'Solo Tutor', 'Solo Tutor', 1),
('option', 'status', 'account', 'Part-time Tutor', 'Part-time Tutor', 2);

-- Field: academicQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'academicQualifications', 'account', 'Academic Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'academicQualifications', 'account', 'University Degree', 'University Degree', 0),
('option', 'academicQualifications', 'account', 'Master''s Degree', 'Master''s Degree', 1),
('option', 'academicQualifications', 'account', 'PhD', 'PhD', 2),
('option', 'academicQualifications', 'account', 'Professional Certificate', 'Professional Certificate', 3);

-- Field: keyStages
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'keyStages', 'account', 'Key Stages', 'Select key stages', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'keyStages', 'account', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'keyStages', 'account', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'keyStages', 'account', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'keyStages', 'account', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3);

-- Field: teachingProfessionalQualifications
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingProfessionalQualifications', 'account', 'Teaching Professional Qualifications', 'Select qualifications', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingProfessionalQualifications', 'account', 'QTLS, QTS', 'QTLS, QTS', 0),
('option', 'teachingProfessionalQualifications', 'account', 'PGCE', 'PGCE', 1),
('option', 'teachingProfessionalQualifications', 'account', 'Teaching License', 'Teaching License', 2),
('option', 'teachingProfessionalQualifications', 'account', 'None', 'None', 3);

-- Field: subjects
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'subjects', 'account', 'Subjects', 'Select subjects', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'subjects', 'account', 'Mathematics', 'Mathematics', 0),
('option', 'subjects', 'account', 'English', 'English', 1),
('option', 'subjects', 'account', 'Science', 'Science', 2),
('option', 'subjects', 'account', 'Physics', 'Physics', 3),
('option', 'subjects', 'account', 'Chemistry', 'Chemistry', 4),
('option', 'subjects', 'account', 'Biology', 'Biology', 5),
('option', 'subjects', 'account', 'History', 'History', 6),
('option', 'subjects', 'account', 'Geography', 'Geography', 7),
('option', 'subjects', 'account', 'Languages', 'Languages', 8),
('option', 'subjects', 'account', 'Mathematics, English', 'Mathematics, English', 9);

-- Field: teachingExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'teachingExperience', 'account', 'Teaching Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'teachingExperience', 'account', 'New Teacher (0-3 years)', 'New Teacher (0-3 years)', 0),
('option', 'teachingExperience', 'account', 'Experienced Teacher (4-7 years)', 'Experienced Teacher (4-7 years)', 1),
('option', 'teachingExperience', 'account', 'Senior Teacher (8+ years)', 'Senior Teacher (8+ years)', 2);

-- Field: sessionType
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionType', 'account', 'Session Type', 'Select session types', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionType', 'account', 'One-to-One Session', 'One-to-One Session', 0),
('option', 'sessionType', 'account', 'Group Session', 'Group Session', 1),
('option', 'sessionType', 'account', 'One-to-One Session, Group Session', 'One-to-One Session, Group Session', 2);

-- Field: tutoringExperience
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'tutoringExperience', 'account', 'Tutoring Experience', 'Select experience', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'tutoringExperience', 'account', 'New Tutor (0-2 years)', 'New Tutor (0-2 years)', 0),
('option', 'tutoringExperience', 'account', 'Experienced Tutor (3-5 years)', 'Experienced Tutor (3-5 years)', 1),
('option', 'tutoringExperience', 'account', 'Expert Tutor (5+ years)', 'Expert Tutor (5+ years)', 2);

-- Field: deliveryMode
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'deliveryMode', 'account', 'Delivery Mode', 'Select delivery modes', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'deliveryMode', 'account', 'Online', 'Online', 0),
('option', 'deliveryMode', 'account', 'In-person', 'In-person', 1),
('option', 'deliveryMode', 'account', 'Hybrid', 'Hybrid', 2),
('option', 'deliveryMode', 'account', 'In-person, Online, Hybrid', 'In-person, Online, Hybrid', 3);

-- Field: educationLevel (Client-specific)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'educationLevel', 'account', 'Education Level', 'Select education level', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'educationLevel', 'account', 'Primary Education (KS1-KS2) - Age 5 to 11', 'Primary Education (KS1-KS2) - Age 5 to 11', 0),
('option', 'educationLevel', 'account', 'Secondary Education (KS3) - Age 11 to 14', 'Secondary Education (KS3) - Age 11 to 14', 1),
('option', 'educationLevel', 'account', 'Secondary Education (KS4) - Age 14 to 16', 'Secondary Education (KS4) - Age 14 to 16', 2),
('option', 'educationLevel', 'account', 'A-Levels - Age 16 to 18', 'A-Levels - Age 16 to 18', 3),
('option', 'educationLevel', 'account', 'University', 'University', 4),
('option', 'educationLevel', 'account', 'Adult Education', 'Adult Education', 5);

-- Field: learningGoals (Client-specific)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'learningGoals', 'account', 'Learning Goals', 'Select learning goals', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'learningGoals', 'account', 'Improve grades', 'Improve grades', 0),
('option', 'learningGoals', 'account', 'Exam preparation', 'Exam preparation', 1),
('option', 'learningGoals', 'account', 'Catch up on missed work', 'Catch up on missed work', 2),
('option', 'learningGoals', 'account', 'Advance ahead of class', 'Advance ahead of class', 3),
('option', 'learningGoals', 'account', 'Build confidence', 'Build confidence', 4),
('option', 'learningGoals', 'account', 'Learn new skill', 'Learn new skill', 5),
('option', 'learningGoals', 'account', 'Personal development', 'Personal development', 6);

-- Field: learningPreferences (Client-specific)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'learningPreferences', 'account', 'Learning Preferences', 'Select learning preferences', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'learningPreferences', 'account', 'Visual learning', 'Visual learning', 0),
('option', 'learningPreferences', 'account', 'Auditory learning', 'Auditory learning', 1),
('option', 'learningPreferences', 'account', 'Hands-on practice', 'Hands-on practice', 2),
('option', 'learningPreferences', 'account', 'Reading/writing', 'Reading/writing', 3),
('option', 'learningPreferences', 'account', 'Group discussion', 'Group discussion', 4),
('option', 'learningPreferences', 'account', 'Flexible approach', 'Flexible approach', 5);

-- Field: specialNeeds (Client-specific)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'specialNeeds', 'account', 'Special Educational Needs', 'Select special needs (if any)', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'specialNeeds', 'account', 'Dyslexia', 'Dyslexia', 0),
('option', 'specialNeeds', 'account', 'Dyscalculia', 'Dyscalculia', 1),
('option', 'specialNeeds', 'account', 'ADHD', 'ADHD', 2),
('option', 'specialNeeds', 'account', 'Autism Spectrum', 'Autism Spectrum', 3),
('option', 'specialNeeds', 'account', 'Speech/Language difficulties', 'Speech/Language difficulties', 4),
('option', 'specialNeeds', 'account', 'Hearing impairment', 'Hearing impairment', 5),
('option', 'specialNeeds', 'account', 'Visual impairment', 'Visual impairment', 6),
('option', 'specialNeeds', 'account', 'Physical disability', 'Physical disability', 7),
('option', 'specialNeeds', 'account', 'Gifted and talented', 'Gifted and talented', 8),
('option', 'specialNeeds', 'account', 'English as Additional Language (EAL)', 'English as Additional Language (EAL)', 9),
('option', 'specialNeeds', 'account', 'None', 'None', 10);

-- Field: sessionsPerWeek (Client-specific)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionsPerWeek', 'account', 'Sessions Per Week', 'Select sessions per week', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionsPerWeek', 'account', '1', '1', 0),
('option', 'sessionsPerWeek', 'account', '2', '2', 1),
('option', 'sessionsPerWeek', 'account', '3', '3', 2),
('option', 'sessionsPerWeek', 'account', '4', '4', 3),
('option', 'sessionsPerWeek', 'account', '5+', '5+', 4);

-- Field: sessionDuration (Client-specific)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'sessionDuration', 'account', 'Session Duration', 'Select session duration', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'sessionDuration', 'account', '30 minutes', '30 minutes', 0),
('option', 'sessionDuration', 'account', '1 hour', '1 hour', 1),
('option', 'sessionDuration', 'account', '1.5 hours', '1.5 hours', 2),
('option', 'sessionDuration', 'account', '2 hours', '2 hours', 3);

-- Field: proofOfAddressType (for verification section in account forms)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'proofOfAddressType', 'account', 'Document Type', 'Select document type', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'proofOfAddressType', 'account', 'Utility Bill', 'Utility Bill', 0),
('option', 'proofOfAddressType', 'account', 'Bank Statement', 'Bank Statement', 1),
('option', 'proofOfAddressType', 'account', 'Tax Bill', 'Tax Bill', 2),
('option', 'proofOfAddressType', 'account', 'Solicitor Letter', 'Solicitor Letter', 3);
