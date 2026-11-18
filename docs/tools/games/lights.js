(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var land = false, N, CS, GX, GY, on, sol, stage, moves, score, done, hints, cur = { x: 0, y: 0 }, kbd = false, pulse = {}, par = 0, limit = 0, lives = 3, failT = 0, dyingT = 0;
  function setup() {
    N = Math.min(7, 3 + Math.floor((stage + 1) / 2)); layout();
    on = []; sol = []; for (var i = 0; i < N * N; i++) { on.push(false); sol.push(false); }
    // 정답 누르기를 무작위로 만들어 적용 → 항상 풀 수 있음
    var presses = Math.min(N * N - 2, 2 + stage);
    for (var k = 0; k < presses; k++) { var j = A.irand(0, N * N - 1); sol[j] = !sol[j]; flipAt(j, true); }
    if (!on.some(Boolean)) return setup();
    // 기준 횟수(par) = 정답 누르기 수. 제한 = 넉넉하게 par×3+6
    par = sol.filter(Boolean).length; limit = par * 3 + 6;
    moves = 0; done = 0; failT = 0; cur = { x: Math.floor(N / 2), y: Math.floor(N / 2) };
  }
// 세로: 540×960 / 가로 화면: 720×720 정사각형 판 (♥·목표·힌트는 오른쪽 패널)
  function layout() { if (!N) return; if (land) { CS = Math.floor(650 / N); GX = (W - N * CS) / 2; GY = (H - N * CS) / 2; } else { CS = Math.floor(470 / N); GX = (W - N * CS) / 2; GY = 200 + (540 - N * CS) / 2; } }
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; layout(); if (S && score != null) hud(); }
  function msgY() { return land ? H / 2 : GY - 40; }
  function flipAt(i, silent) {
    var x = i % N, y = Math.floor(i / N);
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = x + d[0], ny = y + d[1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N) { on[ny * N + nx] = !on[ny * N + nx]; if (!silent) pulse[ny * N + nx] = 0.25; } });
  }
  function reset() { stage = 1; score = 0; hints = 3; lives = 3; dyingT = 0; setup(); fx.clear(); hud(); }
  function press(i) {
    if (S.state !== 'playing' || done || failT > 0 || dyingT > 0) return;
    flipAt(i); sol[i] = !sol[i]; moves++; A.sfx('tap', on[i] ? 1.5 : 0.9); hud();
    if (!on.some(Boolean)) {
      var perfect = moves <= par, pts = Math.max(20, 100 * stage - Math.max(0, moves - par) * 10) + (perfect ? 50 * stage : 0); score += pts; done = 1; A.sfx('win'); if (perfect) A.sfx('gold');
      fx.text(W / 2, msgY(), (perfect ? 'PERFECT! +' : '불 끄기 성공! +') + pts, '#ffe066', 26); for (var k = 0; k < 4; k++) fx.burst(A.rand(120, W - 120), A.rand(300, 700), '#ffe066', 20, 300, 0.7, 4);
      if (stage % 5 === 0) { hints++; fx.text(W / 2, land ? H / 2 + 40 : 800, '힌트 +1', '#5ee7ff', 20); }
    } else if (moves >= limit) {
      // 제한 횟수 초과 → 목숨 하나 잃고 새 판 (0이 되면 끝)
      lives--; A.sfx('hurt'); fx.shake(8, 0.3); fx.flashIt('#ff2244', 0.4); A.vibrate(120);
      if (lives <= 0) { dyingT = 1.2; fx.text(W / 2, msgY(), '횟수 초과!', '#ff4d6d', 26); }
      else { failT = 1.2; fx.text(W / 2, msgY(), '횟수 초과! 새 판으로', '#ff4d6d', 24); }
      hud();
    }
  }
  function hint() {
    if (hints <= 0 || done || failT > 0 || dyingT > 0) { A.sfx('wrong'); return; } var idx = []; sol.forEach(function (v, i) { if (v) idx.push(i); });
    if (!idx.length) return; hints--; var h = A.pick(idx); pulse[h] = 1.2; fx.ring(GX + (h % N + 0.5) * CS, GY + (Math.floor(h / N) + 0.5) * CS, '#5ee7ff', CS, 0.6); A.sfx('power'); score = Math.max(0, score - 20); hud();
  }
  function update(dt) {
    fx.update(dt); for (var k in pulse) { pulse[k] -= dt; if (pulse[k] <= 0) delete pulse[k]; }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['단계', String(stage)], ['남은 힌트', String(hints)]]); return; }
    if (failT > 0) { failT -= dt; if (failT <= 0) { setup(); S.banner('STAGE ' + stage, '다시 도전 · ♥' + lives); hud(); } }
    if (done > 0) { done -= dt; if (done <= 0) { stage++; setup(); S.banner('STAGE ' + stage, N + '×' + N + ' · 목표 ' + par + '번'); hud(); } }
  }
  // 켜진 칸의 빛 번짐은 미리 한 번만 그려 둠 (매 프레임 shadowBlur 금지)
  function litSprite() { var m = 30; return A.sprite('lights' + CS, CS + m, CS + m, function (x) { x.shadowColor = '#ffe066'; x.shadowBlur = 26; x.fillStyle = '#ffe066'; A.rr(x, m / 2 + 6, m / 2 + 6, CS - 12, CS - 12, 14); x.fill(); }); }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0d0b02'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!on) { stage = 1; setup(); }
    for (var i = 0; i < N * N; i++) {
      var x = i % N, y = Math.floor(i / N), px = GX + x * CS, py = GY + y * CS, lit = on[i];
      if (lit) { A.draw(c, litSprite(), px + CS / 2, py + CS / 2); c.fillStyle = 'rgba(255,255,255,.5)'; A.rr(c, px + 14, py + 12, CS - 28, 6, 3); c.fill(); }
      else { c.fillStyle = '#1e1b0c'; A.rr(c, px + 6, py + 6, CS - 12, CS - 12, 14); c.fill(); }
      if (pulse[i] > 0) { c.strokeStyle = 'rgba(94,231,255,' + Math.min(1, pulse[i] * 2) + ')'; c.lineWidth = 4; A.rr(c, px + 4, py + 4, CS - 8, CS - 8, 16); c.stroke(); }
    }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, GX + cur.x * CS + 2, GY + cur.y * CS + 2, CS - 4, CS - 4, 16); c.stroke(); }
    if (!land) {
    c.fillStyle = hints > 0 ? 'rgba(94,231,255,.15)' : 'rgba(255,255,255,.04)'; A.rr(c, W / 2 - 100, 840, 200, 56, 16); c.fill();
    c.fillStyle = hints > 0 ? '#5ee7ff' : 'rgba(255,255,255,.3)'; c.font = '700 18px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('힌트 ' + (hints == null ? 3 : hints), W / 2, 868);
    if (S.state === 'playing' && par) { c.font = '600 16px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,224,102,.75)'; c.fillText('목표 ' + par + '번 · 제한 ' + limit + '번', W / 2, GY - 70); c.fillStyle = '#ff4d6d'; c.font = '700 22px system-ui'; c.fillText('♥♥♥'.slice(0, lives) + '♡♡♡'.slice(0, 3 - lives), W / 2, GY - 104); }
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; var m = document.getElementById('hC'); m.textContent = moves + '/' + limit; m.style.color = limit - moves <= 3 ? '#ff4d6d' : '';
    document.getElementById('hMult').textContent = land && par ? '♥♥♥'.slice(0, lives) + '♡♡♡'.slice(0, 3 - lives) + '  목표 ' + par + '번 · 제한 ' + limit + '번' : '';
    var hb = document.getElementById('pkHint'); if (hb) { hb.querySelector('.cnt').textContent = hints; hb.disabled = !(hints > 0); } }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e);
    if (!land && p.y > 840 && p.y < 896 && Math.abs(p.x - W / 2) < 100) { hint(); return; }
    var x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) press(y * N + x);
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
  var S = new A.Shell({ id: 'lights', W: W, H: H, land: [720, 720], onResize: geo, update: update, idle: function (dt) { fx.update(dt); }, render: render, reset: reset,
    keydown: function (e) { kbd = true; var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(N - 1, cur.x + 1);
      if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(N - 1, cur.y + 1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) press(cur.y * N + cur.x); if (k === 'h' || k === 'H') hint(); } });
  landPanel('<button class="gp-btn main" id="pkHint">힌트 보기 <span class="cnt">3</span></button>');
  document.getElementById('pkHint').addEventListener('click', function () { if (S.state === 'playing') hint(); });
})();
