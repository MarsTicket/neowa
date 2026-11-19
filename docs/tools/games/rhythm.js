(function () {
  'use strict';
  // 네온 리듬: 매 판 즉석으로 만든 음악(WebAudio)에 맞춰 4개 레인의 노트를 치기. 시간은 AudioContext 시계 기준
  var A = Arcade, W = 540, H = 960;
  var LX = 50, LW = 110, JY = 800, TOP = 120, LANE_COL = ['#ff5ec4', '#5ee7ff', '#ffd166', '#7dff9b'];
  var KEYS = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };
  var PERFECT = 0.05, GOOD = 0.11, MISS = 0.16;
  var fx = new A.FX();
  var ac = null, out = null, t0 = 0, song = null, notes, events, evIdx, nIdx, hold = [false, false, false, false], holdNote = [null, null, null, null], laneFlash = [0, 0, 0, 0];
  var score, combo, maxCombo, hp, nP, nG, nM, judged, phase, judgeTxt, judgeT, diff = +A.get('neowa_rhythm_diff', 1) || 0, offset = +A.get('neowa_rhythm_offset', 0) || 0, fallbackT = 0, tim = 0, beatFlash = 0, lastBeat = -1;

  // ---------- 소리(이 게임 전용 AudioContext: 일시정지하면 시계도 멈춤) ----------
  function audio() {
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      try { ac = new C(); } catch (e) { return null; }
      out = ac.createGain(); var comp = ac.createDynamicsCompressor(); out.connect(comp); comp.connect(ac.destination);
    }
    return ac;
  }
  var nbuf = null;
  function noiseBuf() { if (nbuf) return nbuf; nbuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return nbuf; }
  function env(t, v, a, d) { var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); g.connect(out); return g; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function play(ev) {
    var t = t0 + ev.t; if (t < ac.currentTime - 0.05) return;
    if (ev.k === 'kick') { var o = ac.createOscillator(), g = env(t, 0.9, 0.003, 0.28); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22); o.connect(g); o.start(t); o.stop(t + 0.3); }
    else if (ev.k === 'snare' || ev.k === 'hat' || ev.k === 'ohat') {
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), sn = ev.k === 'snare'; s.buffer = noiseBuf();
      f.type = sn ? 'bandpass' : 'highpass'; f.frequency.value = sn ? 1800 : 7000; var g2 = env(t, sn ? 0.5 : ev.k === 'ohat' ? 0.14 : 0.09, 0.002, sn ? 0.16 : ev.k === 'ohat' ? 0.22 : 0.045);
      s.connect(f); f.connect(g2); s.start(t); s.stop(t + 0.3);
      if (sn) { var o2 = ac.createOscillator(), g3 = env(t, 0.25, 0.002, 0.09); o2.type = 'triangle'; o2.frequency.value = 210; o2.connect(g3); o2.start(t); o2.stop(t + 0.12); }
    } else if (ev.k === 'bass') {
      var ob = ac.createOscillator(), fb = ac.createBiquadFilter(), gb = env(t, 0.32, 0.01, ev.d * 0.95); ob.type = 'sawtooth'; ob.frequency.value = mtof(ev.m); fb.type = 'lowpass'; fb.frequency.value = 520; ob.connect(fb); fb.connect(gb); ob.start(t); ob.stop(t + ev.d + 0.05);
    } else if (ev.k === 'lead') {
      var ol = ac.createOscillator(), o3 = ac.createOscillator(), fl = ac.createBiquadFilter(), gl = env(t, 0.16, 0.01, Math.max(0.12, ev.d * 0.92));
      ol.type = 'square'; o3.type = 'sawtooth'; ol.frequency.value = mtof(ev.m); o3.frequency.value = mtof(ev.m) * 1.006; fl.type = 'lowpass'; fl.frequency.value = 2600;
      ol.connect(fl); o3.connect(fl); fl.connect(gl); ol.start(t); o3.start(t); ol.stop(t + ev.d + 0.05); o3.stop(t + ev.d + 0.05);
    } else if (ev.k === 'pad') {
      ev.ms.forEach(function (m) { var op = ac.createOscillator(), gp = env(t, 0.035, 0.15, ev.d); op.type = 'triangle'; op.frequency.value = mtof(m); op.connect(gp); op.start(t); op.stop(t + ev.d + 0.05); });
    }
  }

  // ---------- 곡 만들기 ----------
  function makeSong() {
    var bpm = 2 * A.irand(52, 76), step = 60 / bpm / 4, bars = Math.max(24, Math.round(90 / (step * 16))), root = [57, 60, 62, 55, 58][A.irand(0, 4)];
    var SC = [0, 3, 5, 7, 10], scale = []; for (var o = 0; o < 3; o++) SC.forEach(function (s) { scale.push(root + o * 12 + s); });
    var PROG = [[0, 8, 3, 10], [0, 5, 8, 7], [0, 10, 8, 7], [0, 3, 8, 10]][A.irand(0, 3)];
    var ev = [], mel = [];
    function phrase() {
      // 2마디(32칸) 멜로디: 박이 센 자리에 음이 올 확률이 높음, 음높이는 음계 위를 걷듯이
      var ph = [], pos = 0, idx = A.irand(4, 8);
      while (pos < 32) {
        var strong = pos % 4 === 0 ? 0.85 : pos % 2 === 0 ? 0.5 : 0.22;
        if (Math.random() < strong) {
          var len = pos % 8 === 6 || pos >= 28 ? (Math.random() < 0.5 ? 4 : 2) : (Math.random() < 0.25 ? 2 : 1); if (pos >= 26 && Math.random() < 0.5) len = 32 - pos;
          idx = A.clamp(idx + A.irand(-2, 2), 2, scale.length - 3); ph.push({ s: pos, l: Math.min(len, 32 - pos), m: scale[idx] }); pos += len;
        } else pos++;
      }
      return ph;
    }
    var A1 = phrase(), B1 = phrase(), A2 = phrase(), B2 = phrase(), plan = [A1, A1, B1, B1, A2, A2, B2, B1];
    var four = bpm < 130 && Math.random() < 0.5;
    for (var b = 0; b < bars; b++) {
      var bt = b * 16 * step, chord = root - 12 + PROG[b % 4], intro = b < 2, outro = b >= bars - 1;
      for (var s = 0; s < 16; s++) {
        var t = bt + s * step;
        if (four ? s % 4 === 0 : (s === 0 || s === 8 || (s === 10 && b % 2) || (s === 6 && b % 4 === 3))) ev.push({ t: t, k: 'kick' });
        if (!intro && (s === 4 || s === 12)) ev.push({ t: t, k: 'snare' });
        if (s % 2 === 0) ev.push({ t: t, k: s === 14 && !intro ? 'ohat' : 'hat' });
        if (!intro && (s % 4 === 0 || (s === 10 && !four))) ev.push({ t: t, k: 'bass', m: chord - 12 + (s === 8 ? 12 : 0), d: step * 2 });
      }
      if (!intro) ev.push({ t: bt, k: 'pad', ms: [chord + 12, chord + 15 + (PROG[b % 4] === 8 || PROG[b % 4] === 3 || PROG[b % 4] === 10 ? 1 : 0), chord + 19], d: step * 16 });
      if (!intro && !outro && b >= 2) {
        var ph = plan[Math.floor((b - 2) / 2) % plan.length], half = (b - 2) % 2;
        ph.forEach(function (n) { if (Math.floor(n.s / 16) === half) { var tt = bt + (n.s - half * 16) * step; ev.push({ t: tt, k: 'lead', m: n.m, d: n.l * step }); mel.push({ t: tt, m: n.m, l: n.l, s: n.s % 16, bar: b }); } });
      }
    }
    ev.sort(function (a, c) { return a.t - c.t; });
    return { bpm: bpm, step: step, bars: bars, ev: ev, mel: mel, len: bars * 16 * step, kicks: ev.filter(function (e) { return e.k === 'kick' && e.t >= 2 * 16 * step; }) };
  }
  function makeChart(sg) {
    // 멜로디 음에서 노트를 뽑음: 음높이 → 레인, 긴 음 → 길게 누르기
    var list = [], lastT = [-9, -9, -9, -9], step = sg.step;
    var lo = 1e9, hi = -1e9; sg.mel.forEach(function (n) { lo = Math.min(lo, n.m); hi = Math.max(hi, n.m); });
    var prevLane = 1;
    sg.mel.forEach(function (n, i) {
      if (diff === 0 && n.s % 2) return; if (diff === 0 && i % 3 === 2) return; if (diff === 1 && n.s % 2 && Math.random() < 0.5) return;
      var lane = Math.min(3, Math.floor((n.m - lo) / Math.max(1, (hi - lo + 1)) * 4));
      if (i && n.m === sg.mel[i - 1].m) lane = prevLane;
      var gap = diff === 2 ? 1.5 : 2;
      if (n.t - lastT[lane] < step * gap) { var alt = [0, 1, 2, 3].filter(function (l) { return n.t - lastT[l] >= step * gap; }); if (!alt.length) return; lane = alt.reduce(function (a, b) { return Math.abs(b - lane) < Math.abs(a - lane) ? b : a; }); }
      var holdLen = n.l >= (diff === 0 ? 6 : 4) ? n.l * step * 0.85 : 0;
      list.push({ t: n.t, lane: lane, d: holdLen, st: 0 }); lastT[lane] = n.t + holdLen; prevLane = lane;
    });
    if (diff === 2) sg.kicks.forEach(function (k, i) {
      if (i % 2) return; var busy = list.some(function (n) { return Math.abs(n.t - k.t) < step * 0.6 && n.lane === 0 || (n.t <= k.t && n.t + n.d >= k.t && n.lane === 0); });
      if (!busy && k.t - lastT[0] >= step * 1.5 && k.t < sg.len - 16 * step) list.push({ t: k.t, lane: 0, d: 0, st: 0 });
    });
    return list.sort(function (a, b) { return a.t - b.t; });
  }

  // ---------- 시계 ----------
  function now() { return ac ? ac.currentTime - t0 : fallbackT; }
  function latency() { return ac ? (ac.outputLatency || ac.baseLatency || 0) : 0; }
  function inputTime(e) {
    var lag = e && e.timeStamp ? Math.max(0, Math.min(0.05, (performance.now() - e.timeStamp) / 1000)) : 0;
    return now() - lag - latency() - offset / 1000;
  }

  // ---------- 진행 ----------
  function reset() {
    audio();
    if (ac) { if (ac.state === 'suspended') ac.resume(); out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(A.isMuted() ? 0 : 0.6, ac.currentTime); }
    song = makeSong(); notes = makeChart(song); evIdx = 0; nIdx = 0;
    t0 = ac ? ac.currentTime + 0.4 : 0; fallbackT = -0.4;
    hold = [false, false, false, false]; holdNote = [null, null, null, null];
    score = 0; combo = 0; maxCombo = 0; hp = 100; nP = 0; nG = 0; nM = 0; judged = 0; phase = 'play'; judgeTxt = ''; judgeT = 0; lastBeat = -1; fx.clear(); hud();
  }
  function judge(kind, lane) {
    var x = LX + lane * LW + LW / 2;
    if (kind === 'P') { nP++; combo++; score += Math.round(300 * cmult()); hp = Math.min(100, hp + 2); judgeTxt = 'PERFECT'; fx.burst(x, JY, LANE_COL[lane], 14, 260, 0.35, 2.5); fx.ring(x, JY, LANE_COL[lane], 46, 0.25); }
    else if (kind === 'G') { nG++; combo++; score += Math.round(100 * cmult()); hp = Math.min(100, hp + 1); judgeTxt = 'GOOD'; fx.burst(x, JY, LANE_COL[lane], 7, 180, 0.3, 2); }
    else { nM++; combo = 0; hp -= 8; judgeTxt = 'MISS'; fx.text(x, JY - 40, 'miss', '#ff6b8a', 18); A.vibrate(25); }
    judged++; maxCombo = Math.max(maxCombo, combo); judgeT = 0.5;
    if (combo && combo % 50 === 0) { S.banner(combo + ' COMBO!', '배율 ×' + cmult().toFixed(1)); }
    if (hp <= 0 && phase === 'play') { hp = 0; end(false); }
    hud();
  }
  function cmult() { return Math.min(2, 1 + Math.floor(combo / 10) * 0.1); }
  function acc() { return judged ? Math.round((nP + nG * 0.5) / judged * 1000) / 10 : 100; }
  function press(lane, e) {
    if (S.state !== 'playing' || phase !== 'play') return;
    hold[lane] = true; laneFlash[lane] = 1;
    var t = inputTime(e), best = null, bd = 1;
    for (var i = nIdx; i < notes.length; i++) { var n = notes[i]; if (n.t - t > MISS) break; if (n.lane !== lane || n.st) continue; var d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } }
    if (!best || bd > MISS) return; // 노트가 없는 곳은 그냥 빈 탭
    if (bd <= PERFECT) judge('P', lane); else if (bd <= GOOD) judge('G', lane); else { best.st = 3; judge('M', lane); return; }
    best.st = best.d ? 1 : 2; if (best.d) holdNote[lane] = best;
  }
  function release(lane, e) {
    hold[lane] = false; var n = holdNote[lane]; holdNote[lane] = null;
    if (!n || n.st !== 1 || phase !== 'play') return;
    var t = inputTime(e);
    if (t >= n.t + n.d - 0.12) { n.st = 2; judge('P', lane); } else { n.st = 3; judge('M', lane); }
  }
  function end(clear) {
    phase = 'end';
    if (ac) { out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(out.gain.value, ac.currentTime); out.gain.linearRampToValueAtTime(0, ac.currentTime + (clear ? 1.5 : 0.4)); }
    if (!clear) A.sfx('over');
    setTimeout(function () {
      S.gameOver(score, [['정확도', acc() + '%'], ['최대 콤보', String(maxCombo)], ['PERFECT', String(nP)]], clear ? { win: true, title: nM === 0 ? '풀 콤보!' : '곡 클리어!' } : { title: '체력이 다 떨어졌어요' });
    }, clear ? 1200 : 500);
  }
  function schedule() {
    if (!ac || !song) return;
    var horizon = ac.currentTime - t0 + 0.25;
    while (evIdx < song.ev.length && song.ev[evIdx].t < horizon) { if (phase === 'play') play(song.ev[evIdx]); evIdx++; }
  }
  function update(dt) {
    tim += dt; fx.update(dt);
    if (ac && ac.state === 'suspended') ac.resume(); // 일시정지에서 돌아오면 음악·노트가 함께 다시 감
    if (ac) out.gain.value = A.isMuted() ? 0 : (phase === 'play' ? 0.6 : out.gain.value);
    if (!ac) fallbackT += dt;
    if (judgeT > 0) judgeT -= dt; for (var l = 0; l < 4; l++) laneFlash[l] = Math.max(0, laneFlash[l] - dt * 5);
    if (phase !== 'play') return;
    schedule();
    var t = now() - latency() - offset / 1000;
    // 놓친 노트·길게 누르기 끝
    for (var i = nIdx; i < notes.length; i++) {
      var n = notes[i]; if (n.t - t > 0.2) break;
      if (!n.st && t - n.t > MISS) { n.st = 3; judge('M', n.lane); }
      if (n.st === 1 && t >= n.t + n.d) { n.st = 2; holdNote[n.lane] = null; judge('P', n.lane); }
    }
    while (nIdx < notes.length && notes[nIdx].st >= 2 && notes[nIdx].t + notes[nIdx].d < t) nIdx++;
    // 박자 깜빡임(소리를 꺼도 박을 볼 수 있게)
    var beat = Math.floor(now() / (song.step * 4)); if (beat !== lastBeat && now() >= 0) { lastBeat = beat; beatFlash = beat % 4 === 0 ? 1 : 0.6; }
    beatFlash = Math.max(0, beatFlash - dt * 4);
    if (now() > song.len + 0.3 && phase === 'play') end(true);
  }
  function idle(dt) { tim += dt; fx.update(dt); if (ac && ac.state === 'running' && phase === 'play' && S.state === 'paused') ac.suspend(); }

  // ---------- 그리기 ----------
  function render(c, tt) {
    c.fillStyle = '#0b0412'; c.fillRect(0, 0, W, H);
    var o = fx.offset(); c.save(); c.translate(o[0], o[1]);
    var speed = [520, 640, 760][diff];
    // 레인
    for (var l = 0; l < 4; l++) {
      var x = LX + l * LW;
      var g = c.createLinearGradient(0, TOP, 0, JY); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, A.hexA(LANE_COL[l], 0.08 + laneFlash[l] * 0.22 + (hold[l] ? 0.12 : 0)));
      c.fillStyle = g; c.fillRect(x + 2, TOP, LW - 4, JY - TOP);
      c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x, TOP, 1, H - TOP - 20);
    }
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(LX + 4 * LW, TOP, 1, H - TOP - 20);
    // 판정선 + 박자 깜빡임
    c.fillStyle = 'rgba(255,94,196,' + (0.35 + beatFlash * 0.5) + ')'; c.fillRect(LX, JY - 3, LW * 4, 6);
    c.fillStyle = 'rgba(255,255,255,' + (0.2 + beatFlash * 0.4) + ')'; c.fillRect(LX, JY - 1, LW * 4, 2);
    // 노트
    if (notes && song) {
      var t = now() - latency() - offset / 1000;
      for (var i = nIdx; i < notes.length; i++) {
        var n = notes[i], y = JY - (n.t - t) * speed; if (y < TOP - 400) break;
        if (n.st === 2 || n.st === 3 && !n.d) continue;
        var nx = LX + n.lane * LW + 8, nw = LW - 16, col = LANE_COL[n.lane];
        if (n.d) {
          var y2 = JY - (n.t + n.d - t) * speed, yh = n.st === 1 ? JY : y;
          if (yh > TOP - 30) { c.fillStyle = A.hexA(col, n.st === 3 ? 0.12 : n.st === 1 ? 0.55 : 0.35); c.fillRect(nx + nw * 0.3, Math.max(TOP, y2), nw * 0.4, yh - Math.max(TOP, y2)); }
        }
        if (n.st === 1) continue;
        if (y > TOP - 20 && y < H) { c.globalAlpha = Math.min(1, (y - TOP + 20) / 60) * (n.st === 3 ? 0.3 : 1); c.fillStyle = col; A.rr(c, nx, y - 11, nw, 22, 9); c.fill(); c.fillStyle = 'rgba(255,255,255,.75)'; A.rr(c, nx + 6, y - 6, nw - 12, 5, 3); c.fill(); c.globalAlpha = 1; }
      }
    }
    // 레인 단추
    var touch = document.body.classList.contains('touch');
    for (l = 0; l < 4; l++) {
      var bx = LX + l * LW + 6;
      c.fillStyle = hold[l] ? LANE_COL[l] : A.hexA(LANE_COL[l], 0.16); A.rr(c, bx, JY + 26, LW - 12, 90, 16); c.fill();
      c.fillStyle = hold[l] ? '#0b0412' : LANE_COL[l]; c.font = '900 26px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(touch ? '●' : 'DFJK'.charAt(l), bx + (LW - 12) / 2, JY + 72);
    }
    // 판정 글자·콤보·체력
    if (judgeT > 0) { c.globalAlpha = Math.min(1, judgeT * 3); c.fillStyle = judgeTxt === 'PERFECT' ? '#ffd166' : judgeTxt === 'GOOD' ? '#7dff9b' : '#ff6b8a'; c.font = '900 ' + (34 + judgeT * 10) + 'px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText(judgeTxt, W / 2, 470); c.globalAlpha = 1; }
    if (combo >= 5) { c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '900 54px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText(String(combo), W / 2, 400); c.font = '700 14px "Pretendard Variable",system-ui'; c.fillText('COMBO', W / 2, 432); }
    c.fillStyle = 'rgba(255,255,255,.08)'; A.rr(c, LX, TOP - 22, LW * 4, 10, 5); c.fill();
    c.fillStyle = hp > 30 ? '#ff5ec4' : '#ff4d4d'; A.rr(c, LX, TOP - 22, LW * 4 * Math.max(0, hp) / 100, 10, 5); c.fill();
    // 곡 진행·보정
    if (song) {
      var p = A.clamp(now() / song.len, 0, 1); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(LX, TOP - 6, LW * 4 * p, 2);
      c.textAlign = 'right'; c.fillStyle = 'rgba(255,220,240,.6)'; c.font = '700 13px "Pretendard Variable",system-ui'; c.fillText(song.bpm + ' BPM', LX + LW * 4, TOP - 32);
      if (now() < song.step * 32 && S.state === 'playing') {
        var cnt = Math.ceil((song.step * 32 - now()) / (song.step * 4));
        c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = '900 64px "Pretendard Variable",system-ui'; c.fillText(cnt > 4 ? 'READY' : String(cnt), W / 2, 300);
        drawOffset(c);
      }
    }
    c.textBaseline = 'alphabetic';
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var OB = [{ k: -10, x: 90, y: 560, w: 110, h: 54 }, { k: 10, x: 340, y: 560, w: 110, h: 54 }];
  function drawOffset(c) {
    c.fillStyle = 'rgba(0,0,0,.55)'; A.rr(c, 70, 510, 400, 120, 18); c.fill();
    c.fillStyle = 'rgba(255,220,240,.8)'; c.font = '700 15px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('박자 보정 (소리가 늦게 들리면 +)', W / 2, 536);
    OB.forEach(function (b) { c.fillStyle = 'rgba(255,94,196,.25)'; A.rr(c, b.x, b.y, b.w, b.h, 12); c.fill(); c.fillStyle = '#fff'; c.font = '800 20px "Pretendard Variable",system-ui'; c.fillText((b.k > 0 ? '+' : '−') + '10ms', b.x + b.w / 2, b.y + b.h / 2 + 1); });
    c.fillStyle = '#ffd166'; c.font = '900 24px "Pretendard Variable",system-ui'; c.fillText((offset > 0 ? '+' : '') + offset + 'ms', W / 2, 588);
    if (!document.body.classList.contains('touch')) { c.fillStyle = 'rgba(255,255,255,.45)'; c.font = '700 12px "Pretendard Variable",system-ui'; c.fillText('[ ] 키로도 조절', W / 2, 618); }
  }
  function setOffset(v) { offset = A.clamp(v, -200, 200); A.set('neowa_rhythm_offset', offset); A.sfx('tick'); }
  var lastHud = '';
  function hud() {
    var k = score + '|' + combo + '|' + acc(); if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = combo; document.getElementById('hC').textContent = acc() + '%';
    document.getElementById('hMult').textContent = cmult() > 1 ? '×' + cmult().toFixed(1) : '';
  }

  // ---------- 입력: 멀티터치 + D F J K ----------
  var stage = document.getElementById('stage'), ptr = {};
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    if (song && now() < song.step * 32) for (var i = 0; i < OB.length; i++) { var b = OB[i]; if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { setOffset(offset + b.k); return; } }
    var lane = Math.floor((p.x - LX) / LW); if (lane < 0 || lane > 3 || p.y < TOP) return;
    e.preventDefault(); ptr[e.pointerId] = lane; press(lane, e);
  });
  function up(e) { var lane = ptr[e.pointerId]; if (lane == null) return; delete ptr[e.pointerId]; var still = false; for (var k in ptr) if (ptr[k] === lane) still = true; if (!still) release(lane, e); }
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  // F는 원래 전체 화면 단축키라서, 게임 중에는 먼저 가로챔
  window.addEventListener('keydown', function (e) {
    if (S.state !== 'playing' || e.ctrlKey || e.metaKey || e.altKey) return;
    var lane = KEYS[e.code];
    if (lane != null) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) press(lane, e); return; }
    if (e.key === '[' || e.key === ']') { e.preventDefault(); setOffset(offset + (e.key === ']' ? 5 : -5)); }
  }, true);
  window.addEventListener('keyup', function (e) { var lane = KEYS[e.code]; if (lane != null) release(lane, e); });
  window.addEventListener('blur', function () { for (var l = 0; l < 4; l++) if (hold[l]) release(l); ptr = {}; });
  Array.prototype.forEach.call(document.querySelectorAll('.k-only'), function (el) { var k = el.querySelector('kbd'); if (k && k.textContent === 'P' && /전체/.test(el.textContent)) el.innerHTML = '<kbd>P</kbd> 일시정지 <kbd>M</kbd> 소리 · 전체 화면은 위 단추'; });
  var dbtns = document.querySelectorAll('[data-diff]');
  function paintDiff() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_rhythm_diff', diff); A.sfx('click'); paintDiff(); }); });
  paintDiff();
  var S = new A.Shell({ id: 'rhythm', W: W, H: H, reset: reset, update: update, idle: idle, render: render });
})();
