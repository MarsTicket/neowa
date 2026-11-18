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
    ammo--; shots.push({ x: BASE.x, y: BASE.y, tx: x, ty: y, sp: 900 }); A.sfx('shoot', 0.7); hud();
  }
  // root: 같은 요격탄에서 시작된 폭발끼리 공유하는 연쇄 카운터
  function explode(x, y, chain, root) { blasts.push({ x: x, y: y, r: 0, max: 62, t: 0, chain: chain, root: root || { n: 0 } }); A.sfx(chain ? 'boom' : 'hit', chain ? 1.3 : 1); }
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
      if (hit) { tutDone(); missiles.splice(i, 1); var chainCount = ++hit.root.n; if (chainCount > bestChain) bestChain = chainCount; var pts = 25 * chainCount * (m.fast ? 2 : 1); score += pts; fx.text(m.x, m.y - 20, (chainCount > 1 ? chainCount + '연쇄 ' : '') + '+' + pts, chainCount > 1 ? '#ffd166' : '#fff', 18); fx.burst(m.x, m.y, '#ff7a45', 14, 240, 0.5, 3); explode(m.x, m.y, true, hit.root); continue; }
      if (m.split && m.y > MY + (GY - MY) * 0.28 && !m.didSplit) { m.didSplit = true; for (var k = 0; k < 2; k++) { var alive = cities.filter(function (c) { return c.alive; }); if (!alive.length) break; var tg = A.pick(alive), a = Math.atan2(GY - m.y, tg.x - m.x), sp = Math.hypot(m.vx, m.vy); missiles.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, tg: tg }); } }
      if (m.y >= GY - 20) {
        missiles.splice(i, 1); fx.burst(m.x, GY - 20, '#ff4d6d', 30, 320, 0.7, 4); fx.shake(8, 0.3); A.sfx('bigboom'); A.vibrate(120);
        cities.forEach(function (c) { if (c.alive && Math.abs(c.x - m.x) < 46) { c.alive = false; lostThisWave++; fx.text(c.x, GY - 60, '도시 파괴', '#ff4d6d', 18); } });
        if (!cities.some(function (c) { return c.alive; })) { dyingT = 1.4; fx.flashIt('#ff2244', 0.7); }
      }
    }
    if (toSpawn <= 0 && !missiles.length && dyingT <= 0) { waveT += dt; if (waveT > 1.2) { waveT = 0; var alive = cities.filter(function (c) { return c.alive; }).length, bonus = alive * 100 + ammo * 5; score += bonus; fx.text(W / 2, H / 2, '도시 ' + alive + '곳 보너스 +' + bonus, '#ffd166', 22);
      if (!lostThisWave) { score += 300 * wave; fx.text(W / 2, H / 2 + 40, '완벽 방어 +' + 300 * wave, '#7dff9b', 22); A.sfx('gold'); }
      if (wave % 3 === 0) { var rb = 0; cities.forEach(function (c) { if (!c.alive && (Math.random() < 0.5 || (rb === 0 && alive <= 2))) { c.alive = true; rb++; } }); if (rb) fx.text(W / 2, H / 2 + 80, '도시 ' + rb + '곳 복구', '#5ee7ff', 20); }
      nextWave(); } }
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#080418'); g.addColorStop(1, '#2a0d1a'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    for (var i = 0; i < 60; i++) { c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect((i * 151) % W, (i * 97) % 600, 1.5, 1.5); }
    c.fillStyle = '#1a0d14'; c.fillRect(0, GY, W, H - GY);
    (cities || [0, 1, 2, 3, 4, 5].map(function (k) { return { x: cityX(k), alive: true }; })).forEach(function (ct) {
      if (ct.alive) { c.fillStyle = '#5ee7ff'; [[-26, 30], [-10, 46], [6, 36], [18, 24]].forEach(function (b) { c.fillRect(ct.x + b[0], GY - b[1], 14, b[1]); }); c.fillStyle = 'rgba(255,255,200,.7)'; c.fillRect(ct.x - 6, GY - 40, 3, 3); c.fillRect(ct.x + 10, GY - 28, 3, 3); }
      else { c.fillStyle = '#3a2a2a'; c.fillRect(ct.x - 26, GY - 8, 52, 8); }
    });
    c.fillStyle = '#ff7a45'; c.beginPath(); c.moveTo(BASE.x - 30, GY); c.lineTo(BASE.x, GY - 34); c.lineTo(BASE.x + 30, GY); c.fill();
    (missiles || []).forEach(function (m) { c.strokeStyle = m.fast ? 'rgba(255,224,102,.7)' : 'rgba(255,77,109,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(m.sx, m.sy); c.lineTo(m.x, m.y); c.stroke(); c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot(m.fast ? '#ffe066' : '#ff4d6d', 4), m.x, m.y, m.fast ? 1.2 : 0.9); c.restore(); });
    (shots || []).forEach(function (s) { c.strokeStyle = 'rgba(94,231,255,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(BASE.x, BASE.y); c.lineTo(s.x, s.y); c.stroke(); c.strokeStyle = '#5ee7ff'; c.beginPath(); c.moveTo(s.tx - 8, s.ty); c.lineTo(s.tx + 8, s.ty); c.moveTo(s.tx, s.ty - 8); c.lineTo(s.tx, s.ty + 8); c.stroke(); });
    c.save(); c.globalCompositeOperation = 'lighter';
    (blasts || []).forEach(function (b) { var gr = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r + 1); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, b.chain ? 'rgba(255,122,69,.7)' : 'rgba(94,231,255,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, b.r + 1, 0, 7); c.fill(); });
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
