import { chromium, Browser, BrowserContext, Page } from 'playwright';

async function takeHomepageScreenshots(): Promise<void> {
  let browser: Browser | null = null;
  try {
    console.log('Taking homepage screenshots...');
    browser = await chromium.launch();
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page: Page = await context.newPage();

    // Navigate to homepage
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await page.screenshot({
      path: 'homepage-full.png',
      fullPage: true
    });
    console.log('✓ Homepage screenshot saved as homepage-full.png');

  } catch (error: any) {
    console.error('Error taking homepage screenshots:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeHomepageScreenshots();