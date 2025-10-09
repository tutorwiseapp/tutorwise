# Storybook Integration Guide

## Overview

Storybook is integrated into TutorWise for component development, testing, and documentation. This setup includes:

- **Component Development**: Isolated component development environment
- **Visual Regression Testing**: Percy integration for visual testing
- **Accessibility Testing**: Automated a11y checks with axe-playwright
- **API Mocking**: MSW (Mock Service Worker) for realistic API mocking
- **Interaction Testing**: Playwright-based test runner
- **Responsive Testing**: Multiple viewport configurations

## Quick Start

### Development Mode

Start Storybook development server:

```bash
npm run storybook
# Runs on http://localhost:6006
```

### Build for Production

Build static Storybook:

```bash
npm run storybook:build
# Outputs to apps/web/storybook-static/
```

### Run Tests

Run interaction and accessibility tests:

```bash
# Start Storybook first (in another terminal)
npm run storybook

# Then run tests
npm run storybook:test
```

### Visual Regression Testing

Run Percy visual tests:

```bash
# Set Percy token first
export PERCY_TOKEN=your-percy-token

# Start Storybook
npm run storybook

# Run Percy (in another terminal)
npm run storybook:percy
```

## Writing Stories

### Basic Story Structure

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from './YourComponent';

const meta = {
  title: 'UI/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Component variant',
    },
  },
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};
```

### With Interaction Testing

```typescript
import { expect, userEvent, within } from '@storybook/test';

export const WithInteractions: Story = {
  args: {
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Find and click button
    const button = canvas.getByRole('button');
    await userEvent.click(button);

    // Assert onClick was called
    await expect(args.onClick).toHaveBeenCalled();
  },
};
```

### With API Mocking (MSW)

```typescript
import { http, HttpResponse } from 'msw';

export const WithMockedAPI: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/user', () => {
          return HttpResponse.json({
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
          });
        }),
      ],
    },
  },
};
```

### With Different Viewports

```typescript
export const Mobile: Story = {
  args: {
    fullWidth: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};
```

## Available Addons

### Essentials Bundle
- **Docs**: Auto-generated documentation
- **Controls**: Interactive prop controls
- **Actions**: Event handler logging
- **Viewport**: Responsive testing
- **Backgrounds**: Different background colors
- **Toolbars**: Custom toolbar items

### Custom Addons
- **Chromatic**: Visual testing integration
- **MSW**: API mocking
- **Interactions**: Interaction testing
- **Accessibility**: a11y checks

## Configuration Files

### `.storybook/main.ts`
Main configuration file defining:
- Story locations
- Addons
- Framework options
- Webpack customizations
- TypeScript settings

### `.storybook/preview.ts`
Global decorators and parameters:
- Global styles
- MSW initialization
- Default parameters
- Loaders

### `.storybook/test-runner.ts`
Test runner configuration:
- Accessibility testing setup
- Test timeouts
- Pre/post visit hooks

## Best Practices

### 1. Organization
```
src/
  components/
    ui/
      Button.tsx
      Button.module.css
      Button.stories.tsx  ← Story file
```

### 2. Story Naming
- Use descriptive names: `Primary`, `Secondary`, `Disabled`
- Group related stories: `Interactive`, `WithData`
- Create overview stories: `AllVariants`, `Showcase`

### 3. Documentation
- Add `tags: ['autodocs']` to enable auto-docs
- Use `argTypes` to document props
- Add descriptions to controls

### 4. Testing Coverage
- Test all variants
- Test interactive states
- Test responsive behavior
- Test accessibility

### 5. Performance
- Disable TypeScript checking in dev: `typescript.check: false`
- Use `staticDirs` for static assets
- Lazy load heavy components

## Integration with Testing Suite

### Component Testing Flow
```
1. Unit Tests (Jest)
   ↓
2. Visual Tests (Percy + Storybook)
   ↓
3. Interaction Tests (Storybook Test Runner)
   ↓
4. E2E Tests (Playwright)
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run Storybook tests
  run: |
    npm run storybook:build
    npx http-server storybook-static --port 6006 &
    npx wait-on tcp:127.0.0.1:6006
    npm run storybook:test

- name: Run Percy visual tests
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
  run: npm run storybook:percy
```

## Existing Stories

### UI Components
- [Button](../apps/web/src/app/components/ui/Button.stories.tsx) - All button variants
- [Card](../apps/web/src/app/components/ui/Card.stories.tsx) - Card layouts
- [StatusBadge](../apps/web/src/app/components/ui/StatusBadge.stories.tsx) - Status indicators
- [Tabs](../apps/web/src/app/components/ui/Tabs.stories.tsx) - Tab navigation

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 6006
lsof -ti:6006 | xargs kill -9
```

### Build Errors
```bash
# Clear cache
rm -rf node_modules/.cache/storybook
```

### MSW Not Working
Make sure MSW is initialized in `.storybook/preview.ts`:
```typescript
import { initialize, mswLoader } from 'msw-storybook-addon';
initialize();
```

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Next.js Integration](https://storybook.js.org/docs/get-started/frameworks/nextjs)
- [Percy Visual Testing](https://docs.percy.io/docs/storybook)
- [MSW Addon](https://storybook.js.org/addons/msw-storybook-addon)
- [Test Runner](https://storybook.js.org/docs/writing-tests/test-runner)

## NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run storybook` | Start development server on port 6006 |
| `npm run storybook:build` | Build static Storybook |
| `npm run storybook:test` | Run interaction & a11y tests |
| `npm run storybook:percy` | Run Percy visual tests |
| `npm run storybook:test:ci` | Run tests in CI (builds & serves) |

## Next Steps

1. **Add More Stories**: Create stories for remaining components
2. **Visual Testing**: Set up Percy project and run baseline
3. **CI Integration**: Add Storybook tests to GitHub Actions
4. **Component Documentation**: Add MDX docs for complex components
5. **Design System**: Build comprehensive design system docs
