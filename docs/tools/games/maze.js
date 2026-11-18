(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, land = false;
  // 칸 크기·판 위치. 가로 화면은 720x720 정사각형 판을 거의 꽉 채움 (미로 내용은 그대로)
  function layout() { if (land) { CS = Math.floor(690 / N); GX = (W - N * CS) / 2; GY = (H - N * CS) / 2; } else { CS = Math.floor(Math.min(500 / N, 780 / N)); GX = (W - N * CS) / 2; GY = 110 + (800 - N * CS) / 2; } }
  function geo(sh) { W = sh ? sh.W : 540; H = sh ? sh.H : 960; land = !!(sh && sh.land); if (N) layout(); }
  var fx = new A.FX();
  var N, CS, GX, GY, cells, P, goal, stars, stage, time, score, moving, dyingT, trail, queued, moves, par;
  var SIDE = { e: ['n', 's'], w: ['n', 's'], n: ['e', 'w'], s: ['e', 'w'] }, DIRS = [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']];
  // 미로 생성 (재귀적 백트래킹). cells[y][x] = {n,e,s,w 벽}
  function build(n) {
    N = n; layout();
    cells = []; for (var y = 0; y < N; y++) { cells.push([]); for (var x = 0; x < N; x++) cells[y].push({ n: 1, e: 1, s: 1, w: 1, v: 0 }); }
    var st = [[0, 0]]; cells[0][0].v = 1;
    while (st.length) {
      var c = st[st.length - 1], opts = [];
      [[0, -1, 'n', 's'], [1, 0, 'e', 'w'], [0, 1, 's', 'n'], [-1, 0, 'w', 'e']].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !cells[ny][nx].v) opts.push([nx, ny, d[2], d[3]]); });
      if (!opts.length) { st.pop(); continue; }
      var o = A.pick(opts); cells[c[1]][c[0]][o[2]] = 0; cells[o[1]][o[0]][o[3]] = 0; cells[o[1]][o[0]].v = 1; st.push([o[0], o[1]]);
    }
    // 벽 몇 개 더 뚫어 길을 여러 갈래로
    for (var k = 0; k < N; k++) { var rx = A.irand(1, N - 2), ry = A.irand(1, N - 2); cells[ry][rx].e = 0; cells[ry][rx + 1].w = 0; }
    P = { x: 0, y: 0, px: 0, py: 0 }; goal = { x: N - 1, y: N - 1 }; stars = [];
    for (k = 0; k < Math.floor(N / 2); k++) { var sx = A.irand(1, N - 1), sy = A.irand(1, N - 1); if ((sx !== goal.x || sy !== goal.y) && !stars.some(function (q) { return q.x === sx && q.y === sy; })) stars.push({ x: sx, y: sy }); }
    trail = []; queued = null; moves = 0; par = solve();
  }
  // 한 번 밀었을 때 멈추는 칸: 벽 앞, 갈림길(옆으로 길이 열린 칸), 출구
  function dest(x, y, dx, dy, key, path) { while (!cells[y][x][key]) { x += dx; y += dy; if (path) path.push([x, y]); if (x === goal.x && y === goal.y) break; if (!cells[y][x][SIDE[key][0]] || !cells[y][x][SIDE[key][1]]) break; } return [x, y]; }
  function solve() { // 출구까지 최소 몇 번 밀어야 하는지 (BFS)
    var seen = {}, q = [[0, 0, 0]]; seen['0,0'] = 1;
    while (q.length) { var c = q.shift(); if (c[0] === goal.x && c[1] === goal.y) return c[2];
      DIRS.forEach(function (d) { var t = dest(c[0], c[1], d[0], d[1], d[2]), k = t[0] + ',' + t[1]; if (!seen[k]) { seen[k] = 1; q.push([t[0], t[1], c[2] + 1]); } }); }
    return 99;
  }
  function newStage() { stage++; var n = Math.min(17, 6 + stage); build(n); time = Math.min(90, time + 10 + n * 1.1); /* 남는 시간이 끝없이 쌓이지 않게 상한 90초 */ if (stage > 1) { S.banner('STAGE ' + stage, '탈출 성공'); A.sfx('level'); } hud(); }
  function reset() { stage = 0; time = 18; score = 0; dyingT = 0; moving = null; newStage(); fx.clear(); }
  function slide(dx, dy) {
    if (S.state !== 'playing' || dyingT > 0) return;
    if (moving) { queued = [dx, dy]; return; } // 움직이는 중 입력은 한 개 저장했다가 멈추면 실행
    var key = dx > 0 ? 'e' : dx < 0 ? 'w' : dy > 0 ? 's' : 'n', path = [];
    dest(P.x, P.y, dx, dy, key, path);
    if (!path.length) { A.sfx('wall', 0.8); return; }
    moving = { path: path, i: 0, t: 0 }; moves++; A.sfx('whoosh', 1 + Math.min(path.length, 8) * 0.03);
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['단계', String(stage)]]); return; }
    time -= dt; if (time > 5) warnN = 0; else if (time > 0 && Math.ceil(time) !== warnN) { warnN = Math.ceil(time); A.sfx('warn'); } if (time <= 0) { time = 0; dyingT = 1; A.sfx('hurt'); fx.flashIt('#ff2244', 0.4); hud(); return; }
    if (moving) {
      moving.t += dt * 22;
      while (moving && moving.t >= 1) {
        moving.t -= 1; var c = moving.path[moving.i++]; trail.push({ x: P.x, y: P.y, t: 0.5 }); P.x = c[0]; P.y = c[1];
        for (var i = stars.length - 1; i >= 0; i--) if (stars[i].x === P.x && stars[i].y === P.y) { stars.splice(i, 1); time += 3; score += 50; fx.burst(GX + (P.x + 0.5) * CS, GY + (P.y + 0.5) * CS, '#ffd166', 12, 200, 0.4, 3); fx.text(GX + (P.x + 0.5) * CS, GY + P.y * CS, '+3초', '#ffd166', 18); A.sfx('coin', 1, A.clamp((P.x + 0.5) / N * 2 - 1, -1, 1)); }
        if (P.x === goal.x && P.y === goal.y) { moving = null; var bonus = Math.round(100 * stage + time * 10); if (moves <= par) { bonus += 100 * stage; fx.text(W / 2, H / 2 + 44, '최단 경로 ' + par + '수!', '#ffd166', 24); A.sfx('gold'); } score += bonus; fx.burst(GX + (goal.x + 0.5) * CS, GY + (goal.y + 0.5) * CS, '#7dff9b', 40, 360, 0.8, 4); fx.text(W / 2, H / 2, '탈출! +' + bonus, '#7dff9b', 28); newStage(); return; }
        if (moving.i >= moving.path.length) { moving = null; if (queued) { var qd = queued; queued = null; slide(qd[0], qd[1]); } }
      }
    }
    for (i = trail.length - 1; i >= 0; i--) { trail[i].t -= dt; if (trail[i].t <= 0) trail.splice(i, 1); }
    hud();
  }
  /* 그림: 고대 신전 배경(횃불 빛), 돌 바닥 타일, 금빛 돌벽, 빛나는 출구 문, 동전, 빛 구슬 */
  function bgSpr() { var W0 = W, H0 = H; return A.sprite('mzbg' + W + 'x' + H, W, H, function (x) {
    x.fillStyle = '#100c04'; x.fillRect(0, 0, W, H);
    for (var r = 0; r < Math.ceil(H / 40); r++) for (var col = 0; col < Math.ceil(W / 80) + 1; col++) { var bw = 80, bh = 40, px = col * bw - (r % 2) * 40, py = r * bh; x.fillStyle = 'rgba(' + (40 + Math.random() * 14) + ',' + (30 + Math.random() * 10) + ',12,1)'; x.fillRect(px + 1, py + 1, bw - 2, bh - 2); x.fillStyle = 'rgba(255,220,150,.05)'; x.fillRect(px + 1, py + 1, bw - 2, 2); }
    [[30, 140], [W - 30, 140], [30, H - 80], [W - 30, H - 80]].forEach(function (p) { var g = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], 220); g.addColorStop(0, 'rgba(255,160,60,.35)'); g.addColorStop(1, 'rgba(255,160,60,0)'); x.fillStyle = g; x.fillRect(p[0] - 220, p[1] - 220, 440, 440); });
    var v = x.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 640); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  }); }
  var FLOOR = A.sprite('mzfloor', 64, 64, function (x) {
    x.fillStyle = '#2a2210'; x.fillRect(0, 0, 64, 64);
    for (var i = 0; i < 4; i++) { var px = (i % 2) * 32, py = Math.floor(i / 2) * 32; var g = x.createLinearGradient(px, py, px + 32, py + 32); g.addColorStop(0, '#3e3218'); g.addColorStop(1, '#2a2010'); x.fillStyle = g; x.fillRect(px + 1, py + 1, 30, 30); }
    for (i = 0; i < 30; i++) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); }
  });
  var DOOR = A.sprite('mzdoor', 60, 60, function (x) {
    x.translate(30, 30); var g = x.createRadialGradient(0, 0, 2, 0, 0, 26); g.addColorStop(0, '#eaffef'); g.addColorStop(0.4, '#7dff9b'); g.addColorStop(1, 'rgba(30,140,60,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 26, 0, 7); x.fill();
    x.strokeStyle = '#c8ffd6'; x.lineWidth = 2; for (var k = 0; k < 3; k++) { x.beginPath(); x.arc(0, 0, 8 + k * 6, k, k + 4); x.stroke(); }
  });
  var COIN = A.sprite('mzcoin', 40, 40, function (x) {
    x.translate(20, 20); var g = x.createRadialGradient(-5, -5, 1, 0, 0, 14); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.6, '#ffd166'); g.addColorStop(1, '#a06a10');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 13, 0, 7); x.fill(); x.strokeStyle = 'rgba(120,70,0,.6)'; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, 9.5, 0, 7); x.stroke();
    x.fillStyle = '#a06a10'; x.font = '900 12px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('★', 0, 1);
  });
  var ORB = A.sprite('mzorb', 60, 60, function (x) {
    x.translate(30, 30); var g = x.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.3, 'rgba(255,230,170,.5)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(-30, -30, 60, 60);
    var b = x.createRadialGradient(-4, -4, 1, 0, 0, 12); b.addColorStop(0, '#ffffff'); b.addColorStop(1, '#ffe0a0'); x.fillStyle = b; x.beginPath(); x.arc(0, 0, 11, 0, 7); x.fill();
  });
  function walls(c) {
    c.beginPath();
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var cl = cells[y][x], px = GX + x * CS, py = GY + y * CS;
      if (cl.n) { c.moveTo(px, py); c.lineTo(px + CS, py); } if (cl.w) { c.moveTo(px, py); c.lineTo(px, py + CS); }
      if (y === N - 1 && cl.s) { c.moveTo(px, py + CS); c.lineTo(px + CS, py + CS); } if (x === N - 1 && cl.e) { c.moveTo(px + CS, py); c.lineTo(px + CS, py + CS); }
    }
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(bgSpr(), -10, -10, W + 20, H + 20);
    if (!cells) build(9);
    // 바닥 타일
    c.save(); c.beginPath(); c.rect(GX, GY, N * CS, N * CS); c.clip();
    for (var fy = GY; fy < GY + N * CS; fy += 64) for (var fx2 = GX; fx2 < GX + N * CS; fx2 += 64) c.drawImage(FLOOR, fx2, fy, 64, 64);
    c.restore();
    trail.forEach(function (tr) { c.fillStyle = 'rgba(255,209,102,' + tr.t * 0.35 + ')'; c.beginPath(); c.arc(GX + (tr.x + 0.5) * CS, GY + (tr.y + 0.5) * CS, CS * 0.18, 0, 7); c.fill(); });
    c.save(); c.globalAlpha = 0.75 + Math.sin(t * 5) * 0.25; A.draw(c, DOOR, GX + (goal.x + 0.5) * CS, GY + (goal.y + 0.5) * CS, CS / 44, t); c.restore();
    stars.forEach(function (s) { A.draw(c, COIN, GX + (s.x + 0.5) * CS, GY + (s.y + 0.5) * CS + Math.sin(t * 4 + s.x) * CS * 0.05, CS / 46); });
    // 돌벽: 그림자 → 몸통 → 위쪽 빛
    var lw = Math.max(4, CS * 0.2);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.save(); c.translate(2, 4); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = lw; walls(c); c.stroke(); c.restore();
    c.strokeStyle = '#8a6420'; c.lineWidth = lw; walls(c); c.stroke();
    c.strokeStyle = '#ffd166'; c.lineWidth = Math.max(1.5, lw * 0.35); c.save(); c.translate(-lw * 0.12, -lw * 0.18); walls(c); c.stroke(); c.restore();
    c.lineCap = 'butt';
    var mx = P.x, my = P.y;
    if (moving && moving.path[moving.i]) { mx = A.lerp(P.x, moving.path[moving.i][0], moving.t); my = A.lerp(P.y, moving.path[moving.i][1], moving.t); }
    A.draw(c, ORB, GX + (mx + 0.5) * CS, GY + (my + 0.5) * CS, CS / 34);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '', warnN = 0;
  function hud() { var k = score + '|' + stage + '|' + Math.ceil(time) + '|' + moves; if (k === last) return; last = k; document.getElementById('hMult').textContent = moves + ' / 최단 ' + par + '수'; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; var tt = document.getElementById('hC'); tt.textContent = Math.ceil(time); tt.style.color = time < 6 ? '#ff4d6d' : ''; }
  var stage_ = document.getElementById('stage'), sw = null;
  stage_.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; sw = { x: e.clientX, y: e.clientY }; });
  stage_.addEventListener('pointermove', function (e) { if (!sw) return; var dx = e.clientX - sw.x, dy = e.clientY - sw.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; if (Math.abs(dx) > Math.abs(dy)) slide(dx > 0 ? 1 : -1, 0); else slide(0, dy > 0 ? 1 : -1); sw = { x: e.clientX, y: e.clientY }; }); // 손을 떼지 않고 이어서 스와이프 가능
  stage_.addEventListener('pointerup', function () { sw = null; });
  var MAP = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  var S = new A.Shell({ id: 'maze', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var m = MAP[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (m && !e.repeat) slide(m[0], m[1]); } });
  // 가로 화면: 점수판을 오른쪽 패널로 옮김 (게임판 위 점수판은 가로에서 숨김)
  (function () {
    var hudEl = document.querySelector('.g-hud'); if (!hudEl || !S.panelSlot) return; hudEl.setAttribute('data-land-hide', '');
    var lbs = hudEl.querySelectorAll('.h-lb'), ids = ['hA', 'hB', 'hC'], html = '<div class="g-card gp-stats">';
    for (var i = 0; i < 3; i++) html += '<div><span>' + lbs[i].textContent + '</span><b id="p' + ids[i] + '"></b></div>';
    S.panelSlot.innerHTML = html + '</div><div class="g-card" id="phMult" style="font-weight:800;font-size:17px;color:var(--gold);text-align:center"></div>' + '';
    ids.concat('hMult').forEach(function (id) {
      var src = document.getElementById(id), dst = document.getElementById('p' + id); if (!src || !dst) return;
      function cp() { dst.textContent = src.textContent; dst.style.color = src.style.color; if (id === 'hMult') dst.style.display = src.textContent ? '' : 'none'; }
      cp(); new MutationObserver(cp).observe(src, { childList: true, characterData: true, subtree: true, attributes: true });
    });
  })();
})();
