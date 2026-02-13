# Tutorwise Admin Dashboard Documentation

**Document Version**: 1.0
**Last Updated**: 2026-01-14
**Purpose**: Comprehensive documentation of the 12 admin dashboard sections
**Status**: Production-ready (100% complete)

---

## 📊 **Admin Dashboard Overview**

The Tutorwise Admin Dashboard provides comprehensive platform management capabilities across 12 specialized sections. Each section follows the **HubComplexModal pattern** for consistent user experience and maintainability.

### **Platform Statistics (Jan 2026)**
- **12 Admin Sections**: Fully implemented and production-ready
- **Standardized Pattern**: HubComplexModal for all detail views
- **GDPR Compliance**: Soft delete (PII anonymization) + hard delete (complete purge)
- **Audit Logging**: Complete action tracking across all sections
- **Admin Roles**: Superadmin, Admin, System Admin, Support Admin

---

## 🏗️ **Architecture Overview**

### **HubComplexModal Pattern**

Every admin section follows this standardized pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Section Page                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. HubPageLayout                                          │
│     ├── HubHeader (title, subtitle, actions)               │
│     ├── HubTabs (filtering tabs)                           │
│     ├── HubSidebar (stats widgets, help, tips)             │
│     └── HubContent                                          │
│         ├── Filters (search, status, date range)           │
│         ├── Actions (bulk operations, export)              │
│         └── DataTable (paginated list)                     │
│             └── Row click → Opens HubComplexModal          │
│                                                             │
│  2. HubComplexModal (detail view)                          │
│     ├── Modal Header (title, close button)                 │
│     ├── Modal Tabs (Overview, Details, Actions, etc.)      │
│     ├── Modal Content (tab-specific data)                  │
│     └── Modal Actions (Edit, Delete, Archive, etc.)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Common Features Across All Sections**

✅ **List View**:
- Paginated data table with sortable columns
- Advanced filtering (status, date range, search)
- Bulk operations (export, archive, delete)
- Real-time data updates with React Query
- Empty states for no data

✅ **Detail Modal**:
- Tabbed interface for organized information
- Inline editing capabilities
- Related data views
- Action buttons (edit, delete, archive)
- Loading states and error handling

✅ **Data Management**:
- Soft delete (deactivate + PII anonymization)
- Hard delete (complete purge + Stripe cleanup for users)
- Export to CSV/JSON
- Search and filter
- Pagination

✅ **Security**:
- Role-based access control (RBAC)
- Row-Level Security (RLS) enforcement
- Audit logging for all actions
- GDPR compliance (data deletion, PII handling)

---

## 📋 **12 Admin Dashboard Sections**

### **1. Dashboard (Overview)** 📊
**Route**: `/admin`
**Status**: Production-ready ✅

**Purpose**: Central hub providing platform-wide statistics and quick access to key functions

**Features**:
- Real-time platform statistics
  - Total users count
  - Active listings count
  - Recent bookings (last 30 days)
  - Pending moderation items
  - Platform revenue (completed bookings)
- Activity feed (recent actions across platform)
- Alerts and notifications
- Quick action buttons (Settings, Reports, User Management, SEO)
- Stats widgets with live data

**Tabs**:
- **Dashboard**: Platform statistics overview
- **Activity**: Recent platform activity feed
- **Alerts**: System alerts and notifications

**Data Sources**:
- `users` table (total users)
- `listings` table (active listings)
- `bookings` table (recent bookings, revenue)
- `reviews` table (pending moderation)

**Key Components**:
- `AdminStatsWidget` - Real-time statistics cards
- `AdminActivityWidget` - Activity feed
- `AdminHelpWidget` - Help and documentation links
- `AdminTipWidget` - Best practices and tips
- `AdminVideoWidget` - Tutorial videos

---

### **2. SEO Hub** 🔍
**Route**: `/admin/seo`
**Status**: Production-ready ✅

**Purpose**: Comprehensive SEO management for hub-spoke architecture, keywords, backlinks, and citations

**Features**:
- Hub pages management (location-based landing pages)
- Spoke pages management (service-specific pages)
- Keyword tracking and optimization
- Backlink monitoring
- Citation management (local SEO)
- SEO templates (metadata, schema)
- Configuration settings (robots.txt, sitemaps)

**Sub-sections**:
1. **Overview** (`/admin/seo`) - SEO performance dashboard
2. **Hubs** (`/admin/seo/hubs`) - Hub page management
3. **Spokes** (`/admin/seo/spokes`) - Spoke page management
4. **Keywords** (`/admin/seo/keywords`) - Keyword tracking
5. **Backlinks** (`/admin/seo/backlinks`) - Backlink monitoring
6. **Citations** (`/admin/seo/citations`) - Local citation management
7. **Templates** (`/admin/seo/templates`) - SEO metadata templates
8. **Configuration** (`/admin/seo/config`) - SEO settings
9. **Settings** (`/admin/seo/settings`) - Advanced SEO configuration

**Data Tables**:
- `seo_hubs` - Hub pages (locations)
- `seo_spokes` - Spoke pages (services)
- `seo_keywords` - Tracked keywords
- `seo_backlinks` - Backlink monitoring
- `seo_citations` - Local citations

**Key Metrics**:
- SEO score per page
- Keyword rankings
- Backlink quality and quantity
- Citation consistency

---

### **3. Accounts Hub** 👥
**Route**: `/admin/accounts`
**Status**: Production-ready ✅

**Purpose**: User and admin account management with GDPR-compliant deletion

**Features**:
- User account management (all roles: Tutor, Client, Agent, Organisation Owner)
- Admin account management (admin role assignment)
- Soft delete (deactivate + PII anonymization)
- Hard delete (complete purge + Stripe cleanup)
- User profile viewing and editing
- Role changes and permissions
- Account verification status
- Login history and security logs

**Sub-sections**:
1. **Users** (`/admin/accounts/users`) - All platform users
2. **Admins** (`/admin/accounts/admins`) - Admin accounts

**Data Tables**:
- `users` - User accounts and authentication
- `user_profiles` - User profile data
- `tutor_profiles` - Tutor-specific data
- `client_profiles` - Client-specific data
- `agent_profiles` - Agent-specific data
- `organisation_profiles` - Organisation data

**Soft Delete Process**:
1. Set `status = 'deactivated'`
2. Anonymize PII fields:
   - `email` → `deleted_user_[id]@deleted.com`
   - `full_name` → `Deleted User [id]`
   - Clear phone, address, profile photo
3. Preserve data for analytics (anonymized)
4. User cannot log in

**Hard Delete Process (GDPR Right to be Forgotten)**:
1. Delete from Supabase Auth: `supabase.auth.admin.deleteUser(userId)`
2. Delete Stripe Customer (if exists):
   ```typescript
   if (profile.stripe_customer_id) {
     await stripe.customers.del(profile.stripe_customer_id);
   }
   ```
3. Cascade delete from all tables (foreign keys)
4. Log action in audit table
5. Complete data removal (no recovery)

**Key Metrics**:
- Total users by role
- Active vs inactive accounts
- Verification status
- Account age distribution

---

### **4. Forms Hub** 📝
**Route**: `/admin/forms`
**Status**: Production-ready ✅

**Purpose**: Manage form configurations across 9 forms × 3 roles = 27 contexts using Shared Fields system

**Features**:
- Form configuration management (9 forms)
- Field visibility and requirement settings per context
- Shared Fields integration (23 global fields)
- Context-specific field customization
- Field ordering and grouping
- Validation rules management
- Form preview for each context

**9 Forms Managed**:
1. Personal Information Form
2. Professional Details Form
3. Tutor Services Form
4. Preferences Form
5. Qualifications Form
6. Availability Form
7. Communication Form
8. Emergency Contact Form
9. Organisation Settings Form

**3 Roles**:
- Tutor
- Client
- Agent

**Form Contexts** (9 contexts):
1. **Onboarding Forms** (3): Tutor/Client/Agent onboarding
2. **Account Forms** (3): Tutor/Client/Agent account settings
3. **Organisation Forms** (3): Tutor/Client/Agent organisation settings

**Configuration Options per Field**:
- `isRequired`: Whether field is required for this context
- `isEnabled`: Whether field is shown for this context
- `displayOrder`: Field position in form
- `customLabel`: Override default field label
- `customHelpText`: Override default help text
- `validationRules`: Context-specific validation

**Data Tables**:
- `shared_fields` - 23 global field definitions
- `form_config` - 106 context mappings (field × context)

**Shared Fields Architecture**:
```
23 Global Fields (shared_fields)
        ↓
106 Context Mappings (form_config)
        ↓
9 Form Contexts (Onboarding/Account/Org × Tutor/Client/Agent)
```

**Example Form Config Management**:
```typescript
// Enable "subject_specializations" field for Tutor Onboarding
{
  formType: 'onboarding',
  userRole: 'tutor',
  fieldId: 'subject_specializations_id',
  isRequired: true,
  isEnabled: true,
  displayOrder: 3,
  customLabel: 'What subjects do you teach?',
  customHelpText: 'Select all subjects you are qualified to teach'
}
```

---

### **5. Organisations Hub** 🏢
**Route**: `/admin/organisations`
**Status**: Production-ready ✅

**Purpose**: Manage organisations (schools, tutoring centers, agencies)

**Features**:
- Organisation profile management
- Member management (add/remove users)
- Organisation verification
- Subscription and billing management
- Organisation settings configuration
- Organisation statistics (members, listings, bookings)
- Organisation type categorization

**Data Tables**:
- `organisation_profiles` - Organisation details
- `organisation_members` - Organisation memberships
- `organisation_settings` - Organisation configurations

**Organisation Types**:
- School
- Tutoring Center
- Agency
- Other

**Key Metrics**:
- Total organisations
- Active vs inactive
- Average members per organisation
- Organisation revenue contribution

**Detail Modal Tabs**:
1. **Overview**: Basic info, status, verification
2. **Members**: Organisation members list
3. **Listings**: Organisation's service listings
4. **Bookings**: Organisation's bookings
5. **Financials**: Revenue, payouts, subscriptions
6. **Settings**: Organisation configuration
7. **Actions**: Edit, deactivate, delete

---

### **6. Listings Hub** 📚
**Route**: `/admin/listings`
**Status**: Production-ready ✅

**Purpose**: Manage all service listings (tutor services, tutoring centers, agencies)

**Features**:
- Listing approval and moderation
- Listing status management (active, pending, rejected, archived)
- Listing editing and updates
- Listing analytics (views, clicks, bookings)
- Listing verification
- Bulk operations (approve, reject, archive)

**Listing Statuses**:
- `pending`: Awaiting admin review
- `active`: Live on platform
- `rejected`: Not approved
- `archived`: Hidden but preserved
- `draft`: Incomplete submission

**Data Tables**:
- `listings` - Service listings
- `listing_subjects` - Subjects taught
- `listing_availability` - Tutor availability

**Key Metrics**:
- Total listings by status
- Pending approvals
- Average listing views
- Conversion rate (views → bookings)

**Detail Modal Tabs**:
1. **Overview**: Basic info, status, tutor
2. **Details**: Full listing content
3. **Subjects**: Subjects and grade levels
4. **Availability**: Tutor availability schedule
5. **Analytics**: Views, clicks, bookings
6. **Reviews**: Reviews for this listing
7. **Actions**: Approve, reject, edit, archive

---

### **7. Bookings Hub** 📅
**Route**: `/admin/bookings`
**Status**: Production-ready ✅

**Purpose**: Manage all platform bookings and scheduling

**Features**:
- Booking status management
- Booking cancellations and refunds
- Booking dispute resolution
- Booking analytics (volume, revenue, trends)
- Bulk operations (cancel, refund)

**Booking Statuses**:
- `pending`: Awaiting tutor confirmation
- `confirmed`: Confirmed by tutor
- `completed`: Lesson completed
- `cancelled`: Cancelled by user or tutor
- `disputed`: Dispute raised

**Data Tables**:
- `bookings` - Booking records
- `booking_sessions` - Individual session details
- `booking_cancellations` - Cancellation records

**Key Metrics**:
- Total bookings by status
- Booking volume trends
- Average booking value
- Cancellation rate
- Completion rate

**Detail Modal Tabs**:
1. **Overview**: Basic info, status, participants
2. **Sessions**: Session schedule and details
3. **Payment**: Payment status, amount, refunds
4. **Communications**: Messages between parties
5. **Issues**: Disputes, cancellations, problems
6. **Actions**: Cancel, refund, resolve dispute

---

### **8. Referrals Hub** 🔗
**Route**: `/admin/referrals`
**Status**: Production-ready ✅

**Purpose**: Manage referral program (Phases 1-3 complete)

**Features**:
- Referral tracking (referrer, referred, conversions)
- Referral code management
- Reward distribution (credits, bonuses)
- Referral campaign management
- Leaderboards and analytics
- Tiered reward system

**Referral Phases**:
- **Phase 1**: Foundation (code generation, tracking)
- **Phase 2**: Rewards (credit system, automated distribution)
- **Phase 3**: Advanced (tiered rewards, leaderboards, campaigns)

**Data Tables**:
- `referrals` - Referral records
- `referral_codes` - Generated referral codes
- `referral_rewards` - Reward distribution history
- `referral_campaigns` - Marketing campaigns

**Key Metrics**:
- Total referrals
- Conversion rate (referred → registered)
- Total rewards distributed
- Top referrers (leaderboard)
- Campaign performance

**Detail Modal Tabs**:
1. **Overview**: Referral details, status, participants
2. **Rewards**: Reward amount, distribution status
3. **Campaign**: Associated campaign details
4. **Activity**: Referral activity timeline
5. **Actions**: Approve reward, edit, cancel

---

### **9. Reviews Hub** ⭐
**Route**: `/admin/reviews`
**Status**: Production-ready ✅

**Purpose**: Moderate and manage reviews and ratings

**Features**:
- Review moderation (approve, reject, flag)
- Inappropriate content flagging
- Review responses management (tutor replies)
- Review analytics (average ratings, sentiment)
- Bulk moderation operations

**Review Statuses**:
- `pending`: Awaiting moderation
- `approved`: Live on platform
- `rejected`: Removed for policy violation
- `flagged`: Flagged for review

**Data Tables**:
- `reviews` - Review records
- `review_flags` - Flagged reviews
- `review_responses` - Tutor responses to reviews

**Key Metrics**:
- Total reviews by status
- Pending moderation count
- Average platform rating
- Flag rate (flagged / total)
- Response rate (tutors responding)

**Detail Modal Tabs**:
1. **Overview**: Review content, rating, author
2. **Listing**: Associated listing details
3. **Booking**: Related booking (if applicable)
4. **Response**: Tutor response (if exists)
5. **Flags**: Flags and reports
6. **Actions**: Approve, reject, flag, remove

**Moderation Guidelines**:
- Check for policy violations
- Verify review authenticity
- Ensure constructive feedback
- Remove personal attacks
- Maintain platform quality standards

---

### **10. Financials Hub** 💰
**Route**: `/admin/financials`
**Status**: Production-ready ✅

**Purpose**: Manage payments, payouts, and financial operations

**Features**:
- Transaction monitoring (all payments)
- Payout management (tutor payments)
- Dispute resolution (payment disputes)
- Commission tracking
- Revenue analytics
- Stripe integration management

**Sub-sections**:
1. **Transactions** (`/admin/financials`) - All platform transactions
2. **Payouts** (`/admin/financials/payouts`) - Tutor payout management
3. **Disputes** (`/admin/financials/disputes`) - Payment dispute resolution

**Data Tables**:
- `payments` - Payment records
- `payouts` - Payout records
- `payment_disputes` - Dispute records
- `stripe_webhook_events` - Stripe webhook logs

**Key Metrics**:
- Total revenue (lifetime)
- Monthly recurring revenue (MRR)
- Average transaction value
- Commission earned
- Pending payouts
- Dispute rate

**Transaction Statuses**:
- `pending`: Payment initiated
- `processing`: Being processed by Stripe
- `succeeded`: Payment successful
- `failed`: Payment failed
- `refunded`: Payment refunded
- `disputed`: Dispute raised

**Payout Statuses**:
- `pending`: Awaiting payout
- `processing`: Being processed
- `paid`: Payout complete
- `failed`: Payout failed

**Detail Modal Tabs**:
1. **Overview**: Transaction/payout details, status
2. **Parties**: Payer, payee, platform
3. **Breakdown**: Amount, fees, commission
4. **Stripe**: Stripe metadata, IDs, events
5. **Disputes**: Dispute details (if applicable)
6. **Actions**: Refund, retry payout, resolve dispute

---

### **11. Configurations Hub** ⚙️
**Route**: `/admin/configurations`
**Status**: Production-ready ✅

**Purpose**: Manage platform-wide configuration settings

**Features**:
- Platform settings (name, logo, branding)
- Feature flags (enable/disable features)
- Email templates management
- Notification settings
- API keys and integrations
- Rate limiting configuration
- Platform maintenance mode

**Configuration Categories**:
1. **Platform Settings**: Name, logo, URL, branding
2. **Feature Flags**: Enable/disable features per role
3. **Email Templates**: Transactional email content
4. **Notifications**: Email, SMS, push notification settings
5. **Integrations**: Stripe, Google OAuth, Jira, etc.
6. **Security**: Rate limits, CORS, API keys
7. **Maintenance**: Maintenance mode, system messages

**Data Tables**:
- `platform_settings` - Platform configuration
- `feature_flags` - Feature toggles
- `email_templates` - Email templates
- `notification_settings` - Notification preferences

**Key Configuration Options**:
- Platform name and branding
- Default commission rates
- Booking cancellation policies
- Review moderation rules
- Email notification triggers
- Referral reward amounts
- Payment processing settings

**Detail Modal Tabs**:
1. **Overview**: Setting name, description, value
2. **History**: Configuration change history
3. **Impact**: Features/users affected by setting
4. **Actions**: Edit value, reset to default

---

### **12. Settings Hub** 🛠️
**Route**: `/admin/settings`
**Status**: Production-ready ✅

**Purpose**: Admin-specific settings and preferences

**Features**:
- Admin account settings (profile, password)
- Admin role management (assign/revoke admin roles)
- Admin permissions configuration
- Notification preferences (admin alerts)
- Session management
- Two-factor authentication (2FA)
- Admin activity logs

**Admin Roles**:
- **Superadmin**: Full platform access
- **Admin**: Standard admin access
- **System Admin**: Technical/infrastructure access
- **Support Admin**: Customer support access

**Admin Permissions**:
- User management (view, edit, delete)
- Content moderation (approve, reject)
- Financial operations (refunds, payouts)
- Platform configuration (settings, feature flags)
- SEO management (hubs, spokes, keywords)

**Data Tables**:
- `users` (with `admin_role` field)
- `admin_permissions` - Granular permission assignments
- `admin_sessions` - Active admin sessions
- `admin_activity_logs` - Admin action logs

**Detail Modal Tabs**:
1. **Profile**: Admin account details
2. **Permissions**: Role-based permissions
3. **Activity**: Recent admin actions
4. **Sessions**: Active sessions
5. **Security**: 2FA, password settings
6. **Actions**: Edit profile, change password, logout all sessions

---

## 🔐 **Security & Compliance**

### **Row-Level Security (RLS)**
Every admin section enforces RLS policies:
```sql
-- Example: Only admins can view admin tables
CREATE POLICY "Admin access only"
ON admin_settings
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id
    FROM user_profiles
    WHERE admin_role IN ('superadmin', 'admin', 'systemadmin', 'supportadmin')
  )
);
```

### **GDPR Compliance**

**Soft Delete** (User deactivation):
- Status set to `deactivated`
- PII anonymized but data preserved for analytics
- User cannot log in
- Reversible operation

**Hard Delete** (Right to be Forgotten):
- Complete data removal
- Stripe customer deletion
- Cascade delete from all tables
- Audit log entry created
- Irreversible operation

### **Audit Logging**
All admin actions are logged:
```typescript
interface AdminActionLog {
  id: string;
  admin_id: string;
  action: 'view' | 'create' | 'update' | 'delete' | 'approve' | 'reject';
  resource_type: 'user' | 'listing' | 'booking' | 'review' | 'organisation';
  resource_id: string;
  changes: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}
```

**Logged Actions**:
- User account changes (edit, delete, role changes)
- Listing approvals/rejections
- Booking cancellations
- Review moderation
- Financial operations (refunds, payouts)
- Configuration changes
- Admin role assignments

---

## 🛠️ **Technical Implementation**

### **File Structure**
```
apps/web/src/app/(admin)/admin/
├── page.tsx                    # Dashboard overview
├── layout.tsx                  # Admin layout wrapper
├── accounts/
│   ├── users/
│   │   └── page.tsx           # Users management
│   └── admins/
│       └── page.tsx           # Admins management
├── listings/
│   └── page.tsx               # Listings hub
├── bookings/
│   └── page.tsx               # Bookings hub
├── referrals/
│   └── page.tsx               # Referrals hub
├── organisations/
│   └── page.tsx               # Organisations hub
├── financials/
│   ├── page.tsx               # Transactions
│   ├── payouts/
│   │   └── page.tsx          # Payouts
│   └── disputes/
│       └── page.tsx          # Disputes
├── reviews/
│   └── page.tsx               # Reviews hub
├── seo/
│   ├── page.tsx               # SEO overview
│   ├── hubs/
│   ├── spokes/
│   ├── keywords/
│   ├── backlinks/
│   ├── citations/
│   ├── templates/
│   ├── config/
│   └── settings/
├── configurations/
│   └── page.tsx               # Platform configurations
└── settings/
    └── page.tsx               # Admin settings
```

### **Shared Components**
```
apps/web/src/app/components/
├── admin/
│   ├── sidebar/
│   │   └── AdminSidebar.tsx  # Admin navigation
│   ├── widgets/
│   │   ├── AdminStatsWidget.tsx
│   │   ├── AdminActivityWidget.tsx
│   │   ├── AdminHelpWidget.tsx
│   │   ├── AdminTipWidget.tsx
│   │   └── AdminVideoWidget.tsx
│   └── modals/
│       └── HubComplexModal.tsx  # Standardized detail modal
└── hub/
    ├── layout/
    │   ├── HubPageLayout.tsx
    │   ├── HubHeader.tsx
    │   └── HubTabs.tsx
    ├── sidebar/
    │   └── HubSidebar.tsx
    ├── content/
    │   ├── HubContent.tsx
    │   ├── HubTable.tsx
    │   └── HubEmptyState.tsx
    └── styles/
        ├── hub-filters.module.css
        ├── hub-actions.module.css
        └── hub-table.module.css
```

### **API Endpoints**
```
/api/admin/
├── accounts/
│   ├── users/               # GET, POST, DELETE users
│   ├── [id]/                # GET, PATCH, DELETE user
│   └── [id]/soft-delete/    # POST soft delete user
├── listings/                # GET, POST listings
├── bookings/                # GET, POST bookings
├── referrals/               # GET, POST referrals
├── organisations/           # GET, POST organisations
├── financials/
│   ├── transactions/        # GET transactions
│   ├── payouts/             # GET, POST payouts
│   └── disputes/            # GET, PATCH disputes
├── reviews/                 # GET, POST reviews
├── seo/
│   ├── hubs/                # GET, POST SEO hubs
│   ├── spokes/              # GET, POST SEO spokes
│   └── keywords/            # GET, POST keywords
├── configurations/          # GET, PATCH configurations
└── settings/                # GET, PATCH admin settings
```

### **Database Tables (Admin-specific)**
```sql
-- Admin roles and permissions
admin_roles (user_id, role, permissions)
admin_permissions (role, resource, actions)
admin_sessions (session_id, admin_id, ip_address, expires_at)
admin_activity_logs (id, admin_id, action, resource_type, resource_id, changes, created_at)

-- Platform configuration
platform_settings (key, value, type, description)
feature_flags (feature_name, enabled, roles, created_at)
email_templates (template_name, subject, body, variables)
notification_settings (type, enabled, recipients)
```

---

## 📊 **Admin Analytics & Reporting**

### **Dashboard Statistics**
Real-time metrics displayed on admin dashboard:

```typescript
interface PlatformStats {
  totalUsers: number;           // All registered users
  activeListings: number;       // Listings with status='active'
  recentBookings: number;       // Bookings in last 30 days
  pendingModeration: number;    // Reviews awaiting approval
  platformRevenue: number;      // Sum of completed booking payments
  activeOrganisations: number;  // Active organisations
  pendingPayouts: number;       // Payouts awaiting processing
  disputedTransactions: number; // Transactions with disputes
}
```

### **Section-Specific Metrics**
Each hub provides relevant analytics:

- **Accounts**: User growth, role distribution, verification rate
- **Listings**: Approval rate, average views, conversion rate
- **Bookings**: Volume trends, cancellation rate, average value
- **Referrals**: Conversion rate, top referrers, reward distribution
- **Reviews**: Average rating, moderation rate, response rate
- **Financials**: Revenue trends, payout velocity, dispute rate

---

## 🚀 **Common Admin Workflows**

### **1. Approve New Listing**
```
1. Navigate to /admin/listings
2. Filter by status = 'pending'
3. Click listing row to open HubComplexModal
4. Review listing details in 'Details' tab
5. Check subjects and availability
6. Click 'Approve' button
7. Listing status changes to 'active'
8. Tutor receives approval notification
```

### **2. Moderate Review**
```
1. Navigate to /admin/reviews
2. Filter by status = 'pending'
3. Click review row to open HubComplexModal
4. Read review content in 'Overview' tab
5. Check for policy violations
6. Click 'Approve' or 'Reject' button
7. If rejected, provide reason
8. Review status updates
9. User receives notification
```

### **3. Soft Delete User (GDPR Deactivation)**
```
1. Navigate to /admin/accounts/users
2. Search for user by email or name
3. Click user row to open HubComplexModal
4. Review user data in 'Overview' tab
5. Click 'Soft Delete' button in 'Actions' tab
6. Confirm action in dialog
7. System anonymizes PII:
   - email → deleted_user_[id]@deleted.com
   - full_name → Deleted User [id]
   - Clear phone, address, photo
8. User status → 'deactivated'
9. User cannot log in
10. Data preserved for analytics (anonymized)
```

### **4. Hard Delete User (GDPR Right to be Forgotten)**
```
1. Navigate to /admin/accounts/users
2. Search for user
3. Open HubComplexModal
4. Click 'Hard Delete' button
5. Confirm PERMANENT deletion (warning dialog)
6. System executes:
   a. Delete from Supabase Auth
   b. Delete Stripe Customer (if exists)
   c. Cascade delete from all tables
   d. Create audit log entry
7. User completely removed (no recovery)
```

### **5. Process Refund**
```
1. Navigate to /admin/financials
2. Find transaction to refund
3. Open HubComplexModal
4. Review transaction details
5. Click 'Refund' button in 'Actions' tab
6. Enter refund amount (partial or full)
7. Provide refund reason
8. Confirm refund
9. Stripe processes refund
10. Booking status updated
11. Both parties notified
```

### **6. Configure Form Fields**
```
1. Navigate to /admin/forms
2. Select form type (e.g., 'Onboarding')
3. Select user role (e.g., 'Tutor')
4. View current field configuration
5. Click field to edit:
   - Toggle isRequired
   - Toggle isEnabled
   - Change displayOrder
   - Customize label
   - Customize help text
6. Save changes
7. Form updates for all new submissions
8. Existing submissions unchanged
```

---

## 🔍 **Search & Filter Capabilities**

### **Global Search**
Available in all admin sections:
```typescript
interface SearchFilters {
  query: string;           // Text search (name, email, ID)
  status: string[];        // Filter by status (multiple)
  dateFrom: Date;          // Date range start
  dateTo: Date;            // Date range end
  role: string[];          // Filter by user role
  sortBy: string;          // Sort column
  sortOrder: 'asc' | 'desc'; // Sort direction
  page: number;            // Pagination page
  limit: number;           // Items per page (10, 25, 50, 100)
}
```

### **Section-Specific Filters**

**Accounts**:
- Role (Tutor, Client, Agent, Org Owner)
- Status (active, deactivated)
- Verification status
- Registration date range

**Listings**:
- Status (pending, active, rejected, archived)
- Subjects taught
- Grade levels
- Location/region
- Creation date range

**Bookings**:
- Status (pending, confirmed, completed, cancelled, disputed)
- Date range (booking date)
- Tutor/Client
- Payment status

**Reviews**:
- Status (pending, approved, rejected, flagged)
- Rating (1-5 stars)
- Flagged vs not flagged
- With/without responses

**Financials**:
- Transaction type (payment, payout, refund)
- Status (pending, succeeded, failed)
- Amount range
- Date range

---

## 📱 **Responsive Design**

All admin sections are optimized for:
- **Desktop** (primary): Full feature set, multi-column layouts
- **Tablet**: Adapted layouts, collapsible sidebars
- **Mobile**: Stacked layouts, simplified tables, touch-optimized

**Mobile-Specific Adaptations**:
- Sidebar collapses to hamburger menu
- Tables switch to card view
- Filters collapse to dropdown
- Actions menu becomes bottom sheet
- Modals become full-screen

---

## 🎨 **Design System**

### **Color Coding**
Consistent color scheme across all sections:
- **Primary Blue**: Action buttons, links
- **Green**: Success states (approved, completed)
- **Yellow**: Warning states (pending, flagged)
- **Red**: Error states (rejected, failed)
- **Gray**: Neutral states (archived, inactive)

### **Typography**
- **Headers**: SF Pro Display, 24-32px, bold
- **Subheaders**: SF Pro Display, 18-20px, semibold
- **Body**: SF Pro Text, 14-16px, regular
- **Captions**: SF Pro Text, 12-14px, regular

### **Spacing**
- **Section padding**: 24px
- **Card padding**: 16px
- **Element spacing**: 8px, 16px, 24px (multiples of 8)

---

## 🧪 **Testing Coverage**

### **Unit Tests**
- Component rendering
- Data fetching logic
- Filter and search functionality
- Modal interactions

### **Integration Tests**
- API endpoint responses
- Database query accuracy
- Role-based access control
- Audit logging

### **E2E Tests (Playwright)**
```typescript
// Example E2E test for listing approval
test('Admin can approve pending listing', async ({ page }) => {
  await page.goto('/admin/listings?status=pending');
  await page.click('tr:first-child'); // Click first row
  await page.waitForSelector('[data-modal="listing-detail"]');
  await page.click('button:has-text("Approve")');
  await page.waitForSelector('text=Listing approved successfully');
  // Verify listing status changed
  const status = await page.textContent('[data-field="status"]');
  expect(status).toBe('active');
});
```

---

## 📚 **References**

### **Related Documentation**
- [PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md) - Section on Admin Dashboard
- [PATTERNS.md](.ai/PATTERNS.md) - HubComplexModal pattern
- [SHARED-FIELDS.md](.ai/SHARED-FIELDS.md) - Forms Hub integration

### **Code Locations**
- Admin pages: `apps/web/src/app/(admin)/admin/`
- Admin components: `apps/web/src/app/components/admin/`
- Hub components: `apps/web/src/app/components/hub/`
- API routes: `apps/web/src/app/api/admin/`
- Database migrations: `tools/database/migrations/`

### **Key Migrations**
- `001_create_users_table.sql` - User accounts
- `050_create_admin_tables.sql` - Admin roles and permissions
- `100_create_audit_logs.sql` - Audit logging
- `150_create_platform_settings.sql` - Platform configuration

---

*This documentation covers all 12 admin dashboard sections with comprehensive implementation details, workflows, and technical specifications.*

**Last Updated**: 2026-01-14
**Maintained By**: Platform Architecture Team
**Status**: Production-ready (100% complete)
