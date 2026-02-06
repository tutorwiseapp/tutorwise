# Calendar Integration - Complete Implementation

**Status:** ✅ Phase 1 & 2 Complete + Production Improvements
**Created:** 2026-02-06
**Last Updated:** 2026-02-06

---

## 🎉 Fully Implemented Features

### Phase 1: OAuth + One-Way Sync
✅ Google Calendar OAuth 2.0 authentication
✅ Secure connection management with RLS policies
✅ One-way sync: TutorWise → External Calendar
✅ Calendar settings UI at `/account/settings/calendar`
✅ Connect/disconnect functionality

### Phase 2: Automatic Reminders
✅ Calendar events include automatic reminders:
- 1 day before (email)
- 1 hour before (popup)
- 15 minutes before (popup)

### Booking Lifecycle Integration
✅ **Auto-create** events when bookings confirmed (paid or free)
✅ **Auto-update** events when bookings rescheduled
✅ **Auto-delete** events when bookings cancelled
✅ Syncs to both client and tutor calendars
✅ Context-aware event descriptions

### Production Improvements
✅ **Automatic Token Refresh** - Prevents sync failures from expired tokens
✅ **Bulk Sync** - Retroactively syncs existing bookings on first connection
✅ **Token Encryption** - AES-256-GCM encryption for secure token storage
✅ **Error Recovery** - Graceful handling of API failures
✅ **Rate Limiting Protection** - Delays between bulk operations

---

## 📂 File Structure

```
apps/web/src/
├── lib/calendar/
│   ├── google.ts                 # Google Calendar API service
│   ├── sync-booking.ts           # Booking lifecycle sync logic
│   ├── bulk-sync.ts              # Bulk sync existing bookings
│   ├── encryption.ts             # Token encryption/decryption
│   └── README.md                 # This file
│
├── app/api/calendar/
│   ├── connect/google/route.ts   # OAuth initiation
│   ├── callback/google/route.ts  # OAuth callback handler
│   ├── disconnect/route.ts       # Disconnect calendar
│   └── connections/route.ts      # Get user connections
│
├── app/(authenticated)/account/settings/
│   ├── calendar/page.tsx         # Calendar settings UI
│   ├── calendar/page.module.css  # Styles
│   └── page.tsx                  # Updated with calendar card
│
├── types/index.ts                # TypeScript types
│
└── tools/database/migrations/
    └── 236_add_calendar_integration_tables.sql
```

---

## 🔧 Environment Setup

### Required Environment Variables

Add to `.env.local`:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"  # or your production URL

# Token Encryption (Production Required)
CALENDAR_ENCRYPTION_KEY="your_32_byte_hex_encryption_key"
```

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** In development without `CALENDAR_ENCRYPTION_KEY`, tokens are stored unencrypted with a warning. In production, the app will throw an error if the key is missing.

---

## 🏗️ Database Schema

### `calendar_connections` Table
Stores OAuth connections between users and calendar providers.

```sql
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT CHECK (provider IN ('google', 'outlook')),
  access_token TEXT,        -- Encrypted
  refresh_token TEXT,       -- Encrypted
  token_expiry TIMESTAMPTZ,
  calendar_id TEXT,
  email TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_mode TEXT DEFAULT 'one_way',
  status TEXT DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, provider)
);
```

### `calendar_events` Table
Tracks sync between bookings and external calendar events.

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  external_event_id TEXT,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_connection_id, booking_id)
);
```

---

## 🔐 Security Features

### 1. Token Encryption (AES-256-GCM)
All OAuth tokens are encrypted before storage using:
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Format:** `iv:authTag:encryptedData` (hex-encoded)
- **Key Length:** 32 bytes (256 bits)

**Implementation:**
```typescript
import { encryptToken, decryptToken } from '@/lib/calendar/encryption';

// Encrypt before storing
const encrypted = encryptToken(accessToken);

// Decrypt before using
const decrypted = decryptToken(encrypted);
```

### 2. Automatic Token Refresh
Tokens are automatically refreshed before API calls if they expire within 5 minutes:

```typescript
import { getValidAccessToken } from '@/lib/calendar/google';

const { accessToken, needsRefresh, newExpiry } = await getValidAccessToken(
  connection.access_token,
  connection.refresh_token,
  connection.token_expiry
);

if (needsRefresh) {
  // Update database with new token
}
```

### 3. Row-Level Security (RLS)
Database policies ensure users can only access their own connections:

```sql
-- Users can only see their own connections
CREATE POLICY "Users can view own calendar connections"
  ON calendar_connections FOR SELECT
  USING (auth.uid() = profile_id);
```

---

## 🔄 How It Works

### User Flow

1. **Connect Calendar**
   - User visits `/account/settings/calendar`
   - Clicks "Connect Google Calendar"
   - Redirected to Google OAuth consent screen
   - Grants permissions and redirects back
   - Tokens encrypted and stored in database
   - **Bulk sync triggered** - all existing confirmed bookings synced

2. **Booking Confirmed**
   - Payment succeeds via Stripe webhook (or free session confirmed)
   - `syncBookingConfirmation()` called
   - Creates calendar events for client and tutor
   - Records in `calendar_events` table

3. **Booking Rescheduled**
   - User proposes new time → other party confirms
   - `syncBookingReschedule()` called
   - Updates existing calendar events with new time

4. **Booking Cancelled**
   - User cancels booking
   - `syncBookingCancellation()` called
   - Deletes calendar events from both calendars

5. **Token Expired**
   - Before API call, token expiry checked
   - If expired, automatically refreshed using `refresh_token`
   - New token encrypted and stored
   - API call proceeds with fresh token

---

## 📊 Sync Logic

### Non-Blocking Design
All calendar sync operations are **async and non-blocking**:
- Booking operations never fail due to calendar sync errors
- Errors are logged but don't propagate to user
- Connection marked as 'error' status if repeated failures

### Example: Booking Confirmation Sync

```typescript
// In Stripe webhook after payment success
if (booking) {
  syncBookingConfirmation(booking)
    .then(() => console.log('Calendar sync completed'))
    .catch((err) => console.error('Calendar sync error:', err));
  // Don't await - webhook returns immediately
}
```

### Error Handling

1. **Token Refresh Failed**
   - Connection status set to 'error'
   - `last_error`: "Token expired. Please reconnect your calendar."
   - User sees error in settings UI

2. **API Call Failed**
   - Error logged with context
   - Connection status set to 'error'
   - Sync attempt skipped on next booking

3. **Orphaned Events**
   - If event created in Google but DB insert fails
   - Logged for manual cleanup: `{external_event_id, booking_id, connection_id}`

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### Initial Setup
- [ ] Set environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CALENDAR_ENCRYPTION_KEY)
- [ ] Run database migration 236
- [ ] Verify OAuth redirect URI in Google Console: `{BASE_URL}/api/calendar/callback/google`

#### Connection Flow
- [ ] Visit `/account/settings/calendar`
- [ ] Click "Connect Google Calendar"
- [ ] Verify redirect to Google consent screen
- [ ] Grant permissions
- [ ] Verify redirect back with success message
- [ ] Check database: `calendar_connections` row created with encrypted tokens
- [ ] Verify bulk sync: existing confirmed bookings appear in Google Calendar

#### Booking Lifecycle
- [ ] Create and confirm a paid booking (Stripe checkout)
- [ ] Verify event appears in Google Calendar for both client and tutor
- [ ] Verify event has correct title, time, duration, reminders
- [ ] Reschedule the booking
- [ ] Verify event time updated in Google Calendar
- [ ] Cancel the booking
- [ ] Verify event deleted from Google Calendar

#### Error Scenarios
- [ ] Delete `CALENDAR_ENCRYPTION_KEY` → verify dev warning
- [ ] Set invalid token expiry → verify auto-refresh
- [ ] Revoke Google Calendar permissions → verify error status
- [ ] Disconnect calendar → verify connection deleted

---

## 🚀 Deployment Checklist

### Before Production

1. **Environment Variables**
   ```bash
   # Set in production environment
   GOOGLE_CLIENT_ID="prod_client_id"
   GOOGLE_CLIENT_SECRET="prod_client_secret"
   CALENDAR_ENCRYPTION_KEY="generate_new_key_for_prod"
   NEXT_PUBLIC_BASE_URL="https://tutorwise.com"
   ```

2. **Google OAuth Setup**
   - Create production OAuth client in Google Console
   - Add authorized redirect URI: `https://tutorwise.com/api/calendar/callback/google`
   - Enable Google Calendar API
   - Set up OAuth consent screen (verified)

3. **Database**
   - Run migration 236 on production database
   - Verify RLS policies are active
   - Check indexes created for performance

4. **Monitoring**
   - Set up alerts for calendar sync failures
   - Monitor token refresh success rate
   - Track bulk sync performance

---

## 🔮 Future Enhancements

### Phase 3: Two-Way Sync (Not Implemented)
- Pull busy times from external calendar
- Auto-block TutorWise availability
- Periodic sync job (every 15 minutes)
- Conflict detection and resolution

### Additional Providers
- Microsoft Outlook Calendar (similar OAuth pattern)
- Apple Calendar (via CalDAV)

### Advanced Features
- Selective sync (choose which bookings to sync)
- Custom event templates
- Timezone handling improvements
- Sync history and audit logs

---

## 📞 Support

### Common Issues

**"Token expired" error in settings UI**
- User needs to disconnect and reconnect calendar
- Refresh token may have been revoked
- Check `calendar_connections.last_error` for details

**Events not syncing**
- Check `calendar_connections.status` = 'active'
- Verify `sync_enabled` = true
- Check server logs for API errors
- Verify Google Calendar API quota

**Encryption errors**
- Ensure `CALENDAR_ENCRYPTION_KEY` is set
- Key must be exactly 32 bytes (64 hex chars)
- If key changed, existing connections won't decrypt

---

## 📝 Commits

- **Initial Setup:** `86b9bc77` - OAuth + UI + API endpoints
- **Lifecycle Integration:** `1006c6da` - Booking lifecycle hooks
- **Production Improvements:** (pending) - Token refresh, bulk sync, encryption

---

## ✅ Summary

Calendar integration is **fully functional** with:
- ✅ Google Calendar OAuth connection
- ✅ Automatic event creation, updates, and deletion
- ✅ Token encryption and automatic refresh
- ✅ Bulk sync of existing bookings
- ✅ Production-ready error handling

**Ready for production deployment** after environment setup and testing.
