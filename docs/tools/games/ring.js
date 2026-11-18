(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CX = W / 2, CY = 500, R = 190, TY = 810, zdrift = 0;
  // 가로 화면은 정사각형 판(720x720)에 링을 크게
  function geo(sh) { landStats(sh); W = sh.W; H = sh.H; if (sh.land) { CX = W / 2; CY = H / 2; R = 250; TY = 44; } else { CX = W / 2; CY = 500; R = 190; TY = 810; } }
  var fx = new A.FX();
  var ang, dir, spd, zone, zoneW, hits, score, dyingT, passed, perfect, pulse, chain, bestChain;
  function newZone() {
    // 구간 폭: 점점 좁아지지만, 바늘이 구간을 지나는 시간이 0.1초 밑으로는 안 내려가게 (사람이 반응할 수 있는 한계)
    zoneW = Math.max(spd * 0.1, 0.75 - hits * 0.022);
    var away = A.rand(1.2, Math.PI * 2 - 1.2); zone = (ang + dir * away + Math.PI * 4) % (Math.PI * 2);
    passed = false;
    // 30히트부터 구간이 천천히 움직임 (방향은 무작위)
    zdrift = hits >= 30 ? (Math.random() < 0.5 ? -1 : 1) * Math.min(0.6, 0.25 + (hits - 30) * 0.01) : 0;
  }
  function reset() { ang = -Math.PI / 2; dir = 1; spd = 2.2; hits = 0; score = 0; dyingT = 0; perfect = 0; pulse = 0; chain = 0; bestChain = 0; newZone(); fx.clear(); hud(); }
  function diff(a, b) { var d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  function tap() {
    if (S.state !== 'playing' || dyingT > 0) return;
    var d = Math.abs(diff(ang, zone));
    if (d <= zoneW / 2) {
      hits++; tutDone(); var acc = 1 - d / (zoneW / 2), pts = 10 + Math.round(acc * 20);
      if (acc > 0.8) {
        // 연속 퍼펙트: 2연속부터 +10씩 (최대 +50)
        chain++; bestChain = Math.max(bestChain, chain); pts += 20 + Math.min(50, (chain - 1) * 10); perfect++;
        fx.text(CX, CY - 40, (chain > 1 ? 'PERFECT ×' + chain + ' +' : 'PERFECT +') + pts, '#ffd166', 26); A.sfx('gold', 1 + Math.min(chain, 6) * 0.05);
      } else { chain = 0; fx.text(CX, CY - 40, '+' + pts, '#fff', 22); A.sfx('coin', 1 + Math.min(hits, 20) * 0.03); }
      score += pts; dir *= -1; spd = Math.min(5.4, 2.2 + hits * 0.1);
      var nx = CX + Math.cos(ang) * R, ny = CY + Math.sin(ang) * R;
      fx.burst(nx, ny, '#ff9ecf', 18, 260, 0.5, 3); fx.ring(CX, CY, '#ff9ecf', R * 1.3, 0.4); fx.shake(3, 0.1); A.vibrate(15); pulse = 1;
      if (hits % 10 === 0) { S.banner(hits + ' HIT', hits === 30 ? '이제 구간이 움직여요!' : '더 빠르게'); A.sfx('level'); }
      newZone();
    } else lose();
    hud();
  }
  function lose() {
    dyingT = 1; fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(150);
    fx.burst(CX + Math.cos(ang) * R, CY + Math.sin(ang) * R, '#ff4d6d', 30, 320, 0.7, 4);
  }
  function update(dt) {
    fx.update(dt); if (pulse > 0) pulse -= dt * 3;
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['명중', String(hits)], ['최다 연속 퍼펙트', String(bestChain)], vsBest(score)]); return; }
    // 진행 방향 기준 거리: 음수 = 구간에 다가가는 중, 양수 = 지나감
    if (zdrift) zone = (zone + zdrift * dt + Math.PI * 4) % (Math.PI * 2);
    var before = diff(ang, zone) * dir; ang = (ang + dir * spd * dt + Math.PI * 4) % (Math.PI * 2); var after = diff(ang, zone) * dir;
    // 구간을 그냥 지나쳤는지 (한 프레임에 구간을 통째로 건너뛰어도 잡아냄)
    if (!passed && before <= zoneW / 2 && before > -Math.PI / 2 && after > zoneW / 2) { passed = true; lose(); }
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createRadialGradient(CX, CY, 0, CX, CY, 700); g.addColorStop(0, '#2a0c22'); g.addColorStop(1, '#07030a'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    var a0 = ang == null ? t * 2 : ang, z = zone == null ? 0.5 : zone, zw = zoneW || 0.7;
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 34; c.beginPath(); c.arc(CX, CY, R, 0, Math.PI * 2); c.stroke();
    c.save(); c.shadowColor = '#ff9ecf'; c.shadowBlur = 24; c.strokeStyle = '#ff9ecf'; c.lineWidth = 34;
    c.beginPath(); c.arc(CX, CY, R, z - zw / 2, z + zw / 2); c.stroke();
    c.strokeStyle = '#ffd166'; c.lineWidth = 34; c.beginPath(); c.arc(CX, CY, R, z - zw * 0.1, z + zw * 0.1); c.stroke(); c.restore();
    // 바늘
    var nx = CX + Math.cos(a0) * (R + 30), ny = CY + Math.sin(a0) * (R + 30);
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.moveTo(CX + Math.cos(a0) * (R - 40), CY + Math.sin(a0) * (R - 40)); c.lineTo(nx, ny); c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffffff', 6), nx, ny, 1.2); c.restore();
    // 가운데 숫자
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 ' + (96 + (pulse > 0 ? pulse * 20 : 0)) + 'px "Chakra Petch",system-ui'; c.fillText(String(hits || 0), CX, CY);
    c.font = '600 16px "Chakra Petch",system-ui'; c.fillStyle = 'rgba(255,255,255,.5)'; c.fillText('HITS', CX, CY + 64);
    if (tut && hits === 0 && S.state === 'playing' && dyingT <= 0) tutText(c, isTouch() ? '바늘이 분홍 구간에 오면 탭!' : '바늘이 분홍 구간에 오면 Space!', '노란 정중앙이면 보너스', TY);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = hits; document.getElementById('hC').textContent = spd.toFixed(1); var m = document.getElementById('hMult'); if (m) m.textContent = chain > 1 ? 'PERFECT ×' + chain : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); tap(); } });
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
  var tut = A.get('neowa_ring_tut', '') !== '1';
  function tutDone() { if (tut) { tut = false; A.set('neowa_ring_tut', '1'); } }
  function isTouch() { return document.body.classList.contains('touch'); }
  function vsBest(sc) { var b = S.best || 0; return ['최고 대비', !b ? '첫 기록' : sc > b ? '+' + A.fmt(sc - b) + ' 신기록' : '-' + A.fmt(b - sc)]; }
  function tutText(c, a, b, y) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; var w = Math.max(a.length * 23, b ? b.length * 15 : 0) + 40;
    c.fillStyle = 'rgba(0,0,0,.55)'; A.rr(c, W / 2 - w / 2, y - 30, w, b ? 82 : 60, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,' + (0.8 + Math.sin(S.time * 5) * 0.2) + ')'; c.font = '800 24px "Pretendard Variable",system-ui'; c.fillText(a, W / 2, y);
    if (b) { c.font = '600 16px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(b, W / 2, y + 30); }
    c.restore();
  }
  var S = new A.Shell({ id: 'ring', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) tap(); } });
})();
