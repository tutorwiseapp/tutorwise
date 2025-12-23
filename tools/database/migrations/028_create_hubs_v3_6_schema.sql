-- Migration: Create new tables for Hubs v3.6 (Bookings, Financials, Referrals)
-- Version: 028
-- Created: 2025-11-02
-- Description: Implements SDD v3.6, Section 4.0. Creates new clean-break tables and adds referral fields.
-- This migration creates the foundation for the three new hubs: /bookings, /financials, /referrals

-- =====================================================================
-- IMPORTANT: This migration creates 3 new tables and updates profiles
-- - bookings: Session pipeline tracking
-- - transactions: Financial ledger for all users
-- - referrals: Lead generation pipeline tracking
-- - profiles: Adds referral_code and referred_by_profile_id columns
-- =====================================================================

BEGIN;

-- ==========================
-- STEP 1: Create ENUM Types
-- ==========================

-- Booking Status (B-STAT) - SDD Section 4.1.1
CREATE TYPE booking_status_enum AS ENUM (
    'Pending',      -- B-STAT-1: Awaiting tutor confirmation
    'Confirmed',    -- B-STAT-2: Tutor confirmed, session is upcoming
    'Completed',    -- B-STAT-3: Session has passed
    'Cancelled',    -- B-STAT-4: Cancelled by either party
    'Declined'      -- B-STAT-5: Tutor declined the request
);

-- Transaction Status (T-STAT) - SDD Section 4.2.2
CREATE TYPE transaction_status_enum AS ENUM (
    'Pending',      -- T-STAT-1: Awaiting completion or payout
    'Paid',         -- T-STAT-2: Funds have cleared (alias for Completed)
    'Failed',       -- T-STAT-3: Payment declined, payout failed
    'Cancelled'     -- T-STAT-4: Booking was cancelled, invalidating transaction
);

-- Transaction Type (T-TYPE) - SDD Section 4.2.1
CREATE TYPE transaction_type_enum AS ENUM (
    'Booking Payment',      -- T-TYPE-1: A client paying for a session
    'Tutoring Payout',      -- T-TYPE-2: A tutor's earnings
    'Referral Commission',  -- T-TYPE-3: Any user's earnings from a referral
    'Withdrawal',           -- T-TYPE-4: A user transferring from balance to bank
    'Platform Fee'          -- T-TYPE-5: Internal tracking (10% of booking)
);

-- Referral Status (R-STAT) - SDD Section 4.3.1
CREATE TYPE referral_status_enum AS ENUM (
    'Referred',     -- R-STAT-1: Link clicked or initiated
    'Signed Up',    -- R-STAT-2: User created an account and claimed
    'Converted',    -- R-STAT-3: User made first paid booking
    'Expired'       -- R-STAT-4: Lead expired (no signup after 30 days)
);

-- ====================================
-- STEP 2: Update existing 'profiles' table
-- ====================================
-- SDD v3.6, Section 4.0.1
ALTER TABLE public.profiles
ADD COLUMN referral_code TEXT UNIQUE, -- Code generation is handled by the handle_new_user trigger (Migration 029)
ADD COLUMN referred_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL; -- (NEW PER Q&A) The "Referrer-of-Record" for lifetime attribution

-- Add index for referred_by lookup
CREATE INDEX idx_profiles_referred_by ON public.profiles(referred_by_profile_id);

-- ================================
-- STEP 3: Create 'bookings' Table
-- ================================
-- SDD Section 4.1
CREATE TABLE public.bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    tutor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
    referrer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- (NEW PER Q&A) This is tagged on *every* booking for commission calculation

    service_name TEXT NOT NULL,
    session_start_time TIMESTAMPTZ NOT NULL,
    session_duration INT NOT NULL, -- in minutes
    amount DECIMAL(10, 2) NOT NULL,

    status booking_status_enum NOT NULL DEFAULT 'Pending',
    payment_status transaction_status_enum NOT NULL DEFAULT 'Pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_bookings_student_id ON public.bookings(student_id);
CREATE INDEX idx_bookings_tutor_id ON public.bookings(tutor_id);
CREATE INDEX idx_bookings_referrer_profile_id ON public.bookings(referrer_profile_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_payment_status ON public.bookings(payment_status);

-- =====================================
-- STEP 4: Create 'transactions' Table
-- =====================================
-- SDD Section 4.2
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- The user this transaction belongs to (NULL for platform fees)
    booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,

    type transaction_type_enum NOT NULL,
    description TEXT,
    status transaction_status_enum NOT NULL DEFAULT 'Pending',
    amount DECIMAL(10, 2) NOT NULL, -- Negative for debits, Positive for credits

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_transactions_profile_id ON public.transactions(profile_id);
CREATE INDEX idx_transactions_booking_id ON public.transactions(booking_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- ==================================
-- STEP 5: Create 'referrals' Table
-- ==================================
-- (For Lead-Gen Tracking) SDD Section 4.3
CREATE TABLE public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- The user who made the referral
    referred_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- The new user who signed up (NULL for anonymous leads)

    status referral_status_enum NOT NULL DEFAULT 'Referred',
    booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL, -- The *first* booking that triggered conversion
    transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL, -- The *first* commission payment

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    signed_up_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_profile_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_profile_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);

COMMIT;
