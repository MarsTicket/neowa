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
  var DIM = {
    'assets/images/bg_street_morning.webp': [2048, 1152],
    'assets/images/bg_classroom_day.webp': [1920, 1280],
    'assets/images/bg_corridor_afternoon.webp': [1920, 1280],
    'assets/images/bg_library_after.webp': [2048, 1152],
    'assets/images/bg_rooftop_sunset.webp': [1920, 1280],
    'assets/images/bg_broadcast_noon.webp': [2048, 1152],
    'assets/images/bg_festival_day.webp': [1920, 1280],
    'assets/images/bg_festival_evening.webp': [1920, 1280],
    'assets/images/cg01_first_meeting.webp': [2048, 1152],
    'assets/images/cg02_library_book.webp': [1920, 1280],
    'assets/images/cg03_sunset_thanks.webp': [1920, 1280],
    'assets/images/cg04_festival_headset.webp': [1920, 1280],
    'assets/images/cg05_festival_closing.webp': [1920, 1280],
    'assets/images/char_seoyeon_normal.webp': [1280, 1920],
    'assets/images/char_seoyeon_smile.webp': [1120, 2240],
    'assets/images/char_seoyeon_embarrassed.webp': [1280, 1920],
    'assets/images/char_chaerin_normal.webp': [1120, 2240],
    'assets/images/char_chaerin_smile.webp': [1120, 2240],
    'assets/images/char_chaerin_eyecontact.webp': [1120, 2240],
    'assets/images/char_arin_smile.webp': [1120, 2240],
    'assets/images/char_arin_excited.webp': [1280, 1920],
    'assets/images/char_arin_embarrassed.webp': [1120, 2240],
    'assets/images/title_key.webp': [1280, 1920]
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
  var LANG_LIST = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'ru'];
  var LANG_NAMES = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文', es: 'Español', fr: 'Français', ru: 'Русский' };
  var curLang = 'ko';
  try {
    var langMatch = /[?&]lang=([a-z]{2})/.exec(location.search || '');
    var cookieMatch = /(?:^|; )neowa_lang=([a-z]{2})/.exec(document.cookie || '');
    var savedLang = (langMatch && langMatch[1]) || localStorage.getItem('neowa_lang') || (cookieMatch && cookieMatch[1]);
    if (LANG_LIST.indexOf(savedLang) >= 0) curLang = savedLang;
  } catch (e) {}
  var L = (window.I18N_DATA && window.I18N_DATA.lang === curLang) ? window.I18N_DATA : null;
  var KO_UI = {
    tagline: '전학 첫 학기. 방과 후의 선택이, 그녀들과의 거리를 바꿉니다.',
    nameLabel: '주인공 이름',
    newGame: '새 게임',
    continue: '이어하기',
    gallery: '갤러리',
    notice: '15세 이용가 수준의 학원 드라마입니다. 한 회 약 40–70분, 엔딩 7개.',
    updateNotice: '업데이트: 축제 당일 이야기(Day 5)가 추가됐습니다. 이전 버전의 진행 중 저장은 초기화되고, 갤러리와 본 엔딩 기록은 그대로 유지됩니다.',
    intro: '전학 첫 학기, 닷새 동안의 방과 후를 고르는 이야기입니다. 반장 한서연, 도서 위원 문채린, 방송부 노아린. 선택에 따라 엔딩은 일곱으로 갈라집니다.',
    save: '저장',
    load: '불러오기',
    backlog: '백로그',
    auto: '자동',
    autoOn: '자동 중',
    skip: '스킵',
    skipOn: '스킵 중',
    settings: '설정',
    toTitleShort: '타이틀',
    continueChapter: '계속',
    close: '닫기',
    back: '돌아가기',
    galleryView: '갤러리 보기',
    toTitle: '타이틀로',
    restart: '처음부터 다시',
    lockedScene: '아직 보지 못한 장면',
    noRecord: '기록이 없습니다.',
    endingsSeen: '본 엔딩 {n} / 7',
    savedMsg: '{slot}번 슬롯에 저장했습니다.',
    noSaveMsg: '저장된 진행이 없습니다. 업데이트된 버전에서는 이전 진행 저장이 초기화됩니다.',
    noSlotMsg: '해당 슬롯에 저장이 없습니다.',
    finalAff: '최종 호감도: 서연 {sv} / 채린 {cv} / 아린 {av}',
    defaultName: '김도현',
    endingFallback: '엔딩',
    textSpeed: '글자 속도',
    autoWait: '자동 대기',
    speedSlow: '느리게',
    speedNormal: '보통',
    speedFast: '빠르게',
    waitShort: '짧게',
    waitNormal: '보통',
    waitLong: '길게',
    emptySlot: '빈 슬롯',
    slotLabel: '슬롯 {n}',
    overwriteAsk: '이 기록을 덮어쓸까요?',
    overwriteYes: '덮어쓰기',
    cancel: '취소',
    autosaveHint: '이어하기는 약 5초마다 남는 자동 저장을 불러옵니다. 슬롯 저장과는 별개입니다.',
    dayPrologue: '프롤로그',
    dayNum: 'Day {n}',
    dayNight: 'Day {n} · 밤',
    dayEnding: '엔딩',
    choiceLabel: '선택',
    titleConfirm: '타이틀로 돌아갈까요?',
    titleConfirmBody: '진행은 자동 저장됩니다.',
    leaveYes: '돌아가기',
    previewEmpty: '대사 없음',
    linkAbout: '소개',
    linkChars: '등장인물',
    linkContact: '문의',
    linkPrivacy: '개인정보처리방침'
  };
  var KO_SP = { '나': '나', '서연': '서연', '채린': '채린', '아린': '아린', '선생님': '선생님', '학생': '학생' };
  function U(k) { return (L && L.ui && L.ui[k]) || KO_UI[k] || k; }
  function spDisp(sp) {
    if (!sp) return '';
    if (sp === '주인공') return state ? state.name : sp;
    return (L && L.sp && L.sp[sp]) || KO_SP[sp] || sp;
  }
  function locStep(step) { return (step && L && L.steps && L.steps[step.id]) || null; }
  document.documentElement.lang = curLang === 'zh' ? 'zh-CN' : curLang;

  var state = null;
  var autoTimer = null, skipTimer = null, typeTimer = null, typing = false, fullText = '';
  var prevScreen = 'titleScreen';
  var saveMode = 'save';
  var pendingSlot = null;
  var prefs = { speed: 'normal', autoMs: 3200 };
  try {
    var storedPrefs = JSON.parse(localStorage.getItem('neowa_prefs') || 'null');
    if (storedPrefs && storedPrefs.speed) prefs.speed = storedPrefs.speed;
    if (storedPrefs && typeof storedPrefs.autoMs === 'number') prefs.autoMs = storedPrefs.autoMs;
  } catch (e) {}
  var SPEED = { slow: [48, 1], normal: [32, 1], fast: [16, 2] };
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var SAVE_VER = 2;
  function track(ev, params) {
    try { if (window.gtag) { var p = params || {}; p.game = 'neowa'; window.gtag('event', ev, p); } } catch (e) {}
  }
  function ensureShape(s) {
    if (!s.aff || typeof s.aff !== 'object') s.aff = { seoyeon: 0, chaerin: 0, arin: 0 };
    ['seoyeon', 'chaerin', 'arin'].forEach(function (k) { if (typeof s.aff[k] !== 'number') s.aff[k] = 0; });
    if (!s.flags || typeof s.flags !== 'object') s.flags = {};
    if (!Array.isArray(s.backlog)) s.backlog = [];
    if (!s.name) s.name = U('defaultName');
    return s;
  }
  function validSave(s) {
    if (!s || s.v !== SAVE_VER || typeof s.pos !== 'number') return false;
    if (s.pos < 0 || s.pos >= STEPS.length) return false;
    ensureShape(s);
    return true;
  }
  function freshState(name) {
    return {
      v: SAVE_VER,
      name: name || U('defaultName'), pos: 0,
      aff: { seoyeon: 0, chaerin: 0, arin: 0 },
      flags: {}, lastFocus: null, backlog: [], chapterSeen: null
    };
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function load(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function savePrefs() { try { localStorage.setItem('neowa_prefs', JSON.stringify(prefs)); } catch (e) {} }

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
        var cgTitle = (L && L.cg && L.cg[cg.id]) || cg.title;
        var img = document.createElement('img');
        img.src = cg.file;
        img.alt = cgTitle;
        var dim = DIM[cg.file];
        if (dim) { img.width = dim[0]; img.height = dim[1]; }
        var p = document.createElement('p');
        p.textContent = cgTitle;
        d.appendChild(img);
        d.appendChild(p);
      } else {
        var locked = document.createElement('div');
        locked.className = 'gLocked';
        locked.textContent = '?';
        var lp = document.createElement('p');
        lp.textContent = U('lockedScene');
        d.appendChild(locked);
        d.appendChild(lp);
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

  function applyText(t) { return (t || '').replace(/\{name\}/g, state.name); }

  var preloaded = {};
  function preload(url) {
    if (!url || preloaded[url]) return;
    preloaded[url] = true;
    var im = new Image();
    im.src = url;
  }
  function preloadAhead() {
    var gotBg = false, gotCh = false, i;
    for (i = state.pos + 1; i < STEPS.length && i < state.pos + 14; i++) {
      var s = STEPS[i];
      if (!s || !stepOk(s)) continue;
      if (!gotBg && s.bg && BG[s.bg]) { preload(BG[s.bg]); gotBg = true; }
      if (!gotCh && s.cg) {
        var cg = cgById(s.cg);
        if (cg) { preload(cg.file); gotCh = true; }
      } else if (!gotCh && s.ch) { preload(charImg(s.ch, s.ex)); gotCh = true; }
      if (gotBg && gotCh) break;
    }
  }
  function cgById(id) {
    for (var i = 0; i < CG_LIST.length; i++) if (CG_LIST[i].id === id) return CG_LIST[i];
    return null;
  }
  function setImg(el, src, alt) {
    if (!el) return;
    if (el.getAttribute('src') !== src) el.src = src;
    var d = DIM[src];
    if (d) { el.width = d[0]; el.height = d[1]; }
    if (typeof alt === 'string') el.alt = alt;
  }
  function sideBg(file) {
    if (!file) return;
    var rel = String(file).replace(/^assets\//, '');
    document.documentElement.style.setProperty('--side-bg', 'url("' + rel + '")');
  }

  function setScene(step) {
    var bgEl = $('bgImg'), cgEl = $('cgImg'), chEl = $('charImg');
    cgEl.classList.add('hidden'); chEl.classList.add('hidden');
    cgEl.alt = '';
    if (step.cg) {
      var cg = cgById(step.cg);
      if (cg) {
        var cgTitle = (L && L.cg && L.cg[cg.id]) || cg.title;
        setImg(cgEl, cg.file, cgTitle);
        cgEl.classList.remove('hidden');
        unlockCG(cg.id);
        sideBg(cg.file);
      }
      if (step.bg) setImg(bgEl, BG[step.bg], '');
    } else {
      if (step.bg) { setImg(bgEl, BG[step.bg], ''); sideBg(BG[step.bg]); }
      if (step.ch) { setImg(chEl, charImg(step.ch, step.ex), ''); chEl.classList.remove('hidden'); }
    }
    preloadAhead();
  }

  function typeText(text) {
    var el = $('textBody');
    fullText = text; typing = true; el.textContent = '';
    var spec = SPEED[prefs.speed] || SPEED.normal;
    var stepN = spec[1], delay = spec[0];
    var i = 0;
    clearInterval(typeTimer);
    if (reduceMotion) {
      el.textContent = fullText; typing = false; scheduleAuto(); return;
    }
    typeTimer = setInterval(function () {
      i += stepN; el.textContent = fullText.slice(0, i);
      if (i >= fullText.length) { clearInterval(typeTimer); typing = false; scheduleAuto(); }
    }, delay);
  }

  function overlayOpen() {
    return !$('backlogPanel').classList.contains('hidden')
      || !$('chapterPanel').classList.contains('hidden')
      || !$('savePanel').classList.contains('hidden')
      || !$('settingsPanel').classList.contains('hidden')
      || !$('titleConfirm').classList.contains('hidden')
      || !$('galleryScreen').classList.contains('hidden');
  }

  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (overlayOpen()) return;
    var step = state && current();
    if ($('autoBtn').dataset.on === '1' && state && step && !step.choice && !step.ending && !step.judge) {
      autoTimer = setTimeout(function () { advance(); }, prefs.autoMs);
    }
  }

  function setPressed(btn, on) { if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }

  function stopModes() {
    clearTimeout(autoTimer); clearInterval(skipTimer); skipTimer = null;
    $('autoBtn').dataset.on = '0'; $('autoBtn').textContent = U('auto'); setPressed($('autoBtn'), false);
    $('skipBtn').dataset.on = '0'; $('skipBtn').textContent = U('skip'); setPressed($('skipBtn'), false);
  }

  function pauseModes() {
    clearTimeout(autoTimer); clearInterval(skipTimer); skipTimer = null;
  }

  function resumeModes() {
    if (overlayOpen() || !state) return;
    if ($('gameScreen').classList.contains('hidden')) return;
    if ($('autoBtn').dataset.on === '1' && !typing) scheduleAuto();
    if ($('skipBtn').dataset.on === '1') startSkip();
  }

  function current() { return STEPS[state.pos]; }

  function stepOk(step) {
    if (!step) return false;
    if (step.ifFocus && state.lastFocus !== step.ifFocus) return false;
    if (step.unlessFocus && state.lastFocus === step.unlessFocus) return false;
    return true;
  }
  function land() {
    while (state.pos < STEPS.length && STEPS[state.pos] && !stepOk(STEPS[state.pos])) state.pos++;
  }

  var CHAPTER_BREAKS = {
    D1_01_01: 'Day 1 · 전학 첫날', N1_01: 'Day 1 · 밤',
    D2_01_01: 'Day 2 · 가까워지는 거리', N2_01: 'Day 2 · 밤',
    D3_01_01: 'Day 3 · 축제 준비', N3_01: 'Day 3 · 밤',
    D4_01_01: 'Day 4 · 축제 전날', D5_01_01: 'Day 5 · 축제 당일'
  };

  function pushLog(sp, tx) {
    var last = state.backlog[state.backlog.length - 1];
    if (!last || last.sp !== sp || last.tx !== tx || state.pos !== last.pos) {
      state.backlog.push({ sp: sp, tx: tx, pos: state.pos });
      if (state.backlog.length > 300) state.backlog.shift();
    }
  }

  function restoreHeldLine() {
    if ($('textBody').textContent) return;
    var last = null, i;
    for (i = state.backlog.length - 1; i >= 0; i--) {
      if (state.backlog[i].sp !== U('choiceLabel')) { last = state.backlog[i]; break; }
    }
    if (!last) return;
    $('speakerName').textContent = last.sp || '';
    $('speakerName').style.display = last.sp ? 'block' : 'none';
    $('textBody').textContent = last.tx || '';
  }

  function render() {
    land();
    var step = current();
    if (!step) { finishToTitle(); return; }
    if (step.judge) { doJudge(); return; }
    var isChapter = !!CHAPTER_BREAKS[step.id] && state.chapterSeen !== step.id;
    if (isChapter) {
      state.chapterSeen = step.id;
      track('chapter_start', { chapter: step.id });
      pauseModes();
      $('chapterLabel').textContent = (L && L.chapters && L.chapters[step.id]) || CHAPTER_BREAKS[step.id];
      $('chapterPanel').classList.remove('hidden');
      return;
    }
    setScene(step);
    if (step.choice) {
      restoreHeldLine();
      $('nextMark').classList.add('hidden');
      showChoices(step);
      return;
    }
    $('nextMark').classList.remove('hidden');
    var loc = locStep(step);
    var dispSp = spDisp(step.sp);
    $('speakerName').textContent = dispSp;
    $('speakerName').style.display = step.sp ? 'block' : 'none';
    var tx = applyText((loc && loc.tx) || step.tx || '');
    if (step.sp && step.tx) pushLog(dispSp, tx);
    $('choiceBox').innerHTML = ''; $('choiceBox').classList.add('hidden');
    typeText(tx);
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
    }
    state.pos = idx[target];
    render();
  }
  function hasGoodFlag(c) {
    if (c === 'seoyeon') return !!state.flags.flag_seoyeon_help;
    if (c === 'chaerin') return !!(state.flags.flag_chaerin_help || state.flags.flag_chaerin_quote);
    if (c === 'arin') return !!state.flags.flag_arin_promise;
    return false;
  }

  function applyChoice(c, text) {
    pushLog(U('choiceLabel'), text);
    if (c.aff) Object.keys(c.aff).forEach(function (k) { state.aff[k] = (state.aff[k] || 0) + c.aff[k]; });
    if (c.flag) state.flags[c.flag] = true;
    if (c.focus) state.lastFocus = c.focus;
    state.pos = idx[c.goto];
    render();
  }

  function advance() {
    if (!state) return;
    if (overlayOpen()) return;
    land();
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
      b.type = 'button';
      b.className = 'choiceBtn';
      b.textContent = (locC && locC.choices && locC.choices[ci]) || c.text;
      b.onclick = function (e) {
        e.stopPropagation();
        clearTimeout(autoTimer);
        clearInterval(skipTimer); skipTimer = null;
        $('skipBtn').dataset.on = '0'; $('skipBtn').textContent = U('skip'); setPressed($('skipBtn'), false);
        applyChoice(c, b.textContent);
      };
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

  function dayLabelFromId(id) {
    if (!id) return '';
    if (id.indexOf('END_') === 0) return U('dayEnding');
    if (id === 'JUDGE') return U('dayNum').replace('{n}', '5');
    if (id.charAt(0) === 'P') return U('dayPrologue');
    var n = id.charAt(1);
    if (id.charAt(0) === 'N') return U('dayNight').replace('{n}', n);
    if (id.charAt(0) === 'D') return U('dayNum').replace('{n}', n);
    return '';
  }
  function previewOf(s) {
    if (s.backlog && s.backlog.length) {
      var b = s.backlog[s.backlog.length - 1];
      var body = b.tx || '';
      if (body.length > 72) body = body.slice(0, 72) + '…';
      return (b.sp ? b.sp + ' · ' : '') + body;
    }
    var step = STEPS[s.pos];
    if (!step || !step.tx) return U('previewEmpty');
    var loc = locStep(step);
    var tx = ((loc && loc.tx) || step.tx).replace(/\{name\}/g, s.name || '');
    if (tx.length > 72) tx = tx.slice(0, 72) + '…';
    return tx;
  }
  function readSlot(n) {
    var s = load('neowa_save_' + n);
    return validSave(s) ? s : null;
  }
  function writeSlot(n) {
    save('neowa_save_' + n, state);
    var st = $('saveStatus');
    if (st) st.textContent = U('savedMsg').replace('{slot}', String(n));
    pendingSlot = null;
    $('overwriteBox').classList.add('hidden');
    paintSlots();
  }
  function paintSlots() {
    var box = $('saveSlots');
    box.innerHTML = '';
    $('overwriteBox').classList.add('hidden');
    [1, 2, 3].forEach(function (n) {
      var s = readSlot(n);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'slotBtn';
      var label = document.createElement('b');
      label.textContent = U('slotLabel').replace('{n}', String(n));
      var day = document.createElement('span');
      day.className = 'slotDay';
      day.textContent = s ? (dayLabelFromId(STEPS[s.pos] && STEPS[s.pos].id) + (s.name ? ' · ' + s.name : '')) : U('emptySlot');
      var prev = document.createElement('span');
      prev.className = 'slotPrev';
      prev.textContent = s ? previewOf(s) : '';
      b.appendChild(label); b.appendChild(day); b.appendChild(prev);
      b.onclick = function (e) {
        e.stopPropagation();
        if (saveMode === 'load') {
          if (!s) { $('saveStatus').textContent = U('noSlotMsg'); return; }
          state = s;
          stopModes();
          closePanels();
          show('gameScreen');
          render();
          return;
        }
        if (!state) return;
        if (s) {
          pendingSlot = n;
          $('overwriteText').textContent = U('overwriteAsk') + ' ' + dayLabelFromId(STEPS[s.pos] && STEPS[s.pos].id);
          $('overwriteBox').classList.remove('hidden');
        } else writeSlot(n);
      };
      box.appendChild(b);
    });
  }
  function openSave(mode) {
    if (mode === 'save' && !state) return;
    saveMode = mode;
    pauseModes();
    $('savePanelTitle').textContent = mode === 'save' ? U('save') : U('load');
    $('savePanelHint').textContent = U('autosaveHint');
    $('saveStatus').textContent = '';
    paintSlots();
    $('savePanel').classList.remove('hidden');
  }
  function closePanels() {
    $('backlogPanel').classList.add('hidden');
    $('savePanel').classList.add('hidden');
    $('settingsPanel').classList.add('hidden');
    $('titleConfirm').classList.add('hidden');
    $('chapterPanel').classList.add('hidden');
  }

  function paintSettings() {
    function seg(el, items, cur, onPick) {
      el.innerHTML = '';
      items.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = it.label;
        b.className = it.value === cur ? 'on' : '';
        b.setAttribute('aria-pressed', it.value === cur ? 'true' : 'false');
        b.onclick = function (e) { e.stopPropagation(); onPick(it.value); paintSettings(); };
        el.appendChild(b);
      });
    }
    seg($('speedSeg'), [
      { value: 'slow', label: U('speedSlow') },
      { value: 'normal', label: U('speedNormal') },
      { value: 'fast', label: U('speedFast') }
    ], prefs.speed, function (v) { prefs.speed = v; savePrefs(); });
    seg($('waitSeg'), [
      { value: 2200, label: U('waitShort') },
      { value: 3200, label: U('waitNormal') },
      { value: 4800, label: U('waitLong') }
    ], prefs.autoMs, function (v) { prefs.autoMs = v; savePrefs(); });
  }

  function startSkip() {
    clearInterval(skipTimer);
    $('skipBtn').dataset.on = '1'; $('skipBtn').textContent = U('skipOn'); setPressed($('skipBtn'), true);
    skipTimer = setInterval(function () {
      if (overlayOpen()) return;
      var step = current();
      if (!step || step.choice || step.ending || step.judge || (CHAPTER_BREAKS[step.id] && state.chapterSeen !== step.id)) {
        pauseModes();
        if (step) render();
        return;
      }
      if (typing) { clearInterval(typeTimer); typing = false; }
      if (step.goto) state.pos = idx[step.goto];
      else state.pos += 1;
      render();
    }, 120);
  }

  function applyLabels() {
    var set = function (id, key) { var el = $(id); if (el) el.textContent = U(key); };
    set('taglineText', 'tagline'); set('nameLabelText', 'nameLabel');
    set('newGameBtn', 'newGame'); set('continueBtn', 'continue'); set('galleryBtn', 'gallery');
    set('noticeText', 'notice'); set('updateNoticeText', 'updateNotice'); set('crawlIntro', 'intro');
    set('autosaveHint', 'autosaveHint');
    set('saveBtn', 'save'); set('loadBtn', 'load'); set('backlogBtn', 'backlog');
    set('autoBtn', 'auto'); set('skipBtn', 'skip'); set('settingsBtn', 'settings'); set('titleBtn', 'toTitleShort');
    set('galBtn2', 'gallery');
    set('chapterContinueBtn', 'continueChapter'); set('backlogTitle', 'backlog'); set('backlogCloseBtn', 'close');
    set('galleryTitle', 'gallery'); set('galleryBackBtn', 'back');
    set('restartBtn', 'restart'); set('endingGalleryBtn', 'galleryView'); set('endingTitleBtn', 'toTitle');
    set('settingsTitle', 'settings'); set('settingsClose', 'close');
    set('speedLabel', 'textSpeed'); set('waitLabel', 'autoWait');
    set('savePanelClose', 'close');
    set('overwriteYes', 'overwriteYes'); set('overwriteNo', 'cancel');
    set('titleConfirmTitle', 'titleConfirm'); set('titleConfirmBody', 'titleConfirmBody');
    set('titleConfirmYes', 'leaveYes'); set('titleConfirmNo', 'cancel');
    set('linkAbout', 'linkAbout'); set('linkChars', 'linkChars'); set('linkContact', 'linkContact'); set('linkPrivacy', 'linkPrivacy');
    var ni = $('nameInput'); if (ni && !ni.value) ni.placeholder = U('defaultName');
    if ($('autoBtn').dataset.on === '1') $('autoBtn').textContent = U('autoOn');
    if ($('skipBtn').dataset.on === '1') $('skipBtn').textContent = U('skipOn');
    paintSettings();
  }

  function refreshAfterLang() {
    applyLabels();
    if (!state || $('gameScreen').classList.contains('hidden')) return;
    var step = current();
    if (!step || step.choice || !step.tx) return;
    var loc = locStep(step);
    var tx = applyText((loc && loc.tx) || step.tx || '');
    var dispSp = spDisp(step.sp);
    $('speakerName').textContent = dispSp;
    $('textBody').textContent = tx;
    fullText = tx;
    typing = false;
    var last = state.backlog[state.backlog.length - 1];
    if (last && last.pos === state.pos) { last.tx = tx; last.sp = dispSp; }
  }

  function initUI() {
    applyLabels();
    var bar = $('langBar');
    if (bar && !bar.childNodes.length) {
      LANG_LIST.forEach(function (code) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'langBtn' + (code === curLang ? ' on' : '');
        b.textContent = LANG_NAMES[code];
        b.setAttribute('aria-pressed', code === curLang ? 'true' : 'false');
        b.onclick = function () {
          if (code === curLang) return;
          try { localStorage.setItem('neowa_lang', code); } catch (e) {}
          try { document.cookie = 'neowa_lang=' + code + '; path=/; max-age=31536000'; } catch (e) {}
          var u = new URL(location.href);
          u.searchParams.set('lang', code);
          location.href = u.toString();
        };
        bar.appendChild(b);
      });
    }
    $('newGameBtn').onclick = function () {
      var n = $('nameInput').value.trim();
      startGame(n || U('defaultName'));
    };
    $('continueBtn').onclick = function () {
      var s = load('neowa_autosave');
      if (validSave(s)) { state = s; show('gameScreen'); render(); }
      else { var msg = $('titleMsg'); if (msg) msg.textContent = U('noSaveMsg'); }
    };
    $('galleryBtn').onclick = function () { prevScreen = 'titleScreen'; renderGallery(); show('galleryScreen'); };
    $('galleryBackBtn').onclick = function () { show(prevScreen); if (prevScreen === 'gameScreen') resumeModes(); };
    $('gameScreen').addEventListener('click', function (e) {
      if (e.target.closest('button, a, input, textarea, select, label')) return;
      if (overlayOpen()) return;
      advance();
    });
    document.addEventListener('keydown', function (e) {
      var key = e.key;
      if (key === 'Escape') {
        if (!$('backlogPanel').classList.contains('hidden') || !$('savePanel').classList.contains('hidden') || !$('settingsPanel').classList.contains('hidden') || !$('titleConfirm').classList.contains('hidden')) {
          e.preventDefault();
          var was = overlayOpen();
          $('backlogPanel').classList.add('hidden');
          $('savePanel').classList.add('hidden');
          $('settingsPanel').classList.add('hidden');
          $('titleConfirm').classList.add('hidden');
          if (was) resumeModes();
        }
        return;
      }
      if (key !== ' ' && key !== 'Enter') return;
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
      if ($('gameScreen').classList.contains('hidden')) return;
      if (overlayOpen()) return;
      e.preventDefault();
      advance();
    });
    $('saveBtn').onclick = function (e) { e.stopPropagation(); openSave('save'); };
    $('loadBtn').onclick = function (e) { e.stopPropagation(); openSave('load'); };
    $('savePanelClose').onclick = function (e) { e.stopPropagation(); $('savePanel').classList.add('hidden'); resumeModes(); };
    $('overwriteYes').onclick = function (e) { e.stopPropagation(); if (pendingSlot) writeSlot(pendingSlot); };
    $('overwriteNo').onclick = function (e) { e.stopPropagation(); pendingSlot = null; $('overwriteBox').classList.add('hidden'); };
    $('backlogBtn').onclick = function (e) {
      e.stopPropagation();
      var box = $('backlogPanel');
      if (!box.classList.contains('hidden')) { box.classList.add('hidden'); resumeModes(); return; }
      pauseModes();
      box.classList.remove('hidden');
      var list = $('backlogList');
      list.innerHTML = '';
      if (!state || !state.backlog.length) {
        var empty = document.createElement('p');
        empty.textContent = U('noRecord');
        list.appendChild(empty);
        return;
      }
      state.backlog.forEach(function (b) {
        var p = document.createElement('p');
        var strong = document.createElement('b');
        strong.textContent = b.sp || '';
        p.appendChild(strong);
        p.appendChild(document.createTextNode(' ' + (b.tx || '')));
        list.appendChild(p);
      });
      list.scrollTop = list.scrollHeight;
    };
    $('backlogCloseBtn').onclick = function (e) { e.stopPropagation(); $('backlogPanel').classList.add('hidden'); resumeModes(); };
    $('autoBtn').onclick = function (e) {
      e.stopPropagation();
      var on = $('autoBtn').dataset.on === '1';
      $('autoBtn').dataset.on = on ? '0' : '1';
      $('autoBtn').textContent = on ? U('auto') : U('autoOn');
      setPressed($('autoBtn'), !on);
      if (!on) scheduleAuto(); else clearTimeout(autoTimer);
    };
    $('skipBtn').onclick = function (e) {
      e.stopPropagation();
      if ($('skipBtn').dataset.on === '1') { stopModes(); return; }
      startSkip();
    };
    $('settingsBtn').onclick = function (e) {
      e.stopPropagation();
      if (!$('settingsPanel').classList.contains('hidden')) { $('settingsPanel').classList.add('hidden'); resumeModes(); return; }
      pauseModes();
      paintSettings();
      $('settingsPanel').classList.remove('hidden');
    };
    $('settingsClose').onclick = function (e) { e.stopPropagation(); $('settingsPanel').classList.add('hidden'); resumeModes(); };
    $('titleBtn').onclick = function (e) {
      e.stopPropagation();
      if (!state) { finishToTitle(); return; }
      pauseModes();
      $('titleConfirm').classList.remove('hidden');
    };
    $('titleConfirmNo').onclick = function (e) { e.stopPropagation(); $('titleConfirm').classList.add('hidden'); resumeModes(); };
    $('titleConfirmYes').onclick = function (e) {
      e.stopPropagation();
      if (state) save('neowa_autosave', state);
      $('titleConfirm').classList.add('hidden');
      finishToTitle();
    };
    $('galBtn2').onclick = function (e) { e.stopPropagation(); pauseModes(); prevScreen = 'gameScreen'; renderGallery(); show('galleryScreen'); };
    $('endingGalleryBtn').onclick = function () { prevScreen = 'endingScreen'; renderGallery(); show('galleryScreen'); };
    $('endingTitleBtn').onclick = function () { finishToTitle(); };
    $('restartBtn').onclick = function () { startGame(state ? state.name : U('defaultName')); };
    $('chapterContinueBtn').onclick = function (e) {
      e.stopPropagation();
      $('chapterPanel').classList.add('hidden');
      render();
      resumeModes();
    };
    setPressed($('autoBtn'), false);
    setPressed($('skipBtn'), false);
    setInterval(function () { if (state && !$('gameScreen').classList.contains('hidden')) save('neowa_autosave', state); }, 5000);
  }
  function loadI18n(done) {
    var booted = false;
    function finishBoot() {
      if (booted) return;
      booted = true;
      L = (window.I18N_DATA && window.I18N_DATA.lang === curLang) ? window.I18N_DATA : null;
      done();
    }
    function onLoad() {
      if (window.I18N_DATA && window.I18N_DATA.lang === curLang) L = window.I18N_DATA;
      if (!booted) finishBoot();
      else refreshAfterLang();
    }
    var s = document.createElement('script');
    s.onload = onLoad;
    s.onerror = function () { finishBoot(); };
    setTimeout(finishBoot, 3000);
    s.src = 'assets/i18n/' + curLang + '.js';
    document.head.appendChild(s);
  }
  function boot() {
    if (curLang !== 'ko' && !L) loadI18n(initUI);
    else initUI();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
