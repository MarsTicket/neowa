(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, MAXT = 10, land = false;
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
  // OUT(0S 0B)이 나온 숫자는 정답에 없으므로 숫자판에서 흐리게 표시 (누를 수는 있음)
  function outDigits() { var o = {}; (log || []).forEach(function (r) { if (!r.s && !r.b) r.g.forEach(function (d) { o[d] = 1; }); }); return o; }
  // 화면 배치: 세로 540x960(위 기록, 아래 숫자판) / 가로 900x600(왼쪽 입력·기록, 오른쪽 큰 숫자판)
  function keys() { var r = [], n;
    if (land) { var ks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok']; ks.forEach(function (k, i) { r.push([k, 478 + (i % 3) * 138, 24 + Math.floor(i / 3) * 118, 124, 104]); }); return r; }
    for (n = 0; n < 10; n++) r.push([n, 40 + (n % 5) * 94, 600 + Math.floor(n / 5) * 86, 84, 74]);
    r.push(['del', 40, 790, 210, 70], ['ok', 290, 790, 210, 70]); return r; }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0] + (shake > 0 ? Math.sin(t * 60) * 6 : 0), o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04121e'); g.addColorStop(1, '#0a1f30'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!secret) newSecret();
    var LX = land ? 20 : 40, LW = land ? 420 : W - 80, CX = LX + LW / 2, IY = land ? 18 : 110, IH = land ? 80 : 88, RY = land ? 116 : 226, RH = land ? 47 : 35;
    // 입력 칸
    var bw = 74, gx = CX - (LEN * bw + (LEN - 1) * 12) / 2;
    for (var i = 0; i < LEN; i++) { var x = gx + i * (bw + 12); c.fillStyle = 'rgba(155,231,255,.08)'; A.rr(c, x, IY, bw, IH, 14); c.fill(); c.strokeStyle = i === input.length ? '#9be7ff' : 'rgba(155,231,255,.25)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#fff'; c.font = '700 48px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; var show = endT > 0 && log.length && (log[log.length - 1].s === LEN || tries >= MAXT) ? secret[i] : input[i]; if (show != null) c.fillText(String(show), x + bw / 2, IY + IH / 2 + 2); }
    // 기록: 10번 모두 보여 줌 (추리에 필요)
    c.font = '600 ' + (land ? 24 : 20) + 'px "Chakra Petch",system-ui';
    log.forEach(function (r, k) { var y = RY + k * RH, n = k + 1, h = RH - 4; c.fillStyle = 'rgba(255,255,255,.04)'; A.rr(c, LX, y, LW, h, 9); c.fill();
      c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,.4)'; c.fillText(n + '.', LX + 16, y + h / 2 + 1); c.fillStyle = '#fff'; c.fillText(r.g.join(' '), LX + 60, y + h / 2 + 1);
      c.textAlign = 'right'; c.fillStyle = r.s ? '#ffd166' : r.b ? '#9be7ff' : 'rgba(255,255,255,.5)'; c.fillText(r.s || r.b ? r.s + 'S ' + r.b + 'B' : 'OUT', LX + LW - 16, y + h / 2 + 1); });
    if (!log.length) { c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '500 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('숫자 ' + LEN + '개를 고르고 확인을 누르세요', CX, RY + 74); c.fillText('예) 1S 1B = 하나는 자리까지, 하나는 숫자만 맞음', CX, RY + 104); }
    var out = outDigits();
    // 숫자 패드·지우기·확인
    keys().forEach(function (b) { var k = b[0], px = b[1], py = b[2], bw2 = b[3], bh = b[4];
      if (k === 'del' || k === 'ok') { c.fillStyle = k === 'ok' ? '#9be7ff' : 'rgba(255,255,255,.08)'; A.rr(c, px, py, bw2, bh, 16); c.fill(); c.fillStyle = k === 'ok' ? '#03141c' : '#fff'; c.font = '700 22px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText(k === 'ok' ? '확인' : '지우기', px + bw2 / 2, py + bh / 2 + 1); return; }
      var used = input.indexOf(k) >= 0, gone = out[k]; c.fillStyle = used ? 'rgba(155,231,255,.35)' : gone ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.08)'; A.rr(c, px, py, bw2, bh, 14); c.fill(); c.fillStyle = gone && !used ? 'rgba(255,255,255,.3)' : '#fff'; c.font = '700 ' + (land ? 40 : 32) + 'px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.fillText(String(k), px + bw2 / 2, py + bh / 2 + 1);
      if (gone) { c.strokeStyle = 'rgba(255,77,109,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + bw2 / 2 - 18, py + bh / 2 + 18); c.lineTo(px + bw2 / 2 + 18, py + bh / 2 - 18); c.stroke(); } });
    c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '500 14px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('S 스트라이크 = 숫자·자리 모두 맞음 · B 볼 = 숫자만 맞음', land ? 678 : W / 2, land ? 535 : 900);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = tries + '/' + MAXT; document.getElementById('hC').textContent = streak; document.getElementById('hMult').textContent = LEN + '자리'; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    keys().forEach(function (b) { if (p.x > b[1] && p.x < b[1] + b[3] && p.y > b[2] && p.y < b[2] + b[4]) { if (b[0] === 'del') back(); else if (b[0] === 'ok') submit(); else press(b[0]); hud(); } });
  });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_baseball_diff', diff); A.sfx('click'); pd(); secret = null; }); }); pd();
  var S = new A.Shell({ id: 'baseball', W: W, H: H, land: [900, 600], onResize: function (sh) { land = !!sh.land; W = sh.W; H = sh.H; }, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (/^[0-9]$/.test(k)) press(+k); if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); back(); } if (k === 'Enter' || k === ' ') submit(); } });
  // 가로 화면: 게임판 위 점수판을 숨기고 같은 내용을 오른쪽 패널 점수판에 보여 줌 (extra = 패널에 더 넣을 HTML)
  function landStats(sh, extra) {
    var hudEl = document.querySelector('.g-hud'); if (!hudEl || !sh.panelSlot) return;
    hudEl.setAttribute('data-land-hide', '');
    var ids = ['hA', 'hB', 'hC'];
    sh.panelSlot.innerHTML = '<div class="g-card gp-stats">' + ids.map(function (id) { return '<div><span id="p' + id + 'L"></span><b id="p' + id + '"></b>' + (id === 'hA' ? '<em id="phM" style="font-style:normal;font-size:12px;font-weight:700;color:#ffd166"></em>' : '') + '</div>'; }).join('') + '</div>' + (extra || '');
    function sync() { var m = document.getElementById('hMult'); document.getElementById('phM').textContent = m ? m.textContent : '';
      ids.forEach(function (id) { var v = document.getElementById(id), lb = v && v.parentNode.querySelector('.h-lb');
        document.getElementById('p' + id).textContent = v ? v.textContent : ''; document.getElementById('p' + id + 'L').textContent = lb ? lb.textContent : ''; }); }
    new MutationObserver(sync).observe(hudEl, { subtree: true, childList: true, characterData: true }); sync();
  }
  landStats(S);
})();
