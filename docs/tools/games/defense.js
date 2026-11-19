(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, GY = 880, MY = 70, KV = 1;
  function cityX(i) { return W * (50 + i * 88) / 540; }
  // 가로 화면은 900x600 가로 전장. 화면을 돌리면 도시·미사일·폭발 위치를 새 크기에 맞춰 옮김
  function geo(sh) {
    var nW = sh ? sh.W : 540, nH = sh ? sh.H : 960, land = !!(sh && sh.land), nGY = land ? nH - 70 : 880, nMY = land ? 20 : 70;
    var kx = nW / W, ky = (nGY - nMY) / (GY - MY);
    function mx(o, a, b) { o[a] *= kx; o[b] = nMY + (o[b] - MY) * ky; }
    if (cities) { cities.forEach(function (c, i) { c.x = nW * (50 + i * 88) / 540; });
      missiles.forEach(function (m) { mx(m, 'x', 'y'); mx(m, 'sx', 'sy'); m.vx *= kx; m.vy *= ky; });
      blasts.forEach(function (b) { mx(b, 'x', 'y'); }); shots.forEach(function (s) { mx(s, 'x', 'y'); mx(s, 'tx', 'ty'); });
      mx(cur, 'x', 'y'); }
    W = nW; H = nH; GY = nGY; MY = nMY; KV = Math.max(0.7, (GY - MY) / 810); BASE.x = W / 2; BASE.y = GY - 10;
  }
  var fx = new A.FX();
  // 첫 판 안내: 처음 한 번만 판 위에 띄우고, 올바른 행동을 하면 사라짐 (저장 키 neowa_defense_tut)
  var tutOn = A.get('neowa_defense_tut', '') !== '1';
  function tutDone() { if (tutOn) { tutOn = false; A.set('neowa_defense_tut', '1'); } }
  function tutDraw(c, y, touchTxt, keyTxt, tx, ty) {
    if (!tutOn || S.state !== 'playing') return;
    var txt = document.body.classList.contains('touch') ? touchTxt : keyTxt, fs = 22, b = Math.abs(Math.sin(S.time * 4)) * 12;
    c.save(); c.font = '700 ' + fs + 'px "Pretendard Variable",system-ui';
    var w = c.measureText(txt).width + 48; if (w > W - 24) { fs = Math.floor(fs * (W - 72) / (w - 48)); c.font = '700 ' + fs + 'px "Pretendard Variable",system-ui'; w = W - 24; }
    c.fillStyle = 'rgba(0,0,0,.66)'; A.rr(c, W / 2 - w / 2, y - 25, w, 50, 25); c.fill(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, W / 2, y + 1);
    if (tx != null) { // 가리키는 곳을 향해 통통 튀는 화살표
      var a = Math.atan2(ty - y, tx - W / 2), d = Math.hypot(tx - W / 2, ty - y), r = Math.max(0, d - 40 - b), ax = W / 2 + Math.cos(a) * r, ay = y + Math.sin(a) * r;
      c.translate(ax, ay); c.rotate(a); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -13); c.lineTo(-4, 0); c.lineTo(-10, 13); c.closePath(); c.fill();
    }
    c.restore();
  }
  // 종료 화면용: 개인 최고 기록과 비교
  function vsBest(sc) { sc = Math.floor(sc); return !S.best ? '첫 기록' : sc > S.best ? '+' + A.fmt(sc - S.best) + ' 신기록' : sc === S.best ? '타이' : '-' + A.fmt(S.best - sc); }
  var cities, missiles, blasts, shots, wave, score, toSpawn, spawnT, dyingT, cur = { x: W / 2, y: 500 }, kbd = false, waveT, ammo, lostThisWave, noAmmoT = 0;
  var BASE = { x: W / 2, y: GY - 10 };
  function reset() { cities = []; for (var i = 0; i < 6; i++) cities.push({ x: cityX(i), alive: true }); missiles = []; blasts = []; shots = []; wave = 0; score = 0; dyingT = 0; waveT = 0; nextWave(); fx.clear(); hud(); }
  function nextWave() { wave++; lostThisWave = 0; toSpawn = 6 + wave * 3; spawnT = 1; ammo = toSpawn + 10; S.banner('WAVE ' + wave, '미사일 접근'); if (wave > 1) A.sfx('level'); }
  function spawn() {
    var alive = cities.filter(function (c) { return c.alive; }); if (!alive.length) return;
    var tg = A.pick(alive), sx = A.rand(0, W), fast = wave >= 4 && Math.random() < Math.min(0.3, 0.08 + wave * 0.02), sp = Math.min(240, 66 + wave * 9 + A.rand(0, 30)) * (fast ? 1.6 : 1) * KV;
    var a = Math.atan2(GY - 10 - MY, tg.x - sx);
    missiles.push({ x: sx, y: MY, sx: sx, sy: MY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, split: !fast && wave >= 3 && Math.random() < 0.2, fast: fast, tg: tg });
    toSpawn--; spawnT = Math.max(0.35, 1.6 - wave * 0.12) * A.rand(0.6, 1.3);
  }
  function fire(x, y) {
    if (S.state !== 'playing' || dyingT > 0) return;
    if (ammo <= 0) { if (noAmmoT <= 0) { noAmmoT = 0.6; A.sfx('wall', 0.7); fx.text(BASE.x, GY - 70, '요격탄 없음', '#ff4d6d', 18); } return; } y = Math.min(y, GY - 60);
    ammo--; shots.push({ x: BASE.x, y: BASE.y, tx: x, ty: y, sp: 900 }); A.sfx('shoot', 0.7, A.clamp(x / W * 2 - 1, -1, 1)); hud();
  }
  // root: 같은 요격탄에서 시작된 폭발끼리 공유하는 연쇄 카운터
  function explode(x, y, chain, root) { blasts.push({ x: x, y: y, r: 0, max: 62, t: 0, chain: chain, root: root || { n: 0 } }); A.sfx(chain ? 'boom' : 'hit', chain ? 1.1 + Math.min(chainCount, 10) * 0.06 : 1, A.clamp(x / W * 2 - 1, -1, 1)); }
  function update(dt) {
    fx.update(dt); if (noAmmoT > 0) noAmmoT -= dt;
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['웨이브', String(wave)], ['최대 연쇄', String(bestChain)], ['최고 대비', vsBest(score)]]); return; }
    if (toSpawn > 0) { spawnT -= dt; if (spawnT <= 0) spawn(); }
    var i, j;
    for (i = shots.length - 1; i >= 0; i--) { var s = shots[i], dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy), st = s.sp * dt; if (d <= st) { shots.splice(i, 1); explode(s.tx, s.ty, false); } else { s.x += dx / d * st; s.y += dy / d * st; } }
    for (i = blasts.length - 1; i >= 0; i--) { var b = blasts[i]; b.t += dt; b.r = b.t < 0.35 ? b.max * (b.t / 0.35) : b.max * Math.max(0, 1 - (b.t - 0.35) / 0.5); if (b.t > 0.85) blasts.splice(i, 1); }
    for (i = missiles.length - 1; i >= 0; i--) {
      var m = missiles[i]; m.x += m.vx * dt; m.y += m.vy * dt;
      var hit = null; for (j = 0; j < blasts.length; j++) if (Math.hypot(m.x - blasts[j].x, m.y - blasts[j].y) < blasts[j].r) { hit = blasts[j]; break; }
      if (hit) { tutDone(); missiles.splice(i, 1); var chainCount = ++hit.root.n; if (chainCount > bestChain) bestChain = chainCount; var pts = 25 * chainCount * (m.fast ? 2 : 1); score += pts; fx.text(m.x, m.y - 20, (chainCount > 1 ? chainCount + '연쇄 ' : '') + '+' + pts, chainCount > 1 ? '#ffd166' : '#fff', 18); fx.burst(m.x, m.y, '#ff7a45', 14, 240, 0.5, 3); explode(m.x, m.y, true, hit.root); if (chainCount >= 3) A.sfx('combo', 1 + Math.min(chainCount, 12) * 0.05); continue; }
      if (m.split && m.y > MY + (GY - MY) * 0.28 && !m.didSplit) { m.didSplit = true; for (var k = 0; k < 2; k++) { var alive = cities.filter(function (c) { return c.alive; }); if (!alive.length) break; var tg = A.pick(alive), a = Math.atan2(GY - m.y, tg.x - m.x), sp = Math.hypot(m.vx, m.vy); missiles.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, tg: tg }); } }
      if (m.y >= GY - 20) {
        missiles.splice(i, 1); fx.burst(m.x, GY - 20, '#ff4d6d', 30, 320, 0.7, 4); fx.shake(8, 0.3); A.sfx('bigboom', 1, A.clamp(m.x / W * 2 - 1, -1, 1)); A.vibrate(120);
        cities.forEach(function (c) { if (c.alive && Math.abs(c.x - m.x) < 46) { c.alive = false; lostThisWave++; fx.text(c.x, GY - 60, '도시 파괴', '#ff4d6d', 18); } });
        if (!cities.some(function (c) { return c.alive; })) { dyingT = 1.4; fx.flashIt('#ff2244', 0.7); } else if (cities.filter(function (c) { return c.alive; }).length === 1) A.sfx('warn');
      }
    }
    if (toSpawn <= 0 && !missiles.length && dyingT <= 0) { waveT += dt; if (waveT > 1.2) { waveT = 0; var alive = cities.filter(function (c) { return c.alive; }).length, bonus = alive * 100 + ammo * 5; score += bonus; fx.text(W / 2, H / 2, '도시 ' + alive + '곳 보너스 +' + bonus, '#ffd166', 22);
      if (!lostThisWave) { score += 300 * wave; fx.text(W / 2, H / 2 + 40, '완벽 방어 +' + 300 * wave, '#7dff9b', 22); A.sfx('gold'); }
      if (wave % 3 === 0) { var rb = 0; cities.forEach(function (c) { if (!c.alive && (Math.random() < 0.5 || (rb === 0 && alive <= 2))) { c.alive = true; rb++; } }); if (rb) { fx.text(W / 2, H / 2 + 80, '도시 ' + rb + '곳 복구', '#5ee7ff', 20); A.sfx('power'); } }
      nextWave(); } }
    hud();
  }
  /* 그림: 밤하늘·달·오로라·산맥 배경, 보호막 도시, 무너진 도시, 포대 */
  // 배경은 화면 크기(세로 540x960 / 가로 900x600)별로 따로 그림
  function bgSpr() { return A.sprite('dbg' + W + 'x' + H, W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#03021a'); g.addColorStop(0.55, '#140a36'); g.addColorStop(0.85, '#3a1438'); g.addColorStop(1, '#1a0814');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 160; i++) { x.globalAlpha = 0.2 + Math.random() * 0.8; x.fillStyle = '#fff'; var r = Math.random() < 0.1 ? 1.6 : 0.9; x.beginPath(); x.arc(Math.random() * W, Math.random() * (GY - 200), r, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    // 오로라
    for (var k = 0; k < 3; k++) {
      var ag = x.createLinearGradient(0, 120, 0, 420); ag.addColorStop(0, 'rgba(94,231,255,0)'); ag.addColorStop(0.5, k === 1 ? 'rgba(180,140,255,.16)' : 'rgba(94,255,200,.13)'); ag.addColorStop(1, 'rgba(94,231,255,0)');
      x.fillStyle = ag; x.beginPath(); x.moveTo(0, 200 + k * 40);
      for (var xx = 0; xx <= W; xx += 30) x.lineTo(xx, 180 + k * 50 + Math.sin(xx * 0.012 + k * 2) * 60);
      for (xx = W; xx >= 0; xx -= 30) x.lineTo(xx, 330 + k * 50 + Math.sin(xx * 0.01 + k) * 50);
      x.fill();
    }
    // 달
    var mg = x.createRadialGradient(110, 150, 0, 110, 150, 110); mg.addColorStop(0, 'rgba(255,240,220,.35)'); mg.addColorStop(1, 'rgba(255,240,220,0)'); x.fillStyle = mg; x.fillRect(0, 40, 230, 230);
    x.fillStyle = '#f4ecdc'; x.beginPath(); x.arc(110, 150, 34, 0, 7); x.fill();
    x.fillStyle = 'rgba(160,150,140,.35)'; [[100, 140, 8], [122, 160, 5], [104, 166, 4]].forEach(function (c) { x.beginPath(); x.arc(c[0], c[1], c[2], 0, 7); x.fill(); });
    // 산맥 두 겹
    [['#1c0c2e', GY - 120, 90], ['#12081e', GY - 60, 60]].forEach(function (m, n) { x.fillStyle = m[0]; x.beginPath(); x.moveTo(0, H); for (var j = 0; j <= Math.ceil(W / 30); j++) x.lineTo(j * 30, m[1] - Math.abs(Math.sin(j * 1.7 + n * 3)) * m[2] - Math.sin(j * 0.6) * 20); x.lineTo(W, H); x.fill(); });
    // 땅
    var gg = x.createLinearGradient(0, GY, 0, H); gg.addColorStop(0, '#3a1a2a'); gg.addColorStop(1, '#120610'); x.fillStyle = gg; x.fillRect(0, GY, W, H - GY);
    x.fillStyle = 'rgba(255,122,69,.5)'; x.fillRect(0, GY, W, 2);
    for (i = 0; i < 120; i++) { x.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.3 + ')'; x.fillRect(Math.random() * W, GY + 4 + Math.random() * (H - GY), 3 + Math.random() * 6, 2); }
  }); }
  var CITY = A.sprite('dcity', 90, 80, function (x) {
    x.translate(45, 70);
    var bs = [[-30, 26, 12], [-18, 44, 13], [-4, 56, 12], [9, 38, 12], [21, 30, 11]];
    bs.forEach(function (b) {
      var g = x.createLinearGradient(b[0], 0, b[0] + b[2], 0); g.addColorStop(0, '#2a6a8a'); g.addColorStop(1, '#14324a');
      x.fillStyle = g; x.fillRect(b[0], -b[1], b[2], b[1]);
      x.fillStyle = 'rgba(94,231,255,.9)'; x.fillRect(b[0], -b[1], b[2], 2);
      for (var yy = -b[1] + 6; yy < -4; yy += 6) for (var xx = b[0] + 2; xx < b[0] + b[2] - 2; xx += 4) if (Math.random() < 0.6) { x.fillStyle = Math.random() < 0.8 ? '#ffe9a8' : '#9be7ff'; x.fillRect(xx, yy, 2, 3); }
    });
    x.fillStyle = '#ff4d6d'; x.fillRect(-3, -60, 2, 4);
  });
  var DOME = A.sprite('ddome', 110, 70, function (x) {
    x.translate(55, 66);
    var g = x.createRadialGradient(0, 0, 20, 0, 0, 52); g.addColorStop(0, 'rgba(94,231,255,0)'); g.addColorStop(0.85, 'rgba(94,231,255,.18)'); g.addColorStop(1, 'rgba(155,240,255,.55)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 52, Math.PI, 0); x.fill();
  });
  var RUIN = A.sprite('druin', 90, 40, function (x) {
    x.translate(45, 36);
    x.fillStyle = '#2a1a1a'; x.beginPath(); x.moveTo(-34, 0); x.lineTo(-26, -10); x.lineTo(-14, -6); x.lineTo(-8, -18); x.lineTo(2, -8); x.lineTo(12, -14); x.lineTo(24, -4); x.lineTo(34, 0); x.fill();
    x.fillStyle = 'rgba(255,122,69,.6)'; [[-12, -4], [8, -6], [18, -2]].forEach(function (e) { x.beginPath(); x.arc(e[0], e[1], 2, 0, 7); x.fill(); });
  });
  var TUR = A.sprite('dtur', 90, 60, function (x) {
    x.translate(45, 56);
    var g = x.createLinearGradient(0, -40, 0, 0); g.addColorStop(0, '#ffb08a'); g.addColorStop(1, '#a8401a');
    x.fillStyle = '#3a2030'; A.rr(x, -40, -12, 80, 12, 4); x.fill();
    x.fillStyle = g; x.beginPath(); x.arc(0, -12, 24, Math.PI, 0); x.fill();
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-8, -24, 8, 4, -0.5, 0, 7); x.fill();
  });
  var aimA = -Math.PI / 2;
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(bgSpr(), -10, -10, W + 20, H + 20);
    (cities || [0, 1, 2, 3, 4, 5].map(function (k) { return { x: cityX(k), alive: true }; })).forEach(function (ct, k) {
      if (ct.alive) {
        A.draw(c, CITY, ct.x, GY - 40);
        c.save(); c.globalAlpha = 0.6 + Math.sin(t * 2 + k) * 0.2; A.draw(c, DOME, ct.x, GY - 35); c.restore();
      } else {
        A.draw(c, RUIN, ct.x, GY - 20);
        c.fillStyle = 'rgba(90,80,90,.35)'; for (var p = 0; p < 4; p++) { var ph = (t * 0.5 + p / 4 + k * 0.13) % 1; c.globalAlpha = (1 - ph) * 0.5; c.beginPath(); c.arc(ct.x - 6 + Math.sin(ph * 6 + p) * 8, GY - 16 - ph * 70, 6 + ph * 14, 0, 7); c.fill(); }
        c.globalAlpha = 1;
      }
    });
    // 포대: 마지막으로 쏜 곳(또는 커서)을 향해 포신 회전
    var tgt = shots && shots.length ? shots[shots.length - 1] : (kbd ? cur : null);
    if (tgt) aimA = Math.atan2((tgt.ty != null ? tgt.ty : tgt.y) - BASE.y, (tgt.tx != null ? tgt.tx : tgt.x) - BASE.x);
    c.save(); c.translate(BASE.x, GY - 22); c.rotate(aimA); c.fillStyle = '#ffd0b8'; A.rr(c, 0, -5, 40, 10, 4); c.fill(); c.fillStyle = '#ff7a45'; c.fillRect(34, -6, 8, 12); c.restore();
    A.draw(c, TUR, BASE.x, GY - 30);
    (missiles || []).forEach(function (m) {
      var g = c.createLinearGradient(m.sx, m.sy, m.x, m.y); g.addColorStop(0, m.fast ? 'rgba(255,224,102,0)' : 'rgba(255,77,109,0)'); g.addColorStop(1, m.fast ? 'rgba(255,236,150,.95)' : 'rgba(255,140,120,.85)');
      c.strokeStyle = g; c.lineWidth = m.fast ? 3.5 : 3; c.beginPath(); c.moveTo(m.sx, m.sy); c.lineTo(m.x, m.y); c.stroke();
      c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot(m.fast ? '#ffe066' : '#ff4d6d', 5), m.x, m.y, (m.fast ? 1.4 : 1.1) + Math.sin(t * 20) * 0.15); A.draw(c, A.glowDot('#ffd166', 3), m.x, m.y, 0.8); c.restore();
    });
    (shots || []).forEach(function (s) {
      var g = c.createLinearGradient(BASE.x, BASE.y, s.x, s.y); g.addColorStop(0, 'rgba(94,231,255,0)'); g.addColorStop(1, 'rgba(155,240,255,.95)');
      c.strokeStyle = g; c.lineWidth = 2.5; c.beginPath(); c.moveTo(BASE.x, GY - 30); c.lineTo(s.x, s.y); c.stroke();
      c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#9be7ff', 4), s.x, s.y, 1); c.restore();
      c.strokeStyle = 'rgba(94,231,255,.8)'; c.lineWidth = 1.5; var rr = 10 + Math.sin(t * 12) * 2; c.beginPath(); c.arc(s.tx, s.ty, rr, 0, 7); c.moveTo(s.tx - rr - 5, s.ty); c.lineTo(s.tx - rr + 3, s.ty); c.moveTo(s.tx + rr - 3, s.ty); c.lineTo(s.tx + rr + 5, s.ty); c.stroke();
    });
    c.save(); c.globalCompositeOperation = 'lighter';
    (blasts || []).forEach(function (b) { var gr = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r + 1); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.35, b.chain ? 'rgba(255,190,120,.8)' : 'rgba(170,240,255,.8)'); gr.addColorStop(0.7, b.chain ? 'rgba(255,90,60,.45)' : 'rgba(94,160,255,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, b.r + 1, 0, 7); c.fill(); });
    c.restore();
    if (kbd && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(cur.x, cur.y, 16, 0, 7); c.moveTo(cur.x - 24, cur.y); c.lineTo(cur.x + 24, cur.y); c.moveTo(cur.x, cur.y - 24); c.lineTo(cur.x, cur.y + 24); c.stroke(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
    if (missiles && tutOn) { var tm = missiles[0]; tutDraw(c, H * 0.62, '미사일이 지나갈 곳을 탭하면 폭발해요', '클릭하거나 ↑↓←→ 조준 + Space', tm ? tm.x + tm.vx * 0.6 : null, tm ? tm.y + tm.vy * 0.6 : null); }
  }
  var last = '';
  function hud() { var alive = cities ? cities.filter(function (c) { return c.alive; }).length : 6; var rem = (toSpawn || 0) + (missiles ? missiles.length : 0), k = score + '|' + wave + '|' + alive + '|' + ammo + '|' + rem; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = wave; document.getElementById('hC').textContent = alive; document.getElementById('hMult').textContent = '요격탄 ' + ammo + ' · 남은 적 ' + rem; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e); fire(p.x, p.y); });
  var keys = {}, bestChain = 0;
  var S = new A.Shell({ id: 'defense', W: W, H: H, land: [900, 600], onResize: geo, reset: function () { bestChain = 0; noAmmoT = 0; reset(); }, render: render, idle: function (dt) { fx.update(dt); },
    update: function (dt) { var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0); if (kx || ky) { kbd = true; cur.x = A.clamp(cur.x + kx * 600 * dt, 10, W - 10); cur.y = A.clamp(cur.y + ky * 600 * dt, MY + 20, GY - 60); } update(dt); },
    keydown: function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = true; if ((k === ' ' || k === 'Enter') && !e.repeat) { kbd = true; fire(cur.x, cur.y); } }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
  // 가로 화면: 점수판을 오른쪽 패널로 옮김 (게임판 위 점수판은 가로에서 숨김)
  (function () {
    var hudEl = document.querySelector('.g-hud'); if (!hudEl || !S.panelSlot) return; hudEl.setAttribute('data-land-hide', '');
    var lbs = hudEl.querySelectorAll('.h-lb'), ids = ['hA', 'hB', 'hC'], html = '<div class="g-card gp-stats">';
    for (var i = 0; i < 3; i++) html += '<div><span>' + lbs[i].textContent + '</span><b id="p' + ids[i] + '"></b></div>';
    S.panelSlot.innerHTML = html + '</div><div class="g-card" id="phMult" style="font-weight:800;font-size:17px;color:var(--gold);text-align:center"></div>' + '';
    ids.concat('hMult').forEach(function (id) {
      var src = document.getElementById(id), dst = document.getElementById('p' + id); if (!src || !dst) return;
      function cp() { dst.textContent = src.textContent; dst.style.color = src.style.color; if (id === 'hMult') dst.style.display = src.textContent ? '' : 'none'; }
      cp(); new MutationObserver(cp).observe(src, { childList: true, characterData: true, subtree: true, attributes: true });
    });
  })();
})();
