# Network & Connections Solution Proposal v4.5
**Enhanced LinkedIn-Lite Professional Networking with Viral Referral Integration**

---

## Document Information
- **Version:** 4.5 (Enhanced from v4.4)
- **Date:** 2025-11-07
- **Status:** Proposed for Implementation
- **Author:** AI Analysis & Enhancement
- **Prerequisites:**
  - Referral System v4.3 ✅ (Implemented)
  - `connections` table ✅ (Exists)
  - Redis infrastructure ✅ (Available)

---

## Executive Summary

This proposal enhances the v4.4 design with:

1. **Superior UX/UI** - Modern, intuitive interface with smooth animations and micro-interactions
2. **Optimistic Updates** - Instant feedback before server confirmation for better perceived performance
3. **Real-time Features** - Live connection status updates using Supabase Realtime
4. **Progressive Enhancement** - Works offline, syncs when back online
5. **Analytics Integration** - Built-in tracking for viral loop metrics
6. **Tawk.to Chat Integration** - Seamless messaging between connections
7. **Mobile-First Design** - Optimized for mobile with native-like gestures

### Key Enhancements Over v4.4

| Feature | v4.4 | v4.5 (This Proposal) |
|---------|------|---------------------|
| Real-time Updates | ❌ | ✅ Supabase Realtime |
| Optimistic UI | ❌ | ✅ Instant feedback |
| Offline Support | ❌ | ✅ Queue & sync |
| Analytics | Basic | ✅ Comprehensive funnel tracking |
| Mobile UX | Standard | ✅ Swipe gestures, pull-to-refresh |
| Chat Integration | Not specified | ✅ Tawk.to embedded |
| Viral Loop Metrics | Manual | ✅ Auto-tracked dashboard |
| Connection Recommendations | Basic | ✅ ML-powered suggestions |

---

## 1. Architecture Overview

### 1.1 Technology Stack (Enhanced)

```typescript
// Frontend Stack
{
  framework: 'Next.js 14 (App Router)',
  styling: 'CSS Modules + Tailwind utilities',
  state: 'React Context + SWR for data fetching',
  realtime: 'Supabase Realtime subscriptions',
  animations: 'Framer Motion',
  gestures: 'React Use Gesture',
  offline: 'Service Worker + IndexedDB queue',
  chat: 'Tawk.to JavaScript API'
}

// Backend Stack
{
  api: 'Next.js Route Handlers',
  database: 'Supabase Postgres',
  caching: 'Redis (Upstash)',
  email: 'Resend',
  analytics: 'PostHog (for funnel tracking)',
  monitoring: 'Sentry'
}
```

### 1.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐               │
│  │ Network Page │  │ Chat Widget  │  │ Offline     │               │
│  │ (React)      │  │ (Tawk.to)    │  │ Queue       │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘               │
│         │                 │                   │                       │
│         └─────────────────┴───────────────────┘                       │
│                           │                                           │
└───────────────────────────┼───────────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────────┐
│                        API LAYER (Next.js)                            │
│  ┌────────────────────────┴────────────────────────┐                 │
│  │  Route Handlers (/api/network/*)                │                 │
│  │  • Rate limiting (Redis)                        │                 │
│  │  • Validation (Zod schemas)                     │                 │
│  │  • Auth middleware                              │                 │
│  │  • Error handling                               │                 │
│  └────┬────────────┬────────────┬────────────┬─────┘                 │
└───────┼────────────┼────────────┼────────────┼───────────────────────┘
        │            │            │            │
┌───────┼────────────┼────────────┼────────────┼───────────────────────┐
│       ▼            ▼            ▼            ▼                        │
│  ┌────────┐  ┌─────────┐  ┌────────┐  ┌──────────┐                  │
│  │Postgres│  │ Redis   │  │ Resend │  │ PostHog  │                  │
│  │(Supaba │  │(Upstash)│  │ (Email)│  │(Analytics│                  │
│  │ se)    │  │         │  │        │  │)         │                  │
│  └────────┘  └─────────┘  └────────┘  └──────────┘                  │
│                        DATA LAYER                                     │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (Enhanced)

### 2.1 Migration 039: Network Groups & Reminder Tracking

```sql
-- File: apps/api/migrations/039_create_network_groups.sql

-- 1. Connection Groups (Enhanced with metadata)
CREATE TABLE IF NOT EXISTS public.connection_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#006c67', -- Hex color for UI
    icon VARCHAR(50) DEFAULT 'folder', -- Icon name from icon library
    is_favorite BOOLEAN DEFAULT false,
    member_count INTEGER DEFAULT 0, -- Denormalized for quick access
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_group_name_per_profile UNIQUE (profile_id, name),
    CONSTRAINT valid_hex_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- 2. Group Members (Enhanced with added_at tracking)
CREATE TABLE IF NOT EXISTS public.group_members (
    group_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (group_id, connection_id)
);

-- 3. Add reminder tracking to connections
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS message TEXT; -- Optional message with request

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connection_groups_profile_id
    ON public.connection_groups(profile_id);
CREATE INDEX IF NOT EXISTS idx_connection_groups_favorite
    ON public.connection_groups(profile_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id
    ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_connections_reminder
    ON public.connections(status, reminder_sent, created_at)
    WHERE status = 'pending';

-- 5. Function to update member_count
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.connection_groups
        SET member_count = member_count + 1,
            updated_at = NOW()
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.connection_groups
        SET member_count = GREATEST(0, member_count - 1),
            updated_at = NOW()
        WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$;

-- 6. Trigger for member count
DROP TRIGGER IF EXISTS on_group_member_change ON public.group_members;
CREATE TRIGGER on_group_member_change
    AFTER INSERT OR DELETE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_group_member_count();

-- 7. Function to update groups updated_at
CREATE OR REPLACE FUNCTION public.update_group_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 8. Trigger for updated_at
DROP TRIGGER IF EXISTS connection_groups_updated_at ON public.connection_groups;
CREATE TRIGGER connection_groups_updated_at
    BEFORE UPDATE ON public.connection_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_group_updated_at();

-- 9. RLS Policies
ALTER TABLE public.connection_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own connection groups"
    ON public.connection_groups
    FOR ALL
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can manage members of groups they own"
    ON public.group_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.connection_groups
            WHERE id = group_id AND profile_id = auth.uid()
        )
    );

COMMENT ON TABLE public.connection_groups IS
    'User-defined groups for organizing connections (v4.5)';
COMMENT ON TABLE public.group_members IS
    'Many-to-many join table for connection groups (v4.5)';
```

### 2.2 Migration 040: Audit Log & Analytics

```sql
-- File: apps/api/migrations/040_create_audit_log_table.sql

-- 1. Generic audit log for compliance
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    module TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,

    CONSTRAINT valid_action_type CHECK (action_type ~ '^[a-z_\.]+$')
);

-- 2. Network analytics table (for viral loop tracking)
CREATE TABLE IF NOT EXISTS public.network_analytics (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'invite_sent', 'connection_accepted', 'referral_clicked', etc.
    event_data JSONB,
    referral_code VARCHAR(20),

    CONSTRAINT valid_event_type CHECK (
        event_type IN (
            'invite_sent',
            'invite_clicked',
            'connection_requested',
            'connection_accepted',
            'connection_rejected',
            'connection_removed',
            'group_created',
            'referral_clicked',
            'referral_converted'
        )
    )
);

-- 3. Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_audit_log_profile_id
    ON public.audit_log(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
    ON public.audit_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_module
    ON public.audit_log(module);
CREATE INDEX IF NOT EXISTS idx_network_analytics_profile
    ON public.network_analytics(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_analytics_event
    ON public.network_analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_analytics_referral
    ON public.network_analytics(referral_code)
    WHERE referral_code IS NOT NULL;

-- 4. Partitioning for audit_log (monthly partitions for performance)
-- This will be executed separately via a scheduled job

-- 5. RLS Policies (service_role only)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_analytics ENABLE ROW LEVEL SECURITY;

-- No public policies - only accessible via service_role

COMMENT ON TABLE public.audit_log IS
    'Platform-wide audit log for security and compliance (v4.5)';
COMMENT ON TABLE public.network_analytics IS
    'Network and referral event tracking for viral loop analytics (v4.5)';
```

### 2.3 Migration 041: Connection Limits & Triggers

```sql
-- File: apps/api/migrations/041_create_connection_limit_trigger.sql

-- 1. Function to check connection limits (1,000 per user)
CREATE OR REPLACE FUNCTION public.check_connection_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requester_connections INT;
    receiver_connections INT;
BEGIN
    -- Only check when accepting a connection
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN

        -- Check requester's limit
        SELECT COUNT(*)
        INTO requester_connections
        FROM public.connections
        WHERE (requester_id = NEW.requester_id OR receiver_id = NEW.requester_id)
        AND status = 'accepted';

        IF requester_connections >= 1000 THEN
            RAISE EXCEPTION 'Connection limit (1000) reached for user %', NEW.requester_id
                USING HINT = 'Please remove some connections before accepting new ones';
        END IF;

        -- Check receiver's limit
        SELECT COUNT(*)
        INTO receiver_connections
        FROM public.connections
        WHERE (requester_id = NEW.receiver_id OR receiver_id = NEW.receiver_id)
        AND status = 'accepted';

        IF receiver_connections >= 1000 THEN
            RAISE EXCEPTION 'Connection limit (1000) reached for user %', NEW.receiver_id
                USING HINT = 'This user has reached their connection limit';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Drop and recreate trigger
DROP TRIGGER IF EXISTS on_connection_accepted_check_limit ON public.connections;
CREATE TRIGGER on_connection_accepted_check_limit
    BEFORE INSERT OR UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.check_connection_limit();

-- 3. Function to log connection events to analytics
CREATE OR REPLACE FUNCTION public.log_connection_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log connection accepted
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        INSERT INTO public.network_analytics (profile_id, event_type, event_data)
        VALUES (
            NEW.requester_id,
            'connection_accepted',
            jsonb_build_object(
                'connection_id', NEW.id,
                'receiver_id', NEW.receiver_id
            )
        );
    END IF;

    -- Log connection rejected
    IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
        INSERT INTO public.network_analytics (profile_id, event_type, event_data)
        VALUES (
            NEW.receiver_id,
            'connection_rejected',
            jsonb_build_object(
                'connection_id', NEW.id,
                'requester_id', NEW.requester_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Trigger for connection analytics
DROP TRIGGER IF EXISTS on_connection_status_change ON public.connections;
CREATE TRIGGER on_connection_status_change
    AFTER INSERT OR UPDATE OF status ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.log_connection_event();

COMMENT ON TRIGGER on_connection_accepted_check_limit ON public.connections IS
    'Enforces 1,000 connection limit per user (v4.5)';
COMMENT ON TRIGGER on_connection_status_change ON public.connections IS
    'Logs connection events to network_analytics (v4.5)';
```

---

## 3. API Layer Design

### 3.1 Rate Limiting Middleware

```typescript
// File: apps/web/src/middleware/rateLimiting.ts

import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  message?: string;
}

const LIMITS: Record<string, RateLimitConfig> = {
  'network:request': { requests: 100, window: 86400 }, // 100/day
  'network:invite': { requests: 50, window: 86400 },   // 50/day
  'network:remove': { requests: 20, window: 3600 },    // 20/hour
};

export async function checkRateLimit(
  userId: string,
  action: keyof typeof LIMITS
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = LIMITS[action];
  const key = `rate_limit:${action}:${userId}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, config.window);
  }

  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + (ttl * 1000);
  const remaining = Math.max(0, config.requests - count);

  return {
    allowed: count <= config.requests,
    remaining,
    resetAt,
  };
}

export function rateLimitResponse(remaining: number, resetAt: number) {
  return {
    headers: {
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(resetAt).toISOString(),
    },
  };
}
```

### 3.2 Core API Routes

#### 3.2.1 POST /api/network/request

```typescript
// File: apps/web/src/app/api/network/request/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/middleware/rateLimiting';
import { z } from 'zod';

const RequestSchema = z.object({
  receiver_ids: z.array(z.string().uuid()).min(1).max(10),
  message: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(user.id, 'network:request');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          ...rateLimitResponse(rateLimit.remaining, rateLimit.resetAt)
        }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { receiver_ids, message } = validation.data;

    // Check if users exist and are not already connected
    const { data: existingConnections } = await supabase
      .from('connections')
      .select('receiver_id')
      .eq('requester_id', user.id)
      .in('receiver_id', receiver_ids);

    const alreadyConnected = new Set(
      existingConnections?.map(c => c.receiver_id) || []
    );

    const newReceivers = receiver_ids.filter(id => !alreadyConnected.has(id));

    if (newReceivers.length === 0) {
      return NextResponse.json(
        { error: 'All users are already connected or have pending requests' },
        { status: 400 }
      );
    }

    // Create connection requests
    const connections = newReceivers.map(receiver_id => ({
      requester_id: user.id,
      receiver_id,
      status: 'pending',
      message,
    }));

    const { data, error } = await supabase
      .from('connections')
      .insert(connections)
      .select();

    if (error) {
      throw error;
    }

    // Log analytics
    await supabase.from('network_analytics').insert(
      newReceivers.map(receiver_id => ({
        profile_id: user.id,
        event_type: 'connection_requested',
        event_data: { receiver_id },
      }))
    );

    // Send notifications (async, don't wait)
    sendConnectionRequestNotifications(user.id, newReceivers, message);

    return NextResponse.json(
      {
        success: true,
        count: data.length,
        connections: data
      },
      { ...rateLimitResponse(rateLimit.remaining, rateLimit.resetAt) }
    );

  } catch (error) {
    console.error('[network/request] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendConnectionRequestNotifications(
  requesterId: string,
  receiverIds: string[],
  message?: string
) {
  // Implementation: Send emails via Resend
  // This runs asynchronously and doesn't block the response
}
```

#### 3.2.2 POST /api/network/invite-by-email

```typescript
// File: apps/web/src/app/api/network/invite-by-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/middleware/rateLimiting';
import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

const InviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and referral code
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, referral_code')
      .eq('id', user.id)
      .single();

    if (!profile?.referral_code) {
      return NextResponse.json(
        { error: 'Referral code not found' },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(user.id, 'network:invite');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Invite limit exceeded. Try again tomorrow.' },
        { status: 429, ...rateLimitResponse(rateLimit.remaining, rateLimit.resetAt) }
      );
    }

    // Validate emails
    const body = await request.json();
    const validation = InviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid emails', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { emails } = validation.data;

    // Check which emails are existing users
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', emails);

    const existingEmails = new Set(existingUsers?.map(u => u.email) || []);
    const newEmails = emails.filter(email => !existingEmails.has(email));
    const existingUserIds = existingUsers?.map(u => u.id) || [];

    const results = {
      sent: 0,
      connection_requests_sent: 0,
      errors: [] as string[],
    };

    // For existing users, send connection requests
    if (existingUserIds.length > 0) {
      const requestResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/network/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify({ receiver_ids: existingUserIds }),
        }
      );

      if (requestResponse.ok) {
        results.connection_requests_sent = existingUserIds.length;
      }
    }

    // For new emails, send invitation with referral link
    if (newEmails.length > 0) {
      const referralUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/a/${profile.referral_code}?redirect=/signup`;

      try {
        await resend.emails.send({
          from: 'Tutorwise <invites@tutorwise.io>',
          to: newEmails,
          subject: `${profile.full_name} invited you to join Tutorwise`,
          html: `
            <h1>You're invited to join Tutorwise!</h1>
            <p>${profile.full_name} thinks you'd be a great fit for Tutorwise - the professional tutoring platform.</p>
            <p><a href="${referralUrl}">Accept Invitation &rarr;</a></p>
            <p>By joining through this invitation, you'll automatically connect with ${profile.full_name}.</p>
          `,
        });

        results.sent = newEmails.length;

        // Log analytics
        await supabase.from('network_analytics').insert(
          newEmails.map(email => ({
            profile_id: user.id,
            event_type: 'invite_sent',
            event_data: { email },
            referral_code: profile.referral_code,
          }))
        );
      } catch (error) {
        console.error('[invite-by-email] Email send error:', error);
        results.errors.push('Failed to send some invitations');
      }
    }

    return NextResponse.json(
      { success: true, ...results },
      { ...rateLimitResponse(rateLimit.remaining, rateLimit.resetAt) }
    );

  } catch (error) {
    console.error('[invite-by-email] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

*[Document continues with 7 more sections covering UI/UX, chat integration, analytics, testing, deployment, and implementation roadmap - would you like me to continue?]*

## Questions for Clarification

Before I continue with the complete document, I have some key questions:

1. **Tawk.to Integration Scope**: Should the chat be:
   - Available only between connections?
   - Open to all platform users?
   - Include group chat functionality?

2. **Viral Loop Priorities**: Which metrics are most important?
   - Invitation acceptance rate?
   - Referral-to-conversion rate?
   - Time-to-first-connection?
   - Network growth velocity?

3. **Mobile Experience**: Should we include:
   - Native mobile gestures (swipe to accept/reject)?
   - Push notifications for connection requests?
   - Offline-first architecture?

4. **Connection Suggestions Algorithm**: Should it be based on:
   - Geographic proximity?
   - Subject/skill matching?
   - Mutual connections?
   - User behavior patterns?
   - All of the above with ML scoring?

5. **Implementation Timeline**: What's the priority order?
   - Phase 1: Core networking (connections, invites)
   - Phase 2: Groups and organization
   - Phase 3: Chat integration
   - Phase 4: Analytics and suggestions
   - Or different grouping?

Please let me know your preferences and I'll complete the comprehensive proposal document with all implementation details, code examples, and deployment instructions.
