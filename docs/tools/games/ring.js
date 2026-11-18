(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CX = W / 2, CY = 500, R = 190;
  var fx = new A.FX();
  var ang, dir, spd, zone, zoneW, hits, score, dyingT, passed, perfect, pulse, chain, bestChain;
  function newZone() {
    // 구간 폭: 점점 좁아지지만, 바늘이 구간을 지나는 시간이 0.1초 밑으로는 안 내려가게 (사람이 반응할 수 있는 한계)
    zoneW = Math.max(spd * 0.1, 0.75 - hits * 0.022);
    var away = A.rand(1.2, Math.PI * 2 - 1.2); zone = (ang + dir * away + Math.PI * 4) % (Math.PI * 2);
    passed = false;
  }
  function reset() { ang = -Math.PI / 2; dir = 1; spd = 2.2; hits = 0; score = 0; dyingT = 0; perfect = 0; pulse = 0; chain = 0; bestChain = 0; newZone(); fx.clear(); hud(); }
  function diff(a, b) { var d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  function tap() {
    if (S.state !== 'playing' || dyingT > 0) return;
    var d = Math.abs(diff(ang, zone));
    if (d <= zoneW / 2) {
      hits++; var acc = 1 - d / (zoneW / 2), pts = 10 + Math.round(acc * 20);
      if (acc > 0.8) {
        // 연속 퍼펙트: 2연속부터 +10씩 (최대 +50)
        chain++; bestChain = Math.max(bestChain, chain); pts += 20 + Math.min(50, (chain - 1) * 10); perfect++;
        fx.text(CX, CY - 40, (chain > 1 ? 'PERFECT ×' + chain + ' +' : 'PERFECT +') + pts, '#ffd166', 26); A.sfx('gold', 1 + Math.min(chain, 6) * 0.05);
      } else { chain = 0; fx.text(CX, CY - 40, '+' + pts, '#fff', 22); A.sfx('right', 1 + Math.min(hits, 20) * 0.03); }
      score += pts; dir *= -1; spd = Math.min(5.4, 2.2 + hits * 0.1);
      var nx = CX + Math.cos(ang) * R, ny = CY + Math.sin(ang) * R;
      fx.burst(nx, ny, '#ff9ecf', 18, 260, 0.5, 3); fx.ring(CX, CY, '#ff9ecf', R * 1.3, 0.4); fx.shake(3, 0.1); A.vibrate(15); pulse = 1;
      if (hits % 10 === 0) { S.banner(hits + ' HIT', '더 빠르게'); A.sfx('level'); }
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
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['명중', String(hits)], ['퍼펙트', String(perfect)], ['최다 연속 퍼펙트', String(bestChain)]]); return; }
    // 진행 방향 기준 거리: 음수 = 구간에 다가가는 중, 양수 = 지나감
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
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = hits; document.getElementById('hC').textContent = spd.toFixed(1); var m = document.getElementById('hMult'); if (m) m.textContent = chain > 1 ? 'PERFECT ×' + chain : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); tap(); } });
  var S = new A.Shell({ id: 'ring', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) tap(); } });
})();
