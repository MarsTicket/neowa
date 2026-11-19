(function () {
  'use strict';
  // 타워 디펜스: 구불구불한 길을 따라 오는 적을 타워로 막기. 타워 4종 × 3단계, 판매 70% 환급
  var A = Arcade, W = 540, H = 960, COLS = 9, ROWS = 11, CS = 56, GX = 18, GY = 116;
  var TT = [
    { k: 'mg', n: '기관총', col: '#ffd166', cost: 50, rng: 1.8, rate: 6, dmg: 5, d: '빠르게 쏨' },
    { k: 'cn', n: '대포', col: '#ff7a45', cost: 90, rng: 2.2, rate: 0.8, dmg: 26, d: '폭발 범위 피해' },
    { k: 'ic', n: '얼음', col: '#7ad7ff', cost: 70, rng: 1.7, rate: 1.2, dmg: 3, d: '느리게(비행 제외)' },
    { k: 'lz', n: '레이저', col: '#ff5ec4', cost: 130, rng: 2.6, rate: 0.6, dmg: 34, d: '한 줄 관통' }
  ];
  var ET = {
    nm: { hp: 30, sp: 1.0, g: 5, col: '#ff7a45', r: 11 }, fs: { hp: 16, sp: 1.9, g: 4, col: '#ffd166', r: 9 },
    tk: { hp: 95, sp: 0.6, g: 10, col: '#b48cff', r: 14 }, fl: { hp: 24, sp: 1.25, g: 6, col: '#7dff9b', r: 10, fly: true },
    bs: { hp: 650, sp: 0.5, g: 90, col: '#ff4d6d', r: 20, boss: true }
  };
  var fx = new A.FX();
  var path, onPath, towers, enemies, shots, beams, gold, lives, wave, score, phase, queue, spawnT, breakT, sel, cur, speed, kills, tim = 0;

  // ---------- 길 만들기 ----------
  function makePath() {
    // 위에서 아래로: 2칸 내려가고 가로로 이동하기를 반복 → 길이 서로 붙지 않음
    var c = A.irand(1, COLS - 2), r = 0, p = [[r, c]];
    while (r < ROWS - 1) {
      var down = r + 2 <= ROWS - 1 ? 2 : ROWS - 1 - r;
      for (var i = 0; i < down; i++) { r++; p.push([r, c]); }
      if (r >= ROWS - 1) break;
      var nc; do { nc = A.irand(0, COLS - 1); } while (Math.abs(nc - c) < 3);
      while (c !== nc) { c += nc > c ? 1 : -1; p.push([r, c]); }
    }
    path = p; onPath = {}; p.forEach(function (q) { onPath[q[0] + ',' + q[1]] = 1; });
  }
  function cpos(r, c) { return { x: GX + c * CS + CS / 2, y: GY + r * CS + CS / 2 }; }
  function pathPos(d) {
    // 길을 따라 d칸 간 위치(시작 전 1칸은 화면 위 바깥)
    var n = path.length;
    if (d < 0) { var s = cpos(path[0][0], path[0][1]); return { x: s.x, y: s.y + d * CS }; }
    if (d >= n - 1) { var e = cpos(path[n - 1][0], path[n - 1][1]); return { x: e.x, y: e.y + (d - n + 1) * CS }; }
    var i = Math.floor(d), f = d - i, a = cpos(path[i][0], path[i][1]), b = cpos(path[i + 1][0], path[i + 1][1]);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  // ---------- 진행 ----------
  function reset() {
    if (A.music && A.music.mood) A.music.mood(null);
    makePath(); towers = []; enemies = []; shots = []; beams = []; gold = 160; lives = 20; wave = 0; score = 0; kills = 0;
    phase = 'break'; breakT = 15; queue = []; spawnT = 0; sel = null; cur = { r: 1, c: 1 }; speed = 1; fx.clear(); hud();
  }
  function buildWave(w) {
    var n = Math.round(8 + w * 1.6), list = [], kinds = ['nm'];
    if (w >= 3) kinds.push('fs'); if (w >= 5) kinds.push('tk'); if (w >= 7) kinds.push('fl');
    for (var i = 0; i < n; i++) list.push(kinds[Math.floor(Math.random() * kinds.length)]);
    if (w % 10 === 0) list.push('bs');
    if (w % 4 === 2 && w >= 6) list = list.map(function () { return 'fs'; }); // 빠른 적 떼
    return list;
  }
  function startWave() {
    if (phase !== 'break' || S.state !== 'playing') return;
    var bonus = wave > 0 ? Math.floor(breakT) * 2 : 0;
    if (bonus > 0) { gold += bonus; fx.text(W / 2, GY + 40, '바로 시작 +' + bonus + 'G', '#ffd166', 22); }
    wave++; queue = buildWave(wave); spawnT = 0; phase = 'wave';
    S.banner('WAVE ' + wave, wave % 10 === 0 ? '보스 등장!' : (queue.length + '마리')); A.sfx(wave % 10 === 0 ? 'charge' : 'go'); if (A.music && A.music.mood) A.music.mood((wave % 10 === 0 ? 'boss' : (lives <= 5 ? 'danger' : null))); hud();
  }
  function spawn(k) {
    var t = ET[k], hp = Math.round(t.hp * Math.pow(1.12, wave - 1));
    enemies.push({ k: k, d: -0.8, hp: hp, max: hp, sp: t.sp, g: t.g + Math.floor(wave / 6), col: t.col, r: t.r, fly: !!t.fly, boss: !!t.boss, slow: 0, x: 0, y: 0, hit: 0 });
  }
  function tStats(tw) { var b = TT[tw.t], m = Math.pow(1.6, tw.lv - 1); return { rng: (b.rng + 0.3 * (tw.lv - 1)) * CS, rate: b.rate * (1 + 0.15 * (tw.lv - 1)), dmg: b.dmg * m }; }
  function upCost(tw) { return Math.round(TT[tw.t].cost * 0.8 * tw.lv); }
  function build(r, c, t) {
    if (onPath[r + ',' + c]) { A.sfx('wrong'); fx.text(W / 2, PY - 14, '길 위에는 지을 수 없어요', '#ffd9c4', 18); return; }
    if (towerAt(r, c) || gold < TT[t].cost) { if (gold < TT[t].cost) { A.sfx('wrong'); fx.text(W / 2, 770, '골드가 모자라요', '#ff7a8a', 20); } return; }
    gold -= TT[t].cost; var p = cpos(r, c);
    var tw = { r: r, c: c, x: p.x, y: p.y, t: t, lv: 1, cd: 0, a: -Math.PI / 2, spent: TT[t].cost }; towers.push(tw); sel = { tw: tw };
    fx.burst(p.x, p.y, TT[t].col, 14, 180, 0.4, 2.5); A.sfx('place'); A.sfx('power', 0.8); A.vibrate(10); hud();
  }
  function upgrade(tw) {
    if (!tw || tw.lv >= 3) return; var cst = upCost(tw); if (gold < cst) { A.sfx('wrong'); fx.text(W / 2, 770, '골드가 모자라요', '#ff7a8a', 20); return; }
    gold -= cst; tw.spent += cst; tw.lv++; fx.burst(tw.x, tw.y, '#ffffff', 16, 200, 0.4, 2.5); fx.ring(tw.x, tw.y, TT[tw.t].col, 34, 0.35); A.sfx('level'); hud();
  }
  function sell(tw) {
    if (!tw) return; var back = Math.floor(tw.spent * 0.7); gold += back; towers.splice(towers.indexOf(tw), 1); sel = null;
    fx.text(tw.x, tw.y - 10, '+' + back + 'G', '#ffd166', 18); fx.burst(tw.x, tw.y, '#ffd166', 10, 160, 0.3, 2); A.sfx('coin'); hud();
  }
  function towerAt(r, c) { for (var i = 0; i < towers.length; i++) if (towers[i].r === r && towers[i].c === c) return towers[i]; return null; }
  function damage(e, v) {
    if (e.hp <= 0) return; e.hp -= v; e.hit = 0.08;
    if (e.hp <= 0) {
      gold += e.g; score += e.g * 10 * (e.boss ? 3 : 1); kills++;
      fx.burst(e.x, e.y, e.col, e.boss ? 40 : 12, e.boss ? 360 : 200, 0.5, 2.5); fx.text(e.x, e.y - 14, '+' + e.g, '#ffd166', 15);
      if (e.boss) { fx.shake(8, 0.3); A.sfx('bigboom'); A.vibrate([30, 30, 60]); } else { A.sfx('hit', 0.9 + Math.random() * 0.3); A.sfx('coin', 1.3); }
      hud();
    }
  }
  function step(dt) {
    // 적 생성
    if (phase === 'wave' && queue.length) { spawnT -= dt; if (spawnT <= 0) { spawn(queue.shift()); spawnT = Math.max(0.32, 0.85 - wave * 0.015); } }
    if (phase === 'break') { breakT -= dt; if (breakT <= 0) { breakT = 0; startWave(); } }
    // 적 이동
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (e.hp <= 0) { enemies.splice(i, 1); continue; }
      if (e.slow > 0) e.slow -= dt; if (e.hit > 0) e.hit -= dt;
      e.d += e.sp * (e.slow > 0 ? 0.55 : 1) * dt;
      var p = pathPos(e.d); e.x = p.x; e.y = p.y;
      if (e.d >= path.length) {
        enemies.splice(i, 1); lives -= e.boss ? 5 : 1; fx.flashIt('#ff4d6d', 0.25); fx.shake(5, 0.2); A.sfx('hurt'); A.vibrate(30); if (lives <= 5) { A.sfx('warn'); if (A.music && A.music.mood) A.music.mood('danger'); } hud();
        if (lives <= 0) { lives = 0; phase = 'over'; if (A.music && A.music.mood) A.music.mood(null); S.gameOver(score, [['웨이브', String(wave)], ['처치', String(kills)], ['타워', String(towers.length)]]); return; }
      }
    }
    // 타워
    towers.forEach(function (tw) {
      tw.cd -= dt; var st = tStats(tw), best = null, bd = -1;
      enemies.forEach(function (e) { if (e.hp > 0 && e.d > 0 && Math.hypot(e.x - tw.x, e.y - tw.y) <= st.rng && e.d > bd) { if (tw.t === 2 && e.fly && enemies.some(function (o) { return !o.fly && o.hp > 0 && o.d > 0 && Math.hypot(o.x - tw.x, o.y - tw.y) <= st.rng; })) return; bd = e.d; best = e; } });
      if (!best) return;
      var want = Math.atan2(best.y - tw.y, best.x - tw.x); tw.a = want;
      if (tw.cd > 0) return; tw.cd = 1 / st.rate;
      var mx = tw.x + Math.cos(want) * 20, my = tw.y + Math.sin(want) * 20;
      if (tw.t === 0) { shots.push({ x: mx, y: my, tg: best, sp: 900, dmg: st.dmg, col: '#ffd166', kind: 0 }); A.sfx('shoot', 1.6, A.clamp(mx / W * 2 - 1, -1, 1)); }
      else if (tw.t === 1) { shots.push({ x: mx, y: my, tg: best, sp: 420, dmg: st.dmg, col: '#ff7a45', kind: 1, splash: CS * (0.85 + 0.1 * tw.lv) }); A.sfx('shoot', 0.6, A.clamp(mx / W * 2 - 1, -1, 1)); }
      else if (tw.t === 2) { shots.push({ x: mx, y: my, tg: best, sp: 520, dmg: st.dmg, col: '#7ad7ff', kind: 2, splash: CS * 0.7, slow: 1.4 + 0.4 * tw.lv }); A.sfx('shoot', 1.2, A.clamp(mx / W * 2 - 1, -1, 1)); }
      else {
        // 레이저: 사거리 끝까지 직선 관통
        var ex = tw.x + Math.cos(want) * st.rng, ey = tw.y + Math.sin(want) * st.rng;
        enemies.forEach(function (e) { var q = segDist(e.x, e.y, mx, my, ex, ey); if (q < e.r + 6) damage(e, st.dmg); });
        beams.push({ x1: mx, y1: my, x2: ex, y2: ey, t: 0.18, col: '#ff5ec4', w: 3 + tw.lv * 2 }); A.sfx('power', 1.4);
      }
    });
    // 포탄
    for (i = shots.length - 1; i >= 0; i--) {
      var s = shots[i], tg = s.tg; if (tg.hp > 0) { s.tx = tg.x; s.ty = tg.y; }
      var dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy), mv = s.sp * dt;
      if (d <= mv + 4) {
        if (s.kind === 0) { if (tg.hp > 0) damage(tg, s.dmg); }
        else {
          enemies.forEach(function (e) { if (Math.hypot(e.x - s.tx, e.y - s.ty) < s.splash + e.r) { damage(e, s.dmg); if (s.kind === 2 && !e.fly) e.slow = Math.max(e.slow, s.slow); } });
          fx.ring(s.tx, s.ty, s.col, s.splash, 0.3); if (s.kind === 1) { fx.burst(s.tx, s.ty, '#ffb27a', 10, 160, 0.3, 2.5); A.sfx('boom', 1.3); }
        }
        shots.splice(i, 1);
      } else { s.x += dx / d * mv; s.y += dy / d * mv; }
    }
    for (i = beams.length - 1; i >= 0; i--) { beams[i].t -= dt; if (beams[i].t <= 0) beams.splice(i, 1); }
    // 웨이브 끝
    if (phase === 'wave' && !queue.length && !enemies.length) {
      var b = 100 + lives * 5; score += b; gold += 20 + wave * 2; phase = 'break'; breakT = 12;
      S.banner('WAVE ' + wave + ' 클리어', '+' + b + '점 · +' + (20 + wave * 2) + 'G'); A.sfx('level'); if (A.music && A.music.mood) A.music.mood(lives <= 5 ? 'danger' : null); hud();
    }
  }
  function segDist(px, py, x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy, t = l ? A.clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1) : 0; return Math.hypot(px - x1 - dx * t, py - y1 - dy * t); }
  function update(dt) {
    tim += dt; fx.update(dt);
    // 배속: 같은 시간 간격으로 여러 번 계산 → 물리가 깨지지 않음
    for (var i = 0; i < speed && phase !== 'over'; i++) step(dt);
  }

  // ---------- 그리기 ----------
  function towerSprite(t, lv) {
    var b = TT[t];
    return A.sprite('td' + t + lv, 52, 52, function (x) {
      x.shadowColor = b.col; x.shadowBlur = 6 + lv * 3; x.fillStyle = '#1c1420'; A.rr(x, 6, 6, 40, 40, 10); x.fill(); x.shadowBlur = 0;
      x.strokeStyle = b.col; x.lineWidth = 2 + lv * 0.6; A.rr(x, 7, 7, 38, 38, 9); x.stroke();
      for (var i = 0; i < lv; i++) { x.fillStyle = b.col; x.beginPath(); x.arc(14 + i * 7, 40, 2.2, 0, Math.PI * 2); x.fill(); }
    });
  }
  function drawGun(c, tw) {
    var b = TT[tw.t]; c.save(); c.translate(tw.x, tw.y); c.rotate(tw.a);
    c.fillStyle = b.col;
    if (tw.t === 0) { c.fillRect(2, -5, 18, 3.5); c.fillRect(2, 1.5, 18, 3.5); }
    else if (tw.t === 1) c.fillRect(0, -5.5, 19, 11);
    else if (tw.t === 2) { c.beginPath(); c.moveTo(18, 0); c.lineTo(6, -7); c.lineTo(6, 7); c.closePath(); c.fill(); }
    else { c.fillRect(0, -3, 22, 6); c.fillStyle = '#fff'; c.fillRect(18, -1.5, 5, 3); }
    c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function selCell() { return sel ? (sel.tw ? { r: sel.tw.r, c: sel.tw.c } : sel) : null; }
  /* 그림: 풀밭 칸(4종 무늬), 흙길, 성 모양 기지, 적이 나오는 문 */
  function grassSpr(k) {
    return A.sprite('tdg' + k, CS, CS, function (x) {
      var g = x.createLinearGradient(0, 0, CS, CS); g.addColorStop(0, k % 2 ? '#24401c' : '#2a4a20'); g.addColorStop(1, k % 2 ? '#1a3014' : '#203a18'); x.fillStyle = g; x.fillRect(0, 0, CS, CS);
      x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, CS - 1, CS - 1);
      for (var i = 0; i < 16; i++) { var gx = 3 + Math.random() * (CS - 6), gy = 6 + Math.random() * (CS - 8); x.strokeStyle = 'rgba(140,210,90,' + (0.2 + Math.random() * 0.3) + ')'; x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx - 1.5, gy - 5); x.moveTo(gx, gy); x.lineTo(gx + 1.5, gy - 5); x.stroke(); }
      if (k === 2) { x.fillStyle = '#ffd166'; x.beginPath(); x.arc(CS * 0.3, CS * 0.6, 2.2, 0, 7); x.arc(CS * 0.7, CS * 0.3, 2, 0, 7); x.fill(); }
      if (k === 3) { x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(CS * 0.62, CS * 0.68, 8, 4, 0, 0, 7); x.fill(); x.fillStyle = '#7a7a70'; x.beginPath(); x.ellipse(CS * 0.6, CS * 0.64, 8, 5.5, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.ellipse(CS * 0.57, CS * 0.61, 3, 1.6, 0, 0, 7); x.fill(); }
    });
  }
  var CASTLE = A.sprite('tdcastle', 60, 60, function (x) {
    x.translate(30, 34);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(2, 20, 24, 6, 0, 0, 7); x.fill();
    var g = x.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, '#d8d0c0'); g.addColorStop(1, '#8a8070'); x.fillStyle = g;
    x.fillRect(-18, -10, 36, 28); for (var k = 0; k < 4; k++) x.fillRect(-18 + k * 10, -16, 6, 7);
    x.fillRect(-24, -20, 10, 38); x.fillRect(14, -20, 10, 38); x.fillRect(-24, -25, 4, 5); x.fillRect(-18, -25, 4, 5); x.fillRect(14, -25, 4, 5); x.fillRect(20, -25, 4, 5);
    x.fillStyle = '#3a2a1a'; x.beginPath(); x.moveTo(-6, 18); x.lineTo(-6, 4); x.arc(0, 4, 6, Math.PI, 0); x.lineTo(6, 18); x.fill();
    x.strokeStyle = '#e8e8e8'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -10); x.lineTo(0, -28); x.stroke(); x.fillStyle = '#ff4d6d'; x.beginPath(); x.moveTo(0, -28); x.lineTo(12, -24); x.lineTo(0, -20); x.fill();
  });
  function render(c, t) {
    if (!path) reset();
    c.fillStyle = '#0a1408'; c.fillRect(0, 0, W, H);
    var o = fx.offset(); c.save(); c.translate(o[0], o[1]);
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(GX - 4, GY - 2, COLS * CS + 8, ROWS * CS + 8);
    // 바닥 칸: 풀밭
    for (var r = 0; r < ROWS; r++) for (var cc = 0; cc < COLS; cc++) {
      var x = GX + cc * CS, y = GY + r * CS;
      c.drawImage(grassSpr(((r * 7 + cc * 13) % 11) % 4), x, y, CS, CS);
    }
    // 길: 가장자리 돌 → 흙 → 바퀴 자국
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); var s0 = pathPos(-1); c.moveTo(s0.x, s0.y); path.forEach(function (q) { var p = cpos(q[0], q[1]); c.lineTo(p.x, p.y); }); var e0 = pathPos(path.length); c.lineTo(e0.x, e0.y);
    c.strokeStyle = '#4a3a28'; c.lineWidth = CS - 2; c.stroke(); c.strokeStyle = '#8a6a44'; c.lineWidth = CS - 10; c.stroke(); c.strokeStyle = '#a07e52'; c.lineWidth = CS - 24; c.stroke();
    c.strokeStyle = 'rgba(70,50,30,.35)'; c.lineWidth = 2; c.setLineDash([10, 8]); c.lineDashOffset = 0; c.save(); c.translate(-8, 0); c.stroke(); c.restore(); c.save(); c.translate(8, 0); c.stroke(); c.restore();
    c.setLineDash([6, 12]); c.lineDashOffset = -t * 30; c.strokeStyle = 'rgba(255,122,69,.45)'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
    var ep = cpos(path[path.length - 1][0], path[path.length - 1][1]); A.draw(c, CASTLE, ep.x, ep.y - 6, 0.95);
    var sp0 = cpos(path[0][0], path[0][1]); c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ff4d6d', 10), sp0.x, sp0.y, 1 + Math.sin(t * 4) * 0.1); c.restore();
    // 선택·커서
    var sc = selCell();
    if (sc) { c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.strokeRect(GX + sc.c * CS + 2, GY + sc.r * CS + 2, CS - 4, CS - 4); }
    if (curOn) { c.strokeStyle = 'rgba(255,122,69,.9)'; c.lineWidth = 2; c.setLineDash([5, 5]); c.strokeRect(GX + cur.c * CS + 4, GY + cur.r * CS + 4, CS - 8, CS - 8); c.setLineDash([]); }
    // 사거리
    if (sel && sel.tw) { var st = tStats(sel.tw); c.fillStyle = 'rgba(255,255,255,.06)'; c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.beginPath(); c.arc(sel.tw.x, sel.tw.y, st.rng, 0, Math.PI * 2); c.fill(); c.stroke(); }
    // 타워
    towers.forEach(function (tw) { A.draw(c, towerSprite(tw.t, tw.lv), tw.x, tw.y, 1); drawGun(c, tw); });
    // 적
    enemies.forEach(function (e) {
      if (e.d < -0.4) return;
      if (e.fly) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(e.x + 6, e.y + 10, e.r, e.r * 0.5, 0, 0, Math.PI * 2); c.fill(); }
      var yy = e.fly ? e.y - 6 + Math.sin(t * 6 + e.d) * 2 : e.y;
      c.fillStyle = e.hit > 0 ? '#ffffff' : e.col;
      if (e.k === 'tk') { A.rr(c, e.x - e.r, yy - e.r, e.r * 2, e.r * 2, 5); c.fill(); }
      else if (e.k === 'fs') { c.beginPath(); c.moveTo(e.x, yy - e.r - 2); c.lineTo(e.x + e.r, yy + e.r); c.lineTo(e.x - e.r, yy + e.r); c.closePath(); c.fill(); }
      else if (e.fly) { c.beginPath(); c.moveTo(e.x - e.r - 6, yy); c.lineTo(e.x, yy - e.r); c.lineTo(e.x + e.r + 6, yy); c.lineTo(e.x, yy + e.r * 0.6); c.closePath(); c.fill(); }
      else { c.beginPath(); c.arc(e.x, yy, e.r, 0, Math.PI * 2); c.fill(); if (e.boss) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); } }
      if (e.slow > 0) { c.strokeStyle = '#7ad7ff'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, yy, e.r + 4, 0, Math.PI * 2); c.stroke(); }
      if (e.hp < e.max) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - 14, yy - e.r - 9, 28, 4); c.fillStyle = e.hp / e.max > 0.4 ? '#7dff9b' : '#ff4d6d'; c.fillRect(e.x - 14, yy - e.r - 9, 28 * Math.max(0, e.hp / e.max), 4); }
    });
    // 포탄·레이저
    shots.forEach(function (s) { c.fillStyle = s.col; c.beginPath(); c.arc(s.x, s.y, s.kind === 1 ? 5 : 3, 0, Math.PI * 2); c.fill(); });
    beams.forEach(function (b) { c.globalAlpha = b.t / 0.18; c.strokeStyle = b.col; c.lineWidth = b.w + 4; c.globalAlpha *= 0.35; c.beginPath(); c.moveTo(b.x1, b.y1); c.lineTo(b.x2, b.y2); c.stroke(); c.globalAlpha = b.t / 0.18; c.strokeStyle = '#ffe0f4'; c.lineWidth = b.w * 0.5; c.stroke(); c.globalAlpha = 1; });
    fx.draw(c);
    drawPanel(c, t);
    c.restore(); fx.drawFlash(c, W, H);
  }
  // ---------- 아래 패널 ----------
  var PY = GY + ROWS * CS + 10;
  function btnRects() {
    var out = [];
    if (sel && sel.tw) { out.push({ id: 'up', x: 18, y: PY + 40, w: 246, h: 84 }); out.push({ id: 'sell', x: 276, y: PY + 40, w: 246, h: 84 }); }
    else for (var i = 0; i < 4; i++) out.push({ id: 'b' + i, x: 18 + i * 127, y: PY + 40, w: 117, h: 84 });
    out.push({ id: 'wave', x: 18, y: PY + 134, w: 370, h: 62 }); out.push({ id: 'spd', x: 398, y: PY + 134, w: 124, h: 62 });
    return out;
  }
  function drawPanel(c, t) {
    c.textAlign = 'left'; c.fillStyle = '#ffd166'; c.font = '900 22px "Pretendard Variable",system-ui'; c.fillText('G ' + gold, 22, PY + 26);
    c.textAlign = 'right'; c.fillStyle = 'rgba(255,230,210,.75)'; c.font = '700 15px "Pretendard Variable",system-ui';
    var info = sel && sel.tw ? TT[sel.tw.t].n + ' ' + sel.tw.lv + '단계 · ' + TT[sel.tw.t].d : sel ? '지을 타워를 고르세요' : '빈 칸을 눌러 타워 짓기';
    c.fillText(info, W - 20, PY + 24);
    btnRects().forEach(function (b) {
      var on = true, label = '', sub = '', col = '#ff7a45';
      if (b.id.charAt(0) === 'b') {
        var tt = TT[+b.id.charAt(1)]; on = gold >= tt.cost && !!sel; col = tt.col; label = tt.n; sub = tt.cost + 'G';
        c.fillStyle = on ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.03)'; A.rr(c, b.x, b.y, b.w, b.h, 14); c.fill();
        c.globalAlpha = on ? 1 : 0.4; A.draw(c, towerSprite(+b.id.charAt(1), 1), b.x + 26, b.y + 30, 0.7); drawGun(c, { x: b.x + 26, y: b.y + 30, t: +b.id.charAt(1), a: -0.6 });
        c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '800 16px "Pretendard Variable",system-ui'; c.fillText(label, b.x + 48, b.y + 34);
        c.fillStyle = col; c.font = '800 15px "Pretendard Variable",system-ui'; c.fillText(sub, b.x + 12, b.y + 70);
        c.fillStyle = 'rgba(255,255,255,.35)'; c.textAlign = 'right'; c.font = '700 13px "Pretendard Variable",system-ui'; c.fillText(String(+b.id.charAt(1) + 1), b.x + b.w - 10, b.y + 70);
        c.globalAlpha = 1; return;
      }
      if (b.id === 'up') { var tw = sel.tw, cst = upCost(tw); on = tw.lv < 3 && gold >= cst; label = tw.lv >= 3 ? '최고 단계' : '업그레이드 (U)'; sub = tw.lv >= 3 ? '' : cst + 'G'; col = '#7dff9b'; }
      if (b.id === 'sell') { label = '판매 (S)'; sub = '+' + Math.floor(sel.tw.spent * 0.7) + 'G'; col = '#ffd166'; }
      if (b.id === 'wave') { on = phase === 'break'; label = phase === 'break' ? '웨이브 ' + (wave + 1) + ' 시작 ▶' : '웨이브 ' + wave + ' 진행 중'; sub = phase === 'break' ? (wave > 0 ? Math.ceil(breakT) + '초 뒤 자동 · 지금 +' + Math.floor(breakT) * 2 + 'G' : Math.ceil(breakT) + '초 뒤 자동 시작') : '남은 적 ' + (queue.length + enemies.length); col = '#ff7a45'; }
      if (b.id === 'spd') { label = '×' + speed; sub = '배속 (X)'; col = speed > 1 ? '#ff7a45' : '#ffffff'; }
      c.fillStyle = on ? (b.id === 'wave' ? 'rgba(255,122,69,.85)' : 'rgba(255,255,255,.1)') : 'rgba(255,255,255,.04)'; A.rr(c, b.x, b.y, b.w, b.h, 14); c.fill();
      c.textAlign = 'center'; c.fillStyle = on && b.id === 'wave' ? '#2a0d00' : on ? '#fff' : 'rgba(255,255,255,.45)'; c.font = '900 ' + (b.id === 'spd' ? 24 : 20) + 'px "Pretendard Variable",system-ui';
      c.fillText(label, b.x + b.w / 2, b.y + (sub ? b.h / 2 - 2 : b.h / 2 + 7));
      if (sub) { c.fillStyle = on && b.id === 'wave' ? 'rgba(42,13,0,.75)' : col; c.font = '700 14px "Pretendard Variable",system-ui'; c.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + 20); }
    });
  }
  var lastHud = '';
  function hud() {
    var k = score + '|' + wave + '|' + lives + '|' + gold; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = wave; document.getElementById('hC').textContent = lives;
    document.getElementById('hMult').textContent = 'G ' + gold;
  }

  // ---------- 입력 ----------
  var curOn = false;
  function press(id) {
    if (id.charAt(0) === 'b') { var sc = selCell(); if (sc && !(sel && sel.tw)) build(sc.r, sc.c, +id.charAt(1)); else { fx.text(W / 2, PY - 14, '먼저 빈 칸을 누르세요', '#ffd9c4', 18); A.sfx('tick'); } }
    else if (id === 'up') upgrade(sel && sel.tw); else if (id === 'sell') sell(sel && sel.tw);
    else if (id === 'wave') startWave(); else if (id === 'spd') { speed = speed === 1 ? 2 : 1; A.sfx('click'); }
  }
  function selectCell(r, c) {
    var tw = towerAt(r, c);
    if (tw) { sel = sel && sel.tw === tw ? null : { tw: tw }; A.sfx('tick'); return; }
    if (onPath[r + ',' + c]) { sel = null; return; }
    sel = sel && !sel.tw && sel.r === r && sel.c === c ? null : { r: r, c: c }; A.sfx('tick');
  }
  var stage = document.getElementById('stage');
  stage.addEventListener('click', function (e) {
    if (S.state !== 'playing' || phase === 'over') return; var p = S.toLocal(e); curOn = false;
    var bs = btnRects(); for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { press(b.id); return; } }
    var c = Math.floor((p.x - GX) / CS), r = Math.floor((p.y - GY) / CS);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) { cur = { r: r, c: c }; selectCell(r, c); } else sel = null;
  });
  var S = new A.Shell({
    id: 'td', W: W, H: H, reset: reset, update: update, idle: function (dt) { tim += dt; fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key, mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[k];
      if (mv) { curOn = true; cur.r = A.clamp(cur.r + mv[0], 0, ROWS - 1); cur.c = A.clamp(cur.c + mv[1], 0, COLS - 1); var tw = towerAt(cur.r, cur.c); sel = tw ? { tw: tw } : onPath[cur.r + ',' + cur.c] ? null : { r: cur.r, c: cur.c }; return; }
      if (k >= '1' && k <= '4') { var tg = sel && !sel.tw ? sel : cur; curOn = true; build(tg.r, tg.c, +k - 1); }
      else if (k === 'u') upgrade(sel && sel.tw); else if (k === 's') sell(sel && sel.tw);
      else if (k === ' ' && !e.repeat) startWave(); else if (k === 'x') press('spd');
    }
  });
})();
