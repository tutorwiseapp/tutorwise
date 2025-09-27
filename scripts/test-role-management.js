const { chromium } = require('playwright');

async function testRoleManagement() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 800 });

  try {
    console.log('🔍 Testing Role Management Interface...');

    // Navigate to homepage
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // Take homepage screenshot
    await page.screenshot({
      path: 'test-results/homepage/role-test-homepage.png',
      fullPage: true
    });

    console.log('✅ Homepage loaded');

    // Look for role switcher in header
    const roleSwitcher = await page.$('[class*="relative"] button');

    if (roleSwitcher) {
      console.log('✅ Role switcher found in header');

      // Take screenshot of header area
      const headerElement = await page.$('header');
      if (headerElement) {
        await headerElement.screenshot({
          path: 'test-results/homepage/role-test-header.png'
        });
      }

      // Click role switcher to open dropdown
      await roleSwitcher.click();
      await page.waitForTimeout(500);

      // Take screenshot with dropdown open
      await page.screenshot({
        path: 'test-results/homepage/role-test-dropdown.png',
        fullPage: true
      });

      console.log('✅ Role switcher dropdown opened');

      // Check for dropdown options
      const dropdownOptions = await page.$$('[class*="absolute"] button');
      console.log(`Found ${dropdownOptions.length} dropdown options`);

    } else {
      console.log('❌ Role switcher not found - checking if user is logged in');

      // Check if login button exists
      const loginButton = await page.$('a[href*="login"]');
      if (loginButton) {
        console.log('ℹ️  User not logged in - role switcher hidden as expected');
      }
    }

    // Test dashboard page
    console.log('🔍 Testing dashboard page...');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle' });

    await page.screenshot({
      path: 'test-results/homepage/role-test-dashboard.png',
      fullPage: true
    });

    // Check for dashboard title
    const dashboardTitle = await page.$eval('h1', el => el.textContent).catch(() => null);
    console.log(`Dashboard title: ${dashboardTitle}`);

    console.log('✅ Role management visual test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Take error screenshot
    await page.screenshot({
      path: 'test-results/homepage/role-test-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testRoleManagement().catch(console.error);
}

module.exports = { testRoleManagement };