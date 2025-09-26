import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'student' | 'tutor' | 'agent';
}

export const testUsers: Record<string, TestUser> = {
  student: {
    email: 'student@example.com',
    password: 'testpassword123',
    role: 'student'
  },
  tutor: {
    email: 'tutor@example.com',
    password: 'testpassword123',
    role: 'tutor'
  },
  agent: {
    email: 'agent@example.com',
    password: 'testpassword123',
    role: 'agent'
  }
};

export class AuthHelper {
  constructor(private page: Page) {}

  async login(user: TestUser) {
    await this.page.goto('/login');
    await this.page.fill('[name="email"]', user.email);
    await this.page.fill('[name="password"]', user.password);
    await this.page.click('button[type="submit"]');

    // Wait for redirect after successful login
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  async signup(user: TestUser) {
    await this.page.goto('/signup');
    await this.page.fill('[name="email"]', user.email);
    await this.page.fill('[name="password"]', user.password);
    await this.page.fill('[name="confirmPassword"]', user.password);

    // Select role if role selector exists
    const roleSelector = this.page.locator('[name="role"]');
    if (await roleSelector.isVisible()) {
      await roleSelector.selectOption(user.role);
    }

    await this.page.click('button[type="submit"]');

    // Wait for successful signup (might redirect to verification or dashboard)
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    // Look for logout button/link
    const logoutButton = this.page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Sign Out")');

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await this.page.waitForURL('/login', { timeout: 5000 });
    }
  }

  async isLoggedIn(): Promise<boolean> {
    // Check if we're redirected to login when accessing dashboard
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');

    const currentUrl = this.page.url();
    return !currentUrl.includes('/login');
  }
}