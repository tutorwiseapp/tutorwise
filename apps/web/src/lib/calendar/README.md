# Calendar Integration Implementation Guide

## Phase 1 & 2: OAuth + One-Way Sync + Reminders

**Status:** Foundation complete, API endpoints and UI needed
**Created:** 2026-02-06
**Last Updated:** 2026-02-06

---

## ✅ Completed

### 1. Database Schema (Migration 236)
- ✅ `calendar_connections` table - OAuth tokens and connection status
- ✅ `calendar_events` table - Sync tracking between bookings and external events
- ✅ RLS policies for user data security
- ✅ Indexes for performance
- ✅ Migration ran successfully

### 2. TypeScript Types
- ✅ `CalendarConnection` - OAuth connection model
- ✅ `CalendarEvent` - Event sync tracking model
- ✅ `GoogleCalendarEvent` - Google Calendar API format
- ✅ `OutlookCalendarEvent` - Microsoft Graph API format
- ✅ API response types

### 3. Google Calendar Service
- ✅ OAuth URL generation (`getGoogleAuthUrl`)
- ✅ Code-to-token exchange (`exchangeCodeForTokens`)
- ✅ Token refresh (`refreshGoogleAccessToken`)
- ✅ Event creation (`createGoogleCalendarEvent`)
- ✅ Event updates (`updateGoogleCalendarEvent`)
- ✅ Event deletion (`deleteGoogleCalendarEvent`)
- ✅ Automatic reminders (1 day, 1 hour, 15 min)
- ✅ Booking-to-event conversion with full context

**Location:** `apps/web/src/lib/calendar/google.ts`

---

## 🚧 Next Steps

### 1. Install Dependencies

```bash
cd apps/web
npm install googleapis @microsoft/microsoft-graph-client @azure/msal-node
```

**Packages:**
- `googleapis` - Google Calendar API
- `@microsoft/microsoft-graph-client` - Microsoft Graph API
- `@azure/msal-node` - Microsoft OAuth

### 2. Create API Endpoints

#### A. OAuth Connection Endpoint

**File:** `apps/web/src/app/api/calendar/connect/google/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/calendar/google';

export async function GET(request: NextRequest) {
  try {
    const authUrl = getGoogleAuthUrl();

    return NextResponse.json({
      success: true,
      auth_url: authUrl,
    });
  } catch (error) {
    console.error('[Calendar Connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
```

#### B. OAuth Callback Endpoint

**File:** `apps/web/src/app/api/calendar/callback/google/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { exchangeCodeForTokens, getGoogleUserEmail } from '@/lib/calendar/google';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(
      new URL('/account/settings/calendar?error=no_code', request.url)
    );
  }

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL('/login', request.url)
      );
    }

    // 2. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // 3. Get user's email from Google
    const email = await getGoogleUserEmail(tokens.access_token);

    // 4. Store connection in database
    const { error } = await supabase
      .from('calendar_connections')
      .upsert({
        profile_id: user.id,
        provider: 'google',
        access_token: tokens.access_token, // TODO: Encrypt before storage
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.token_expiry,
        calendar_id: 'primary',
        email,
        sync_enabled: true,
        sync_mode: 'one_way',
        status: 'active',
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'profile_id,provider',
      });

    if (error) throw error;

    return NextResponse.redirect(
      new URL('/account/settings/calendar?success=google_connected', request.url)
    );
  } catch (error) {
    console.error('[Calendar Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/account/settings/calendar?error=connection_failed', request.url)
    );
  }
}
```

#### C. Disconnect Endpoint

**File:** `apps/web/src/app/api/calendar/disconnect/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { provider } = await request.json();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete connection and all associated events
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('profile_id', user.id)
      .eq('provider', provider);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Calendar Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}
```

#### D. Get Connections Endpoint

**File:** `apps/web/src/app/api/calendar/connections/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('profile_id', user.id);

    if (error) throw error;

    // Don't expose tokens to frontend
    const safeConnections = connections?.map(conn => ({
      ...conn,
      access_token: undefined,
      refresh_token: undefined,
    }));

    return NextResponse.json({
      success: true,
      connections: safeConnections,
    });
  } catch (error) {
    console.error('[Calendar Connections] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
```

### 3. Create Account Settings Calendar Page

**File:** `apps/web/src/app/(authenticated)/account/settings/calendar/page.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { HubPageLayout, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountHeroHeader from '@/app/components/feature/account/AccountHeroHeader';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import type { CalendarConnection } from '@/types';
import styles from './page.module.css';

export default function CalendarSettingsPage() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConnections();

    // Handle OAuth callback messages
    if (searchParams?.get('success') === 'google_connected') {
      toast.success('Google Calendar connected successfully!');
    } else if (searchParams?.get('error')) {
      toast.error('Failed to connect calendar. Please try again.');
    }
  }, [searchParams]);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/calendar/connections');
      const data = await response.json();
      if (data.success) {
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/calendar/connect/google');
      const data = await response.json();
      if (data.success && data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      toast.error('Failed to initiate Google Calendar connection');
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm('Disconnect calendar? Existing events will remain but won't sync.')) {
      return;
    }

    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (response.ok) {
        toast.success('Calendar disconnected');
        fetchConnections();
      } else {
        throw new Error('Disconnect failed');
      }
    } catch (error) {
      toast.error('Failed to disconnect calendar');
    }
  };

  const googleConnection = connections.find(c => c.provider === 'google');

  return (
    <HubPageLayout
      header={<AccountHeroHeader />}
      tabs={<HubTabs tabs={[/* account tabs */]} onTabChange={() => {}} />}
      sidebar={<HubSidebar>{/* widgets */}</HubSidebar>}
    >
      <div className={styles.content}>
        <h1>Calendar Integration</h1>
        <p>Connect your calendar to automatically sync TutorWise bookings</p>

        <div className={styles.calendarGrid}>
          {/* Google Calendar Card */}
          <div className={styles.connectionCard}>
            <div className={styles.cardHeader}>
              <h3>Google Calendar</h3>
            </div>

            {googleConnection ? (
              <div className={styles.connected}>
                <div className={styles.statusBadge}>✓ Connected</div>
                <p>{googleConnection.email}</p>
                <p className={styles.lastSync}>
                  Last synced: {googleConnection.last_synced_at
                    ? new Date(googleConnection.last_synced_at).toLocaleString()
                    : 'Never'}
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDisconnect('google')}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className={styles.disconnected}>
                <p>Sync bookings to your Google Calendar automatically</p>
                <Button variant="primary" onClick={handleConnectGoogle}>
                  Connect Google Calendar
                </Button>
              </div>
            )}
          </div>

          {/* Outlook Calendar Card (Coming Soon) */}
          <div className={styles.connectionCard + ' ' + styles.comingSoon}>
            <div className={styles.cardHeader}>
              <h3>Outlook Calendar</h3>
            </div>
            <p>Microsoft Outlook integration coming soon</p>
          </div>
        </div>
      </div>
    </HubPageLayout>
  );
}
```

### 4. Update Account Settings to Include Calendar Link

**File:** `apps/web/src/app/(authenticated)/account/settings/page.tsx`

Add new card after line 201:

```typescript
{/* Calendar Integration - NEW */}
<Link href="/account/settings/calendar" className={styles.settingCard}>
  <div className={styles.cardContent}>
    <h3 className={styles.cardTitle}>Calendar Integration</h3>
    <p className={styles.cardDescription}>
      Connect Google or Outlook to automatically sync bookings
    </p>
  </div>
</Link>
```

### 5. Update Bookings Sync Button

**File:** `apps/web/src/app/(authenticated)/bookings/page.tsx`

Update `handleSyncCalendar` function (line 271):

```typescript
const handleSyncCalendar = () => {
  router.push('/account/settings/calendar');
  setShowActionsMenu(false);
};
```

### 6. Integrate with Booking Lifecycle

When bookings are confirmed, cancelled, or rescheduled, automatically sync to connected calendars.

**Example: After booking confirmation**

```typescript
// In booking confirmation API
const { data: connections } = await supabase
  .from('calendar_connections')
  .select('*')
  .or(`profile_id.eq.${booking.client_id},profile_id.eq.${booking.tutor_id}`)
  .eq('status', 'active')
  .eq('sync_enabled', true);

for (const connection of connections || []) {
  const viewMode = connection.profile_id === booking.client_id ? 'client' : 'tutor';

  try {
    const eventId = await createGoogleCalendarEvent(
      connection.access_token,
      booking,
      viewMode,
      connection.calendar_id || 'primary'
    );

    await supabase.from('calendar_events').insert({
      calendar_connection_id: connection.id,
      booking_id: booking.id,
      external_event_id: eventId,
      external_calendar_id: connection.calendar_id,
      event_title: booking.service_name,
      event_start: booking.session_start_time,
      event_end: new Date(new Date(booking.session_start_time).getTime() +
        booking.session_duration * 60000).toISOString(),
      sync_status: 'synced',
    });
  } catch (error) {
    console.error('Failed to sync to calendar:', error);
  }
}
```

---

## 🔒 Security Considerations

### 1. Token Encryption
**TODO:** Encrypt tokens before storing in database

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

export function encryptToken(token: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptToken(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 2. Environment Variables
Add to `.env.local`:

```bash
# Calendar Integration
CALENDAR_TOKEN_ENCRYPTION_KEY="generate_random_32_byte_hex_string"
```

---

## 📊 Performance Optimization

### Background Job Queue
Use BullMQ or similar for async calendar sync:

```typescript
import { Queue } from 'bullmq';

const calendarQueue = new Queue('calendar-sync', {
  connection: redis,
});

// Add job when booking confirmed
await calendarQueue.add('sync-booking', {
  bookingId: booking.id,
  action: 'create',
});
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Connect Google Calendar
- [ ] Verify event appears in Google Calendar
- [ ] Update booking time, verify event updates
- [ ] Cancel booking, verify event deleted
- [ ] Disconnect calendar
- [ ] Reconnect calendar
- [ ] Test token refresh flow

---

## 📈 Phase 3: Two-Way Sync (Future)

**Not Yet Implemented**

Features:
- Pull busy times from external calendar
- Auto-block TutorWise availability based on external events
- Periodic sync job (every 15 minutes)
- Conflict detection

---

## 📝 Documentation Updates Needed

1. Add calendar sync section to user documentation
2. Update API documentation with new endpoints
3. Add troubleshooting guide
4. Create admin guide for managing calendar integrations

---

## Summary

**Foundation Complete:**
- ✅ Database tables
- ✅ TypeScript types
- ✅ Google Calendar service

**Next Implementation Steps:**
1. Install packages: `googleapis`, `@microsoft/microsoft-graph-client`, `@azure/msal-node`
2. Create API endpoints (4 files)
3. Create settings page UI (1 file)
4. Add calendar card to Account Settings
5. Update Bookings sync button
6. Integrate with booking lifecycle
7. Add token encryption
8. Test end-to-end flow

**Estimated completion:** 2-4 hours for remaining implementation
