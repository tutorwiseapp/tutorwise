import { chromium, Browser, BrowserContext, Page } from 'playwright';

async function takeScreenshots(): Promise<void> {
  let browser: Browser | null = null;
  try {
    console.log('Taking TestAssured screenshots...');
    browser = await chromium.launch();
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page: Page = await context.newPage();

    await page.goto('http://localhost:3000/monitoring/test-assured');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'testassured-full.png', fullPage: true });
    console.log('✓ Full page screenshot saved as testassured-full.png');

    await page.screenshot({ path: 'testassured-viewport.png' });
    console.log('✓ Viewport screenshot saved as testassured-viewport.png');

    const tabs = await page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `testassured-tab-${i}.png`, fullPage: true });
      console.log(`✓ Tab ${i} screenshot saved as testassured-tab-${i}.png`);
    }

    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'testassured-mobile.png', fullPage: true });
    console.log('✓ Mobile screenshot saved as testassured-mobile.png');

  } catch (error: any) {
    console.error('Error taking screenshots:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeScreenshots();