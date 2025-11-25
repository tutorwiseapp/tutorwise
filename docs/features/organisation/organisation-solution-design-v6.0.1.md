# organisation-solution-design-v6.0.1

# organisation-solution-design-v6.0.1

### **Solution Design: Organisation & Verification System (v6.0.1)**

- **Version:** 6.0.1 (Agency Fees + Tutor Verification)
- **Date:** 2025-11-25
- **Status:** **APPROVED FOR IMPLEMENTATION**
- **Dependencies:** v4.9 (Financials), v6.0.1 (Org Hub), v010 (Migration)

* * *

### 1.0 Executive Summary

This update introduces two critical layers of maturity to the platform:

1. **Professional Agency Finance:** Allowing agencies to set a "Global Commission Fee" (e.g., 20%) while negotiating secret "Individual Overrides" for specific tutors.
2. **Trust & Verification:** A compliance engine ensuring Tutors are safe and legal (DBS, ID, Proof of Address) before they can be deployed by an Agency or booked by a Client.

* * *

### 2.0 The Professional Agency Financial Model

We distinguish between "Casual Referrers" and "Professional Agencies" using a hierarchical fee logic.

#### 2.1 Data Model Updates

- **Global Fee:** Stored in `connection_groups.settings->'default_commission_rate'`. Defaults to 0%.
- **Individual Override:** Stored in `group_members.commission_rate`.
- **Private Notes:** Stored in `group_members.internal_notes` (For Agency Admin eyes only).

#### 2.2 The Financial Waterfall (RPC Logic)

When a booking occurs for an Agency Tutor, the payment split calculates as follows:

1. **Platform Fee:** Deduct 10% (Fixed).
2. **Agency Commission:**
  - IF `group_members.commission_rate` IS NOT NULL -> Use **Override Rate**.
  - ELSE IF `org.settings.default_commission_rate` > 0 -> Use **Global Rate**.
  - ELSE -> Use **0%** (Tutor keeps remainder).
3. **Tutor Payout:** Remainder.

*Crucial UX:* The Tutor never sees the Agency's configuration screen. They only see their "Net Payout" in the Financials Hub.

* * *

### 3.0 The Verification System (Trust Layer)

To operate as a "Wet Hire" or "Educational" marketplace, we must verify the human asset.

#### 3.1 Verification Fields (Schema v010)

These fields already exist in `profiles` but need UI and Logic:

- `identity_verification_document_url` (Passport/Driving License)
- `address_verification_document_url` (Utility Bill / POA)
- `dbs_certificate_url` (Enhanced Background Check)
- `dbs_certificate_number`
- `verification_status` (Enum: 'unverified', 'pending', 'verified', 'rejected')

#### 3.2 The User Journey

1. **Tutor:** Navigates to **Account > Professional Info**.
2. **Action:** Sees new "Trust & Verification" section.
3. **Upload:** Uploads PDFs/Images for ID, POA, DBS.
4. **Status:** State changes to `Pending Review`.
5. **Admin/Agency:**
  - **Platform Admin:** Can verify ANY user via `/admin/verifications`.
  - **Agency Owner:** Can view/verify *their own* team members via `/organisation/team`.

* * *

### 4.0 UI/UX Specifications

#### 4.1 Organisation Info Tab (`/organisation?tab=info`)

**New Section: "Agency Business Settings"**

- **Input:** "Default Commission Rate (%)" (Number).
- **Toggle:** "Apply to existing members?" (Bulk update logic).
- **Display:** "Public Agency Link" (`tutorwise.io/agency/[slug]`).

#### 4.2 Member Management Modal (`ManageMemberModal`)

- **Trigger:** Click "Manage" on a Tutor row in the Team tab.
- **Fields:**
  - Commission Override (Input, nullable).
  - Internal Notes (Textarea).
  - "Verified Status" (Badge/Toggle for Agency to mark as trusted).

#### 4.3 Professional Info Form (`/account/professional-info`)

**New Section: "Compliance & Verification"**

- **Secure Upload Widgets:**
  - \[Upload Government ID\]
  - \[Upload Proof of Address\]
  - \[Upload DBS Certificate\]
- **Visuals:** Lock icon for privacy. "Only visible to Admins and your Agency."

* * *

### 5.0 Implementation Plan

1. **Database:** Run Migration `094` (Member Overrides).
2. **Backend:** Update `organisation.ts` API to handle settings.
3. **Financials:** Update `create_payment_and_transactions` RPC to read the fee hierarchy.
4. **Frontend:**
  - Update `OrganisationInfoForm.tsx` (Global Fee).
  - Create `ManageMemberModal.tsx` (Overrides).
  - Update `ProfessionalInfoForm.tsx` (Verification Uploads).

* * *