(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var SYM = ['★', '♥', '♦', '♣', '♠', '●', '▲', '■', '☀', '☾', '✿', '♪', '✚', '⚡', '☂', '✈', '⚑', '❄'];
  var COL = ['#ffd166', '#ff4d6d', '#5ee7ff', '#7dff9b', '#b48cff', '#ff7a45', '#ff9ecf', '#c3ff5e', '#ffe066', '#9be7ff', '#ff5ec4', '#4dffd2', '#ffb547', '#7aa2ff', '#5effc8', '#ff9e4d', '#e8e8ff', '#c9b8ff'];
  var land = false, cards, cols, rows, CW, CH, GX, GY, open, stage, time, score, combo, lock, peekT, cur = 0, kbd = false, nextT = 0, addSec = 0;
  function setup() {
    var pairs = Math.min(15, 3 + stage * 1); var total = pairs * 2;
    cols = total <= 8 ? 4 : total <= 12 ? 4 : total <= 20 ? 5 : 6; rows = Math.ceil(total / cols);
    layout();
    var ids = []; for (var i = 0; i < pairs; i++) ids.push(i, i);
    for (i = ids.length - 1; i > 0; i--) { var j = A.irand(0, i), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    cards = ids.map(function (id) { return { id: id, up: false, done: false, f: 0 }; });
    open = []; lock = 0; nextT = 0; peekT = 1.2 + pairs * 0.08; cards.forEach(function (c) { c.up = true; }); cur = Math.min(cur, cards.length - 1);
  }
// 세로: 540×960 / 가로 화면: 720×720 (열·행 수는 그대로 두고 카드 크기만 바꿈 → 회전해도 카드 위치가 같음)
  function layout() { if (!cols) return; if (land) { CW = Math.min(160, Math.floor(680 / cols)); CH = Math.min(Math.floor(640 / rows), Math.floor(CW * 1.3)); GX = (W - cols * CW) / 2; GY = 50 + (660 - rows * CH) / 2; } else { CW = Math.min(110, Math.floor(500 / cols)); CH = Math.min(140, Math.floor(700 / rows), Math.floor(CW * 1.3)); GX = (W - cols * CW) / 2; GY = 140 + (740 - rows * CH) / 2; } }
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; layout(); }
  function reset() { stage = 1; time = 40; score = 0; combo = 0; setup(); fx.clear(); hud(); }
  function flip(i) {
    var c = cards[i]; if (!c || c.done || nextT > 0 || peekT > 0 || S.state !== 'playing') return;
    // 틀린 두 장이 보이는 동안 다른 카드를 누르면 바로 덮고 새 카드를 뒤집음 (기다리지 않아도 됨)
    if (lock > 0 && open.length === 2) { if (open.indexOf(i) >= 0) return; open.forEach(function (k) { cards[k].up = false; }); open = []; lock = 0; }
    if (c.up || lock > 0) return;
    c.up = true; open.push(i); A.sfx('click', 1.2);
    if (open.length === 2) {
      var a = cards[open[0]], b = cards[open[1]];
      if (a.id === b.id) { a.done = b.done = true; combo++; var pts = 20 * Math.min(5, combo); score += pts; A.sfx('coin', 1 + combo * 0.05); fx.text(GX + (open[1] % cols + 0.5) * CW, GY + Math.floor(open[1] / cols) * CH, '+' + pts, '#ffd166', 20); open = [];
        if (cards.every(function (q) { return q.done; })) { var bonus = Math.round(time) * 5 + stage * 50; score += bonus; var add = 10 + stage * 2; time += add; fx.text(W / 2, H / 2, '단계 클리어! +' + bonus, '#b48cff', 26); A.sfx('level'); for (var k = 0; k < 3; k++) fx.burst(A.rand(120, W - 120), A.rand(H * 0.3, H * 0.7), '#b48cff', 18, 300, 0.7, 4); stage++; nextT = 0.9; addSec = add; } }
      else { combo = 0; lock = 0.7; A.sfx('wall'); }
    }
    hud();
  }
  function update(dt) {
    fx.update(dt);
    if (nextT > 0) { nextT -= dt; if (nextT <= 0) { setup(); S.banner('STAGE ' + stage, '+' + addSec + '초'); } cards.forEach(function (c) { c.f = A.lerp(c.f, 1, Math.min(1, dt * 14)); }); hud(); return; }
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
  function hud() { var k = score + '|' + stage + '|' + Math.ceil(time) + '|' + combo; if (k === last) return; last = k; document.getElementById('hMult').textContent = combo > 1 ? '콤보 ×' + Math.min(5, combo) : ''; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; var t = document.getElementById('hC'); t.textContent = Math.ceil(time); t.style.color = time < 8 ? '#ff4d6d' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), x = Math.floor((p.x - GX) / CW), y = Math.floor((p.y - GY) / CH); if (x >= 0 && x < cols && y >= 0 && y < rows) flip(y * cols + x); });
    // 가로 화면 패널: 점수판 복사본 + 큰 버튼 (게임판 위 점수판은 가로에서 숨김)
  function landPanel(btns) {
    var hudEl = document.querySelector('.g-hud'), ids = ['hA', 'hB', 'hC'], h = '<div class="g-card gp-stats">';
    hudEl.setAttribute('data-land-hide', '');
    ids.forEach(function (id) { var v = document.getElementById(id), lb = v.parentNode.querySelector('.h-lb'); h += '<div><span>' + (lb ? lb.textContent : '') + '</span><b id="pk' + id + '" style="font-size:22px"></b></div>'; });
    h += '</div><div id="pkMult" style="min-height:18px;padding:0 6px;font-size:14px;font-weight:700;color:var(--accent)"></div>' + (btns || '');
    S.panelSlot.innerHTML = h;
    function sync() { ids.forEach(function (id) { var v = document.getElementById(id), d = document.getElementById('pk' + id); d.textContent = v.textContent; d.style.color = v.style.color; }); var m = document.getElementById('hMult'); document.getElementById('pkMult').textContent = m ? m.textContent : ''; }
    new MutationObserver(sync).observe(hudEl, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style'] });
    sync();
  }
  var S = new A.Shell({ id: 'memory', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key, n = cards.length;
      if (k === 'ArrowLeft' || k === 'a') cur = Math.max(0, cur - 1); if (k === 'ArrowRight' || k === 'd') cur = Math.min(n - 1, cur + 1);
      if (k === 'ArrowUp' || k === 'w') cur = Math.max(0, cur - cols); if (k === 'ArrowDown' || k === 's') cur = Math.min(n - 1, cur + cols);
      if ((k === ' ' || k === 'Enter') && !e.repeat) flip(cur); } });
  landPanel('');
})();
