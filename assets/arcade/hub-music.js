/* 너와 아케이드: 메인 화면 배경음악 (외부 무료 음원 라디오)
   - 첫 클릭·터치·키 입력 뒤에 시작합니다(브라우저 자동재생 규칙). 소리를 꺼 두었으면 켜지 않습니다.
   - 테마·곡명·앞뒤 곡은 위 메뉴의 음악 버튼에서 고릅니다. 설정(neowa_bgm_theme·neowa_mute·neowa_vol_bgm)은 게임 화면과 같은 것을 씁니다.
   - 실제 재생은 radio.js 가 맡습니다. 곡을 못 불러오면 그대로 조용히 넘어갑니다(게임 화면은 오리지널 음악으로 자동 전환). */
(function () {
  'use strict';
  var R = window.NeowaRadio; if (!R) return;
  function audible() {
    try {
      if (localStorage.getItem('neowa_mute') === '1') return false;
      var v = parseInt(localStorage.getItem('neowa_vol_bgm'), 10);
      return !(v === 0);
    } catch (e) { return true; }
  }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(function () {
    var nav = document.querySelector('header.top .nav') || document.querySelector('.nav');
    if (nav) {
      var mq = window.matchMedia && matchMedia('(max-width: 680px)');
      var chip = R.chip(nav, { solo: !!(mq && mq.matches) });
      if (chip) {
        chip.classList.add('nav-bgm');
        if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { chip.classList.toggle('solo', e.matches); });
      }
    }
    function tryStart() { if (!audible() || R.theme() === 'original' || R.playing()) return; R.play(); }
    ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, tryStart, { capture: true, passive: true });
    });
    R.onTheme = function () { if (R.active() && audible() && !R.playing()) R.play(); };
  });
})();
