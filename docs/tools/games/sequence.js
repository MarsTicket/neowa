(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CX = W / 2, CY = 520;
  var fx = new A.FX();
  var COLS = ['#4dffd2', '#ff4d6d', '#ffd166', '#7aa2ff', '#ff9ecf', '#c3ff5e'], NOTES = [1, 1.26, 1.5, 1.68, 2, 2.24];
  var seq, step, mode, showI, showT, lit = {}, level, score, dyingT, pads;
  function layoutPads() {
    var n = level >= 10 ? 6 : 4; pads = [];
    for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i / n * Math.PI * 2; pads.push({ a0: a - Math.PI / n + 0.04, a1: a + Math.PI / n - 0.04, i: i }); }
  }
  function reset() { seq = []; level = 0; score = 0; dyingT = 0; lit = {}; nextLevel(); fx.clear(); hud(); }
  function nextLevel() { level++; layoutPads(); seq.push(A.irand(0, pads.length - 1)); seq = seq.map(function (v) { return v % pads.length; }); mode = 'show'; showI = -1; showT = 0.7; step = 0; hud(); }
  function light(i, dur) { lit[i] = dur; A.sfx('eat', NOTES[i]); }
  function press(i) {
    if (S.state !== 'playing' || mode !== 'input' || dyingT > 0 || i >= pads.length) return;
    light(i, 0.25);
    if (seq[step] === i) {
      step++; if (step >= seq.length) { score += level * 10; fx.text(CX, CY, '+' + level * 10, '#4dffd2', 26); mode = 'wait'; setTimeout(function () { if (S.state === 'playing') { if (level % 5 === 0) { S.banner('LEVEL ' + (level + 1), level + 1 >= 10 ? '6색 모드' : '더 빠르게'); A.sfx('level'); } nextLevel(); } }, 700); }
    } else { mode = 'over'; dyingT = 1.2; fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(160); lit[seq[step]] = 1.2; }
    hud();
  }
  function update(dt) {
    fx.update(dt); for (var k in lit) { lit[k] -= dt; if (lit[k] <= 0) delete lit[k]; }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) { var best = Math.max(A.getInt('neowa_seq_best'), level - 1); A.set('neowa_seq_best', best); S.gameOver(score, [['기억한 길이', String(level - 1)], ['내 최장', String(best)]]); } return; }
    if (mode === 'show') {
      showT -= dt;
      if (showT <= 0) { showI++; if (showI >= seq.length) { mode = 'input'; step = 0; hud(); return; } var gap = Math.max(0.28, 0.65 - level * 0.02); light(seq[showI], gap * 0.7); showT = gap; }
    }
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createRadialGradient(CX, CY, 0, CX, CY, 600); g.addColorStop(0, '#062a24'); g.addColorStop(1, '#020a08'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!pads) { level = 1; layoutPads(); }
    pads.forEach(function (p) {
      var on = lit[p.i] > 0 || (!seq && Math.floor(t * 2) % pads.length === p.i);
      c.save(); if (on) { c.shadowColor = COLS[p.i]; c.shadowBlur = 40; }
      c.fillStyle = on ? COLS[p.i] : A.hexA(COLS[p.i], 0.22);
      c.beginPath(); c.arc(CX, CY, 220, p.a0, p.a1); c.arc(CX, CY, 90, p.a1, p.a0, true); c.closePath(); c.fill(); c.restore();
      var m = (p.a0 + p.a1) / 2; c.fillStyle = 'rgba(255,255,255,.3)'; c.font = '700 16px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(p.i + 1), CX + Math.cos(m) * 155, CY + Math.sin(m) * 155);
    });
    c.fillStyle = '#04120f'; c.beginPath(); c.arc(CX, CY, 84, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '700 48px "Chakra Petch",system-ui'; c.fillText(String(level || 0), CX, CY - 6);
    c.font = '600 15px "Pretendard Variable",system-ui'; c.fillStyle = mode === 'input' ? '#4dffd2' : 'rgba(255,255,255,.5)';
    c.fillText(mode === 'show' ? '잘 보세요' : mode === 'input' ? '따라 누르세요 ' + step + '/' + seq.length : '', CX, CY + 34);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = level; document.getElementById('hC').textContent = Math.max(A.getInt('neowa_seq_best'), 0); }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e), dx = p.x - CX, dy = p.y - CY, d = Math.hypot(dx, dy); if (d < 80 || d > 260) return;
    var a = Math.atan2(dy, dx); pads.forEach(function (pd) { var aa = a; while (aa < pd.a0) aa += Math.PI * 2; while (aa > pd.a0 + Math.PI * 2) aa -= Math.PI * 2; if (aa <= pd.a1 + 0.04) press(pd.i); });
  });
  var S = new A.Shell({ id: 'sequence', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (/^[1-6]$/.test(e.key) && !e.repeat) press(+e.key - 1); } });
})();
