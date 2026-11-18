(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, BX = 70, BY = 720, G = 520;
  var fx = new A.FX();
  var arrows, score, streak, wind, target, arrow, aim, pulling, dyingT, results, nextT, extra, keysAim = { a: -0.5, p: 0.6 };
  function groundY(x) { return 760 + Math.sin(x * 0.02) * 14; }
  function newTarget() {
    var lv = Math.min(12, results.length);   // 쏜 화살 수만큼 어려워짐 (보너스 화살로 늘어나도 상한 있음)
    target = { x: A.rand(330, 490), y: A.rand(260, 640), r: 54 - lv * 1.2, vy: lv >= 4 ? A.rand(40, 90) * (Math.random() < 0.5 ? -1 : 1) : 0, base: 0 };
    target.base = target.y;
    wind = Math.round(A.rand(-1, 1) * (2 + lv * 0.6) * 10) / 10;
  }
  function reset() { arrows = 10; score = 0; streak = 0; arrow = null; pulling = null; dyingT = 0; results = []; aim = null; nextT = 0; extra = 0; newTarget(); fx.clear(); hud(); }
  function shoot(angle, power) {
    if (S.state !== 'playing' || arrow || arrows <= 0 || dyingT > 0) return;
    var v = 520 + power * 900;
    arrow = { x: BX + 30, y: BY - 40, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, t: 0, stuck: false };
    arrows--; A.sfx('shoot', 0.5); hud();
  }
  function settle(pts, x, y) {
    if (pts > 0) {
      streak++; var bonus = streak >= 3 ? (streak - 2) * 2 : 0; score += pts + bonus;
      fx.text(x, y - 40, (pts === 10 ? '정중앙! ' : '') + '+' + (pts + bonus), pts >= 9 ? '#ffd166' : '#fff', pts === 10 ? 28 : 22);
      fx.burst(x, y, pts >= 9 ? '#ffd166' : '#ff9ecf', 20, 260, 0.5, 3); A.sfx(pts >= 9 ? 'gold' : 'coin'); if (pts === 10) fx.shake(5, 0.2);
      // 정중앙이면 화살 1발 보너스
      if (pts === 10) { arrows++; extra++; fx.text(x, y - 76, '보너스 화살 +1', '#7dff9b', 18); A.sfx('power'); }
    } else { streak = 0; fx.text(x, y - 30, '빗나감', '#ff4d6d', 20); A.sfx('wall'); }
    results.push(pts);
    nextT = 0.7;   // 0.7초 뒤 다음 과녁 (게임 시간 기준이라 일시정지·다시 하기에도 안전)
    hud();
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) { var tens = results.filter(function (r) { return r === 10; }).length; S.gameOver(score, [['정중앙', tens + '발'], ['명중', results.filter(function (r) { return r > 0; }).length + '/' + results.length], ['보너스 화살', extra + '발']], { kick: 'FINISH', win: true }); } return; }
    if (nextT > 0) { nextT -= dt; if (nextT <= 0) { arrow = null; if (arrows <= 0) dyingT = 0.6; else newTarget(); hud(); } }
    if (target.vy) { target.y += target.vy * dt; if (Math.abs(target.y - target.base) > 120 || target.y < 200 || target.y > 680) target.vy *= -1; }
    if (keyMode.up) keysAim.a = Math.max(-1.3, keysAim.a - dt * 1.2); if (keyMode.down) keysAim.a = Math.min(0.2, keysAim.a + dt * 1.2);
    if (keyMode.left) keysAim.p = Math.max(0.05, keysAim.p - dt * 0.8); if (keyMode.right) keysAim.p = Math.min(1, keysAim.p + dt * 0.8);
    if (arrow && !arrow.stuck) {
      var steps = 4;
      for (var s = 0; s < steps; s++) {
        var h = dt / steps; arrow.vy += G * h; arrow.vx += wind * 22 * h; arrow.x += arrow.vx * h; arrow.y += arrow.vy * h;
        if (Math.abs(arrow.x - target.x) < 14 && Math.abs(arrow.y - target.y) < target.r) {
          arrow.stuck = true; arrow.dy = arrow.y - target.y;
          var d = Math.abs(arrow.y - target.y) / target.r, pts = Math.max(1, 10 - Math.floor(d * 10));
          settle(pts, target.x, arrow.y); break;
        }
        if (arrow.vy > 0 && arrow.y > groundY(arrow.x) + 6 && arrow.x < W + 20) { arrow.stuck = true; arrow.y = groundY(arrow.x) + 6; fx.burst(arrow.x, arrow.y, '#8a6a5a', 8, 120, 0.3, 2); settle(0, A.clamp(arrow.x, 60, W - 60), A.clamp(arrow.y, 160, 800)); break; }
        if (arrow.x > W + 40 || arrow.y > H + 40 || arrow.y < -400) { arrow.stuck = true; arrow.gone = true; settle(0, A.clamp(arrow.x, 60, W - 60), A.clamp(arrow.y, 160, 800)); break; }
      }
      if (!arrow.stuck) fx.spark(arrow.x, arrow.y, '#ffd166', 0, 0, 0.25, 1.6);
    }
    if (arrow && arrow.stuck && !arrow.gone && arrow.dy != null) arrow.y = target.y + arrow.dy;
  }
  var keyMode = {};
  function curAim() {
    if (pulling) { var dx = pulling.sx - pulling.x, dy = pulling.sy - pulling.y, len = Math.min(240, Math.hypot(dx, dy)); return { a: Math.atan2(dy, Math.max(1, dx)), p: len / 240 }; }
    if (aim) return aim;
    return keysAim;
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1440'); g.addColorStop(0.65, '#4a2a5a'); g.addColorStop(1, '#2a1a1a'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = '#1a1225'; c.beginPath(); c.moveTo(0, 780); for (var x = 0; x <= W; x += 30) c.lineTo(x, 760 + Math.sin(x * 0.02) * 14); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    // 바람 깃발
    var wv = wind || 0; c.save(); c.translate(W / 2, 150);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '700 15px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('바람 ' + (wv > 0 ? '→ ' : wv < 0 ? '← ' : '') + Math.abs(wv).toFixed(1), 0, -6);
    c.strokeStyle = '#7aa2ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(-Math.max(10, Math.abs(wv) * 14) * Math.sign(wv || 1), 14); c.lineTo(Math.max(10, Math.abs(wv) * 14) * Math.sign(wv || 1), 14); c.stroke(); c.restore();
    // 과녁
    var tg = target || { x: 420, y: 450, r: 54 };
    var cols = ['#ffffff', '#1a1a1a', '#5ee7ff', '#ff4d6d', '#ffd166'];
    for (var i = 0; i < 5; i++) { c.fillStyle = cols[i]; c.beginPath(); c.ellipse(tg.x, tg.y, 14 - i * 1.5, tg.r * (1 - i * 0.2), 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#5b3a2a'; c.fillRect(tg.x + 8, tg.y + tg.r - 4, 6, 780 - tg.y - tg.r + 4);
    // 궁수
    c.fillStyle = '#ffd166'; c.beginPath(); c.arc(BX, BY - 90, 16, 0, 7); c.fill(); c.fillRect(BX - 6, BY - 74, 12, 60);
    var am = curAim();
    c.save(); c.translate(BX + 10, BY - 50); c.rotate(am.a);
    c.strokeStyle = '#ffb547'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 48, -1.2, 1.2); c.stroke();
    var pull = (pulling || S.state !== 'playing' ? am.p : 0) * 30;
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(Math.cos(-1.2) * 48, Math.sin(-1.2) * 48); c.lineTo(-pull, 0); c.lineTo(Math.cos(1.2) * 48, Math.sin(1.2) * 48); c.stroke();
    if (!arrow) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-pull, 0); c.lineTo(60 - pull, 0); c.stroke(); }
    c.restore();
    // 예상 궤적 (처음 일부만)
    if (S.state === 'playing' && !arrow && (pulling || keyMode.any)) {
      var v = 520 + am.p * 900, ax = BX + 30, ay = BY - 40, vx = Math.cos(am.a) * v, vy = Math.sin(am.a) * v;
      c.fillStyle = 'rgba(255,255,255,.5)';
      for (var k = 0; k < 9; k++) { for (var q = 0; q < 4; q++) { vy += G * 0.01; vx += wv * 22 * 0.01; ax += vx * 0.01; ay += vy * 0.01; } c.beginPath(); c.arc(ax, ay, 3, 0, 7); c.fill(); }
    }
    // 첫 화살 안내
    if (S.state === 'playing' && results && !results.length && !arrow && !pulling && !keyMode.any) {
      var tch = document.body.classList.contains('touch');
      c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,' + (0.7 + Math.sin(t * 5) * 0.25) + ')'; c.font = '700 22px "Pretendard Variable",system-ui';
      c.fillText(tch ? '화면을 왼쪽 아래로 끌었다가 놓기' : '마우스로 왼쪽 아래로 끌었다 놓기', W / 2, 860);
      c.font = '600 16px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.55)';
      c.fillText(tch ? '많이 끌수록 세게 날아가요' : '또는 ↑↓ 각도 · ←→ 힘 · Space 발사', W / 2, 892);
    }
    if (arrow && !arrow.gone) { var an = arrow.stuck ? (arrow.dy == null ? Math.atan2(arrow.vy, arrow.vx) : 0) : Math.atan2(arrow.vy, arrow.vx); c.save(); c.translate(arrow.x, arrow.y); c.rotate(an); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-50, 0); c.lineTo(0, 0); c.stroke(); c.fillStyle = '#ff4d6d'; c.fillRect(-52, -4, 10, 8); c.restore(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = arrows; document.getElementById('hC').textContent = (wind > 0 ? '→' : wind < 0 ? '←' : '') + Math.abs(wind || 0).toFixed(1); document.getElementById('hMult').textContent = streak >= 3 ? streak + '연속 명중' : ''; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing' || arrow) return; var p = S.toLocal(e); pulling = { sx: p.x, sy: p.y, x: p.x, y: p.y, id: e.pointerId }; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (!pulling || pulling.id !== e.pointerId) return; var p = S.toLocal(e); pulling.x = p.x; pulling.y = p.y; });
  stage.addEventListener('pointerup', function (e) {
    if (!pulling || pulling.id !== e.pointerId) return; var a = curAim(); pulling = null; if (S.state !== 'playing') return;
    if (a.p > 0.08) { aim = { a: a.a, p: a.p }; shoot(a.a, a.p); setTimeout(function () { aim = null; }, 50); } });
  stage.addEventListener('pointercancel', function () { pulling = null; });
  window.addEventListener('blur', function () { keyMode.up = keyMode.down = keyMode.left = keyMode.right = false; });
  var S = new A.Shell({ id: 'archery', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; keyMode.any = true;
      if (k === 'ArrowUp' || k === 'w') keyMode.up = true; if (k === 'ArrowDown' || k === 's') keyMode.down = true;
      if (k === 'ArrowLeft' || k === 'a') keyMode.left = true; if (k === 'ArrowRight' || k === 'd') keyMode.right = true;
      if ((k === ' ' || k === 'Enter') && !e.repeat) shoot(keysAim.a, keysAim.p); },
    keyup: function (e) { var k = e.key; if (k === 'ArrowUp' || k === 'w') keyMode.up = false; if (k === 'ArrowDown' || k === 's') keyMode.down = false; if (k === 'ArrowLeft' || k === 'a') keyMode.left = false; if (k === 'ArrowRight' || k === 'd') keyMode.right = false; } });
})();
