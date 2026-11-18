(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 110;
  var fx = new A.FX();
  var tg, time, score, hits, shots, combo, spawnT, endT;
  function reset() { tg = []; time = 30; score = 0; hits = 0; shots = 0; combo = 0; spawnT = 0; endT = 0; fx.clear(); hud(); }
  function spawn() { var lv = Math.min(1, (30 - time) / 30); tg.push({ x: A.rand(60, W - 60), y: A.rand(TOP + 60, H - 70), r: 52 - lv * 14, life: 1.6 - lv * 0.6, max: 1.6 - lv * 0.6 }); spawnT = Math.max(0.35, 0.8 - lv * 0.4); }
  function shoot(p) {
    if (S.state !== 'playing' || endT > 0) return; shots++;
    for (var i = tg.length - 1; i >= 0; i--) { var t = tg[i], k = t.life / t.max, r = t.r * (0.4 + 0.6 * k), d = Math.hypot(p.x - t.x, p.y - t.y);
      if (d < r) { tg.splice(i, 1); hits++; combo++; var acc = 1 - d / r, pts = Math.round(20 + acc * 80) + combo * 2; score += pts; fx.burst(t.x, t.y, acc > 0.7 ? '#ffd166' : '#5ee7ff', 16, 260, 0.4, 3); fx.text(t.x, t.y - 30, (acc > 0.8 ? '정중앙 ' : '') + '+' + pts, acc > 0.8 ? '#ffd166' : '#fff', 20); A.sfx(acc > 0.8 ? 'gold' : 'hit', 1.2 + acc * 0.4); hud(); return; } }
    combo = 0; A.sfx('wall', 1.5); fx.burst(p.x, p.y, '#ff4d6d', 4, 100, 0.2, 2); hud();
  }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['명중', hits + '/' + shots], ['정확도', (shots ? Math.round(hits / shots * 100) : 0) + '%']], { kick: 'TIME UP', win: true }); return; }
    time -= dt; if (time <= 0) { time = 0; endT = 0.6; A.sfx('over'); hud(); return; }
    spawnT -= dt; if (spawnT <= 0 && tg.length < 4) spawn();
    for (var i = tg.length - 1; i >= 0; i--) { tg[i].life -= dt; if (tg[i].life <= 0) { tg.splice(i, 1); combo = 0; } }
    hud();
  }
  /* 그림: 미래형 사격장(원근 바닥·벽 패널·조명), 금속 테 과녁 */
  var BG = A.sprite('aimbg', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04101c'); g.addColorStop(0.62, '#0a2236'); g.addColorStop(0.62, '#06121e'); g.addColorStop(1, '#020810'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // 벽 패널
    for (var r = 0; r < 6; r++) for (var col = 0; col < 4; col++) { var px = 10 + col * 132, py = 120 + r * 82; x.fillStyle = (r + col) % 2 ? 'rgba(94,231,255,.035)' : 'rgba(94,231,255,.06)'; A.rr(x, px, py, 124, 74, 6); x.fill(); x.strokeStyle = 'rgba(94,231,255,.10)'; x.lineWidth = 1; x.stroke(); x.fillStyle = 'rgba(94,231,255,.25)'; x.fillRect(px + 8, py + 8, 10, 2); }
    // 천장 조명
    for (var i = 0; i < 4; i++) { var lx = 70 + i * 133; var lg = x.createLinearGradient(0, 100, 0, 600); lg.addColorStop(0, 'rgba(160,240,255,.12)'); lg.addColorStop(1, 'rgba(160,240,255,0)'); x.fillStyle = lg; x.beginPath(); x.moveTo(lx - 14, 100); x.lineTo(lx + 14, 100); x.lineTo(lx + 70, 600); x.lineTo(lx - 70, 600); x.fill(); x.fillStyle = '#bff4ff'; x.fillRect(lx - 16, 98, 32, 4); }
    // 바닥 원근 선
    x.strokeStyle = 'rgba(94,231,255,.18)'; x.lineWidth = 1.2;
    for (i = -8; i <= 8; i++) { x.beginPath(); x.moveTo(W / 2 + i * 30, 595); x.lineTo(W / 2 + i * 140, H); x.stroke(); }
    for (i = 0; i < 8; i++) { var yy = 595 + Math.pow(i / 8, 1.8) * 365; x.globalAlpha = 0.4 + i * 0.07; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
    x.globalAlpha = 1; x.fillStyle = 'rgba(94,231,255,.6)'; x.fillRect(0, 593, W, 2);
    // 사대(앞 테이블)
    var tg2 = x.createLinearGradient(0, 880, 0, H); tg2.addColorStop(0, '#1a2a3a'); tg2.addColorStop(1, '#0a1218'); x.fillStyle = tg2; x.fillRect(0, 890, W, 70); x.fillStyle = '#ffd166'; for (i = 0; i < 14; i++) { x.beginPath(); x.moveTo(i * 40, 890); x.lineTo(i * 40 + 20, 890); x.lineTo(i * 40 + 12, 898); x.lineTo(i * 40 - 8, 898); x.fill(); }
  });
  var TGT = A.sprite('aimtgt', 130, 130, function (x) {
    x.translate(65, 65); var R = 52;
    x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.arc(5, 7, R + 6, 0, 7); x.fill();
    var rim = x.createLinearGradient(-R, -R, R, R); rim.addColorStop(0, '#e8eef8'); rim.addColorStop(0.5, '#6a7890'); rim.addColorStop(1, '#2a3040'); x.fillStyle = rim; x.beginPath(); x.arc(0, 0, R + 6, 0, 7); x.fill();
    ['#ff4d6d', '#ffffff', '#ff4d6d', '#ffffff', '#ffd166'].forEach(function (col, i) { x.fillStyle = col; x.beginPath(); x.arc(0, 0, R * (1 - i * 0.2), 0, 7); x.fill(); });
    var sh = x.createRadialGradient(-R * 0.4, -R * 0.4, 2, 0, 0, R); sh.addColorStop(0, 'rgba(255,255,255,.4)'); sh.addColorStop(0.6, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,40,.3)'); x.fillStyle = sh; x.beginPath(); x.arc(0, 0, R, 0, 7); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 1; for (var i = 1; i < 5; i++) { x.beginPath(); x.arc(0, 0, R * (1 - i * 0.2), 0, 7); x.stroke(); }
    x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, 2.5, 0, 7); x.fill();
  });
  function render(c) {
    var o = fx.offset(), tt = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(BG, -10, -10, W + 20, H + 20);
    var list = tg || [{ x: 270, y: 480, r: 52, life: 1, max: 1 }];
    list.forEach(function (t) {
      var k = t.life / t.max, r = t.r * (0.4 + 0.6 * k);
      // 바닥 그림자
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(t.x, Math.max(t.y + r + 20, 600), r * 0.8, r * 0.15, 0, 0, 7); c.fill();
      A.draw(c, TGT, t.x, t.y, r / 52);
      c.strokeStyle = k < 0.3 ? 'rgba(255,77,109,.9)' : 'rgba(160,240,255,.8)'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.arc(t.x, t.y, t.r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke(); c.lineCap = 'butt';
    });
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + hits + shots; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.ceil(time); document.getElementById('hC').textContent = (shots ? Math.round(hits / shots * 100) : 100) + '%'; document.getElementById('hMult').textContent = combo >= 3 ? combo + ' 연속' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; e.preventDefault(); shoot(S.toLocal(e)); });
  var S = new A.Shell({ id: 'aim', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render });
})();
