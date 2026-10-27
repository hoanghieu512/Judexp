const { chromium } = require('playwright');
const OUT = process.argv[2];
const BASE = 'http://localhost:5199/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  for (const dir of (process.argv[3] || 'D1,D2,A2').split(',')) {
    await page.goto(`${BASE}?dir=${dir}`); await page.waitForSelector('.jx-nav', { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${dir}-lookup.png` });
    await page.fill('.jx-search', 'ba ghi'); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${dir}-search.png` });
    await page.fill('.jx-search', 'bánh xèo cô Mười'); await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${dir}-empty.png` });
    await page.fill('.jx-search', '');
    await page.click('text=Chấm nhanh'); await page.fill('#jx-entity', '59H1-234.56'); await page.click('[aria-label="Chấm tốt"]'); await page.click('text=chạy êm'); await page.click('text=đúng giờ');
    await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${dir}-rate.png` });
    const fams = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))].join(', '));
    console.log('done', dir, '|', fams);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
