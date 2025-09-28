# Tutorwise Shared Types

TypeScript type definitions and interfaces shared across all Tutorwise applications. This package provides a centralized location for common types used by both the web frontend and API backend.

## Overview

This package contains TypeScript type definitions that ensure type consistency across the Tutorwise monorepo. It includes user types, API response interfaces, and common enums used throughout the platform.

## Installation

This package is automatically available within the Tutorwise monorepo workspace:

```typescript
import { User, ApiResponse, UserRole } from '@tutorwise/shared-types';
```

## Exported Types

### User Types

**User Interface**
```typescript
interface User {
  id: string;
  email: string;
  display_name?: string;
}
```

Basic user information structure used across authentication and profile management.

**UserRole Enum**
```typescript
type UserRole = 'agent' | 'provider' | 'seeker';
```

Defines the three primary user roles in the Tutorwise platform:
- `agent`: Platform administrators and support staff
- `provider`: Tutors and educators offering services
- `seeker`: Students and learners seeking educational services

### API Types

**ApiResponse Interface**
```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

Generic wrapper for API responses that provides consistent error handling and data structure across all endpoints.

**Usage Example:**
```typescript
// API endpoint returns user data
const response: ApiResponse<User> = await fetchUser(id);
if (response.error) {
  console.error('Failed to fetch user:', response.error);
} else {
  console.log('User data:', response.data);
}
```

## Usage Guidelines

### Importing Types

Always import types from the package rather than duplicating definitions:

```typescript
// ✅ Correct
import { User, UserRole } from '@tutorwise/shared-types';

// ❌ Avoid
interface User {
  id: string;
  email: string;
  // ... duplicated definition
}
```

### Type Safety

Use the shared types to ensure consistency between frontend and backend:

```typescript
// Frontend component
interface Props {
  user: User;
  role: UserRole;
}

// API endpoint
function updateUser(userData: User): ApiResponse<User> {
  // Implementation
}
```

### Extending Types

When you need additional properties, extend the shared types:

```typescript
import { User } from '@tutorwise/shared-types';

interface ExtendedUser extends User {
  lastLogin?: Date;
  preferences: UserPreferences;
}
```

## Development

### Adding New Types

1. **Define the type** in `src/index.ts`
2. **Export the type** from the main index file
3. **Document the type** in this README
4. **Update applications** that use the new type

### Type Naming Conventions

- Use PascalCase for interfaces and types
- Use descriptive names that indicate the domain
- Prefix with the module name for specificity when needed

```typescript
// Good examples
interface User { }
interface LessonBooking { }
interface PaymentMethod { }
type UserRole = 'agent' | 'provider' | 'seeker';

// Avoid generic names
interface Data { }
interface Item { }
```

### Testing Types

While types don't require runtime tests, ensure they work correctly:

```typescript
// Type testing example
const user: User = {
  id: '123',
  email: 'test@example.com',
  display_name: 'Test User'
};

const response: ApiResponse<User[]> = {
  data: [user],
  error: undefined
};
```

## Best Practices

### Consistency

- Always use shared types instead of duplicating definitions
- Keep type definitions focused and single-purpose
- Use composition over inheritance when possible

### Documentation

- Document complex types with JSDoc comments
- Provide usage examples for non-obvious types
- Keep this README updated when adding new types

### Backward Compatibility

- Avoid breaking changes to existing types
- Use optional properties for new fields
- Version the package when making breaking changes

```typescript
// Adding new optional field (non-breaking)
interface User {
  id: string;
  email: string;
  display_name?: string;
  created_at?: string; // New optional field
}

// Breaking change (requires version bump)
interface User {
  userId: string; // Changed from 'id' to 'userId'
  email: string;
  display_name?: string;
}
```

## Integration

### Web Application

The web application imports and uses these types throughout:

```typescript
// In React components
import { User, UserRole } from '@tutorwise/shared-types';

const UserProfile: React.FC<{ user: User; role: UserRole }> = ({ user, role }) => {
  return (
    <div>
      <h1>{user.display_name || user.email}</h1>
      <p>Role: {role}</p>
    </div>
  );
};
```

### API Backend

The FastAPI backend uses these types for request/response validation:

```python
# Python equivalent types (manually maintained)
from typing import TypedDict, Literal, Optional

class User(TypedDict):
    id: str
    email: str
    display_name: Optional[str]

UserRole = Literal['agent', 'provider', 'seeker']
```

## Maintenance

### Regular Reviews

- Review types quarterly for accuracy and completeness
- Remove unused types to keep the package clean
- Update documentation when types change

### Version Management

This package follows semantic versioning:
- **Patch** (1.0.x): Bug fixes, documentation updates
- **Minor** (1.x.0): New types, non-breaking additions
- **Major** (x.0.0): Breaking changes to existing types

## Support

For questions about shared types:
- Check existing type definitions in `src/index.ts`
- Review usage examples in application code
- Follow TypeScript best practices for type definitions
- Refer to monorepo documentation for development guidelines

This package ensures type consistency and safety across the entire Tutorwise platform.