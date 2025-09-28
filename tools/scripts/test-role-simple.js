const { chromium } = require('playwright');

async function testRoleManagementSimple() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 800 });

  try {
    console.log('🔍 Testing Role Management Interface (Simple)...');

    // Navigate to homepage
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    console.log('✅ Homepage loaded');

    // Take homepage screenshot
    await page.screenshot({
      path: 'test-results/homepage/simple-homepage.png',
      fullPage: true
    });
    console.log('📸 Homepage screenshot taken');

    // Check header structure
    const header = await page.$('header');
    if (header) {
      console.log('✅ Header found');

      // Take header screenshot
      await header.screenshot({
        path: 'test-results/homepage/simple-header.png'
      });
      console.log('📸 Header screenshot taken');

      // Check for RoleSwitcher component (even if hidden)
      const roleSwitcherExists = await page.$('[class*="relative"] button, .role-switcher');
      console.log(`Role switcher element: ${roleSwitcherExists ? 'Found' : 'Not found'}`);

      // Check for any buttons in header
      const headerButtons = await page.$$eval('header button', buttons =>
        buttons.map(btn => ({ text: btn.textContent, className: btn.className }))
      );
      console.log('Header buttons:', headerButtons);

      // Check all header content
      const headerText = await page.$eval('header', el => el.textContent);
      console.log('Header text:', headerText);
    }

    // Test login page to see full UI
    console.log('🔍 Testing login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });

    await page.screenshot({
      path: 'test-results/homepage/simple-login.png',
      fullPage: true
    });
    console.log('📸 Login page screenshot taken');

    // Check if we can access dashboard directly
    console.log('🔍 Testing dashboard page...');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle' });

    await page.screenshot({
      path: 'test-results/homepage/simple-dashboard.png',
      fullPage: true
    });
    console.log('📸 Dashboard page screenshot taken');

    const pageTitle = await page.title();
    console.log('Dashboard page title:', pageTitle);

    console.log('✅ Simple role management test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Take error screenshot
    await page.screenshot({
      path: 'test-results/homepage/simple-error.png',
      fullPage: true
    });
  } finally {
    // Keep browser open for manual inspection
    console.log('Browser staying open for manual inspection...');
    // await browser.close();
  }
}

testRoleManagementSimple().catch(console.error);