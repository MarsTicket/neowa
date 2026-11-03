/*
  너와 아케이드 자동 점검 (스모크 테스트)
  - 모든 게임을 휴대폰 / PC / 테슬라 화면으로 열고, 시작해서 몇 초 플레이한 뒤 스크린샷을 찍습니다.
  - 자바스크립트 오류가 하나라도 나면 마지막에 "실패"로 끝납니다.

  사용법 (저장소 맨 위 폴더에서):
    1) python3 -m http.server 8765        ← 터미널 하나에서 켜 두기
    2) node docs/tools/smoke.js            ← 다른 터미널에서 실행
    특정 게임만:  node docs/tools/smoke.js snake breakout
  결과 사진: docs/tools/shots/ (git에 올리지 않음)
  필요: Playwright (npm i -D playwright 후 npx playwright install chromium)
*/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:8765/';
const GAMES = process.argv.slice(2).length ? process.argv.slice(2) : ['shooting', 'snake', 'breakout', 'runner', 'tower', 'orbit', 'dodge', 'blocks', 'mines', 'sudoku', 'story'];
const OUT = path.join(__dirname, 'shots');
const TESLA_UA = 'Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/109.0 Chrome/109.0 Safari/537.36 Tesla/2024.20';
const DEVICES = [
  { name: 'phone', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  { name: 'pc', viewport: { width: 1440, height: 900 } },
  { name: 'tesla', viewport: { width: 1180, height: 720 }, hasTouch: true, userAgent: TESLA_UA }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  let failed = 0;
  for (const dev of DEVICES) {
    const ctx = await browser.newContext(dev);
    for (const page of [''].concat(GAMES.map(g => g + '/'))) {
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); });
      await p.goto(BASE + page);
      await p.waitForTimeout(800);
      const tag = (page.replace('/', '') || 'hub') + '-' + dev.name;
      await p.screenshot({ path: path.join(OUT, tag + '-0.png') });
      if (page) {
        // 시작 → 이리저리 조작 → 상태 확인
        if (page === 'story/') { await p.click('#newGameBtn'); for (let i = 0; i < 6; i++) { await p.click('#dialogueBox'); await p.waitForTimeout(150); } await p.screenshot({ path: path.join(OUT, tag + '-1.png') }); if (errs.length) { failed++; console.log('✗', tag, errs.slice(0, 5)); } else console.log('✓', tag); await p.close(); continue; }
        await p.keyboard.press('Space');
        const box = await p.locator('#stage').boundingBox();
        await p.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
        await p.mouse.down();
        for (let t = 0; t < 4000; t += 200) {
          await p.mouse.move(box.x + box.width * (0.5 + 0.35 * Math.sin(t / 600)), box.y + box.height * 0.8, { steps: 3 });
          await p.keyboard.press(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][Math.floor(t / 1000) % 4]);
          await p.waitForTimeout(200);
        }
        await p.mouse.up();
        const state = await p.evaluate(() => document.body.getAttribute('data-state'));
        if (!/playing|over/.test(state)) errs.push('시작이 안 됨 (state=' + state + ')');
        await p.screenshot({ path: path.join(OUT, tag + '-1.png') });
      }
      if (errs.length) { failed++; console.log('✗', tag, errs.slice(0, 5)); } else console.log('✓', tag);
      await p.close();
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `\n실패 ${failed}건` : '\n모두 통과');
  process.exit(failed ? 1 : 0);
})();
