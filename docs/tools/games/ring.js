(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CX = W / 2, CY = 500, R = 190;
  var fx = new A.FX();
  var ang, dir, spd, zone, zoneW, hits, score, dyingT, passed, perfect, pulse;
  function newZone() {
    zoneW = Math.max(0.2, 0.75 - hits * 0.025);
    var away = A.rand(1.2, Math.PI * 2 - 1.2); zone = (ang + dir * away + Math.PI * 4) % (Math.PI * 2);
    passed = false;
  }
  function reset() { ang = -Math.PI / 2; dir = 1; spd = 2.2; hits = 0; score = 0; dyingT = 0; perfect = 0; pulse = 0; newZone(); fx.clear(); hud(); }
  function diff(a, b) { var d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  function tap() {
    if (S.state !== 'playing' || dyingT > 0) return;
    var d = Math.abs(diff(ang, zone));
    if (d <= zoneW / 2) {
      hits++; var acc = 1 - d / (zoneW / 2), pts = 10 + Math.round(acc * 20);
      if (acc > 0.8) { pts += 20; perfect++; fx.text(CX, CY - 40, 'PERFECT +' + pts, '#ffd166', 26); A.sfx('gold'); }
      else { fx.text(CX, CY - 40, '+' + pts, '#fff', 22); A.sfx('coin', 1 + Math.min(hits, 20) * 0.03); }
      score += pts; dir *= -1; spd = Math.min(6.5, 2.2 + hits * 0.12);
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
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['명중', String(hits)], ['퍼펙트', String(perfect)], ['최고 속도', spd.toFixed(1)]]); return; }
    var before = diff(ang, zone); ang = (ang + dir * spd * dt + Math.PI * 4) % (Math.PI * 2); var after = diff(ang, zone);
    // 구간을 그냥 지나쳤는지
    if (Math.abs(before) <= zoneW / 2 && Math.abs(after) > zoneW / 2 && !passed) { passed = true; lose(); }
  }
  /* 그림: 별빛 배경, 금속 다이얼(눈금), 빛나는 목표 구간(번짐은 미리 그린 점으로), 바늘 */
  var BG = A.sprite('rgbg', W, H, function (x) {
    var g = x.createRadialGradient(CX, CY, 0, CX, CY, 700); g.addColorStop(0, '#3a1030'); g.addColorStop(0.5, '#160818'); g.addColorStop(1, '#05020a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 120; i++) { x.globalAlpha = Math.random() * 0.7; x.fillStyle = Math.random() < 0.3 ? '#ffc8e8' : '#fff'; x.fillRect(Math.random() * W, Math.random() * H, 1.3, 1.3); }
    x.globalAlpha = 1;
    for (i = 0; i < 4; i++) { x.strokeStyle = 'rgba(255,158,207,' + (0.08 - i * 0.015) + ')'; x.lineWidth = 1; x.beginPath(); x.arc(CX, CY, R + 70 + i * 50, 0, 7); x.stroke(); }
  });
  var DIAL = A.sprite('rgdial', R * 2 + 90, R * 2 + 90, function (x) {
    var m = R + 45; x.translate(m, m);
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(4, 8, R + 26, 0, 7); x.fill();
    var g = x.createLinearGradient(-R, -R, R, R); g.addColorStop(0, '#6a5a78'); g.addColorStop(0.5, '#2a2034'); g.addColorStop(1, '#14101c');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, R + 24, 0, 7); x.arc(0, 0, R - 24, 0, 7, true); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, R + 23, Math.PI * 1.05, Math.PI * 1.7); x.stroke();
    x.fillStyle = '#0c0812'; x.beginPath(); x.arc(0, 0, R + 17, 0, 7); x.arc(0, 0, R - 17, 0, 7, true); x.fill();
    for (var i = 0; i < 60; i++) { var a = i / 60 * Math.PI * 2, l = i % 5 ? 6 : 12; x.strokeStyle = i % 5 ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.6)'; x.lineWidth = i % 5 ? 1 : 2; x.beginPath(); x.moveTo(Math.cos(a) * (R - 24 - 2), Math.sin(a) * (R - 24 - 2)); x.lineTo(Math.cos(a) * (R - 24 - 2 - l), Math.sin(a) * (R - 24 - 2 - l)); x.stroke(); }
    var ig = x.createRadialGradient(0, 0, 0, 0, 0, R - 40); ig.addColorStop(0, 'rgba(255,158,207,.12)'); ig.addColorStop(1, 'rgba(255,158,207,0)'); x.fillStyle = ig; x.beginPath(); x.arc(0, 0, R - 40, 0, 7); x.fill();
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(BG, -10, -10, W + 20, H + 20);
    var a0 = ang == null ? t * 2 : ang, z = zone == null ? 0.5 : zone, zw = zoneW || 0.7;
    A.draw(c, DIAL, CX, CY, 1);
    c.lineCap = 'round';
    // 목표 구간: 넓고 옅은 선 + 진한 선 + 밝은 심
    c.save(); c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(255,158,207,.22)'; c.lineWidth = 52; c.beginPath(); c.arc(CX, CY, R, z - zw / 2, z + zw / 2); c.stroke();
    c.restore();
    c.strokeStyle = '#ff9ecf'; c.lineWidth = 30; c.beginPath(); c.arc(CX, CY, R, z - zw / 2, z + zw / 2); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 6; c.beginPath(); c.arc(CX, CY, R - 7, z - zw / 2, z + zw / 2); c.stroke();
    c.strokeStyle = '#ffd166'; c.lineWidth = 30; c.beginPath(); c.arc(CX, CY, R, z - zw * 0.1, z + zw * 0.1); c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffd166', 10), CX + Math.cos(z) * R, CY + Math.sin(z) * R, 1.3 + Math.sin(t * 8) * 0.15); c.restore();
    c.lineCap = 'butt';
    // 바늘: 금속 바늘 + 잔상
    var nx = CX + Math.cos(a0) * (R + 34), ny = CY + Math.sin(a0) * (R + 34);
    c.save(); c.translate(CX, CY); c.rotate(a0);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.moveTo(R - 44, -5); c.lineTo(R + 36, 0); c.lineTo(R - 44, 5); c.fill();
    var ng = c.createLinearGradient(0, -6, 0, 6); ng.addColorStop(0, '#ffffff'); ng.addColorStop(1, '#a8b0c8');
    c.fillStyle = ng; c.beginPath(); c.moveTo(R - 46, -6); c.lineTo(R + 34, 0); c.lineTo(R - 46, 6); c.closePath(); c.fill();
    c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(R - 46, 0, 7, 0, 7); c.fill();
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffffff', 6), nx, ny, 1.2); c.restore();
    // 가운데 숫자
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 ' + (96 + (pulse > 0 ? pulse * 20 : 0)) + 'px "Chakra Petch",system-ui'; c.fillText(String(hits || 0), CX, CY);
    c.font = '600 16px "Chakra Petch",system-ui'; c.fillStyle = 'rgba(255,255,255,.5)'; c.fillText('HITS', CX, CY + 64);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = hits; document.getElementById('hC').textContent = spd.toFixed(1); }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); tap(); } });
  var S = new A.Shell({ id: 'ring', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) tap(); } });
})();
