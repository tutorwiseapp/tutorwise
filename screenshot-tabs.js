const { chromium } = require('playwright');

async function captureTabScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log('Taking TestAssured tab screenshots...');

    // Navigate to TestAssured
    await page.goto('http://localhost:3000/monitoring/test-assured');
    await page.waitForLoadState('networkidle');

    // Define tabs to capture
    const tabs = [
      { id: 'system-tests', name: 'System Tests' },
      { id: 'health-monitor', name: 'Health Monitor' },
      { id: 'continuous-monitor', name: 'Platform Status' },
      { id: 'visual-testing', name: 'Visual Testing' },
      { id: 'test-docs', name: 'Test Documentation' },
      { id: 'test-history', name: 'Test Framework' }
    ];

    for (const tab of tabs) {
      // Click the tab
      await page.click(`[role="tab"]:has-text("${tab.name}")`);
      await page.waitForTimeout(1000); // Wait for tab content to load

      // Take screenshot
      await page.screenshot({
        path: `tab-${tab.id}.png`,
        fullPage: true
      });
      console.log(`✓ ${tab.name} tab screenshot saved as tab-${tab.id}.png`);
    }

  } catch (error) {
    console.error('Error taking tab screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureTabScreenshots();