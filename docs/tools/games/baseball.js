(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, MAXT = 10;
  var fx = new A.FX();
  var diff = +A.get('neowa_baseball_diff', '0') || 0, LEN, secret, input, tries, log, score, streak, solved, endT, shake = 0;
  function newSecret() { LEN = diff ? 4 : 3; var d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; for (var i = d.length - 1; i > 0; i--) { var j = A.irand(0, i), t = d[i]; d[i] = d[j]; d[j] = t; } secret = d.slice(0, LEN); input = []; tries = 0; log = []; endT = 0; }
  function reset() { score = 0; streak = 0; solved = 0; newSecret(); fx.clear(); hud(); }
  function press(n) { if (S.state !== 'playing' || endT > 0) return; if (input.length >= LEN || input.indexOf(n) >= 0) { A.sfx('wall'); return; } input.push(n); A.sfx('tick', 1 + n * 0.04); }
  function back() { if (input.length) { input.pop(); A.sfx('click'); } }
  function submit() {
    if (S.state !== 'playing' || endT > 0) return; if (input.length !== LEN) { shake = 0.3; A.sfx('wall'); return; }
    var s = 0, b = 0; input.forEach(function (v, i) { if (secret[i] === v) s++; else if (secret.indexOf(v) >= 0) b++; });
    tries++; log.push({ g: input.slice(), s: s, b: b }); input = [];
    if (s === LEN) { var pts = (MAXT - tries + 1) * 50 * (diff + 1); score += pts; streak++; solved++; endT = 1.4; A.sfx('level'); fx.text(W / 2, 330, '정답! +' + pts, '#9be7ff', 30); for (var k = 0; k < 4; k++) fx.burst(A.rand(100, W - 100), A.rand(200, 500), '#9be7ff', 20, 300, 0.7, 4); }
    else if (tries >= MAXT) { endT = 2; A.sfx('over'); }
    else A.sfx(s ? 'coin' : b ? 'eat' : 'hit', 1 + s * 0.2);
    hud();
  }
  function update(dt) {
    fx.update(dt); if (shake > 0) shake -= dt;
    if (endT > 0) { endT -= dt; if (endT <= 0) {
      if (log.length && log[log.length - 1].s === LEN) { newSecret(); S.banner(solved + 1 + '번째 문제', '연속 ' + streak); hud(); }
      else S.gameOver(score, [['맞힌 문제', String(solved)], ['정답', secret.join('')]]);
    } }
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0] + (shake > 0 ? Math.sin(t * 60) * 6 : 0), o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04121e'); g.addColorStop(1, '#0a1f30'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!secret) newSecret();
    // 입력 칸
    var bw = 74, gx = W / 2 - (LEN * bw + (LEN - 1) * 12) / 2;
    for (var i = 0; i < LEN; i++) { var x = gx + i * (bw + 12); c.fillStyle = 'rgba(155,231,255,.08)'; A.rr(c, x, 110, bw, 88, 14); c.fill(); c.strokeStyle = i === input.length ? '#9be7ff' : 'rgba(155,231,255,.25)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#fff'; c.font = '700 48px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; var show = endT > 0 && log.length && (log[log.length - 1].s === LEN || tries >= MAXT) ? secret[i] : input[i]; if (show != null) c.fillText(String(show), x + bw / 2, 156); }
    // 기록
    c.font = '600 20px "Chakra Petch",system-ui';
    log.slice(-8).forEach(function (r, k) { var y = 238 + k * 42, n = log.length - Math.min(8, log.length) + k + 1; c.fillStyle = 'rgba(255,255,255,.04)'; A.rr(c, 40, y, W - 80, 36, 10); c.fill();
      c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,.4)'; c.fillText(n + '.', 56, y + 19); c.fillStyle = '#fff'; c.fillText(r.g.join(' '), 100, y + 19);
      c.textAlign = 'right'; c.fillStyle = r.s ? '#ffd166' : r.b ? '#9be7ff' : 'rgba(255,255,255,.5)'; c.fillText(r.s || r.b ? r.s + 'S ' + r.b + 'B' : 'OUT', W - 56, y + 19); });
    // 숫자 패드
    for (var n = 0; n < 10; n++) { var col = n % 5, row = Math.floor(n / 5), px = 40 + col * 94, py = 600 + row * 86, used = input.indexOf(n) >= 0; c.fillStyle = used ? 'rgba(155,231,255,.35)' : 'rgba(255,255,255,.08)'; A.rr(c, px, py, 84, 74, 14); c.fill(); c.fillStyle = '#fff'; c.font = '700 32px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.fillText(String(n), px + 42, py + 38); }
    [['지우기', 40, 'rgba(255,255,255,.08)', '#fff'], ['확인', 290, '#9be7ff', '#03141c']].forEach(function (b) { c.fillStyle = b[2]; A.rr(c, b[1], 790, 210, 70, 16); c.fill(); c.fillStyle = b[3]; c.font = '700 22px "Pretendard Variable",system-ui'; c.fillText(b[0], b[1] + 105, 826); });
    c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '500 14px "Pretendard Variable",system-ui'; c.fillText('S 스트라이크 = 숫자·자리 모두 맞음 · B 볼 = 숫자만 맞음', W / 2, 900);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = tries + '/' + MAXT; document.getElementById('hC').textContent = streak; document.getElementById('hMult').textContent = LEN + '자리'; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    for (var n = 0; n < 10; n++) { var px = 40 + (n % 5) * 94, py = 600 + Math.floor(n / 5) * 86; if (p.x > px && p.x < px + 84 && p.y > py && p.y < py + 74) { press(n); hud(); return; } }
    if (p.y > 790 && p.y < 860) { if (p.x > 40 && p.x < 250) back(); if (p.x > 290 && p.x < 500) submit(); }
  });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_baseball_diff', diff); A.sfx('click'); pd(); secret = null; }); }); pd();
  var S = new A.Shell({ id: 'baseball', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (/^[0-9]$/.test(k)) press(+k); if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); back(); } if (k === 'Enter' || k === ' ') submit(); } });
})();
