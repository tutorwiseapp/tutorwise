# Wiselists Remediation Plan v5.7.1

**Document Name**: WISELISTS_REMEDIATION_PLAN_v5.7.1.md
**Date**: 17 November 2025
**Status**: IMPLEMENTATION READY
**Owner**: Development Team
**Based On**: Change Request Document v5.7.1

---

## Executive Summary

This document provides a detailed implementation plan to transform Wiselists from an isolated feature into a fully integrated growth engine. The plan addresses 4 critical integration gaps and UI improvements needed to achieve the business goals of Viral Growth and Sales Attribution.

**Estimated Total Effort**: 16-20 hours
**Priority**: CRITICAL / BLOCKER
**Dependencies**: v4.3 Referral System, v4.6 Profile Graph, v4.9 Payments, v5.8 CaaS

---

## Current Status

✅ **COMPLETED**:
- Database schema (migrations 081-085)
- Basic CRUD operations
- Page routing (/wiselists, /wiselists/[id], /w/[slug])
- Sidebar widgets (Create, Stats, Share/Collaborate, Saved)
- Loading/error state handling

🔴 **MISSING** (Critical Gaps):
- Gap 1: Save Bridge - Users cannot actually save listings to wiselists
- Gap 2: Growth Engine - No referral tracking for collaborator invites
- Gap 3: Revenue Engine - No sales attribution for shared wiselists
- Gap 4: Trust Engine - No CaaS integration for credibility boost
- UI: WiselistItemCard does not match HubRowCard v1.3 specification

---

## Gap 1: The "Save" Bridge (Critical Usability)

### Problem
The "Save" heart icon on listing cards is a UI placeholder that only toggles local React state. Users cannot actually save listings to wiselists.

### Business Impact
- **User Frustration**: Users click "Save" expecting persistence but lose data on refresh
- **No Adoption**: Feature appears broken, preventing user adoption
- **Zero Collections**: No wiselist items are being created through natural browsing

### Solution Overview
Create a modal flow that allows users to select an existing wiselist or create a new one when clicking the save icon.

### Implementation Plan

#### Step 1.1: Create WiselistSelectionModal Component
**File**: `apps/web/src/app/components/wiselists/WiselistSelectionModal.tsx`

```typescript
/**
 * Filename: WiselistSelectionModal.tsx
 * Purpose: Modal to select/create wiselist when saving a listing or profile
 * Created: 2025-11-17
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyWiselists, createWiselist, addWiselistItem } from '@/lib/api/wiselists';
import { Plus, List } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './WiselistSelectionModal.module.css';

interface WiselistSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'profile' | 'listing';
  targetId: string;
  targetName: string; // For display purposes
}

export default function WiselistSelectionModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: WiselistSelectionModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWiselistName, setNewWiselistName] = useState('');
  const queryClient = useQueryClient();

  // Fetch user's wiselists
  const { data: wiselists = [], isLoading } = useQuery({
    queryKey: ['wiselists'],
    queryFn: getMyWiselists,
    enabled: isOpen,
  });

  // Create wiselist mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const wiselist = await createWiselist({ name, visibility: 'private' });
      return wiselist;
    },
    onSuccess: async (wiselist) => {
      // Add item to the newly created wiselist
      await addItemToWiselist(wiselist.id);
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
      setShowCreateForm(false);
      setNewWiselistName('');
    },
  });

  // Add to wiselist mutation
  const addItemMutation = useMutation({
    mutationFn: async (wiselistId: string) => {
      const payload: any = { wiselist_id: wiselistId };
      if (targetType === 'profile') {
        payload.profile_id = targetId;
      } else {
        payload.listing_id = targetId;
      }
      const response = await fetch(`/api/wiselists/${wiselistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add item');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success(`Saved to wiselist!`);
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save');
    },
  });

  const addItemToWiselist = async (wiselistId: string) => {
    return addItemMutation.mutateAsync(wiselistId);
  };

  const handleCreateAndSave = () => {
    if (!newWiselistName.trim()) {
      toast.error('Please enter a wiselist name');
      return;
    }
    createMutation.mutate(newWiselistName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Save to Wiselist</h2>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.content}>
          <p className={styles.subtitle}>Saving: {targetName}</p>

          {isLoading ? (
            <div className={styles.loading}>Loading your wiselists...</div>
          ) : (
            <>
              {/* Existing Wiselists */}
              {wiselists.length > 0 && (
                <div className={styles.wiselistList}>
                  {wiselists.map((wiselist: any) => (
                    <button
                      key={wiselist.id}
                      onClick={() => addItemToWiselist(wiselist.id)}
                      className={styles.wiselistButton}
                      disabled={addItemMutation.isPending}
                    >
                      <List size={18} />
                      <span>{wiselist.name}</span>
                      <span className={styles.itemCount}>({wiselist.item_count || 0})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Create New Wiselist */}
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className={styles.createButton}
                >
                  <Plus size={18} />
                  Create New Wiselist
                </button>
              ) : (
                <div className={styles.createForm}>
                  <input
                    type="text"
                    value={newWiselistName}
                    onChange={(e) => setNewWiselistName(e.target.value)}
                    placeholder="Wiselist name..."
                    className={styles.input}
                    maxLength={100}
                    autoFocus
                  />
                  <div className={styles.createActions}>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewWiselistName('');
                      }}
                      className={styles.cancelButton}
                      disabled={createMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAndSave}
                      className={styles.saveButton}
                      disabled={createMutation.isPending || !newWiselistName.trim()}
                    >
                      {createMutation.isPending ? 'Creating...' : 'Create & Save'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### Step 1.2: Create Modal Styles
**File**: `apps/web/src/app/components/wiselists/WiselistSelectionModal.module.css`

```css
/* Wiselist Selection Modal Styles */

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.closeButton {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.closeButton:hover {
  color: #1f2937;
}

.content {
  padding: 1.5rem;
  max-height: calc(80vh - 80px);
  overflow-y: auto;
}

.subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1rem 0;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.wiselistList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.wiselistButton {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
  text-align: left;
}

.wiselistButton:hover {
  background: var(--color-primary-light, #E6F0F0);
  border-color: var(--color-primary-default, #006c67);
}

.wiselistButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.itemCount {
  margin-left: auto;
  color: #6b7280;
  font-size: 0.8125rem;
}

.createButton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: var(--color-primary-default, #006c67);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
  width: 100%;
}

.createButton:hover {
  background: var(--color-primary-dark, #005550);
}

.createForm {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-default, #006c67);
  box-shadow: 0 0 0 3px rgba(0, 108, 103, 0.1);
}

.createActions {
  display: flex;
  gap: 0.5rem;
}

.cancelButton,
.saveButton {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cancelButton {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: var(--color-gray-700, #4B4B4B);
}

.cancelButton:hover {
  background: #f3f4f6;
}

.saveButton {
  background: var(--color-primary-default, #006c67);
  border: none;
  color: white;
}

.saveButton:hover:not(:disabled) {
  background: var(--color-primary-dark, #005550);
}

.saveButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

#### Step 1.3: Update Listing Cards to Use Modal
**Files to Update**:
- `apps/web/src/app/components/marketplace/ListingCard.tsx`
- `apps/web/src/app/listings/[id]/[[...slug]]/components/ListingDetailsColumn.tsx`

**Changes**: Replace the heart icon's `onClick` handler to open the modal instead of toggling local state.

**Example Implementation**:
```typescript
// Add state for modal
const [showSaveModal, setShowSaveModal] = useState(false);

// Update heart icon onClick
<button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSaveModal(true);
  }}
  className={styles.saveButton}
>
  <Heart size={20} />
</button>

// Add modal at end of component
{showSaveModal && (
  <WiselistSelectionModal
    isOpen={showSaveModal}
    onClose={() => setShowSaveModal(false)}
    targetType="listing"
    targetId={listing.id}
    targetName={listing.title}
  />
)}
```

#### Step 1.4: Update Profile Cards (Future)
Same pattern for profile cards when "Save Profile" feature is added.

### Testing Checklist
- [ ] Click save on listing card opens modal
- [ ] Modal displays existing wiselists with item counts
- [ ] Clicking wiselist saves item and closes modal
- [ ] "Create New Wiselist" form works
- [ ] Create & Save creates wiselist and adds item
- [ ] Success toast appears
- [ ] Duplicate item shows appropriate error
- [ ] Modal closes on backdrop click
- [ ] Wiselist count updates after save

### Estimated Effort
**4-5 hours**

---

## Gap 2: The Growth Engine (Referral Integration)

### Problem
When inviting a collaborator via email, the system creates a `wiselist_invitations` record but does NOT integrate with the v4.3 Referral System. This breaks the viral loop.

### Business Impact
- **Zero Referral Credit**: Inviters get no credit when invitees sign up
- **No Viral Growth**: Missing the key growth mechanism
- **Lost Revenue**: No commission for successful referrals

### Solution Overview
The collaborator invitation endpoint must call the Referral Service to generate a tracked referral link.

### Implementation Plan

#### Step 2.1: Update Collaborator API Endpoint
**File**: `apps/web/src/app/api/wiselists/[id]/collaborators/route.ts`

**Current Code** (lines ~40-80):
```typescript
// Email invitation flow (for new users)
if (email) {
  // ... validation ...

  // Create invitation
  const { data: invitation } = await supabase
    .from('wiselist_invitations')
    .insert({
      wiselist_id: params.id,
      email: email,
      role: role,
      invited_by_profile_id: user.id,
      status: 'pending',
      // MISSING: referral_code
    })
    .select()
    .single();

  // TODO: Send email with invitation link
  // MISSING: Integration with v4.3 Referral System
}
```

**Updated Code**:
```typescript
// Email invitation flow (for new users)
if (email) {
  // ... validation ...

  // ===== NEW: Generate referral code via v4.3 Referral System =====
  const referralResponse = await fetch('/api/referrals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      referrer_profile_id: user.id,
      referral_type: 'wiselist_collaboration', // Track source
    }),
  });

  if (!referralResponse.ok) {
    throw new Error('Failed to generate referral code');
  }

  const { referral_code } = await referralResponse.json();
  // ===== END NEW =====

  // Create invitation with referral code
  const { data: invitation, error: inviteError } = await supabase
    .from('wiselist_invitations')
    .insert({
      wiselist_id: params.id,
      email: email,
      role: role,
      invited_by_profile_id: user.id,
      referral_code: referral_code, // NEW: Track referral
      status: 'pending',
    })
    .select()
    .single();

  if (inviteError) throw inviteError;

  // ===== NEW: Generate invitation link with referral tracking =====
  const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/a/${referral_code}?invite=${invitation.invite_token}&wiselist=${params.id}`;
  // ===== END NEW =====

  // TODO: Send email with inviteLink
  // For now, return the link for manual sharing
  return NextResponse.json({
    message: 'Invitation created',
    invitation,
    inviteLink, // Return for email sending service
  });
}
```

#### Step 2.2: Create Email Invitation Template (Future Enhancement)
**File**: `apps/web/src/lib/email/templates/wiselist-invitation.ts`

```typescript
export function wiselistInvitationEmail(data: {
  inviterName: string;
  wiselistName: string;
  inviteLink: string;
  recipientEmail: string;
}) {
  return {
    to: data.recipientEmail,
    subject: `${data.inviterName} invited you to collaborate on "${data.wiselistName}"`,
    html: `
      <h2>You've been invited to collaborate!</h2>
      <p>${data.inviterName} has invited you to join their wiselist: <strong>${data.wiselistName}</strong></p>
      <p>Click the link below to accept:</p>
      <a href="${data.inviteLink}">Accept Invitation</a>
      <p>If you don't have an account yet, you'll be able to create one after clicking the link.</p>
    `,
  };
}
```

#### Step 2.3: Update Signup Flow to Handle Invite Tokens
**File**: `apps/web/src/middleware.ts` or signup callback

**Logic**:
1. Check for `invite` token in URL query params
2. After successful signup, fetch invitation details
3. Auto-add user as collaborator
4. Mark invitation as `accepted`
5. Show success message

```typescript
// In signup callback or middleware
const inviteToken = searchParams.get('invite');
const wiselistId = searchParams.get('wiselist');

if (inviteToken && wiselistId) {
  // Fetch invitation
  const { data: invitation } = await supabase
    .from('wiselist_invitations')
    .select('*')
    .eq('invite_token', inviteToken)
    .eq('wiselist_id', wiselistId)
    .single();

  if (invitation && invitation.status === 'pending') {
    // Add as collaborator
    await supabase
      .from('wiselist_collaborators')
      .insert({
        wiselist_id: wiselistId,
        profile_id: newUser.id,
        role: invitation.role,
        invited_by_profile_id: invitation.invited_by_profile_id,
      });

    // Mark invitation as accepted
    await supabase
      .from('wiselist_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    // Redirect to wiselist
    return redirect(`/wiselists/${wiselistId}?welcome=true`);
  }
}
```

### Testing Checklist
- [ ] Invite by email generates referral code
- [ ] Invitation record includes referral_code
- [ ] Invite link format: `/a/{code}?invite={token}&wiselist={id}`
- [ ] New user signup via link creates account
- [ ] User auto-added as collaborator after signup
- [ ] Invitation status changes to "accepted"
- [ ] Inviter gets referral credit (check v4.3 referrals table)
- [ ] Commission attribution works if invitee makes purchase

### Estimated Effort
**5-6 hours** (including email integration if implemented)

---

## Gap 3: The Revenue Engine (Sales Attribution)

### Problem
Public wiselist links (`/w/[slug]`) render correctly but do NOT track the referrer. When a visitor books a session, the wiselist owner gets zero credit.

### Business Impact
- **Zero Commission**: Tutors sharing wiselists earn nothing from referred sales
- **No Incentive**: Why would tutors share lists if there's no payoff?
- **Missing Revenue Stream**: Platform loses viral marketing channel

### Solution Overview
Implement a cookie-based attribution system that tracks the wiselist owner when someone visits `/w/[slug]` and carries through to booking checkout.

### Implementation Plan

#### Step 3.1: Update Middleware for Wiselist Attribution
**File**: `apps/web/src/middleware.ts`

**Add this logic** to the existing middleware:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // ===== NEW: Wiselist Referrer Attribution =====
  const pathname = request.nextUrl.pathname;

  // Check if this is a public wiselist page
  if (pathname.startsWith('/w/')) {
    const slug = pathname.split('/w/')[1];

    if (slug) {
      // Fetch wiselist owner
      const { data: wiselist } = await supabase
        .from('wiselists')
        .select('profile_id')
        .eq('slug', slug)
        .eq('visibility', 'public')
        .single();

      if (wiselist && wiselist.profile_id) {
        // Set cookie to track referrer (30 days)
        response.cookies.set('wiselist_referrer_id', wiselist.profile_id, {
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
          sameSite: 'lax',
        });
      }
    }
  }
  // ===== END NEW =====

  // ... existing middleware logic ...

  return response;
}
```

#### Step 3.2: Update Stripe Checkout to Include Referrer
**File**: `apps/web/src/app/api/stripe/create-booking-checkout/route.ts`

**Current Code** (around line 40-60):
```typescript
const session = await stripe.checkout.sessions.create({
  // ... existing config ...
  metadata: {
    booking_id: bookingId,
    // MISSING: wiselist_referrer_id
  },
});
```

**Updated Code**:
```typescript
// ===== NEW: Read wiselist referrer from cookie =====
const wiselistReferrerId = request.cookies.get('wiselist_referrer_id')?.value;
// ===== END NEW =====

const session = await stripe.checkout.sessions.create({
  // ... existing config ...
  metadata: {
    booking_id: bookingId,
    wiselist_referrer_id: wiselistReferrerId || null, // NEW: Include referrer
  },
});
```

#### Step 3.3: Update Stripe Webhook to Save Referrer
**File**: `apps/web/src/app/api/webhooks/stripe/route.ts`

**Current Code** (in `checkout.session.completed` handler):
```typescript
const bookingId = session.metadata.booking_id;

// Update booking payment status
await supabase
  .from('bookings')
  .update({
    payment_status: 'Paid',
    stripe_session_id: session.id,
  })
  .eq('id', bookingId);
```

**Updated Code**:
```typescript
const bookingId = session.metadata.booking_id;
const wiselistReferrerId = session.metadata.wiselist_referrer_id; // NEW

// Update booking payment status AND referrer
await supabase
  .from('bookings')
  .update({
    payment_status: 'Paid',
    stripe_session_id: session.id,
    booking_referrer_id: wiselistReferrerId || null, // NEW: Attribution!
  })
  .eq('id', bookingId);
```

#### Step 3.4: Update Commission Calculation (v4.9 Integration)
**File**: Database function or commission calculation service

**Note**: This depends on your v4.9 Payments implementation. Ensure the commission RPC or service checks for `booking_referrer_id` and calculates the wiselist owner's 10% commission.

**Pseudo-code**:
```sql
-- In calculate_commissions() function
IF booking.booking_referrer_id IS NOT NULL THEN
  -- Create commission for wiselist referrer (10%)
  INSERT INTO transactions (
    profile_id,
    booking_id,
    type,
    amount,
    status
  ) VALUES (
    booking.booking_referrer_id,
    booking.id,
    'Referral Commission',
    booking.amount * 0.10,
    'Pending'
  );
END IF;
```

### Testing Checklist
- [ ] Visit `/w/test-slug` sets cookie `wiselist_referrer_id`
- [ ] Cookie persists for 30 days
- [ ] Cookie is read during checkout
- [ ] Stripe session metadata includes `wiselist_referrer_id`
- [ ] Webhook saves `booking_referrer_id` to bookings table
- [ ] Commission calculation includes wiselist referrer payout
- [ ] Test with multiple browsers/incognito to verify attribution

### Estimated Effort
**4-5 hours**

---

## Gap 4: The Trust Engine (CaaS Integration)

### Problem
When a user saves a tutor to a wiselist, the CaaS (Credibility as a Service) system is not notified. "Total Saves" should be a high-signal trust metric that boosts search ranking.

### Business Impact
- **Missed Credibility Signal**: Popular tutors don't get ranking boost
- **Search Quality**: Search results don't reflect user preference
- **Competitive Disadvantage**: Tutors who are frequently saved don't rise to top

### Solution Overview
Create a database trigger on `wiselist_items` that adds the tutor's profile to the `caas_recalculation_queue` whenever they are saved.

### Implementation Plan

#### Step 4.1: Create Database Trigger Migration
**File**: `apps/api/migrations/089_wiselist_caas_trigger.sql`

```sql
-- Migration 089: Add CaaS recalculation trigger for wiselist items
-- Purpose: When a profile is saved to a wiselist, queue for credibility recalculation
-- Created: 2025-11-17

-- Function to queue profile for CaaS recalculation
CREATE OR REPLACE FUNCTION queue_profile_for_caas_on_wiselist_save()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if a profile was saved (not a listing)
  IF NEW.profile_id IS NOT NULL THEN
    -- Add to recalculation queue if not already present
    INSERT INTO caas_recalculation_queue (profile_id, reason, priority)
    VALUES (NEW.profile_id, 'wiselist_save', 'normal')
    ON CONFLICT (profile_id)
    DO UPDATE SET
      updated_at = NOW(),
      reason = 'wiselist_save';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_wiselist_save_caas
AFTER INSERT ON wiselist_items
FOR EACH ROW
EXECUTE FUNCTION queue_profile_for_caas_on_wiselist_save();

-- Also trigger on DELETE (popularity decrease)
CREATE OR REPLACE FUNCTION queue_profile_for_caas_on_wiselist_remove()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.profile_id IS NOT NULL THEN
    INSERT INTO caas_recalculation_queue (profile_id, reason, priority)
    VALUES (OLD.profile_id, 'wiselist_remove', 'normal')
    ON CONFLICT (profile_id)
    DO UPDATE SET
      updated_at = NOW(),
      reason = 'wiselist_remove';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wiselist_remove_caas
AFTER DELETE ON wiselist_items
FOR EACH ROW
EXECUTE FUNCTION queue_profile_for_caas_on_wiselist_remove();
```

#### Step 4.2: Update CaaS Worker to Process Wiselist Saves
**File**: CaaS worker/service (location TBD based on your v5.8 implementation)

**Add this metric to the credibility calculation**:

```typescript
// Calculate total saves count
const { count: totalSaves } = await supabase
  .from('wiselist_items')
  .select('*', { count: 'exact', head: true })
  .eq('profile_id', profileId);

// Add to credibility score
const saveScore = Math.min(totalSaves * 2, 50); // Cap at 50 points, 2 points per save

credibilityScore += saveScore;
```

#### Step 4.3: Run Migration
```bash
# Execute migration
psql $DATABASE_URL -f apps/api/migrations/089_wiselist_caas_trigger.sql
```

#### Step 4.4: Add "Total Saves" to Profile Display (Optional Enhancement)
**File**: Profile page component

```typescript
// Fetch save count
const { count: saveCount } = await supabase
  .from('wiselist_items')
  .select('*', { count: 'exact', head: true })
  .eq('profile_id', profileId);

// Display in UI
<div className={styles.stat}>
  <Heart size={16} />
  <span>{saveCount} Saves</span>
</div>
```

### Testing Checklist
- [ ] Migration executes without errors
- [ ] Save profile to wiselist triggers queue insertion
- [ ] Check `caas_recalculation_queue` table for new entry
- [ ] Remove profile from wiselist also triggers queue
- [ ] CaaS worker processes queue entry
- [ ] Credibility score increases for saved profiles
- [ ] Search ranking reflects save count (if search uses CaaS)
- [ ] "Total Saves" displays on profile (if implemented)

### Estimated Effort
**3-4 hours**

---

## UI Update: WiselistItemCard to HubRowCard v1.3

### Problem
Current WiselistItemCard does not match the HubRowCard v1.3 specification from the design system. Missing:
- Badge (Active status)
- Proper horizontal row layout
- Context row with added date and note
- View button alongside Remove button

### Solution Overview
Redesign WiselistItemCard component to match the specification provided in the Change Request.

### Implementation Plan

#### Step 5.1: Update WiselistItemCard Component
**File**: `apps/web/src/app/components/wiselists/WiselistItemCard.tsx`

**Target Layout**:
```
+----------------+-------------------------------------------------------+
| [ Item Image ] |  A-Level Maths Tutoring             [Badge: Active]   |
| [  (Profile  ] |  Comprehensive coverage of pure maths and mechanics.  |
| [  or Listing)]|  Maths  •  £30/hr  •  Online                          |
|                |  Added by Jane • 12 Aug • "Great availability"        |
|                |  ---------------------------------------------------  |
|                |                                   [ Remove ]  [ View ]|
+----------------+-------------------------------------------------------+
```

**New Component Structure**:
```typescript
/**
 * Filename: WiselistItemCard.tsx
 * Purpose: Display wiselist item in HubRowCard v1.3 format
 * Updated: 2025-11-17 - Redesigned to match design system spec
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { WiselistItem } from '@/types';
import { X, ExternalLink } from 'lucide-react';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './WiselistItemCard.module.css';

interface WiselistItemCardProps {
  item: WiselistItem;
  onRemove?: (itemId: string) => void;
  canEdit?: boolean;
}

export default function WiselistItemCard({
  item,
  onRemove,
  canEdit = false,
}: WiselistItemCardProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Remove this item from the wiselist?')) {
      onRemove?.(item.id);
    }
  };

  // Format date
  const addedDate = new Date(item.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  // Render profile item
  if (item.profile) {
    const profile = item.profile;
    const avatarUrl = getProfileImageUrl(profile);
    const href = `/public-profile/${profile.id}`;
    const isActive = true; // TODO: Add active status to profile

    return (
      <div className={styles.card}>
        {/* Row Layout */}
        <div className={styles.imageSection}>
          <Image
            src={avatarUrl}
            alt={profile.full_name || 'Profile'}
            width={120}
            height={120}
            className={styles.image}
          />
        </div>

        <div className={styles.content}>
          {/* Row 1: Title + Badge */}
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{profile.full_name || 'Unknown'}</h3>
            {isActive && <span className={styles.badgeActive}>Active</span>}
          </div>

          {/* Row 2: Description */}
          {profile.bio && (
            <p className={styles.description}>{profile.bio}</p>
          )}

          {/* Row 3: Tags/Metadata */}
          <div className={styles.tagsRow}>
            {profile.city && <span className={styles.tag}>{profile.city}</span>}
          </div>

          {/* Row 4: Context (Added by, date, note) */}
          <div className={styles.contextRow}>
            <span className={styles.contextText}>
              Added by {item.added_by?.full_name || 'Unknown'}
            </span>
            <span className={styles.contextSeparator}>•</span>
            <span className={styles.contextText}>{addedDate}</span>
            {item.notes && (
              <>
                <span className={styles.contextSeparator}>•</span>
                <span className={styles.contextNote}>"{item.notes}"</span>
              </>
            )}
          </div>

          {/* Row 5: Actions */}
          <div className={styles.actionsRow}>
            <Link href={href} className={styles.viewButton}>
              <ExternalLink size={16} />
              View
            </Link>
            {canEdit && onRemove && (
              <button onClick={handleRemove} className={styles.removeButton}>
                <X size={16} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render listing item
  if (item.listing) {
    const listing = item.listing;
    const href = `/listings/${listing.id}`;
    const isActive = true; // TODO: Check if listing is active

    return (
      <div className={styles.card}>
        <div className={styles.content}>
          {/* Row 1: Title + Badge */}
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{listing.title}</h3>
            {isActive && <span className={styles.badgeActive}>Active</span>}
          </div>

          {/* Row 2: Description */}
          {listing.description && (
            <p className={styles.description}>{listing.description}</p>
          )}

          {/* Row 3: Tags/Metadata */}
          <div className={styles.tagsRow}>
            {listing.subjects?.[0] && (
              <span className={styles.tag}>{listing.subjects[0]}</span>
            )}
            {listing.hourly_rate && (
              <span className={styles.tag}>£{listing.hourly_rate}/hr</span>
            )}
            {listing.location_type && (
              <span className={styles.tag}>{listing.location_type}</span>
            )}
          </div>

          {/* Row 4: Context */}
          <div className={styles.contextRow}>
            <span className={styles.contextText}>
              Added by {item.added_by?.full_name || 'Unknown'}
            </span>
            <span className={styles.contextSeparator}>•</span>
            <span className={styles.contextText}>{addedDate}</span>
            {item.notes && (
              <>
                <span className={styles.contextSeparator}>•</span>
                <span className={styles.contextNote}>"{item.notes}"</span>
              </>
            )}
          </div>

          {/* Row 5: Actions */}
          <div className={styles.actionsRow}>
            <Link href={href} className={styles.viewButton}>
              <ExternalLink size={16} />
              View
            </Link>
            {canEdit && onRemove && (
              <button onClick={handleRemove} className={styles.removeButton}>
                <X size={16} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

#### Step 5.2: Update Styles to Match Specification
**File**: `apps/web/src/app/components/wiselists/WiselistItemCard.module.css`

```css
/* HubRowCard v1.3 Specification */

.card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: all 0.15s ease;
}

.card:hover {
  border-color: #d1d5db;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

/* Image Section */
.imageSection {
  flex-shrink: 0;
}

.image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 0.375rem;
}

/* Content Section */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

/* Row 1: Title + Badge */
.titleRow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex: 1;
}

.badgeActive {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  background-color: #d1fae5;
  color: #065f46;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

/* Row 2: Description */
.description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Row 3: Tags */
.tagsRow {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  font-size: 0.8125rem;
  color: #4b5563;
}

.tag:not(:last-child)::after {
  content: '•';
  margin-left: 0.5rem;
  color: #d1d5db;
}

/* Row 4: Context */
.contextRow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #6b7280;
  padding-top: 0.5rem;
  border-top: 1px solid #f3f4f6;
}

.contextText {
  color: #6b7280;
}

.contextSeparator {
  color: #d1d5db;
}

.contextNote {
  color: #4b5563;
  font-style: italic;
}

/* Row 5: Actions */
.actionsRow {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
}

.viewButton,
.removeButton {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}

.viewButton {
  background: var(--color-primary-default, #006c67);
  color: white;
  border: none;
}

.viewButton:hover {
  background: var(--color-primary-dark, #005550);
}

.removeButton {
  background: #f9fafb;
  color: var(--color-gray-700, #4B4B4B);
  border: 1px solid #e5e7eb;
}

.removeButton:hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #991b1b;
}

/* Responsive */
@media (max-width: 640px) {
  .card {
    flex-direction: column;
  }

  .imageSection {
    width: 100%;
  }

  .image {
    width: 100%;
    height: 200px;
  }
}
```

### Testing Checklist
- [ ] Card displays in horizontal row layout
- [ ] Profile image shows on left (120x120px)
- [ ] Title and Active badge display correctly
- [ ] Description truncates at 2 lines
- [ ] Tags row shows metadata separated by bullets
- [ ] Context row shows "Added by X • Date • Note"
- [ ] View and Remove buttons display correctly
- [ ] Remove button shows confirmation dialog
- [ ] View button navigates to profile/listing
- [ ] Mobile responsive (stacks vertically)

### Estimated Effort
**3-4 hours**

---

## Implementation Timeline

### Week 1: Critical User-Facing Features
- **Day 1-2**: Gap 1 - Save Bridge (4-5 hours)
- **Day 3**: Gap 3 - Revenue Engine (4-5 hours)
- **Total**: 8-10 hours

### Week 2: Growth & Backend Integration
- **Day 1-2**: Gap 2 - Growth Engine (5-6 hours)
- **Day 3**: Gap 4 - Trust Engine (3-4 hours)
- **Day 4**: UI Update - HubRowCard v1.3 (3-4 hours)
- **Total**: 11-14 hours

### Week 3: Testing & Refinement
- Integration testing
- Bug fixes
- Performance optimization
- Documentation updates

---

## Success Metrics

After implementation, track these KPIs to measure success:

### Adoption Metrics
- **Save Rate**: % of listing views that result in saves
- **Wiselists Created**: Weekly count of new wiselists
- **Items per Wiselist**: Average size of collections

### Growth Metrics
- **Collaboration Rate**: % of wiselists with >1 collaborator
- **Referral Signups**: New users from wiselist invitations
- **Share Rate**: % of wiselists made public

### Revenue Metrics
- **Attribution Rate**: % of bookings with `booking_referrer_id`
- **Referral Revenue**: Total booking value from wiselist referrals
- **Commission Payouts**: Total paid to wiselist owners

### Engagement Metrics
- **Return Visits**: Users returning to `/w/[slug]` pages
- **Click-Through**: % of wiselist views that result in profile/listing clicks
- **Conversion**: % of wiselist views that result in bookings

---

## Risk Mitigation

### Technical Risks
1. **Cookie Tracking Failure**
   - Mitigation: Add server-side session fallback
   - Test across browsers and privacy modes

2. **Race Conditions in Triggers**
   - Mitigation: Use proper transaction isolation
   - Test concurrent saves

3. **Email Delivery Issues**
   - Mitigation: Use reliable email service (SendGrid, Resend)
   - Implement retry logic

### Business Risks
1. **Low Adoption**
   - Mitigation: Add prominent save CTAs
   - Educate users via tooltips/tours

2. **Spam/Abuse**
   - Mitigation: Rate limit saves
   - Implement reporting system

3. **Commission Disputes**
   - Mitigation: Clear attribution rules
   - Detailed audit logs

---

## Rollout Plan

### Phase 1: Soft Launch (Internal Testing)
- Deploy to staging environment
- Test with internal users
- Validate all 4 gaps are working
- Fix critical bugs

### Phase 2: Beta (Limited Users)
- Enable for 10-20 power users
- Monitor metrics closely
- Gather feedback
- Iterate on UX

### Phase 3: General Availability
- Full production rollout
- Marketing campaign
- User education content
- Monitor support tickets

---

## Documentation Updates Needed

1. **User Guide**: How to save listings and create wiselists
2. **API Documentation**: New endpoints and parameters
3. **Database Schema**: Updated ERD with triggers
4. **Commission Policy**: Attribution rules and payout timelines

---

## Appendix: File Checklist

### New Files to Create
- [ ] `apps/web/src/app/components/wiselists/WiselistSelectionModal.tsx`
- [ ] `apps/web/src/app/components/wiselists/WiselistSelectionModal.module.css`
- [ ] `apps/api/migrations/089_wiselist_caas_trigger.sql`
- [ ] `apps/web/src/lib/email/templates/wiselist-invitation.ts` (optional)

### Files to Modify
- [ ] `apps/web/src/middleware.ts`
- [ ] `apps/web/src/app/api/wiselists/[id]/collaborators/route.ts`
- [ ] `apps/web/src/app/api/stripe/create-booking-checkout/route.ts`
- [ ] `apps/web/src/app/api/webhooks/stripe/route.ts`
- [ ] `apps/web/src/app/components/marketplace/ListingCard.tsx`
- [ ] `apps/web/src/app/listings/[id]/[[...slug]]/components/ListingDetailsColumn.tsx`
- [ ] `apps/web/src/app/components/wiselists/WiselistItemCard.tsx`
- [ ] `apps/web/src/app/components/wiselists/WiselistItemCard.module.css`
- [ ] CaaS worker/service (v5.8 integration)

### Database Changes
- [ ] Execute migration 089 (CaaS trigger)
- [ ] Verify `booking_referrer_id` column exists (migration 084)
- [ ] Verify `referral_code` column in `wiselist_invitations` (migration 085)

---

## Questions for Product Team

1. **Commission Split**: Confirm 10% for wiselist referrer is acceptable
2. **Attribution Window**: Is 30 days the right cookie duration?
3. **Email Service**: Which provider should we integrate? (SendGrid, Resend, etc.)
4. **Active Badge**: What defines "Active" status for profiles/listings?
5. **Spam Prevention**: Should we rate-limit saves per user/day?

---

## Conclusion

This remediation plan transforms Wiselists from an isolated feature into a fully integrated growth engine that drives:
- **User Adoption** via seamless save functionality
- **Viral Growth** via referral-tracked collaborator invites
- **Revenue** via commission attribution for shared wiselists
- **Trust** via CaaS integration boosting popular tutors

**Total Estimated Effort**: 16-20 hours
**Expected ROI**: High - enables viral marketing and creates new revenue stream
**Recommendation**: Prioritize implementation ASAP as a critical business enabler

---

**Document Version**: 1.0
**Last Updated**: 17 November 2025
**Author**: Development Team
**Status**: Ready for Implementation
