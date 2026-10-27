const { chromium } = require('playwright');
const OUT = process.argv[2];
const BASE = 'http://localhost:5199/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  const shot = async (name, full = true) => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); console.log('shot', name); };

  await page.goto(BASE); await page.waitForSelector('.jx-nav'); await shot('01-lookup-home');
  await page.fill('.jx-search', '59H1234'); await shot('02-lookup-plate-hit');
  await page.fill('.jx-search', '51G88813'); await shot('03-lookup-plate-near');
  await page.fill('.jx-search', '60B12345'); await shot('04-lookup-plate-unknown');
  await page.fill('.jx-search', 'ba ghi'); await shot('05-lookup-name');
  await page.fill('.jx-search', 'pizza'); await shot('06-lookup-name-unknown');
  await page.fill('.jx-search', '');
  await page.click('[data-testid="entity-51G88812"]'); await shot('07-entity-driver-red');
  await page.click('[data-testid="encounter"] >> nth=0'); await shot('08-entity-amend');
  await page.click('text=Tra cứu');
  await page.click('[data-testid="entity-quancomtambaghi"], [data-testid="entity-comtambaghi"]').catch(async () => { await page.fill('.jx-search', 'ba ghi'); await page.click('.jx-row >> nth=0'); });
  await shot('09-entity-restaurant-merge');
  await page.click('text=Chấm nhanh'); await shot('10-rate-empty');
  await page.fill('#jx-entity', '59H1-234.56'); await page.click('[aria-label="Chấm tốt"]'); await page.click('text=chạy êm'); await page.click('text=đúng giờ'); await shot('11-rate-filled');
  await page.click('.jx-tags >> text=Quán'); await shot('12-rate-restaurant');
  await page.click('.jx-tags >> text=Địa điểm'); await shot('13-rate-place');
  await page.click('text=Cài đặt'); await shot('14-settings');
  console.log(logs.filter((l) => !l.includes('[vite]') && !l.includes('React DevTools')).join('\n'));

  for (const [q, name] of [['?nokho=1&sync=none', '15-first-run'], ['?pin=1234', '16-pin'], ['?theme=light', '17-light-home'], ['?empty=1&noremind=1', '18-empty-kho']]) {
    await page.goto(BASE + q); await page.waitForTimeout(1200); await shot(name);
  }
  // dGen1: square 480x480 dp
  const sq = await browser.newContext({ viewport: { width: 480, height: 480 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Asia/Ho_Chi_Minh' });
  const p2 = await sq.newPage(); await p2.goto(BASE); await p2.waitForSelector('.jx-nav'); await p2.waitForTimeout(500);
  await p2.screenshot({ path: `${OUT}/19-dgen1-home.png` }); console.log('shot 19');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
