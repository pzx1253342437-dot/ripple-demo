const fs = require('fs');
const { chromium } = require('playwright-core');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('No Chrome or Edge found');

async function touchSwipe(client, from, to) {
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y, radiusX: 2, radiusY: 2, force: 1 }]
  });
  for (let step = 1; step <= 10; step++) {
    const ratio = step / 10;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio,
        radiusX: 2,
        radiusY: 2,
        force: 1
      }]
    });
    await new Promise(resolve => setTimeout(resolve, 14));
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-features=OverscrollHistoryNavigation',
      '--disable-swipe-navigation',
      '--overscroll-history-navigation=0'
    ]
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 430, height: 900 },
      geolocation: { latitude: 30.2480, longitude: 120.1550 },
      permissions: ['geolocation'],
      hasTouch: true
    });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#statusLine').textContent.includes('已连接'));
    await page.click('[data-screen="profile"]');
    await page.waitForTimeout(500);
    const profileActive = await page.evaluate(() => document.querySelector('#profileScreen').classList.contains('is-active'));
    const navActive = await page.evaluate(() => [...document.querySelectorAll('.nav-item')].map(button => ({
      screen: button.dataset.screen,
      active: button.classList.contains('is-active')
    })));
    const profileText = await page.textContent('#profileScreen');
    const profileReady = ['林晚', '个人信息', '动态', '手冲咖啡'].every(value => profileText.includes(value));
    await page.evaluate(() => {
      const scroller = document.querySelector('.profile-scroll');
      scroller.scrollTop = scroller.scrollHeight;
    });
    await page.waitForTimeout(350);
    const layout = await page.evaluate(() => {
      const lastMoment = [...document.querySelectorAll('.moment')].at(-1).getBoundingClientRect();
      const nav = document.querySelector('#bottomNav').getBoundingClientRect();
      const scroller = document.querySelector('.profile-scroll');
      return {
        scrolled: scroller.scrollTop > 0,
        lastMomentBottom: Math.round(lastMoment.bottom),
        navTop: Math.round(nav.top),
        contentClear: lastMoment.bottom < nav.top - 8
      };
    });
    await page.click('[data-screen="match"]');
    await page.waitForTimeout(500);
    const backByNav = await page.evaluate(() => !document.querySelector('#profileScreen').classList.contains('is-active'));

    await touchSwipe(client, { x: 330, y: 360 }, { x: 110, y: 362 });
    await page.waitForTimeout(500);
    const fromMap = await page.evaluate(() => document.querySelector('#profileScreen').classList.contains('is-active'));

    await touchSwipe(client, { x: 90, y: 500 }, { x: 350, y: 502 });
    await page.waitForTimeout(500);
    const backBySwipe = await page.evaluate(() => !document.querySelector('#profileScreen').classList.contains('is-active'));

    if (!profileActive || !profileReady) throw new Error('Profile screen is incomplete');
    if (!navActive.find(item => item.screen === 'profile').active) throw new Error('Profile nav is not active');
    if (!layout.contentClear) throw new Error('Bottom nav covers the last moment');
    if (!backByNav || !fromMap || !backBySwipe) throw new Error('Screen switching failed');
    if (errors.length) throw new Error('Page errors: ' + errors.join('; '));

    console.log(JSON.stringify({ profileActive, profileReady, navActive, layout, backByNav, fromMap, backBySwipe, errors }));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
