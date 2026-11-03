(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, GY = 880;
  var fx = new A.FX();
  var cities, missiles, blasts, shots, wave, score, toSpawn, spawnT, dyingT, cur = { x: W / 2, y: 500 }, kbd = false, chainCount, waveT, ammo;
  var BASE = { x: W / 2, y: GY - 10 };
  function reset() { cities = []; for (var i = 0; i < 6; i++) cities.push({ x: 50 + i * 88 + (i >= 3 ? 0 : 0), alive: true }); missiles = []; blasts = []; shots = []; wave = 0; score = 0; dyingT = 0; waveT = 0; nextWave(); fx.clear(); hud(); }
  function nextWave() { wave++; toSpawn = 6 + wave * 3; spawnT = 1; ammo = toSpawn + 10; S.banner('WAVE ' + wave, '미사일 접근'); if (wave > 1) A.sfx('level'); }
  function spawn() {
    var alive = cities.filter(function (c) { return c.alive; }); if (!alive.length) return;
    var tg = A.pick(alive), sx = A.rand(0, W), sp = 50 + wave * 9 + A.rand(0, 30);
    var a = Math.atan2(GY - 80, tg.x - sx);
    missiles.push({ x: sx, y: 70, sx: sx, sy: 70, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, split: wave >= 3 && Math.random() < 0.2, tg: tg });
    toSpawn--; spawnT = Math.max(0.35, 1.6 - wave * 0.12) * A.rand(0.6, 1.3);
  }
  function fire(x, y) {
    if (S.state !== 'playing' || dyingT > 0 || ammo <= 0) return; y = Math.min(y, GY - 60);
    ammo--; shots.push({ x: BASE.x, y: BASE.y, tx: x, ty: y, sp: 900 }); A.sfx('shoot', 0.7); hud();
  }
  function explode(x, y, chain) { blasts.push({ x: x, y: y, r: 0, max: 62, t: 0, chain: chain }); A.sfx(chain ? 'boom' : 'hit', chain ? 1.3 : 1); }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['웨이브', String(wave)]]); return; }
    if (toSpawn > 0) { spawnT -= dt; if (spawnT <= 0) spawn(); }
    var i, j;
    for (i = shots.length - 1; i >= 0; i--) { var s = shots[i], dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy), st = s.sp * dt; if (d <= st) { shots.splice(i, 1); explode(s.tx, s.ty, false); } else { s.x += dx / d * st; s.y += dy / d * st; } }
    for (i = blasts.length - 1; i >= 0; i--) { var b = blasts[i]; b.t += dt; b.r = b.t < 0.35 ? b.max * (b.t / 0.35) : b.max * Math.max(0, 1 - (b.t - 0.35) / 0.5); if (b.t > 0.85) blasts.splice(i, 1); }
    for (i = missiles.length - 1; i >= 0; i--) {
      var m = missiles[i]; m.x += m.vx * dt; m.y += m.vy * dt;
      var hit = false; for (j = 0; j < blasts.length; j++) if (Math.hypot(m.x - blasts[j].x, m.y - blasts[j].y) < blasts[j].r) { hit = true; break; }
      if (hit) { missiles.splice(i, 1); chainCount++; var pts = 25 * chainCount; score += pts; fx.text(m.x, m.y - 20, (chainCount > 1 ? chainCount + '연쇄 ' : '') + '+' + pts, chainCount > 1 ? '#ffd166' : '#fff', 18); fx.burst(m.x, m.y, '#ff7a45', 14, 240, 0.5, 3); explode(m.x, m.y, true); continue; }
      if (m.split && m.y > 300 && !m.didSplit) { m.didSplit = true; for (var k = 0; k < 2; k++) { var alive = cities.filter(function (c) { return c.alive; }); if (!alive.length) break; var tg = A.pick(alive), a = Math.atan2(GY - m.y, tg.x - m.x), sp = Math.hypot(m.vx, m.vy); missiles.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, tg: tg }); } }
      if (m.y >= GY - 20) {
        missiles.splice(i, 1); fx.burst(m.x, GY - 20, '#ff4d6d', 30, 320, 0.7, 4); fx.shake(8, 0.3); A.sfx('bigboom'); A.vibrate(120);
        cities.forEach(function (c) { if (c.alive && Math.abs(c.x - m.x) < 46) { c.alive = false; fx.text(c.x, GY - 60, '도시 파괴', '#ff4d6d', 18); } });
        if (!cities.some(function (c) { return c.alive; })) { dyingT = 1.4; fx.flashIt('#ff2244', 0.7); }
      }
    }
    if (blasts.length === 0) chainCount = 0;
    if (toSpawn <= 0 && !missiles.length && dyingT <= 0) { waveT += dt; if (waveT > 1.2) { waveT = 0; var alive = cities.filter(function (c) { return c.alive; }).length, bonus = alive * 100 + ammo * 5; score += bonus; fx.text(W / 2, H / 2, '도시 ' + alive + '곳 보너스 +' + bonus, '#ffd166', 22); if (wave % 3 === 0) cities.forEach(function (c) { if (!c.alive && Math.random() < 0.5) { c.alive = true; } }); nextWave(); } }
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#080418'); g.addColorStop(1, '#2a0d1a'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    for (var i = 0; i < 60; i++) { c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect((i * 151) % W, (i * 97) % 600, 1.5, 1.5); }
    c.fillStyle = '#1a0d14'; c.fillRect(0, GY, W, H - GY);
    (cities || [0, 1, 2, 3, 4, 5].map(function (k) { return { x: 50 + k * 88, alive: true }; })).forEach(function (ct) {
      if (ct.alive) { c.fillStyle = '#5ee7ff'; [[-26, 30], [-10, 46], [6, 36], [18, 24]].forEach(function (b) { c.fillRect(ct.x + b[0], GY - b[1], 14, b[1]); }); c.fillStyle = 'rgba(255,255,200,.7)'; c.fillRect(ct.x - 6, GY - 40, 3, 3); c.fillRect(ct.x + 10, GY - 28, 3, 3); }
      else { c.fillStyle = '#3a2a2a'; c.fillRect(ct.x - 26, GY - 8, 52, 8); }
    });
    c.fillStyle = '#ff7a45'; c.beginPath(); c.moveTo(BASE.x - 30, GY); c.lineTo(BASE.x, GY - 34); c.lineTo(BASE.x + 30, GY); c.fill();
    (missiles || []).forEach(function (m) { c.strokeStyle = 'rgba(255,77,109,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(m.sx, m.sy); c.lineTo(m.x, m.y); c.stroke(); c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ff4d6d', 4), m.x, m.y, 0.9); c.restore(); });
    (shots || []).forEach(function (s) { c.strokeStyle = 'rgba(94,231,255,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(BASE.x, BASE.y); c.lineTo(s.x, s.y); c.stroke(); c.strokeStyle = '#5ee7ff'; c.beginPath(); c.moveTo(s.tx - 8, s.ty); c.lineTo(s.tx + 8, s.ty); c.moveTo(s.tx, s.ty - 8); c.lineTo(s.tx, s.ty + 8); c.stroke(); });
    c.save(); c.globalCompositeOperation = 'lighter';
    (blasts || []).forEach(function (b) { var gr = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r + 1); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, b.chain ? 'rgba(255,122,69,.7)' : 'rgba(94,231,255,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, b.r + 1, 0, 7); c.fill(); });
    c.restore();
    if (kbd && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(cur.x, cur.y, 16, 0, 7); c.moveTo(cur.x - 24, cur.y); c.lineTo(cur.x + 24, cur.y); c.moveTo(cur.x, cur.y - 24); c.lineTo(cur.x, cur.y + 24); c.stroke(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var alive = cities ? cities.filter(function (c) { return c.alive; }).length : 6; var k = score + '|' + wave + '|' + alive + '|' + ammo; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = wave; document.getElementById('hC').textContent = alive; document.getElementById('hMult').textContent = '요격탄 ' + ammo; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e); fire(p.x, p.y); });
  var keys = {};
  var S = new A.Shell({ id: 'defense', W: W, H: H, reset: function () { chainCount = 0; reset(); }, render: render, idle: function (dt) { fx.update(dt); },
    update: function (dt) { var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0); if (kx || ky) { kbd = true; cur.x = A.clamp(cur.x + kx * 600 * dt, 10, W - 10); cur.y = A.clamp(cur.y + ky * 600 * dt, 90, GY - 60); } update(dt); },
    keydown: function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = true; if ((k === ' ' || k === 'Enter') && !e.repeat) { kbd = true; fire(cur.x, cur.y); } }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
