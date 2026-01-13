/**
 * Filename: src/app/api/admin/users/delete/route.ts
 * Purpose: API endpoint for admin user deletion (soft/hard delete)
 * Created: 2026-01-13
 *
 * Features:
 * - Soft Delete: Deactivate account + anonymize PII
 * - Hard Delete: Complete data purge (GDPR compliance)
 * - Admin action logging
 * - Prevents self-deletion and unauthorized deletions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/admin/users/delete
 * Delete or deactivate a user account
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, deletionType, reason, gdprReference } = body;

    // Validation
    if (!userId || !deletionType || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, deletionType, reason' },
        { status: 400 }
      );
    }

    if (deletionType !== 'soft' && deletionType !== 'hard') {
      return NextResponse.json({ error: 'Invalid deletion type' }, { status: 400 });
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Deletion reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (deletionType === 'hard' && !gdprReference?.trim()) {
      return NextResponse.json(
        { error: 'GDPR reference is required for hard delete' },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (adminUser.id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Fetch the user to be deleted
    const { data: userToDelete, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, active_role, is_admin, admin_role')
      .eq('id', userId)
      .single();

    if (fetchError || !userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting super admins (unless you are super admin)
    if (
      userToDelete.is_admin &&
      userToDelete.admin_role === 'Super Admin' &&
      adminProfile.admin_role !== 'Super Admin'
    ) {
      return NextResponse.json(
        { error: 'Only Super Admins can delete other Super Admins' },
        { status: 403 }
      );
    }

    // Handle deletion based on type
    if (deletionType === 'soft') {
      // Soft Delete: Deactivate + Anonymize
      const anonymizedEmail = `deleted-${userId}@anonymized.local`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: anonymizedEmail,
          full_name: 'Deleted User',
          avatar_url: null,
          status: 'deactivated',
          deleted_at: new Date().toISOString(),
          deleted_by_admin_id: adminUser.id,
          // Anonymize PII fields
          phone_number: null,
          date_of_birth: null,
          address_line_1: null,
          address_line_2: null,
          city: null,
          postcode: null,
          country: null,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error deactivating user:', updateError);
        return NextResponse.json(
          { error: 'Failed to deactivate user account' },
          { status: 500 }
        );
      }

      // Log admin action
      await supabase.from('admin_action_logs').insert({
        admin_id: adminUser.id,
        action_type: 'user_soft_delete',
        target_user_id: userId,
        details: {
          reason,
          deletedUser: {
            email: userToDelete.email,
            full_name: userToDelete.full_name,
            active_role: userToDelete.active_role,
          },
        },
        created_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          message: 'User account deactivated and anonymized successfully',
        },
        { status: 200 }
      );
    } else {
      // Hard Delete: Complete data purge (GDPR compliance only)

      // Initialize admin client with service role key
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Fetch Stripe IDs before deletion
      const { data: stripeData } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id, stripe_account_id')
        .eq('id', userId)
        .single();

      // Delete Stripe Connect Account (if exists)
      if (stripeData?.stripe_account_id) {
        try {
          console.log(`[Admin Delete] Deleting Stripe Connect account: ${stripeData.stripe_account_id}`);
          await stripe.accounts.del(stripeData.stripe_account_id);
        } catch (stripeError: any) {
          console.error('[Admin Delete] Stripe Connect deletion error:', stripeError.message);
          // Continue with deletion even if Stripe fails (account may already be deleted)
          if (stripeError.code !== 'resource_missing') {
            console.warn('[Admin Delete] Continuing despite Stripe Connect error');
          }
        }
      }

      // Delete Stripe Customer (if exists)
      if (stripeData?.stripe_customer_id) {
        try {
          console.log(`[Admin Delete] Deleting Stripe customer: ${stripeData.stripe_customer_id}`);
          await stripe.customers.del(stripeData.stripe_customer_id);
        } catch (stripeError: any) {
          console.error('[Admin Delete] Stripe customer deletion error:', stripeError.message);
          // Continue with deletion even if Stripe fails
          if (stripeError.code !== 'resource_missing') {
            console.warn('[Admin Delete] Continuing despite Stripe customer error');
          }
        }
      }

      // Log admin action BEFORE deletion (since user will be gone)
      await supabase.from('admin_action_logs').insert({
        admin_id: adminUser.id,
        action_type: 'user_hard_delete',
        target_user_id: userId,
        details: {
          reason,
          gdprReference,
          deletedUser: {
            email: userToDelete.email,
            full_name: userToDelete.full_name,
            active_role: userToDelete.active_role,
          },
          stripeData: {
            had_customer: !!stripeData?.stripe_customer_id,
            had_account: !!stripeData?.stripe_account_id,
          },
        },
        created_at: new Date().toISOString(),
      });

      // Delete from auth.users (cascade will handle profiles via FK)
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('[Admin Delete] Error deleting user from auth:', authError);
        return NextResponse.json(
          { error: `Failed to permanently delete user account: ${authError.message}` },
          { status: 500 }
        );
      }

      console.log(`[Admin Delete] Successfully deleted user: ${userId}`);

      return NextResponse.json(
        {
          success: true,
          message: 'User account permanently deleted',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
