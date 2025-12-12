# api-solution-design-v5.1

Here is the revised, foundational API Solution Design, which consolidates all our recent architectural decisions and feature requirements.

* * *

### **Solution Design: Tutorwise Foundational API (v5.1)**

- **Version:** 5.1
- **Date:** 2025-11-14
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Supersedes:** `api-solution-design-v5.3` (now `pencilspaces-solution-design-v5.3`)
- **Prerequisites:** `profile-graph-solution-design-v4.6`, `student-onboarding-solution-design-v5.0`, `api-solution-design-v5.1`, `caas-solution-design-v5.5`

* * *

### 1.0 Executive Summary

This document defines the **foundational API architecture** for the Tutorwise platform. This design formalizes our "Thick Server, Thin Client" model and is the master specification for all backend logic.

Our previous API design (`pencilspaces-solution-design-v5.3`) was a good start for user-facing routes, but the introduction of the **CaaS Engine (v5.5)** and third-party integrations (v5.1, v5.0) requires a more robust, three-pattern architecture.

This API layer is implemented as **Next.js Route Handlers** (serverless functions) co-located with our frontend in `apps/web/src/app/api/...`. It is the single, secure orchestration layer that handles all business logic, validation, and data management.

* * *

### 2.0 Tutorwise API vs. MCP Server: Clarifying the Two Backends

To avoid ambiguity, it is critical to distinguish between our two backend systems:

- **1\. Tutorwise API (This Document)**
  - **Technology:** Next.js Route Handlers (Serverless TypeScript).
  - **Location:** `apps/web/src/app/api/...`
  - **Purpose:** **Real-time, User-Facing "Backend-for-Frontend" (BFF).** It handles immediate user actions, validates their session, and orchestrates database and external API calls.
  - **Security:** Relies on the user's **Session Token** (Supabase Auth Middleware).
  - **Examples:** `POST /api/bookings/[id]/launch`, `POST /api/bookings/assign`.
- **2\. MCP Server (CAS Integration Backend)**
  - **Technology:** Python, FastAPI, Railway.
  - **Purpose:** **Asynchronous, Internal Data API.** It runs heavy, slow background jobs to sync data from external systems (Jira, GitHub, Google) to feed our AI agents and provide raw data for CaaS calculations.
  - **Security:** Relies on **Service-Level Keys** and is **never** called directly by the user.

* * *

### 3.0 The Three-Pattern API Architecture

Our Tutorwise API is built on three distinct architectural patterns, each with its own security model and purpose.

#### Pattern 1: User-Facing API (Real-time)

- **Purpose:** Handles immediate requests from a logged-in user.
- **Security:** Supabase Auth Middleware (validates user's session token).
- **Workflow (ASCII):**
```
[User Browser] --(1) Request w/ Session Token--> [Vercel Edge (Middleware)]
     |                                                |
     |                                        (2) Validate Token (Supabase)
     |                                                |
     |<--(5) Return JSON (data/error)---------- [Next.js Route Handler]
                                                      |
                                              (3) Run Business Logic
                                                      |
                                              (4) Query DB (Supabase)
```
- **Examples:**
  - `POST /api/bookings/[id]/launch`: Securely generates a Lessonspace URL.
  - `POST /api/bookings/assign`: Assigns a student to a booking.
  - `GET /api/links/my-students`: Fetches `GUARDIAN` links from `profile_graph`.
  - `POST /api/profile`: Updates the user's own profile.

#### Pattern 2: Internal Worker API (Asynchronous)

- **Purpose:** Runs slow, heavy, or scheduled jobs (e.g., CaaS calculations). Triggered by Vercel Cron, not a user.
- **Security:** **Cron Secret** (a shared secret `process.env.CRON_SECRET` passed in the `Authorization: Bearer <secret>` header).
- **Workflow (ASCII):**
```
[Vercel Cron] --(1) POST w/ Cron Secret--> [Next.js Route Handler (e.g., /api/caas-worker)]
     |                                          |
     |                                    (2) Verify Secret
     |                                          |
     |                                    (3) Get jobs from `caas_recalculation_queue`
     |                                          |
     |                                    (4) Process jobs (CaaSService.calculate_caas)
     |                                          |
     |<--(5) Return 200 OK -----------------     |
```
- **Examples:**
  - `POST /api/caas-worker`: Processes the CaaS v5.5 recalculation queue.
  - `POST /api/sync/mcp-trigger`: An internal endpoint to tell the MCP server to start a new sync.

#### Pattern 3: Third-Party Webhook API (Ingestion)

- **Purpose:** Receives incoming data from external services (Stripe, Lessonspace, etc.).
- **Security:** **Webhook Signature Verification**. Each endpoint *must* cryptographically verify the request signature.
- **Workflow (ASCII):**
```
[Stripe/Lessonspace] --(1) POST Event w/ Signature--> [Next.js Route Handler (e.g., /api/webhooks/...)]
     |                                                  |
     |                                            (2) Verify Signature (e.g., `stripe.webhooks.constructEvent`)
     |                                                  |
     |                                            (3) Parse body, perform action (e.g., UPDATE bookings SET recording_url=...)
     |                                                  |
     |<--(4) Return 200 OK ---------------------------   |
```
- **Examples:**
  - `POST /api/webhooks/stripe`: Confirms payments.
  - `POST /api/webhooks/lessonspace`: Receives `session.end` event with recording URL.
  - `POST /api/webhooks/pencilspaces`: Receives `session_ended` event with analytics.

* * *

### 4.0 Core Service Layer Dependencies

To keep API routes clean, all business logic will be encapsulated in a `lib/services` directory. The API routes are responsible *only* for Authentication, Validation, and orchestrating these services.

- `ProfileGraphService.ts` **(v4.6):**
  - `getLinkedStudents(userId)`
  - `createGuardianInvite(clientId, email)`
  - `validateLink(guardianId, studentId)`
- `BookingService.ts` **(v5.0):**
  - `assignAttendee(bookingId, clientId, studentId)`
  - `validateAccess(bookingId, userId)`
- `LessonspaceService.ts` **(v5.1):**
  - `launchSpace(booking, user)`
- `CaaSService.ts` **(v5.5):**
  - `calculate_caas(profileId)` (Called by the `caas-worker`)
  - `TutorCaaSStrategy()`, `ClientCaaSStrategy()` (Contain the scoring logic)

* * *

### 5.0 Integration & Impact Analysis

This foundational API design orchestrates all our recent SDDs:

1. **Impact on** `profile-graph-solution-design-v4.6`**:** **Fulfilled.** This API is the official implementation layer for the `profile_graph`. All writes (e.g., `GUARDIAN` links) and reads (e.g., `getLinkedStudents`) are now managed by this secure API.
2. **Impact on** `student-onboarding-solution-design-v5.0`**:** **Enabled.** This API provides the exact endpoints required for the v5.0 feature:
  - `POST /api/links/client-student` (for the invite flow).
  - `GET /api/links/my-students` (for the `My Students` page).
  - `POST /api/bookings/assign` (for the "Assignment Feature").
3. **Impact on** `api-solution-design-v5.1` **(Lessonspace):** **Fulfilled.** The `POST /api/bookings/[id]/launch` route and the `POST /api/webhooks/lessonspace` route are now formally part of our "User-Facing" and "Webhook" patterns.
4. **Impact on** `caas-solution-design-v5.5`**:** **Enabled.** This API provides the "Internal Worker" pattern (`POST /api/caas-worker`) which is the essential trigger for the CaaS engine to process its queue.