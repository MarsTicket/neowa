(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var diff = +A.get('neowa_slide_diff', '0') || 0, land = false, N, CS, GX, GY, tiles, empty, moves, time, done, anim, cur;
  // 세로: 540×960 / 가로 화면: 720×720 정사각형 판 (점수판은 오른쪽 패널로)
  function layout() { N = 3 + sz(); if (land) { CS = Math.floor(660 / N); GX = (W - N * CS) / 2; GY = (H - N * CS) / 2; } else { CS = Math.floor(480 / N); GX = (W - N * CS) / 2; GY = 200 + (560 - N * CS) / 2; } }
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; layout(); }
  // 오늘의 퍼즐: 로컬 날짜(YYYYMMDD)로 시드를 고정 → 오늘은 누구나 같은 판
  function ymd() { var d = new Date(); return '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function seeded(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 첫 플레이 안내: 처음 한 판에만 판 위에 손가락 안내를 띄우고, 첫 올바른 행동을 하면 사라짐 (neowa_slide_tut = 1)
  var tut = A.get('neowa_slide_tut', '') !== '1';
  function tutDone() { if (tut) { tut = false; A.set('neowa_slide_tut', '1'); } }
  function isTouch() { return document.body.classList.contains('touch'); }
  function drawTut(c, x, y, msg, up) {
    if (!tut || S.state !== 'playing') return;
    var t = S.time, by = up ? y - 70 : y + 70;
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    var rr = 26 + 6 * Math.sin(t * 6); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 8; c.beginPath(); c.arc(x, y, rr, 0, 7); c.stroke(); c.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(t * 6)) + ')'; c.lineWidth = 4; c.stroke();
    c.font = '700 18px "Pretendard Variable",system-ui'; var w = Math.min(W - 24, c.measureText(msg).width + 32), bx = A.clamp(x, w / 2 + 12, W - w / 2 - 12);
    c.fillStyle = 'rgba(0,0,0,.78)'; A.rr(c, bx - w / 2, by - 22, w, 44, 14); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#fff'; c.fillText(msg, bx, by + 1);
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); var ay = up ? y - 44 + 4 * Math.sin(t * 6) : y + 44 - 4 * Math.sin(t * 6), d = up ? -1 : 1; c.moveTo(x, ay - d * 10); c.lineTo(x - 9, ay + d * 2); c.lineTo(x + 9, ay + d * 2); c.closePath(); c.fill();
    c.restore();
  }
  var DAILY = 3; // 난이도 버튼 4번째 = 오늘의 퍼즐 (4×4)
  function sz() { return diff === DAILY ? 1 : diff; }
  function solved() { for (var i = 0; i < N * N - 1; i++) if (tiles[i] !== i + 1) return false; return true; }
  function swap(i) { var t = tiles[i]; tiles[i] = 0; tiles[empty] = t; anim[t] = { from: i, t: 0 }; empty = i; }
  function reset() {
    layout(); tiles = []; for (var i = 1; i < N * N; i++) tiles.push(i); tiles.push(0); empty = N * N - 1; anim = {};
    // 빈칸을 무작위로 많이 움직여 섞음 → 항상 풀 수 있음
    var rnd = diff === DAILY ? seeded(+ymd() * 7 + (reset.re || 0)) : Math.random;
    var last = -1; for (var k = 0; k < 220 * N; k++) { var opts = nb(empty).filter(function (j) { return j !== last; }); var j = opts[Math.floor(rnd() * opts.length)]; last = empty; var t = tiles[j]; tiles[j] = 0; tiles[empty] = t; empty = j; }
    if (solved()) { reset.re = (reset.re || 0) + 1; return reset(); } reset.re = 0;
    moves = 0; time = 0; done = 0; anim = {}; cur = empty; btCache = bestTime(); fx.clear(); hud();
  }
  function nb(i) { var x = i % N, y = Math.floor(i / N), r = []; if (x > 0) r.push(i - 1); if (x < N - 1) r.push(i + 1); if (y > 0) r.push(i - N); if (y < N - 1) r.push(i + N); return r; }
  function tap(i) {
    if (done || S.state !== 'playing') return;
    var ex = empty % N, ey = Math.floor(empty / N), x = i % N, y = Math.floor(i / N);
    if (x !== ex && y !== ey) { A.sfx('wrong', 0.9); return; }
    if (i === empty) return;
    // 같은 줄이면 한 번에 여러 칸 밀기
    var step = x === ex ? (y < ey ? -N : N) : (x < ex ? -1 : 1);
    while (empty !== i) { swap(empty + step); moves++; }
    tutDone();
    A.sfx('slide', 1.1); hud();
    if (solved()) { done = 1.2; A.sfx('win'); for (var k = 0; k < 5; k++) fx.burst(A.rand(100, W - 100), A.rand(250, 700), A.pick(['#5ee7ff', '#ffd166', '#7dff9b']), 24, 360, 0.8, 4); }
  }
  // 기준 시간·이동 수(보통 실력)에서 기본 점수, 더 빠르고 적게 움직일수록 최대 4배까지
  // (예전 식은 4×4·5×5에서 몇 분만 지나도 최저점 50으로 떨어졌음)
  function score() { var base = [300, 1200, 3000][sz()], T = [25, 90, 240][sz()], M = [40, 140, 320][sz()]; return Math.max(50, Math.round(base * 4 * T / (T + time) * M / (M + moves))); }
  function timeKey() { return diff === DAILY ? 'neowa_slide_daily_' + ymd() : 'neowa_slide_time_' + diff; }
  function bestTime() { return parseFloat(A.get(timeKey(), '0')) || 0; }
  function update(dt) {
    fx.update(dt); for (var k in anim) { anim[k].t += dt * 9; if (anim[k].t >= 1) delete anim[k]; }
    if (done > 0) { done -= dt; if (done <= 0) { var key = timeKey(), b = bestTime(), nb = !b || time < b; if (nb) A.set(key, time.toFixed(1)); S.gameOver(score(), [['이동', String(moves)], ['시간', fmt(time)], [(diff === DAILY ? '오늘 최단' : '최단 시간') + (nb ? ' (신기록!)' : ''), fmt(nb ? time : b)]], { kick: diff === DAILY ? '오늘의 퍼즐 SOLVED!' : N + '×' + N + ' SOLVED!', win: true }); } return; }
    time += dt; hud();
  }
  function fmt(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  /* 그림: 나무 퍼즐 판과 나무 조각(제자리면 초록 빛 표시), 서재 배경 */
  function tileSpr(cs, right) {
    return A.sprite('sl' + cs + (right ? 'r' : ''), cs, cs, function (x) {
      x.fillStyle = 'rgba(0,0,0,.45)'; A.rr(x, 5, 7, cs - 8, cs - 8, 12); x.fill();
      var g = x.createLinearGradient(0, 0, cs, cs); g.addColorStop(0, right ? '#f0dcae' : '#e0bc84'); g.addColorStop(1, right ? '#c8a46a' : '#a8784a'); x.fillStyle = g; A.rr(x, 4, 4, cs - 8, cs - 8, 12); x.fill();
      x.strokeStyle = 'rgba(120,70,30,.25)'; x.lineWidth = 1.2; for (var i = 0; i < 6; i++) { var yy = 10 + i * (cs - 20) / 5 + Math.random() * 4; x.beginPath(); x.moveTo(8, yy); x.bezierCurveTo(cs * 0.3, yy - 4, cs * 0.6, yy + 5, cs - 8, yy); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.35)'; A.rr(x, 8, 7, cs - 16, 4, 2); x.fill();
      x.strokeStyle = right ? 'rgba(125,255,155,.9)' : 'rgba(90,50,20,.5)'; x.lineWidth = right ? 3 : 1.5; A.rr(x, 4, 4, cs - 8, cs - 8, 12); x.stroke();
    });
  }
  var SBG = A.sprite('slbg', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1208'); g.addColorStop(1, '#0a0704'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 40; i++) { x.strokeStyle = 'rgba(255,200,140,.03)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, i * 26); x.bezierCurveTo(W * 0.3, i * 26 - 8, W * 0.6, i * 26 + 10, W, i * 26); x.stroke(); }
    var r = x.createRadialGradient(W / 2, 200, 0, W / 2, 200, 500); r.addColorStop(0, 'rgba(255,200,120,.15)'); r.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = r; x.fillRect(0, 0, W, H);
  });
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(SBG, -10, -10, W + 20, H + 20);
    if (!tiles) { layout(); tiles = []; for (var i = 1; i < N * N; i++) tiles.push(i); tiles.push(0); anim = {}; }
    c.fillStyle = 'rgba(0,0,0,.5)'; A.rr(c, GX - 12, GY - 8, N * CS + 26, N * CS + 26, 20); c.fill();
    var fg = c.createLinearGradient(0, GY - 14, 0, GY + N * CS + 14); fg.addColorStop(0, '#6a4020'); fg.addColorStop(1, '#3a2010'); c.fillStyle = fg; A.rr(c, GX - 14, GY - 14, N * CS + 28, N * CS + 28, 20); c.fill();
    c.fillStyle = '#20130a'; A.rr(c, GX - 4, GY - 4, N * CS + 8, N * CS + 8, 12); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    var cs = Math.round(CS);
    tiles.forEach(function (v, i) {
      if (!v) return; var x = i % N, y = Math.floor(i / N), a = anim[v];
      if (a) { var fx0 = a.from % N, fy0 = Math.floor(a.from / N), e = 1 - Math.pow(1 - a.t, 3); x = A.lerp(fx0, x, e); y = A.lerp(fy0, y, e); }
      var px = GX + x * CS, py = GY + y * CS, right = v === i + 1;
      c.drawImage(tileSpr(cs, right), px, py, CS, CS);
      c.font = '700 ' + Math.round(CS * 0.42) + 'px "Chakra Petch",system-ui';
      c.fillStyle = 'rgba(255,240,210,.5)'; c.fillText(String(v), px + CS / 2 + 1, py + CS / 2 + 3);
      c.fillStyle = right ? '#1e5a2a' : '#4a2a10'; c.fillText(String(v), px + CS / 2, py + CS / 2 + 1);
    });
    if (cur != null && kbd && S.state === 'playing') { c.strokeStyle = '#ffd166'; c.lineWidth = 3; A.rr(c, GX + (empty % N) * CS + 4, GY + Math.floor(empty / N) * CS + 4, CS - 8, CS - 8, 14); c.stroke(); }
    if (tut && tiles && empty != null) { var tn = nb(empty)[0], tx = GX + (tn % N + 0.5) * CS, ty = GY + (Math.floor(tn / N) + 0.5) * CS; drawTut(c, tx, ty, isTouch() ? '빈칸 옆 조각을 탭하면 밀려요' : '방향키나 클릭으로 조각을 빈칸으로', ty > H / 2); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var kbd = false, btCache = 0;
  function hud() { document.getElementById('hA').textContent = A.fmt(score()); document.getElementById('hB').textContent = moves; document.getElementById('hC').textContent = fmt(time); var bt = btCache; document.getElementById('hMult').textContent = (diff === DAILY ? '오늘의 퍼즐 ' : '') + N + '×' + N + (bt ? ' · 최단 ' + fmt(bt) : ''); }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) tap(y * N + x); });
  var dbtns = document.querySelectorAll('[data-diff]');
  function paint() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_slide_diff', diff); A.sfx('select'); paint(); tiles = null; }); }); paint();
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
  var S = new A.Shell({ id: 'slide', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key, ex = empty % N, ey = Math.floor(empty / N);
      // 방향키: 그 방향의 조각이 빈칸으로 들어옴
      if ((k === 'ArrowLeft' || k === 'a') && ex < N - 1) tap(empty + 1); if ((k === 'ArrowRight' || k === 'd') && ex > 0) tap(empty - 1);
      if ((k === 'ArrowUp' || k === 'w') && ey < N - 1) tap(empty + N); if ((k === 'ArrowDown' || k === 's') && ey > 0) tap(empty - N); } });
  landPanel('');
})();
