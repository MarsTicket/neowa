// 방과 후, 너와: 비주얼노벨 엔진
(function () {
  'use strict';
  var BG = {
    street: 'assets/images/bg_street_morning.webp',
    classroom: 'assets/images/bg_classroom_day.webp',
    corridor: 'assets/images/bg_corridor_afternoon.webp',
    library: 'assets/images/bg_library_after.webp',
    rooftop: 'assets/images/bg_rooftop_sunset.webp',
    broadcast: 'assets/images/bg_broadcast_noon.webp'
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
  var state = null;
  var autoTimer = null, skipTimer = null, typeTimer = null, typing = false, fullText = '';
  var prevScreen = 'titleScreen';

  function freshState(name) {
    return {
      name: name || '김도현', pos: 0,
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
        d.innerHTML = '<img src="' + cg.file + '" alt="' + cg.title + '"><p>' + cg.title + '</p>';
      } else {
        d.innerHTML = '<div class="gLocked">?</div><p>아직 보지 못한 장면</p>';
      }
      box.appendChild(d);
    });
    var e = load('neowa_endings') || {};
    var names = { SY_GOOD: '서연 굿', SY_NORMAL: '서연 노멀', CH_GOOD: '채린 굿', CH_NORMAL: '채린 노멀', AR_GOOD: '아린 굿', AR_NORMAL: '아린 노멀', SOLO: '솔로' };
    var got = Object.keys(names).filter(function (k) { return e[k]; }).map(function (k) { return names[k]; });
    $('endingList').textContent = '본 엔딩 ' + got.length + ' / 7' + (got.length ? ' : ' + got.join(', ') : '');
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
      if (cg) { cgEl.src = cg.file; cgEl.classList.remove('hidden'); unlockCG(cg.id); state.seen[cg.id] = true; }
      if (step.bg) bgEl.src = BG[step.bg];
    } else {
      if (step.bg) bgEl.src = BG[step.bg];
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
    $('autoBtn').dataset.on = '0'; $('autoBtn').textContent = '자동';
    $('skipBtn').dataset.on = '0'; $('skipBtn').textContent = '스킵';
  }

  function current() { return STEPS[state.pos]; }

  function render() {
    var step = current();
    if (!step) { finishToTitle(); return; }
    if (step.judge) { doJudge(); return; }
    setScene(step);
    $('speakerName').textContent = step.sp || '';
    $('speakerName').style.display = step.sp ? 'block' : 'none';
    if (step.sp && step.tx) {
      var line = { sp: step.sp, tx: applyText(step.tx) };
      var last = state.backlog[state.backlog.length - 1];
      if (!last || last.sp !== line.sp || last.tx !== line.tx || state.pos !== last.pos) {
        state.backlog.push({ sp: line.sp, tx: line.tx, pos: state.pos });
        if (state.backlog.length > 300) state.backlog.shift();
      }
    }
    $('choiceBox').innerHTML = ''; $('choiceBox').classList.add('hidden');
    typeText(applyText(step.tx || ''));
    if (step.ending) { /* 마지막 대사를 보여준 뒤 클릭하면 엔딩 화면 */ }
  }

  function doJudge() {
    var a = state.aff;
    var chars = ['seoyeon', 'chaerin', 'arin'];
    var max = Math.max(a.seoyeon, a.chaerin, a.arin);
    var target;
    if (max <= 6) { target = 'END_SOLO_01'; }
    else {
      var tops = chars.filter(function (c) { return a[c] === max; });
      var pick = tops[0];
      if (tops.length > 1) {
        var flagged = tops.filter(function (c) { return hasGoodFlag(c); });
        if (flagged.length === 1) pick = flagged[0];
        else if (tops.indexOf(state.lastFocus) >= 0) pick = state.lastFocus;
      }
      var good = a[pick] >= 11 && hasGoodFlag(pick);
      var pre = pick === 'seoyeon' ? 'END_SY_' : (pick === 'chaerin' ? 'END_CH_' : 'END_AR_');
      target = pre + (good ? 'G01' : 'N01');
      if (a[pick] < 7) target = 'END_SOLO_01';
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
    step.choice.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'choiceBtn'; b.textContent = c.text;
      b.onclick = function (e) { e.stopPropagation(); clearTimeout(autoTimer); clearInterval(skipTimer); skipTimer = null; $('skipBtn').dataset.on = '0'; $('skipBtn').textContent = '스킵'; applyChoice(c); };
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
    $('endingTitle').textContent = ENDING_TITLES[step.ending] || '엔딩';
    var a = state.aff;
    $('endingAff').textContent = '최종 호감도: 서연 ' + a.seoyeon + ' / 채린 ' + a.chaerin + ' / 아린 ' + a.arin;
    show('endingScreen');
  }

  function finishToTitle() { stopModes(); show('titleScreen'); }

  function startGame(name) {
    state = freshState(name);
    show('gameScreen');
    render();
  }

  // ===== UI 연결 =====
  document.addEventListener('DOMContentLoaded', function () {
    $('newGameBtn').onclick = function () {
      var n = $('nameInput').value.trim();
      startGame(n || '김도현');
    };
    $('continueBtn').onclick = function () {
      var s = load('neowa_autosave');
      if (s) { state = s; show('gameScreen'); render(); }
      else alert('저장된 진행이 없습니다.');
    };
    $('galleryBtn').onclick = function () { prevScreen = 'titleScreen'; renderGallery(); show('galleryScreen'); };
    $('galleryBackBtn').onclick = function () { show(prevScreen); };
    $('dialogueBox').onclick = function () { advance(); };
    $('saveBtn').onclick = function (e) {
      e.stopPropagation();
      var slot = prompt('저장할 슬롯 번호를 입력하세요 (1, 2, 3)', '1');
      if (slot && ['1', '2', '3'].indexOf(slot) >= 0) { save('neowa_save_' + slot, state); alert(slot + '번 슬롯에 저장했습니다.'); }
    };
    $('loadBtn').onclick = function (e) {
      e.stopPropagation();
      var slot = prompt('불러올 슬롯 번호를 입력하세요 (1, 2, 3)', '1');
      var s = slot && load('neowa_save_' + slot);
      if (s) { state = s; stopModes(); show('gameScreen'); render(); }
      else alert('해당 슬롯에 저장이 없습니다.');
    };
    $('backlogBtn').onclick = function (e) {
      e.stopPropagation();
      var box = $('backlogPanel');
      box.classList.toggle('hidden');
      var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
      $('backlogList').innerHTML = state.backlog.map(function (b) {
        return '<p><b>' + esc(b.sp) + '</b> ' + esc(b.tx) + '</p>';
      }).join('') || '<p>기록이 없습니다.</p>';
    };
    $('backlogCloseBtn').onclick = function () { $('backlogPanel').classList.add('hidden'); };
    $('autoBtn').onclick = function (e) {
      e.stopPropagation();
      var on = $('autoBtn').dataset.on === '1';
      $('autoBtn').dataset.on = on ? '0' : '1';
      $('autoBtn').textContent = on ? '자동' : '자동 중';
      if (!on) scheduleAuto(); else clearTimeout(autoTimer);
    };
    $('skipBtn').onclick = function (e) {
      e.stopPropagation();
      if (skipTimer) { stopModes(); return; }
      $('skipBtn').dataset.on = '1'; $('skipBtn').textContent = '스킵 중';
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
    $('restartBtn').onclick = function () { startGame(state ? state.name : '김도현'); };
    setInterval(function () { if (state && !$('gameScreen').classList.contains('hidden')) save('neowa_autosave', state); }, 5000);
  });
})();
