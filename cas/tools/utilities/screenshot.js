const { chromium } = require('playwright');

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log('Taking TestAssured screenshots...');

    // Navigate to TestAssured
    await page.goto('http://localhost:3000/monitoring/test-assured');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await page.screenshot({
      path: 'testassured-full.png',
      fullPage: true
    });
    console.log('✓ Full page screenshot saved as testassured-full.png');

    // Take viewport screenshot
    await page.screenshot({
      path: 'testassured-viewport.png'
    });
    console.log('✓ Viewport screenshot saved as testassured-viewport.png');

    // Take screenshots of different tabs if they exist
    const tabs = await page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(1000); // Wait for tab content to load
      await page.screenshot({
        path: `testassured-tab-${i}.png`,
        fullPage: true
      });
      console.log(`✓ Tab ${i} screenshot saved as testassured-tab-${i}.png`);
    }

    // Take mobile viewport screenshot
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: 'testassured-mobile.png',
      fullPage: true
    });
    console.log('✓ Mobile screenshot saved as testassured-mobile.png');

  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();