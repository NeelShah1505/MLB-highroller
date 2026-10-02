import { chromium } from 'playwright';

export class BrowserManager {
  constructor(cfg) {
    this.cfg = cfg;
    this.browser = null;
    this.page = null;
    this.attached = false;
  }

  async connect() {
    if (this.cfg.cdpUrl) {
      try {
        this.browser = await chromium.connectOverCDP(this.cfg.cdpUrl);
        const contexts = this.browser.contexts();
        const pages = contexts.flatMap(c => c.pages());
        let page = pages.find(p => p.url().includes('/sports/high'));

        if (!page) {
          page = await contexts[0].newPage();
          await page.goto(this.cfg.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }

        this.page = page;
        this.attached = true;
        return { page: this.page, attached: true };
      } catch (err) {
        throw new Error(`Failed to connect to Chrome at ${this.cfg.cdpUrl}: ${err.message}`);
      }
    }

    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext({ viewport: { width: 1600, height: 1000 } });
    this.page = await context.newPage();
    await this.page.goto(this.cfg.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    this.attached = false;
    return { page: this.page, attached: false };
  }

  async extractRows() {
    if (!this.page) throw new Error('Page is not initialized.');
    return this.page.evaluate(() => {
      const rows = [...document.querySelectorAll('table tbody tr')];
      return rows.map((row, index) => {
        const cells = [...row.querySelectorAll('th,td')].map(c => ({ text: c.innerText || c.textContent || '' }));
        const icons = [...row.querySelectorAll('[data-ds-icon]')].map(el => el.getAttribute('data-ds-icon')).filter(Boolean);
        return {
          rowIndex: index,
          rowText: row.innerText || row.textContent || '',
          cells,
          sport: icons.find(x => ['Tennis', 'TableTennis', 'Baseball', 'AmericanFootball', 'Soccer', 'Basketball', 'IceHockey', 'Specials', 'Entertainment', 'Wrestling', 'MMA'].includes(x)) || icons[0] || '',
          icons,
        };
      });
    });
  }

  async fetchRowDetails(rowIndex) {
    if (!this.page) return null;
    try {
      const rows = this.page.locator('table tbody tr');
      const count = await rows.count();
      if (rowIndex >= count) return null;

      const targetRow = rows.nth(rowIndex);
      await targetRow.click({ timeout: 1500 });

      // Wait briefly for modal or dialog container to appear
      const modalLocator = this.page.locator('[role="dialog"], [data-testid="modal"], .modal, div[class*="modal"]').first();
      await modalLocator.waitFor({ state: 'visible', timeout: 1200 }).catch(() => {});

      const details = await this.page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], [data-testid="modal"], div[class*="modal"]') || document.body;
        const text = modal.innerText || '';

        // Match Bet ID e.g., Bet ID: 661868490 or Bet ID\n661868490 or #123456789
        const betIdMatch = text.match(/(?:bet\s*id|id)\s*[:#]?\s*(\d{6,15})/i) || text.match(/\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/i);
        // Match Payout / Return e.g., Payout: ₹123,456
        const payoutMatch = text.match(/(?:payout|return|win)\s*[:#]?\s*([$€£₹₽₺₴₦₱₫₩฿₮₲₵₡][\d,]+(?:\.\d+)?)/i);

        return {
          betId: betIdMatch ? betIdMatch[1] : null,
          payout: payoutMatch ? payoutMatch[1] : null,
        };
      });

      // Dismiss modal by pressing Escape
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(100).catch(() => {});

      return details;
    } catch {
      try { await this.page.keyboard.press('Escape'); } catch {}
      return null;
    }
  }

  async disconnect() {
    try {
      if (this.browser) await this.browser.close();
    } catch {}
    this.browser = null;
    this.page = null;
    this.attached = false;
  }
}
