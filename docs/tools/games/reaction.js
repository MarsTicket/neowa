(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, ROUNDS = 5;
  var fx = new A.FX();
  var C1 = '#5ee7ff', C2 = '#ff4d6d'; // P1 파랑(아래) / P2 빨강(위)
  var S = null;

  // 한 화면 2인 대결: 아래 = P1, 위 = P2. 화면을 사이에 두고 마주 앉으면 위쪽 사람이 읽기 좋게 P2 글자를 뒤집어 그립니다.
  var duo = A.duo('reaction', { solo: ['SCORE', 'ROUND', 'AVG'], duo: ['P1 : P2', 'ROUND', 'AVG P1/P2'] }, function () { if (S) { reset(); } });

  var phase, waitT, goAt, times, round, msg, endT, fakeT = 0, fakeDone = false, lastU = 0, fakeAt = 0, showT = 0;
  // 2인용 상태
  var dT, dFoul, dWin, dTimes, dLock, dFirst, dRes, goT;

  // 위쪽(P2) 글자 뒤집기: 손으로 만지는 휴대폰·태블릿을 마주 보고 앉는 경우가 많아 기본은 뒤집힘.
  // 신호선 가운데 단추로 언제든 바꿀 수 있고, 바꾼 선택은 기억합니다.
  var storedFlip = A.get('neowa_reaction_2p_flip', ''), flipTop = storedFlip === '1';
  function defaultFlip() { var b = document.body.classList; return b.contains('touch') && !b.contains('land'); }

  function reset() {
    times = []; round = 1; endT = 0; lastU = 0;
    dT = [null, null]; dFoul = -1; dWin = [0, 0]; dTimes = [[], []]; dLock = 0; dFirst = 0; dRes = null; goT = 0;
    if (storedFlip === '') flipTop = defaultFlip();
    fx.clear(); ready(); hud(); syncUi();
  }
  function ready() {
    phase = 'wait'; waitT = A.rand(1.4, 3.6); msg = '초록색이 되면 탭!'; fakeT = 0;
    dT = [null, null]; dFoul = -1; dLock = 0; dFirst = 0; dRes = null; goT = 0; showT = 0;
    // 2회차부터 가끔 파란 속임수 (둘 다 같은 화면을 보므로 누구든 누르면 그 사람 반칙)
    fakeDone = !(round >= 2 && Math.random() < (duo() ? 0.3 : 0.4));
    if (!fakeDone) fakeAt = A.rand(0.5, Math.max(0.6, waitT - 0.8));
  }

  /* ---------- 1인용 ---------- */
  function tap() {
    if (S.state !== 'playing' || endT > 0) return;
    if (phase === 'wait') { times.push(500); msg = fakeT > 0 ? '속임수에 걸렸어요! +500ms' : '너무 빨라요! +500ms'; fakeT = 0; A.sfx('wrong'); fx.shake(6, 0.2); phase = 'show'; showT = 1.2; }
    else if (phase === 'go') { if (!goAt) goAt = performance.now(); var ms = Math.max(1, Math.round(performance.now() - goAt)); times.push(ms); msg = ms + ' ms'; A.sfx(ms < 250 ? 'gold' : 'coin'); fx.burst(W / 2, 480, ms < 250 ? '#ffd166' : '#7dff9b', 30, 340, 0.6, 4); phase = 'show'; showT = 1.1; A.vibrate(15); }
    hud();
  }
  function avg() { return times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : 0; }
  function finishSolo() {
    var a = avg(), sc = Math.max(0, Math.round((600 - a) * 3));
    var best = A.getInt('neowa_reaction_ms'); if (!best || a < best) A.set('neowa_reaction_ms', a);
    S.gameOver(sc, [['평균', a + 'ms'], ['최고', Math.min.apply(null, times) + 'ms'], ['내 최단 평균', (A.getInt('neowa_reaction_ms') || a) + 'ms']], { kick: 'RESULT', win: true });
  }

  /* ---------- 2인용 ---------- */
  function avgOf(list) { return list.length ? Math.round(list.reduce(function (a, b) { return a + b; }, 0) / list.length) : 0; }
  function msStr(v) { return v ? v + 'ms' : '-'; }
  function tap2(p) {
    if (S.state !== 'playing' || endT > 0) return;
    var col = p === 0 ? C1 : C2;
    if (phase === 'wait') { // 신호 전에 누름 = 부정 출발, 이번 라운드는 상대 승
      dFoul = p; dRes = { w: 1 - p, foul: p }; dWin[1 - p]++;
      A.sfx('wrong'); fx.shake(7, 0.25); fx.flashIt('#ff3355', 0.22); A.vibrate(45);
      phase = 'show'; showT = 1.9; hud(); return;
    }
    if (phase !== 'go' || dT[p] != null) return;
    if (!goAt) goAt = performance.now();
    var ms = Math.max(1, Math.round(performance.now() - goAt));
    dT[p] = ms; dTimes[p].push(ms);
    A.sfx(ms < 250 ? 'gold' : 'coin'); A.vibrate(12);
    fx.burst(W / 2, p === 0 ? H * 0.72 : H * 0.28, col, 26, 300, 0.5, 3);
    if (!dFirst) { dFirst = p + 1; dLock = 1.05; } // 먼저 누른 사람이 나오면 상대에게 1초 기회를 더 줌(두 사람 기록을 같이 보여 주려고)
    if (dT[0] != null && dT[1] != null) resolveRound();
    hud();
  }
  function resolveRound() {
    if (phase !== 'go') return;
    var a = dT[0], b = dT[1], w = -1;
    if (a != null && b != null) w = a < b ? 0 : b < a ? 1 : -1;
    else if (a != null) w = 0; else if (b != null) w = 1;
    dRes = { w: w, a: a, b: b, foul: -1 };
    if (w >= 0) dWin[w]++;
    phase = 'show'; showT = (a != null && b != null) ? 2.0 : 1.7;
    if (w >= 0) { A.sfx('coin'); fx.flashIt(w === 0 ? C1 : C2, 0.14); } else A.sfx('wrong');
    hud();
  }
  function nextRound() {
    if (round >= ROUNDS) { endT = 0.55; }
    else { round++; ready(); }
    hud();
  }
  function finishDuo() {
    var a0 = avgOf(dTimes[0]), a1 = avgOf(dTimes[1]);
    var title = dWin[0] > dWin[1] ? 'P1 승리!' : dWin[1] > dWin[0] ? 'P2 승리!' : '무승부!';
    S.gameOver(0, [['P1 승', String(dWin[0])], ['P2 승', String(dWin[1])], ['평균', 'P1 ' + msStr(a0) + ' · P2 ' + msStr(a1)]],
      { title: title, kick: '2인 대결 · ' + ROUNDS + '라운드', win: true, noRecord: true });
  }

  /* ---------- 진행 ---------- */
  function update(dt) {
    fx.update(dt);
    var now = performance.now(), gap = lastU ? now - lastU : 0; lastU = now;
    if (endT > 0) { endT -= dt; if (endT <= 0) { if (duo()) finishDuo(); else finishSolo(); } return; }
    if (duo()) { updateDuo(dt, gap); return; }
    // 일시정지·화면 전환으로 멈췄다 돌아오면 측정이 틀리므로 이번 회차를 다시 기다림
    if (phase === 'go' && gap > 400) { ready(); msg = '잠깐 멈춰서 다시 측정해요'; return; }
    if (phase === 'wait') { waitT -= dt; if (fakeT > 0) fakeT -= dt;
      if (!fakeDone && waitT <= fakeAt) { fakeDone = true; fakeT = 0.45; A.sfx('tick', 1.3); }
      if (waitT <= 0) { phase = 'go'; goAt = 0; fakeT = 0; A.sfx('go'); } }
    if (phase === 'show') { showT -= dt; if (showT <= 0) { if (round >= ROUNDS) { endT = 0.6; } else { round++; ready(); } hud(); } }
  }
  function updateDuo(dt, gap) {
    if (phase === 'go' && gap > 400) { ready(); msg = '잠깐 멈춰서 다시 측정해요'; return; }
    if (phase === 'wait') {
      waitT -= dt; if (fakeT > 0) fakeT -= dt;
      if (!fakeDone && waitT <= fakeAt) { fakeDone = true; fakeT = 0.45; A.sfx('tick', 1.3); }
      if (waitT <= 0) { phase = 'go'; goAt = 0; goT = 0; fakeT = 0; A.sfx('go'); }
    } else if (phase === 'go') {
      goT += dt;
      if (dLock > 0) { dLock -= dt; if (dLock <= 0) resolveRound(); }   // 먼저 누른 뒤 상대 기회 끝
      else if (goT > 4) resolveRound();                                 // 둘 다 안 눌렀을 때(무승부)
    } else if (phase === 'show') {
      showT -= dt; if (showT <= 0) nextRound();
    }
    hud();
  }

  /* ---------- 그리기 ---------- */
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    if (duo()) renderDuo(c); else renderSolo(c);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function renderSolo(c) {
    if (phase === 'go' && !goAt) goAt = performance.now(); // 초록 화면이 실제로 그려진 순간부터 잼
    var col = phase === 'go' ? '#1fa85a' : phase === 'wait' ? (fakeT > 0 ? '#2450c8' : '#a8243e') : '#14182a';
    if (!phase) col = '#1a1020';
    c.fillStyle = col; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '400 ' + (phase === 'go' ? 64 : 40) + 'px "Black Han Sans",system-ui'; c.fillText(phase === 'go' ? '지금!' : fakeT > 0 ? '참아요!' : msg || '', W / 2, 460);
    c.font = '600 18px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.7)';
    (times || []).forEach(function (t, i) { c.fillText((i + 1) + '회: ' + t + 'ms', W / 2, 600 + i * 30); });
  }
  var MID = H / 2;
  function pill() { return { x: W / 2 - 90, y: MID - 17, w: 180, h: 34 }; }
  function renderDuo(c) {
    var col;
    if (!phase) col = '#14182a';
    else if (phase === 'go') col = '#1fa85a';
    else if (phase === 'wait') col = fakeT > 0 ? '#2450c8' : '#a8243e';
    else col = '#14182a';
    c.fillStyle = col; c.fillRect(-10, -10, W + 20, H + 20);
    if (phase === 'go' && !goAt) goAt = performance.now();
    drawSide(c, 1); // 위 = P2
    drawSide(c, 0); // 아래 = P1
    // 가운데 신호선
    c.strokeStyle = 'rgba(0,0,0,.42)'; c.lineWidth = 10; c.beginPath(); c.moveTo(0, MID); c.lineTo(W, MID); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.26)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, MID); c.lineTo(W, MID); c.stroke();
    if (phase !== 'go') drawFlip(c);
  }
  function drawSide(c, p) {
    var rot = p === 1 && flipTop, pad = 30, h2 = MID;
    c.save();
    if (p === 0) c.translate(0, MID);
    if (rot) { c.translate(W, h2); c.rotate(Math.PI); }
    var col = p === 0 ? C1 : C2;
    if (phase === 'show' && dRes) {
      c.fillStyle = dRes.w === p ? 'rgba(31,168,90,.24)' : 'rgba(0,0,0,.3)';
      c.fillRect(0, 0, W, h2);
    }
    c.textBaseline = 'middle';
    c.textAlign = 'left'; c.fillStyle = col; c.font = '700 22px "Chakra Petch",system-ui';
    c.fillText(p === 0 ? 'P1' : 'P2', pad, 40);
    c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.82)'; c.font = '700 17px "Pretendard Variable",system-ui';
    c.fillText(dWin[p] + '승', W - pad, 40);

    var cx = W / 2, cy = h2 * 0.46, big = '', sub = '', bc = '#fff', bz = 40;
    if (phase === 'wait') {
      if (fakeT > 0) { big = '참아요!'; sub = '파란 화면은 속임수'; bc = '#dbe6ff'; }
      else { big = '기다려…'; sub = '초록이 되면 누르세요'; bc = 'rgba(255,255,255,.92)'; }
    } else if (phase === 'go') {
      big = '지금!'; bz = 68; sub = dT[p] != null ? dT[p] + 'ms' : '누르세요!';
    } else if (phase === 'show') {
      var ms = dT[p], other = dT[1 - p], diff = (ms != null && other != null) ? Math.abs(ms - other) : 0;
      if (dFoul === p) { big = '부정 출발'; bc = '#ffe066'; sub = '상대 라운드 승'; }
      else if (dFoul >= 0) { big = '라운드 승'; bc = col; sub = '상대가 먼저 눌렀어요'; }
      else if (dRes && dRes.w === p) { big = '라운드 승'; bc = col; sub = ms != null ? ms + 'ms' + (diff ? ' · ' + diff + 'ms 빠름' : '') : ''; }
      else if (dRes && dRes.w === 1 - p) { big = '라운드 패'; bc = 'rgba(255,255,255,.62)'; sub = ms != null ? ms + 'ms' + (diff ? ' · ' + diff + 'ms 느림' : '') : '무응답'; }
      else { big = '무승부'; bc = 'rgba(255,255,255,.75)'; sub = ms != null ? ms + 'ms' : '무응답'; }
    } else if (msg) { big = ''; sub = ''; }
    c.textAlign = 'center';
    if (big) {
      c.font = '400 ' + bz + 'px "Black Han Sans",system-ui';
      c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.32)'; c.strokeText(big, cx, cy);
      c.fillStyle = bc; c.fillText(big, cx, cy);
    }
    if (sub) {
      c.font = '600 18px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.82)';
      c.fillText(sub, cx, cy + bz * 0.55 + 14);
    }
    var av = avgOf(dTimes[p]);
    c.font = '600 15px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.55)';
    c.fillText((av ? '평균 ' + av + 'ms · ' : '') + Math.min(round, ROUNDS) + ' / ' + ROUNDS + ' 라운드', cx, h2 - 40);
    c.restore();
  }
  function drawFlip(c) {
    var r = pill();
    A.rr(c, r.x, r.y, r.w, r.h, 17);
    c.fillStyle = 'rgba(5,6,12,.74)'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.82)'; c.font = '700 15px "Pretendard Variable",system-ui';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(flipTop ? 'P2 화면 뒤집힘 ↕' : 'P2 화면 그대로 ↕', W / 2, MID + 1);
  }
  function toggleFlip() {
    if (phase === 'go') return;
    flipTop = !flipTop; storedFlip = flipTop ? '1' : '0'; A.set('neowa_reaction_2p_flip', storedFlip);
    A.sfx('click');
  }

  function hud() {
    var hA = document.getElementById('hA'), hB = document.getElementById('hB'), hC = document.getElementById('hC');
    if (duo()) {
      hA.textContent = dWin[0] + ' : ' + dWin[1];
      hB.textContent = Math.min(round, ROUNDS) + '/' + ROUNDS;
      hC.textContent = (dTimes[0].length || dTimes[1].length) ? avgOf(dTimes[0]) + ' / ' + avgOf(dTimes[1]) : '-';
    } else {
      hA.textContent = A.fmt(Math.max(0, Math.round((600 - avg()) * 3)));
      hB.textContent = Math.min(round, ROUNDS) + '/' + ROUNDS;
      hC.textContent = times.length ? avg() + 'ms' : '-';
    }
  }

  /* ---------- 화면 조작 ---------- */
  // 2인용에서는 게임판 위 점수판(HUD)이 위쪽 P2 자리를 가리므로 숨깁니다
  var st = document.createElement('style');
  st.textContent = 'body.duo #stage .g-hud{display:none}body.duo #ovOver .ov-best{display:none}';
  document.head.appendChild(st);

  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return;
    e.preventDefault();
    if (duo()) {
      var p = S.toLocal(e), r = pill();
      if (phase !== 'go' && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { toggleFlip(); return; }
      tap2(p.y < MID ? 1 : 0);
    } else tap();
  });

  // 종료 화면의 모드 전환 단추 (2인 대결 직후 바로 혼자 하기로, 또는 그 반대로)
  var swBtn = null;
  (function () {
    var col = document.querySelector('#ovOver .ov-col'), p = document.querySelector('#ovOver .btn-p');
    if (!col) return;
    swBtn = document.createElement('button');
    swBtn.type = 'button'; swBtn.className = 'btn btn-g'; swBtn.setAttribute('data-nostart', '');
    swBtn.addEventListener('click', function () {
      var want = duo() ? '0' : '1', b = document.querySelector('[data-mode="' + want + '"]');
      if (b) b.click();
      S.start();
    });
    if (p && p.nextSibling) col.insertBefore(swBtn, p.nextSibling); else col.appendChild(swBtn);
  })();
  function syncUi() { if (swBtn) swBtn.textContent = duo() ? '혼자 하기로 바꾸기' : '둘이서 대결하기'; }

  S = new A.Shell({ id: 'reaction', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      if (e.repeat) return;
      var k = e.key, cd = e.code;
      if (duo()) {
        // P1: A · Space · 왼쪽 Shift / P2: L · Enter · 오른쪽 Shift
        if (k === 'a' || k === 'A' || k === ' ' || cd === 'ShiftLeft') tap2(0);
        else if (k === 'l' || k === 'L' || k === 'Enter' || cd === 'ShiftRight') tap2(1);
        return;
      }
      if (k === ' ' || k === 'Enter') tap();
    } });
  syncUi();
})();
