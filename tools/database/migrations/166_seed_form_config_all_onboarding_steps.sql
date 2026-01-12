-- Migration: 166_seed_form_config_all_onboarding_steps.sql
-- Purpose: Seed form_config table with configurations for Personal Info, Verification, and Availability steps
-- Covers all three roles: tutor, agent, client

-- ============================================================================
-- PERSONAL INFO STEP - ALL ROLES (tutor, agent, client)
-- ============================================================================

-- Field: gender (same for all roles)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'gender', 'onboarding.tutor', 'Gender', 'Select gender', 0),
('field_meta', 'gender', 'onboarding.agent', 'Gender', 'Select gender', 0),
('field_meta', 'gender', 'onboarding.client', 'Gender', 'Select gender', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'gender', 'onboarding.tutor', 'Male', 'Male', 0),
('option', 'gender', 'onboarding.tutor', 'Female', 'Female', 1),
('option', 'gender', 'onboarding.tutor', 'Other', 'Other', 2),
('option', 'gender', 'onboarding.tutor', 'Prefer not to say', 'Prefer not to say', 3),
('option', 'gender', 'onboarding.agent', 'Male', 'Male', 0),
('option', 'gender', 'onboarding.agent', 'Female', 'Female', 1),
('option', 'gender', 'onboarding.agent', 'Other', 'Other', 2),
('option', 'gender', 'onboarding.agent', 'Prefer not to say', 'Prefer not to say', 3),
('option', 'gender', 'onboarding.client', 'Male', 'Male', 0),
('option', 'gender', 'onboarding.client', 'Female', 'Female', 1),
('option', 'gender', 'onboarding.client', 'Other', 'Other', 2),
('option', 'gender', 'onboarding.client', 'Prefer not to say', 'Prefer not to say', 3);

-- Field labels for other Personal Info fields (no options, just metadata)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'firstName', 'onboarding.tutor', 'First Name', 'Enter your first name', 0),
('field_meta', 'firstName', 'onboarding.agent', 'First Name', 'Enter your first name', 0),
('field_meta', 'firstName', 'onboarding.client', 'First Name', 'Enter your first name', 0),
('field_meta', 'lastName', 'onboarding.tutor', 'Last Name', 'Enter your last name', 0),
('field_meta', 'lastName', 'onboarding.agent', 'Last Name', 'Enter your last name', 0),
('field_meta', 'lastName', 'onboarding.client', 'Last Name', 'Enter your last name', 0),
('field_meta', 'dateOfBirth', 'onboarding.tutor', 'Date of Birth', 'Select your date of birth', 0),
('field_meta', 'dateOfBirth', 'onboarding.agent', 'Date of Birth', 'Select your date of birth', 0),
('field_meta', 'dateOfBirth', 'onboarding.client', 'Date of Birth', 'Select your date of birth', 0),
('field_meta', 'email', 'onboarding.tutor', 'Email', 'Enter your email address', 0),
('field_meta', 'email', 'onboarding.agent', 'Email', 'Enter your email address', 0),
('field_meta', 'email', 'onboarding.client', 'Email', 'Enter your email address', 0),
('field_meta', 'phone', 'onboarding.tutor', 'Phone', 'Enter your phone number', 0),
('field_meta', 'phone', 'onboarding.agent', 'Phone', 'Enter your phone number', 0),
('field_meta', 'phone', 'onboarding.client', 'Phone', 'Enter your phone number', 0);


-- ============================================================================
-- VERIFICATION STEP - ALL ROLES (tutor, agent, client)
-- ============================================================================

-- Field: proof_of_address_type (Document Type for Proof of Address)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'proof_of_address_type', 'onboarding.tutor', 'Document Type', 'Select document type', 0),
('field_meta', 'proof_of_address_type', 'onboarding.agent', 'Document Type', 'Select document type', 0),
('field_meta', 'proof_of_address_type', 'onboarding.client', 'Document Type', 'Select document type', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'proof_of_address_type', 'onboarding.tutor', 'Utility Bill', 'Utility Bill', 0),
('option', 'proof_of_address_type', 'onboarding.tutor', 'Bank Statement', 'Bank Statement', 1),
('option', 'proof_of_address_type', 'onboarding.tutor', 'Tax Bill', 'Tax Bill', 2),
('option', 'proof_of_address_type', 'onboarding.tutor', 'Solicitor Letter', 'Solicitor Letter', 3),
('option', 'proof_of_address_type', 'onboarding.agent', 'Utility Bill', 'Utility Bill', 0),
('option', 'proof_of_address_type', 'onboarding.agent', 'Bank Statement', 'Bank Statement', 1),
('option', 'proof_of_address_type', 'onboarding.agent', 'Tax Bill', 'Tax Bill', 2),
('option', 'proof_of_address_type', 'onboarding.agent', 'Solicitor Letter', 'Solicitor Letter', 3),
('option', 'proof_of_address_type', 'onboarding.client', 'Utility Bill', 'Utility Bill', 0),
('option', 'proof_of_address_type', 'onboarding.client', 'Bank Statement', 'Bank Statement', 1),
('option', 'proof_of_address_type', 'onboarding.client', 'Tax Bill', 'Tax Bill', 2),
('option', 'proof_of_address_type', 'onboarding.client', 'Solicitor Letter', 'Solicitor Letter', 3);


-- ============================================================================
-- AVAILABILITY STEP - ALL ROLES (tutor, agent, client)
-- ============================================================================

-- Field: availabilityDays (Days of Week)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'availabilityDays', 'onboarding.tutor', 'Days of Week', 'Select days', 0),
('field_meta', 'availabilityDays', 'onboarding.agent', 'Days of Week', 'Select days', 0),
('field_meta', 'availabilityDays', 'onboarding.client', 'Days of Week', 'Select days', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'availabilityDays', 'onboarding.tutor', 'Monday', 'Monday', 0),
('option', 'availabilityDays', 'onboarding.tutor', 'Tuesday', 'Tuesday', 1),
('option', 'availabilityDays', 'onboarding.tutor', 'Wednesday', 'Wednesday', 2),
('option', 'availabilityDays', 'onboarding.tutor', 'Thursday', 'Thursday', 3),
('option', 'availabilityDays', 'onboarding.tutor', 'Friday', 'Friday', 4),
('option', 'availabilityDays', 'onboarding.tutor', 'Saturday', 'Saturday', 5),
('option', 'availabilityDays', 'onboarding.tutor', 'Sunday', 'Sunday', 6),
('option', 'availabilityDays', 'onboarding.agent', 'Monday', 'Monday', 0),
('option', 'availabilityDays', 'onboarding.agent', 'Tuesday', 'Tuesday', 1),
('option', 'availabilityDays', 'onboarding.agent', 'Wednesday', 'Wednesday', 2),
('option', 'availabilityDays', 'onboarding.agent', 'Thursday', 'Thursday', 3),
('option', 'availabilityDays', 'onboarding.agent', 'Friday', 'Friday', 4),
('option', 'availabilityDays', 'onboarding.agent', 'Saturday', 'Saturday', 5),
('option', 'availabilityDays', 'onboarding.agent', 'Sunday', 'Sunday', 6),
('option', 'availabilityDays', 'onboarding.client', 'Monday', 'Monday', 0),
('option', 'availabilityDays', 'onboarding.client', 'Tuesday', 'Tuesday', 1),
('option', 'availabilityDays', 'onboarding.client', 'Wednesday', 'Wednesday', 2),
('option', 'availabilityDays', 'onboarding.client', 'Thursday', 'Thursday', 3),
('option', 'availabilityDays', 'onboarding.client', 'Friday', 'Friday', 4),
('option', 'availabilityDays', 'onboarding.client', 'Saturday', 'Saturday', 5),
('option', 'availabilityDays', 'onboarding.client', 'Sunday', 'Sunday', 6);

-- Field: availabilityTimes (Time of Day)
INSERT INTO form_config (config_type, field_name, context, field_label, field_placeholder, display_order) VALUES
('field_meta', 'availabilityTimes', 'onboarding.tutor', 'Time of Day', 'Select times', 0),
('field_meta', 'availabilityTimes', 'onboarding.agent', 'Time of Day', 'Select times', 0),
('field_meta', 'availabilityTimes', 'onboarding.client', 'Time of Day', 'Select times', 0);

INSERT INTO form_config (config_type, field_name, context, option_value, option_label, display_order) VALUES
('option', 'availabilityTimes', 'onboarding.tutor', 'morning', 'Morning (6am-12pm)', 0),
('option', 'availabilityTimes', 'onboarding.tutor', 'afternoon', 'Afternoon (12pm-5pm)', 1),
('option', 'availabilityTimes', 'onboarding.tutor', 'evening', 'Evening (5pm-10pm)', 2),
('option', 'availabilityTimes', 'onboarding.tutor', 'all_day', 'All day (6am-10pm)', 3),
('option', 'availabilityTimes', 'onboarding.agent', 'morning', 'Morning (6am-12pm)', 0),
('option', 'availabilityTimes', 'onboarding.agent', 'afternoon', 'Afternoon (12pm-5pm)', 1),
('option', 'availabilityTimes', 'onboarding.agent', 'evening', 'Evening (5pm-10pm)', 2),
('option', 'availabilityTimes', 'onboarding.agent', 'all_day', 'All day (6am-10pm)', 3),
('option', 'availabilityTimes', 'onboarding.client', 'morning', 'Morning (6am-12pm)', 0),
('option', 'availabilityTimes', 'onboarding.client', 'afternoon', 'Afternoon (12pm-5pm)', 1),
('option', 'availabilityTimes', 'onboarding.client', 'evening', 'Evening (5pm-10pm)', 2),
('option', 'availabilityTimes', 'onboarding.client', 'all_day', 'All day (6am-10pm)', 3);
