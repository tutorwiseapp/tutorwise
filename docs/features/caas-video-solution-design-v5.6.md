# caas-video-solution-design-v5.6

Here is the updated `caas-video-solution-design-v5.6`.

This document has been updated to be the definitive specification for the "Credibility Clip" feature. It is now correctly positioned as a "plug-in" that directly integrates with and provides a scoring incentive for the `caas-solution-design-v5.5` engine.

All versioning and dependencies have been corrected to reflect our final architecture.

* * *

### **Solution Design Document: Credibility Clip (Video Intro) (v5.6)**

**Document Information**

- **Version:** 5.6
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisite:** `caas-solution-design-v5.5`

* * *

### 1\. Executive Summary

This document details the architecture for the **Credibility Clip** feature, a 30-second video introduction for tutors. This feature is a direct optimization of our "Don't find a stranger" strategy and learns from the engagement mechanics of platforms like TikTok.

The solution is designed to have **zero storage or bandwidth cost** by offloading all video hosting to third-party streaming services (e.g., Loom, YouTube). We will simply store a text URL to the unlisted video.

This feature will be integrated into the Tutor CaaS Score as a "bonus" in the **Digital Professionalism** bucket (defined in `caas-solution-design-v5.5`), creating a new gamification lever to drive tutor engagement and build client trust.

* * *

### 2\. Business Rationale & Objectives

1. **Humanize Tutors:** A 30-second clip provides a personal connection that a static avatar cannot, directly addressing the "stranger" problem and building client trust before the first message.
2. **Increase Conversion:** A personal intro video is expected to significantly increase the "Profile View" to "Booking Request" conversion rate.
3. **Drive CaaS Engagement:** Provides a new, simple way for tutors to improve their CaaS score, driving engagement with their profile settings.
4. **Zero Platform Cost:** The architecture avoids all video storage and streaming costs, maintaining a lean infrastructure.

* * *

### 3\. Database Implementation

This feature's database requirement is already specified in the `caas-solution-design-v5.5`. This section re-confirms that specification.

- **Migration File:** `apps/api/migrations/069_add_bio_video_url.sql`
- **SQL:**
```
SQL
```
```
-- Adds a field to store a link to an externally hosted video
ALTER TABLE public.profiles
ADD COLUMN bio_video_url TEXT;
COMMENT ON COLUMN public.profiles.bio_video_url
IS 'A link to a 30s unlisted YouTube/Loom/Vimeo video for the CaaS "Credibility Clip"';
```

* * *

### 4\. Backend Implementation (CaaS Engine)

This feature directly modifies the logic of the `TutorCaaSStrategy` from `caas-solution-design-v5.5`.

- **Target File:** `apps/web/src/lib/services/caas/strategies/tutor.ts`
- **Optimized Logic (Bucket 5):** We will add the video as a "Flexible Bonus". A tutor can get a maximum of 10 points for this bucket. Having a video link provides an alternative path to scoring, rewarding them for either logging their sessions *or* creating the video.

```
TypeScript
```

```
// apps/web/src/lib/services/caas/strategies/tutor.ts
// ... inside TutorCaaSStrategy class ...

// BUCKET 5: DIGITAL (10)
private calcDigital(digital: DigitalStats, perf: PerformanceStats, profile: Profile): number {
  let score = 0;
  
  // 1. Integrated Tools (5 pts)
  if (digital.google_calendar_synced || digital.google_classroom_synced) {
    score += 5;
  }

  // 2. Engagement (5 pts) "The OR Rule"
  if (
    // Path A: They diligently log their session data
    (digital.lessonspace_usage_rate > 0.8 || perf.manual_session_log_rate > 0.8) ||
    
    // Path B: They have uploaded a Credibility Clip
    (profile.bio_video_url && profile.bio_video_url !== "")
  ) {
    // Tutor gets 5 points if they log sessions OR if they have a video intro
    score += 5;
  }

  return score;
}

```

* * *

### 5\. Frontend Implementation

This feature impacts three key user-facing areas.

#### 5.1. Tutor Upload/Management (The "Input")

- **Page:** `apps/web/src/app/(authenticated)/account/professional/page.tsx`
- **Component:** `apps/web/src/app/components/profile/TutorProfessionalInfo.tsx`
- **Action:**
  1. Add a new `<FormSection>` to the `TutorProfessionalInfo.tsx` form.
  2. Add a single `<Input>` field that saves to the `profiles.bio_video_url` column.
  3. Include clear helper text: `"Add your 30-second video intro. We recommend uploading an Unlisted video to Loom or YouTube, then paste the share link here."`

#### 5.2. Public Profile Display (The "Output")

- **Page:** `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`/\[\[...slug\]\]/page.tsx\]
- **Component:** `apps/web/src/app/components/public-profile/ProfileHeroSection.tsx`
- **Action:**
  1. The server component will fetch the `profile.bio_video_url` along with other profile data.
  2. The `ProfileHeroSection.tsx` will check if this URL exists.
  3. **Desktop View:** If the URL exists, a new button **"Watch 30s Intro"** will be rendered, likely near the CaaS score.
  4. **Mobile View:** If the URL exists, a **Play Icon** will be overlaid on the tutor's static Avatar.
  5. **On Click:** Clicking the button/icon will open a `<Modal>` containing a `react-player` component. The player will stream the video from the `bio_video_url`, ensuring zero performance lag on page load.

#### 5.3. Tutor Dashboard Guidance (The "Nudge")

- **Page:** `apps/web/src/app/(authenticated)/dashboard/page.tsx`
- **Component:** `apps/web/src/app/components/dashboard/CaaSGuidanceWidget.tsx` (from SDD v5.5)
- **Action:**
  1. The `getNextBestActions()` helper function for the widget will be updated.
  2. **Logic:** If the user's score for the "digital" bucket is less than 10 AND their `profile.bio_video_url` is null, this action will be added to the checklist.
  3. **Display:** `"Add your 30s Bio Clip (+5 pts) [Go to Profile]"`

* * *

### 6\. Rollout Plan

This feature will be rolled out as part of the CaaS v5.5 epic.

1. **Step 1 (DB):** Deploy `apps/api/migrations/069_add_bio_video_url.sql` (This is part of Phase 1 of the v5.5 rollout).
2. **Step 2 (Backend):** Deploy the updated `TutorCaaSStrategy` logic (part of v5.5 Phase 2).
3. **Step 3 (Frontend Input):** Deploy the updated `TutorProfessionalInfo.tsx` component to allow tutors to add their links.
4. **Step 4 (Frontend Output):** Deploy the updated `ProfileHeroSection.tsx` to display the "Watch Intro" button on public profiles.
5. **Step 5 (Frontend Nudge):** Deploy the updated `CaaSGuidanceWidget.tsx` to include the video in the CaaS checklist (part of v5.5 Phase 5).
6. **Step 6 (Comms):** Send an email campaign to all tutors: "New Feature: Add a 30s Video Intro & Boost Your CaaS Score!".