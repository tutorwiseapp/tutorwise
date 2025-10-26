import { chromium, Browser, Page } from 'playwright';
import { fileURLToPath } from 'url';

async function testRoleManagementSimple(): Promise<void> {
  let browser: Browser | null = null;
  try {
    console.log('🔍 Testing Role Management Interface (Simple)...');
    browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
    const page: Page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });

    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    console.log('✅ Homepage loaded');
    await page.screenshot({ path: 'test-results/homepage/simple-homepage.png', fullPage: true });
    console.log('📸 Homepage screenshot taken');

    const header = await page.$('header');
    if (header) {
      console.log('✅ Header found');
      await header.screenshot({ path: 'test-results/homepage/simple-header.png' });
      console.log('📸 Header screenshot taken');
      const roleSwitcherExists = await page.$('[class*="relative"] button, .role-switcher');
      console.log(`Role switcher element: ${roleSwitcherExists ? 'Found' : 'Not found'}`);
      const headerButtons = await page.$$eval('header button', buttons =>
        buttons.map(btn => ({ text: btn.textContent, className: btn.className }))
      );
      console.log('Header buttons:', headerButtons);
      const headerText = await page.$eval('header', el => el.textContent);
      console.log('Header text:', headerText);
    }

    console.log('🔍 Testing login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-results/homepage/simple-login.png', fullPage: true });
    console.log('📸 Login page screenshot taken');

    console.log('🔍 Testing dashboard page...');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-results/homepage/simple-dashboard.png', fullPage: true });
    console.log('📸 Dashboard page screenshot taken');
    const pageTitle = await page.title();
    console.log('Dashboard page title:', pageTitle);
    console.log('✅ Simple role management test completed');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    // await page.screenshot({ path: 'test-results/homepage/simple-error.png', fullPage: true });
  } finally {
    console.log('Browser staying open for manual inspection...');
    // await browser?.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    testRoleManagementSimple().catch(console.error);
}