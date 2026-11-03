(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var SYM = ['★', '♥', '♦', '♣', '♠', '●', '▲', '■', '☀', '☾', '✿', '♪', '✚', '⚡', '☂', '✈', '⚑', '❄'];
  var COL = ['#ffd166', '#ff4d6d', '#5ee7ff', '#7dff9b', '#b48cff', '#ff7a45', '#ff9ecf', '#c3ff5e', '#ffe066', '#9be7ff', '#ff5ec4', '#4dffd2', '#ffb547', '#7aa2ff', '#5effc8', '#ff9e4d', '#e8e8ff', '#c9b8ff'];
  var cards, cols, rows, CW, CH, GX, GY, open, stage, time, score, combo, lock, peekT, cur = 0, kbd = false;
  function setup() {
    var pairs = Math.min(15, 3 + stage * 1); var total = pairs * 2;
    cols = total <= 8 ? 4 : total <= 12 ? 4 : total <= 20 ? 5 : 6; rows = Math.ceil(total / cols);
    CW = Math.min(110, Math.floor(500 / cols)); CH = Math.min(140, Math.floor(700 / rows), Math.floor(CW * 1.3)); GX = (W - cols * CW) / 2; GY = 140 + (740 - rows * CH) / 2;
    var ids = []; for (var i = 0; i < pairs; i++) ids.push(i, i);
    for (i = ids.length - 1; i > 0; i--) { var j = A.irand(0, i), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    cards = ids.map(function (id) { return { id: id, up: false, done: false, f: 0 }; });
    open = []; lock = 0; peekT = 1.2 + pairs * 0.08; cards.forEach(function (c) { c.up = true; });
  }
  function reset() { stage = 1; time = 40; score = 0; combo = 0; setup(); fx.clear(); hud(); }
  function flip(i) {
    var c = cards[i]; if (!c || c.up || c.done || lock > 0 || peekT > 0 || S.state !== 'playing') return;
    c.up = true; open.push(i); A.sfx('click', 1.2);
    if (open.length === 2) {
      var a = cards[open[0]], b = cards[open[1]];
      if (a.id === b.id) { a.done = b.done = true; combo++; var pts = 20 * Math.min(5, combo); score += pts; A.sfx('coin', 1 + combo * 0.05); fx.text(GX + (open[1] % cols + 0.5) * CW, GY + Math.floor(open[1] / cols) * CH, '+' + pts, '#ffd166', 20); open = [];
        if (cards.every(function (q) { return q.done; })) { var bonus = Math.round(time) * 5 + stage * 50; score += bonus; time += 10 + stage * 2; fx.text(W / 2, H / 2, '단계 클리어! +' + bonus, '#b48cff', 26); A.sfx('level'); stage++; setTimeout(function () { if (S.state === 'playing') { setup(); S.banner('STAGE ' + stage, '+시간'); } }, 900); lock = 1; } }
      else { combo = 0; lock = 0.7; A.sfx('wall'); }
    }
    hud();
  }
  function update(dt) {
    fx.update(dt);
    if (peekT > 0) { peekT -= dt; if (peekT <= 0) cards.forEach(function (c) { if (!c.done) c.up = false; }); }
    if (lock > 0) { lock -= dt; if (lock <= 0 && open.length === 2) { open.forEach(function (i) { cards[i].up = false; }); open = []; } }
    cards.forEach(function (c) { c.f = A.lerp(c.f, c.up || c.done ? 1 : 0, Math.min(1, dt * 14)); });
    if (peekT <= 0) { time -= dt; if (time <= 0) { time = 0; S.gameOver(score, [['단계', String(stage)]]); return; } }
    hud();
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#10062a'); g.addColorStop(1, '#05020f'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!cards) { stage = 1; setup(); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    cards.forEach(function (cd, i) {
      var x = GX + (i % cols) * CW, y = GY + Math.floor(i / cols) * CH, sx = Math.abs(Math.cos(cd.f * Math.PI)), front = cd.f > 0.5;
      c.save(); c.translate(x + CW / 2, y + CH / 2); c.scale(Math.max(0.04, sx), 1);
      if (front) { c.fillStyle = cd.done ? 'rgba(180,140,255,.18)' : '#1a1036'; A.rr(c, -CW / 2 + 5, -CH / 2 + 5, CW - 10, CH - 10, 12); c.fill(); c.strokeStyle = COL[cd.id]; c.lineWidth = 2; c.stroke();
        c.fillStyle = COL[cd.id]; c.font = '700 ' + Math.round(CW * 0.45) + 'px system-ui'; c.globalAlpha = cd.done ? 0.5 : 1; c.fillText(SYM[cd.id], 0, 2); }
      else { var gg = c.createLinearGradient(0, -CH / 2, 0, CH / 2); gg.addColorStop(0, '#6a4ad6'); gg.addColorStop(1, '#3a228a'); c.fillStyle = gg; A.rr(c, -CW / 2 + 5, -CH / 2 + 5, CW - 10, CH - 10, 12); c.fill(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; A.rr(c, -CW / 2 + 12, -CH / 2 + 12, CW - 24, CH - 24, 8); c.stroke(); }
      c.restore();
      if (kbd && i === cur && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, x + 2, y + 2, CW - 4, CH - 4, 14); c.stroke(); }
    });
    if (peekT > 0 && S.state === 'playing') { c.fillStyle = '#b48cff'; c.font = '700 22px "Pretendard Variable",system-ui'; c.fillText('잘 기억하세요!', W / 2, GY - 30); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + stage + '|' + Math.ceil(time); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; var t = document.getElementById('hC'); t.textContent = Math.ceil(time); t.style.color = time < 8 ? '#ff4d6d' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), x = Math.floor((p.x - GX) / CW), y = Math.floor((p.y - GY) / CH); if (x >= 0 && x < cols && y >= 0 && y < rows) flip(y * cols + x); });
  var S = new A.Shell({ id: 'memory', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key, n = cards.length;
      if (k === 'ArrowLeft' || k === 'a') cur = Math.max(0, cur - 1); if (k === 'ArrowRight' || k === 'd') cur = Math.min(n - 1, cur + 1);
      if (k === 'ArrowUp' || k === 'w') cur = Math.max(0, cur - cols); if (k === 'ArrowDown' || k === 's') cur = Math.min(n - 1, cur + cols);
      if ((k === ' ' || k === 'Enter') && !e.repeat) flip(cur); } });
})();
