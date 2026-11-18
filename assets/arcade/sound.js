/* 너와 아케이드: 사운드 엔진 (효과음 + 배경음악)
   - 음원 파일 없이 브라우저(Web Audio API)가 그 자리에서 소리를 만듭니다. 저작권 걱정이 없습니다.
   - arcade.js 가 이 파일을 불러와 Arcade.sfx / Arcade.music 을 채웁니다.
   - 배경음악은 게임마다 다른 곡이 자동으로 만들어집니다(게임 id로 정해지는 '씨앗'으로 작곡).
   - 휴대폰은 첫 터치 전에는 소리를 낼 수 없습니다. 첫 터치·클릭·키 입력 때 자동으로 켭니다.
   - 저장 키: neowa_mute(전체 끔), neowa_vol_sfx(효과음 0~100), neowa_vol_bgm(배경음악 0~100)
   쓰는 법은 docs/GAME_GUIDE.md 4-3 을 보세요. */
(function () {
  'use strict';
  var A = window.Arcade; if (!A) return;

  /* ---------- 설정 ---------- */
  function num(k, d) { var v = parseInt(A.get(k, String(d)), 10); return isNaN(v) ? d : Math.max(0, Math.min(100, v)); }
  var muted = A.get('neowa_mute', '0') === '1';
  var volSfx = num('neowa_vol_sfx', 80), volBgm = num('neowa_vol_bgm', 50);

  /* ---------- 소리 장치 ---------- */
  var ac = null, master, sfxBus, musBus, musDuck, musTone, revIn, dlyIn, noiseBuf, pulse = {};
  function curve(v) { return Math.pow(v / 100, 1.6); } // 사람 귀에 맞춘 볼륨 곡선
  function build() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ac = new C({ latencyHint: 'interactive' }); } catch (e) { try { ac = new C(); } catch (e2) { return null; } }
    master = ac.createGain(); master.gain.value = muted ? 0 : 1;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.42 * curve(volSfx) / curve(80); sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = 0.36 * curve(volBgm) / curve(50);
    musDuck = ac.createGain(); musTone = ac.createBiquadFilter(); musTone.type = 'lowpass'; musTone.frequency.value = 18000; musTone.Q.value = 0.4;
    musBus.connect(musDuck); musDuck.connect(musTone); musTone.connect(master);
    // 잔향(리버브): 즉석으로 만든 울림 응답
    var rev = ac.createConvolver(), len = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    rev.buffer = ir; revIn = ac.createGain(); revIn.gain.value = 0.32;
    var revLp = ac.createBiquadFilter(); revLp.type = 'lowpass'; revLp.frequency.value = 5200;
    revIn.connect(revLp); revLp.connect(rev); rev.connect(master);
    // 메아리(딜레이): 배경음악 멜로디용
    dlyIn = ac.createGain(); dlyIn.gain.value = 0.22;
    var dly = ac.createDelay(1), fb = ac.createGain(), dlp = ac.createBiquadFilter();
    dly.delayTime.value = 0.33; fb.gain.value = 0.32; dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(musDuck);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var nd = noiseBuf.getChannelData(0); for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // 옛 게임기 느낌의 펄스파(폭 12.5%·25%)
    [0.125, 0.25].forEach(function (w) {
      var n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (var k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * w);
      pulse[w] = ac.createPeriodicWave(re, im);
    });
    return ac;
  }
  function audio() {
    if (!ac && !build()) return null;
    if (ac.state === 'suspended' && !document.hidden) { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  // 휴대폰 자동재생 제한: 첫 사용자 동작 때 켜고, iOS용으로 무음 한 번 재생
  var unlocked = false;
  function unlock() {
    if (muted) return;
    var c = audio(); if (!c) return;
    if (!unlocked) {
      unlocked = true;
      try { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
    }
  }
  ['pointerdown', 'touchend', 'keydown', 'mousedown'].forEach(function (ev) { window.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () {
    if (!ac) return;
    if (document.hidden) { try { ac.suspend(); } catch (e) {} }
    else if (!muted) { try { ac.resume(); } catch (e) {} if (M.on) M.next = Math.max(M.next, ac.currentTime + 0.06); }
  });

  /* ---------- 공통 부품 ---------- */
  var voices = 0, MAXV = 40;
  function track(src, t) { voices++; src.onended = function () { voices--; }; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function noiseSrc(t, rate) { var s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; if (rate) s.playbackRate.value = rate; s.start(t, Math.random() * 0.9); return s; }
  function panTo(node, p) {
    if (!p || !ac.createStereoPanner) return node;
    var pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, p)); node.connect(pn); return pn;
  }
  function setWave(o, w) { if (w === 'p1' || w === 'p2') o.setPeriodicWave(pulse[w === 'p1' ? 0.125 : 0.25]); else o.type = w || 'square'; }

  /* ---------- 효과음 ----------
     한 소리는 여러 '음'의 묶음입니다. 음 하나의 값:
       w 파형(sine/square/triangle/sawtooth/p1/p2), f 시작 높이(Hz), f2 끝 높이, d 길이(초), v 크기, at 시작 지연
       n:1 잡음(바람·폭발·타격), ft 잡음 필터(lowpass/bandpass/highpass), q 필터 날카로움
       fm 종소리 배율(값을 주면 FM 합성: 3.5=종, 1=전자피아노), mi 종소리 세기, a 올라오는 시간, r 잔향 양(0~1) */
  function tone(o, p, pan) {
    var t = ac.currentTime + 0.005 + (o.at || 0), d = o.d || 0.1, v = o.v || 0.2, a = o.a || 0.005;
    var g = ac.createGain(), src, mod;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(d, a + 0.01));
    if (o.n) {
      src = noiseSrc(t);
      var f = ac.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.Q.value = o.q || (o.ft === 'bandpass' ? 1.4 : 0.7);
      f.frequency.setValueAtTime(o.f * p, t);
      if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2 * p, t + d);
      src.connect(f); f.connect(g);
    } else {
      src = ac.createOscillator(); setWave(src, o.fm ? 'sine' : o.w);
      src.frequency.setValueAtTime(o.f * p, t);
      if (o.f2) src.frequency.exponentialRampToValueAtTime(o.f2 * p, t + d);
      if (o.fm) {
        mod = ac.createOscillator(); var mg = ac.createGain();
        mod.frequency.setValueAtTime(o.f * p * o.fm, t);
        mg.gain.setValueAtTime(o.f * p * (o.mi || 2), t); mg.gain.exponentialRampToValueAtTime(o.f * p * 0.05, t + d);
        mod.connect(mg); mg.connect(src.frequency); mod.start(t); mod.stop(t + d + 0.05);
      }
      src.connect(g);
    }
    var out = panTo(g, pan);
    out.connect(sfxBus);
    var r = o.r == null ? 0.18 : o.r;
    if (r > 0) { var sg = ac.createGain(); sg.gain.value = r; out.connect(sg); sg.connect(revIn); }
    src.start(t); src.stop(t + d + 0.05); track(src);
  }
  // 음계 도우미
  var N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, D6: 1175, E6: 1319, G6: 1568, C7: 2093 };
  var SFX = {
    // ----- 액션 -----
    shoot: [{ w: 'square', f: 1400, f2: 500, d: 0.05, v: 0.03, r: 0.05 }, { n: 1, ft: 'highpass', f: 3500, d: 0.03, v: 0.025, r: 0 }],
    laser: [{ w: 'sawtooth', f: 1800, f2: 180, d: 0.14, v: 0.06 }, { w: 'square', f: 900, f2: 120, d: 0.12, v: 0.03 }],
    hit: [{ w: 'square', f: 420, f2: 160, d: 0.06, v: 0.075 }, { n: 1, ft: 'bandpass', f: 1800, d: 0.04, v: 0.1, r: 0.05 }],
    boom: [{ n: 1, f: 2400, f2: 90, d: 0.34, v: 0.3, r: 0.3 }, { w: 'sine', f: 150, f2: 40, d: 0.3, v: 0.32, r: 0 }],
    bigboom: [{ n: 1, f: 3000, f2: 60, d: 0.95, v: 0.42, r: 0.4 }, { w: 'sine', f: 110, f2: 28, d: 0.85, v: 0.45, r: 0 }, { w: 'sawtooth', f: 220, f2: 40, d: 0.5, v: 0.1, at: 0.05 }, { n: 1, ft: 'bandpass', f: 600, f2: 120, d: 1.2, v: 0.12, at: 0.1, r: 0.5 }],
    hurt: [{ w: 'sawtooth', f: 300, f2: 60, d: 0.35, v: 0.2 }, { n: 1, f: 1200, f2: 100, d: 0.3, v: 0.24 }, { w: 'square', f: 150, f2: 70, d: 0.25, v: 0.06 }],
    power: [{ w: 'triangle', f: 523, f2: 1046, d: 0.12, v: 0.2 }, { w: 'triangle', f: 784, f2: 1568, d: 0.16, v: 0.18, at: 0.08 }, { fm: 3.5, mi: 1.5, f: 2093, d: 0.45, v: 0.05, at: 0.12, r: 0.4 }],
    charge: [{ w: 'sawtooth', f: 180, f2: 900, d: 0.45, v: 0.05, a: 0.35 }, { w: 'sine', f: 360, f2: 1800, d: 0.45, v: 0.06, a: 0.35 }],
    whoosh: [{ n: 1, ft: 'bandpass', f: 400, f2: 2800, d: 0.2, v: 0.2, a: 0.07, q: 2, r: 0.1 }],
    jump: [{ w: 'p2', f: 280, f2: 720, d: 0.13, v: 0.09, r: 0.08 }, { w: 'sine', f: 280, f2: 720, d: 0.13, v: 0.12, r: 0 }],
    land: [{ w: 'sine', f: 180, f2: 60, d: 0.12, v: 0.26, r: 0 }, { n: 1, f: 900, f2: 200, d: 0.08, v: 0.1, r: 0 }],
    drop: [{ w: 'sine', f: 140, f2: 50, d: 0.18, v: 0.3, r: 0 }, { n: 1, ft: 'lowpass', f: 1200, f2: 200, d: 0.1, v: 0.14, r: 0.1 }],
    step: [{ w: 'triangle', f: 700, d: 0.02, v: 0.05, r: 0 }],
    splash: [{ n: 1, ft: 'bandpass', f: 1400, f2: 300, d: 0.28, v: 0.22, q: 1, r: 0.2 }, { w: 'sine', f: 380, f2: 900, d: 0.08, v: 0.08 }],
    puck: [{ w: 'triangle', f: 900, f2: 500, d: 0.045, v: 0.24, r: 0.05 }, { n: 1, ft: 'highpass', f: 2500, d: 0.02, v: 0.14, r: 0 }],
    warn: [{ w: 'square', f: 880, d: 0.1, v: 0.06 }, { w: 'square', f: 880, d: 0.1, v: 0.06, at: 0.16 }],
    // ----- 점수·보상 -----
    coin: [{ w: 'square', f: 988, d: 0.06, v: 0.08 }, { w: 'square', f: 1319, d: 0.14, v: 0.08, at: 0.06 }],
    eat: [{ w: 'triangle', f: 660, f2: 990, d: 0.08, v: 0.24 }, { w: 'sine', f: 1320, f2: 1980, d: 0.05, v: 0.05 }],
    gold: [{ w: 'triangle', f: 784, d: 0.07, v: 0.19 }, { w: 'triangle', f: 988, d: 0.07, v: 0.19, at: 0.07 }, { w: 'triangle', f: 1319, d: 0.16, v: 0.19, at: 0.14 }, { fm: 3.5, mi: 1.6, f: 2637, d: 0.5, v: 0.04, at: 0.14, r: 0.45 }],
    combo: [{ w: 'triangle', f: 988, d: 0.06, v: 0.17 }, { w: 'triangle', f: 1319, d: 0.06, v: 0.17, at: 0.05 }, { w: 'triangle', f: 1760, d: 0.14, v: 0.17, at: 0.1 }, { fm: 3.5, mi: 1.5, f: 3520, d: 0.35, v: 0.035, at: 0.1, r: 0.4 }],
    match: [{ w: 'triangle', f: 880, d: 0.08, v: 0.15 }, { w: 'triangle', f: 1109, d: 0.08, v: 0.15, at: 0.06 }, { w: 'triangle', f: 1319, d: 0.18, v: 0.15, at: 0.12 }, { fm: 3.5, mi: 2, f: 2637, d: 0.45, v: 0.045, at: 0.12, r: 0.4 }],
    line: [{ w: 'sawtooth', f: 400, f2: 1600, d: 0.2, v: 0.05 }, { fm: 3.5, mi: 1.5, f: 1568, d: 0.5, v: 0.07, at: 0.1, r: 0.4 }, { fm: 3.5, mi: 1.5, f: 2093, d: 0.5, v: 0.06, at: 0.16, r: 0.4 }],
    ding: [{ fm: 3.5, mi: 2.5, f: 1320, d: 0.75, v: 0.11, r: 0.4 }],
    right: [{ w: 'sine', f: N.G5, d: 0.09, v: 0.19 }, { w: 'sine', f: N.D6, d: 0.22, v: 0.19, at: 0.08 }, { fm: 1, mi: 1, f: N.D6, d: 0.3, v: 0.05, at: 0.08 }],
    wrong: [{ w: 'p2', f: 196, d: 0.12, v: 0.08, r: 0.05 }, { w: 'p2', f: 165, d: 0.24, v: 0.08, at: 0.12, r: 0.05 }],
    pop: [{ w: 'sine', f: 500, f2: 1500, d: 0.06, v: 0.22, r: 0.1 }, { n: 1, ft: 'highpass', f: 3000, d: 0.02, v: 0.07, r: 0 }],
    // ----- 퍼즐·보드·카드 -----
    place: [{ w: 'triangle', f: 1900, f2: 1100, d: 0.04, v: 0.12, r: 0.05 }, { n: 1, ft: 'bandpass', f: 2600, d: 0.035, v: 0.26, q: 2, r: 0.1 }, { w: 'sine', f: 220, f2: 120, d: 0.09, v: 0.2, r: 0 }],
    flip: [{ n: 1, ft: 'bandpass', f: 3200, f2: 1500, d: 0.05, v: 0.24, q: 1.2, r: 0.05 }, { w: 'triangle', f: 1200, f2: 800, d: 0.03, v: 0.04, r: 0 }],
    deal: [{ n: 1, ft: 'bandpass', f: 1600, f2: 5000, d: 0.12, v: 0.18, a: 0.02, q: 1, r: 0.05 }],
    chip: [{ w: 'triangle', f: 3200, d: 0.03, v: 0.07, r: 0.05 }, { w: 'triangle', f: 2700, d: 0.05, v: 0.06, at: 0.04, r: 0.1 }],
    slide: [{ n: 1, ft: 'lowpass', f: 1800, f2: 600, d: 0.07, v: 0.11, r: 0.03 }, { w: 'sine', f: 300, f2: 260, d: 0.05, v: 0.05, r: 0 }],
    select: [{ w: 'sine', f: 1200, f2: 1400, d: 0.035, v: 0.07, r: 0.05 }],
    tap: [{ w: 'sine', f: 660, f2: 520, d: 0.045, v: 0.11, r: 0.05 }],
    // ----- 기본 -----
    bounce: [{ w: 'sine', f: 420, f2: 380, d: 0.07, v: 0.21 }, { w: 'triangle', f: 840, f2: 760, d: 0.04, v: 0.04 }],
    wall: [{ w: 'sine', f: 260, f2: 240, d: 0.05, v: 0.11, r: 0.05 }],
    brick: [{ w: 'square', f: 660, f2: 640, d: 0.07, v: 0.09 }, { n: 1, ft: 'bandpass', f: 3000, d: 0.03, v: 0.06, r: 0 }],
    steel: [{ w: 'triangle', f: 1800, f2: 1700, d: 0.08, v: 0.11 }, { fm: 3.5, mi: 1, f: 1800, d: 0.25, v: 0.03, r: 0.3 }],
    turn: [{ w: 'sine', f: 300, d: 0.03, v: 0.055, r: 0 }],
    count: [{ w: 'sine', f: 660, d: 0.12, v: 0.18 }, { w: 'p2', f: 660, d: 0.06, v: 0.03 }],
    go: [{ w: 'sine', f: 1320, d: 0.3, v: 0.2 }, { w: 'p2', f: 1320, d: 0.1, v: 0.05 }],
    start: [{ w: 'p2', f: 523, d: 0.08, v: 0.1 }, { w: 'p2', f: 659, d: 0.08, v: 0.1, at: 0.08 }, { w: 'p2', f: 784, d: 0.08, v: 0.1, at: 0.16 }, { w: 'p2', f: 1046, d: 0.22, v: 0.1, at: 0.24 }, { fm: 3.5, mi: 1.5, f: 2093, d: 0.5, v: 0.04, at: 0.24, r: 0.4 }],
    level: [{ w: 'triangle', f: 523, d: 0.1, v: 0.19 }, { w: 'triangle', f: 659, d: 0.1, v: 0.19, at: 0.1 }, { w: 'triangle', f: 784, d: 0.1, v: 0.19, at: 0.2 }, { w: 'triangle', f: 1046, d: 0.32, v: 0.21, at: 0.3 }, { fm: 3.5, mi: 1.5, f: 2093, d: 0.6, v: 0.05, at: 0.3, r: 0.45 }],
    win: [{ w: 'p2', f: N.C5, d: 0.12, v: 0.08 }, { w: 'p2', f: N.E5, d: 0.12, v: 0.08, at: 0.12 }, { w: 'p2', f: N.G5, d: 0.12, v: 0.08, at: 0.24 }, { w: 'p2', f: N.C6, d: 0.6, v: 0.09, at: 0.36 }, { w: 'triangle', f: N.C4, d: 0.8, v: 0.2, at: 0.36 }, { w: 'triangle', f: N.G4, d: 0.8, v: 0.12, at: 0.36 }, { fm: 3.5, mi: 1.8, f: N.C7, d: 1, v: 0.05, at: 0.36, r: 0.5 }],
    over: [{ w: 'p2', f: 392, d: 0.16, v: 0.1 }, { w: 'p2', f: 330, d: 0.16, v: 0.1, at: 0.16 }, { w: 'p2', f: 262, d: 0.16, v: 0.1, at: 0.32 }, { w: 'sawtooth', f: 196, f2: 98, d: 0.55, v: 0.1, at: 0.48, r: 0.3 }],
    record: [{ w: 'p2', f: 784, d: 0.08, v: 0.09 }, { w: 'p2', f: 988, d: 0.08, v: 0.09, at: 0.09 }, { w: 'p2', f: 1175, d: 0.08, v: 0.09, at: 0.18 }, { w: 'p2', f: 1568, d: 0.34, v: 0.09, at: 0.27 }, { w: 'triangle', f: 392, d: 0.6, v: 0.16, at: 0.27 }, { fm: 3.5, mi: 1.8, f: 3136, d: 0.8, v: 0.04, at: 0.27, r: 0.5 }],
    click: [{ w: 'sine', f: 880, d: 0.04, v: 0.09, r: 0.05 }],
    tick: [{ w: 'square', f: 1200, d: 0.02, v: 0.028, r: 0 }]
  };
  SFX.error = SFX.wrong; SFX.correct = SFX.right; SFX.lose = SFX.over; SFX.card = SFX.flip; SFX.stone = SFX.place;
  // 음높이 흔들림이 없어야 하는 '음악적' 소리(멜로디가 틀어지지 않게)
  var TUNED = { coin: 1, gold: 1, combo: 1, match: 1, line: 1, right: 1, start: 1, level: 1, win: 1, over: 1, record: 1, count: 1, go: 1, ding: 1, power: 1 };
  // 음악을 잠깐 줄이는 소리(크게 터지는 순간이 더 크게 느껴지게)
  var DUCK = { bigboom: [0.35, 0.7], hurt: [0.5, 0.45], boom: [0.75, 0.25], level: [0.5, 0.8], win: [0.3, 1.4], record: [0.3, 1.2], over: [0.2, 1.0], gold: [0.8, 0.4], line: [0.7, 0.6] };

  var lastPlay = {};
  A.sfx = function (name, pitch, pan) {
    if (muted || volSfx <= 0) return;
    var list = SFX[name]; if (!list) return;
    var now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 30) return; // 같은 소리 겹침 방지
    lastPlay[name] = now;
    if (!unlocked || !audio()) return;
    if (voices > MAXV && !TUNED[name]) return; // 소리가 너무 많이 겹치면 작은 소리는 생략
    var p = (pitch || 1) * (TUNED[name] ? 1 : 1 + (Math.random() - 0.5) * 0.04);
    try { for (var i = 0; i < list.length; i++) tone(list[i], p, pan); } catch (e) {}
    if (DUCK[name]) duck(DUCK[name][0], DUCK[name][1]);
    if (name === 'level') M.levelUp();
  };
  A.sfx.add = function (name, notes) { SFX[name] = notes; }; // 게임 전용 소리 추가
  A.sfx.list = function () { return Object.keys(SFX); };
  function duck(to, dur) {
    if (!ac || !M.on) return;
    var t = ac.currentTime, g = musDuck.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(to, t + 0.03); g.linearRampToValueAtTime(1, t + 0.03 + dur);
  }

  /* ---------- 배경음악: 즉석 작곡 ----------
     곡의 뼈대(스타일) + 게임 id로 정해지는 씨앗 → 조성·빠르기·멜로디가 게임마다 달라집니다.
     4마디 화음 진행 × A/B 두 부분, 2마디짜리 주제 선율을 반복·변형해 귀에 남게 만듭니다. */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var SC = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10], harm: [0, 2, 3, 5, 7, 8, 11] };
  /* 스타일 표
     kick/snare/hat: 16칸 리듬(x 세게, o 약하게) · bass: r 근음, o 옥타브 위, f 5도, t 3도, a 다음 화음으로 다가가는 음, - 늘임
     arp: 화음 음 번호(0~3) · prog: 마디별 화음(음계 몇 번째 음 위의 화음) */
  var STY = {
    synth: { bpm: 124, scale: 'minor', roots: [45, 47, 48, 50], prog: [[0, 5, 2, 6], [3, 4, 0, 0], [0, 6, 5, 4]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hat2: 'oxoxoxoxoxoxoxox', bass: 'r.r.o.r.r.r.o.r.', bw: 'sawtooth', bcut: 700, arp: '0.1.2.3.2.1.0.1.', aw: 'sawtooth', acut: 1800, pad: 'saw', lead: ['saw', 'p2'], dens: 0.7, six: 0.25, oct: 24, sev: false, gain: 1 },
    chip: { bpm: 138, scale: 'major', roots: [48, 50, 52, 53], prog: [[0, 4, 5, 3], [0, 3, 4, 4], [5, 3, 0, 4]], kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hat2: 'xxxxxxxxxxxxxxxx', bass: 'r.o.f.o.r.o.f.o.', bw: 'triangle', bcut: 0, arp: '0.2.1.2.0.2.1.2.', aw: 'p1', acut: 0, pad: '', lead: ['p2', 'p1'], dens: 0.85, six: 0.3, oct: 24, sev: false, chipdrum: true, gain: 0.85 },
    drive: { bpm: 150, scale: 'minor', roots: [45, 47, 50, 52], prog: [[0, 5, 6, 0], [3, 4, 5, 6], [0, 2, 3, 4]], kick: 'x.x...x.x.x...x.', snare: '....x.......x...', hat: 'xoxoxoxoxoxoxoxo', hat2: 'xxxxxxxxxxxxxxxx', bass: 'r.rr.rr.r.rr.rr.', bw: 'sawtooth', bcut: 900, arp: '0..1..2.0..1..2.', aw: 'square', acut: 2400, pad: 'saw', lead: ['saw', 'square'], dens: 0.75, six: 0.35, oct: 24, sev: false, gain: 0.95 },
    space: { bpm: 96, scale: 'dorian', roots: [45, 47, 50], prog: [[0, 3, 0, 3], [5, 6, 0, 0], [0, 3, 5, 4]], kick: 'x.........x.....', snare: '........x.......', hat: '....o.......o..o', hat2: '..o...o...o...o.', bass: 'r-------f-------', bw: 'sine', bcut: 0, arp: '0123012301230123', aw: 'triangle', acut: 3000, pad: 'saw', lead: ['bell', 'tri'], dens: 0.45, six: 0.1, oct: 24, sev: true, gain: 0.9 },
    puzzle: { bpm: 86, scale: 'major', roots: [48, 50, 53, 55], prog: [[3, 4, 2, 5], [0, 5, 3, 4], [1, 4, 0, 0]], kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.xox.xox.xox.xo', hat2: 'x.xox.xox.xox.xo', bass: 'r-....f.r-..o.f.', bw: 'sine', bcut: 0, arp: '0...2...1...3...', aw: 'ep', acut: 0, pad: 'soft', lead: ['ep', 'tri'], dens: 0.5, six: 0.1, oct: 24, sev: true, swing: 0.18, brush: true, gain: 0.85 },
    zen: { bpm: 72, scale: 'major', roots: [48, 50, 53], prog: [[0, 3, 0, 4], [5, 3, 0, 4], [0, 5, 3, 4]], kick: '', snare: '', hat: '', hat2: '........o.......', bass: 'r---------------', bw: 'sine', bcut: 0, arp: '0...1...2...1...', aw: 'bell', acut: 0, pad: 'soft', lead: ['bell', 'ep'], dens: 0.35, six: 0, oct: 24, sev: true, penta: true, gain: 0.75 },
    casino: { bpm: 112, scale: 'major', roots: [48, 50, 53], prog: [[1, 4, 0, 5], [1, 4, 0, 0], [3, 4, 2, 5]], kick: 'x.......x.......', snare: '....o.......o...', hat: 'x..ox..ox..ox..o', hat2: 'x..ox..ox..ox..o', bass: 'r...t...f...a...', bw: 'triangle', bcut: 900, arp: '..1...2...1...3.', aw: 'ep', acut: 0, pad: '', lead: ['ep', 'tri'], dens: 0.55, six: 0.1, oct: 24, sev: true, swing: 0.3, brush: true, gain: 0.85 },
    brain: { bpm: 128, scale: 'major', roots: [48, 50, 52, 55], prog: [[0, 5, 3, 4], [3, 0, 4, 5], [0, 4, 5, 3]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '.x.x.x.x.x.x.x.x', hat2: 'xxxxxxxxxxxxxxxx', bass: 'r.r.o.r.r.r.o.r.', bw: 'square', bcut: 800, arp: '0.1.2.1.0.1.2.1.', aw: 'p2', acut: 3000, pad: '', lead: ['tri', 'p2'], dens: 0.6, six: 0.2, oct: 24, sev: false, gain: 0.75 },
    sport: { bpm: 118, scale: 'mixo', roots: [48, 50, 52], prog: [[0, 6, 3, 0], [3, 3, 0, 4], [0, 6, 5, 4]], kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hat2: 'xxxxxxxxxxxxxxxx', bass: 'r..r..o.r..f..o.', bw: 'sawtooth', bcut: 1100, arp: '0.0.1.0.2.0.1.0.', aw: 'square', acut: 2200, pad: '', lead: ['square', 'saw'], dens: 0.7, six: 0.3, oct: 24, sev: false, clap: true, gain: 0.9 }
  };
  // 게임별 곡 스타일 (새 게임은 아래에 한 줄 추가. 없으면 id로 자동 선택)
  var GAME = {
    shooting: 'synth', snake: 'chip', breakout: 'synth', runner: 'drive', tower: 'chip', orbit: 'space', dodge: 'synth', blocks: 'puzzle',
    mines: 'zen', sudoku: 'zen', cave: 'space', ring: 'brain', archery: 'sport', lanes: 'drive', gravity: 'synth', rocks: 'space',
    slash: 'drive', hockey: 'sport', keeper: 'sport', whack: 'chip', racer: 'drive', fishy: 'puzzle', defense: 'drive', survivor: 'synth',
    maze: 'space', jumper: 'chip', artillery: 'sport', pinball: 'synth', slide: 'puzzle', lights: 'puzzle', gems: 'puzzle', memory: 'puzzle',
    sequence: 'zen', pipes: 'puzzle', nonogram: 'zen', bubbles: 'chip', flood: 'puzzle', pairs: 'puzzle', dots: 'zen', gomoku: 'zen',
    reversi: 'zen', solitaire: 'casino', blackjack: 'casino', baseball: 'casino', reaction: 'brain', math: 'brain', stroop: 'brain',
    aim: 'brain', oddcolor: 'brain', schulte: 'brain', baduk: 'zen', fall: 'chip', _template: 'chip'
  };
  // 집중이 필요한 게임은 음악을 조금 작게
  var SOFT = { reaction: 0.6, sequence: 0.6, baduk: 0.8, stroop: 0.8, math: 0.85 };

  function makeSong(id, styleName) {
    var st = STY[styleName] || STY.chip, R = rng(hash('neowa:' + id));
    var s = { id: id, st: st, scale: SC[st.scale], root: st.roots[Math.floor(R() * st.roots.length)], bpm: st.bpm + Math.round((R() - 0.5) * 10) };
    var progs = st.prog.slice().sort(function () { return R() - 0.5; });
    s.progA = progs[0]; s.progB = progs[1];
    s.leadW = st.lead[Math.floor(R() * st.lead.length)];
    function motif(seedOff) {
      var r = rng(hash(id + ':m' + seedOff)), out = [], prev = [2, 4, 0, 7][Math.floor(r() * 4)], chordT = st.penta ? [0, 2, 4, 7, 9] : [0, 2, 4, 7];
      for (var i = 0; i < 32; i++) {
        var strong = i % 4 === 0, half = i % 2 === 0;
        var pr = (strong ? 0.85 : half ? 0.5 : 0.14 * (st.six * 3)) * st.dens * (i >= 28 ? 0.6 : 1);
        if (i === 0) pr = 1;
        if (r() > pr) continue;
        var off;
        if (strong) { off = chordT[0]; var best = 99; chordT.forEach(function (c) { var dd = Math.abs(c - prev) + r() * 2.5; if (dd < best) { best = dd; off = c; } }); }
        else off = prev + (r() < 0.5 ? -1 : 1) * (r() < 0.8 ? 1 : 2);
        off = Math.max(-2, Math.min(9, off));
        out.push({ s: i, o: off, l: 1 }); prev = off;
      }
      for (var k = 0; k < out.length; k++) { var nx = k + 1 < out.length ? out[k + 1].s : 32; out[k].l = Math.max(1, Math.min(st.dens < 0.5 ? 6 : 3, nx - out[k].s)); }
      return out;
    }
    s.m = [motif(1), motif(2), motif(3), motif(4)];
    // 마무리 변형: 마지막 음을 으뜸음으로
    s.mEnd = s.m[0].map(function (n) { return { s: n.s, o: n.o, l: n.l }; });
    var last = s.mEnd[s.mEnd.length - 1]; if (last) { last.o = 0; last.l = Math.max(last.l, 4); }
    return s;
  }
  function deg(s, d) { var L = s.scale.length, o = Math.floor(d / L); return 12 * o + s.scale[((d % L) + L) % L]; }

  var M = { on: false, song: null, step: 0, next: 0, timer: 0, bar: 0, tempo: 1, inten: -1, autoI: true, lvl: 0, vol: 1 };
  function stepDur() { return 60 / (M.song.bpm * M.tempo) / 4; }

  /* 악기 */
  function vEnv(t, a, v, len, rel) {
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a);
    g.gain.setTargetAtTime(0.0001, t + Math.max(a, len), rel / 3);
    return g;
  }
  function out(node, rev, dl) {
    node.connect(musBus);
    if (rev) { var g = ac.createGain(); g.gain.value = rev; node.connect(g); g.connect(revIn); }
    if (dl) { var g2 = ac.createGain(); g2.gain.value = dl; node.connect(g2); g2.connect(dlyIn); }
  }
  function inst(kind, t, m, len, v, extra) {
    if (voices > MAXV + 10) return;
    var f = mtof(m), end, o, g, flt;
    extra = extra || {};
    if (kind === 'ep' || kind === 'bell') { // FM: 전자피아노 / 종
      var ratio = kind === 'bell' ? 3.5 : 1, dec = kind === 'bell' ? Math.max(len, 1.2) : Math.max(len, 0.5);
      o = ac.createOscillator(); o.frequency.value = f;
      var md = ac.createOscillator(), mg = ac.createGain(); md.frequency.value = f * ratio;
      mg.gain.setValueAtTime(f * (kind === 'bell' ? 2.2 : 1.4), t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + dec * 0.6);
      md.connect(mg); mg.connect(o.frequency);
      g = vEnv(t, 0.004, v, 0.01, dec);
      o.connect(g); out(panTo(g, extra.pan), extra.rev == null ? 0.3 : extra.rev, extra.dl || 0);
      end = t + dec * 1.6; o.start(t); md.start(t); o.stop(end); md.stop(end); track(o); return;
    }
    if (kind === 'pad') {
      g = vEnv(t, 0.35, v, len, 0.6); flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = extra.cut || 900; flt.Q.value = 0.5;
      [-8, 8].forEach(function (dt) { var oo = ac.createOscillator(); oo.type = extra.w || 'sawtooth'; oo.frequency.value = f; oo.detune.value = dt; oo.connect(flt); oo.start(t); oo.stop(t + len + 1); track(oo); });
      flt.connect(g); out(g, 0.45, 0); return;
    }
    o = ac.createOscillator();
    var w = kind === 'saw' ? 'sawtooth' : kind === 'tri' ? 'triangle' : kind;
    setWave(o, w); o.frequency.value = f;
    if (extra.vib) { // 길게 끄는 음에 떨림
      var lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + 0.25);
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + len + 0.4);
    }
    g = vEnv(t, extra.a || 0.006, v, len, extra.rel || 0.12);
    if (extra.cut) {
      flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = extra.q || 3;
      flt.frequency.setValueAtTime(extra.cut * 2.5, t); flt.frequency.exponentialRampToValueAtTime(extra.cut * 0.5, t + Math.min(0.25, len + 0.1));
      o.connect(flt); flt.connect(g);
    } else o.connect(g);
    out(panTo(g, extra.pan), extra.rev || 0.12, extra.dl || 0);
    end = t + len + (extra.rel || 0.12) * 2 + 0.05; o.start(t); o.stop(end); track(o);
  }
  function drum(kind, t, v) {
    if (voices > MAXV + 10) return;
    var g, s, f, o, chip = M.song.st.chipdrum, brush = M.song.st.brush;
    if (kind === 'k') {
      o = ac.createOscillator(); o.type = chip ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(chip ? 220 : 165, t); o.frequency.exponentialRampToValueAtTime(chip ? 55 : 42, t + (chip ? 0.08 : 0.12));
      g = vEnv(t, 0.002, 0.8 * v, 0.01, chip ? 0.12 : 0.3); o.connect(g); out(g, 0, 0); o.start(t); o.stop(t + 0.45); track(o);
      if (!chip && !brush) { s = noiseSrc(t); f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000; var cg = vEnv(t, 0.001, 0.08 * v, 0.003, 0.01); s.connect(f); f.connect(cg); out(cg, 0, 0); s.stop(t + 0.05); }
    } else if (kind === 's') {
      s = noiseSrc(t); f = ac.createBiquadFilter();
      if (brush) { f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.6; g = vEnv(t, 0.012, 0.18 * v, 0.02, 0.18); }
      else if (chip) { f.type = 'lowpass'; f.frequency.value = 6000; g = vEnv(t, 0.002, 0.3 * v, 0.01, 0.1); }
      else { f.type = 'highpass'; f.frequency.value = 1100; g = vEnv(t, 0.002, 0.38 * v, 0.01, 0.16); }
      s.connect(f); f.connect(g); out(g, 0.2, 0); s.stop(t + 0.4);
      if (!brush) { o = ac.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); var tg = vEnv(t, 0.002, 0.25 * v, 0.01, 0.07); o.connect(tg); out(tg, 0.1, 0); o.start(t); o.stop(t + 0.2); track(o); }
      if (M.song.st.clap) { var s2 = noiseSrc(t + 0.012), f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1500; f2.Q.value = 1.2; var g2 = vEnv(t + 0.012, 0.002, 0.25 * v, 0.01, 0.12); s2.connect(f2); f2.connect(g2); out(g2, 0.25, 0); s2.stop(t + 0.3); }
    } else { // 하이햇 h, 열린 햇 H
      s = noiseSrc(t); f = ac.createBiquadFilter(); f.type = brush ? 'bandpass' : 'highpass'; f.frequency.value = brush ? 7500 : chip ? 9000 : 7200;
      g = vEnv(t, 0.001, (brush ? 0.07 : 0.1) * v, 0.005, kind === 'H' ? 0.2 : brush ? 0.06 : 0.035);
      s.connect(f); f.connect(g); out(panTo(g, 0.25), 0.05, 0); s.stop(t + 0.3);
    }
  }

  function playStep(i, t) {
    var s = M.song, st = s.st, k = i % 16, bar = Math.floor(i / 16), sec = Math.floor(bar / 8) % 2, pb = bar % 8;
    var prog = sec ? s.progB : s.progA, cd = prog[pb % 4];
    var I = M.autoI ? (bar < 2 ? 0 : bar < 18 ? 1 : (bar % 32 >= 28 ? 0 : 2)) : M.inten;
    if (M.autoI && bar >= 2) I = Math.min(2, I + Math.min(1, M.lvl)); // 레벨이 오르면 바로 풍성하게
    var sw = (st.swing && k % 2 === 1) ? stepDur() * st.swing : 0, tt = t + sw;
    var R = Math.random;
    var calm = !st.kick;
    // 드럼
    var fill = pb === 7 && k >= 12 && I >= 1 && !calm;
    if (st.kick && st.kick[k] !== '.' && st.kick[k]) drum('k', tt, st.kick[k] === 'x' ? 1 : 0.6);
    if (I >= 1 && st.snare && st.snare[k] !== '.' && st.snare[k]) drum('s', tt, st.snare[k] === 'x' ? 1 : 0.55);
    if (fill && k % (I >= 2 ? 1 : 2) === 0) drum('s', tt, 0.45 + (k - 12) * 0.12);
    var hp = I >= 2 ? st.hat2 : st.hat;
    if (I >= 1 && hp && hp[k] !== '.' && hp[k]) drum('h', tt, hp[k] === 'x' ? 1 : 0.55);
    if (I >= 2 && !calm && k === 14 && pb % 2 === 1) drum('H', tt, 0.8);
    if (calm && I >= 2 && st.hat2[k] === 'o') drum('h', tt, 0.5);
    // 베이스
    var bc = st.bass[k], root = s.root - 12 + deg(s, cd) - (deg(s, cd) >= 7 ? 12 : 0);
    if (bc && bc !== '.' && bc !== '-') {
      var bl = 1; while (st.bass[k + bl] === '-') bl++;
      var bm = root;
      if (bc === 'o') bm += 12; else if (bc === 'f') bm = s.root - 12 + deg(s, cd + 4) - (deg(s, cd) >= 7 ? 12 : 0); else if (bc === 't') bm = s.root - 12 + deg(s, cd + 2) - (deg(s, cd) >= 7 ? 12 : 0);
      else if (bc === 'a') { var nx = prog[(pb + 1) % 4]; bm = s.root - 12 + deg(s, nx) - (deg(s, nx) >= 7 ? 12 : 0) + (R() < 0.5 ? -1 : 1); }
      inst(st.bw === 'sawtooth' ? 'saw' : st.bw === 'triangle' ? 'tri' : st.bw, tt, bm, bl * stepDur() * 0.9, (st.bw === 'sine' ? 0.24 : st.bw === 'triangle' ? 0.26 : 0.15), { cut: st.bcut || 0, q: 4, rel: 0.06, rev: 0.02 });
    }
    // 패드(마디 첫 박에 화음)
    if (k === 0 && st.pad) {
      var notes = [0, 2, 4].concat(st.sev ? [6] : []);
      notes.forEach(function (n, j) {
        var m = s.root + deg(s, cd + n); if (m > s.root + 14) m -= 12;
        inst('pad', t, m, stepDur() * 16, (st.pad === 'soft' ? 0.035 : 0.03), { w: st.pad === 'soft' ? 'triangle' : 'sawtooth', cut: st.pad === 'soft' ? 1400 : 1000 + I * 300 });
      });
    }
    // 아르페지오
    var ac2 = st.arp[k];
    if (ac2 && ac2 !== '.' && (I >= 1 || !st.pad || calm)) {
      var chordN = [0, 2, 4, 7], an = s.root + 12 + deg(s, cd + chordN[+ac2]);
      if (an > s.root + 26) an -= 12;
      var akind = st.aw === 'sawtooth' ? 'saw' : st.aw === 'triangle' ? 'tri' : st.aw;
      inst(akind, tt, an, stepDur() * (calm ? 3 : 0.8), (akind === 'ep' || akind === 'bell' ? 0.06 : akind === 'tri' ? 0.07 : 0.035), { cut: st.acut || 0, q: 6, rel: 0.05, pan: (k % 4 < 2 ? -0.35 : 0.35), rev: 0.2, dl: 0.15 });
    }
    // 멜로디
    if (I >= 1) {
      var plan = sec ? [s.m[2], s.m[2], s.m[3], s.mEnd] : [s.m[0], s.m[0], s.m[1], s.mEnd];
      var mot = plan[Math.floor(pb / 2)], pos = (pb % 2) * 16 + k;
      for (var q = 0; q < mot.length; q++) if (mot[q].s === pos) {
        var nn = mot[q], lm = s.root + st.oct + deg(s, cd + nn.o);
        if (st.penta) { var pc = ((lm - s.root) % 12 + 12) % 12; if (pc === 5 || pc === 11) lm -= 1; }
        while (lm > s.root + st.oct + 16) lm -= 12;
        var lk = s.leadW, len = nn.l * stepDur();
        var lv = lk === 'ep' || lk === 'bell' ? 0.1 : lk === 'tri' ? 0.12 : lk === 'saw' ? 0.05 : 0.06;
        inst(lk, tt, lm, len * 0.92, lv, { vib: len > 0.3, cut: lk === 'saw' ? 2600 : 0, q: 1, rel: 0.1, rev: 0.22, dl: 0.25 });
        if (I >= 2 && !calm && lk !== 'bell') inst(lk === 'ep' ? 'ep' : 'tri', tt, lm + 12, len * 0.9, lv * 0.35, { rel: 0.08, rev: 0.25, pan: 0.3 });
      }
    }
  }
  function sched() {
    if (!M.on || !ac || ac.state !== 'running') return;
    var ahead = ac.currentTime + 0.14;
    if (M.next < ac.currentTime) M.next = ac.currentTime + 0.03;
    while (M.next < ahead) { try { playStep(M.step, M.next); } catch (e) {} M.next += stepDur(); M.step++; }
  }
  function fadeBus(to, dur) {
    if (!ac) return;
    var t = ac.currentTime, g = musBus.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + dur);
  }
  function busLevel() { return volBgm <= 0 ? 0 : 0.36 * curve(volBgm) / curve(50) * M.vol * (M.song ? M.song.st.gain : 1); }

  var curId = null, curStyle = null;
  A.music = {
    // 게임 시작 때 엔진이 부릅니다. id: 게임 id, style: 'synth'|'chip'|'drive'|'space'|'puzzle'|'zen'|'casino'|'brain'|'sport'
    play: function (id, style) {
      id = id || curId || 'neowa';
      if (muted || volBgm <= 0) { curId = id; return; }
      if (!unlocked || !audio()) { curId = id; return; }
      var sn = style || curStyle || GAME[id] || ['synth', 'chip', 'puzzle', 'sport'][hash(id) % 4];
      if (!M.song || M.song.id !== id || M.styleName !== sn) { M.song = makeSong(id, sn); M.styleName = sn; }
      curId = id; M.vol = SOFT[id] || 1;
      M.step = 0; M.tempo = 1; M.lvl = 0; M.autoI = true; M.next = ac.currentTime + 0.08;
      musDuck.gain.cancelScheduledValues(ac.currentTime); musDuck.gain.setValueAtTime(1, ac.currentTime);
      this.paused(false);
      musBus.gain.cancelScheduledValues(ac.currentTime); musBus.gain.setValueAtTime(0.0001, ac.currentTime);
      fadeBus(busLevel(), 0.4);
      M.on = true;
      if (!M.timer) M.timer = setInterval(sched, 25);
      sched();
    },
    stop: function (fade) {
      if (!M.on) return;
      M.on = false;
      if (ac) fadeBus(0.0001, fade == null ? 0.5 : fade);
    },
    // 일시정지 중에는 작고 먹먹하게
    paused: function (p) {
      if (!ac) return;
      var t = ac.currentTime;
      musTone.frequency.cancelScheduledValues(t); musTone.frequency.setTargetAtTime(p ? 700 : 18000, t, 0.08);
      if (M.on) fadeBus(p ? busLevel() * 0.45 : busLevel(), 0.2);
    },
    // 게임이 직접 분위기를 정할 때: 0=잔잔, 1=보통, 2=신남. null이면 자동
    intensity: function (n) { if (n == null) M.autoI = true; else { M.autoI = false; M.inten = Math.max(0, Math.min(2, n | 0)); } },
    // 위기 상황 등에서 빠르기 바꾸기 (1 = 원래, 1.15 = 15% 빠르게)
    tempo: function (x) { M.tempo = Math.max(0.6, Math.min(1.5, x || 1)); },
    levelUp: function () { M.lvl++; M.tempo = Math.min(1.1, M.tempo + 0.015); },
    style: function (sn) { curStyle = sn; if (M.on) this.play(curId, sn); },
    isOn: function () { return M.on; }
  };
  M.levelUp = A.music.levelUp;

  /* ---------- 켜기/끄기·볼륨 ---------- */
  A.isMuted = function () { return muted; };
  A.setMuted = function (m) {
    muted = !!m; A.set('neowa_mute', muted ? '1' : '0');
    document.body.classList.toggle('muted', muted);
    if (ac) { var t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.03); }
    if (muted) { if (M.on) { M.on = false; M.wasOn = true; } }
    else { unlock(); if ((M.wasOn || document.body.getAttribute('data-state') === 'playing') && curId) { M.wasOn = false; A.music.play(curId); if (document.body.getAttribute('data-state') === 'paused') A.music.paused(true); } }
    paintPanel();
  };
  A.unlockAudio = unlock;
  A.volume = function (kind, v) {
    if (v == null) return kind === 'bgm' ? volBgm : volSfx;
    v = Math.max(0, Math.min(100, Math.round(v)));
    if (kind === 'bgm') {
      var was = volBgm; volBgm = v; A.set('neowa_vol_bgm', v);
      if (ac && M.on) fadeBus(v <= 0 ? 0.0001 : (document.body.getAttribute('data-state') === 'paused' ? busLevel() * 0.45 : busLevel()), 0.1);
      if (v <= 0 && M.on) A.music.stop(0.1);
      else if (was <= 0 && v > 0 && /playing|paused/.test(document.body.getAttribute('data-state') || '') && curId) { A.music.play(curId); if (document.body.getAttribute('data-state') === 'paused') A.music.paused(true); }
    } else {
      volSfx = v; A.set('neowa_vol_sfx', v);
      if (ac) sfxBus.gain.setTargetAtTime(0.42 * curve(v) / curve(80), ac.currentTime, 0.02);
    }
  };

  /* ---------- 게임 화면과 연결: 상태가 바뀌면 음악도 따라갑니다 ---------- */
  function gameId() {
    if (A.cur && A.cur.id) return A.cur.id;
    var p = location.pathname.split('/').filter(Boolean); return p.length ? p[p.length - (/\.html?$/.test(p[p.length - 1]) ? 2 : 1)] || 'neowa' : 'neowa';
  }
  var lastState = null;
  function onState() {
    var st = document.body.getAttribute('data-state');
    if (st === lastState) return;
    var prev = lastState; lastState = st;
    if (st === 'playing') { if (prev === 'paused' && M.on) A.music.paused(false); else A.music.play(gameId()); }
    else if (st === 'paused') A.music.paused(true);
    else if (st === 'over') { A.music.paused(false); A.music.stop(0.25); }
    else A.music.stop(0.3);
  }

  /* ---------- 소리 설정 칸 (일시정지 화면에 자동으로 붙습니다) ---------- */
  var css = '.snd{margin:14px auto 0;width:min(300px,100%);display:grid;gap:10px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(255,255,255,.1));text-align:left}' +
    '.snd-row{display:grid;grid-template-columns:72px 1fr 36px;align-items:center;gap:10px;font-size:14px;font-weight:700;color:var(--sub,#aab0d4)}' +
    '.snd-row b{font-family:var(--f-num,system-ui);font-size:13px;color:var(--ink,#fff);text-align:right}' +
    '.snd input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:28px;background:transparent;margin:0;touch-action:none}' +
    '.snd input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:6px;background:linear-gradient(90deg,var(--accent,#5ee7ff) var(--p,50%),rgba(255,255,255,.14) var(--p,50%))}' +
    '.snd input[type=range]::-moz-range-track{height:6px;border-radius:6px;background:rgba(255,255,255,.14)}.snd input[type=range]::-moz-range-progress{height:6px;border-radius:6px;background:var(--accent,#5ee7ff)}' +
    '.snd input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;margin-top:-9px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.4)}' +
    '.snd input[type=range]::-moz-range-thumb{width:24px;height:24px;border:0;border-radius:50%;background:#fff}' +
    '.snd-mute{justify-self:center;font-size:13px;font-weight:700;color:var(--sub,#aab0d4);padding:6px 12px;border-radius:10px}.snd-mute:hover{background:rgba(255,255,255,.06);color:var(--ink,#fff)}' +
    'body.muted .snd-row{opacity:.4}' +
    '.land .g-ov .snd{margin-top:10px}';
  var panel = null;
  function row(kind, label) {
    var r = document.createElement('label'); r.className = 'snd-row';
    r.innerHTML = '<span>' + label + '</span><input type="range" min="0" max="100" step="5" data-snd="' + kind + '" aria-label="' + label + ' 크기"><b></b>';
    return r;
  }
  function paintPanel() {
    if (!panel) return;
    var ins = panel.querySelectorAll('input');
    for (var i = 0; i < ins.length; i++) {
      var k = ins[i].getAttribute('data-snd'), v = A.volume(k);
      ins[i].value = v; ins[i].style.setProperty('--p', v + '%');
      ins[i].nextSibling.textContent = v;
    }
    var mb = panel.querySelector('.snd-mute'); if (mb) mb.textContent = muted ? '🔇 소리 꺼짐 · 켜기' : '🔊 모든 소리 끄기';
  }
  function mountPanel() {
    var pause = document.getElementById('ovPause'); if (!pause || panel) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    panel = document.createElement('div'); panel.className = 'snd'; panel.setAttribute('data-nostart', '');
    panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', '소리 설정');
    panel.appendChild(row('sfx', '효과음')); panel.appendChild(row('bgm', '배경음악'));
    var mb = document.createElement('button'); mb.type = 'button'; mb.className = 'snd-mute'; panel.appendChild(mb);
    mb.addEventListener('click', function (e) { e.stopPropagation(); A.setMuted(!muted); if (!muted) A.sfx('click'); });
    panel.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-snd'); if (!k) return;
      if (muted && +e.target.value > 0) A.setMuted(false);
      A.volume(k, +e.target.value); paintPanel();
    });
    panel.addEventListener('change', function (e) { if (e.target.getAttribute('data-snd') === 'sfx') A.sfx('coin'); });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    panel.addEventListener('keydown', function (e) { if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') e.stopPropagation(); });
    var col = pause.querySelector('.ov-col');
    if (col) pause.insertBefore(panel, col); else pause.appendChild(panel);
    paintPanel();
  }

  function init() {
    mountPanel();
    document.body.classList.toggle('muted', muted);
    if (window.MutationObserver) new MutationObserver(onState).observe(document.body, { attributes: true, attributeFilter: ['data-state'] });
    onState();
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
