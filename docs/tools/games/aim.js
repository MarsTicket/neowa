(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 110;
  var fx = new A.FX();
  var holdT = 0, tg, time, score, hits, shots, combo, spawnT, endT, cx = 270, cy = 520, keys = {}, kbd = false, best = 0;
  function reset() { tg = []; keys = {}; best = 0; time = 30; score = 0; hits = 0; shots = 0; combo = 0; spawnT = 0; endT = 0; fx.clear(); hud(); }
  // 과녁끼리 겹치지 않게 자리를 고름. 가끔 작은 황금 과녁(3배), 후반엔 움직이는 과녁
  function spawn() { var lv = Math.min(1, (30 - time) / 30), x, y, ok, tries = 0, gold = Math.random() < 0.12, life = (1.6 - lv * 0.6) * (gold ? 0.75 : 1), r = (52 - lv * 14) * (gold ? 0.7 : 1);
    do { x = A.rand(60, W - 60); y = A.rand(TOP + 60, H - 70); ok = tg.every(function (t) { return Math.hypot(t.x - x, t.y - y) > t.r + r + 20; }); } while (!ok && ++tries < 12);
    var mv = lv > 0.4 && Math.random() < 0.35 ? A.rand(60, 140) * (Math.random() < 0.5 ? -1 : 1) : 0;
    tg.push({ x: x, y: y, r: r, life: life, max: life, gold: gold, vx: mv }); spawnT = Math.max(0.35, 0.8 - lv * 0.4); }
  function shoot(p) {
    if (S.state !== 'playing' || endT > 0) return; shots++;
    for (var i = tg.length - 1; i >= 0; i--) { var t = tg[i], k = t.life / t.max, r = t.r * (0.4 + 0.6 * k), d = Math.hypot(p.x - t.x, p.y - t.y);
      if (d < r) { tg.splice(i, 1); hits++; combo++; var acc = 1 - d / r, pts = (Math.round(20 + acc * 80) + combo * 2) * (t.gold ? 3 : 1); score += pts; best = Math.max(best, combo); if (combo > 0 && combo % 10 === 0) { fx.text(W / 2, 170, combo + ' 연속 명중!', '#ffd166', 28); A.sfx('level'); } fx.burst(t.x, t.y, acc > 0.7 ? '#ffd166' : '#5ee7ff', 16, 260, 0.4, 3); fx.text(t.x, t.y - 30, (t.gold ? '황금 ' : acc > 0.8 ? '정중앙 ' : '') + '+' + pts, acc > 0.8 ? '#ffd166' : '#fff', 20); A.sfx(acc > 0.8 ? 'gold' : 'hit', 1.2 + acc * 0.4); hud(); return; } }
    combo = 0; A.sfx('wall', 1.5); fx.burst(p.x, p.y, '#ff4d6d', 4, 100, 0.2, 2); hud();
  }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['명중', hits + '/' + shots], ['정확도', (shots ? Math.round(hits / shots * 100) : 0) + '%'], ['최대 연속', String(best)]], { kick: 'TIME UP', win: true }); return; }
    time -= dt; if (time <= 0) { time = 0; endT = 0.6; A.sfx('over'); hud(); return; }
    spawnT -= dt; if (spawnT <= 0 && tg.length < 4) spawn();
    // 키보드 조준점: 방향키/WASD로 움직이고 Space로 쏨 (오래 누르면 빨라짐)
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { holdT += dt; var sp = 420 + Math.min(1, holdT * 2) * 520, ln = Math.hypot(kx, ky); cx = A.clamp(cx + kx / ln * sp * dt, 10, W - 10); cy = A.clamp(cy + ky / ln * sp * dt, TOP, H - 10); } else holdT = 0;
    for (var i = tg.length - 1; i >= 0; i--) { if (tg[i].vx) { tg[i].x += tg[i].vx * dt; if (tg[i].x < 50 || tg[i].x > W - 50) tg[i].vx *= -1; } tg[i].life -= dt; if (tg[i].life <= 0) { tg.splice(i, 1); combo = 0; } }
    hud();
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#030a12'; c.fillRect(-10, -10, W + 20, H + 20);
    c.strokeStyle = 'rgba(94,231,255,.06)'; for (var x = 0; x < W; x += 45) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (var y = 0; y < H; y += 45) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    var list = tg || [{ x: 270, y: 480, r: 52, life: 1, max: 1 }];
    list.forEach(function (t) { var k = t.life / t.max, r = t.r * (0.4 + 0.6 * k); (t.gold ? ['#ffd166', '#fff6d6', '#ffb020', '#fff6d6', '#ff7a00'] : ['#ff4d6d', '#fff', '#ff4d6d', '#fff', '#ffd166']).forEach(function (col, i) { c.fillStyle = col; c.beginPath(); c.arc(t.x, t.y, r * (1 - i * 0.2), 0, 7); c.fill(); }); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(t.x, t.y, t.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke(); });
    if (kbd && tg) { c.strokeStyle = '#5ee7ff'; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, 16, 0, 7); c.moveTo(cx - 26, cy); c.lineTo(cx - 8, cy); c.moveTo(cx + 8, cy); c.lineTo(cx + 26, cy); c.moveTo(cx, cy - 26); c.lineTo(cx, cy - 8); c.moveTo(cx, cy + 8); c.lineTo(cx, cy + 26); c.stroke(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + hits + shots; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.ceil(time); document.getElementById('hC').textContent = (shots ? Math.round(hits / shots * 100) : 100) + '%'; document.getElementById('hMult').textContent = combo >= 3 ? combo + ' 연속' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; e.preventDefault(); kbd = false; shoot(S.toLocal(e)); });
  function kn(e) { return e.key.length === 1 ? e.key.toLowerCase() : e.key; }
  var S = new A.Shell({ id: 'aim', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = kn(e); keys[k] = true; if (/^Arrow|^[wasd]$/.test(k)) kbd = true; if ((k === ' ' || k === 'Enter') && !e.repeat) { kbd = true; shoot({ x: cx, y: cy }); } },
    keyup: function (e) { keys[kn(e)] = false; } });
})();
