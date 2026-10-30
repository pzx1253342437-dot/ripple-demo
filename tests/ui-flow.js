const fs = require('fs');
const { chromium } = require('playwright-core');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

const executablePath = candidates.find(candidate => fs.existsSync(candidate));

if (!executablePath) {
  console.error('未找到可用的 Chrome/Edge。可通过 CHROME_PATH 指定浏览器路径。');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 430, height: 900 },
      geolocation: { latitude: 30.2480, longitude: 120.1550 },
      permissions: ['geolocation']
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelector('#statusLine').textContent.includes('已连接'),
      null,
      { timeout: 10000 }
    );

    await page.click('#geoBtn');
    await page.waitForFunction(
      () => document.querySelector('#toast').textContent.includes('定位'),
      null,
      { timeout: 10000 }
    );
    await page.click('#speedBtn');
    await page.waitForSelector('#speedMenu:not(.hidden)', { timeout: 3000 });
    await page.click('[data-speed="10"]');
    await page.waitForFunction(() => document.querySelector('#speedValue').textContent === '10×');

    await page.click('#towerBtn');
    await page.waitForSelector('#towerGame:not(.hidden)', { timeout: 3000 });
    const towerHint = await page.textContent('.tower-subline');
    if (!towerHint.includes('每层加速')) throw new Error('叠楼游戏没有显示难度提示');
    await page.click('#towerDrop');
    await page.waitForFunction(() => Number(document.querySelector('#towerFloors').textContent) > 0);
    await page.click('#towerClose');
    await page.waitForFunction(() => document.querySelector('#towerGame').classList.contains('hidden'));

    await page.click('#botBtn');
    await page.click('#emitBtn');
    await page.waitForSelector('#waveFeed:not(.hidden)', { timeout: 5000 });
    const waveCanvasReady = await page.evaluate(() => {
      const canvas = document.querySelector('#waveCanvas');
      return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
    });
    if (!waveCanvasReady) throw new Error('波纹画布没有初始化');

    for (let index = 0; index < 6; index++) {
      await page.click('#promptChoices .prompt-choice:nth-child(1)');
      await page.click('#nextPrompt');
    }
    await page.waitForSelector('#promptResult:not(.hidden)', { timeout: 3000 });
    const promptResultTitle = (await page.textContent('#promptResultTitle')).trim();
    const promptResultBody = (await page.textContent('#promptResultBody')).trim();
    if (!promptResultTitle || !promptResultBody) {
      throw new Error('六题答完后没有显示测试结果');
    }

    await page.waitForSelector('#contactOverlay:not(.hidden)', { timeout: 25000 });

    const contactDistance = await page.textContent('#contactDistance');
    if (!contactDistance || contactDistance.includes('—')) {
      throw new Error('相遇弹窗没有显示有效距离');
    }
    const contactStop = await page.textContent('.contact-stop');
    if (!contactStop || !contactStop.includes('暂停')) {
      throw new Error('相遇弹窗没有说明波已暂停');
    }

    await page.click('#acceptContact');
    await page.waitForSelector('#matchOverlay:not(.hidden)', { timeout: 15000 });

    const distance = await page.textContent('#matchDistance');
    const travelTime = await page.textContent('#matchTime');
    const note = await page.textContent('#matchNote');

    if (pageErrors.length) {
      throw new Error('页面异常：' + pageErrors.join('；'));
    }
    if (!distance || distance.includes('—')) {
      throw new Error('配对弹窗没有显示有效距离');
    }
    if (!note.trim()) {
      throw new Error('配对弹窗没有结果说明');
    }

    if (process.env.SCREENSHOT_PATH) {
      await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
      console.log('screenshot', process.env.SCREENSHOT_PATH);
    }

    console.log('UI match ok');
    console.log('geolocation ok');
    console.log('quiz', promptResultTitle);
    console.log('contact', contactDistance);
    console.log('distance', distance);
    console.log('travelTime', travelTime);
    console.log('note', note);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
