const { chromium } = require('playwright');

async function takeHomepageScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log('Taking homepage screenshots...');

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

  } catch (error) {
    console.error('Error taking homepage screenshots:', error);
  } finally {
    await browser.close();
  }
}

takeHomepageScreenshots();