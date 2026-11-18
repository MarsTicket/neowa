(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CX = [110, 270, 430], CY = [330, 540, 750], HR = 62;
  var fx = new A.FX();
  var holes, time, score, combo, bestCombo, hits, spawnT, over, el, feverShown;
  function reset() { holes = []; for (var i = 0; i < 9; i++) holes.push({ x: CX[i % 3], y: CY[Math.floor(i / 3)], up: 0, kind: null, life: 0, hit: 0 }); time = 60; score = 0; combo = 0; bestCombo = 0; hits = 0; spawnT = 0.5; over = false; el = 0; feverShown = false; fx.clear(); hud(); }
  function spawn() {
    var lv = Math.min(1, el / 60), free = holes.filter(function (h) { return !h.kind; }); if (!free.length) return;
    var h = A.pick(free), r = Math.random();
    h.kind = r < 0.1 ? 'gold' : r < 0.1 + 0.12 + lv * 0.08 ? 'bomb' : 'mole';
    h.life = A.rand(0.9, 1.3) - lv * 0.5; h.up = 0; h.hit = 0;
    spawnT = Math.max(0.28, 0.75 - lv * 0.45) * A.rand(0.7, 1.2);
  }
  function whack(i) {
    if (S.state !== 'playing' || over) return; var h = holes[i];
    if (h.hit > 0) return; // 이미 잡은 두더지를 한 번 더 눌러도 콤보는 그대로
    if (!h.kind) { if (combo > 0) fx.text(h.x, h.y - 60, '헛방!', '#ff9e9e', 18); combo = 0; A.sfx('wall', 0.8); hud(); return; }
    h.hit = 0.25;
    if (h.kind === 'bomb') { time = Math.max(0, time - 5); combo = 0; fx.burst(h.x, h.y - 30, '#ff4d6d', 30, 360, 0.6, 4); fx.flashIt('#ff2244', 0.4); fx.shake(8, 0.3); fx.text(h.x, h.y - 80, '-5초', '#ff4d6d', 26); A.sfx('boom'); A.vibrate(120); }
    else {
      combo++; hits++; bestCombo = Math.max(bestCombo, combo);
      var pts = (h.kind === 'gold' ? 30 : 10) * Math.min(4, 1 + Math.floor(combo / 5)) * (fever() ? 2 : 1); score += pts;
      if (h.kind === 'gold') { time = Math.min(99, time + 2); fx.text(h.x, h.y - 120, '+2초', '#7dff9b', 20); }
      if (combo % 10 === 0) { fx.text(W / 2, 200, combo + ' 콤보!', '#ffd166', 34); A.sfx('level'); fx.ring(h.x, h.y - 30, '#ffd166', 110, 0.4); }
      fx.burst(h.x, h.y - 30, h.kind === 'gold' ? '#ffd166' : '#ffb547', 16, 260, 0.45, 3); fx.text(h.x, h.y - 90, '+' + pts, h.kind === 'gold' ? '#ffd166' : '#fff', 22);
      A.sfx(h.kind === 'gold' ? 'gold' : 'hit', 1 + Math.min(combo, 15) * 0.04); A.vibrate(12); fx.shake(2, 0.06);
    }
    hud();
  }
  function fever() { return time <= 10 && time > 0; }
  function update(dt) {
    fx.update(dt); if (over) return;
    var pt = Math.ceil(time); time -= dt; el += dt;
    if (!feverShown && time <= 10) { feverShown = true; S.banner('FEVER!', '마지막 10초 점수 2배'); A.sfx('level'); }
    if (pt !== Math.ceil(time) && pt <= 5 && time > 0) A.sfx('tick', 1.3); if (time <= 0) { time = 0; over = true; hud(); S.gameOver(score, [['잡은 두더지', String(hits)], ['최대 콤보', String(bestCombo)]], { kick: 'TIME UP', win: true }); return; }
    spawnT -= dt; if (spawnT <= 0) spawn();
    holes.forEach(function (h) {
      if (!h.kind) return;
      if (h.hit > 0) { h.hit -= dt; h.up = Math.max(0, h.up - dt * 6); if (h.hit <= 0) h.kind = null; return; }
      h.life -= dt; h.up = h.life > 0.15 ? Math.min(1, h.up + dt * 8) : Math.max(0, h.up - dt * 8);
      if (h.life <= 0) { if (h.kind !== 'bomb') combo = 0; h.kind = null; }
    });
    hud();
  }
  /* 그림: 정원 배경, 흙더미 구멍, 두더지·황금 두더지·폭탄 (한 번만 그려 저장) */
  var BG = A.sprite('wbg', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1640'); g.addColorStop(0.16, '#a8506a'); g.addColorStop(0.24, '#ffb37a'); g.addColorStop(0.25, '#3f7a2c'); g.addColorStop(1, '#1d4a18');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // 해와 먼 언덕
    var sg = x.createRadialGradient(400, 210, 0, 400, 210, 120); sg.addColorStop(0, 'rgba(255,240,190,1)'); sg.addColorStop(0.3, 'rgba(255,200,130,.6)'); sg.addColorStop(1, 'rgba(255,170,110,0)'); x.fillStyle = sg; x.fillRect(250, 80, 300, 260);
    [['#5a8a3a', 230, 40], ['#4a7f30', 245, 26]].forEach(function (h, k) { x.fillStyle = h[0]; x.beginPath(); x.moveTo(0, h[1]); for (var i = 0; i <= 12; i++) x.lineTo(i * 45, h[1] - Math.sin(i * 1.1 + k * 2) * h[2] - h[2]); x.lineTo(W, H); x.lineTo(0, H); x.fill(); });
    // 울타리
    x.fillStyle = '#e8d2a8'; for (var fx2 = 6; fx2 < W; fx2 += 34) { x.fillRect(fx2, 206, 10, 44); x.beginPath(); x.moveTo(fx2, 206); x.lineTo(fx2 + 5, 198); x.lineTo(fx2 + 10, 206); x.fill(); }
    x.fillRect(0, 216, W, 6); x.fillRect(0, 236, W, 6);
    // 잔디 결
    for (var i = 0; i < 1400; i++) { var gx = Math.random() * W, gy = 250 + Math.random() * (H - 250); x.strokeStyle = 'hsla(' + (95 + Math.random() * 20) + ',55%,' + (24 + Math.random() * 22) + '%,.8)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + A.rand(-3, 3), gy - A.rand(5, 11)); x.stroke(); }
    // 꽃
    for (i = 0; i < 40; i++) { var fxx = Math.random() * W, fy = 260 + Math.random() * (H - 280), col = A.pick(['#ff9ecf', '#ffe066', '#ffffff', '#b48cff']); x.fillStyle = col; for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; x.beginPath(); x.arc(fxx + Math.cos(a) * 3.5, fy + Math.sin(a) * 3.5, 2.6, 0, 7); x.fill(); } x.fillStyle = '#ffb547'; x.beginPath(); x.arc(fxx, fy, 2, 0, 7); x.fill(); }
  });
  var HOLE = A.sprite('whole', 200, 120, function (x) { // 흙더미 + 구멍 (뒤쪽)
    x.translate(100, 60);
    var g = x.createRadialGradient(0, -6, 10, 0, 0, 96); g.addColorStop(0, '#8a5a30'); g.addColorStop(0.7, '#6a4020'); g.addColorStop(1, 'rgba(60,35,15,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(0, 4, 96, 46, 0, 0, 7); x.fill();
    var hg = x.createRadialGradient(0, 6, 4, 0, 0, HR); hg.addColorStop(0, '#000'); hg.addColorStop(0.8, '#140a03'); hg.addColorStop(1, '#2a160a');
    x.fillStyle = hg; x.beginPath(); x.ellipse(0, 0, HR, HR * 0.38, 0, 0, 7); x.fill();
  });
  var LIP = A.sprite('wlip', 200, 80, function (x) { // 구멍 앞쪽 흙 테두리 (두더지 앞에 그려 가림)
    x.translate(100, 10);
    var g = x.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, '#a87040'); g.addColorStop(1, '#5a3418');
    x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, HR + 6, HR * 0.38 + 4, 0, 0, Math.PI); x.ellipse(0, 6, HR + 14, HR * 0.38 + 16, 0, Math.PI, 0, true); x.fill();
    x.fillStyle = 'rgba(255,220,170,.35)'; x.beginPath(); x.ellipse(-20, 14, 16, 4, -0.1, 0, 7); x.fill(); x.beginPath(); x.ellipse(30, 18, 10, 3, 0.1, 0, 7); x.fill();
  });
  function moleSpr(kind, hit) {
    return A.sprite('wm' + kind + (hit ? 'h' : ''), 120, 140, function (x) {
      x.translate(60, 74);
      if (kind === 'bomb') {
        var bg = x.createRadialGradient(-14, -16, 4, 0, 0, 48); bg.addColorStop(0, '#6a6a7a'); bg.addColorStop(0.35, '#2a2a33'); bg.addColorStop(1, '#0a0a0e');
        x.fillStyle = bg; x.beginPath(); x.arc(0, 4, 44, 0, 7); x.fill();
        x.fillStyle = '#3a3a44'; x.fillRect(-12, -46, 24, 12); x.strokeStyle = '#c8a070'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, -46); x.quadraticCurveTo(14, -62, 6, -70); x.stroke();
        x.fillStyle = '#ff4d6d'; x.font = '700 40px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✕', 0, 8);
        x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(-18, -14, 9, 5, -0.6, 0, 7); x.fill();
        return;
      }
      var gold = kind === 'gold', base = gold ? '#ffd166' : '#a8693a', dark = gold ? '#c8901a' : '#6a3a1a';
      var g = x.createRadialGradient(-14, -24, 6, 0, 0, 62); g.addColorStop(0, gold ? '#fff2c0' : '#d08a50'); g.addColorStop(0.5, base); g.addColorStop(1, dark);
      x.fillStyle = g; x.beginPath(); x.ellipse(0, 6, 46, 58, 0, 0, 7); x.fill();
      x.fillStyle = gold ? '#fff0b0' : '#e8b88a'; x.beginPath(); x.ellipse(0, 28, 28, 30, 0, 0, 7); x.fill(); // 배
      if (hit) { // 어지러운 눈
        x.strokeStyle = '#1a0d04'; x.lineWidth = 3.5; [-15, 15].forEach(function (ex) { x.beginPath(); x.moveTo(ex - 6, -20); x.lineTo(ex + 6, -8); x.moveTo(ex + 6, -20); x.lineTo(ex - 6, -8); x.stroke(); });
      } else {
        [-15, 15].forEach(function (ex) { x.fillStyle = '#1a0d04'; x.beginPath(); x.ellipse(ex, -14, 6, 7.5, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + 2, -17, 2.4, 0, 7); x.fill(); });
        x.fillStyle = 'rgba(255,120,150,.45)'; x.beginPath(); x.ellipse(-26, 2, 7, 4, 0, 0, 7); x.ellipse(26, 2, 7, 4, 0, 0, 7); x.fill();
      }
      x.fillStyle = '#ff7aa8'; x.beginPath(); x.ellipse(0, 0, 10, 7, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(-3, -2, 2.4, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.fillRect(-6, 8, 5, 8); x.fillRect(1, 8, 5, 8);
      x.strokeStyle = 'rgba(30,15,5,.5)'; x.lineWidth = 1.4; [-1, 1].forEach(function (sd) { for (var k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(sd * 12, 3 + k * 3); x.lineTo(sd * 32, k * 7); x.stroke(); } });
      x.fillStyle = gold ? '#e8a830' : '#8a5028'; [-1, 1].forEach(function (sd) { x.beginPath(); x.ellipse(sd * 36, 40, 12, 8, sd * 0.4, 0, 7); x.fill(); }); // 손
      if (gold) { // 왕관
        x.fillStyle = '#ffe066'; x.strokeStyle = '#c8901a'; x.lineWidth = 2; x.beginPath(); x.moveTo(-20, -44); x.lineTo(-22, -64); x.lineTo(-10, -52); x.lineTo(0, -68); x.lineTo(10, -52); x.lineTo(22, -64); x.lineTo(20, -44); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = '#ff4d6d'; x.beginPath(); x.arc(0, -52, 3.5, 0, 7); x.fill();
      }
    });
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(BG, -10, -10, W + 20, H + 20);
    var hs = holes || CX.concat(CX, CX).map(function (x, i) { return { x: x, y: CY[Math.floor(i / 3)], kind: (i * 7 + Math.floor(t)) % 4 === 0 ? 'mole' : null, up: 1, hit: 0 }; });
    hs.forEach(function (h, i) {
      A.draw(c, HOLE, h.x, h.y);
      if (h.kind) {
        c.save(); c.beginPath(); c.rect(h.x - 80, h.y - 170, 160, 170); c.clip();
        var y = h.y + 30 - h.up * 100, wob = h.hit > 0 ? Math.sin(t * 40) * 0.08 : Math.sin(t * 6 + i) * 0.03;
        A.draw(c, moleSpr(h.kind, h.hit > 0), h.x, y, 1, wob);
        c.restore();
        if (h.kind === 'bomb' && !(h.hit > 0) && h.up > 0.5) { // 도화선 불꽃
          c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffb547', 6), h.x + 6, h.y + 30 - h.up * 100 - 70, 0.8 + Math.random() * 0.5); c.restore();
        }
        if (h.hit > 0 && h.kind !== 'bomb') { // 머리 위 도는 별
          c.fillStyle = '#ffe066'; for (var k = 0; k < 3; k++) { var a = t * 8 + k * 2.1; c.beginPath(); c.arc(h.x + Math.cos(a) * 30, h.y - 40 - h.up * 100 + Math.sin(a) * 8, 4, 0, 7); c.fill(); }
        }
        if (h.kind === 'gold' && !(h.hit > 0)) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + Math.sin(t * 10) * 0.3; A.draw(c, A.glowDot('#ffd166', 10), h.x + Math.sin(t * 3) * 30, h.y - 80 * h.up - 20, 1); c.restore(); }
      }
      A.draw(c, LIP, h.x, h.y + 20);
      { c.fillStyle = 'rgba(255,255,255,.28)'; c.font = '700 13px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.fillText(String([7, 8, 9, 4, 5, 6, 1, 2, 3][i]), h.x, h.y + 52); }
    });
    if (holes && fever() && S.state === 'playing') { c.strokeStyle = 'rgba(255,209,102,' + (0.35 + Math.sin(t * 10) * 0.25) + ')'; c.lineWidth = 8; c.strokeRect(4, 4, W - 8, H - 8); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + combo + '|' + fever(); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.ceil(time); document.getElementById('hC').textContent = combo; var tt = document.getElementById('hB'); tt.style.color = time <= 10 ? '#ff4d6d' : ''; var m = Math.min(4, 1 + Math.floor(combo / 5)) * (fever() ? 2 : 1); document.getElementById('hMult').textContent = m > 1 ? '×' + m : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e), best = -1, bd = 1e9;
    holes.forEach(function (h, i) { var d = Math.hypot(p.x - h.x, (p.y - (h.y - 40)) * 0.8); if (d < bd) { bd = d; best = i; } });
    if (bd < 100) whack(best);
  });
  var KEYPAD = { '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8 };
  var S = new A.Shell({ id: 'whack', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (KEYPAD[e.key] != null && !e.repeat) whack(KEYPAD[e.key]); } });
})();
