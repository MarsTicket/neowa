(function () {
  'use strict';
  // 숫자 합치기: 아래에서 숫자 블록을 원하는 열로 쏘아 올려 위에서부터 쌓고, 같은 숫자끼리 닿으면 2배로 합쳐집니다.
  var A = Arcade, W = 540, H = 960, COLS = 5, ROWS = 7, CS = 92, GX = 40, GY = 120;
  var LY = 850; // 발사대 블록 y (가운데)
  var fx = new A.FX();
  var G, cur, nxt, aim = 2, score, maxTile, merges, bestChain, chain, phase, wait, dirty, ghosts, flyer, dyingT, nextBonus, kbd = false, aiming = false;

  // ---------- 색·블록 그림 ----------
  var PAL = { 2: '#8d97ab', 4: '#7aa2ff', 8: '#4dffd2', 16: '#7dff9b', 32: '#c3ff5e', 64: '#ffe066', 128: '#ffb547', 256: '#ff7a45', 512: '#ff4d6d', 1024: '#ff5ec4', 2048: '#b48cff', 4096: '#ffd166' };
  function colOf(v) { return PAL[v] || '#ffffff'; }
  function label(v) { return v >= 100000 ? Math.round(v / 1024) + 'K' : String(v); }
  function tile(v) {
    return A.sprite('mg-' + v, CS, CS, function (x) {
      var c = colOf(v), s = CS - 8, o = 4, big = v >= 128;
      if (big) { x.shadowColor = c; x.shadowBlur = v >= 1024 ? 16 : 10; }
      var g = x.createLinearGradient(0, o, 0, o + s); g.addColorStop(0, A.hexA(c, 1)); g.addColorStop(1, A.hexA(c, 0.72));
      x.fillStyle = g; A.rr(x, o, o, s, s, 16); x.fill(); x.shadowBlur = 0;
      x.fillStyle = 'rgba(255,255,255,.22)'; A.rr(x, o + 4, o + 4, s - 8, s * 0.38, 12); x.fill();
      x.fillStyle = 'rgba(0,0,0,.18)'; A.rr(x, o, o + s - 8, s, 8, 4); x.fill();
      var t = label(v), fs = t.length <= 2 ? 40 : t.length === 3 ? 34 : t.length === 4 ? 27 : 22;
      x.font = '700 ' + fs + 'px "Chakra Petch", system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillText(t, CS / 2, CS / 2 + 3);
      x.fillStyle = (v >= 8 && v <= 128) || v >= 4096 ? '#10140a' : '#ffffff'; x.fillText(t, CS / 2, CS / 2 + 1);
    });
  }

  // ---------- 판 ----------
  function cx(c) { return GX + (c + 0.5) * CS; }
  function cy(r) { return GY + (r + 0.5) * CS; }
  function mk(v, x, y) { return { v: v, x: x, y: y, s: 1, pop: 0 }; }
  function spawnVal() {
    var hi = Math.max(8, maxTile / 8), lo = Math.max(2, maxTile / 512), opts = [], wts = [], tot = 0;
    for (var v = lo; v <= hi; v *= 2) { opts.push(v); var w = Math.pow(0.62, opts.length - 1); wts.push(w); tot += w; }
    var r = Math.random() * tot; for (var i = 0; i < opts.length; i++) { r -= wts[i]; if (r <= 0) return opts[i]; }
    return opts[0];
  }
  function reset() {
    G = []; for (var c = 0; c < COLS; c++) { var col = []; for (var r = 0; r < ROWS; r++) col.push(null); G.push(col); }
    score = 0; maxTile = 2; merges = 0; bestChain = 0; chain = 0; phase = 'idle'; wait = 0; dirty = []; ghosts = []; flyer = null; dyingT = 0; nextBonus = 512;
    cur = spawnVal(); nxt = spawnVal(); aim = 2; fx.clear(); hud();
  }
  function height(c) { var n = 0; while (n < ROWS && G[c][n]) n++; return n; }
  function canShoot(c, v) { var h = height(c); return h < ROWS || G[c][ROWS - 1].v === v; }
  function anyMove(v) { for (var c = 0; c < COLS; c++) if (canShoot(c, v)) return true; return false; }

  // ---------- 쏘기 ----------
  function shoot(c) {
    if (S.state !== 'playing' || phase !== 'idle' || dyingT > 0) return;
    if (c < 0 || c >= COLS) return;
    aim = c;
    if (!canShoot(c, cur)) { A.sfx('wall'); fx.shake(3, 0.12); return; }
    var h = height(c), r = h < ROWS ? h : ROWS - 1;
    flyer = { c: c, r: r, v: cur, y: LY, merge: h >= ROWS };
    phase = 'fly'; A.sfx('shoot', 0.7); A.sfx('turn', 1.3);
    cur = nxt; nxt = spawnVal(); chain = 0; hud();
  }
  function arrive() {
    var f = flyer; flyer = null;
    if (f.merge) { // 꽉 찬 열의 맨 아래 블록과 같은 숫자 → 바로 합쳐짐
      var b = G[f.c][f.r]; ghosts.push({ v: f.v, x: cx(f.c), y: cy(f.r) + CS * 0.5, tx: cx(f.c), ty: cy(f.r), t: 0 });
      b.v *= 2; b.pop = 1; gain(b.v, f.c, f.r); dirty = [[f.c, f.r]];
    } else { var nb = mk(f.v, cx(f.c), cy(f.r)); nb.pop = 0.6; G[f.c][f.r] = nb; dirty = [[f.c, f.r]]; A.sfx('brick', 0.9); }
    fx.burst(cx(f.c), cy(f.r) + CS * 0.4, colOf(f.v), 6, 120, 0.3, 2);
    phase = 'resolve'; wait = 0.08;
  }
  function gain(v, c, r) {
    var m = Math.max(1, chain), pts = v * m; score += pts; merges++;
    if (v > maxTile) maxTile = v;
    fx.text(cx(c), cy(r) - 30, '+' + A.fmt(pts) + (m > 1 ? ' ×' + m : ''), m > 1 ? '#ffd166' : '#ffffff', m > 1 ? 24 : 20);
  }
  // 한 단계: 표시된 칸마다 같은 숫자 이웃을 모두 흡수(이웃 k개면 ×2^k) → 위로 붙이기 → 바뀐 칸을 다시 확인
  function resolveStep() {
    var merged = false, used = {}, nd = [];
    dirty.sort(function (a, b) { return a[1] - b[1]; });
    for (var i = 0; i < dirty.length; i++) {
      var c = dirty[i][0], r = dirty[i][1], b = G[c] && G[c][r]; if (!b || used[c + ',' + r]) continue;
      var nb = [[c, r - 1], [c - 1, r], [c + 1, r], [c, r + 1]], hit = [];
      for (var k = 0; k < 4; k++) { var x = nb[k][0], y = nb[k][1]; if (x < 0 || y < 0 || x >= COLS || y >= ROWS || used[x + ',' + y]) continue; var o = G[x][y]; if (o && o.v === b.v) hit.push([x, y]); }
      if (!hit.length) continue;
      if (!merged) { chain++; merged = true; }
      hit.forEach(function (q) { var o = G[q[0]][q[1]]; ghosts.push({ v: o.v, x: o.x, y: o.y, tx: b.x, ty: b.y, t: 0 }); G[q[0]][q[1]] = null; used[q[0] + ',' + q[1]] = 1; });
      b.v = b.v * Math.pow(2, hit.length); b.pop = 1; used[c + ',' + r] = 1;
      gain(b.v, c, r); nd.push([c, r]);
      fx.burst(cx(c), cy(r), colOf(b.v), 10 + hit.length * 6, 220, 0.45, 3); fx.ring(cx(c), cy(r), colOf(b.v), CS * 0.7, 0.35);
      A.sfx('coin', 0.8 + Math.min(chain, 8) * 0.12 + Math.log(b.v) / Math.LN2 * 0.02); A.vibrate(12);
      if (hit.length >= 2) fx.text(cx(c), cy(r) + 20, hit.length + 1 + '개 동시!', '#ffd166', 18);
    }
    // 위로 붙이기 (위에서부터 쌓이는 판)
    for (var cc = 0; cc < COLS; cc++) {
      var w = 0;
      for (var rr = 0; rr < ROWS; rr++) { var bb = G[cc][rr]; if (!bb) continue; if (rr !== w) { G[cc][w] = bb; G[cc][rr] = null; nd.push([cc, w]); } w++; }
    }
    if (chain > bestChain) bestChain = chain;
    if (merged && chain >= 2) { fx.shake(2 + chain, 0.12); }
    dirty = nd;
    return merged || nd.length > 0;
  }
  function bonusClear() {
    // 최대 블록이 512, 1024, 2048 … 에 처음 닿으면 판에서 가장 작은 숫자 블록을 모두 없애 줌
    if (maxTile < nextBonus) return false;
    while (nextBonus <= maxTile) nextBonus *= 2;
    var min = Infinity, c, r; for (c = 0; c < COLS; c++) for (r = 0; r < ROWS; r++) if (G[c][r]) min = Math.min(min, G[c][r].v);
    if (min === Infinity || min >= maxTile) return false;
    var n = 0;
    for (c = 0; c < COLS; c++) for (r = 0; r < ROWS; r++) if (G[c][r] && G[c][r].v === min) { fx.burst(cx(c), cy(r), '#ffffff', 14, 260, 0.5, 3); G[c][r] = null; n++; }
    S.banner(label(maxTile) + ' 달성!', '가장 작은 ' + min + ' 블록 ' + n + '개 정리'); A.sfx('level'); fx.flashIt('#ffffff', 0.25);
    return true;
  }
  function update(dt) {
    fx.update(dt);
    // 그림 위치를 칸 위치로 부드럽게
    for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) { var b = G[c][r]; if (!b) continue; var k = Math.min(1, dt * 16); b.x += (cx(c) - b.x) * k; b.y += (cy(r) - b.y) * k; if (b.pop > 0) b.pop = Math.max(0, b.pop - dt * 4); }
    for (var i = ghosts.length - 1; i >= 0; i--) { var g = ghosts[i]; g.t += dt / 0.14; if (g.t >= 1) ghosts.splice(i, 1); }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['최대 블록', label(maxTile)], ['합친 횟수', String(merges)], ['최대 연쇄', String(bestChain)]]); return; }
    if (phase === 'fly') {
      var ty = cy(flyer.r) + (flyer.merge ? CS * 0.5 : 0);
      flyer.y -= 2600 * dt;
      if (flyer.y <= ty) { flyer.y = ty; arrive(); }
    } else if (phase === 'resolve') {
      wait -= dt;
      if (wait <= 0) {
        if (dirty.length && resolveStep()) { wait = 0.17; return; }
        if (bonusClear()) { for (var c2 = 0; c2 < COLS; c2++) for (var r2 = 0; r2 < ROWS; r2++) dirty.push([c2, r2]); chain = 0; wait = 0.3; return; }
        phase = 'idle'; if (chain >= 2) { S.banner(chain + '연쇄!', '점수 ×' + chain); A.sfx('gold'); }
        hud();
        if (!anyMove(cur)) { dyingT = 1.0; fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.4); A.sfx('hurt'); A.vibrate(160); }
      }
    }
  }

  // ---------- 그리기 ----------
  function render(c) {
    var o = fx.offset(), t = S.time;
    if (!G) reset();
    c.save(); c.translate(o[0], o[1]);
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#120a02'); bg.addColorStop(0.6, '#1c1006'); bg.addColorStop(1, '#0b0602'); c.fillStyle = bg; c.fillRect(-10, -10, W + 20, H + 20);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var s = 0; s < 18; s++) { var sx = (s * 173) % W, sy = ((s * 251 - t * (12 + s % 5 * 6)) % H + H) % H; c.fillStyle = 'rgba(255,181,71,.05)'; c.fillRect(sx, sy, 3, 3); }
    c.restore();
    // 판 바탕
    c.fillStyle = 'rgba(255,181,71,.06)'; A.rr(c, GX - 10, GY - 10, CS * COLS + 20, CS * ROWS + 20, 20); c.fill();
    c.strokeStyle = 'rgba(255,181,71,.35)'; c.lineWidth = 2; c.stroke();
    var can = S.state === 'playing' && phase === 'idle' && dyingT <= 0;
    for (var cc = 0; cc < COLS; cc++) {
      if (can && cc === aim) { c.fillStyle = canShoot(cc, cur) ? 'rgba(255,181,71,.12)' : 'rgba(255,77,109,.14)'; c.fillRect(GX + cc * CS + 2, GY - 6, CS - 4, CS * ROWS + 12); }
      for (var r = 0; r < ROWS; r++) { c.fillStyle = 'rgba(255,255,255,.035)'; A.rr(c, GX + cc * CS + 6, GY + r * CS + 6, CS - 12, CS - 12, 14); c.fill(); }
    }
    // 위험 표시: 거의 찬 열
    for (cc = 0; cc < COLS; cc++) if (G[cc][ROWS - 2]) { c.fillStyle = 'rgba(255,77,109,' + (0.25 + 0.2 * Math.sin(t * 8)) + ')'; c.fillRect(GX + cc * CS + 8, GY + CS * ROWS + 4, CS - 16, 4); }
    // 블록
    for (cc = 0; cc < COLS; cc++) for (r = 0; r < ROWS; r++) { var b = G[cc][r]; if (!b) continue; A.draw(c, tile(b.v), b.x, b.y, 1 + Math.sin(b.pop * Math.PI) * 0.16); }
    ghosts.forEach(function (g) { c.globalAlpha = 1 - g.t; A.draw(c, tile(g.v), A.lerp(g.x, g.tx, g.t), A.lerp(g.y, g.ty, g.t), 1 - g.t * 0.4); }); c.globalAlpha = 1;
    // 날아가는 블록
    if (flyer) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = A.hexA(colOf(flyer.v), 0.25); c.fillRect(cx(flyer.c) - 18, flyer.y, 36, LY - flyer.y); c.restore();
      A.draw(c, tile(flyer.v), cx(flyer.c), flyer.y, 1);
    }
    // 발사대
    var lx = cx(aim);
    c.fillStyle = 'rgba(255,181,71,.08)'; A.rr(c, GX - 10, LY - 62, CS * COLS + 20, 124, 22); c.fill();
    if (can || S.state !== 'playing') {
      // 조준선
      var h = height(aim), ty = h < ROWS ? cy(h) : cy(ROWS - 1);
      c.strokeStyle = 'rgba(255,181,71,.4)'; c.setLineDash([8, 10]); c.lineDashOffset = -t * 40; c.lineWidth = 3; c.beginPath(); c.moveTo(lx, LY - 50); c.lineTo(lx, ty + CS * 0.5); c.stroke(); c.setLineDash([]);
      if (h < ROWS) { c.strokeStyle = A.hexA(colOf(cur), 0.6); c.lineWidth = 2.5; A.rr(c, GX + aim * CS + 6, GY + h * CS + 6, CS - 12, CS - 12, 14); c.stroke(); }
      A.draw(c, tile(cur), lx, LY + Math.sin(t * 4) * 3, 1);
    }
    // 다음 블록
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,.45)'; c.font = '700 13px "Chakra Petch", system-ui';
    var nx = aim >= 3 ? GX + 40 : GX + CS * COLS - 40; c.fillText('NEXT', nx, LY - 38); A.draw(c, tile(nxt), nx, LY + 6, 0.55);
    // 첫 안내
    if (S.state === 'playing' && merges === 0 && phase === 'idle' && !G[0][0] && !G[2][0] && !G[4][0]) {
      c.fillStyle = 'rgba(255,224,180,' + (0.55 + Math.sin(t * 4) * 0.3) + ')'; c.font = '700 20px "Pretendard Variable", system-ui';
      c.fillText(document.body.classList.contains('touch') ? '열을 눌러 블록을 쏘아 올리세요' : '←→ 열 고르기 · Space 쏘기', W / 2, GY + CS * 3.5);
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    var k = score + '|' + maxTile + '|' + nxt + '|' + chain; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score);
    document.getElementById('hB').textContent = label(maxTile);
    document.getElementById('hC').textContent = label(nxt);
    document.getElementById('hMult').textContent = chain >= 2 ? chain + '연쇄' : '';
  }

  // ---------- 입력: 탭 = 그 열로 쏘기, 끌어서 열 고르고 떼면 쏘기 ----------
  var stage = document.getElementById('stage');
  function colAt(e) { var p = S.toLocal(e); return A.clamp(Math.floor((p.x - GX) / CS), 0, COLS - 1); }
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; e.preventDefault(); kbd = false; aiming = true; aim = colAt(e); });
  stage.addEventListener('pointermove', function (e) { if (S.state !== 'playing') return; if (aiming || e.pointerType === 'mouse') aim = colAt(e); });
  window.addEventListener('pointerup', function (e) { if (!aiming) return; aiming = false; if (S.state === 'playing') shoot(aim); });
  window.addEventListener('pointercancel', function () { aiming = false; });
  var S = new A.Shell({
    id: 'merge', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; kbd = true;
      if (k === 'ArrowLeft' || k === 'a') { aim = Math.max(0, aim - 1); A.sfx('turn'); }
      else if (k === 'ArrowRight' || k === 'd') { aim = Math.min(COLS - 1, aim + 1); A.sfx('turn'); }
      else if (/^[1-5]$/.test(k)) shoot(+k - 1);
      else if ((k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'Enter') && !e.repeat) shoot(aim);
    }
  });
})();
