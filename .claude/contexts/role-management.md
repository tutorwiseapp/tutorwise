# Role Management System Context

## Overview
Tutorwise supports multi-role users who can function as Agents, Tutors, or Clients within the same account. The role management system provides seamless switching between these roles.

## Core Components

### 1. Role Types
```typescript
// packages/shared-types/src/index.ts
export type UserRole = 'agent' | 'provider' | 'seeker';

// Note: 'provider' = Tutor, 'seeker' = Client
// This naming convention aligns with the business model
```

### 2. User Profile Context
**Location**: `apps/web/src/app/contexts/UserProfileContext.tsx`
**Purpose**: Global state management for user roles and profile data

```typescript
interface UserProfileContextType {
  userProfile: UserProfile | null;
  activeRole: UserRole | null;
  setActiveRole: (role: UserRole) => void;
  loading: boolean;
}
```

### 3. Navigation Integration
**Location**: `apps/web/src/app/components/layout/NavMenu.tsx`
**Purpose**: Role switching UI in main navigation

Key Features:
- Dropdown menu with current role display
- Role switching options
- "Become" onboarding links for new roles
- Conditional rendering based on user's available roles

### 4. Role Switcher Component
**Location**: `apps/web/src/app/components/layout/RoleSwitcher.tsx`
**Purpose**: Standalone role switching component

## Role Management Flow

### 1. Initial Role Detection
```typescript
// On app load:
1. Fetch user profile from Supabase
2. Determine available roles for user
3. Set default active role (first available role)
4. Update context state
```

### 2. Role Switching Process
```typescript
// When user clicks role switch:
1. Update activeRole in context
2. Store preference in localStorage/session
3. Trigger UI updates across app
4. Redirect to role-appropriate dashboard
```

### 3. Role-Based Routing
- **Agents**: `/dashboard` with agent-specific features
- **Tutors**: `/dashboard` with tutor-specific features
- **Clients**: `/dashboard` with client-specific features

## Database Schema

### User Roles Table (Supabase)
```sql
-- Users can have multiple roles
user_roles (
  id: uuid,
  user_id: uuid (foreign key),
  role: text ('agent'|'provider'|'seeker'),
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp
)
```

### Profile Enhancement
```sql
-- User profiles with role information
profiles (
  id: uuid,
  user_id: uuid,
  display_name: text,
  active_role: text,
  available_roles: text[],
  -- other profile fields
)
```

## UI Components

### 1. NavMenu Role Display
```tsx
// Current implementation shows:
"Welcome, Michael (Agent)"

// Role switching dropdown shows:
- Switch to Tutor
- Switch to Client
- Become a Tutor (if not already)
```

### 2. Dashboard Customization
Each role sees different dashboard content:
- **Agents**: Client management, commission tracking
- **Tutors**: Session scheduling, student progress
- **Clients**: Tutor search, booking interface

### 3. Conditional Features
```tsx
// Example: Show different navigation based on role
{activeRole === 'agent' && <AgentNavItems />}
{activeRole === 'provider' && <TutorNavItems />}
{activeRole === 'seeker' && <ClientNavItems />}
```

## Business Logic

### 1. Role Onboarding
- New users start as Clients (seekers)
- Can become Agents through application process
- Can become Tutors through verification process
- Each role has different onboarding requirements

### 2. Role Permissions
```typescript
// Permission checking utility
const hasPermission = (role: UserRole, action: string) => {
  const permissions = {
    agent: ['view_commissions', 'manage_clients'],
    provider: ['create_sessions', 'view_students'],
    seeker: ['book_sessions', 'rate_tutors']
  };
  return permissions[role]?.includes(action) || false;
};
```

### 3. Role-Based Pricing
- Different pricing structures per role
- Stripe Connect integration for agent payouts
- Commission calculations for agents

## Implementation Details

### 1. Context Provider Setup
```tsx
// apps/web/src/app/layout.tsx
<UserProfileProvider>
  <Component />
</UserProfileProvider>
```

### 2. Role State Management
```typescript
// Persisted in localStorage for session continuity
const [activeRole, setActiveRole] = useState<UserRole>(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('activeRole') as UserRole || defaultRole;
  }
  return defaultRole;
});
```

### 3. API Integration
```typescript
// Role switching API call
const switchRole = async (newRole: UserRole) => {
  await fetch('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify({ active_role: newRole })
  });
  setActiveRole(newRole);
  localStorage.setItem('activeRole', newRole);
};
```

## Recent Improvements

### 1. NavMenu Integration (September 2025)
- Moved role switching from standalone component to main navigation
- Added "become" onboarding links
- Improved visual consistency with Airbnb-style design
- Fixed font styling and spacing issues

### 2. Dashboard Enhancement
- Updated welcome message format: "Welcome, Michael (Agent)"
- Improved role display in dashboard subtitle
- Better visual hierarchy

## Testing Strategy

### 1. Role Switching Tests
```typescript
// Test role switching functionality
describe('Role Management', () => {
  test('switches roles correctly', () => {
    // Test role switching logic
  });

  test('persists role preference', () => {
    // Test localStorage persistence
  });
});
```

### 2. Permission Tests
```typescript
// Test role-based permissions
describe('Role Permissions', () => {
  test('agent sees commission data', () => {
    // Test agent-specific features
  });
});
```

## Future Enhancements

### 1. Role-Based Notifications
- Different notification types per role
- Role-specific push notification preferences

### 2. Advanced Role Management
- Sub-roles within main roles (e.g., Senior Agent)
- Temporary role delegation
- Role hierarchy and permissions inheritance

### 3. Analytics Integration
- Role-based usage analytics
- Role switching patterns
- Feature adoption per role

This role management system provides a flexible foundation for Tutorwise's multi-role user experience.