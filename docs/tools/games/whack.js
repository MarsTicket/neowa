(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CX = [110, 270, 430], CY = [330, 540, 750], HR = 62;
  var fx = new A.FX();
  var holes, time, score, combo, bestCombo, hits, spawnT, over;
  function reset() { holes = []; for (var i = 0; i < 9; i++) holes.push({ x: CX[i % 3], y: CY[Math.floor(i / 3)], up: 0, kind: null, life: 0, hit: 0 }); time = 60; score = 0; combo = 0; bestCombo = 0; hits = 0; spawnT = 0.5; over = false; fx.clear(); hud(); }
  function spawn() {
    var lv = Math.min(1, (60 - time) / 60), free = holes.filter(function (h) { return !h.kind; }); if (!free.length) return;
    var h = A.pick(free), r = Math.random();
    h.kind = r < 0.1 ? 'gold' : r < 0.1 + 0.12 + lv * 0.08 ? 'bomb' : 'mole';
    h.life = A.rand(0.9, 1.3) - lv * 0.5; h.up = 0; h.hit = 0;
    spawnT = Math.max(0.28, 0.75 - lv * 0.45) * A.rand(0.7, 1.2);
  }
  function whack(i) {
    if (S.state !== 'playing' || over) return; var h = holes[i];
    if (!h.kind || h.hit) { combo = 0; A.sfx('wall', 0.8); hud(); return; }
    h.hit = 0.25;
    if (h.kind === 'bomb') { time = Math.max(0, time - 5); combo = 0; fx.burst(h.x, h.y - 30, '#ff4d6d', 30, 360, 0.6, 4); fx.flashIt('#ff2244', 0.4); fx.shake(8, 0.3); fx.text(h.x, h.y - 80, '-5초', '#ff4d6d', 26); A.sfx('boom'); A.vibrate(120); }
    else {
      combo++; hits++; bestCombo = Math.max(bestCombo, combo);
      var pts = (h.kind === 'gold' ? 30 : 10) * Math.min(4, 1 + Math.floor(combo / 5)); score += pts;
      fx.burst(h.x, h.y - 30, h.kind === 'gold' ? '#ffd166' : '#ffb547', 16, 260, 0.45, 3); fx.text(h.x, h.y - 90, '+' + pts, h.kind === 'gold' ? '#ffd166' : '#fff', 22);
      A.sfx(h.kind === 'gold' ? 'gold' : 'hit', 1 + Math.min(combo, 15) * 0.04); A.vibrate(12); fx.shake(2, 0.06);
    }
    hud();
  }
  function update(dt) {
    fx.update(dt); if (over) return;
    time -= dt; if (time <= 0) { time = 0; over = true; hud(); S.gameOver(score, [['잡은 두더지', String(hits)], ['최대 콤보', String(bestCombo)]], { kick: 'TIME UP', win: true }); return; }
    spawnT -= dt; if (spawnT <= 0) spawn();
    holes.forEach(function (h) {
      if (!h.kind) return;
      if (h.hit > 0) { h.hit -= dt; h.up = Math.max(0, h.up - dt * 6); if (h.hit <= 0) h.kind = null; return; }
      h.life -= dt; h.up = h.life > 0.15 ? Math.min(1, h.up + dt * 8) : Math.max(0, h.up - dt * 8);
      if (h.life <= 0) { if (h.kind !== 'bomb') combo = 0; h.kind = null; }
    });
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0f05'); g.addColorStop(1, '#2d1b08'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    var hs = holes || CX.concat(CX, CX).map(function (x, i) { return { x: x, y: CY[Math.floor(i / 3)], kind: (i * 7 + Math.floor(t)) % 4 === 0 ? 'mole' : null, up: 1, hit: 0 }; });
    hs.forEach(function (h, i) {
      c.fillStyle = '#0a0602'; c.beginPath(); c.ellipse(h.x, h.y, HR, HR * 0.38, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,181,71,.35)'; c.lineWidth = 3; c.stroke();
      if (h.kind) {
        c.save(); c.beginPath(); c.rect(h.x - 80, h.y - 160, 160, 160); c.clip();
        var y = h.y + 10 - h.up * 90, col = h.kind === 'gold' ? '#ffd166' : h.kind === 'bomb' ? '#2a2a2a' : '#c27a3a';
        c.fillStyle = col; c.beginPath(); c.ellipse(h.x, y, 44, 54, 0, 0, 7); c.fill();
        if (h.kind === 'bomb') { c.strokeStyle = '#ff4d6d'; c.lineWidth = 4; c.stroke(); c.fillStyle = '#ff4d6d'; c.font = '700 34px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✕', h.x, y); }
        else {
          var hit = h.hit > 0; c.fillStyle = '#1a0d04';
          if (hit) { c.font = '700 20px system-ui'; c.textAlign = 'center'; c.fillText('× ×', h.x, y - 10); }
          else { c.beginPath(); c.arc(h.x - 14, y - 12, 5, 0, 7); c.arc(h.x + 14, y - 12, 5, 0, 7); c.fill(); }
          c.fillStyle = '#ff9ecf'; c.beginPath(); c.ellipse(h.x, y + 4, 9, 6, 0, 0, 7); c.fill();
        }
        c.restore();
      }
      c.fillStyle = '#2d1b08'; c.fillRect(h.x - 80, h.y + 2, 160, 60);
      { c.fillStyle = 'rgba(255,255,255,.12)'; c.font = '700 13px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.fillText(String([7, 8, 9, 4, 5, 6, 1, 2, 3][i]), h.x, h.y + 40); }
    });
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + combo; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.ceil(time); document.getElementById('hC').textContent = combo; document.getElementById('hMult').textContent = combo >= 5 ? '×' + Math.min(4, 1 + Math.floor(combo / 5)) : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e), best = -1, bd = 1e9;
    holes.forEach(function (h, i) { var d = Math.hypot(p.x - h.x, (p.y - (h.y - 40)) * 0.8); if (d < bd) { bd = d; best = i; } });
    if (bd < 100) whack(best);
  });
  var KEYPAD = { '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8 };
  var S = new A.Shell({ id: 'whack', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (KEYPAD[e.key] != null && !e.repeat) whack(KEYPAD[e.key]); } });
})();
