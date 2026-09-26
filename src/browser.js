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
      return rows.map(row => {
        const cells = [...row.querySelectorAll('th,td')].map(c => ({ text: c.innerText || c.textContent || '' }));
        const icons = [...row.querySelectorAll('[data-ds-icon]')].map(el => el.getAttribute('data-ds-icon')).filter(Boolean);
        return {
          rowText: row.innerText || row.textContent || '',
          cells,
          sport: icons.find(x => ['Baseball', 'AmericanFootball', 'Soccer', 'Tennis', 'Basketball', 'IceHockey', 'Specials', 'Entertainment', 'Wrestling', 'MMA'].includes(x)) || icons[0] || '',
        };
      });
    });
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
