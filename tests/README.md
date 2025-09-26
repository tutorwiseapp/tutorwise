# Tutorwise Testing Suite

## 📁 Test Structure

```
tests/
├── unit/               # Unit tests (Jest + React Testing Library)
├── integration/        # API integration tests (Jest)
├── e2e/               # End-to-end tests (Playwright)
│   ├── fixtures/      # Test helpers and utilities
│   ├── auth.spec.ts   # Authentication flow tests
│   ├── homepage.spec.ts # Homepage functionality tests
│   └── testassured.spec.ts # TestAssured platform tests
└── README.md          # This file
```

## 🧪 Test Types

### **Unit Tests** (`tests/unit/`)
- **Purpose**: Test individual components in isolation
- **Framework**: Jest + React Testing Library
- **Command**: `npm run test:unit`
- **Coverage**: Component logic, utility functions

### **Integration Tests** (`tests/integration/`)
- **Purpose**: Test API endpoints and database interactions
- **Framework**: Jest with API testing utilities
- **Command**: `npm run test:integration`
- **Coverage**: API routes, database operations, external service integrations

### **End-to-End Tests** (`tests/e2e/`)
- **Purpose**: Test complete user journeys across the full application
- **Framework**: Playwright
- **Command**: `npm run test:e2e`
- **Coverage**: User workflows, cross-browser compatibility, real-world scenarios

## 🚀 Running Tests

### **All Tests**
```bash
npm run test:all        # Run all test suites (backend + frontend + e2e)
```

### **Frontend Tests**
```bash
npm test                # Run all Jest tests (unit + integration)
npm run test:watch      # Run Jest in watch mode
npm run test:coverage   # Run with coverage report
npm run test:unit       # Run only unit tests
npm run test:integration # Run only integration tests
```

### **E2E Tests**
```bash
npm run test:e2e        # Run all E2E tests headlessly
npm run test:e2e:headed # Run E2E tests with browser visible
npm run test:e2e:ui     # Run E2E tests with Playwright UI
```

### **Backend Tests**
```bash
npm run test:backend           # Run backend tests
npm run test:backend:coverage  # Run backend tests with coverage
```

## 🎭 Playwright E2E Testing

### **Browser Configuration**
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome on Pixel 5, Safari on iPhone 12
- **Cross-browser**: Automated testing across all configured browsers

### **Test Features**
- ✅ **Authentication flows** - Login, logout, signup
- ✅ **TestAssured platform** - All tabs and functionality
- ✅ **Homepage navigation** - Links and responsive design
- ✅ **Error handling** - Invalid inputs, network failures
- ✅ **Accessibility** - Keyboard navigation, screen readers
- ✅ **Performance** - Page load times, responsiveness

### **Test Data**
Test users and fixtures are defined in `tests/e2e/fixtures/auth.ts`:
- **Student user** - For student role testing
- **Tutor user** - For tutor role testing
- **Agent user** - For agent role testing

## 📊 Coverage Requirements

### **Frontend (Jest)**
- **Minimum**: 70% across all metrics
- **Target**: 80%+ for critical components

### **Backend (pytest)**
- **Minimum**: 80% across all metrics
- **Target**: 90%+ for business logic

### **E2E (Playwright)**
- **Coverage**: Major user journeys and critical paths
- **Browsers**: 95%+ compatibility across configured browsers

## 🔧 Configuration Files

### **Jest Configuration** (`jest.config.js`)
- Test discovery patterns
- Coverage thresholds and reporting
- Module name mapping
- Environment setup

### **Playwright Configuration** (`playwright.config.ts`)
- Browser and device configurations
- Test directory and patterns
- Reporter and output settings
- Web server setup for local development

## 🚨 Quality Gates

All tests must pass before:
- **Pull request approval**
- **Production deployment**
- **Feature release**

### **Quality Check Command**
```bash
npm run quality:check   # Runs linting + all tests
```

## 📝 Writing Tests

### **Unit Test Example**
```typescript
// tests/unit/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });
});
```

### **Integration Test Example**
```typescript
// tests/integration/api/auth.test.ts
import { GET } from '@/app/api/auth/profile/route';

describe('/api/auth/profile', () => {
  it('returns user profile', async () => {
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
  });
});
```

### **E2E Test Example**
```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test('complete user signup flow', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## 🔄 CI/CD Integration

### **GitHub Actions** (when configured)
```yaml
- name: Run E2E Tests
  run: |
    npm run build
    npm run test:e2e
```

### **Local Development**
```bash
# Before committing
npm run quality:check

# Before pushing
npm run test:all
```

## 🐛 Debugging Tests

### **Jest (Unit/Integration)**
```bash
npm run test:watch    # Interactive watch mode
npm test -- --verbose # Detailed output
```

### **Playwright (E2E)**
```bash
npm run test:e2e:headed  # See browser actions
npm run test:e2e:ui      # Playwright UI for debugging
npx playwright show-report # View test results
```

## 📚 Resources

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Playwright Documentation**: https://playwright.dev/docs/intro
- **Testing Best Practices**: See `.claude/PATTERNS.md`

---

*Keep this README updated as testing infrastructure evolves*
*Last Updated: 2025-09-25*