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
  // --- THIS IS THE FIX ---
  // Add the missing property to match the database schema.
  stripe_customer_id?: string; 
  roles: ('agent' | 'seeker' | 'provider')[];
  created_at: string;
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
