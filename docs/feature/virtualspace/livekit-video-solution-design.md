# LiveKit In-App Video — Solution Design
**Feature:** Embedded video calling, screen sharing & recording for VirtualSpace
**Version:** 1.0
**Created:** 2026-03-22
**Status:** Planned — implementation pending

---

## 1. Problem Statement

VirtualSpace currently opens video in a separate Jitsi popup window. Students must alt-tab between the whiteboard and video, breaking the unified session experience. This is the single biggest functional gap vs LessonSpace, which embeds video inline.

Screen sharing is captured locally via `MediaDevices.getDisplayMedia()` but never transmitted to the remote participant — the stream is invisible to the other side.

Session recording exists (LiveKit Egress API wired up) but the LiveKit room itself is not yet created per session, so recording cannot start.

---

## 2. Goals

1. **Embedded video panel** — camera + mic for both tutor and student, side-by-side or collapsible, inside the VirtualSpace page (no new window)
2. **Screen sharing** — share screen as a LiveKit video track; pin to full-width with whiteboard in side panel
3. **Recording** — LiveKit Egress triggers on "Start Recording" (already built); requires room to exist
4. **Jitsi preserved** — keep existing "Join Video Room" popup as fallback for users who prefer it

---

## 3. Technology

**LiveKit Cloud** with `@livekit/components-react`.

Already installed: `livekit-server-sdk` (server), `@livekit/components-react`, `@livekit/components-styles` (client).

Env vars required (add to `.env.local`):
```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

---

## 4. Database Changes

**Migration 428:**
```sql
ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS livekit_room_name TEXT;
```

Room name strategy: `vs-{sessionId}` — deterministic, no extra storage needed for most cases. Column exists so it can be overridden if needed.

---

## 5. API

### `POST /api/virtualspace/[sessionId]/livekit-token`

Generates a participant access token. Called by each client on join.

**Auth:** Supabase session (user must be session owner, participant, or booking party)

**Request body:** `{ participantName?: string }`

**Response:**
```json
{
  "token": "eyJ...",
  "roomName": "vs-{sessionId}",
  "url": "wss://your-project.livekit.cloud"
}
```

**Server logic:**
1. Verify user is authorised for the session (owner or booking participant)
2. Derive `roomName = 'vs-' + sessionId`
3. Upsert `livekit_room_name` on the session row
4. Create `AccessToken` with `RoomJoin`, `RoomRecord` grants
5. Return token + roomName + LIVEKIT_URL

**File:** `apps/web/src/app/api/virtualspace/[sessionId]/livekit-token/route.ts`

---

## 6. Component Architecture

### `LiveKitVideoPanel.tsx`

Replaces the video section inside `VideoPanel.tsx`. Manages LiveKit room connection lifecycle.

**Location:** `apps/web/src/components/feature/virtualspace/whiteboard/panels/LiveKitVideoPanel.tsx`

**Props:**
```typescript
interface LiveKitVideoPanelProps {
  sessionId: string;
  participantName: string;
  isOpen: boolean;
  onClose: () => void;
  canRecord: boolean;           // tutor or standalone owner only
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}
```

**Internal structure:**
```
LiveKitVideoPanel
  └── LiveKitRoom (from @livekit/components-react)
        ├── RoomAudioRenderer          — remote audio auto-play
        ├── ParticipantTile (local)    — camera + mic
        ├── ParticipantTile (remote)   — remote participant feed
        ├── ScreenShareTile            — appears when screen shared
        └── Controls bar
              ├── MicToggle
              ├── CameraToggle
              ├── ScreenShareToggle
              ├── RecordButton (canRecord only)
              └── DisconnectButton
```

**Token fetch:** On mount, calls `POST /api/virtualspace/[sessionId]/livekit-token`, stores token in state, passes to `<LiveKitRoom token={...} serverUrl={...}>`.

**Screen share pin:** When a screen share track becomes active (`useScreenShareTracks()`), promote to full-width mode — whiteboard shrinks to right panel (30% width). "Unpin" button restores layout.

### Integration into `VideoPanel.tsx`

`VideoPanel.tsx` currently renders the Jitsi popup button + recording controls. Update it to:
- Render `LiveKitVideoPanel` when LiveKit is the active provider
- Keep Jitsi "Join in new tab" as a secondary button (labelled "Use Jitsi instead")
- Pass `sessionId` down (requires adding `sessionId` prop to VideoPanel)

### Integration into `VirtualSpaceClient.tsx`

Pass `sessionId` to `VideoPanel`:
```tsx
<VideoPanel
  sessionId={sessionId}
  participantName={user.user_metadata?.full_name || user.email}
  canRecord={isTutor || context.mode === 'standalone'}
  ...
/>
```

---

## 7. Screen Share Layout

Two layout modes in `VirtualSpaceClient.tsx`:

| Mode | Whiteboard | Video panel |
|---|---|---|
| Normal | Full width | Collapsible right sidebar (360px) |
| Screen pinned | Right sidebar (30%) | Full width left panel |

`screenShareActive` state toggled by `useScreenShareTracks()` hook result. Layout controlled by CSS flex/grid on the outer wrapper.

---

## 8. Recording Integration

The existing recording API (`POST /api/virtualspace/[sessionId]/recording`) already calls `EgressClient.startRoomCompositeEgress()`. It will work as-is once a LiveKit room exists for the session (which the token endpoint creates implicitly via LiveKit Cloud's auto-create behaviour).

No changes needed to the recording API or webhook handler.

---

## 9. Fallback — Jitsi

Keep the existing Jitsi URL construction and "Join Video Room" button in VideoPanel. Add a small "Use Jitsi instead" text link below the LiveKit panel. If `LIVEKIT_URL` env var is absent (e.g. local dev without credentials), fall back to Jitsi-only mode automatically.

---

## 10. Migration & Rollout

1. Apply migration 428 (`livekit_room_name` column)
2. Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` to env
3. Deploy `livekit-token` API route
4. Deploy `LiveKitVideoPanel` component
5. Update `VideoPanel` + `VirtualSpaceClient`
6. Test: two-participant session, camera/mic toggle, screen share pin, recording start/stop, Jitsi fallback

---

## 11. Implementation Checklist

- [ ] Migration 428: `livekit_room_name` column
- [ ] `POST /api/virtualspace/[sessionId]/livekit-token`
- [ ] `LiveKitVideoPanel.tsx` component
- [ ] Screen share pin layout in `VirtualSpaceClient.tsx`
- [ ] `VideoPanel.tsx` updated to use `LiveKitVideoPanel`
- [ ] Jitsi fallback preserved
- [ ] Env vars documented in `.env.local` + deployment

---

## 12. Open Questions

| Question | Decision |
|---|---|
| Should video be on by default on join? | No — camera/mic off by default, user opts in |
| Max participants in video? | LiveKit Cloud free tier: 20 concurrent publishers — sufficient for 1:1 tutoring |
| What happens if LiveKit is down? | Jitsi fallback always available |
| Recording storage? | LiveKit Egress → S3 bucket (existing config) |
