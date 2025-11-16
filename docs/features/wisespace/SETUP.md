# WiseSpace v5.8 - Setup Guide

## Overview

WiseSpace is Tutorwise's virtual classroom feature, providing:
- Real-time collaborative whiteboard (tldraw)
- Google Meet video integration
- Session artifact storage (whiteboard snapshots)
- CaaS "Proof of Work" tracking

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Supabase project
- Ably account (for real-time sync)

## Installation Steps

### 1. Install Dependencies

```bash
cd apps/web
npm install tldraw@^2.0.0 --legacy-peer-deps
```

**Already installed:**
- `ably@^2.14.0` ✓
- `@ably/chat@^1.1.0` ✓

### 2. Run Database Migrations

```bash
# Migration 079: Add session_artifacts column
psql $POSTGRES_URL_NON_POOLING -f apps/api/migrations/079_add_session_artifacts_to_bookings.sql

# Migration 080: Create storage bucket for artifacts
psql $POSTGRES_URL_NON_POOLING -f apps/api/migrations/080_create_booking_artifacts_storage.sql
```

### 3. Configure Environment Variables

Add to `apps/web/.env.local`:

```bash
# Ably API Key (get from https://ably.com/dashboard)
NEXT_PUBLIC_ABLY_API_KEY=your-ably-api-key-here
```

### 4. Ably Setup

1. Go to https://ably.com/dashboard
2. Create a new app or use existing
3. Navigate to "API Keys"
4. Copy your API key
5. Add to `.env.local` as shown above

**Important:** Use the full API key, not just the app ID.

### 5. Supabase Storage Setup

The storage bucket is created automatically by migration 080, but verify:

1. Go to Supabase Dashboard → Storage
2. Confirm `booking-artifacts` bucket exists
3. Confirm it's set to "Public"
4. Check RLS policies are enabled

If bucket doesn't exist, create manually:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-artifacts', 'booking-artifacts', true);
```

### 6. Test the Setup

1. **Create a test booking:**
   - Status: "Confirmed"
   - Session time: Any past or present time

2. **Join WiseSpace:**
   - Navigate to `/dashboard`
   - Find booking with "Join WiseSpace" button
   - Click to open session room

3. **Test features:**
   - ✓ Whiteboard loads
   - ✓ Drawing syncs between users (open in 2 tabs)
   - ✓ "Start Google Meet" opens new window
   - ✓ "Save Snapshot" uploads to storage
   - ✓ "Mark as Complete" updates booking status

4. **Verify CaaS integration:**
   - Check `caas_recalculation_queue` for tutor
   - Should have entries for `session_completed` and `whiteboard_snapshot_saved`

## File Structure

```
apps/web/src/
├── app/
│   ├── (authenticated)/
│   │   ├── dashboard/page.tsx                      # Added PendingLogsWidget
│   │   └── wisespace/
│   │       ├── layout.tsx                          # Minimal layout (no sidebars)
│   │       └── [bookingId]/
│   │           ├── page.tsx                        # Server component (auth/validation)
│   │           └── WiseSpaceClient.tsx             # Client component (Ably provider)
│   ├── api/
│   │   └── wisespace/
│   │       └── [bookingId]/
│   │           ├── complete/route.ts               # POST - Mark session complete
│   │           └── snapshot/route.ts               # POST - Save whiteboard snapshot
│   └── components/
│       ├── bookings/
│       │   └── BookingCard.tsx                     # Added "Join WiseSpace" button
│       ├── dashboard/
│       │   └── PendingLogsWidget.tsx               # Nudge widget for pending sessions
│       └── wisespace/
│           ├── EmbeddedWhiteboard.tsx              # tldraw + Ably sync
│           ├── WiseSpaceHeader.tsx                 # Action buttons
│           └── WiseSpaceHeader.module.css
├── lib/
│   └── google-meet.ts                              # Google Meet utilities
└── .env.example                                    # Environment variables template

apps/api/migrations/
├── 079_add_session_artifacts_to_bookings.sql       # JSONB column for artifacts
└── 080_create_booking_artifacts_storage.sql        # Storage bucket + RLS policies
```

## API Endpoints

### POST /api/wisespace/[bookingId]/complete

Marks session as complete and triggers CaaS recalculation.

**Auth:** Required (tutor or student)

**Response:**
```json
{
  "success": true,
  "message": "Session marked as complete"
}
```

### POST /api/wisespace/[bookingId]/snapshot

Saves whiteboard snapshot to Supabase Storage.

**Auth:** Required (tutor or student)

**Request:**
```json
{
  "snapshotData": "{...tldraw JSON data...}"
}
```

**Response:**
```json
{
  "success": true,
  "snapshotUrl": "https://...supabase.co/storage/.../snapshot.json",
  "message": "Snapshot saved successfully"
}
```

## Troubleshooting

### Ably Connection Issues

**Symptom:** Whiteboard doesn't sync between users

**Solutions:**
1. Check `NEXT_PUBLIC_ABLY_API_KEY` is set correctly
2. Verify API key has publish/subscribe permissions
3. Check browser console for Ably errors
4. Ensure key is prefixed with `NEXT_PUBLIC_` (required for client-side)

### Storage Upload Fails

**Symptom:** "Failed to upload snapshot" error

**Solutions:**
1. Verify `booking-artifacts` bucket exists
2. Check RLS policies allow INSERT for authenticated users
3. Confirm bucket is set to public
4. Check Supabase project has storage enabled

### Google Meet Window Blocked

**Symptom:** "Start Google Meet" doesn't open window

**Solutions:**
1. Allow pop-ups for your domain
2. Check browser console for blocked pop-up warnings
3. User must click button (can't be triggered programmatically on page load)

### Whiteboard Not Loading

**Symptom:** Blank screen in WiseSpace

**Solutions:**
1. Check tldraw CSS is imported: `import 'tldraw/tldraw.css'`
2. Verify React version compatibility (need React 18)
3. Check browser console for errors
4. Clear browser cache and reload

## Next Steps (Phase 2)

- [ ] Google Calendar API integration for scheduled meetings
- [ ] Enhanced CaaS "Proof of Work" logic in TutorCaaSStrategy
- [ ] Session recording integration
- [ ] Automated meeting link creation
- [ ] Whiteboard templates for common subjects
- [ ] Session notes/summary export

## Support

For issues or questions:
- Check Ably status: https://status.ably.com
- Supabase status: https://status.supabase.com
- GitHub issues: https://github.com/anthropics/tutorwise/issues
