(function () {
  'use strict';
  // 색 병 정렬: 병을 고르고 다른 병을 고르면 맨 위 같은 색 덩어리가 부을 수 있는 만큼 옮겨짐. 모든 병을 한 색으로
  var A = Arcade, W = 540, H = 960, CAP = 4, LIMIT = 600;
  var fx = new A.FX();
  var COLORS = ['#ff4d6d', '#ff8c3a', '#ffe066', '#b6ff4d', '#2ee59d', '#5ee7ff', '#4d7cff', '#a26bff', '#ff7ad9', '#f2f2f2', '#b0703f', '#1aa395'];
  var MARK = ['●', '▲', '■', '◆', '★', '✚', '♥', '▼', '♠', '○', '♣', '✱'];
  var B, nCol, stage, score, time, moves, undos, hist, sel, anim, clearT, added, cur = 0, kbd = false, done = {}, stuck = false;
  var BW = 58, BH = 206, LH = 44;

  // ---------- 판 만들기: 무작위로 섞은 뒤 풀이기로 풀리는 것을 확인한 판만 씀 ----------
  function key(b) { return b.map(function (x) { return x.join(''); }).sort().join('|'); }
  function topRun(b) { var n = b.length; if (!n) return [0, -1]; var c = b[n - 1], k = 1; while (k < n && b[n - 1 - k] === c) k++; return [k, c]; }
  function canPour(bs, i, j) {
    if (i === j) return false; var a = bs[i], d = bs[j];
    if (!a.length || d.length >= CAP) return false;
    if (d.length && d[d.length - 1] !== a[a.length - 1]) return false;
    var r = topRun(a); if (!d.length && r[0] === a.length) return false; // 한 색만 든 병을 빈 병으로 옮기는 건 의미 없음
    return true;
  }
  function pour(bs, i, j) { var r = topRun(bs[i]), n = Math.min(r[0], CAP - bs[j].length); for (var k = 0; k < n; k++) bs[j].push(bs[i].pop()); return n; }
  function solved(bs) { for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (!b.length) continue; if (b.length !== CAP) return false; for (var k = 1; k < CAP; k++) if (b[k] !== b[0]) return false; } return true; }
  function solvable(bs) {
    var seen = {}, budget = 40000;
    function dfs(s) {
      if (solved(s)) return true;
      if (--budget < 0) return false;
      var k = key(s); if (seen[k]) return false; seen[k] = 1;
      var mv = [];
      for (var i = 0; i < s.length; i++) for (var j = 0; j < s.length; j++) if (canPour(s, i, j)) {
        var pr = s[j].length ? 2 : 0, r = topRun(s[i]); if (s[j].length + r[0] === CAP && s[j].every(function (x) { return x === r[1]; })) pr = 3; mv.push([pr, i, j]);
      }
      mv.sort(function (a, b) { return b[0] - a[0]; });
      for (var m = 0; m < mv.length; m++) {
        var t = s.map(function (x) { return x.slice(); }); pour(t, mv[m][1], mv[m][2]);
        if (dfs(t)) return true; if (budget < 0) return false;
      }
      return false;
    }
    return dfs(bs);
  }
  function make(n) {
    var t0 = performance.now();
    for (var at = 0; at < 60; at++) {
      var pool = []; for (var c = 0; c < n; c++) for (var k = 0; k < CAP; k++) pool.push(c);
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
      var bs = []; for (c = 0; c < n; c++) bs.push(pool.slice(c * CAP, c * CAP + CAP)); bs.push([]); bs.push([]);
      var easy = bs.some(function (b) { return b.length === CAP && b.every(function (v) { return v === b[0]; }); });
      if (easy) continue;
      if (solvable(bs.map(function (b) { return b.slice(); }))) return bs;
      if (performance.now() - t0 > 1500) break;
    }
    return make(Math.max(3, n - 1));
  }
  function setup() {
    nCol = Math.min(12, 3 + stage);
    B = make(nCol); nCol = B.length - 2;
    hist = []; sel = -1; anim = null; clearT = 0; added = false; moves = 0; done = {}; cur = 0; stuck = false;
    layout();
  }
  function reset() { stage = 1; score = 0; time = 0; undos = 0; setup(); fx.clear(); hud(); }
  // 병 위치 (최대 한 줄 7개)
  var pos = [];
  function layout() {
    var n = B.length, rows = n > 7 ? 2 : 1, per = Math.ceil(n / rows);
    BW = per >= 7 ? 56 : 62; var gap = Math.min(26, (W - 40 - per * BW) / Math.max(1, per - 1));
    pos = [];
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / per), k = i % per, cnt = r === rows - 1 ? n - per * (rows - 1) : per;
      var tw = cnt * BW + (cnt - 1) * gap, x0 = (W - tw) / 2;
      pos.push({ x: x0 + k * (BW + gap), y: rows === 1 ? 420 : 250 + r * 300 });
    }
  }

  // ---------- 조작 ----------
  function tap(i) {
    if (S.state !== 'playing' || anim || clearT > 0 || i < 0 || i >= B.length) return;
    if (sel < 0) { if (!B[i].length || done[i]) { A.sfx('wall'); return; } sel = i; A.sfx('click', 1.2); return; }
    if (sel === i) { sel = -1; A.sfx('click', 0.8); return; }
    if (!canPour(B, sel, i)) {
      if (B[i].length && !done[i]) { sel = i; A.sfx('click', 1.2); return; } // 다른 병으로 고르기 바꿈
      A.sfx('wall'); fx.shake(3, 0.12); sel = -1; return;
    }
    hist.push(B.map(function (b) { return b.slice(); }));
    var r = topRun(B[sel]), n = Math.min(r[0], CAP - B[i].length);
    anim = { from: sel, to: i, n: n, c: r[1], t: 0, moved: 0 };
    sel = -1; moves++; A.sfx('turn', 1.2); hud();
  }
  function undo() {
    if (S.state !== 'playing' || anim || clearT > 0 || !hist.length) { A.sfx('wall'); return; }
    B = hist.pop(); sel = -1; undos++; score = Math.max(0, score - 5); done = {}; checkDone(true); stuck = false; layout(); A.sfx('click'); hud();
  }
  function addBottle() {
    if (S.state !== 'playing' || anim || clearT > 0 || added) { A.sfx('wall'); return; }
    added = true; B.push([]); score = Math.max(0, score - 50); layout(); stuck = false; fx.text(W / 2, 160, '빈 병 추가 (−50)', '#b48cff', 20); A.sfx('power'); hud();
  }
  function checkDone(quiet) {
    for (var i = 0; i < B.length; i++) {
      var b = B[i], full = b.length === CAP && b.every(function (v) { return v === b[0]; });
      if (full && !done[i] && !quiet) { var p = pos[i]; fx.burst(p.x + BW / 2, p.y + 30, COLORS[b[0]], 18, 220, 0.6, 3); fx.ring(p.x + BW / 2, p.y + BH / 2, COLORS[b[0]], 80, 0.4); A.sfx('coin', 1.1); A.vibrate(15); }
      done[i] = full;
    }
  }
  function anyMove() { for (var i = 0; i < B.length; i++) for (var j = 0; j < B.length; j++) if (canPour(B, i, j)) return true; return false; }
  function finishPour() {
    checkDone(false);
    if (solved(B)) {
      var pts = Math.max(20, 100 * nCol); score += pts; clearT = 1.6;
      S.banner('STAGE ' + stage + ' CLEAR', '+' + A.fmt(pts) + ' · ' + moves + '번 만에'); A.sfx('level'); A.vibrate([20, 40, 20]);
      B.forEach(function (b, i) { var p = pos[i]; setTimeout(function () { fx.burst(p.x + BW / 2, p.y + BH / 2, '#ffd166', 12, 240, 0.6, 3); }, i * 60); });
    } else if (!anyMove()) { stuck = true; A.sfx('hurt'); fx.shake(6, 0.3); }
    hud();
  }
  function update(dt) {
    fx.update(dt);
    if (clearT > 0) { clearT -= dt; if (clearT <= 0) { stage++; setup(); S.banner('STAGE ' + stage, nCol + '가지 색'); } hud(); return; }
    time += dt;
    if (time >= LIMIT) { time = LIMIT; hud(); S.gameOver(score, [['단계', (stage - 1) + ' 클리어'], ['붓기', String(moves)], ['되돌리기', String(undos)]], { kick: 'TIME UP', win: true }); return; }
    if (anim) {
      anim.t += dt;
      var POUR0 = 0.22, PER = 0.11;
      if (anim.t > POUR0) { var want = Math.min(anim.n, Math.floor((anim.t - POUR0) / PER) + 1); while (anim.moved < want) { B[anim.to].push(B[anim.from].pop()); anim.moved++; A.sfx('tick', 0.9 + B[anim.to].length * 0.1); } }
      if (anim.t >= POUR0 + anim.n * PER + 0.22) { anim = null; finishPour(); }
    }
    hud();
  }

  // ---------- 그리기 ----------
  function bottlePath(c, x, y, w, h) {
    var r = w * 0.45; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h - r); c.arcTo(x, y + h, x + r, y + h, r); c.lineTo(x + w - r, y + h); c.arcTo(x + w, y + h, x + w, y + h - r, r); c.lineTo(x + w, y); c.closePath();
  }
  function drawBottle(c, i, x, y, ang) {
    var b = B[i], w = BW, top = y + BH - CAP * LH - 10, base = y + BH - 6;
    c.save(); c.translate(x + w / 2, y + 20); c.rotate(ang || 0); c.translate(-(x + w / 2), -(y + 20));
    // 내용물
    c.save(); bottlePath(c, x + 4, y + 18, w - 8, BH - 22); c.clip();
    for (var k = 0; k < b.length; k++) {
      var ly = base - (k + 1) * LH, col = COLORS[b[k]];
      var g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, A.hexA(col, 0.75)); g.addColorStop(0.45, col); g.addColorStop(1, A.hexA(col, 0.7));
      c.fillStyle = g; c.fillRect(x, ly, w, LH + 1);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x, ly, w, 3);
      c.fillStyle = 'rgba(0,0,0,.32)'; c.font = '700 16px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(MARK[b[k]], x + w / 2, ly + LH / 2 + 2);
    }
    c.restore();
    // 유리
    bottlePath(c, x + 2, y + 16, w - 4, BH - 18);
    c.strokeStyle = done[i] ? A.hexA(COLORS[b[0]], 0.95) : sel === i ? '#ffffff' : 'rgba(220,210,255,.55)'; c.lineWidth = done[i] || sel === i ? 3 : 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x + 8, y + 24, 6, BH - 60);
    // 입구 테두리
    c.fillStyle = 'rgba(220,210,255,.7)'; A.rr(c, x - 2, y + 10, w + 4, 8, 4); c.fill();
    if (done[i]) { c.fillStyle = COLORS[b[0]]; A.rr(c, x + 6, y, w - 12, 14, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x + 10, y + 2, w - 20, 3); }
    c.restore();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    if (!B) { stage = 1; score = 0; time = 0; undos = 0; setup(); }
    c.save(); c.translate(o[0], o[1]);
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d0620'); bg.addColorStop(1, '#05020c'); c.fillStyle = bg; c.fillRect(-10, -10, W + 20, H + 20);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var s = 0; s < 22; s++) { var sx = (s * 211) % W, sy = ((s * 137 - t * (8 + s % 4 * 5)) % H + H) % H; c.fillStyle = 'rgba(180,140,255,.07)'; c.beginPath(); c.arc(sx, sy, 2 + s % 3, 0, 7); c.fill(); }
    c.restore();
    // 선반
    var rows = {}; pos.forEach(function (p) { rows[p.y] = 1; });
    Object.keys(rows).forEach(function (yy) { yy = +yy; c.fillStyle = 'rgba(180,140,255,.12)'; A.rr(c, 24, yy + BH + 4, W - 48, 10, 5); c.fill(); });
    for (var i = 0; i < B.length; i++) {
      if (anim && i === anim.from) continue;
      var p = pos[i], lift = sel === i ? -24 : 0;
      drawBottle(c, i, p.x, p.y + lift + (done[i] ? Math.sin(t * 3 + i) * 1.5 : 0), 0);
      if (kbd && cur === i && S.state === 'playing') { c.strokeStyle = '#ffd166'; c.lineWidth = 3; A.rr(c, p.x - 8, p.y - 10, BW + 16, BH + 22, 14); c.stroke(); }
      c.fillStyle = 'rgba(220,210,255,.4)'; c.font = '700 14px "Chakra Petch", system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (!document.body.classList.contains('touch') && i < 10) c.fillText(String((i + 1) % 10), p.x + BW / 2, p.y + BH + 30);
    }
    // 붓는 병
    if (anim) {
      var a = anim, pf = pos[a.from], pt = pos[a.to], POUR0 = 0.22, tot = POUR0 + a.n * 0.11 + 0.22;
      var side = pt.x >= pf.x ? -1 : 1, tx = pt.x + BW / 2 + side * (BW * 0.2) - BW / 2, ty = pt.y - BH * 0.55;
      var e1 = Math.min(1, a.t / POUR0), e3 = Math.max(0, (a.t - (tot - 0.22)) / 0.22), k = e3 > 0 ? 1 - e3 : e1, ee = k * k * (3 - 2 * k);
      var bx = A.lerp(pf.x, tx, ee), by = A.lerp(pf.y - 24, ty, ee), ang = -side * 1.2 * ee;
      drawBottle(c, a.from, bx, by, ang);
      if (a.t > POUR0 && e3 <= 0) {
        var sy0 = by + 30;
        c.strokeStyle = COLORS[a.c]; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(pt.x + BW / 2 + side * 4, sy0); c.lineTo(pt.x + BW / 2, pt.y + BH - 6 - B[a.to].length * LH); c.stroke();
      }
    }
    // 안내 글·버튼
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 21px "Pretendard Variable", system-ui';
    c.fillStyle = stuck ? '#ff7aa8' : '#e3d6ff';
    var msg = S.state !== 'playing' ? '' : clearT > 0 ? '정리 완료!' : stuck ? '더 부을 곳이 없어요 · 되돌리기나 병 추가' : sel >= 0 ? '부을 병을 고르세요' : '병을 골라 다른 병에 부으세요';
    c.fillText(msg, W / 2, 150);
    if (S.state === 'playing') btns().forEach(function (b) {
      c.fillStyle = b.on ? b.bg : 'rgba(255,255,255,.04)'; A.rr(c, b.x, b.y, b.w, b.h, 16); c.fill(); c.strokeStyle = b.on ? b.fg : 'rgba(255,255,255,.12)'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = b.on ? b.fg : 'rgba(255,255,255,.3)'; c.font = '700 18px "Pretendard Variable", system-ui'; c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    });
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function btns() {
    var y = 840, on = !anim && clearT <= 0;
    return [{ id: 'undo', x: 40, y: y, w: 220, h: 64, label: '되돌리기 (−5)', on: on && hist && hist.length > 0, fg: '#e3d6ff', bg: 'rgba(227,214,255,.1)' },
      { id: 'add', x: 280, y: y, w: 220, h: 64, label: added ? '병 추가 완료' : '빈 병 추가 (−50)', on: on && !added, fg: '#b48cff', bg: 'rgba(180,140,255,.16)' }];
  }
  function fmtT(s) { s = Math.max(0, Math.ceil(LIMIT - s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  var lastHud = '';
  function hud() {
    if (!B) return;
    var k = score + '|' + stage + '|' + moves + '|' + fmtT(time); if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; document.getElementById('hC').textContent = moves;
    document.getElementById('hMult').textContent = fmtT(time);
  }

  // ---------- 입력 ----------
  function hit(p) {
    for (var i = 0; i < B.length; i++) { var q = pos[i]; if (p.x >= q.x - 10 && p.x <= q.x + BW + 10 && p.y >= q.y - 40 && p.y <= q.y + BH + 20) return i; }
    return -1;
  }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; e.preventDefault(); kbd = false; var p = S.toLocal(e);
    var bs = btns(); for (var b = 0; b < bs.length; b++) { var q = bs[b]; if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) { if (!q.on) { A.sfx('wall'); return; } if (q.id === 'undo') undo(); else addBottle(); return; } }
    var i = hit(p); if (i >= 0) tap(i); else if (sel >= 0) { sel = -1; A.sfx('click', 0.8); }
  });
  var S = new A.Shell({
    id: 'sort', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (/^[0-9]$/.test(k)) { var i = k === '0' ? 9 : +k - 1; kbd = true; cur = i; tap(i); return; }
      if (k === 'ArrowLeft' || k === 'a') { kbd = true; cur = Math.max(0, cur - 1); return; }
      if (k === 'ArrowRight' || k === 'd') { kbd = true; cur = Math.min(B.length - 1, cur + 1); return; }
      if (k === 'ArrowUp' || k === 'w' || k === 'ArrowDown' || k === 's') { kbd = true; var per = B.length > 7 ? Math.ceil(B.length / 2) : B.length; cur = A.clamp(cur + (k === 'ArrowUp' || k === 'w' ? -per : per), 0, B.length - 1); return; }
      if ((k === ' ' || k === 'Enter') && !e.repeat) { kbd = true; tap(cur); return; }
      if (k === 'u' || k === 'z' || k === 'Backspace') { undo(); return; }
      if (k === 'b') { addBottle(); return; }
      if (k === 'Escape') sel = -1;
    }
  });
})();
