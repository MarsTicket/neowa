(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, BX = 70, BY = 764, G = 520, GY = 760, TX = [330, 490], TYR = [260, 640], FLAGY = 150;
  // 활을 든 손 위치(궁수 그림의 주먹) — 활 그림·시위·화살이 모두 이 점을 중심으로 그려집니다
  var BOWX = 41, BOWY = 96, NOCK = 61;   // 활 중심 오프셋, 시위에 걸린 화살 끝 거리
  // 가로 화면은 840x720 넓은 사거리: 땅·궁수·과녁 범위를 다시 잡고, 진행 중인 과녁·화살은 비율대로 옮김
  function geo(sh) {
    landStats(sh); if (sh.W === W && sh.H === H) return;
    var nGY = sh.land ? 600 : 760, sx = sh.W / W, sy = nGY / GY;
    W = sh.W; H = sh.H; GY = nGY; BY = GY + 4;
    if (sh.land) { TX = [480, 780]; TYR = [150, 480]; FLAGY = 40; } else { TX = [330, 490]; TYR = [260, 640]; FLAGY = 150; }
    if (target) { target.x *= sx; target.y *= sy; target.base *= sy; }
    if (arrow) { arrow.x *= sx; arrow.y *= sy; if (arrow.dy != null) arrow.dy *= sy; }
    pulling = null;
  }
  var fx = new A.FX();
  var arrows, score, streak, wind, target, arrow, aim, pulling, dyingT, results, nextT, extra, keysAim = { a: -0.5, p: 0.6 };
  function groundY(x) { return GY + Math.sin(x * 0.02) * 14; }
  function newTarget() {
    var lv = Math.min(12, results.length);   // 쏜 화살 수만큼 어려워짐 (보너스 화살로 늘어나도 상한 있음)
    target = { x: A.rand(TX[0], TX[1]), y: A.rand(TYR[0], TYR[1]), r: 54 - lv * 1.2, vy: lv >= 4 ? A.rand(40, 90) * (Math.random() < 0.5 ? -1 : 1) : 0, base: 0 };
    target.base = target.y;
    wind = Math.round(A.rand(-1, 1) * (2 + lv * 0.6) * 10) / 10;
  }
  function reset() { arrows = 10; score = 0; streak = 0; arrow = null; pulling = null; dyingT = 0; results = []; aim = null; nextT = 0; extra = 0; newTarget(); fx.clear(); hud(); }
  function nock(angle) { return [BX + BOWX + Math.cos(angle) * NOCK, BY - BOWY + Math.sin(angle) * NOCK]; }
  function shoot(angle, power) {
    if (S.state !== 'playing' || arrow || arrows <= 0 || dyingT > 0) return;
    var v = 520 + power * 900, sp = nock(angle);
    arrow = { x: sp[0], y: sp[1], vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, t: 0, stuck: false };
    arrows--; A.sfx('whoosh', 1.2); A.sfx('tap', 1.6); tutDone(); hud();
  }
  function settle(pts, x, y) {
    if (pts > 0) {
      streak++; var bonus = streak >= 3 ? (streak - 2) * 2 : 0; score += pts + bonus;
      fx.text(x, y - 40, (pts === 10 ? '정중앙! ' : '') + '+' + (pts + bonus), pts >= 9 ? '#ffd166' : '#fff', pts === 10 ? 28 : 22);
      fx.burst(x, y, pts >= 9 ? '#ffd166' : '#ff9ecf', 20, 260, 0.5, 3); A.sfx('hit', 0.8, A.clamp(x / W * 2 - 1, -1, 1)); A.sfx(pts >= 9 ? 'gold' : 'coin', 1 + Math.min(streak, 12) * 0.04, A.clamp(x / W * 2 - 1, -1, 1)); if (streak >= 3) A.sfx('combo', 1 + Math.min(streak, 12) * 0.05); if (pts === 10) fx.shake(5, 0.2);
      // 정중앙이면 화살 1발 보너스
      if (pts === 10) { arrows++; extra++; fx.text(x, y - 76, '보너스 화살 +1', '#7dff9b', 18); A.sfx('power'); }
    } else { streak = 0; fx.text(x, y - 30, '빗나감', '#ff4d6d', 20); A.sfx('wrong'); }
    results.push(pts);
    nextT = 0.7;   // 0.7초 뒤 다음 과녁 (게임 시간 기준이라 일시정지·다시 하기에도 안전)
    hud();
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) { var tens = results.filter(function (r) { return r === 10; }).length; S.gameOver(score, [['정중앙', tens + '발'], ['명중', results.filter(function (r) { return r > 0; }).length + '/' + results.length], vsBest(score)], { kick: 'FINISH', win: true }); } return; }
    if (nextT > 0) { nextT -= dt; if (nextT <= 0) { arrow = null; if (arrows <= 0) dyingT = 0.6; else { newTarget(); if (arrows === 1) S.banner('마지막 화살', '정중앙이면 한 발 더!'); } hud(); } }
    if (target.vy) { target.y += target.vy * dt; if (Math.abs(target.y - target.base) > 120 || target.y < TYR[0] - 60 || target.y > GY - 80) target.vy *= -1; }
    if (keyMode.up) keysAim.a = Math.max(-1.3, keysAim.a - dt * 1.2); if (keyMode.down) keysAim.a = Math.min(0.2, keysAim.a + dt * 1.2);
    if (keyMode.left) keysAim.p = Math.max(0.05, keysAim.p - dt * 0.8); if (keyMode.right) keysAim.p = Math.min(1, keysAim.p + dt * 0.8);
    if (arrow && !arrow.stuck) {
      var steps = 4;
      for (var s = 0; s < steps; s++) {
        var h = dt / steps; arrow.vy += G * h; arrow.vx += wind * 22 * h; arrow.x += arrow.vx * h; arrow.y += arrow.vy * h;
        if (Math.abs(arrow.x - target.x) < 14 && Math.abs(arrow.y - target.y) < target.r) {
          arrow.stuck = true; arrow.dy = arrow.y - target.y;
          var d = Math.abs(arrow.y - target.y) / target.r, pts = Math.max(1, 10 - Math.floor(d * 10));
          settle(pts, target.x, arrow.y); break;
        }
        if (arrow.vy > 0 && arrow.y > groundY(arrow.x) + 6 && arrow.x < W + 20) { arrow.stuck = true; arrow.y = groundY(arrow.x) + 6; fx.burst(arrow.x, arrow.y, '#8a6a5a', 8, 120, 0.3, 2); settle(0, A.clamp(arrow.x, 60, W - 60), A.clamp(arrow.y, 160, GY + 40)); break; }
        if (arrow.x > W + 40 || arrow.y > H + 40 || arrow.y < -400) { arrow.stuck = true; arrow.gone = true; settle(0, A.clamp(arrow.x, 60, W - 60), A.clamp(arrow.y, 160, GY + 40)); break; }
      }
      if (!arrow.stuck) fx.spark(arrow.x, arrow.y, '#ffd166', 0, 0, 0.25, 1.6);
    }
    if (arrow && arrow.stuck && !arrow.gone && arrow.dy != null) arrow.y = target.y + arrow.dy;
  }
  var keyMode = {};
  function curAim() {
    if (pulling) { var dx = pulling.sx - pulling.x, dy = pulling.sy - pulling.y, len = Math.min(240, Math.hypot(dx, dy)); return { a: Math.atan2(dy, Math.max(1, dx)), p: len / 240 }; }
    if (aim) return aim;
    return keysAim;
  }
  /* 그림: 노을 산골짜기 배경, 깃발, 짚 과녁과 나무 받침, 두건 쓴 궁수, 깃 달린 화살 */
  // 배경은 땅 높이 760(세로) 기준 그림. 가로 화면(땅 600)은 위로 옮겨 화면 크기별로 따로 그림
  function H0() { return H; }
  function bgSpr() { var dy = GY - 760; return A.art('arbg' + W + 'x' + H, W / H > 1 ? 'art/bg-land.webp' : 'art/bg.webp', W, H, function (x) { x.translate(0, dy); var H = H0() - dy;
    var g = x.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, '#120c34'); g.addColorStop(0.45, '#4a2a6a'); g.addColorStop(0.75, '#d0607a'); g.addColorStop(1, '#ffb070'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 70; i++) { x.globalAlpha = Math.random() * 0.8 * (1 - i / 90); x.fillStyle = '#fff'; x.fillRect(Math.random() * W, Math.random() * 330, 1.3, 1.3); }
    x.globalAlpha = 1;
    var sg = x.createRadialGradient(150, 690, 0, 150, 690, 260); sg.addColorStop(0, 'rgba(255,220,150,.9)'); sg.addColorStop(0.15, 'rgba(255,190,120,.6)'); sg.addColorStop(1, 'rgba(255,150,100,0)'); x.fillStyle = sg; x.fillRect(0, 380, W, 500);
    x.fillStyle = '#fff1c8'; x.beginPath(); x.arc(150, 690, 40, 0, 7); x.fill();
    [['#6a3a6a', 640, 120, 0.011], ['#4a2650', 700, 90, 0.017], ['#2c1838', 745, 50, 0.025]].forEach(function (m, n) {
      x.fillStyle = m[0]; x.beginPath(); x.moveTo(0, H); for (var xx = 0; xx <= W; xx += 10) x.lineTo(xx, m[1] - Math.abs(Math.sin(xx * m[3] + n * 2)) * m[2] - Math.sin(xx * 0.05 + n) * 6); x.lineTo(W, H); x.fill();
      if (n === 2) for (var k = 0; k < 14; k++) { var tx = Math.random() * W, ty = m[1] - Math.abs(Math.sin(tx * m[3] + 4)) * m[2] - Math.sin(tx * 0.05 + 2) * 6 + 4; x.beginPath(); x.moveTo(tx - 9, ty); x.lineTo(tx, ty - 34 - Math.random() * 14); x.lineTo(tx + 9, ty); x.fill(); }
    });
    var gg = x.createLinearGradient(0, 760, 0, H); gg.addColorStop(0, '#22142a'); gg.addColorStop(1, '#0c0610'); x.fillStyle = gg; x.beginPath(); x.moveTo(0, 780); for (var xx2 = 0; xx2 <= W; xx2 += 30) x.lineTo(xx2, 760 + Math.sin(xx2 * 0.02) * 14); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    x.strokeStyle = 'rgba(255,170,120,.35)'; x.lineWidth = 2; x.beginPath(); for (xx2 = 0; xx2 <= W; xx2 += 30) x.lineTo(xx2, 760 + Math.sin(xx2 * 0.02) * 14); x.stroke();
  }); }
  var TGT = A.art('artgt', 'art/target.webp', 40, 104, function (x) { // 옆에서 본 짚 과녁(세로 60 반지름 기준)
    x.translate(0, -8);
    x.translate(20, 60);
    var cols = ['#e8d8b0', '#2a2a2a', '#3ab0e0', '#e83a5a', '#ffcc33'];
    x.fillStyle = '#8a6a3a'; x.beginPath(); x.ellipse(4, 0, 16, 60, 0, 0, 7); x.fill();
    for (var i = 0; i < 5; i++) { x.fillStyle = cols[i]; x.beginPath(); x.ellipse(0, 0, 15 - i * 1.6, 60 * (1 - i * 0.2), 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(-5, -20, 3, 22, 0, 0, 7); x.fill();
  });
  var ARCHER = A.art('arman', 'art/archer.webp', 80, 120, function (x) {
    x.translate(40, 110);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(0, 0, 26, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#3a2418'; x.fillRect(-10, -40, 8, 40); x.fillRect(3, -40, 8, 40);
    var g = x.createLinearGradient(-16, -90, 16, -40); g.addColorStop(0, '#5ea860'); g.addColorStop(1, '#1f4a28');
    x.fillStyle = g; x.beginPath(); x.moveTo(-16, -38); x.lineTo(-13, -84); x.quadraticCurveTo(0, -94, 13, -84); x.lineTo(16, -38); x.fill();
    x.fillStyle = '#6a4220'; x.fillRect(-15, -50, 30, 5);
    x.fillStyle = '#8a5a2a'; x.save(); x.translate(-12, -80); x.rotate(-0.35); x.fillRect(-4, -26, 8, 34); x.fillStyle = '#e8e0d0'; for (var k = 0; k < 3; k++) x.fillRect(-3 + k * 2.5, -32, 1.5, 8); x.restore();
    x.fillStyle = '#ffd6b0'; x.beginPath(); x.arc(2, -98, 11, 0, 7); x.fill();
    x.fillStyle = '#2e6a34'; x.beginPath(); x.arc(0, -100, 14, Math.PI * 0.9, Math.PI * 2.05); x.lineTo(-14, -84); x.fill();
    x.beginPath(); x.moveTo(-12, -104); x.quadraticCurveTo(-26, -96, -24, -78); x.lineTo(-14, -90); x.fill();
    x.fillStyle = '#1a1010'; x.beginPath(); x.arc(8, -98, 1.6, 0, 7); x.fill();
  });
  /* 그림: 깃 달린 화살 — tip(0,0)이 화살촉, 꼬리는 왼쪽. 그림이 오기 전엔 예전 도형 화살 */
  var ARW = A.art('ararw', 'art/arrow.webp', 74, 14, function (x) {
    x.translate(28, 7);
    x.strokeStyle = '#d8b07a'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-26, 0); x.lineTo(0, 0); x.stroke();
    x.fillStyle = '#d0d8e8'; x.beginPath(); x.moveTo(5, 0); x.lineTo(-2, -3); x.lineTo(-2, 3); x.fill();
    x.fillStyle = '#ff4d6d'; x.beginPath(); x.moveTo(-17, 0); x.lineTo(-26, -4.4); x.lineTo(-30, -4.4); x.lineTo(-23, 0); x.lineTo(-30, 4.4); x.lineTo(-26, 4.4); x.fill();
  });
  function arrowAt(c, ax, ay, an, sc) {
    c.save(); c.translate(ax, ay); c.rotate(an); c.scale(sc || 1, sc || 1);
    c.drawImage(ARW, -ARW.w, -ARW.h / 2, ARW.w, ARW.h);
    c.restore();
  }
  /* 활: 궁수 주먹(BOWX, BOWY)을 중심으로 회전. 시위는 그림 양 끝(활 끝)을 이어 그림 */
  var BOWW = 104, BOWH = 130, TIPX = -6, TIPY = 65;
  var BOW = A.art('arbow', 'art/bow.webp', BOWW, BOWH, function (x) {
    x.translate(BOWW / 2, BOWH / 2); x.scale(1.2, 1.2);
    x.strokeStyle = '#5a3418'; x.lineWidth = 7; x.beginPath(); x.arc(0, 0, 48, -1.2, 1.2); x.stroke();
    x.strokeStyle = '#c88a4a'; x.lineWidth = 3.5; x.beginPath(); x.arc(0, 0, 48, -1.2, 1.2); x.stroke();
    x.fillStyle = '#2a1810'; x.fillRect(44, -6, 8, 12);
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(bgSpr(), -10, -10, W + 20, H + 20);
    // 반딧불
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var ff = 0; ff < 8; ff++) { var fxp = (ff * 73 + t * 14 * (ff % 2 ? 1 : -1)) % W, fyp = GY - 60 + Math.sin(t * 1.3 + ff * 2) * 40; if (fxp < 0) fxp += W; c.globalAlpha = 0.4 + Math.sin(t * 3 + ff) * 0.4; A.draw(c, A.glowDot('#ffe08a', 3), fxp, fyp, 0.8); }
    c.restore(); c.globalAlpha = 1;
    // 바람 깃발: 바람 세기만큼 천이 펄럭임
    var wv = wind || 0; c.save(); c.translate(W / 2, FLAGY);
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '700 15px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('바람 ' + (wv > 0 ? '→ ' : wv < 0 ? '← ' : '') + Math.abs(wv).toFixed(1), 0, -10);
    var pg = c.createLinearGradient(-2, 0, 2, 0); pg.addColorStop(0, '#6a4a2a'); pg.addColorStop(0.45, '#d8b47a'); pg.addColorStop(1, '#4a3018');
    c.fillStyle = pg; c.fillRect(-1.6, 0, 3.2, 56); c.fillStyle = '#3a2410'; c.beginPath(); c.arc(0, 0, 3, 0, 7); c.fill();
    var fl = Math.max(14, Math.abs(wv) * 12), dir = wv < 0 ? -1 : 1;
    var fg = c.createLinearGradient(0, 2, dir * fl, 20); fg.addColorStop(0, '#ff9aa8'); fg.addColorStop(1, '#c8324e');
    c.fillStyle = fg; c.beginPath(); c.moveTo(0, 2);
    for (var q = 0; q <= 6; q++) c.lineTo(dir * fl * q / 6, 2 + Math.sin(t * 8 + q) * (2 + Math.abs(wv)) * q / 6);
    for (q = 6; q >= 0; q--) c.lineTo(dir * fl * q / 6, 20 + Math.sin(t * 8 + q + 0.6) * (2 + Math.abs(wv)) * q / 6 - (wv === 0 ? q * 2 : 0));
    c.fill(); c.restore();
    // 과녁 (나무 받침 두 개 + 그림자 + 그림)
    var tg = target || { x: 420, y: 450, r: 54 };
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(tg.x + 6, GY + 14, 30, 5, 0, 0, 7); c.fill();
    // 나무 받침: 과녁 아래에서 땅까지 벌어지는 A자 다리
    var leg = function (x1, x2, w1, w2) {
      var g2 = c.createLinearGradient(x1 - w1 / 2, 0, x1 + w1 / 2, 0); g2.addColorStop(0, '#2e1c0e'); g2.addColorStop(0.35, '#a87c4e'); g2.addColorStop(1, '#241408');
      c.strokeStyle = g2; c.lineCap = 'round'; c.lineWidth = w1;
      c.beginPath(); c.moveTo(x1, tg.y + tg.r - 14); c.lineTo(x2, GY + 20); c.stroke();
      c.strokeStyle = 'rgba(255,214,150,.25)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x1 - w2, tg.y + tg.r - 14); c.lineTo(x2 - w2 * 1.6, GY + 20); c.stroke();
    };
    leg(tg.x - 5, tg.x - 22, 7, 1.8); leg(tg.x + 5, tg.x + 22, 7, 1.8);
    c.strokeStyle = '#6a4a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(tg.x - 14, tg.y + tg.r + (GY - tg.y - tg.r) * 0.55); c.lineTo(tg.x + 14, tg.y + tg.r + (GY - tg.y - tg.r) * 0.55); c.stroke();
    c.drawImage(TGT, tg.x - 20, tg.y - tg.r, 40, tg.r * 2);
    // 궁수 (발밑 그림자 + 그림)
    c.fillStyle = 'rgba(0,0,0,.26)'; c.beginPath(); c.ellipse(BX + 4, BY + 8, 18, 4, 0, 0, 7); c.fill();
    c.drawImage(ARCHER, BX - 48, BY - 128, 96, 144);
    var am = curAim();
    var pull = (pulling || S.state !== 'playing' ? am.p : 0) * 30;
    c.save(); c.translate(BX + BOWX, BY - BOWY); c.rotate(am.a);
    c.drawImage(BOW, -BOWW / 2, -BOWH / 2, BOWW, BOWH);
    // 시위: 활 끝 두 점을 잇고, 당기면 몸 쪽으로 꺾임
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,246,214,.85)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(TIPX, -TIPY); c.lineTo(-pull, 0); c.lineTo(TIPX, TIPY); c.stroke();
    c.strokeStyle = 'rgba(255,206,110,.22)'; c.lineWidth = 3.6; c.stroke();
    if (!arrow) arrowAt(c, NOCK - pull, 0, 0);
    c.restore();
    // 예상 궤적 (처음 일부만)
    if (S.state === 'playing' && !arrow && (pulling || keyMode.any)) {
      var sp = nock(am.a), v = 520 + am.p * 900, ax = sp[0], ay = sp[1], vx = Math.cos(am.a) * v, vy = Math.sin(am.a) * v;
      c.fillStyle = 'rgba(255,255,255,.5)';
      for (var k = 0; k < 9; k++) { for (var q = 0; q < 4; q++) { vy += G * 0.01; vx += wv * 22 * 0.01; ax += vx * 0.01; ay += vy * 0.01; } c.beginPath(); c.arc(ax, ay, 3, 0, 7); c.fill(); }
    }
    // 첫 화살 안내
    if (tut && S.state === 'playing' && results && !results.length && !arrow && !pulling && !keyMode.any) {
      var tch = document.body.classList.contains('touch');
      c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,' + (0.7 + Math.sin(t * 5) * 0.25) + ')'; c.font = '700 22px "Pretendard Variable",system-ui';
      c.fillText(tch ? '화면을 왼쪽 아래로 끌었다가 놓기' : '마우스로 왼쪽 아래로 끌었다 놓기', W / 2, H - (H - GY) * 0.55);
      c.font = '600 16px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.55)';
      c.fillText(tch ? '많이 끌수록 세게 날아가요' : '또는 ↑↓ 각도 · ←→ 힘 · Space 발사', W / 2, H - (H - GY) * 0.55 + 30);
    }
    if (arrow && !arrow.gone) { var an = arrow.stuck ? (arrow.dy == null ? Math.atan2(arrow.vy, arrow.vx) : 0) : Math.atan2(arrow.vy, arrow.vx); arrowAt(c, arrow.x, arrow.y, an); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = arrows; document.getElementById('hC').textContent = (wind > 0 ? '→' : wind < 0 ? '←' : '') + Math.abs(wind || 0).toFixed(1); document.getElementById('hMult').textContent = streak >= 3 ? streak + '연속 명중' : ''; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing' || arrow) return; var p = S.toLocal(e); pulling = { sx: p.x, sy: p.y, x: p.x, y: p.y, id: e.pointerId }; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (!pulling || pulling.id !== e.pointerId) return; var p = S.toLocal(e); pulling.x = p.x; pulling.y = p.y; });
  stage.addEventListener('pointerup', function (e) {
    if (!pulling || pulling.id !== e.pointerId) return; var a = curAim(); pulling = null; if (S.state !== 'playing') return;
    if (a.p > 0.08) { aim = { a: a.a, p: a.p }; shoot(a.a, a.p); setTimeout(function () { aim = null; }, 50); } });
  stage.addEventListener('pointercancel', function () { pulling = null; });
  window.addEventListener('blur', function () { keyMode.up = keyMode.down = keyMode.left = keyMode.right = false; });
  // 가로 화면: 판 위 점수판이 판을 가리지 않게, 오른쪽 패널에 같은 점수판을 만들어 글자를 따라 씀
  function landStats(S) {
    var hd = document.querySelector('.g-hud'); if (!hd || !S.panelSlot || S.panelSlot.firstChild) return; hd.setAttribute('data-land-hide', '');
    var src = ['hA', 'hB', 'hC'].map(function (id) { return document.getElementById(id); }), mult = document.getElementById('hMult');
    var card = document.createElement('div'); card.className = 'g-card gp-stats';
    var outs = src.map(function (el) { var d = document.createElement('div'), sp = document.createElement('span'), b = document.createElement('b'), lb = el.parentNode.querySelector('.h-lb'); sp.textContent = lb ? lb.textContent : ''; d.appendChild(sp); d.appendChild(b); card.appendChild(d); return b; });
    var om = document.createElement('div'); om.className = 'g-card'; om.style.cssText = 'text-align:center;font-weight:800;color:var(--gold)';
    S.panelSlot.appendChild(card); S.panelSlot.appendChild(om);
    function sync() { src.forEach(function (el, i) { outs[i].textContent = el.textContent; }); om.textContent = mult ? mult.textContent : ''; om.style.display = om.textContent ? '' : 'none'; }
    var mo = new MutationObserver(sync); src.concat(mult ? [mult] : []).forEach(function (el) { mo.observe(el, { childList: true, characterData: true, subtree: true }); }); sync();
  }
  // 첫 판 안내(한 번 제대로 하면 다시 안 나옴)와 종료 화면 '최고 대비'
  var tut = A.get('neowa_archery_tut', '') !== '1';
  function tutDone() { if (tut) { tut = false; A.set('neowa_archery_tut', '1'); } }
  function isTouch() { return document.body.classList.contains('touch'); }
  function vsBest(sc) { var b = S.best || 0; return ['최고 대비', !b ? '첫 기록' : sc > b ? '+' + A.fmt(sc - b) + ' 신기록' : '-' + A.fmt(b - sc)]; }
  function tutText(c, a, b, y) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; var w = Math.max(a.length * 23, b ? b.length * 15 : 0) + 40;
    c.fillStyle = 'rgba(0,0,0,.55)'; A.rr(c, W / 2 - w / 2, y - 30, w, b ? 82 : 60, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,' + (0.8 + Math.sin(S.time * 5) * 0.2) + ')'; c.font = '800 24px "Pretendard Variable",system-ui'; c.fillText(a, W / 2, y);
    if (b) { c.font = '600 16px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(b, W / 2, y + 30); }
    c.restore();
  }
  var S = new A.Shell({ id: 'archery', W: W, H: H, land: [840, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; keyMode.any = true;
      if (k === 'ArrowUp' || k === 'w') keyMode.up = true; if (k === 'ArrowDown' || k === 's') keyMode.down = true;
      if (k === 'ArrowLeft' || k === 'a') keyMode.left = true; if (k === 'ArrowRight' || k === 'd') keyMode.right = true;
      if ((k === ' ' || k === 'Enter') && !e.repeat) shoot(keysAim.a, keysAim.p); },
    keyup: function (e) { var k = e.key; if (k === 'ArrowUp' || k === 'w') keyMode.up = false; if (k === 'ArrowDown' || k === 's') keyMode.down = false; if (k === 'ArrowLeft' || k === 'a') keyMode.left = false; if (k === 'ArrowRight' || k === 'd') keyMode.right = false; } });
})();
