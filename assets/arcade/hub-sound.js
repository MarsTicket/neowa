/* 너와 아케이드: 메인 화면 소리 (아주 작게)
   - 게임 카드에 마우스를 올리면 '틱', 누르면 '출발' 소리, 종류 버튼은 '딸깍'.
   - 게임 안의 소리 설정(neowa_mute, neowa_vol_sfx)을 그대로 따릅니다. 소리를 끄면 메인에서도 안 납니다.
   - 첫 클릭·터치·키 입력 전에는 브라우저가 소리를 막으므로, 그 뒤부터 납니다. */
(function () {
  'use strict';
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function on() { return get('neowa_mute', '0') !== '1' && +get('neowa_vol_sfx', '80') > 0; }
  var ac = null, out = null, ready = false;
  function ctx() {
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      try { ac = new C(); } catch (e) { return null; }
      out = ac.createGain(); out.connect(ac.destination);
    }
    out.gain.value = 0.5 * Math.pow((+get('neowa_vol_sfx', '80')) / 100, 1.6) / Math.pow(0.8, 1.6);
    if (ac.state === 'suspended') try { ac.resume(); } catch (e) {}
    return ac;
  }
  function beep(list) {
    if (!ready || !on() || !ctx()) return;
    var t0 = ac.currentTime + 0.005;
    list.forEach(function (n) {
      var t = t0 + (n.at || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = n.w || 'sine'; o.frequency.setValueAtTime(n.f, t); if (n.f2) o.frequency.exponentialRampToValueAtTime(n.f2, t + n.d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(n.v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + n.d + 0.03);
    });
  }
  var S = {
    hover: [{ w: 'sine', f: 1500, d: 0.03, v: 0.025 }],
    tap: [{ w: 'sine', f: 880, f2: 1100, d: 0.05, v: 0.06 }],
    go: [{ w: 'triangle', f: 523, d: 0.06, v: 0.08 }, { w: 'triangle', f: 784, d: 0.06, v: 0.08, at: 0.05 }, { w: 'triangle', f: 1046, d: 0.14, v: 0.08, at: 0.1 }]
  };
  function unlock() { ready = true; if (on()) ctx(); }
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { window.addEventListener(ev, unlock, { capture: true, passive: true }); });
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches, lastHover = null, lastT = 0;
  document.addEventListener('pointerover', function (e) {
    if (!fine || !e.target.closest) return;
    var c = e.target.closest('.gc, .btn, .filters button'); if (!c || c === lastHover) return;
    lastHover = c; var now = Date.now(); if (now - lastT < 60) return; lastT = now;
    beep(S.hover);
  });
  document.addEventListener('pointerout', function (e) { if (lastHover && !lastHover.contains(e.relatedTarget)) lastHover = null; });
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var a = e.target.closest('a[href]');
    if (a && /^[a-z0-9_-]+\/(\?.*)?$/.test(a.getAttribute('href')) && a.getAttribute('href') !== 'ranking/') { ready = true; beep(S.go); return; }
    if (e.target.closest('button, .filters button, a')) { ready = true; beep(S.tap); }
  }, true);
})();
