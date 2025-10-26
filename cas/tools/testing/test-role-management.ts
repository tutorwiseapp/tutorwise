import { chromium, Browser, Page } from 'playwright';
import { fileURLToPath } from 'url';

export async function testRoleManagement(): Promise<void> {
  let browser: Browser | null = null;
  try {
    console.log('🔍 Testing Role Management Interface...');
    browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
    const page: Page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });

    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-results/homepage/role-test-homepage.png', fullPage: true });
    console.log('✅ Homepage loaded');

    const roleSwitcher = await page.$('[class*="relative"] button');
    if (roleSwitcher) {
      console.log('✅ Role switcher found in header');
      const headerElement = await page.$('header');
      if (headerElement) {
        await headerElement.screenshot({ path: 'test-results/homepage/role-test-header.png' });
      }
      await roleSwitcher.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/homepage/role-test-dropdown.png', fullPage: true });
      console.log('✅ Role switcher dropdown opened');
      const dropdownOptions = await page.$$('[class*="absolute"] button');
      console.log(`Found ${dropdownOptions.length} dropdown options`);
    } else {
      console.log('❌ Role switcher not found - checking if user is logged in');
      const loginButton = await page.$('a[href*="login"]');
      if (loginButton) {
        console.log('ℹ️  User not logged in - role switcher hidden as expected');
      }
    }

    console.log('🔍 Testing dashboard page...');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-results/homepage/role-test-dashboard.png', fullPage: true });
    const dashboardTitle = await page.$eval('h1', el => el.textContent).catch(() => null);
    console.log(`Dashboard title: ${dashboardTitle}`);
    console.log('✅ Role management visual test completed');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    // Assuming page is available in error scope
    // await page.screenshot({ path: 'test-results/homepage/role-test-error.png', fullPage: true });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testRoleManagement().catch(console.error);
}