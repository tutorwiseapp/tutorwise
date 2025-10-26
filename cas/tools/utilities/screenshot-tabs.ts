import { chromium, Browser, BrowserContext, Page } from 'playwright';

interface Tab {
  id: string;
  name: string;
}

async function captureTabScreenshots(): Promise<void> {
  let browser: Browser | null = null;
  try {
    console.log('Taking TestAssured tab screenshots...');
    browser = await chromium.launch();
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page: Page = await context.newPage();

    await page.goto('http://localhost:3000/monitoring/test-assured');
    await page.waitForLoadState('networkidle');

    const tabs: Tab[] = [
      { id: 'system-tests', name: 'System Tests' },
      { id: 'health-monitor', name: 'Health Monitor' },
      { id: 'continuous-monitor', name: 'Platform Status' },
      { id: 'visual-testing', name: 'Visual Testing' },
      { id: 'test-docs', name: 'Test Documentation' },
      { id: 'test-history', name: 'Test Framework' }
    ];

    for (const tab of tabs) {
      await page.click(`[role="tab"]:has-text("${tab.name}")`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `tab-${tab.id}.png`, fullPage: true });
      console.log(`✓ ${tab.name} tab screenshot saved as tab-${tab.id}.png`);
    }

  } catch (error: any) {
    console.error('Error taking tab screenshots:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

captureTabScreenshots();