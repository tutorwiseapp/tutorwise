import { chromium, Browser, Page } from 'playwright';
import { fileURLToPath } from 'url';

async function testRoleManagementComprehensive(): Promise<void> {
  let browser: Browser | null = null;
  try {
    console.log('🔍 Comprehensive Role Management Test...');
    browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
    const page: Page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });

    console.log('\n1️⃣ Testing unauthenticated state...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    const roleSwitcherHidden = await page.$('.role-switcher, [class*="relative"] button[class*="purple"]') === null;
    console.log(`✅ Role switcher properly hidden: ${roleSwitcherHidden}`);
    await page.screenshot({ path: 'test-results/homepage/comprehensive-unauthenticated.png', fullPage: true });

    console.log('\n2️⃣ Testing with mock authentication...');
    await page.evaluate(() => {
      const mockProfile = { id: 'test-user-123', agent_id: 'AGT001', display_name: 'Test User', first_name: 'Test', last_name: 'User', email: 'test@example.com', roles: ['agent', 'provider', 'seeker'], created_at: new Date().toISOString() };
      localStorage.setItem('mockProfile', JSON.stringify(mockProfile));
      localStorage.setItem('mockUser', JSON.stringify({ id: 'test-user-123', email: 'test@example.com' }));
      localStorage.setItem('activeRole', 'agent');
    });

    console.log('\n3️⃣ Testing dashboard with different roles...');
    const roles = ['agent', 'provider', 'seeker'];
    const expectedTitles: Record<string, string> = { agent: 'My Tutoring Agency', provider: 'My Teaching Studio', seeker: 'My Learning Hub' };
    for (const role of roles) {
      console.log(`\n🔄 Testing ${role} role...`);
      await page.evaluate((roleToSet) => localStorage.setItem('activeRole', roleToSet), role);
      await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle' });
      try {
        const dashboardTitle = await page.$eval('h1', el => el.textContent);
        console.log(`Dashboard title: "${dashboardTitle}"`);
        console.log(`Expected title: "${expectedTitles[role]}"`);
        console.log(`✅ Title correct: ${dashboardTitle === expectedTitles[role]}`);
      } catch (error) {
        console.log(`❌ Could not find dashboard title - page may have redirected to login`);
      }
      await page.screenshot({ path: `test-results/homepage/comprehensive-dashboard-${role}.png`, fullPage: true });
      await page.waitForTimeout(1000);
    }

    console.log('\n4️⃣ Testing header with authentication...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    const roleSwitcherVisible = await page.$('[class*="relative"] button') !== null;
    console.log(`✅ Role switcher visible when authenticated: ${roleSwitcherVisible}`);
    if (roleSwitcherVisible) {
      const header = await page.$('header');
      if (header) await header.screenshot({ path: 'test-results/homepage/comprehensive-header-authenticated.png' });
      const roleSwitcherButton = await page.$('[class*="relative"] button');
      if (roleSwitcherButton) {
        await roleSwitcherButton.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/homepage/comprehensive-role-dropdown.png', fullPage: true });
        console.log('✅ Role switcher dropdown opened');
      }
    }

    console.log('\n📊 Test Summary...');
    console.log('✅ Comprehensive role management test completed');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    // await page.screenshot({ path: 'test-results/homepage/comprehensive-error.png', fullPage: true });
  } finally {
    console.log('\n🔍 Browser staying open for manual inspection...');
    // await browser?.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    testRoleManagementComprehensive().catch(console.error);
}