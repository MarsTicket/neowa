(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOPY = 260, BOTY = 760, T = 30;   // 천장·바닥 위치, 판 두께 (위아래 간격 500은 가로·세로 같음)
  // 가로 화면은 960x720: 앞이 멀리 보임. 길 간격·물리는 그대로, 위치만 위로 옮김
  function geo(sh) { landStats(sh); var ny = sh.land ? 130 : 260, d = ny - TOPY; W = sh.W; H = sh.H; TOPY = ny; BOTY = ny + 500;
    if (d && P) { P.y += d; stars.forEach(function (st) { st.y += d; }); } }
  var fx = new A.FX();
  var P, segs, stars, speed, dist, score, starN, dyingT, nextX, bufT, coyT, bonus, nearN, nextMile;
  // 길: 위/아래 판 조각(있음/없음) + 가시
  function gen() {
    var lv = Math.min(1, dist / 15000), len = A.rand(200, 380), x = nextX;
    var r = Math.random(), top = true, bot = true, spikes = [];
    if (dist > 400) {
      if (r < 0.3) bot = false; else if (r < 0.55) top = false;
      else if (r < 0.85) {
        var n = A.irand(1, 2 + Math.floor(lv * 2)), cand = [], i;
        for (i = 0; i < n; i++) cand.push({ side: Math.random() < 0.5 ? 'top' : 'bot', x: x + A.rand(40, len - 50) });
        cand.sort(function (a, b) { return a.x - b.x; });
        // 가시 간격 보장: 같은 쪽 60px, 반대쪽 150px 이상 (위아래 동시에 막혀 못 지나가는 배치 방지)
        cand.forEach(function (k) { var p = spikes[spikes.length - 1]; if (!p || k.x - p.x >= (p.side === k.side ? 60 : 150)) spikes.push(k); });
      }
    }
    segs.push({ x: x, len: len, top: top, bot: bot, spikes: spikes });
    if (Math.random() < 0.5) stars.push({ x: x + len / 2, y: A.pick([TOPY + 60, BOTY - 60, (TOPY + BOTY) / 2]) });
    nextX = x + len + (top && bot ? 0 : 0);
  }
  function reset() { P = { x: 130, y: BOTY - 22, vy: 0, g: 1, ground: true, rot: 0 }; segs = []; stars = []; speed = 340; dist = 0; score = 0; starN = 0; dyingT = 0; nextX = -100;
    bufT = 0; coyT = 0; bonus = 0; nearN = 0; nextMile = 500; while (nextX < W + 400) gen(); fx.clear(); hud(); }
  function floorHere(side) { for (var i = 0; i < segs.length; i++) { var s = segs[i]; if (P.x >= s.x && P.x < s.x + s.len) return s[side]; } return true; }
  // 착지 직전(0.15초)에 누른 탭은 기억했다가 착지하자마자 반전, 발판 끝에서 떨어진 직후(0.08초)에도 반전 허용
  function flip() { if (S.state !== 'playing' || dyingT > 0) return; if (!P.ground && coyT <= 0) { bufT = 0.15; return; } bufT = 0; coyT = 0; tutDone(); P.g *= -1; P.ground = false; P.vy = 0; A.sfx('turn', P.g > 0 ? 0.8 : 1.6); fx.burst(P.x, P.y, '#7aa2ff', 8, 160, 0.3, 2.4); }
  function die() { if (dyingT > 0) return; dyingT = 1.1; fx.burst(P.x, P.y, '#7aa2ff', 40, 420, 0.8, 4); fx.shake(12, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(160); }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['거리', Math.floor(dist / 10) + 'm'], ['아슬아슬', String(nearN)], vsBest(score)]); return; }
    speed = Math.min(760, 340 + dist / 50); var dx = speed * dt; dist += dx; nextX -= dx;
    segs.forEach(function (s) { s.x -= dx; s.spikes.forEach(function (k) { k.x -= dx; }); }); stars.forEach(function (s) { s.x -= dx; });
    segs = segs.filter(function (s) { return s.x + s.len > -50; }); stars = stars.filter(function (s) { return s.x > -30; });
    while (nextX < W + 400) gen();
    var wasGround = P.ground;
    P.vy += 3200 * P.g * dt; P.y += P.vy * dt; P.ground = false;
    var side = P.g > 0 ? 'bot' : 'top';
    if (floorHere(side)) {
      if (P.g > 0 && P.y >= BOTY - 22) { P.y = BOTY - 22; P.vy = 0; P.ground = true; }
      if (P.g < 0 && P.y <= TOPY + 22) { P.y = TOPY + 22; P.vy = 0; P.ground = true; }
    }
    if (wasGround && !P.ground) coyT = 0.08; else if (coyT > 0) coyT -= dt;
    if (bufT > 0) { bufT -= dt; if (P.ground) flip(); }
    if (P.y > BOTY + 260 || P.y < TOPY - 320) die();
    P.rot += (P.ground ? 0 : 8) * dt;
    segs.forEach(function (s) { s.spikes.forEach(function (k) {
      var ky = k.side === 'bot' ? BOTY - 18 : TOPY + 18, vd = Math.abs(ky - P.y);
      if (Math.abs(k.x - P.x) < 26 && vd < 30) die();
      // 가시 바로 위를 공중에서 스치면 보너스
      if (!k.done && k.x < P.x - 26) { k.done = true; if (vd < 90 && !P.ground && dyingT <= 0) { nearN++; bonus += 15; fx.text(P.x, P.y + (k.side === 'bot' ? -40 : 40), '아슬아슬 +15', '#ff9ecf', 18); A.sfx('tick', 1.3); } }
    }); });
    for (var i = stars.length - 1; i >= 0; i--) if (Math.hypot(stars[i].x - P.x, stars[i].y - P.y) < 42) { var st = stars.splice(i, 1)[0]; starN++; fx.burst(st.x, st.y, '#ffd166', 12, 200, 0.4, 3); A.sfx('coin'); }
    if (P.ground && Math.random() < 0.5) fx.spark(P.x - 16, P.y + 18 * P.g, '#7aa2ff', -speed * 0.3, -P.g * 40, 0.25, 2);
    score = Math.floor(dist / 10) + starN * 20 + bonus; hud();
    if (dist / 10 >= nextMile) { S.banner(nextMile + 'm', '속도 UP'); A.sfx('level'); nextMile += 500; }
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05081c'); g.addColorStop(0.5, '#0d1440'); g.addColorStop(1, '#05081c'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    var d = dist || t * 200;
    c.strokeStyle = 'rgba(122,162,255,.12)'; for (var x = -((d * 0.3) % 60); x < W; x += 60) { c.beginPath(); c.moveTo(x, TOPY); c.lineTo(x, BOTY); c.stroke(); }
    var ss = segs || [{ x: -50, len: 700, top: true, bot: true, spikes: [] }];
    ss.forEach(function (s) {
      ['top', 'bot'].forEach(function (side) {
        if (!s[side]) return; var y = side === 'top' ? TOPY - T : BOTY;
        c.fillStyle = '#1b2a6b'; c.fillRect(s.x, y, s.len + 1, T); c.fillStyle = '#9db8ff'; c.fillRect(s.x, side === 'top' ? TOPY - 3 : BOTY, s.len + 1, 3);
      });
      s.spikes.forEach(function (k) {
        c.fillStyle = '#ff4d6d'; c.beginPath();
        if (k.side === 'bot') { c.moveTo(k.x - 18, BOTY); c.lineTo(k.x, BOTY - 36); c.lineTo(k.x + 18, BOTY); }
        else { c.moveTo(k.x - 18, TOPY); c.lineTo(k.x, TOPY + 36); c.lineTo(k.x + 18, TOPY); }
        c.fill();
      });
    });
    c.save(); c.globalCompositeOperation = 'lighter'; (stars || []).forEach(function (s) { A.draw(c, A.glowDot('#ffd166', 6), s.x, s.y, 1 + Math.sin(t * 6) * 0.1); }); c.restore();
    var px = P ? P.x : 130, py = P ? P.y : BOTY - 22 - Math.abs(Math.sin(t * 3)) * 40;
    if (!P || dyingT <= 0) { c.save(); c.translate(px, py); c.rotate(P ? P.rot : 0); c.shadowColor = '#7aa2ff'; c.shadowBlur = 18; c.fillStyle = '#e3ebff'; A.rr(c, -18, -18, 36, 36, 8); c.fill(); c.shadowBlur = 0; c.fillStyle = '#3b5bd6'; c.beginPath(); c.moveTo(-8, (P && P.g < 0) ? 6 : -6); c.lineTo(8, (P && P.g < 0) ? 6 : -6); c.lineTo(0, (P && P.g < 0) ? -8 : 8); c.fill(); c.restore(); }
    if (tut && P && S.state === 'playing' && dyingT <= 0) tutText(c, isTouch() ? '탭하면 천장으로 뒤집혀요!' : 'Space·↑↓ 로 중력 뒤집기', '앞의 가시·끊긴 길을 피하세요', (TOPY + BOTY) / 2);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + starN; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.floor(dist / 10) + 'm'; document.getElementById('hC').textContent = starN; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); flip(); } });
  // 가로 화면: 판 위 점수판이 판을 가리지 않게, 오른쪽 패널에 같은 점수판을 만들어 글자를 따라 씀
  function landStats(S) {
    var hd = document.querySelector('.g-hud'); if (!hd || !S.panelSlot || S.panelSlot.firstChild) return; hd.setAttribute('data-land-hide', '');
    var src = ['hA', 'hB', 'hC'].map(function (id) { return document.getElementById(id); }), mult = document.getElementById('hMult');
    var card = document.createElement('div'); card.className = 'g-card gp-stats';
    var outs = src.map(function (el) { var d = document.createElement('div'), sp = document.createElement('span'), b = document.createElement('b'), lb = el.parentNode.querySelector('.h-lb'); sp.textContent = lb ? lb.textContent : ''; d.appendChild(sp); d.appendChild(b); card.appendChild(d); return b; });
    var om = document.createElement('div'); om.className = 'g-card'; om.style.cssText = 'text-align:center;font-weight:800;color:var(--gold)';
    S.panelSlot.appendChild(card); S.panelSlot.appendChild(om);
    function sync() { src.forEach(function (el, i) { outs[i].textContent = el.textContent; }); om.textContent = mult ? mult.textContent : ''; om.style.display = om.textContent ? '' : 'none'; }
    var mo = new MutationObserver(sync); src.concat(mult ? [mult] : []).forEach(function (el) { mo.observe(el, { childList: true, characterData: true, subtree: true }); }); sync();
  }
  // 첫 판 안내(한 번 제대로 하면 다시 안 나옴)와 종료 화면 '최고 대비'
  var tut = A.get('neowa_gravity_tut', '') !== '1';
  function tutDone() { if (tut) { tut = false; A.set('neowa_gravity_tut', '1'); } }
  function isTouch() { return document.body.classList.contains('touch'); }
  function vsBest(sc) { var b = S.best || 0; return ['최고 대비', !b ? '첫 기록' : sc > b ? '+' + A.fmt(sc - b) + ' 신기록' : '-' + A.fmt(b - sc)]; }
  function tutText(c, a, b, y) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; var w = Math.max(a.length * 23, b ? b.length * 15 : 0) + 40;
    c.fillStyle = 'rgba(0,0,0,.55)'; A.rr(c, W / 2 - w / 2, y - 30, w, b ? 82 : 60, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,' + (0.8 + Math.sin(S.time * 5) * 0.2) + ')'; c.font = '800 24px "Pretendard Variable",system-ui'; c.fillText(a, W / 2, y);
    if (b) { c.font = '600 16px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(b, W / 2, y + 30); }
    c.restore();
  }
  var S = new A.Shell({ id: 'gravity', W: W, H: H, land: [960, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if ((k === ' ' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'w' || k === 's') && !e.repeat) flip(); } });
})();
