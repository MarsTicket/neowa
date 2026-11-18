(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CX = W / 2, CY = 520, K = 1, land = false;
  // 세로: 540×960 / 가로 화면: 720×720 정사각형에 패드를 1.4배로 (점수판·남은 기회는 오른쪽 패널)
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; CX = W / 2; CY = land ? H / 2 : 520; K = land ? 1.4 : 1; if (S && score != null) hud(); }
  var fx = new A.FX();
  var COLS = ['#4dffd2', '#ff4d6d', '#ffd166', '#7aa2ff', '#ff9ecf', '#c3ff5e'], NOTES = [1, 1.26, 1.5, 1.68, 2, 2.24];
  var seq, step, mode, showI, showT, lit = {}, level, score, dyingT, pads, waitT = 0, waitFn = null, chances = 1, inT = 0;
  function layoutPads() {
    var n = level >= 10 ? 6 : 4; pads = [];
    for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i / n * Math.PI * 2; pads.push({ a0: a - Math.PI / n + 0.04, a1: a + Math.PI / n - 0.04, i: i }); }
  }
  function reset() { seq = []; level = 0; score = 0; dyingT = 0; lit = {}; waitT = 0; waitFn = null; chances = 1; nextLevel(); fx.clear(); hud(); }
  // setTimeout 대신 update 안에서 세는 대기 (일시정지해도 멈추지 않게)
  function later(sec, fn) { waitT = sec; waitFn = fn; }
  function nextLevel() { level++; layoutPads(); seq.push(A.irand(0, pads.length - 1)); seq = seq.map(function (v) { return v % pads.length; }); mode = 'show'; showI = -1; showT = 0.7; step = 0; inT = 0; hud(); }
  function light(i, dur) { lit[i] = dur; A.sfx('eat', NOTES[i]); }
  function press(i) {
    if (S.state !== 'playing' || mode !== 'input' || dyingT > 0 || i >= pads.length) return;
    light(i, 0.25);
    if (seq[step] === i) {
      step++; if (step >= seq.length) {
        // 빠르게 따라 누르면 보너스 (한 개당 평균 0.55초 이내)
        var pts = level * 10, quick = level >= 3 && inT / seq.length < 0.55; if (quick) pts += level * 5;
        score += pts; fx.text(CX, CY - 120, (quick ? '빠른 손! ' : '') + '+' + pts, quick ? '#ffd166' : '#4dffd2', 26); mode = 'wait';
        if (level % 5 === 0) fx.burst(CX, CY, '#4dffd2', 30, 360, 0.8, 4);
        later(0.7, function () { if (level % 5 === 0) { S.banner('LEVEL ' + (level + 1), level + 1 === 10 ? '6색 모드' : '더 빠르게'); A.sfx('level'); } nextLevel(); });
      }
    } else if (chances > 0) {
      // 한 번은 봐줌: 같은 순서를 다시 보여 줌
      chances--; mode = 'wait'; fx.shake(6, 0.3); fx.flashIt('#ffd166', 0.3); A.sfx('hurt'); A.vibrate(80); lit[seq[step]] = 0.9;
      fx.text(CX, CY - 120, '한 번 더! 다시 보여 줄게요', '#ffd166', 22);
      later(1.1, function () { mode = 'show'; showI = -1; showT = 0.5; step = 0; inT = 0; hud(); });
    } else { mode = 'over'; dyingT = 1.2; fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(160); lit[seq[step]] = 1.2; }
    hud();
  }
  function update(dt) {
    fx.update(dt); for (var k in lit) { lit[k] -= dt; if (lit[k] <= 0) delete lit[k]; }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) { var best = Math.max(A.getInt('neowa_seq_best'), level - 1); A.set('neowa_seq_best', best); S.gameOver(score, [['기억한 길이', String(level - 1)], ['내 최장', String(best)]]); } return; }
    if (waitT > 0) { waitT -= dt; if (waitT <= 0 && waitFn) { var f = waitFn; waitFn = null; f(); } return; }
    if (mode === 'input') inT += dt;
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
    if (K !== 1) { c.translate(CX, CY); c.scale(K, K); c.translate(-CX, -CY); }
    pads.forEach(function (p) {
      var on = lit[p.i] > 0 || (!seq && Math.floor(t * 2) % pads.length === p.i);
      c.save(); if (on) { c.globalCompositeOperation = 'lighter'; c.fillStyle = A.hexA(COLS[p.i], 0.25); c.beginPath(); c.arc(CX, CY, 236, p.a0 - 0.03, p.a1 + 0.03); c.arc(CX, CY, 78, p.a1 + 0.03, p.a0 - 0.03, true); c.closePath(); c.fill(); c.globalCompositeOperation = 'source-over'; }
      c.fillStyle = on ? COLS[p.i] : A.hexA(COLS[p.i], 0.22);
      c.beginPath(); c.arc(CX, CY, 220, p.a0, p.a1); c.arc(CX, CY, 90, p.a1, p.a0, true); c.closePath(); c.fill(); c.restore();
      var m = (p.a0 + p.a1) / 2; c.fillStyle = 'rgba(255,255,255,.3)'; c.font = '700 16px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(p.i + 1), CX + Math.cos(m) * 155, CY + Math.sin(m) * 155);
    });
    c.fillStyle = '#04120f'; c.beginPath(); c.arc(CX, CY, 84, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '700 48px "Chakra Petch",system-ui'; c.fillText(String(level || 0), CX, CY - 6);
    c.font = '600 15px "Pretendard Variable",system-ui'; c.fillStyle = mode === 'input' ? '#4dffd2' : 'rgba(255,255,255,.5)';
    c.fillText(mode === 'show' ? '잘 보세요' : mode === 'input' ? '따라 누르세요 ' + step + '/' + seq.length : '', CX, CY + 34);
    if (S.state === 'playing' && !land) { c.font = '600 16px "Pretendard Variable",system-ui'; c.fillStyle = chances > 0 ? '#ffd166' : 'rgba(255,255,255,.3)'; c.fillText(chances > 0 ? '♥ 실수 1번 봐줌' : '♡ 이제 실수하면 끝', CX, CY + 290); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = level; document.getElementById('hC').textContent = Math.max(A.getInt('neowa_seq_best'), 0); document.getElementById('hMult').textContent = land ? (chances > 0 ? '♥ 실수 1번 봐줌' : '♡ 이제 실수하면 끝') : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e), dx = (p.x - CX) / K, dy = (p.y - CY) / K, d = Math.hypot(dx, dy); if (d < 80 || d > 260) return;
    var a = Math.atan2(dy, dx); pads.forEach(function (pd) { var aa = a; while (aa < pd.a0) aa += Math.PI * 2; while (aa > pd.a0 + Math.PI * 2) aa -= Math.PI * 2; if (aa <= pd.a1 + 0.04) press(pd.i); });
  });
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
  var S = new A.Shell({ id: 'sequence', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (/^[1-6]$/.test(e.key) && !e.repeat) press(+e.key - 1); } });
  landPanel('');
})();
