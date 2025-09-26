# Tutorwise Code Patterns & Conventions

## 🏗️ **Project Structure Patterns**

### Directory Organization
```
src/
├── app/                    # Next.js 13+ App Router
│   ├── (auth)/            # Route groups for auth pages
│   ├── (dev)/             # Development-only routes
│   ├── agents/[agentId]/  # Dynamic routes with parameters
│   ├── components/        # Page-specific components
│   ├── contexts/          # React Context providers
│   └── api/               # API routes
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components (Header, Container)
│   └── forms/            # Form components
├── lib/                  # Utility functions and configurations
├── types/                # TypeScript type definitions
└── styles/               # Global styles and CSS modules
```

### Naming Conventions
- **Files**: PascalCase for components (`UserProfile.tsx`), camelCase for utilities (`formatDate.ts`)
- **Components**: PascalCase (`<StatusBadge />`)
- **Variables**: camelCase (`isLoading`, `userProfile`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **CSS Modules**: camelCase (`styles.cardContainer`)

## 🧩 **Component Patterns**

### Standard Component Structure
```typescript
'use client';

import { useState, useEffect } from 'react';
import styles from './ComponentName.module.css';

interface ComponentProps {
  // Props with clear types
  title: string;
  isVisible?: boolean;
  onAction?: () => void;
}

export default function ComponentName({ title, isVisible = true, onAction }: ComponentProps) {
  // State declarations
  const [loading, setLoading] = useState(false);

  // Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // Event handlers
  const handleClick = () => {
    // Handler logic
    onAction?.();
  };

  // Early returns for loading/error states
  if (!isVisible) return null;

  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      {/* Component JSX */}
    </div>
  );
}
```

### UI Component Patterns
- **Button**: Variant-based (`primary`, `secondary`)
- **Card**: Container with consistent padding and shadows
- **StatusBadge**: Status-based styling with predefined states
- **Container**: Max-width wrapper for page content

## 🎨 **Styling Patterns**

### CSS Modules Convention
```css
/* ComponentName.module.css */
.container {
  /* Main container styles */
}

.header {
  /* Header-specific styles */
}

.cardGrid {
  /* Grid layout patterns */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
}
```

### Tailwind Usage
- **Utility-first** for rapid prototyping
- **Component classes** for reusable patterns
- **Responsive design** with mobile-first approach
- **CSS Modules** for component-specific styling

## 📊 **State Management Patterns**

### Local State
```typescript
// Simple state
const [isLoading, setIsLoading] = useState(false);

// Object state
const [formData, setFormData] = useState({
  name: '',
  email: '',
  role: 'student' as UserRole
});

// State with TypeScript
const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
```

### Context Patterns
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## 🔌 **API Integration Patterns**

### API Route Structure
```typescript
// app/api/route-name/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // API logic
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Client-Side API Calls
```typescript
const fetchData = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/endpoint');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    setData(data);
  } catch (error) {
    console.error('Fetch error:', error);
    setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
};
```

## 🗃️ **Database Patterns**

### Supabase Integration
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Usage pattern
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### Neo4j Integration (via Railway Backend)
```typescript
// API calls to Railway backend
const response = await fetch('https://tutorwise-railway-backend-production.up.railway.app/api/endpoint');
```

## 🧪 **Testing Patterns**

### Component Testing
```typescript
// __tests__/ComponentName.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const mockHandler = jest.fn();
    render(<ComponentName onAction={mockHandler} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
```

### TestAssured Integration
- **System Tests**: End-to-end connectivity validation
- **Health Monitoring**: Real-time service status tracking
- **Visual Testing**: Playwright screenshot comparison
- **Performance Testing**: Response time validation

## 🔐 **Authentication Patterns**

### Route Protection
```typescript
// middleware.ts pattern for protected routes
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return res;
}
```

## 💰 **Payment Processing Patterns**

### Stripe Integration
```typescript
// Stripe client setup
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Payment intent creation
const response = await fetch('/api/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 2000 }) // $20.00
});
```

## 🎯 **Error Handling Patterns**

### Component Error Boundaries
```typescript
// Error display patterns
{error && (
  <div className={styles.errorMessage}>
    <p className={styles.errorTitle}>Error:</p>
    <p className={styles.errorDetail}>{error}</p>
  </div>
)}
```

### API Error Responses
```typescript
// Consistent error response format
return NextResponse.json(
  {
    error: 'Validation failed',
    details: 'Email address is required',
    code: 'VALIDATION_ERROR'
  },
  { status: 400 }
);
```

## 📱 **Responsive Design Patterns**

### Breakpoint Usage
- **Mobile First**: Base styles for mobile
- **Tablet**: `md:` prefix for 768px+
- **Desktop**: `lg:` prefix for 1024px+
- **Large Desktop**: `xl:` prefix for 1280px+

### Grid Patterns
```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## 🔄 **Development Workflow Patterns**

### Git Commit Messages
```
feat: add user role-based dashboard routing
fix: resolve health monitor 404 error handling
docs: update API documentation for payment endpoints
test: add unit tests for authentication flow
style: update button component styling
refactor: consolidate user profile logic
```

### Code Review Checklist
- [ ] TypeScript types defined
- [ ] Error handling implemented
- [ ] Responsive design considered
- [ ] Accessibility attributes added
- [ ] Performance optimizations applied
- [ ] Tests written/updated

---

*This document should be updated as new patterns emerge in the codebase*
*Last Updated: 2025-09-25*