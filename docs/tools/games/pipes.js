(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var land = false, N, CS, GX, GY, cell, rot, stage, score, time, done, cur, kbd = false, wet;
  // 연결 비트: 1=위 2=오른쪽 4=아래 8=왼쪽
  var DX = { 1: [0, -1], 2: [1, 0], 4: [0, 1], 8: [-1, 0] }, OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  function rotm(m) { return ((m << 1) | (m >> 3)) & 15; }
  function setup() {
    N = Math.min(9, 3 + stage); layout();
    cell = []; for (var i = 0; i < N * N; i++) cell.push(0);
    var c0 = Math.floor(N / 2) * N + Math.floor(N / 2), seen = {}, st = [c0]; seen[c0] = 1;
    while (st.length) {
      var cur0 = st[Math.random() < 0.6 ? st.length - 1 : A.irand(0, st.length - 1)], x = cur0 % N, y = Math.floor(cur0 / N), opts = [];
      [1, 2, 4, 8].forEach(function (d) { var nx = x + DX[d][0], ny = y + DX[d][1], ni = ny * N + nx; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ni]) opts.push([d, ni]); });
      if (!opts.length) { st.splice(st.indexOf(cur0), 1); continue; }
      var o = A.pick(opts); cell[cur0] |= o[0]; cell[o[1]] |= OPP[o[0]]; seen[o[1]] = 1; st.push(o[1]);
    }
    rot = cell.map(function (m) { var r = A.irand(0, 3); for (var k = 0; k < r; k++) m = rotm(m); return m; });
    if (solved()) return setup();
    done = 0; cur = c0; flow();
  }
// 세로: 540×960 / 가로 화면: 720×720 정사각형 판 (점수판은 오른쪽 패널)
  function layout() { if (!N) return; if (land) { CS = Math.floor(660 / N); GX = (W - N * CS) / 2; GY = (H - N * CS) / 2; } else { CS = Math.floor(480 / N); GX = (W - N * CS) / 2; GY = 170 + (600 - N * CS) / 2; } }
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; layout(); }
  function flow() {
    wet = {}; var c0 = Math.floor(N / 2) * N + Math.floor(N / 2), q = [c0]; wet[c0] = 1;
    while (q.length) { var i = q.shift(), x = i % N, y = Math.floor(i / N);
      [1, 2, 4, 8].forEach(function (d) { if (!(rot[i] & d)) return; var nx = x + DX[d][0], ny = y + DX[d][1], ni = ny * N + nx; if (nx < 0 || ny < 0 || nx >= N || ny >= N || wet[ni]) return; if (rot[ni] & OPP[d]) { wet[ni] = 1; q.push(ni); } }); }
  }
  function solved() { flow(); return Object.keys(wet).length === N * N; }
  // 남은 시간제: 120초로 시작, 단계를 풀 때마다 판 크기만큼 시간 추가
  function reset() { stage = 1; score = 0; time = 120; setup(); fx.clear(); hud(); }
  function turn(i) {
    if (S.state !== 'playing' || done) return; var w0 = Object.keys(wet).length; rot[i] = rotm(rot[i]); A.sfx('turn', 1.2);
    var sv = solved(), w1 = Object.keys(wet).length; if (w1 > w0 && !sv) A.sfx('splash', 1 + Math.min(w1 - w0, 6) * 0.08);
    if (sv) { var pts = Math.max(50, Math.round(N * N * 15 - stageT * 4)), add = Math.round(15 + N * N * 0.4); score += pts; time += add; done = 1.2; A.sfx('win'); fx.text(W / 2, land ? H / 2 - 20 : GY - 40, '연결 완료! +' + pts, '#5effc8', 26); fx.text(W / 2, land ? H / 2 + 14 : GY - 8, '+' + add + '초', '#ffd166', 20); for (var k = 0; k < 4; k++) fx.burst(A.rand(100, W - 100), A.rand(H * 0.25, H * 0.75), '#5effc8', 20, 300, 0.7, 4); }
    hud();
  }
  var stageT = 0;
  function update(dt) {
    fx.update(dt); if (done <= 0) { time -= dt; stageT += dt; }
    if (done > 0) { done -= dt; if (done <= 0) { stage++; stageT = 0; setup(); S.banner('STAGE ' + stage, N + '×' + N); } }
    hud();
  }
  /* 그림: 금속 관(모양·물 찬 상태·칸 크기별 캐시), 물탱크, 집, 바닥 타일 (매 장면 shadowBlur 없앰) */
  function pipeSpr(m, wetv, cs) {
    return A.sprite('pp' + m + (wetv ? 'w' : 'd') + cs, cs, cs, function (x) {
      var h = cs / 2, lw = cs * 0.26;
      x.fillStyle = '#0c2420'; A.rr(x, 3, 3, cs - 6, cs - 6, 10); x.fill();
      x.strokeStyle = 'rgba(94,255,200,.06)'; x.lineWidth = 1; A.rr(x, 3.5, 3.5, cs - 7, cs - 7, 10); x.stroke();
      x.lineCap = 'round';
      function arms(w, col) { x.strokeStyle = col; x.lineWidth = w; [1, 2, 4, 8].forEach(function (d) { if (m & d) { x.beginPath(); x.moveTo(h, h); x.lineTo(h + DX[d][0] * h, h + DX[d][1] * h); x.stroke(); } }); }
      if (wetv) { x.globalAlpha = 0.35; arms(lw * 1.9, '#5effc8'); x.globalAlpha = 1; }
      arms(lw + 4, '#0a1210'); arms(lw, wetv ? '#7a8a90' : '#4a5258'); arms(lw * 0.55, wetv ? '#5effc8' : '#2a3036'); arms(lw * 0.18, wetv ? '#d8fff0' : 'rgba(255,255,255,.12)');
      // 이음쇠
      [1, 2, 4, 8].forEach(function (d) { if (m & d) { var ex = h + DX[d][0] * (h - 2), ey = h + DX[d][1] * (h - 2); x.fillStyle = '#8a7040'; x.beginPath(); x.arc(ex, ey, lw * 0.62, 0, 7); x.fill(); } });
      x.fillStyle = wetv ? '#9aa8ae' : '#5a6268'; x.beginPath(); x.arc(h, h, lw * 0.62, 0, 7); x.fill();
      if ([1, 2, 4, 8].indexOf(m) >= 0) { // 끝 = 집
        x.fillStyle = wetv ? '#ffd166' : '#5a4a2a'; x.beginPath(); x.moveTo(h - cs * 0.2, h + cs * 0.14); x.lineTo(h - cs * 0.2, h - cs * 0.04); x.lineTo(h, h - cs * 0.22); x.lineTo(h + cs * 0.2, h - cs * 0.04); x.lineTo(h + cs * 0.2, h + cs * 0.14); x.closePath(); x.fill();
        x.fillStyle = wetv ? '#ff7a45' : '#3a2a18'; x.beginPath(); x.moveTo(h - cs * 0.25, h - cs * 0.02); x.lineTo(h, h - cs * 0.26); x.lineTo(h + cs * 0.25, h - cs * 0.02); x.lineTo(h + cs * 0.2, h - cs * 0.02); x.lineTo(h, h - cs * 0.2); x.lineTo(h - cs * 0.2, h - cs * 0.02); x.fill();
        x.fillStyle = wetv ? '#fff6c0' : '#1a1408'; x.fillRect(h - cs * 0.05, h + cs * 0.02, cs * 0.1, cs * 0.12);
      }
    });
  }
  function tankSpr(cs) {
    return A.sprite('pptank' + cs, cs, cs, function (x) {
      var h = cs / 2, r = cs * 0.3; var g = x.createRadialGradient(h - r * 0.3, h - r * 0.4, 1, h, h, r); g.addColorStop(0, '#e0faff'); g.addColorStop(0.5, '#5ee7ff'); g.addColorStop(1, '#1a7090');
      x.fillStyle = '#0a1210'; x.beginPath(); x.arc(h, h, r + 3, 0, 7); x.fill(); x.fillStyle = g; x.beginPath(); x.arc(h, h, r, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.moveTo(h, h - r * 0.55); x.quadraticCurveTo(h + r * 0.4, h, h, h + r * 0.4); x.quadraticCurveTo(h - r * 0.4, h, h, h - r * 0.55); x.fill();
    });
  }
  // 화면 크기(세로/가로)별로 따로 그림
  function bgpSpr() { return A.sprite('ppbg' + W + 'x' + H, W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#03201a'); g.addColorStop(1, '#010c0a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 30; i++) { x.strokeStyle = 'rgba(94,255,200,.035)'; x.lineWidth = 6; x.beginPath(); var yy = Math.random() * H; x.moveTo(0, yy); x.lineTo(W, yy + (Math.random() - 0.5) * 40); x.stroke(); }
  }); }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(bgpSpr(), -10, -10, W + 20, H + 20);
    if (!cell) { stage = 2; setup(); }
    var c0 = Math.floor(N / 2) * N + Math.floor(N / 2), cs = Math.round(CS);
    c.fillStyle = 'rgba(0,0,0,.4)'; A.rr(c, GX - 6, GY - 6, N * CS + 12, N * CS + 12, 14); c.fill();
    for (var i = 0; i < N * N; i++) {
      var x = i % N, y = Math.floor(i / N), px = GX + x * CS, py = GY + y * CS;
      c.drawImage(pipeSpr(rot[i], !!wet[i], cs), px, py, CS, CS);
      if (i === c0) c.drawImage(tankSpr(cs), px, py, CS, CS);
    }
    // 물이 새는 끝(막힌 곳) 표시: 어디로 돌려야 할지 힌트
    if (S.state === 'playing' && !done) { c.fillStyle = '#ff4d6d'; for (var wi in wet) { var wx = wi % N, wy = Math.floor(wi / N); [1, 2, 4, 8].forEach(function (d) { if (!(rot[wi] & d)) return; var nx = wx + DX[d][0], ny = wy + DX[d][1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && (rot[ny * N + nx] & OPP[d])) return; c.beginPath(); c.arc(GX + wx * CS + CS / 2 + DX[d][0] * CS * 0.42, GY + wy * CS + CS / 2 + DX[d][1] * CS * 0.42, Math.max(3, CS * 0.07) * (1 + 0.25 * Math.sin(t * 8)), 0, 7); c.fill(); }); } }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, GX + (cur % N) * CS + 2, GY + Math.floor(cur / N) * CS + 2, CS - 4, CS - 4, 12); c.stroke(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function fmt(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  var last = '';
  function hud() { var nw0 = wet ? Object.keys(wet).length : 0, k = score + '|' + stage + '|' + Math.ceil(time) + '|' + nw0; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; var tc = document.getElementById('hC'); tc.textContent = fmt(Math.ceil(Math.max(0, time))); tc.style.color = time < 15 ? '#ff4d6d' : ''; var nw = wet ? Object.keys(wet).length : 0; document.getElementById('hMult').textContent = N ? '연결 ' + nw + '/' + N * N : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) turn(y * N + x); });
  // 점수는 단계마다 누적. 남은 시간이 0이 되면 끝 (단계를 풀면 시간 추가)
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
  var S = new A.Shell({ id: 'pipes', W: W, H: H, land: [720, 720], onResize: geo, reset: function () { stageT = 0; reset(); }, render: render, idle: function (dt) { fx.update(dt); },
    update: function (dt) { update(dt); if (time <= 0 && done <= 0) { time = 0; hud(); S.gameOver(score, [['단계', String(stage)], ['마지막 판', N + '×' + N]], { kick: 'TIME UP', win: true }); } },
    keydown: function (e) { kbd = true; var k = e.key, x = cur % N, y = Math.floor(cur / N);
      if (k === 'ArrowLeft' || k === 'a') x = Math.max(0, x - 1); if (k === 'ArrowRight' || k === 'd') x = Math.min(N - 1, x + 1); if (k === 'ArrowUp' || k === 'w') y = Math.max(0, y - 1); if (k === 'ArrowDown' || k === 's') y = Math.min(N - 1, y + 1);
      cur = y * N + x; if ((k === ' ' || k === 'Enter') && !e.repeat) turn(cur); } });
  landPanel('');
})();
