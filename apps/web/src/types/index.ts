/*
 * Filename: src/types/index.ts
 * Purpose: To define the canonical, shared TypeScript interfaces for the entire Vinite application.
 *
 * Change History:
 * C007 - 2025-07-19 : 22:30 - Final definitive version incorporating all user feedback and best practices.
 * C006 - 2025-07-19 : 19:30 - Final version locked. Reinstated flexible Referral model.
 * C005 - 2025-07-19 : 16:55 - Enhanced the Transaction interface for robustness.
 * C004 - 2025-07-19 : 16:28 - Integrated user feedback to create final data models.
 * C003 - 2025-07-19 : 13:47 - Refactored all interfaces to use snake_case for property names.
 * C002 - 2025-07-19 : 13:02 - Formalized interfaces for User, Profile, Referral, and Transaction as per project plan.
 * C001 - [Date] : [Time] - Initial creation with basic types.
 *
 * Last Modified: 2025-07-19
 * Requirement ID: VIN-001
 *
 * Change Summary: This is the final, agreed-upon version of the data models. It establishes a single `Profile` interface as the source of truth, uses `snake_case` for all data-layer properties to align with Supabase, keeps the `Referral` model flexible for the permissionless flow, and uses a standard ledger model for `Transaction`.
 * Impact Analysis: This creates the final 'data contract' for both frontend (Epic 1) and backend (Epic 2) teams. All development will now proceed based on these interfaces.
 * Dependencies: React (for React.ReactNode type)
 */

import React from 'react';

/**
 * ==================================================================
 * Canonical Data Models for Vinite
 * This is the single source of truth for our data structures.
 * ==================================================================
 */

/**
 * The ONE canonical interface for a user's profile data.
 * It directly maps to the 'profiles' table in Supabase, using snake_case.
 */
export interface Profile {
  id: string;
  agent_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  bio?: string;
  categories?: string;
  achievements?: string;
  custom_picture_url?: string;
  cover_photo_url?: string;
  stripe_account_id?: string;
  stripe_customer_id?: string;
  roles: ('agent' | 'seeker' | 'provider')[];
  created_at: string;

  // Onboarding system fields
  preferences?: Record<string, any>;
  onboarding_progress?: OnboardingProgress;
}

export interface OnboardingProgress {
  completed_steps?: string[];
  current_step?: string;
  onboarding_completed?: boolean;
  skipped?: boolean;
  role_specific_progress?: Record<string, any>;
  last_updated?: string;
  last_auto_save?: string;
  abandoned_at?: string;
}

export interface RoleDetails {
  id: string;
  profile_id: string;
  role_type: 'seeker' | 'provider' | 'agent';
  subjects?: string[];
  skill_levels?: Record<string, number>;
  goals?: string[];

  // Provider-specific fields
  teaching_experience?: string; // Changed to string to match onboarding
  teaching_experience_years?: number;
  hourly_rate?: number;
  qualifications?: string[];
  specializations?: string[];
  teaching_style?: string;
  teaching_methods?: string[]; // Added from onboarding
  availability?: any; // Availability data from onboarding

  // Seeker-specific fields
  current_level?: string;
  target_level?: string;
  learning_style?: string;
  availability_hours?: number;
  budget_range?: string;

  // Agent-specific fields
  commission_rate?: number;
  target_categories?: string[];
  performance_metrics?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

/**
 * ==================================================================
 * Template-specific interfaces for Account > Professional Info page
 * These represent the editable template structure for each role
 * ==================================================================
 */

export interface TutorProfessionalInfo {
  // Teaching
  subjects: string[]; // e.g., ['Mathematics', 'Physics', 'Chemistry']
  levels: string[]; // e.g., ['GCSE', 'A-Level', 'KS3']
  teaching_experience: string;
  teaching_methods: string[]; // e.g., ['interactive', 'exam_focused', 'visual_learning']

  // Rates & Availability (baseline, not binding)
  hourly_rate_range?: { min: number; max: number };
  typical_availability?: any; // Flexible availability structure

  // Credentials
  qualifications: string[]; // e.g., ['BSc Mathematics - Oxford', 'PGCE']
  certifications: string[]; // e.g., ['QTS', 'DBS']
  specializations: string[]; // e.g., ['ADHD support', 'Exam prep']

  // Preferences
  max_students_per_week?: number;
  preferred_student_age_range?: { min: number; max: number };
  willing_to_travel?: boolean;
  travel_radius_km?: number;
}

export interface ClientProfessionalInfo {
  // Student/Child Info
  student_ages?: number[];
  subjects_of_interest?: string[];
  learning_goals?: string[];
  preferred_teaching_style?: string[];
  budget_range?: { min: number; max: number };

  // Preferences
  preferred_session_length?: number; // minutes
  preferred_session_frequency?: string;
  preferred_delivery_format?: ('online' | 'in_person' | 'hybrid')[];
}

export interface AgentProfessionalInfo {
  // Agency Details
  agency_name: string;
  agency_size: number;
  years_in_business: number;
  agency_description: string;

  // Services
  services_offered: string[]; // e.g., ['tutoring', 'courses', 'group_sessions']
  subject_specializations: string[];
  commission_rate?: number;

  // Coverage
  service_areas: string[]; // Geographic areas
  online_service_available: boolean;

  // Capacity
  student_capacity: number;
  tutor_network_size?: number;
}

// NOTE: This 'User' type is kept for backward compatibility with the existing mock data system.
// It will be phased out during the migration to the live backend.
export type User = Partial<Profile> & { password?: string, id: number | string };

/**
 * Represents a single referral event. It is intentionally flexible to support
 * the journey from an anonymous click to an attributed conversion.
 */
export interface Referral {
  id: number | string;
  agent_id: string;
  destination_url: string;
  status: 'Open' | 'Shared' | 'Visited' | 'Signed Up' | 'Booked' | 'Accepted' | 'Declined' | 'Paid' | 'Pending' | 'Failed';
  created_at: string;

  // These fields are progressively enriched and MUST be optional for the permissionless model
  seeker_email?: string;
  provider_id?: string;
  channel_origin?: string;
  amount?: number;
}

/**
 * Represents a single financial transaction, like a bank statement ledger.
 */
export interface Transaction {
  id: number | string;
  user_id: string;
  type: 'Commission' | 'Payout' | 'Fee' | 'Bonus' | 'Reversal';
  status: 'Paid' | 'Pending' | 'Failed';
  amount: number; // Positive for income (commission), negative for expenses (payout)
  description: string;
  currency: 'gbp' | 'usd' | 'eur';
  processor_transaction_id?: string; // Optional ID from Stripe for reconciliation
  related_referral_id?: string;
  created_at: string;
}

/**
 * ==================================================================
 * UI-Specific Types (Generic and Reusable)
 * ==================================================================
 */

/**
 * Defines the structure for a column in the reusable DataTable component.
 * Uses camelCase for props as is conventional for React components.
 */
export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T;
  responsiveClass?: 'mobile' | 'tablet' | 'desktop';
  cell?: (value: T[keyof T], row: T) => React.ReactNode;
}

/**
 * Defines the props for the reusable DataTable component.
 */
export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
}
