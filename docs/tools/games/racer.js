(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, PY = 760, RW = 250;
  var fx = new A.FX();
  // 3D 그래픽(assets/arcade/3d/racer.js). 못 쓰는 기기에서는 아래 2D 그림 그대로
  var G3 = { draw: function () { return false; } };
  A.load3D = A.load3D || function (id, get, done) { var s = document.createElement('script'); s.src = '../assets/arcade/g3d.js?v=1'; s.onload = function () { done(A.G3D.boot(id, get)); }; document.head.appendChild(s); };
  A.load3D('racer', function () { return { car: car, obs: obs, cans: cans, boosts: boosts, dist: dist, boostT: boostT, cx: cx }; }, function (h) { G3 = h; });
  // 첫 판 안내: 처음 한 번만 판 위에 띄우고, 올바른 행동을 하면 사라짐 (저장 키 neowa_racer_tut)
  var tutOn = A.get('neowa_racer_tut', '') !== '1';
  function tutDone() { if (tutOn) { tutOn = false; A.set('neowa_racer_tut', '1'); } }
  function tutDraw(c, y, touchTxt, keyTxt, tx, ty) {
    if (!tutOn || S.state !== 'playing') return;
    var txt = document.body.classList.contains('touch') ? touchTxt : keyTxt, fs = 22, b = Math.abs(Math.sin(S.time * 4)) * 12;
    c.save(); c.font = '700 ' + fs + 'px "Pretendard Variable",system-ui';
    var w = c.measureText(txt).width + 48; if (w > W - 24) { fs = Math.floor(fs * (W - 72) / (w - 48)); c.font = '700 ' + fs + 'px "Pretendard Variable",system-ui'; w = W - 24; }
    c.fillStyle = 'rgba(0,0,0,.66)'; A.rr(c, W / 2 - w / 2, y - 25, w, 50, 25); c.fill(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, W / 2, y + 1);
    if (tx != null) { // 가리키는 곳을 향해 통통 튀는 화살표
      var a = Math.atan2(ty - y, tx - W / 2), d = Math.hypot(tx - W / 2, ty - y), r = Math.max(0, d - 40 - b), ax = W / 2 + Math.cos(a) * r, ay = y + Math.sin(a) * r;
      c.translate(ax, ay); c.rotate(a); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -13); c.lineTo(-4, 0); c.lineTo(-10, 13); c.closePath(); c.fill();
    }
    c.restore();
  }
  // 종료 화면용: 개인 최고 기록과 비교
  function vsBest(sc) { sc = Math.floor(sc); return !S.best ? '첫 기록' : sc > S.best ? '+' + A.fmt(sc - S.best) + ' 신기록' : sc === S.best ? '타이' : '-' + A.fmt(S.best - sc); }
  var car, road, obs, cans, boosts, dist, speed, fuel, score, boostT, dyingT, keys = {}, drag = null, phase, curv;
  // 도로 중심선: 거리(px) → x 좌표 (부드러운 곡선)
  function cx(d) { return W / 2 + Math.sin(d * 0.0021) * 110 + Math.sin(d * 0.0007 + 1) * 70 + Math.sin(d * 0.0047) * 30 * Math.min(1, d / 20000); }
  function reset() { car = { x: cx(H - PY), vx: 0 }; mile = 1; nearN = 0; lowF = 99; nearTot = 0; tutT = 0; carWarn = false; obs = []; cans = []; boosts = []; dist = 0; speed = 420; fuel = 100; score = 0; boostT = 0; dyingT = 0; keys = {}; drag = null; nextObj = 600; fx.clear(); hud(); }
  var nextObj = 600, mile = 1, nearN = 0, lowF = 99, nearTot = 0, tutT = 0, carWarn = false;
  function spawn() {
    // 간격은 '시간' 기준(현재 속도 × 초) → 빨라져도 피할 시간이 남음
    var lv = Math.min(1, dist / 100000), d = dist + H + 100, off = A.rand(-RW / 2 + 30, RW / 2 - 30), r = Math.random(), pObs = 0.56 + lv * 0.1, pCan = pObs + 0.28 - lv * 0.12;
    if (r < pObs) obs.push({ d: d, off: off, hit: false, car: dist > 32000 && Math.random() < 0.35 }); /* 32km부터 역주행 차 */
    else if (r < pCan) cans.push({ d: d, off: off });
    else boosts.push({ d: d, off: off });
    nextObj = dist + Math.max(170, speed * A.rand(0.45, 0.8) * (1 - lv * 0.3));
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(Math.floor(score), [['거리', (dist / 1000).toFixed(1) + 'km'], ['아슬아슬', nearTot + '번'], ['최고 대비', vsBest(score)]]); return; }
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    if (tutOn && (kx || (drag && Math.abs(drag.tx - car.x) > 15))) { tutT += dt; if (tutT > 0.7) tutDone(); }
    obs.forEach(function (o) { if (o.car && !o.hit) o.d -= 200 * dt; });
    if (dist > 31500 && !carWarn) { carWarn = true; S.banner('역주행 차 주의!', '빨간 차가 마주 달려와요'); }
    if (drag) car.x = A.lerp(car.x, drag.tx, Math.min(1, dt * 10));
    else car.x += kx * 420 * dt;
    car.x = A.clamp(car.x, 30, W - 30);
    var c0 = cx(dist + (H - PY)), off = Math.abs(car.x - c0), onRoad = off < RW / 2 - 14;
    var target = (boostT > 0 ? 1.6 : 1) * Math.min(1050, 420 + dist / 90) * (onRoad ? 1 : 0.5);
    speed = A.lerp(speed, target, Math.min(1, dt * 2)); maxSp = Math.max(maxSp, speed);
    dist += speed * dt; if (boostT > 0) boostT -= dt;
    fuel -= dt * (onRoad ? 3.2 : 9) * (1 + dist / 60000);
    if (!onRoad && Math.random() < 0.6) fx.spark(car.x + A.rand(-16, 16), PY + 40, '#8a6a3a', A.rand(-60, 60), 120, 0.4, 3);
    if (dist > nextObj) spawn();
    function sy(d) { return PY - (d - dist - (H - PY)) ; }
    obs.forEach(function (o) { var y = sy(o.d), x = cx(o.d) + o.off;
      if (!o.hit && !o.near && y > PY + 50) { o.near = true; if (Math.abs(x - car.x) < 80) { nearN++; nearTot++; var nb = 30 + Math.min(5, nearN) * 10; score += nb; fx.text(car.x, PY - 60, '아슬아슬 +' + nb, '#ffe066', 18); A.sfx('coin', 1.3); } }
      if (!o.hit && Math.abs(y - PY) < 50 && Math.abs(x - car.x) < 44) { nearN = 0; o.hit = true; fuel -= 15; speed *= 0.45; fx.burst(x, y, '#ff4d6d', 24, 300, 0.5, 3.5); fx.shake(9, 0.3); A.sfx('hurt'); A.vibrate(120); fx.text(car.x, PY - 70, '연료 -15', '#ff4d6d', 20); } });
    cans = cans.filter(function (o) { var y = sy(o.d), x = cx(o.d) + o.off; if (Math.abs(y - PY) < 50 && Math.abs(x - car.x) < 44) { fuel = Math.min(100, fuel + 22); score += 100; fx.burst(x, y, '#7dff9b', 14, 220, 0.4, 3); fx.text(x, y - 40, '연료 +22', '#7dff9b', 18); A.sfx('power'); return false; } return y < H + 60; });
    boosts = boosts.filter(function (o) { var y = sy(o.d), x = cx(o.d) + o.off; if (Math.abs(y - PY) < 50 && Math.abs(x - car.x) < 44) { boostT = 2.5; score += 50; fx.ring(car.x, PY, '#ffe066', 120, 0.5); A.sfx('charge', 1.2); A.sfx('whoosh'); return false; } return y < H + 60; });
    obs = obs.filter(function (o) { return sy(o.d) < H + 60; });
    score += speed * dt / 30;
    if (dist >= mile * 10000) { S.banner(mile * 10 + ' KM', '보너스 +' + mile * 100); score += mile * 100; A.sfx('level'); mile++; }
    if (fuel < 25 && Math.floor(fuel / 5) !== lowF) { lowF = Math.floor(fuel / 5); if (fuel > 0) { A.sfx('warn'); fx.text(car.x, PY - 90, '연료 부족!', '#ff4d6d', 18); } }
    var lowNow = fuel < 25; if (lowNow !== lowMood) { lowMood = lowNow; A.music.mood(lowMood ? 'danger' : null); }
    if (fuel <= 0) { fuel = 0; dyingT = 1.2; A.music.mood(null); lowMood = false; A.sfx('drop'); fx.text(car.x, PY - 80, '연료 바닥', '#ff4d6d', 26); }
    hud();
  }
  var maxSp = 0, lowMood = false; // lowMood: 연료 부족 때 배경음악 위기 분위기 (lowF는 경고 글자용)
  function tutLayer(c) {
    if (car && tutOn) tutDraw(c, 200, '좌우로 끌어 운전 · F 연료통을 먹어요', '←→ 로 운전 · F 연료통을 먹어요');
  }
  function render(c) {
    if (G3.draw(c, fx)) { tutLayer(c); return; } // 3D 화면에서도 첫 판 안내는 위에 겹쳐 그림
    var o = fx.offset(), t = S.time, d0 = dist || t * 300;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0f1a0c'; c.fillRect(-10, -10, W + 20, H + 20);
    // 도로를 가로 띠로 그림
    for (var y = -10; y < H + 10; y += 10) {
      var d = d0 + (PY - y) + (H - PY), x = cx(d), stripe = Math.floor(d / 60) % 2;
      c.fillStyle = stripe ? '#1a2a14' : '#152211'; c.fillRect(0, y, W, 10);
      c.fillStyle = stripe ? '#ff4d6d' : '#f4f5fb'; c.fillRect(x - RW / 2 - 12, y, 12, 10); c.fillRect(x + RW / 2, y, 12, 10);
      c.fillStyle = '#2a2a33'; c.fillRect(x - RW / 2, y, RW, 10);
      if (stripe) { c.fillStyle = 'rgba(255,224,102,.7)'; c.fillRect(x - 3, y, 6, 10); }
    }
    function sy(dd) { return PY - (dd - d0 - (H - PY)); }
    (obs || []).forEach(function (ob) { var yy = sy(ob.d), xx = cx(ob.d) + ob.off;
      if (ob.car) { c.fillStyle = ob.hit ? '#555' : '#ff4d6d'; A.rr(c, xx - 20, yy - 36, 40, 72, 10); c.fill(); c.fillStyle = '#2a0610'; A.rr(c, xx - 14, yy + 6, 28, 16, 4); c.fill(); c.fillStyle = '#fff6b0'; c.fillRect(xx - 16, yy + 30, 8, 5); c.fillRect(xx + 8, yy + 30, 8, 5); return; }
      c.fillStyle = ob.hit ? '#555' : '#ff7a45'; c.beginPath(); c.moveTo(xx, yy - 26); c.lineTo(xx + 20, yy + 18); c.lineTo(xx - 20, yy + 18); c.fill(); c.fillStyle = '#fff'; c.fillRect(xx - 12, yy, 24, 5); });
    c.save(); c.globalCompositeOperation = 'lighter';
    (cans || []).forEach(function (cn) { A.draw(c, A.glowDot('#7dff9b', 6), cx(cn.d) + cn.off, sy(cn.d), 1.1); });
    (boosts || []).forEach(function (b) { A.draw(c, A.glowDot('#ffe066', 7), cx(b.d) + b.off, sy(b.d), 1.2); });
    c.restore();
    (cans || []).forEach(function (cn) { c.fillStyle = '#04170a'; c.font = '700 14px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('F', cx(cn.d) + cn.off, sy(cn.d)); });
    var carX = car ? car.x : cx(d0 + (H - PY));
    if (!car || dyingT <= 0 || true) {
      c.save(); c.translate(carX, PY); c.shadowColor = boostT > 0 ? '#ffe066' : '#ff7a45'; c.shadowBlur = 18; c.fillStyle = '#ffe066'; A.rr(c, -22, -40, 44, 80, 12); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#221a00'; A.rr(c, -16, -24, 32, 20, 5); c.fill(); c.fillStyle = '#ff4d6d'; c.fillRect(-18, 36, 10, 4); c.fillRect(8, 36, 10, 4); c.restore();
      if (boostT > 0) fx.spark(carX + A.rand(-10, 10), PY + 44, A.pick(['#ffe066', '#ff7a45']), 0, 300, 0.25, 3);
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
    tutLayer(c);
  }
  var last = '';
  function hud() { var k = Math.floor(score) + '|' + Math.ceil(fuel) + '|' + Math.floor(dist / 100); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(Math.floor(score)); var f = document.getElementById('hB'); f.textContent = Math.ceil(fuel); f.style.color = fuel < 25 ? '#ff4d6d' : ''; document.getElementById('hC').textContent = (dist / 1000).toFixed(1); }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); drag = { id: e.pointerId, sx: p.x, cx: car.x, tx: car.x, m: e.pointerType === 'mouse' }; if (drag.m) drag.tx = p.x; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); if (e.pointerType === 'mouse') { if (!drag) drag = { m: true }; drag.tx = p.x; return; } if (drag && drag.id === e.pointerId) drag.tx = drag.cx + (p.x - drag.sx) * 1.4; });
  stage.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') drag = null; });
  stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') drag = null; });
  var S = new A.Shell({ id: 'racer', W: W, H: H, reset: function () { maxSp = 0; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { drag = null; keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
