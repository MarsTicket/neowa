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
  /* 그림: 카드 뒷면(별자리 무늬)·앞면(크림색 종이) 캐시, 별밤 테이블 배경 */
  function backSpr(w, h) {
    return A.sprite('mmback' + w + 'x' + h, w, h, function (x) {
      var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#7a5ae6'); g.addColorStop(1, '#2e1a7a'); x.fillStyle = g; A.rr(x, 0, 0, w, h, 12); x.fill();
      x.strokeStyle = '#ffd166'; x.lineWidth = 2; A.rr(x, 6, 6, w - 12, h - 12, 8); x.stroke();
      x.save(); A.rr(x, 8, 8, w - 16, h - 16, 7); x.clip();
      x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1; for (var k = -h; k < w + h; k += 10) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + h, h); x.moveTo(k + h, 0); x.lineTo(k, h); x.stroke(); }
      x.restore();
      x.fillStyle = '#ffd166'; x.save(); x.translate(w / 2, h / 2); var r = Math.min(w, h) * 0.17; x.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.fill();
      x.strokeStyle = 'rgba(255,209,102,.5)'; x.beginPath(); x.arc(0, 0, r * 1.5, 0, 7); x.stroke(); x.restore();
      x.fillStyle = 'rgba(255,255,255,.18)'; A.rr(x, 4, 3, w - 8, h * 0.3, 10); x.fill();
    });
  }
  function faceSpr(w, h, done) {
    return A.sprite('mmface2' + w + 'x' + h + (done ? 'd' : ''), w, h, function (x) {
      var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, done ? '#2a2048' : '#232a5a'); g.addColorStop(1, done ? '#1a1430' : '#141838'); x.fillStyle = g; A.rr(x, 0, 0, w, h, 12); x.fill();
      x.strokeStyle = done ? 'rgba(180,140,255,.35)' : 'rgba(255,209,102,.7)'; x.lineWidth = 1.5; A.rr(x, 5, 5, w - 10, h - 10, 8); x.stroke(); if (!done) { var rg = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.5); rg.addColorStop(0, 'rgba(255,255,255,.12)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, h); }
    });
  }
  var TABLE = A.sprite('mmtable', W, H, function (x) {
    var g = x.createRadialGradient(W / 2, H * 0.5, 50, W / 2, H * 0.5, 640); g.addColorStop(0, '#24104a'); g.addColorStop(1, '#05020f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 110; i++) { x.globalAlpha = Math.random() * 0.6; x.fillStyle = '#fff'; x.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2); }
    x.globalAlpha = 1;
  });
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(TABLE, -10, -10, W + 20, H + 20);
    if (!cards) { stage = 1; setup(); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    var cw = Math.round(CW - 10), chh = Math.round(CH - 10);
    cards.forEach(function (cd, i) {
      var x = GX + (i % cols) * CW, y = GY + Math.floor(i / cols) * CH, sx = Math.abs(Math.cos(cd.f * Math.PI)), front = cd.f > 0.5;
      c.fillStyle = 'rgba(0,0,0,.35)'; A.rr(c, x + 7, y + 9, CW - 10, CH - 10, 12); c.fill();
      c.save(); c.translate(x + CW / 2, y + CH / 2); c.scale(Math.max(0.04, sx), 1);
      if (front) {
        c.drawImage(faceSpr(cw, chh, cd.done), -cw / 2, -chh / 2, cw, chh);
        c.fillStyle = cd.done ? COL[cd.id] : A.hexA(COL[cd.id], 1); c.globalAlpha = cd.done ? 0.55 : 1;
        c.font = '700 ' + Math.round(CW * 0.45) + 'px system-ui';
        if (!cd.done) { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillText(SYM[cd.id], 1.5, 4); c.fillStyle = COL[cd.id]; }
        c.fillText(SYM[cd.id], 0, 2); c.globalAlpha = 1;
      } else c.drawImage(backSpr(cw, chh), -cw / 2, -chh / 2, cw, chh);
      c.restore();
      if (kbd && i === cur && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, x + 2, y + 2, CW - 4, CH - 4, 14); c.stroke(); }
    });
    if (peekT > 0 && S.state === 'playing') { c.fillStyle = '#ffd166'; c.font = '700 22px "Pretendard Variable",system-ui'; c.fillText('잘 기억하세요!', W / 2, GY - 30); }
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
