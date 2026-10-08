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
      const knownSports = [
        'Tennis', 'TableTennis', 'Baseball', 'AmericanFootball', 'Soccer',
        'Basketball', 'IceHockey', 'Specials', 'Entertainment', 'Wrestling',
        'ProWrestling', 'MMA', 'Cricket', 'Boxing', 'Darts', 'Rugby'
      ];

      return rows.map((row, index) => {
        const cells = [...row.querySelectorAll('th,td')].map(c => ({ text: c.innerText || c.textContent || '' }));
        const rawIcons = [];

        // 1. Direct data-ds-icon or data-sport attributes
        for (const el of row.querySelectorAll('[data-ds-icon], [data-sport], svg, [class*="icon"]')) {
          const ds = el.getAttribute('data-ds-icon') || el.getAttribute('data-sport');
          if (ds) rawIcons.push(ds);

          const aria = el.getAttribute('aria-label') || el.getAttribute('title');
          if (aria) rawIcons.push(aria);

          const use = el.querySelector('use');
          if (use) {
            const href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
            const match = href.match(/icon-([a-zA-Z0-9_-]+)/);
            if (match) rawIcons.push(match[1]);
          }
        }

        const icons = [...new Set(rawIcons.filter(Boolean))];
        const sport = icons.find(x => knownSports.some(k => k.toLowerCase() === String(x).toLowerCase())) || icons[0] || '';

        return {
          rowIndex: index,
          rowText: row.innerText || row.textContent || '',
          cells,
          sport,
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
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        // Match Bet ID e.g., Bet ID: 661,868,490 or Bet ID: 661868490
        const betIdMatch = text.match(/(?:bet\s*id|id)\s*[:#]?\s*([\d,]+)/i) || text.match(/\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/i);
        const betId = betIdMatch ? (betIdMatch[1].includes('-') ? betIdMatch[1] : betIdMatch[1].replace(/,/g, '')) : null;

        // Match Payout / Return e.g., Payout: ₹149,492.32
        const payoutMatch = text.match(/(?:payout|return|win)\s*[:#\n\s]*([$€£₹₽₺₴₦₱₫₩฿₮₲₵₡][\d,]+(?:\.\d+)?)/i);
        // Match Stake / Amount e.g., Stake ₹119,593.85
        const stakeMatch = text.match(/(?:stake|amount|bet)\s*[:#\n\s]*([$€£₹₽₺₴₦₱₫₩฿₮₲₵₡][\d,]+(?:\.\d+)?)/i);

        // Match exact Time / Date from modal e.g. "10/1/2026 at 12:53 AM"
        const timeMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+at\s+|\s+)\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i);

        // Match username if present in modal: "Placed by ⭐ Elinio777"
        const userMatch = text.match(/Placed\s+by\s+([^\n]+)/i);

        let selection = null;
        let event = null;
        let market = null;

        const betIdIdx = lines.findIndex(l => /bet\s*id/i.test(l));
        if (betIdIdx !== -1 && lines[betIdIdx + 1]) {
          selection = lines[betIdIdx + 1];
          let nextIdx = betIdIdx + 2;
          if (lines[nextIdx] && /^\d+(?:\.\d+)?$/.test(lines[nextIdx])) {
            nextIdx++;
          }
          if (lines[nextIdx]) {
            event = lines[nextIdx];
            nextIdx++;
          }
          if (lines[nextIdx] && !lines[nextIdx].toLowerCase().startsWith('about') && !lines[nextIdx].toLowerCase().startsWith('stake')) {
            market = lines[nextIdx];
          }
        }

        const headings = [...modal.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="heading"], [class*="title"]')].map(el => el.innerText.trim()).filter(Boolean);
        if (!selection && headings.length > 0) {
          selection = headings[0];
          if (headings.length > 1) market = headings[1];
        }

        const eventLine = lines.find(l => /(?:royal rumble|wrestlemania|summerslam|money in the bank|survivor series|elimination chamber|wwe|aew)/i.test(l));
        if (eventLine && (!event || event.length < 5)) event = eventLine;

        return {
          betId: betId || null,
          time: timeMatch ? timeMatch[1] : null,
          user: userMatch ? userMatch[1].trim() : null,
          payout: payoutMatch ? payoutMatch[1] : null,
          stake: stakeMatch ? stakeMatch[1] : null,
          selection: selection && selection.length < 100 ? selection : null,
          event: event && event.length < 120 ? event : null,
          market: market && market.length < 100 ? market : null,
        };
      });

      // Dismiss modal by clicking close button or pressing Escape
      const closeBtn = this.page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button[data-testid="close-button"], [role="dialog"] button:has(svg)').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click().catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
      await this.page.waitForTimeout(50).catch(() => {});

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
