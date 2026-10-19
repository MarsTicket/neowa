// 방과 후, 너와: 비주얼노벨 엔진
(function () {
  'use strict';
  var BG = {
    street: 'assets/images/bg_street_morning.webp',
    classroom: 'assets/images/bg_classroom_day.webp',
    corridor: 'assets/images/bg_corridor_afternoon.webp',
    library: 'assets/images/bg_library_after.webp',
    rooftop: 'assets/images/bg_rooftop_sunset.webp',
    broadcast: 'assets/images/bg_broadcast_noon.webp',
    festival: 'assets/images/bg_festival_day.webp',
    festival_eve: 'assets/images/bg_festival_evening.webp'
  };
  var EXPR = {
    seoyeon: ['normal', 'smile', 'embarrassed'],
    chaerin: ['normal', 'smile', 'eyecontact'],
    arin: ['smile', 'excited', 'embarrassed']
  };
  function charImg(ch, ex) {
    if (!EXPR[ch] || EXPR[ch].indexOf(ex) < 0) ex = EXPR[ch][0];
    return 'assets/images/char_' + ch + '_' + ex + '.webp';
  }
  var idx = {};
  STEPS.forEach(function (s, i) { idx[s.id] = i; });
  var $ = function (id) { return document.getElementById(id); };
  // ===== 다국어 (i18n) =====
  var LANG_LIST = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'ru'];
  var LANG_NAMES = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文', es: 'Español', fr: 'Français', ru: 'Русский' };
  var curLang = 'ko';
  try { var savedLang = localStorage.getItem('neowa_lang'); if (LANG_LIST.indexOf(savedLang) >= 0) curLang = savedLang; } catch (e) {}
  var L = (window.I18N_DATA && window.I18N_DATA.lang === curLang) ? window.I18N_DATA : null;
  var KO_UI = { tagline: '전학 첫 학기. 방과 후의 선택이, 그녀들과의 거리를 바꿉니다.', nameLabel: '주인공 이름', newGame: '새 게임', continue: '이어하기', gallery: '갤러리', notice: '15세 이용가 수준의 학원 드라마입니다. 플레이 시간 약 70분에서 95분, 엔딩 7개.', updateNotice: '업데이트: 축제 당일 이야기(Day 5)가 추가됐습니다. 이전 버전의 진행 중 저장은 초기화되고, 갤러리와 본 엔딩 기록은 그대로 유지됩니다.', save: '저장', load: '불러오기', backlog: '백로그', auto: '자동', autoOn: '자동 중', skip: '스킵', skipOn: '스킵 중', continueChapter: '계속', close: '닫기', back: '돌아가기', galleryView: '갤러리 보기', toTitle: '타이틀로', restart: '처음부터 다시', lockedScene: '아직 보지 못한 장면', noRecord: '기록이 없습니다.', endingsSeen: '본 엔딩 {n} / 7', savePrompt: '저장할 슬롯 번호를 입력하세요 (1, 2, 3)', loadPrompt: '불러올 슬롯 번호를 입력하세요 (1, 2, 3)', savedMsg: '{slot}번 슬롯에 저장했습니다.', noSaveMsg: '저장된 진행이 없습니다. 업데이트된 버전에서는 이전 진행 저장이 초기화됩니다.', noSlotMsg: '해당 슬롯에 저장이 없습니다. 업데이트된 버전에서는 이전 진행 저장이 초기화됩니다.', finalAff: '최종 호감도: 서연 {sv} / 채린 {cv} / 아린 {av}', defaultName: '김도현', endingFallback: '엔딩' };
  var KO_SP = { '나': '나', '서연': '서연', '채린': '채린', '아린': '아린', '선생님': '선생님', '학생': '학생' };
  function U(k) { return (L && L.ui && L.ui[k]) || KO_UI[k] || k; }
  function spDisp(sp) {
    if (!sp) return '';
    if (sp === '주인공') return state ? state.name : sp;
    return (L && L.sp && L.sp[sp]) || KO_SP[sp] || sp;
  }
  function locStep(step) { return (L && L.steps && L.steps[step.id]) || null; }
  document.documentElement.lang = curLang === 'zh' ? 'zh-CN' : curLang;

  var state = null;
  var autoTimer = null, skipTimer = null, typeTimer = null, typing = false, fullText = '';
  var prevScreen = 'titleScreen';

  var SAVE_VER = 2;
  function track(ev, params) {
    try { if (window.gtag) { var p = params || {}; p.game = 'neowa'; window.gtag('event', ev, p); } } catch (e) {}
  }
  function validSave(s) { return !!(s && s.v === SAVE_VER && typeof s.pos === 'number'); }
  function freshState(name) {
    return {
      v: SAVE_VER,
      name: name || U('defaultName'), pos: 0,
      aff: { seoyeon: 0, chaerin: 0, arin: 0 },
      flags: {}, lastFocus: null, backlog: [], seen: {}
    };
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function load(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  function unlockCG(id) {
    var g = load('neowa_gallery') || {};
    g[id] = true; save('neowa_gallery', g);
  }
  function unlockEnding(id) {
    var e = load('neowa_endings') || {};
    e[id] = true; save('neowa_endings', e);
  }

  function renderGallery() {
    var box = $('galleryGrid'); box.innerHTML = '';
    var g = load('neowa_gallery') || {};
    CG_LIST.forEach(function (cg) {
      var d = document.createElement('div'); d.className = 'gItem';
      if (g[cg.id]) {
        var cgTitle = (L && L.cg && L.cg[cg.id]) || cg.title; d.innerHTML = '<img src="' + cg.file + '" alt="' + cgTitle + '"><p>' + cgTitle + '</p>';
      } else {
        d.innerHTML = '<div class="gLocked">?</div><p>' + U('lockedScene') + '</p>';
      }
      box.appendChild(d);
    });
    var e = load('neowa_endings') || {};
    var names = (L && L.endingShort) || { SY_GOOD: '서연 굿', SY_NORMAL: '서연 노멀', CH_GOOD: '채린 굿', CH_NORMAL: '채린 노멀', AR_GOOD: '아린 굿', AR_NORMAL: '아린 노멀', SOLO: '솔로' };
    var got = Object.keys(names).filter(function (k) { return e[k]; }).map(function (k) { return names[k]; });
    $('endingList').textContent = U('endingsSeen').replace('{n}', String(got.length)) + (got.length ? ' : ' + got.join(', ') : '');
  }

  function show(id) {
    ['titleScreen', 'gameScreen', 'galleryScreen', 'endingScreen'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
  }

  function applyText(t) { return t.replace(/\{name\}/g, state.name); }

  function setScene(step) {
    var bgEl = $('bgImg'), cgEl = $('cgImg'), chEl = $('charImg');
    cgEl.classList.add('hidden'); chEl.classList.add('hidden');
    if (step.cg) {
      var cg = CG_LIST.filter(function (c) { return c.id === step.cg; })[0];
      if (cg) { cgEl.src = cg.file; cgEl.classList.remove('hidden'); unlockCG(cg.id); state.seen[cg.id] = true; document.documentElement.style.setProperty('--side-bg', 'url("' + cg.file + '")'); }
      if (step.bg) bgEl.src = BG[step.bg];
    } else {
      if (step.bg) { bgEl.src = BG[step.bg]; document.documentElement.style.setProperty('--side-bg', 'url("' + BG[step.bg] + '")'); }
      if (step.ch) { chEl.src = charImg(step.ch, step.ex); chEl.classList.remove('hidden'); }
    }
  }

  function typeText(text) {
    var el = $('textBody');
    fullText = text; typing = true; el.textContent = '';
    var i = 0;
    clearInterval(typeTimer);
    typeTimer = setInterval(function () {
      i += 2; el.textContent = fullText.slice(0, i);
      if (i >= fullText.length) { clearInterval(typeTimer); typing = false; scheduleAuto(); }
    }, 16);
  }

  function scheduleAuto() {
    clearTimeout(autoTimer);
    if ($('autoBtn').dataset.on === '1' && state) {
      autoTimer = setTimeout(function () { advance(); }, 1500);
    }
  }

  function stopModes() {
    clearTimeout(autoTimer); clearInterval(skipTimer); skipTimer = null;
    $('autoBtn').dataset.on = '0'; $('autoBtn').textContent = U('auto');
    $('skipBtn').dataset.on = '0'; $('skipBtn').textContent = U('skip');
  }

  function current() { return STEPS[state.pos]; }

  var CFG = window.NEOWA_CONFIG || { adfit: {} };
  var CHAPTER_BREAKS = {
    D1_01: 'Day 1 · 전학 첫날', N1_01: 'Day 1 · 밤',
    D2_01: 'Day 2 · 가까워지는 거리', N2_01: 'Day 2 · 밤',
    D3_01: 'Day 3 · 축제 준비', N3_01: 'Day 3 · 밤',
    D4_01: 'Day 4 · 축제 전날', D5_01: 'Day 5 · 축제 당일'
  };

  function fillAd(el, unit, w, h) {
    if (!el || !unit) return;
    var ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', String(w));
    ins.setAttribute('data-ad-height', String(h));
    el.appendChild(ins);
    el.classList.remove('hidden');
    if (!window.__adfitLoaded) {
      window.__adfitLoaded = true;
      var s = document.createElement('script');
      s.async = true;
      s.src = '//t1.daumcdn.net/kas/static/ba.min.js';
      document.body.appendChild(s);
    }
  }

  function render() {
    var step = current();
    if (!step) { finishToTitle(); return; }
    if (step.judge) { doJudge(); return; }
    var adfitCfg = CFG.adfit || {};
    var isChapter = !!CHAPTER_BREAKS[step.id] && state.chapterSeen !== step.id;
    if (isChapter) { state.chapterSeen = step.id; track('chapter_start', { chapter: step.id }); }
    if (adfitCfg.chapter && isChapter) {
      stopModes();
      $('chapterLabel').textContent = (L && L.chapters && L.chapters[step.id]) || CHAPTER_BREAKS[step.id];
      var adEl = $('adChapter');
      if (!adEl.dataset.filled) { adEl.dataset.filled = '1'; fillAd(adEl, adfitCfg.chapter, 300, 250); }
      $('chapterAdPanel').classList.remove('hidden');
      return;
    }
    setScene(step);
    var loc = locStep(step);
    var dispSp = spDisp(step.sp);
    $('speakerName').textContent = dispSp;
    $('speakerName').style.display = step.sp ? 'block' : 'none';
    if (step.sp && step.tx) {
      var line = { sp: dispSp, tx: applyText((loc && loc.tx) || step.tx) };
      var last = state.backlog[state.backlog.length - 1];
      if (!last || last.sp !== line.sp || last.tx !== line.tx || state.pos !== last.pos) {
        state.backlog.push({ sp: line.sp, tx: line.tx, pos: state.pos });
        if (state.backlog.length > 300) state.backlog.shift();
      }
    }
    $('choiceBox').innerHTML = ''; $('choiceBox').classList.add('hidden');
    typeText(applyText((loc && loc.tx) || step.tx || ''));
    if (step.ending) { /* 마지막 대사를 보여준 뒤 클릭하면 엔딩 화면 */ }
  }

  function doJudge() {
    var a = state.aff;
    var chars = ['seoyeon', 'chaerin', 'arin'];
    var max = Math.max(a.seoyeon, a.chaerin, a.arin);
    var target;
    if (max <= 7) { target = 'END_SOLO_01'; }
    else {
      var tops = chars.filter(function (c) { return a[c] === max; });
      var pick = tops[0];
      if (tops.length > 1) {
        var flagged = tops.filter(function (c) { return hasGoodFlag(c); });
        if (flagged.length === 1) pick = flagged[0];
        else if (tops.indexOf(state.lastFocus) >= 0) pick = state.lastFocus;
      }
      var good = a[pick] >= 13 && hasGoodFlag(pick);
      var pre = pick === 'seoyeon' ? 'END_SY_' : (pick === 'chaerin' ? 'END_CH_' : 'END_AR_');
      target = pre + (good ? 'G01' : 'N01');
      if (a[pick] < 8) target = 'END_SOLO_01';
    }
    state.pos = idx[target];
    render();
  }
  function hasGoodFlag(c) {
    if (c === 'seoyeon') return !!state.flags['flag_seoyeon_help'];
    if (c === 'chaerin') return !!state.flags['flag_chaerin_quote'];
    if (c === 'arin') return !!state.flags['flag_arin_promise'];
    return false;
  }

  function applyChoice(c) {
    if (c.aff) Object.keys(c.aff).forEach(function (k) { state.aff[k] = (state.aff[k] || 0) + c.aff[k]; });
    if (c.flag) state.flags[c.flag] = true;
    if (c.focus) state.lastFocus = c.focus;
    state.pos = idx[c.goto];
    render();
  }

  function advance() {
    if (!state) return;
    var step = current();
    if (!step) return;
    if (typing) { clearInterval(typeTimer); typing = false; $('textBody').textContent = fullText; scheduleAuto(); return; }
    if (step.choice) { showChoices(step); return; }
    if (step.ending) { showEnding(step); return; }
    if (step.goto) { state.pos = idx[step.goto]; render(); return; }
    state.pos += 1;
    render();
  }

  function showChoices(step) {
    var box = $('choiceBox'); box.innerHTML = ''; box.classList.remove('hidden');
    var locC = locStep(step);
    step.choice.forEach(function (c, ci) {
      var b = document.createElement('button');
      b.className = 'choiceBtn'; b.textContent = (locC && locC.choices && locC.choices[ci]) || c.text;
      b.onclick = function (e) { e.stopPropagation(); clearTimeout(autoTimer); clearInterval(skipTimer); skipTimer = null; $('skipBtn').dataset.on = '0'; $('skipBtn').textContent = U('skip'); applyChoice(c); };
      box.appendChild(b);
    });
  }

  var ENDING_TITLES = {
    SY_GOOD: '서연 굿 엔딩: 방과 후, 너와', SY_NORMAL: '서연 노멀 엔딩: 규칙은 그대로',
    CH_GOOD: '채린 굿 엔딩: 창가 자리, 두 사람', CH_NORMAL: '채린 노멀 엔딩: 천천히 읽는 사이',
    AR_GOOD: '아린 굿 엔딩: 예약이 아니라 확정', AR_NORMAL: '아린 노멀 엔딩: 공적인 기록',
    SOLO: '솔로 엔딩: 학기 적응 완료'
  };
  function showEnding(step) {
    stopModes();
    unlockEnding(step.ending);
    track('ending_reach', { ending: step.ending });
    $('endingTitle').textContent = (L && L.endings && L.endings[step.ending]) || ENDING_TITLES[step.ending] || U('endingFallback');
    var a = state.aff;
    $('endingAff').textContent = U('finalAff').replace('{sv}', String(a.seoyeon)).replace('{cv}', String(a.chaerin)).replace('{av}', String(a.arin));
    show('endingScreen');
  }

  function finishToTitle() { stopModes(); show('titleScreen'); }

  function startGame(name) {
    state = freshState(name);
    track('game_start', {});
    show('gameScreen');
    render();
  }

  // ===== UI 연결 =====
  document.addEventListener('DOMContentLoaded', function () {
    (function applyLangUI() {
      var set = function (id, key) { var el = $(id); if (el) el.textContent = U(key); };
      set('taglineText', 'tagline'); set('nameLabelText', 'nameLabel');
      set('newGameBtn', 'newGame'); set('continueBtn', 'continue'); set('galleryBtn', 'gallery');
      set('noticeText', 'notice'); set('updateNoticeText', 'updateNotice');
      set('saveBtn', 'save'); set('loadBtn', 'load'); set('backlogBtn', 'backlog');
      set('autoBtn', 'auto'); set('skipBtn', 'skip'); set('galBtn2', 'gallery');
      set('chapterContinueBtn', 'continueChapter'); set('backlogTitle', 'backlog'); set('backlogCloseBtn', 'close');
      set('galleryTitle', 'gallery'); set('galleryBackBtn', 'back');
      set('restartBtn', 'restart'); set('endingGalleryBtn', 'galleryView'); set('endingTitleBtn', 'toTitle');
      var ni = $('nameInput'); if (ni) ni.placeholder = U('defaultName');
      var bar = $('langBar');
      if (bar) {
        LANG_LIST.forEach(function (code) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'langBtn' + (code === curLang ? ' on' : '');
          b.textContent = LANG_NAMES[code];
          b.onclick = function () {
            if (code === curLang) return;
            try { localStorage.setItem('neowa_lang', code); } catch (e) {}
            location.reload();
          };
          bar.appendChild(b);
        });
      }
    })();
    $('newGameBtn').onclick = function () {
      var n = $('nameInput').value.trim();
      startGame(n || U('defaultName'));
    };
    $('continueBtn').onclick = function () {
      var s = load('neowa_autosave');
      if (validSave(s)) { state = s; show('gameScreen'); render(); }
      else alert(U('noSaveMsg'));
    };
    $('galleryBtn').onclick = function () { prevScreen = 'titleScreen'; renderGallery(); show('galleryScreen'); };
    $('galleryBackBtn').onclick = function () { show(prevScreen); };
    $('dialogueBox').onclick = function () { advance(); };
    $('saveBtn').onclick = function (e) {
      e.stopPropagation();
      var slot = prompt(U('savePrompt'), '1');
      if (slot && ['1', '2', '3'].indexOf(slot) >= 0) { save('neowa_save_' + slot, state); alert(U('savedMsg').replace('{slot}', slot)); }
    };
    $('loadBtn').onclick = function (e) {
      e.stopPropagation();
      var slot = prompt(U('loadPrompt'), '1');
      var s = slot && load('neowa_save_' + slot);
      if (validSave(s)) { state = s; stopModes(); show('gameScreen'); render(); }
      else alert(U('noSlotMsg'));
    };
    $('backlogBtn').onclick = function (e) {
      e.stopPropagation();
      var box = $('backlogPanel');
      box.classList.toggle('hidden');
      var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
      $('backlogList').innerHTML = state.backlog.map(function (b) {
        return '<p><b>' + esc(b.sp) + '</b> ' + esc(b.tx) + '</p>';
      }).join('') || '<p>' + U('noRecord') + '</p>';
    };
    $('backlogCloseBtn').onclick = function () { $('backlogPanel').classList.add('hidden'); };
    $('autoBtn').onclick = function (e) {
      e.stopPropagation();
      var on = $('autoBtn').dataset.on === '1';
      $('autoBtn').dataset.on = on ? '0' : '1';
      $('autoBtn').textContent = on ? U('auto') : U('autoOn');
      if (!on) scheduleAuto(); else clearTimeout(autoTimer);
    };
    $('skipBtn').onclick = function (e) {
      e.stopPropagation();
      if (skipTimer) { stopModes(); return; }
      $('skipBtn').dataset.on = '1'; $('skipBtn').textContent = U('skipOn');
      skipTimer = setInterval(function () {
        var step = current();
        if (!step || step.choice || step.ending || step.judge) { stopModes(); if (step) render(); return; }
        if (step.goto) { state.pos = idx[step.goto]; }
        else state.pos += 1;
        render();
      }, 120);
    };
    $('galBtn2').onclick = function (e) { e.stopPropagation(); prevScreen = 'gameScreen'; renderGallery(); show('galleryScreen'); };
    $('endingGalleryBtn').onclick = function () { prevScreen = 'endingScreen'; renderGallery(); show('galleryScreen'); };
    $('endingTitleBtn').onclick = function () { finishToTitle(); };
    $('restartBtn').onclick = function () { startGame(state ? state.name : U('defaultName')); };
    $('chapterContinueBtn').onclick = function () { $('chapterAdPanel').classList.add('hidden'); render(); };
    var adfitInit = CFG.adfit || {};
    fillAd($('adTitle'), adfitInit.title, 320, 100);
    fillAd($('adEnding'), adfitInit.ending, 320, 100);
    setInterval(function () { if (state && !$('gameScreen').classList.contains('hidden')) save('neowa_autosave', state); }, 5000);
  });
})();
