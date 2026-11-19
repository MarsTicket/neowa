(function () {
  'use strict';
  var A = Arcade;
  var W = 540, H = 960, land = false;
  var COLS = 3, ROWS = 6, SLOTS = 18;
  var RANK_M = [1, 2.35, 5.6, 13.5, 30];
  var RANK_N = ['일반', '희귀', '영웅', '전설', '신화'];
  var RANK_C = ['#8a8172', '#8ea4b5', '#9a3d34', '#c6a15a', '#f0e2c0'];
  var CLSN = { warrior: '전사', archer: '궁수', mage: '마법사', assassin: '암살자', priest: '성직자', summoner: '소환사', engineer: '기계공' };

  var HEROES = [
    { id: 'swordsman', name: '성벽의 검객', cls: 'warrior', kind: 'slash', cd: 0.72, dmg: 11, rng: 1.45, aoe: 34, melee: 1, cape: '#4a2420', metal: '#8d8478', hi: '#cfc6b8', lo: '#4e493f', trim: '#c6a15a', skin: '#cbb59a', helm: 'sallet', weapon: 'sword' },
    { id: 'lancer', name: '창기사', cls: 'warrior', kind: 'lance', cd: 1.05, dmg: 16, rng: 2.15, pierce: 1, melee: 1, cape: '#3e2a22', metal: '#9a8f84', hi: '#ddd4c6', lo: '#5a5148', trim: '#b08968', skin: '#d2b89a', helm: 'nasal', weapon: 'spear' },
    { id: 'berserk', name: '광전사', cls: 'warrior', kind: 'slash', cd: 0.55, dmg: 8, rng: 1.32, rage: 1, melee: 1, cape: '#5a1e18', metal: '#6e6258', hi: '#a89888', lo: '#3a322c', trim: '#a33b32', skin: '#b08968', helm: 'horns', weapon: 'axe' },
    { id: 'captain', name: '수호대장', cls: 'warrior', kind: 'slash', cd: 0.95, dmg: 9, rng: 1.5, buff: 0.08, near: 1, melee: 1, cape: '#2c2420', metal: '#b3a48a', hi: '#e6dcc8', lo: '#6a5c48', trim: '#e6d3a1', skin: '#e0c8a8', helm: 'crest', weapon: 'banner' },
    { id: 'longbow', name: '장궁수', cls: 'archer', kind: 'arrow', cd: 0.48, dmg: 7, rng: 3.8, cape: '#3d4632', metal: '#7d6a52', hi: '#cbb89a', lo: '#3e3428', trim: '#c6a15a', skin: '#d2b48c', helm: 'hood', weapon: 'bow' },
    { id: 'crossbow', name: '석궁병', cls: 'archer', kind: 'bolt', cd: 1.15, dmg: 20, rng: 3.4, armor: 1.45, cape: '#2e3228', metal: '#8a8175', hi: '#d5d0c6', lo: '#4a463e', trim: '#8a8070', skin: '#c4b09a', helm: 'kettle', weapon: 'crossbow' },
    { id: 'volley', name: '화살비', cls: 'archer', kind: 'arrow', cd: 1.25, dmg: 6, rng: 3.2, shots: 3, shotMul: 0.62, cape: '#4a3b2a', metal: '#a08c6a', hi: '#e6d3b0', lo: '#5a4630', trim: '#c6a15a', skin: '#e0c4a0', helm: 'none', weapon: 'bow' },
    { id: 'poisonbow', name: '독화살', cls: 'archer', kind: 'poison', cd: 0.7, dmg: 4, rng: 3.3, poison: 1, cape: '#2a3324', metal: '#5c6a48', hi: '#a8b48a', lo: '#2e3824', trim: '#6b8f4e', skin: '#cbb89a', helm: 'mask', weapon: 'bow' },
    { id: 'flame', name: '화염술사', cls: 'mage', kind: 'fire', cd: 1.2, dmg: 12, rng: 2.8, aoe: 48, magic: 1, cape: '#4a2218', metal: '#6a4030', hi: '#c48a62', lo: '#3a2218', trim: '#e07a3a', skin: '#d2b09a', helm: 'circlet', weapon: 'staff' },
    { id: 'frost', name: '서리마법', cls: 'mage', kind: 'frost', cd: 0.9, dmg: 6, rng: 2.7, slow: 0.35, magic: 1, cape: '#2a333c', metal: '#8a97a2', hi: '#d5dde4', lo: '#3a444c', trim: '#b7c4ce', skin: '#e6d3c4', helm: 'circlet', weapon: 'staff' },
    { id: 'lightning', name: '번개술사', cls: 'mage', kind: 'chain', cd: 1.15, dmg: 11, rng: 2.9, chain: 3, magic: 1, cape: '#3a3428', metal: '#c6a15a', hi: '#f0e2c0', lo: '#6a5430', trim: '#e6d3a1', skin: '#e0c8a8', helm: 'horns', weapon: 'staff' },
    { id: 'curse', name: '저주술사', cls: 'mage', kind: 'curse', cd: 1.0, dmg: 5, rng: 2.8, curse: 1, magic: 1, cape: '#2a1c28', metal: '#6a4a58', hi: '#c4a0aa', lo: '#3a2430', trim: '#a36a78', skin: '#c4a898', helm: 'hood', weapon: 'book' },
    { id: 'shadow', name: '그림자칼', cls: 'assassin', kind: 'slash', cd: 0.62, dmg: 13, rng: 1.7, execute: 0.07, melee: 1, cape: '#1a1a1e', metal: '#4a4a52', hi: '#9a9aa2', lo: '#222228', trim: '#8a3040', skin: '#b89a88', helm: 'mask', weapon: 'dagger' },
    { id: 'dagger', name: '암살표', cls: 'assassin', kind: 'dagger', cd: 0.58, dmg: 8, rng: 2.6, gold: 2, cape: '#2a2224', metal: '#8a8078', hi: '#d2c8c0', lo: '#4a403c', trim: '#c6a15a', skin: '#d2b49a', helm: 'hood', weapon: 'dagger' },
    { id: 'venom', name: '맹독객', cls: 'assassin', kind: 'venom', cd: 0.8, dmg: 5, rng: 2.2, poison: 2, cape: '#1e281c', metal: '#3e4a34', hi: '#8a9a72', lo: '#1e2818', trim: '#5a7a3a', skin: '#c4b09a', helm: 'mask', weapon: 'dagger' },
    { id: 'cleric', name: '성직자', cls: 'priest', kind: 'smite', cd: 1.1, dmg: 8, rng: 2.6, heal: 0.035, magic: 1, cape: '#d9d0c0', metal: '#c6a15a', hi: '#f4efe4', lo: '#8a7a58', trim: '#e6d3a1', skin: '#e6d3c4', helm: 'circlet', weapon: 'mace' },
    { id: 'chant', name: '성가대', cls: 'priest', kind: 'smite', cd: 1.4, dmg: 4, rng: 2.4, buff: 0.1, magic: 1, cape: '#cfc6b4', metal: '#8a8070', hi: '#e6e0d4', lo: '#5a5348', trim: '#c6a15a', skin: '#e0c8b0', helm: 'none', weapon: 'banner' },
    { id: 'bless', name: '축복사', cls: 'priest', kind: 'smite', cd: 0.95, dmg: 7, rng: 2.5, crit: 0.15, magic: 1, cape: '#e6dcc8', metal: '#b7a27a', hi: '#f4ecdc', lo: '#6a5c40', trim: '#e6d3a1', skin: '#f0ddc4', helm: 'circlet', weapon: 'book' },
    { id: 'skull', name: '해골소환사', cls: 'summoner', kind: 'bone', cd: 0.85, dmg: 6, rng: 2.7, shots: 2, shotMul: 0.75, magic: 1, cape: '#2a2622', metal: '#cfc6b4', hi: '#f0ebe2', lo: '#6a645c', trim: '#e6d3a1', skin: '#cbb8a4', helm: 'skull', weapon: 'staff' },
    { id: 'wolf', name: '늑대사제', cls: 'summoner', kind: 'wolf', cd: 0.7, dmg: 9, rng: 2.05, cape: '#3a2e24', metal: '#6a5344', hi: '#c4a48a', lo: '#3a2c22', trim: '#a36a3a', skin: '#c4a080', helm: 'horns', weapon: 'claw' },
    { id: 'plague', name: '역병술사', cls: 'summoner', kind: 'cloud', cd: 1.35, dmg: 7, rng: 2.5, aoe: 54, poison: 1, magic: 1, cape: '#2e3328', metal: '#6a7058', hi: '#b4baa4', lo: '#32382c', trim: '#6b8f4e', skin: '#c4b89a', helm: 'hood', weapon: 'staff' },
    { id: 'ballista', name: '쇠뇌공', cls: 'engineer', kind: 'ballista', cd: 1.35, dmg: 22, rng: 3.9, armor: 1.3, cape: '#3a342c', metal: '#8a7358', hi: '#d2c0a4', lo: '#4a3c2c', trim: '#c6a15a', skin: '#d2b89a', helm: 'kettle', weapon: 'crossbow' },
    { id: 'gear', name: '톱니공', cls: 'engineer', kind: 'gear', cd: 0.8, dmg: 6, rng: 2.2, slow: 0.28, cape: '#2c2824', metal: '#a07a48', hi: '#e0c090', lo: '#5a4028', trim: '#c68a48', skin: '#c4a888', helm: 'goggles', weapon: 'hammer' },
    { id: 'powder', name: '화약공', cls: 'engineer', kind: 'bomb', cd: 1.55, dmg: 15, rng: 2.6, aoe: 60, cape: '#3a2a22', metal: '#6a5040', hi: '#c4a090', lo: '#3a2820', trim: '#a33b32', skin: '#d2b09a', helm: 'none', weapon: 'bomb' }
  ];
  var HERO = {};
  for (var hi = 0; hi < HEROES.length; hi++) HERO[HEROES[hi].id] = HEROES[hi];

  var BASE = {
    n: { name: '보병', hp: 22, spd: 1, leak: 1, gold: 3, sc: 10, phys: 1, mag: 1 },
    f: { name: '질주', hp: 12, spd: 1.62, leak: 1, gold: 2, sc: 12, phys: 1, mag: 1 },
    a: { name: '장갑', hp: 48, spd: 0.7, leak: 2, gold: 5, sc: 18, phys: 0.55, mag: 1.28 },
    y: { name: '비행', hp: 16, spd: 1.38, leak: 1, gold: 4, sc: 14, phys: 1, mag: 1, fly: 1 },
    s: { name: '분열', hp: 26, spd: 0.88, leak: 1, gold: 3, sc: 8, phys: 1, mag: 1, split: 1 },
    h: { name: '치유', hp: 32, spd: 0.82, leak: 2, gold: 6, sc: 22, phys: 1, mag: 0.9, heal: 1 }
  };
  var BOSSES = [
    { name: '성문 파쇄자', hp: 520, spd: 0.58, leak: 4, sc: 500, pat: 'charge' },
    { name: '역병 군주', hp: 680, spd: 0.5, leak: 4, sc: 700, pat: 'spawn' },
    { name: '흑염룡', hp: 860, spd: 0.55, leak: 5, sc: 900, pat: 'breath', fly: 1 },
    { name: '흑왕', hp: 1100, spd: 0.46, leak: 6, sc: 1200, pat: 'enrage' }
  ];
  var CARDS = [
    { id: 'dmg', name: '피의 각인', desc: '모든 영웅 공격력 +12%' },
    { id: 'rate', name: '전투의 북', desc: '공격 속도 +10%' },
    { id: 'gold', name: '약탈', desc: '획득 골드 +20%' },
    { id: 'cost', name: '소환 계약', desc: '소환 비용 -12%' },
    { id: 'gate', name: '성문 수리', desc: '성문 내구 +4' },
    { id: 'purse', name: '금고', desc: '골드 +90' },
    { id: 'slow', name: '늪의 숨', desc: '감속 +12%' },
    { id: 'poison', name: '맹독 항아리', desc: '독 피해 +25%' },
    { id: 'boss', name: '용살', desc: '보스 피해 +20%' },
    { id: 'luck', name: '운명의 눈', desc: '신화 확률 +0.4%' },
    { id: 'rank', name: '강제 승급', desc: '무작위 영웅 등급 +1' },
    { id: 'free', name: '공짜 소환', desc: '희귀 이상 영웅 1명' }
  ];
  var SELL = [8, 22, 55, 140, 340];
  var fx = new A.FX();

  var board, foes = [], shots = [], gold = 40, summons = 0, wave = 1, life = 10, maxLife = 10, score = 0, kills = 0, bossKills = 0;
  var phase = 'wait', queue = [], qi = 0, spawnT = 0, clearT = 0, cleared = 0, speed = 1, cur = 0, sel = -1, hold = 0, holdKind = '', choosing = false, choices = [];
  var mod = { dmg: 0, rate: 0, gold: 0, cost: 0, slow: 0, poison: 0, boss: 0, myth: 0 }, diceUses = 0, diceFace = -1, mythSlot = -1, bossName = '', dyingT = 0, dead = false, finished = false, stoneGain = 0;
  var playT = 0, tutStep = 9, hitSnd = 0, uid = 1, mood = '', warnCap = false, dust = [], introT, introDone, introLen, introSeen;
  var cells, laneX, yTop, yBot, laneLen, connLen, pathLen, pathGap, gate, bg, btnRects = [], panelBuilt;
  var drag = null, keys = {};
  var META_KEY = 'neowa_summon_meta';
  var meta = loadMeta();

  function loadMeta() {
    var d = { stones: 0, atk: 0, gold: 0, gate: 0, luck: 0, codex: {} };
    try {
      var o = JSON.parse(A.get(META_KEY, '') || 'null');
      if (o) {
        d.stones = o.stones || 0; d.atk = o.atk || 0; d.gold = o.gold || 0; d.gate = o.gate || 0; d.luck = o.luck || 0;
        if (o.codex) d.codex = o.codex;
      }
    } catch (e) {}
    return d;
  }
  function saveMeta() { A.set(META_KEY, JSON.stringify(meta)); }
  function unlock(id, rank) {
    var prev = meta.codex[id];
    if (prev == null || rank > prev) { meta.codex[id] = rank; saveMeta(); }
  }

  function rng01(seed) {
    var a = seed || 1;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function geo(sh) {
    W = sh.W; H = sh.H; land = !!sh.land;
    layout();
    bakeBG();
    buildPanel(sh);
  }
  function layout() {
    var top = land ? 64 : 96;
    var bot = land ? 16 : 124;
    var pad = 8;
    var innerW = W - pad * 2;
    var innerH = H - top - bot;
    var unit = innerW / 6;
    var hw = unit * 1.25, pw = unit * 0.75;
    var ch = innerH / ROWS;
    cells = [];
    laneX = [];
    var x = pad;
    var c, r, p;
    for (p = 0; p < 3; p++) {
      var hx = x;
      x += hw;
      laneX.push(x + pw / 2);
      x += pw;
      for (r = 0; r < ROWS; r++) {
        var idx = r * 3 + p;
        cells[idx] = { x: hx + 2, y: top + r * ch + 2, w: hw - 4, h: ch - 4, c: p, r: r };
      }
    }
    yTop = top + 8;
    yBot = top + innerH - 8;
    laneLen = Math.max(40, yBot - yTop);
    connLen = Math.abs(laneX[1] - laneX[0]);
    pathLen = laneLen * 3 + connLen * 2;
    pathGap = Math.abs(laneX[0] - (cells[0].x + cells[0].w / 2));
    gate = { x: laneX[2], y: yBot };
    btnRects = [];
    if (!land) {
      var y1 = H - 112, h1 = 56, gap = 6, x0 = 8;
      var w1 = Math.floor((W - 16 - gap * 2) * 0.42);
      var w2 = Math.floor((W - 16 - gap * 2) * 0.29);
      var w3 = W - 16 - gap * 2 - w1 - w2;
      btnRects.push({ id: 'summon', x: x0, y: y1, w: w1, h: h1 });
      btnRects.push({ id: 'sell', x: x0 + w1 + gap, y: y1, w: w2, h: h1 });
      btnRects.push({ id: 'dice', x: x0 + w1 + w2 + gap * 2, y: y1, w: w3, h: h1 });
      var y2 = H - 50, h2 = 42, sw = Math.floor((W - 16 - gap * 2) / 3);
      for (c = 0; c < 3; c++) btnRects.push({ id: 'sp' + (c + 1), x: 8 + c * (sw + gap), y: y2, w: c === 2 ? W - 16 - 2 * (sw + gap) : sw, h: h2, sp: c + 1 });
    }
  }

  function bakeBG() {
    bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    var g = bg.getContext('2d');
    var rnd = rng01(901);
    var grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#14110e');
    grd.addColorStop(0.45, '#1c1612');
    grd.addColorStop(1, '#0c0a09');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    var i, x, y;
    for (i = 0; i < 220; i++) {
      x = rnd() * W; y = rnd() * H;
      g.fillStyle = 'rgba(0,0,0,' + (0.15 + rnd() * 0.25) + ')';
      g.fillRect(x, y, 2 + rnd() * 8, 2 + rnd() * 5);
    }
    for (i = 0; i < 80; i++) {
      g.fillStyle = 'rgba(90,70,48,' + (0.05 + rnd() * 0.08) + ')';
      g.fillRect(rnd() * W, rnd() * H, 10 + rnd() * 30, 6 + rnd() * 14);
    }
    // 길
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#2a2118'; g.lineWidth = land ? 46 : 40;
    tracePath(g); g.stroke();
    g.strokeStyle = '#3a2e24'; g.lineWidth = land ? 28 : 24;
    tracePath(g); g.stroke();
    g.strokeStyle = 'rgba(198,161,90,.18)'; g.lineWidth = 2;
    tracePath(g); g.stroke();
    // 소환 칸 받침대
    for (i = 0; i < SLOTS; i++) {
      var cl = cells[i];
      g.fillStyle = '#1a1512';
      A.rr(g, cl.x, cl.y, cl.w, cl.h, 8); g.fill();
      g.strokeStyle = 'rgba(198,161,90,.22)'; g.lineWidth = 1.5; g.stroke();
      var cg = g.createRadialGradient(cl.x + cl.w / 2, cl.y + cl.h * 0.72, 2, cl.x + cl.w / 2, cl.y + cl.h * 0.72, cl.w * 0.4);
      cg.addColorStop(0, 'rgba(90,60,30,.35)'); cg.addColorStop(1, 'rgba(90,60,30,0)');
      g.fillStyle = cg; g.fillRect(cl.x, cl.y, cl.w, cl.h);
    }
    // 횃불 (구워 둔 따뜻한 빛)
    var torches = [[laneX[0], yTop + 10], [laneX[2], yTop + 10], [gate.x, gate.y - 6], [W * 0.5, land ? 30 : 90]];
    for (i = 0; i < torches.length; i++) {
      var tg = g.createRadialGradient(torches[i][0], torches[i][1], 2, torches[i][0], torches[i][1], 90);
      tg.addColorStop(0, 'rgba(255,170,70,.28)');
      tg.addColorStop(0.4, 'rgba(180,80,30,.08)');
      tg.addColorStop(1, 'rgba(180,80,30,0)');
      g.fillStyle = tg; g.beginPath(); g.arc(torches[i][0], torches[i][1], 90, 0, 6.3); g.fill();
    }
    // 성문
    drawGate(g, gate.x, gate.y, 1);
    // 비네트
    var vg = g.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  function tracePath(g) {
    g.beginPath();
    g.moveTo(laneX[0], yTop);
    g.lineTo(laneX[0], yBot);
    g.lineTo(laneX[1], yBot);
    g.lineTo(laneX[1], yTop);
    g.lineTo(laneX[2], yTop);
    g.lineTo(laneX[2], yBot);
  }
  function drawGate(g, x, y, sc) {
    g.save(); g.translate(x, y); g.scale(sc, sc);
    g.fillStyle = '#1a120e';
    A.rr(g, -26, -34, 52, 40, 4); g.fill();
    g.fillStyle = '#3a2418';
    g.fillRect(-20, -28, 16, 30); g.fillRect(4, -28, 16, 30);
    g.strokeStyle = '#c6a15a'; g.lineWidth = 2;
    g.strokeRect(-20.5, -28.5, 17, 31); g.strokeRect(3.5, -28.5, 17, 31);
    g.fillStyle = '#8a6230';
    g.beginPath(); g.arc(-12, -14, 2, 0, 6.3); g.arc(12, -14, 2, 0, 6.3); g.fill();
    g.fillStyle = '#a33b32';
    g.fillRect(-2, -30, 4, 8);
    g.restore();
  }

  function sprHero(h) {
    return A.sprite('sumH_' + h.id, 160, 200, function (x) {
      var robe = h.cls === 'mage' || h.cls === 'priest' || h.cls === 'summoner';
      x.translate(80, 176);
      x.fillStyle = 'rgba(0,0,0,.5)';
      x.beginPath(); x.ellipse(0, 12, 40, 10, 0, 0, 6.3); x.fill();
      x.fillStyle = h.cape;
      x.beginPath();
      x.moveTo(-10, -122);
      x.quadraticCurveTo(-62, -48, -38, 10);
      x.lineTo(38, 10);
      x.quadraticCurveTo(60, -44, 12, -122);
      x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,.3)';
      x.beginPath();
      x.moveTo(0, -114); x.quadraticCurveTo(-18, -40, -10, 8);
      x.lineTo(10, 8); x.quadraticCurveTo(16, -40, 0, -114); x.fill();
      if (!robe) {
        x.fillStyle = '#14110e';
        x.beginPath(); x.moveTo(-18, -44); x.lineTo(-20, 6); x.lineTo(-4, 6); x.lineTo(-6, -42); x.fill();
        x.beginPath(); x.moveTo(18, -44); x.lineTo(20, 6); x.lineTo(4, 6); x.lineTo(6, -42); x.fill();
        x.fillStyle = h.metal;
        x.fillRect(-22, 0, 18, 9); x.fillRect(4, 0, 18, 9);
        x.fillStyle = h.lo;
        x.fillRect(-20, 3, 14, 3); x.fillRect(6, 3, 14, 3);
      } else {
        x.fillStyle = h.lo;
        x.beginPath(); x.moveTo(-24, -78); x.lineTo(-30, 8); x.lineTo(30, 8); x.lineTo(24, -78); x.closePath(); x.fill();
        x.fillStyle = h.trim; x.globalAlpha = 0.85;
        x.fillRect(-3, -78, 6, 86); x.globalAlpha = 1;
      }
      var g = x.createLinearGradient(-26, -128, 24, -36);
      g.addColorStop(0, h.hi); g.addColorStop(0.42, h.metal); g.addColorStop(1, h.lo);
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(-20, -116); x.lineTo(-28, -52); x.lineTo(-14, -32); x.lineTo(14, -32); x.lineTo(28, -52); x.lineTo(20, -116);
      x.closePath(); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, -112); x.lineTo(0, -36); x.stroke();
      x.fillStyle = h.lo;
      x.beginPath(); x.ellipse(-30, -108, 16, 11, -0.45, 0, 6.3); x.fill();
      x.beginPath(); x.ellipse(30, -108, 16, 11, 0.45, 0, 6.3); x.fill();
      x.fillStyle = h.metal;
      x.beginPath(); x.ellipse(-30, -110, 12, 7, -0.45, 0, 6.3); x.fill();
      x.beginPath(); x.ellipse(30, -110, 12, 7, 0.45, 0, 6.3); x.fill();
      x.strokeStyle = h.trim; x.lineWidth = 1.4;
      x.beginPath(); x.ellipse(-30, -110, 12, 7, -0.45, 0, 6.3); x.stroke();
      x.beginPath(); x.ellipse(30, -110, 12, 7, 0.45, 0, 6.3); x.stroke();
      x.fillStyle = h.trim; x.fillRect(-16, -44, 32, 7);
      x.fillStyle = '#1a120c'; x.beginPath(); x.arc(0, -40, 3.4, 0, 6.3); x.fill();
      x.fillStyle = h.trim; x.beginPath(); x.arc(0, -40, 1.7, 0, 6.3); x.fill();
      x.fillStyle = h.skin;
      x.beginPath(); x.ellipse(0, -136, 8, 10, 0, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(40,24,16,.45)';
      x.beginPath(); x.ellipse(0, -130, 7, 4, 0, 0, Math.PI); x.fill();
      drawHelm(x, h);
      x.save(); x.translate(26, -78); x.scale(1.35, 1.35); drawWeapon(x, h); x.restore();
    });
  }
  function drawHelm(x, h) {
    var helm = h.helm;
    x.fillStyle = h.metal;
    x.beginPath();
    x.moveTo(-12, -138); x.quadraticCurveTo(0, -156, 12, -138); x.lineTo(11, -126); x.lineTo(-11, -126); x.closePath(); x.fill();
    x.fillStyle = '#120e0c';
    x.fillRect(-8, -134, 16, 3);
    if (helm === 'sallet' || helm === 'kettle' || helm === 'nasal' || helm === 'crest') {
      x.fillStyle = h.lo;
      x.fillRect(-12, -126, 24, 8);
      if (helm === 'nasal') { x.fillStyle = h.metal; x.fillRect(-1.5, -132, 3, 14); }
      if (helm === 'crest') { x.fillStyle = h.trim; x.beginPath(); x.moveTo(0, -156); x.lineTo(4, -142); x.lineTo(-4, -142); x.fill(); }
      if (helm === 'kettle') { x.strokeStyle = h.lo; x.lineWidth = 3; x.beginPath(); x.moveTo(-16, -130); x.lineTo(16, -130); x.stroke(); }
    } else if (helm === 'horns') {
      x.strokeStyle = h.trim; x.lineWidth = 4; x.lineCap = 'round';
      x.beginPath(); x.moveTo(-8, -148); x.quadraticCurveTo(-22, -168, -28, -150); x.stroke();
      x.beginPath(); x.moveTo(8, -148); x.quadraticCurveTo(22, -168, 28, -150); x.stroke();
    } else if (helm === 'hood' || helm === 'skull') {
      x.fillStyle = helm === 'skull' ? '#d9d0c0' : h.cape;
      x.beginPath(); x.moveTo(-14, -124); x.quadraticCurveTo(-16, -158, 0, -160); x.quadraticCurveTo(16, -158, 14, -124); x.closePath(); x.fill();
      if (helm === 'skull') {
        x.fillStyle = '#1a120c';
        x.fillRect(-6, -142, 4, 4); x.fillRect(2, -142, 4, 4);
      }
    } else if (helm === 'mask' || helm === 'goggles') {
      x.fillStyle = '#14110e';
      if (helm === 'goggles') {
        x.strokeStyle = h.trim; x.lineWidth = 2;
        x.strokeRect(-9, -136, 7, 6); x.strokeRect(2, -136, 7, 6);
        x.beginPath(); x.moveTo(-2, -133); x.lineTo(2, -133); x.stroke();
      } else {
        x.fillRect(-9, -134, 18, 7);
      }
    } else if (helm === 'circlet') {
      x.strokeStyle = h.trim; x.lineWidth = 2;
      x.beginPath(); x.arc(0, -140, 12, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
      x.fillStyle = h.trim; x.beginPath(); x.arc(0, -152, 2.6, 0, 6.3); x.fill();
    } else {
      x.fillStyle = h.cape;
      x.beginPath(); x.moveTo(-13, -128); x.quadraticCurveTo(0, -156, 13, -128); x.fill();
    }
  }
  function drawWeapon(x, h) {
    var wpn = h.weapon;
    x.strokeStyle = h.trim; x.fillStyle = h.hi; x.lineWidth = 3; x.lineCap = 'round';
    if (wpn === 'sword') {
      x.strokeStyle = '#d9d4cc'; x.beginPath(); x.moveTo(0, 8); x.lineTo(4, -42); x.stroke();
      x.strokeStyle = h.trim; x.beginPath(); x.moveTo(-6, 4); x.lineTo(8, 4); x.stroke();
    } else if (wpn === 'spear') {
      x.strokeStyle = '#6a5344'; x.beginPath(); x.moveTo(0, 16); x.lineTo(0, -48); x.stroke();
      x.fillStyle = '#d9d4cc'; x.beginPath(); x.moveTo(0, -58); x.lineTo(5, -44); x.lineTo(-5, -44); x.fill();
    } else if (wpn === 'axe') {
      x.strokeStyle = '#6a5344'; x.beginPath(); x.moveTo(0, 14); x.lineTo(0, -36); x.stroke();
      x.fillStyle = '#b7b1a8'; x.beginPath(); x.moveTo(0, -36); x.quadraticCurveTo(18, -28, 0, -12); x.fill();
    } else if (wpn === 'bow') {
      x.strokeStyle = '#6a3a22'; x.lineWidth = 2.5;
      x.beginPath(); x.arc(6, -16, 26, Math.PI * 0.7, Math.PI * 1.3); x.stroke();
      x.strokeStyle = '#e6d3a1'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(-2, -38); x.lineTo(2, 8); x.stroke();
    } else if (wpn === 'crossbow') {
      x.strokeStyle = '#6a5344'; x.beginPath(); x.moveTo(-4, 6); x.lineTo(10, -28); x.stroke();
      x.strokeStyle = '#cfc6b8'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(-8, -22); x.lineTo(16, -34); x.stroke();
    } else if (wpn === 'staff') {
      x.strokeStyle = '#5a3a28'; x.beginPath(); x.moveTo(2, 18); x.lineTo(-2, -46); x.stroke();
      x.fillStyle = h.trim; x.beginPath(); x.arc(-2, -50, 5, 0, 6.3); x.fill();
    } else if (wpn === 'book') {
      x.fillStyle = '#4a2218'; A.rr(x, -8, -16, 18, 22, 2); x.fill();
      x.strokeStyle = h.trim; x.stroke();
    } else if (wpn === 'dagger') {
      x.strokeStyle = '#e6e2dc'; x.beginPath(); x.moveTo(0, 4); x.lineTo(2, -28); x.stroke();
      x.strokeStyle = h.trim; x.beginPath(); x.moveTo(-5, 2); x.lineTo(6, 2); x.stroke();
    } else if (wpn === 'mace') {
      x.strokeStyle = '#6a5344'; x.beginPath(); x.moveTo(0, 12); x.lineTo(0, -24); x.stroke();
      x.fillStyle = '#d9d4cc'; x.beginPath(); x.arc(0, -30, 7, 0, 6.3); x.fill();
    } else if (wpn === 'banner') {
      x.strokeStyle = '#6a5344'; x.beginPath(); x.moveTo(0, 16); x.lineTo(0, -46); x.stroke();
      x.fillStyle = h.trim; x.fillRect(0, -46, 16, 20);
      x.fillStyle = '#a33b32'; x.fillRect(3, -42, 10, 4);
    } else if (wpn === 'claw') {
      x.strokeStyle = '#e6e2dc'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(-4, 0); x.lineTo(-8, -22); x.moveTo(0, 2); x.lineTo(0, -26); x.moveTo(4, 0); x.lineTo(8, -20); x.stroke();
    } else if (wpn === 'hammer') {
      x.strokeStyle = '#6a5344'; x.beginPath(); x.moveTo(0, 14); x.lineTo(0, -28); x.stroke();
      x.fillStyle = '#8a8172'; x.fillRect(-12, -36, 24, 10);
    } else if (wpn === 'bomb') {
      x.fillStyle = '#2a241e'; x.beginPath(); x.arc(0, -8, 9, 0, 6.3); x.fill();
      x.strokeStyle = '#e07a3a'; x.beginPath(); x.moveTo(4, -16); x.lineTo(10, -26); x.stroke();
    }
  }

  function sprFoe(kind) {
    return A.sprite('sumF_' + kind, 140, 150, function (x) {
      x.translate(70, 126);
      x.fillStyle = 'rgba(0,0,0,.45)';
      x.beginPath(); x.ellipse(0, 8, 32, 8, 0, 0, 6.3); x.fill();
      var boss = kind.charAt(0) === 'b';
      if (kind === 'n') brute(x, '#5a4638', '#2a2018', '#c6a15a', 0, 0, boss);
      else if (kind === 'f') brute(x, '#6a4030', '#2a1814', '#e6d3a1', 1, 0, boss);
      else if (kind === 'a') brute(x, '#4a4e54', '#1e2228', '#8a8172', 0, 1, boss);
      else if (kind === 'y') wings(x, 0);
      else if (kind === 's') blob(x);
      else if (kind === 'h') cult(x, 0);
      else if (kind === 'b0') brute(x, '#6a2a22', '#1a0c0a', '#e6d3a1', 0, 1, 1);
      else if (kind === 'b1') cult(x, 1);
      else if (kind === 'b2') wings(x, 1);
      else brute(x, '#2a2428', '#0e0c10', '#c6a15a', 0, 1, 1);
    });
  }
  function brute(x, body, dark, trim, lean, heavy, boss) {
    var g = x.createLinearGradient(-28, -70, 24, 8);
    g.addColorStop(0, body); g.addColorStop(1, dark);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(lean ? -16 : -26, 6);
    x.lineTo(lean ? -14 : -22, -28);
    x.lineTo(-10, -58);
    x.lineTo(0, heavy ? -78 : -70);
    x.lineTo(10, -58);
    x.lineTo(lean ? 14 : 22, -28);
    x.lineTo(lean ? 16 : 26, 6);
    x.closePath(); x.fill();
    if (heavy) {
      x.strokeStyle = trim; x.lineWidth = 3;
      x.strokeRect(-20, -48, 40, 28);
      x.beginPath(); x.moveTo(-20, -34); x.lineTo(20, -34); x.stroke();
    }
    x.fillStyle = trim; x.fillRect(-12, -24, 24, 4);
    x.fillStyle = '#3a100c';
    x.fillRect(-8, -48, 5, 2); x.fillRect(3, -48, 5, 2);
    x.strokeStyle = trim; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(16, -10); x.lineTo(28, -46); x.stroke();
    x.fillStyle = '#cfc6b8';
    x.beginPath(); x.moveTo(28, -52); x.lineTo(34, -40); x.lineTo(22, -40); x.fill();
    if (boss) {
      x.fillStyle = trim;
      x.beginPath(); x.moveTo(-8, -72); x.lineTo(0, -96); x.lineTo(8, -72); x.fill();
      x.beginPath(); x.moveTo(-22, -60); x.lineTo(-30, -84); x.lineTo(-12, -64); x.fill();
      x.beginPath(); x.moveTo(22, -60); x.lineTo(30, -84); x.lineTo(12, -64); x.fill();
    }
  }
  function wings(x, big) {
    x.fillStyle = '#241c16';
    x.beginPath(); x.moveTo(-6, 2); x.quadraticCurveTo(-52, -16, -40, -62); x.quadraticCurveTo(-12, -28, -2, -6); x.fill();
    x.beginPath(); x.moveTo(6, 2); x.quadraticCurveTo(52, -16, 40, -62); x.quadraticCurveTo(12, -28, 2, -6); x.fill();
    x.fillStyle = big ? '#4a2018' : '#3a2a24';
    x.beginPath(); x.moveTo(-12, 4); x.lineTo(-8, -36); x.lineTo(0, -52); x.lineTo(8, -36); x.lineTo(12, 4); x.closePath(); x.fill();
    x.fillStyle = '#3a100c';
    x.fillRect(-6, -28, 4, 2); x.fillRect(2, -28, 4, 2);
    if (big) {
      x.fillStyle = '#e6d3a1';
      x.beginPath(); x.moveTo(0, -52); x.lineTo(6, -36); x.lineTo(-6, -36); x.fill();
    }
  }
  function blob(x) {
    var g = x.createRadialGradient(-6, -20, 4, 0, -10, 28);
    g.addColorStop(0, '#6a8f4e'); g.addColorStop(1, '#24301c');
    x.fillStyle = g;
    x.beginPath(); x.ellipse(0, -12, 20, 16, 0, 0, 6.3); x.fill();
    x.fillStyle = 'rgba(0,0,0,.35)';
    x.beginPath(); x.ellipse(6, -8, 6, 8, 0.4, 0, 6.3); x.fill();
    x.fillStyle = '#1a120c';
    x.beginPath(); x.arc(-6, -16, 2, 0, 6.3); x.arc(4, -18, 2, 0, 6.3); x.fill();
  }
  function cult(x, big) {
    x.fillStyle = big ? '#3a1830' : '#2a2030';
    x.beginPath(); x.moveTo(-18, 4); x.lineTo(-8, -40); x.lineTo(0, -52); x.lineTo(8, -40); x.lineTo(18, 4); x.closePath(); x.fill();
    x.fillStyle = '#cfc6b4';
    x.beginPath(); x.arc(0, -36, big ? 8 : 6, 0, 6.3); x.fill();
    x.strokeStyle = '#6b8f4e'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(8, -20); x.lineTo(8, -46); x.stroke();
    x.fillStyle = '#6b8f4e'; x.beginPath(); x.arc(8, -48, 3, 0, 6.3); x.fill();
  }

  var heroSpr = {}, foeSpr = {};
  function buildSprites() {
    var i;
    for (i = 0; i < HEROES.length; i++) heroSpr[HEROES[i].id] = sprHero(HEROES[i]);
    ['n', 'f', 'a', 'y', 's', 'h', 'b0', 'b1', 'b2', 'b3'].forEach(function (k) { foeSpr[k] = sprFoe(k); });
  }

  function scaleOf(w) { return Math.pow(1.14, Math.max(0, w - 1)); }
  function summonCost() {
    if (summons <= 0) return 0;
    var c = Math.min(480, Math.round(16 * Math.pow(1.12, summons - 1)));
    return Math.max(8, Math.round(c * (1 - Math.min(0.4, mod.cost))));
  }
  function diceCost() { return Math.round(28 * Math.pow(1.5, diceUses)); }
  function weights() {
    var L = meta.luck || 0;
    var w = [
      Math.max(6, 62 - L * 3.2),
      24 + L * 1.2,
      10 + L * 1.1,
      3.2 + L * 0.55,
      0.8 + L * 0.15 + mod.myth * 100
    ];
    return w;
  }
  function rollRank(minR) {
    var w = weights(), s = 0, i, tot = 0, r;
    for (i = 0; i < 5; i++) tot += w[i];
    r = Math.random() * tot;
    for (i = 0; i < 5; i++) { s += w[i]; if (r <= s) return Math.max(minR || 0, i); }
    return minR || 0;
  }
  function rollId() { return HEROES[Math.floor(Math.random() * HEROES.length)].id; }
  function pickType(w) {
    var r = Math.random();
    if (w >= 12 && r < 0.12) return 'h';
    if (w >= 9 && r < 0.22) return 's';
    if (w >= 7 && r < 0.36) return 'y';
    if (w >= 5 && r < 0.52) return 'a';
    if (w >= 3 && r < 0.7) return 'f';
    return 'n';
  }
  function posAt(dist) {
    var d = Math.max(0, dist), L = laneLen, C = connLen;
    if (d < L) return { x: laneX[0], y: yTop + d };
    d -= L;
    if (d < C) return { x: laneX[0] + (laneX[1] - laneX[0]) * (d / C), y: yBot };
    d -= C;
    if (d < L) return { x: laneX[1], y: yBot - d };
    d -= L;
    if (d < C) return { x: laneX[1] + (laneX[2] - laneX[1]) * (d / C), y: yTop };
    d -= C;
    return { x: laneX[2], y: yTop + Math.min(L, d) };
  }
  function cellAt(x, y) {
    var i;
    for (i = 0; i < SLOTS; i++) {
      var c = cells[i];
      if (x >= c.x && y >= c.y && x <= c.x + c.w && y <= c.y + c.h) return i;
    }
    return -1;
  }
  function emptySlot(prefer) {
    if (prefer >= 0 && prefer < SLOTS && !board[prefer]) return prefer;
    var i;
    for (i = 0; i < SLOTS; i++) if (!board[i]) return i;
    return -1;
  }
  function makeUnit(id, rank) {
    return { id: id, rank: rank, cd: 0.25 + Math.random() * 0.35, stun: 0 };
  }

  function reset() {
    board = [];
    var i; for (i = 0; i < SLOTS; i++) board.push(null);
    foes = []; shots = [];
    gold = 40; summons = 0; wave = 0; score = 0; kills = 0; bossKills = 0;
    maxLife = 10 + (meta.gate || 0) * 2; life = maxLife;
    phase = 'wait'; queue = []; qi = 0; spawnT = 0.4; clearT = 0; cleared = 0;
    speed = 1; cur = 0; sel = -1; hold = 0; holdKind = ''; choosing = false; choices = [];
    mod = { dmg: 0, rate: 0, gold: 0, cost: 0, slow: 0, poison: 0, boss: 0, myth: 0 };
    diceUses = 0; diceFace = -1; mythSlot = -1; bossName = ''; dyingT = 0; dead = false; finished = false; stoneGain = 0;
    playT = 0; hitSnd = 0; uid = 1; mood = ''; warnCap = false;
    tutStep = A.get('neowa_summon_tut', '') === '1' ? 9 : 0;
    dust = [];
    for (i = 0; i < 26; i++) dust.push({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 10, s: 0.6 + Math.random() * 1.4, a: 0.15 + Math.random() * 0.35 });
    fx.clear(); A.music.mood(null);
    startWave();
    hud();
  }
  function startWave() {
    wave++;
    queue = [];
    var boss = wave % 10 === 0;
    var n = boss ? 5 + Math.floor(wave / 12) : 6 + Math.floor(wave * 1.45);
    var i;
    for (i = 0; i < n; i++) queue.push(pickType(wave));
    if (boss) { queue.push('boss'); queue.push(pickType(wave)); queue.push(pickType(wave)); }
    qi = 0; spawnT = 0.45; phase = 'fight'; cleared = 0;
    if (S && S.banner) S.banner(boss ? '보스 웨이브' : 'WAVE ' + wave, boss ? '성문이 흔들린다' : '마물이 다가온다');
    if (wave > 1) A.sfx('level');
    setMood(boss ? 'danger' : (life <= 3 ? 'danger' : ''));
  }
  function setMood(m) { if (mood === m) return; mood = m; A.music.mood(m ? m : null); }

  function spawnOne(kind) {
    var sc = scaleOf(wave);
    var e;
    if (kind === 'boss') {
      var bi = ((Math.floor(wave / 10) - 1) % 4 + 4) % 4;
      var cyc = Math.floor((Math.floor(wave / 10) - 1) / 4);
      var b = BOSSES[bi];
      e = {
        kind: 'b' + bi, boss: 1, name: b.name, pat: b.pat, fly: b.fly || 0,
        hp: b.hp * sc * Math.pow(1.55, cyc), mhp: 0, spd: b.spd, leak: b.leak,
        gold: 40 + wave * 3, sc: b.sc + wave * 20, dist: 0, phys: 1, mag: 1,
        slow: 0, slowT: 0, poison: 0, poisonT: 0, curse: 0, ht: 0, child: 0, hit: 0, patT: 0, enraged: 0
      };
      e.mhp = e.hp;
      bossName = b.name;
      hold = 1.15; holdKind = 'boss';
      setMood('boss');
      A.sfx('bigboom'); A.vibrate([24, 40, 50]);
      fx.shake(12, 0.45); fx.flashIt('#3a1010', 0.35);
      if (S && S.banner) S.banner(b.name, '보스 출현');
    } else {
      var t = BASE[kind];
      e = {
        kind: kind, boss: 0, name: t.name, fly: t.fly || 0, split: t.split || 0, heal: t.heal || 0,
        hp: t.hp * sc, mhp: t.hp * sc, spd: t.spd, leak: t.leak, gold: t.gold + Math.floor(wave * 0.35),
        sc: t.sc, dist: 0, phys: t.phys, mag: t.mag, slow: 0, slowT: 0, poison: 0, poisonT: 0,
        curse: 0, ht: 0, child: 0, hit: 0, patT: 0
      };
    }
    e.id = uid++;
    if (kind === 'boss') e.dist = 48;
    foes.push(e);
  }

  function classInfo() {
    var cnt = {}, auraG = 0, heal = 0, i, u, h;
    for (i = 0; i < SLOTS; i++) {
      u = board[i]; if (!u || u.stun > 0) continue;
      h = HERO[u.id];
      cnt[h.cls] = (cnt[h.cls] || 0) + 1;
      if (h.buff && !h.near) auraG += h.buff * (1 + u.rank * 0.35);
      if (h.heal) heal += h.heal * (1 + u.rank * 0.45);
    }
    auraG = Math.min(0.45, auraG);
    var near = [];
    for (i = 0; i < SLOTS; i++) near.push(auraG);
    for (i = 0; i < SLOTS; i++) {
      u = board[i]; if (!u) continue;
      h = HERO[u.id];
      if (h.buff && h.near) {
        var ns = neighbors(i), k, add = h.buff * (1 + u.rank * 0.35);
        for (k = 0; k < ns.length; k++) near[ns[k]] = Math.min(0.5, near[ns[k]] + add);
      }
    }
    return { cnt: cnt, near: near, heal: Math.min(0.35, heal) };
  }
  function neighbors(i) {
    var r = Math.floor(i / 3), c = i % 3, out = [], rr, cc;
    for (rr = r - 1; rr <= r + 1; rr++) for (cc = c - 1; cc <= c + 1; cc++) {
      if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) continue;
      if (rr === r && cc === c) continue;
      out.push(rr * 3 + cc);
    }
    return out;
  }
  function synOf(cnt, cls) {
    var n = cnt[cls] || 0;
    return n >= 7 ? 0.48 : n >= 5 ? 0.28 : n >= 3 ? 0.12 : 0;
  }
  function findTarget(unit) {
    var h = HERO[unit.id];
    var reach = pathGap * (h.rng / 1.05);
    var i, best = null, bestD = -1, cc = cells[unit.slot];
    var ox = cc.x + cc.w / 2, oy = cc.y + cc.h / 2;
    for (i = 0; i < foes.length; i++) {
      var f = foes[i];
      var p = posAt(f.dist);
      var dd = Math.hypot(p.x - ox, p.y - oy);
      if (dd > reach) continue;
      if (f.dist > bestD) { bestD = f.dist; best = f; }
    }
    return best;
  }
  function fire(unit, foe, info) {
    var h = HERO[unit.id];
    var dmg = strikeDmg(unit, foe, info);
    var shotsN = h.shots || 1;
    var mul = h.shotMul || 1;
    var cc = cells[unit.slot];
    var ox = cc.x + cc.w / 2, oy = cc.y + cc.h * 0.42;
    var p = posAt(foe.dist);
    var k, ang = Math.atan2(p.y - oy, p.x - ox);
    for (k = 0; k < shotsN; k++) {
      if (shots.length > 96) shots.shift();
      var spread = (k - (shotsN - 1) / 2) * 0.18;
      var sp = h.kind === 'ballista' || h.kind === 'bolt' ? 340 : 460;
      shots.push({
        x: ox, y: oy, vx: Math.cos(ang + spread) * sp, vy: Math.sin(ang + spread) * sp,
        dmg: dmg * mul, life: 1.25, kind: h.kind, aoe: h.aoe || 0, slow: h.slow || 0,
        poison: h.poison || 0, chain: h.chain || 0, execute: h.execute || 0, curse: h.curse || 0,
        gold: h.gold || 0, tid: foe.id, rank: unit.rank, hid: unit.id, slot: unit.slot
      });
    }
    if (hitSnd <= 0 && h.kind !== 'slash') { hitSnd = 0.08; A.sfx(h.magic ? 'laser' : 'shoot', 0.7 + unit.rank * 0.05); }
  }
  function strikeDmg(unit, foe, info) {
    var h = HERO[unit.id];
    var base = h.dmg * RANK_M[unit.rank];
    base *= (1 + synOf(info.cnt, h.cls));
    base *= (1 + (info.near[unit.slot] || 0));
    base *= (1 + mod.dmg) * (1 + (meta.atk || 0) * 0.04);
    if (h.rage) base *= 1 + 0.45 * Math.min(1, foe.dist / pathLen);
    if (foe.boss) base *= 1 + mod.boss;
    if (h.magic) base *= foe.mag == null ? 1 : foe.mag;
    else {
      var phys = foe.phys == null ? 1 : foe.phys;
      if (h.armor && phys < 1) phys = Math.min(1.15, phys * h.armor);
      base *= phys;
    }
    if (foe.fly && h.melee) base *= 0.42;
    if (foe.curse) base *= 1 + foe.curse;
    if (h.crit && Math.random() < Math.min(0.35, h.crit * (1 + unit.rank * 0.08))) base *= 2;
    return base;
  }
  function hurtFoe(f, dmg, src) {
    if (!f || dmg <= 0) return;
    f.hp -= dmg; f.hit = 0.08;
    if (src && src.execute && !f.boss && !f.child && f.hp > 0 && f.hp / f.mhp < 0.16 && Math.random() < src.execute) f.hp = 0;
    if (src && src.slow) { f.slow = Math.min(0.55, Math.max(f.slow, src.slow + mod.slow)); f.slowT = 1.5; }
    if (src && src.poison) {
      f.poison = Math.min(8, f.poison + src.poison);
      f.poisonT = 3; f.prank = Math.max(f.prank || 0, src.rank || 0);
    }
    if (src && src.curse) f.curse = Math.min(0.4, Math.max(f.curse, 0.12 + (src.rank || 0) * 0.03));
    if (f.hp <= 0) killFoe(f, src);
  }
  function killFoe(f, src) {
    var i = foes.indexOf(f);
    if (i < 0) return;
    foes.splice(i, 1);
    kills++;
    score += f.sc;
    var g = f.gold * (1 + mod.gold) * (1 + (meta.gold || 0) * 0.06);
    if (src && src.gold) g += src.gold * (1 + (src.rank || 0) * 0.25) * (1 + mod.gold);
    gold += g;
    var p = posAt(f.dist);
    var col = f.boss ? '#e6d3a1' : '#c6a15a';
    fx.burst(p.x, p.y, col, A.gfx ? A.gfx.n(f.boss ? 18 : 8) : 8, 180, 0.45, 2.5);
    fx.text(p.x, p.y - 16, '+' + f.sc, '#e6d3a1', f.boss ? 20 : 14);
    A.sfx(f.boss ? 'bigboom' : 'boom', f.boss ? 0.8 : 1.1);
    if (f.split && !f.child) {
      var c;
      for (c = 0; c < 2; c++) {
        foes.push({
          id: uid++, kind: 's', boss: 0, name: '분열', fly: 0, split: 0, heal: 0, child: 1,
          hp: f.mhp * 0.42, mhp: f.mhp * 0.42, spd: f.spd * 1.08, leak: 1, gold: 1, sc: 4,
          dist: Math.max(0, f.dist - 24 - c * 16), phys: 1, mag: 1, slow: 0, slowT: 0,
          poison: 0, poisonT: 0, curse: 0, ht: 0, hit: 0, patT: 0
        });
      }
    }
    if (f.boss) {
      bossKills++;
      score += 800;
      fx.shake(10, 0.4);
      if (!dead) offerCards();
      setMood(life <= 3 ? 'danger' : '');
    }
  }
  function offerCards() {
    var pool = CARDS.filter(function (c) {
      if (c.id === 'dmg') return mod.dmg < 1.5;
      if (c.id === 'rate') return mod.rate < 0.8;
      if (c.id === 'gold') return mod.gold < 1;
      if (c.id === 'cost') return mod.cost < 0.4;
      if (c.id === 'slow') return mod.slow < 0.2;
      if (c.id === 'poison') return mod.poison < 1.5;
      if (c.id === 'boss') return mod.boss < 1;
      if (c.id === 'luck') return mod.myth < 0.02;
      if (c.id === 'gate') return life < maxLife + 8;
      return true;
    });
    choices = [];
    var guard = 0;
    while (choices.length < 3 && pool.length && guard++ < 12) {
      var i = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(i, 1)[0]);
    }
    if (choices.length) { choosing = true; A.sfx('power'); }
  }
  function applyCard(i) {
    if (!choosing || !choices[i]) return;
    var c = choices[i];
    if (c.id === 'dmg') mod.dmg = Math.min(1.5, mod.dmg + 0.12);
    else if (c.id === 'rate') mod.rate = Math.min(0.8, mod.rate + 0.1);
    else if (c.id === 'gold') mod.gold = Math.min(1, mod.gold + 0.2);
    else if (c.id === 'cost') mod.cost = Math.min(0.4, mod.cost + 0.12);
    else if (c.id === 'gate') life = Math.min(maxLife + 8, life + 4);
    else if (c.id === 'purse') gold += 90;
    else if (c.id === 'slow') mod.slow = Math.min(0.2, mod.slow + 0.12);
    else if (c.id === 'poison') mod.poison = Math.min(1.5, mod.poison + 0.25);
    else if (c.id === 'boss') mod.boss = Math.min(1, mod.boss + 0.2);
    else if (c.id === 'luck') mod.myth = Math.min(0.02, mod.myth + 0.004);
    else if (c.id === 'rank') upgradeRandom(false);
    else if (c.id === 'free') placeSummon(rollId(), Math.max(1, rollRank(0)), true);
    choosing = false; choices = [];
    A.sfx('gold'); fx.ring(W / 2, H / 2, '#c6a15a', 80, 0.45);
    hud();
  }
  function upgradeRandom(toMythOk) {
    var list = [], i;
    for (i = 0; i < SLOTS; i++) if (board[i] && board[i].rank < (toMythOk ? 4 : 4) && board[i].rank < 4) list.push(i);
    if (!list.length) { gold += 70; return false; }
    var s = list[Math.floor(Math.random() * list.length)];
    board[s].rank += 1;
    unlock(board[s].id, board[s].rank);
    summonFx(s, board[s].rank);
    if (board[s].rank >= 4) beginMyth(s);
    return true;
  }

  function placeSummon(id, rank, free) {
    var slot = emptySlot(sel >= 0 ? sel : cur);
    if (slot < 0) return false;
    board[slot] = makeUnit(id, rank);
    unlock(id, rank);
    summonFx(slot, rank);
    if (!free) summons++;
    if (rank >= 4) beginMyth(slot);
    else rankSfx(rank);
    sel = slot; cur = slot;
    return true;
  }
  function doSummon() {
    if (!isPlay() || busy()) return;
    var cost = summonCost();
    if (gold < cost) { A.sfx('wrong'); fx.text(W / 2, H * 0.42, '골드가 부족합니다', '#e6d3a1', 18); return; }
    if (emptySlot(-1) < 0) { A.sfx('wrong'); fx.text(W / 2, H * 0.42, '칸이 가득 찼습니다', '#e6d3a1', 18); return; }
    var id, rank;
    if (tutStep === 0) { id = 'swordsman'; rank = 0; }
    else if (tutStep === 1) { id = 'swordsman'; rank = 0; }
    else { id = rollId(); rank = rollRank(0); }
    gold -= cost;
    placeSummon(id, rank, false);
    if (tutStep === 0) tutStep = 1;
    else if (tutStep === 1) tutStep = 2;
    hud();
  }
  function doSell() {
    if (!isPlay() || busy()) return;
    var i = sel >= 0 ? sel : cur;
    var u = board[i];
    if (!u) { A.sfx('wrong'); return; }
    gold += SELL[u.rank];
    board[i] = null; sel = -1;
    A.sfx('coin');
    fx.text(cells[i].x + cells[i].w / 2, cells[i].y + 10, '+' + SELL[u.rank], '#e6d3a1', 16);
    hud();
  }
  function doDice() {
    if (!isPlay() || busy()) return;
    var cost = diceCost();
    if (gold < cost) { A.sfx('wrong'); fx.text(W / 2, H * 0.42, '골드가 부족합니다', '#e6d3a1', 18); return; }
    gold -= cost; diceUses++;
    var f = Math.floor(Math.random() * 6);
    diceFace = f; hold = 1.05; holdKind = 'dice';
    if (f === 0) {
      life -= 2; A.sfx('hurt'); fx.shake(8, 0.3); fx.flashIt('#3a1010', 0.4);
      if (life <= 0) die('dice');
    } else if (f === 1) { gold += 12; A.sfx('tick'); }
    else if (f === 2) { gold += 55; A.sfx('coin'); }
    else if (f === 3) { if (!placeSummon(rollId(), rollRank(0), true)) gold += 40; A.sfx('power'); }
    else if (f === 4) { upgradeRandom(true); A.sfx('match'); }
    else {
      gold += 120;
      if (!placeSummon(rollId(), Math.max(1, rollRank(1)), true)) gold += 40;
      A.sfx('gold');
    }
    hud();
  }
  function combine(a, b) {
    if (a === b || a < 0 || b < 0) return;
    var A0 = board[a], B0 = board[b];
    if (A0 && !B0) { board[b] = A0; board[a] = null; sel = b; cur = b; A.sfx('slide'); return; }
    if (!A0 && B0) { sel = b; return; }
    if (!A0 || !B0) return;
    if (A0.id === B0.id && A0.rank === B0.rank && A0.rank < 4) {
      var rk = A0.rank + 1;
      var id = rollId();
      board[a] = null;
      board[b] = makeUnit(id, rk);
      unlock(id, rk);
      sel = b; cur = b;
      A.sfx('match');
      fx.ring(cells[b].x + cells[b].w / 2, cells[b].y + cells[b].h / 2, RANK_C[rk], 36, 0.4);
      if (tutStep < 9) { tutStep = 9; A.set('neowa_summon_tut', '1'); S.banner('합성', '윗 등급의 영웅이 나왔습니다'); }
      if (rk >= 4) beginMyth(b); else rankSfx(rk);
      hud();
      return;
    }
    if (A0.rank >= 4 && B0.rank >= 4 && A0.id === B0.id) {
      fx.text(W / 2, H * 0.4, '신화는 더 합칠 수 없습니다', '#e6d3a1', 16);
    }
    board[a] = B0; board[b] = A0; sel = b; cur = b; A.sfx('slide');
  }
  function beginMyth(slot) {
    mythSlot = slot; hold = 1.7; holdKind = 'myth';
    wow();
    fx.shake(12, 0.5); fx.flashIt('#e6d3a1', 0.4);
    if (S && S.banner) S.banner('신화', HERO[board[slot].id].name);
  }
  function rankSfx(rank) {
    A.sfx(rank >= 3 ? 'gold' : rank >= 2 ? 'power' : rank >= 1 ? 'coin' : 'place', 1);
    if (rank >= 3) fx.shake(4, 0.15);
  }
  function summonFx(slot, rank) {
    var c = cells[slot];
    fx.ring(c.x + c.w / 2, c.y + c.h / 2, RANK_C[rank], 20 + rank * 10, 0.35 + rank * 0.05);
    fx.burst(c.x + c.w / 2, c.y + c.h / 2, RANK_C[rank], 6 + rank * 3, 120, 0.4, 2);
  }
  function wow() {
    ensureSfx();
    A.sfx('mythwa');
    A.vibrate([30, 50, 40, 70]);
    if (A.get('neowa_mute', '0') === '1') return;
    try {
      if (!window.speechSynthesis) return;
      var u = new SpeechSynthesisUtterance('와');
      u.lang = 'ko-KR'; u.rate = 0.82; u.pitch = 0.62; u.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function sfxReady() { return A.sfx && A.sfx.add; }
  var sfxOk = false;
  function ensureSfx() {
    if (sfxOk || !sfxReady()) return;
    sfxOk = true;
    A.sfx.add('drum', [{ w: 'sine', f: 78, f2: 36, d: 0.42, v: 0.42, r: 0.2 }, { n: 1, ft: 'lowpass', f: 240, f2: 80, d: 0.18, v: 0.16 }]);
    A.sfx.add('choir', [
      { w: 'sawtooth', f: 196, d: 1.1, v: 0.035, a: 0.25, r: 0.45 },
      { w: 'sawtooth', f: 247, d: 1.1, v: 0.028, a: 0.3, r: 0.45 },
      { w: 'triangle', f: 294, d: 1.2, v: 0.04, a: 0.2, r: 0.5 },
      { w: 'sine', f: 98, d: 1.3, v: 0.06, a: 0.2, r: 0.3 }
    ]);
    A.sfx.add('mythwa', [
      { w: 'sawtooth', f: 140, f2: 220, d: 0.55, v: 0.08, a: 0.05, r: 0.4 },
      { w: 'sawtooth', f: 180, f2: 280, d: 0.7, v: 0.07, a: 0.08, r: 0.45 },
      { w: 'triangle', f: 280, f2: 420, d: 0.8, v: 0.08, a: 0.04, r: 0.5 },
      { w: 'sine', f: 90, f2: 70, d: 0.9, v: 0.16, r: 0.25 },
      { n: 1, ft: 'bandpass', f: 800, f2: 400, d: 0.4, v: 0.08, r: 0.2 }
    ]);
  }

  function die(why) {
    if (dead) return;
    dead = true; dyingT = 1.15; choosing = false; hold = 0;
    life = 0;
    A.sfx('hurt'); fx.shake(12, 0.5); fx.flashIt('#3a1010', 0.5);
    setMood('');
  }
  function finish() {
    if (finished) return;
    finished = true;
    stoneGain = Math.max(1, Math.floor(wave * 2 + bossKills * 8 + score / 700));
    meta.stones += stoneGain;
    saveMeta();
    paintShop();
    S.gameOver(Math.floor(score), [['웨이브', String(wave)], ['처치', String(kills)], ['영혼석', '+' + stoneGain]]);
  }
  function isPlay() {
    return document.body.getAttribute('data-state') === 'playing' && !dead;
  }
  function busy() { return hold > 0 || choosing || dyingT > 0 || dead; }

  function tick(dt) {
    if (phase === 'fight' && qi < queue.length) {
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnOne(queue[qi]); qi++;
        spawnT = Math.max(0.34, 0.78 - wave * 0.012);
        if (hold > 0) return;
      }
    }
    var info = classInfo();
    life = Math.min(maxLife + 8, life + info.heal * dt);
    gold += (1.15 + wave * 0.08) * dt * (1 + mod.gold) * (1 + (meta.gold || 0) * 0.06);
    var i, u, f;
    for (i = 0; i < SLOTS; i++) {
      u = board[i]; if (!u) continue;
      if (u.stun > 0) { u.stun -= dt; continue; }
      u.cd -= dt;
      if (u.cd <= 0) {
        u.slot = i;
        var tgt = findTarget(u);
        if (tgt) { fire(u, tgt, info); u.cd = HERO[u.id].cd / (1 + Math.min(0.8, mod.rate)); }
      }
    }
    for (i = shots.length - 1; i >= 0; i--) {
      var s = shots[i];
      var tgt = null, j;
      for (j = 0; j < foes.length; j++) if (foes[j].id === s.tid) tgt = foes[j];
      if (tgt) {
        var tp = posAt(tgt.dist);
        var ang = Math.atan2(tp.y - s.y, tp.x - s.x);
        var sp = Math.hypot(s.vx, s.vy) || 400;
        s.vx = Math.cos(ang) * sp; s.vy = Math.sin(ang) * sp;
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      var hit = null;
      if (tgt) {
        var pp = posAt(tgt.dist);
        if (Math.hypot(pp.x - s.x, pp.y - s.y) < 16) hit = tgt;
      }
      if (!hit && s.life <= 0) { shots.splice(i, 1); continue; }
      if (hit) {
        shots.splice(i, 1);
        hurtFoe(hit, s.dmg, s);
        if (s.aoe) {
          for (j = foes.length - 1; j >= 0; j--) {
            var o = foes[j]; if (!o || o === hit) continue;
            var op = posAt(o.dist);
            if (Math.hypot(op.x - s.x, op.y - s.y) < s.aoe) hurtFoe(o, s.dmg * 0.55, s);
          }
          fx.burst(s.x, s.y, s.kind === 'fire' || s.kind === 'bomb' ? '#e07a3a' : '#c6a15a', 8, 140, 0.35, 2);
        }
        if (s.chain) {
          var jumps = 0, from = hit, prev = {};
          prev[hit.id] = 1;
          while (jumps < s.chain - 1) {
            var best = null, bd = 78;
            for (j = 0; j < foes.length; j++) {
              var fj = foes[j]; if (!fj || prev[fj.id] || fj.hp <= 0) continue;
              var dp = Math.hypot(posAt(fj.dist).x - posAt(from.dist).x, posAt(fj.dist).y - posAt(from.dist).y);
              if (dp < bd) { bd = dp; best = fj; }
            }
            if (!best) break;
            prev[best.id] = 1; jumps++;
            hurtFoe(best, s.dmg * Math.pow(0.72, jumps), s);
            from = best;
          }
        }
      }
    }
    var cap = 24 + Math.floor(wave / 4);
    for (i = foes.length - 1; i >= 0; i--) {
      f = foes[i]; if (!f) continue;
      if (f.slowT > 0) f.slowT -= dt; else f.slow = 0;
      if (f.poisonT > 0 && f.poison > 0) {
        f.poisonT -= dt;
        var pd = Math.min(f.poison * 3.2 * RANK_M[f.prank || 0] * (1 + mod.poison), f.mhp * 0.045) * dt;
        f.hp -= pd;
        if (f.hp <= 0) { killFoe(f, null); continue; }
      }
      if (f.heal) {
        f.ht += dt;
        if (f.ht > 1.8) {
          f.ht = 0;
          var ally = null, ad = 80;
          for (j = 0; j < foes.length; j++) {
            if (foes[j] === f) continue;
            var dd = Math.abs(foes[j].dist - f.dist);
            if (dd < ad) { ad = dd; ally = foes[j]; }
          }
          if (ally) ally.hp = Math.min(ally.mhp, ally.hp + ally.mhp * 0.07);
        }
      }
      if (f.boss) bossPattern(f, dt);
      var spd = 96 * f.spd * (1 - Math.min(0.55, f.slow));
      f.dist += spd * dt;
      if (f.hit > 0) f.hit -= dt;
      if (f.dist >= pathLen) {
        foes.splice(i, 1);
        life -= f.leak;
        fx.shake(f.boss ? 10 : 4, 0.2);
        fx.flashIt('#3a1010', f.boss ? 0.45 : 0.25);
        A.sfx('hurt');
        var gp = posAt(pathLen - 2);
        fx.text(gp.x, gp.y - 20, '-' + f.leak, '#a33b32', 18);
        if (life <= 0) die('gate');
      }
    }
    if (!dead && foes.length >= cap) {
      if (!warnCap) { warnCap = true; if (S && S.banner) S.banner('포화', '마물이 너무 많습니다'); A.sfx('warn'); }
      die('cap');
    } else if (foes.length < cap - 4) warnCap = false;
    if (!dead && phase === 'fight' && qi >= queue.length && foes.length === 0 && hold <= 0 && !choosing) {
      if (!cleared) {
        cleared = 1; clearT = 1.15;
        score += 50 * wave;
        gold += 8 + wave * 3;
        A.sfx('coin');
        if (S && S.banner) S.banner('WAVE ' + wave, '정리 완료  +' + (50 * wave));
      } else {
        clearT -= dt;
        if (clearT <= 0) startWave();
      }
    }
  }
  function bossPattern(f, dt) {
    f.patT += dt;
    if (f.pat === 'charge' && f.patT > 4.2) { f.patT = 0; f.spd = Math.min(1.6, f.spd * 1.15); f.boost = 0.7; }
    if (f.boost > 0) { f.boost -= dt; f.spd = 1.35; }
    if (f.pat === 'spawn' && f.patT > 6) {
      f.patT = 0;
      if (foes.length < 30) {
        spawnOne('s'); foes[foes.length - 1].dist = Math.max(0, f.dist - 20);
        spawnOne('s'); foes[foes.length - 1].dist = Math.max(0, f.dist - 40);
      }
    }
    if (f.pat === 'breath' && f.patT > 5) {
      f.patT = 0;
      var list = [], i;
      for (i = 0; i < SLOTS; i++) if (board[i]) list.push(i);
      if (list.length) {
        var s = list[Math.floor(Math.random() * list.length)];
        board[s].stun = 2.6;
        fx.text(cells[s].x + cells[s].w / 2, cells[s].y, '봉인', '#e07a3a', 14);
      }
    }
    if (f.pat === 'enrage' && !f.enraged && f.hp < f.mhp * 0.5) {
      f.enraged = 1; f.spd *= 1.35;
      if (S && S.banner) S.banner('흑왕', '분노');
      A.sfx('warn');
      if (foes.length < 30) { spawnOne('a'); foes[foes.length - 1].dist = Math.max(0, f.dist - 30); }
    }
  }

  function update(dt) {
    fx.update(dt); ensureSfx(); stepDust(dt); if (hitSnd > 0) hitSnd -= dt;
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) finish(); return; }
    playT += dt;
    if (tutStep < 9 && playT > 45) { tutStep = 9; A.set('neowa_summon_tut', '1'); }
    if (hold > 0) { hold -= dt; if (hold <= 0 && holdKind === 'dice') diceFace = -1; hud(); return; }
    if (choosing) return;
    var steps = speed, s;
    for (s = 0; s < steps; s++) {
      tick(dt);
      if (hold > 0 || choosing || dead) break;
    }
    if (life <= 3 && mood !== 'boss') setMood('danger');
    hud();
  }
  function stepDust(dt) {
    var i;
    for (i = 0; i < dust.length; i++) {
      dust[i].y -= dust[i].v * dt;
      dust[i].x += Math.sin(dust[i].y * 0.02) * 6 * dt;
      if (dust[i].y < -4) { dust[i].y = H + 4; dust[i].x = Math.random() * W; }
    }
  }

  function render(c) {
    if (!bg) return;
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    if (!introDone && document.body.getAttribute('data-state') === 'ready') {
      drawIntro(c);
      c.restore(); fx.drawFlash(c, W, H); return;
    }
    if (!board || !foes || !shots) {
      c.drawImage(bg, 0, 0);
      c.restore();
      return;
    }
    c.drawImage(bg, 0, 0);
    drawDust(c);
    runeRing(c, W / 2, land ? H * 0.5 : H * 0.46, land ? 70 : 86, (S ? S.time : 0) * 0.15, 'rgba(198,161,90,.28)', 0.7);
    drawFoes(c);
    drawHeroes(c);
    drawShots(c);
    if (drag && drag.unit) {
      c.globalAlpha = 0.85;
      A.draw(c, heroSpr[drag.unit.id], drag.x, drag.y, 0.55);
      c.globalAlpha = 1;
    }
    fx.draw(c);
    drawUi(c);
    if (choosing) drawCards(c);
    if (holdKind === 'myth' && hold > 0) drawMyth(c);
    if (holdKind === 'boss' && hold > 0) drawBossIn(c);
    if (holdKind === 'dice' && hold > 0) drawDice(c);
    if (tutStep < 9 && isPlay() && !choosing && hold <= 0) drawTut(c);
    c.restore();
    fx.drawFlash(c, W, H);
  }
  function drawDust(c) {
    var i;
    c.fillStyle = 'rgba(230,211,161,.45)';
    for (i = 0; i < dust.length; i++) {
      c.globalAlpha = dust[i].a;
      c.fillRect(dust[i].x, dust[i].y, dust[i].s, dust[i].s);
    }
    c.globalAlpha = 1;
  }
  function runeRing(c, x, y, r, rot, col, alpha) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.strokeStyle = col; c.globalAlpha = alpha; c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, r, 0, 6.2832); c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.78, 0, 6.2832); c.stroke();
    var i;
    c.beginPath();
    for (i = 0; i < 6; i++) {
      var a = -1.5708 + i / 6 * 6.2832;
      var rr = i % 2 ? r * 0.34 : r * 0.62;
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.stroke();
    for (i = 0; i < 10; i++) {
      var a2 = i / 10 * 6.2832;
      c.beginPath();
      c.moveTo(Math.cos(a2) * (r - 7), Math.sin(a2) * (r - 7));
      c.lineTo(Math.cos(a2) * (r + 5), Math.sin(a2) * (r + 5));
      c.stroke();
    }
    c.restore();
  }
  function drawFoes(c) {
    var i, boss = null;
    for (i = 0; i < foes.length; i++) {
      var f = foes[i];
      var p = posAt(f.dist);
      var bob = Math.sin((S ? S.time : 0) * (f.kind === 'f' ? 14 : 6) + f.id) * 2;
      var sc = f.boss ? 1.15 : f.child ? 0.55 : f.kind === 'a' ? 0.78 : 0.68;
      if (f.fly || f.kind === 'y' || f.kind === 'b2') p = { x: p.x, y: p.y - 16 };
      c.save();
      if (f.hit > 0) c.globalAlpha = 0.55;
      A.draw(c, foeSpr[f.kind] || foeSpr.n, p.x, p.y + bob, sc);
      c.restore();
      if (f.poison > 0) {
        c.fillStyle = 'rgba(90,130,60,.8)';
        c.beginPath(); c.arc(p.x + 10, p.y - 20, 3, 0, 6.3); c.fill();
      }
      if (!f.boss) {
        c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(p.x - 12, p.y - 36, 24, 3);
        c.fillStyle = '#a33b32'; c.fillRect(p.x - 12, p.y - 36, 24 * Math.max(0, f.hp / f.mhp), 3);
      } else boss = f;
    }
    if (boss) {
      var bw = Math.min(W - 80, 360), bx = (W - bw) / 2, by = land ? 48 : 78;
      c.fillStyle = 'rgba(12,8,6,.8)'; A.rr(c, bx, by, bw, 18, 4); c.fill();
      c.fillStyle = '#5a2018'; c.fillRect(bx + 2, by + 2, bw - 4, 14);
      c.fillStyle = '#c6a15a'; c.fillRect(bx + 2, by + 2, (bw - 4) * Math.max(0, boss.hp / boss.mhp), 14);
      c.fillStyle = '#f0e2c0'; c.font = '700 12px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(boss.name, W / 2, by + 9);
    }
  }
  function drawHeroes(c) {
    var i;
    for (i = 0; i < SLOTS; i++) {
      var cl = cells[i];
      if (i === cur && isPlay()) {
        c.strokeStyle = 'rgba(240,226,192,.9)'; c.lineWidth = 2;
        A.rr(c, cl.x - 1, cl.y - 1, cl.w + 2, cl.h + 2, 8); c.stroke();
      }
      var u = board[i];
      if (!u || (drag && drag.from === i)) continue;
      var sc = Math.min(cl.w, cl.h) / 168;
      var cx = cl.x + cl.w / 2, cy = cl.y + cl.h * 0.58;
      if (u.stun > 0) c.globalAlpha = 0.45;
      A.draw(c, heroSpr[u.id], cx, cy, sc);
      c.globalAlpha = 1;
      // 등급 테두리
      c.strokeStyle = RANK_C[u.rank]; c.lineWidth = u.rank >= 3 ? 2.5 : 1.5;
      A.rr(c, cl.x + 3, cl.y + 3, cl.w - 6, cl.h - 6, 7); c.stroke();
      if (u.rank >= 4) runeRing(c, cx, cy - 6, Math.min(cl.w, cl.h) * 0.42, (S ? S.time : 0) * 0.8, 'rgba(240,226,192,.8)', 0.9);
      if (i === sel) {
        c.strokeStyle = '#f0e2c0'; c.lineWidth = 2;
        c.strokeRect(cl.x + 6, cl.y + 6, cl.w - 12, 3);
      }
      c.fillStyle = RANK_C[u.rank];
      c.font = '700 10px "Pretendard Variable",system-ui';
      c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillText(RANK_N[u.rank], cx, cl.y + cl.h - 3);
    }
  }
  function drawShots(c) {
    var i;
    for (i = 0; i < shots.length; i++) {
      var s = shots[i];
      var col = '#e6d3a1';
      if (s.kind === 'fire' || s.kind === 'bomb') col = '#e07a3a';
      else if (s.kind === 'frost') col = '#c5d0d8';
      else if (s.kind === 'poison' || s.kind === 'venom' || s.kind === 'cloud') col = '#6b8f4e';
      else if (s.kind === 'chain') col = '#f0e2c0';
      else if (s.kind === 'curse') col = '#a36a78';
      else if (s.kind === 'bone') col = '#e6e0d4';
      else if (s.kind === 'wolf' || s.kind === 'claw') col = '#c4a484';
      else if (s.kind === 'smite') col = '#f4efe4';
      c.strokeStyle = col; c.lineWidth = s.kind === 'ballista' || s.kind === 'bolt' ? 3 : 2;
      c.beginPath();
      c.moveTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02);
      c.lineTo(s.x, s.y); c.stroke();
      c.fillStyle = col;
      c.beginPath(); c.arc(s.x, s.y, s.kind === 'bomb' || s.kind === 'fire' ? 4 : 2.2, 0, 6.3); c.fill();
    }
  }
  function drawUi(c) {
    if (!isPlay() && document.body.getAttribute('data-state') !== 'paused') return;
    var info = classInfo();
    var bits = [], k;
    for (k in info.cnt) if (info.cnt[k]) bits.push(CLSN[k] + ' ' + info.cnt[k] + synMark(info.cnt[k]));
    var u = sel >= 0 ? board[sel] : null;
    var line = '';
    if (u) {
      var h = HERO[u.id];
      line = h.name + ' · ' + RANK_N[u.rank];
    }
    if (bits.length) line = (line ? line + '   ' : '') + bits.join('  ');
    if (line) {
      c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.font = '700 12px "Pretendard Variable",system-ui';
      c.fillStyle = 'rgba(240,226,192,.9)';
      c.fillText(line, W / 2, land ? H - 6 : H - 132);
    }
    if (land) return;
    var i;
    for (i = 0; i < btnRects.length; i++) drawBtn(c, btnRects[i]);
    var w = weights(), tot = 0, n;
    for (n = 0; n < 5; n++) tot += w[n];
    c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.font = '600 11px "Pretendard Variable",system-ui';
    c.fillStyle = 'rgba(240,226,192,.75)';
    var odds = '';
    for (n = 0; n < 5; n++) odds += (n ? '  ' : '') + RANK_N[n] + ' ' + (w[n] / tot * 100).toFixed(n === 4 ? 1 : 0);
    c.fillText(odds, W / 2, H - 116);
  }
  function synMark(n) { return n >= 7 ? '★' : n >= 5 ? '◆' : n >= 3 ? '·' : ''; }
  function drawBtn(c, b) {
    var on = b.sp && b.sp === speed;
    c.fillStyle = on || b.id === 'summon' ? 'rgba(198,161,90,.92)' : 'rgba(28,22,16,.88)';
    A.rr(c, b.x, b.y, b.w, b.h, 10); c.fill();
    c.strokeStyle = 'rgba(240,226,192,.45)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = on || b.id === 'summon' ? '#1a1206' : '#f0e2c0';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '800 15px "Pretendard Variable",system-ui';
    var label = '소환', sub = '';
    if (b.id === 'summon') { label = summons <= 0 ? '무료 소환' : '소환'; sub = summons <= 0 ? '' : String(summonCost()); }
    else if (b.id === 'sell') label = '판매';
    else if (b.id === 'dice') { label = '주사위'; sub = String(diceCost()); }
    else if (b.sp) label = '×' + b.sp;
    if (sub) {
      c.fillText(label, b.x + b.w / 2, b.y + b.h * 0.38);
      c.font = '700 13px "Chakra Petch",system-ui';
      c.fillText(sub, b.x + b.w / 2, b.y + b.h * 0.72);
    } else c.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
  }
  function drawCards(c) {
    c.fillStyle = 'rgba(8,6,4,.82)'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#e6d3a1'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '400 32px "Black Han Sans",system-ui';
    c.fillText('운명의 카드', W / 2, land ? 48 : 120);
    c.font = '600 14px "Pretendard Variable",system-ui';
    c.fillStyle = 'rgba(240,226,192,.75)';
    c.fillText('하나를 고르세요', W / 2, land ? 78 : 156);
    var i;
    for (i = 0; i < choices.length; i++) {
      var y = cardY(i);
      c.fillStyle = 'rgba(28,22,16,.94)';
      A.rr(c, 28, y, W - 56, land ? 92 : 108, 12); c.fill();
      c.strokeStyle = '#c6a15a'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#f0e2c0'; c.font = '800 20px "Pretendard Variable",system-ui';
      c.fillText((i + 1) + '.  ' + choices[i].name, W / 2, y + (land ? 36 : 42));
      c.fillStyle = 'rgba(240,226,192,.78)'; c.font = '600 15px "Pretendard Variable",system-ui';
      c.fillText(choices[i].desc, W / 2, y + (land ? 64 : 74));
    }
  }
  function cardY(i) { return land ? 100 + i * 108 : 200 + i * 128; }
  function cardAt(y) {
    var i;
    for (i = 0; i < choices.length; i++) {
      var cy = cardY(i), h = land ? 92 : 108;
      if (y >= cy && y <= cy + h) return i;
    }
    return -1;
  }
  function drawMyth(c) {
    c.fillStyle = 'rgba(6,4,3,.72)'; c.fillRect(0, 0, W, H);
    var t = 1.7 - hold;
    runeRing(c, W / 2, H * 0.48, 70 + t * 40, t * 2.2, 'rgba(240,226,192,.9)', 1);
    runeRing(c, W / 2, H * 0.48, 110 + t * 20, -t * 1.4, 'rgba(198,161,90,.7)', 0.8);
    var u = board[mythSlot];
    if (u) A.draw(c, heroSpr[u.id], W / 2, H * 0.5, 1.55 + Math.sin(t * 6) * 0.03);
    // 빛기둥
    var g = c.createLinearGradient(W / 2, 0, W / 2, H);
    g.addColorStop(0, 'rgba(240,226,192,0)');
    g.addColorStop(0.45, 'rgba(230,190,110,.18)');
    g.addColorStop(1, 'rgba(240,226,192,0)');
    c.fillStyle = g; c.fillRect(W / 2 - 30, 0, 60, H);
    c.fillStyle = '#f0e2c0'; c.textAlign = 'center';
    c.font = '400 40px "Black Han Sans",system-ui';
    c.fillText('신화', W / 2, land ? 70 : 150);
    if (u) {
      c.font = '700 18px "Pretendard Variable",system-ui';
      c.fillText(HERO[u.id].name, W / 2, land ? H - 40 : H * 0.72);
    }
  }
  function drawBossIn(c) {
    c.fillStyle = 'rgba(8,4,4,.45)'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#f0e2c0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '400 36px "Black Han Sans",system-ui';
    c.fillText(bossName || '보스', W / 2, H * 0.42);
  }
  function drawDice(c) {
    c.fillStyle = 'rgba(8,6,4,.55)'; c.fillRect(0, 0, W, H);
    var names = ['재앙', '공허', '금화', '소환', '승급', '대박'];
    var desc = ['성문 -2', '골드 +12', '골드 +55', '무료 소환', '등급 +1', '대박'];
    c.fillStyle = '#1a120c';
    A.rr(c, W / 2 - 120, H * 0.38, 240, 150, 16); c.fill();
    c.strokeStyle = diceFace === 0 ? '#a33b32' : '#c6a15a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#f0e2c0'; c.textAlign = 'center';
    c.font = '400 28px "Black Han Sans",system-ui';
    c.fillText('운명의 주사위', W / 2, H * 0.38 + 40);
    c.font = '800 26px "Pretendard Variable",system-ui';
    c.fillStyle = diceFace === 0 ? '#e07a6a' : '#e6d3a1';
    c.fillText(names[diceFace] || '', W / 2, H * 0.38 + 86);
    c.font = '600 15px "Pretendard Variable",system-ui';
    c.fillStyle = 'rgba(240,226,192,.8)';
    c.fillText(desc[diceFace] || '', W / 2, H * 0.38 + 118);
  }
  function drawTut(c) {
    var msg = tutStep === 0 ? '첫 소환은 무료입니다' : tutStep === 1 ? '한 번 더 소환하세요' : '같은 검객 두 명을 겹치세요';
    var y = land ? 36 : 96;
    c.font = '700 16px "Pretendard Variable",system-ui';
    var w = Math.min(W - 24, c.measureText(msg).width + 36);
    c.fillStyle = 'rgba(12,8,6,.78)';
    A.rr(c, (W - w) / 2, y, w, 36, 18); c.fill();
    c.strokeStyle = 'rgba(198,161,90,.8)'; c.stroke();
    c.fillStyle = '#f0e2c0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(msg, W / 2, y + 18);
  }

  function drawIntro(c) {
    var t = introT;
    var full = introLen > 3;
    c.fillStyle = '#070605'; c.fillRect(0, 0, W, H);
    var p1 = full ? Math.min(1, t / 1.7) : 1;
    runeRing(c, W / 2, H * 0.46, 78, t * 0.4, 'rgba(198,161,90,' + (0.2 + p1 * 0.7) + ')', p1);
    if (!full || t > 1.5) {
      var a = full ? Math.min(1, (t - 1.5) / 1.4) : 0.8;
      runeRing(c, W / 2, H * 0.46, 120, -t * 0.25, 'rgba(224,122,58,' + a + ')', a);
      var g = c.createRadialGradient(W / 2, H * 0.46, 10, W / 2, H * 0.46, 160);
      g.addColorStop(0, 'rgba(255,160,60,' + (0.18 * a) + ')');
      g.addColorStop(1, 'rgba(255,160,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(W / 2, H * 0.46, 160, 0, 6.3); c.fill();
    }
    if (full && t > 3.1) {
      var ids = ['swordsman', 'longbow', 'flame', 'shadow'];
      var k;
      for (k = 0; k < 4; k++) {
        var at = Math.min(1, Math.max(0, (t - 3.1 - k * 0.35) / 0.45));
        if (at <= 0) continue;
        c.globalAlpha = at;
        A.draw(c, heroSpr[ids[k]], W * (0.16 + k * 0.22), H * 0.56, 0.92);
        c.globalAlpha = 1;
      }
    }
    if (full && t > 5.3) {
      var n = 11, m;
      for (m = 0; m < n; m++) {
        var mt = (t - 5.3) * 80 + m * 22;
        var yy = H * 0.86 - (mt % 220);
        c.globalAlpha = 0.9;
        A.draw(c, foeSpr[m % 3 === 0 ? 'a' : m % 2 ? 'n' : 'f'], W * (0.12 + (m % 5) * 0.18), yy, 0.62);
        c.globalAlpha = 1;
      }
      drawGate(c, W / 2, H * 0.78, 1.6);
    }
    var showTitle = !full || t > 7.05;
    if (showTitle) {
      var tt = full ? Math.min(1, (t - 7.05) / 0.8) : Math.min(1, t / 0.6);
      c.save(); c.translate(W / 2, H * 0.34); c.scale(0.92 + tt * 0.08, 0.92 + tt * 0.08);
      c.globalAlpha = tt;
      c.font = '400 54px "Black Han Sans",system-ui';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#2a1a0c'; c.fillText('운명의 소환진', 2, 3);
      var lg = c.createLinearGradient(0, -30, 0, 30);
      lg.addColorStop(0, '#f4ead4'); lg.addColorStop(0.45, '#e6d3a1'); lg.addColorStop(0.55, '#8a6230'); lg.addColorStop(1, '#f0e2c0');
      c.fillStyle = lg; c.fillText('운명의 소환진', 0, 0);
      c.restore();
      c.globalAlpha = tt; c.fillStyle = 'rgba(240,226,192,.8)';
      c.font = '600 14px "Pretendard Variable",system-ui'; c.textAlign = 'center';
      c.fillText('뽑고, 합치고, 성문을 지켜라', W / 2, H * 0.34 + 48);
      c.globalAlpha = 1;
    }
    var pulse = 0.45 + Math.sin(t * 3) * 0.25;
    c.fillStyle = 'rgba(240,226,192,' + pulse + ')';
    c.font = '600 13px "Pretendard Variable",system-ui'; c.textAlign = 'center';
    c.fillText('탭하거나 아무 키나  ·  건너뛰기', W / 2, H - 28);
    // 북소리
    if (!introDrum) introDrum = 0;
  }
  var introDrum = 0;
  function idle(dt) {
    fx.update(dt); ensureSfx();
    if (!introDone) {
      introT += dt;
      introDrum -= dt;
      if (introDrum <= 0) {
        introDrum = introLen > 3 ? 0.85 : 1.4;
        A.sfx('drum');
        if (introLen > 3 && Math.random() < 0.65) A.sfx('choir');
      }
      if (introT >= introLen) endIntro();
    } else stepDust(dt);
  }
  function endIntro() {
    if (introDone) return;
    introDone = true;
    document.body.classList.remove('sum-intro');
    var b = document.getElementById('sumBlock');
    if (b && b.parentNode) b.parentNode.removeChild(b);
    if (!navigator.webdriver) A.set('neowa_summon_seen', '1');
  }

  function act(name) {
    if (name === 'summon') doSummon();
    else if (name === 'sell') doSell();
    else if (name === 'dice') doDice();
    else if (name === 'sp1') speed = 1;
    else if (name === 'sp2') speed = 2;
    else if (name === 'sp3') speed = 3;
    hud(); refreshPanel();
  }
  function hitBtn(x, y) {
    var i;
    for (i = 0; i < btnRects.length; i++) {
      var b = btnRects[i];
      if (x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h) return b;
    }
    return null;
  }

  var lastHud = '';
  function hud() {
    var g = Math.floor(gold), lv = Math.max(0, Math.ceil(life));
    var key = Math.floor(score) + '|' + wave + '|' + lv + '|' + g + '|' + speed;
    if (key === lastHud) return;
    lastHud = key;
    var a = document.getElementById('hA'), b = document.getElementById('hB'), cc = document.getElementById('hC'), m = document.getElementById('hMult');
    if (a) a.textContent = A.fmt(Math.floor(score));
    if (b) b.textContent = String(wave);
    if (cc) { cc.textContent = String(lv); cc.style.color = lv <= 3 ? '#ff4d6d' : ''; }
    if (m) m.textContent = '금 ' + A.fmt(g);
  }
  function refreshPanel() {
    var b = document.getElementById('pSummon');
    if (b) b.innerHTML = '소환 <span class="cnt">' + (summons <= 0 ? '무료' : summonCost()) + '</span>';
    var d = document.getElementById('pDice');
    if (d) d.innerHTML = '주사위 <span class="cnt">' + diceCost() + '</span>';
    var i;
    for (i = 1; i <= 3; i++) {
      var s = document.getElementById('pSp' + i);
      if (s) s.className = 'gp-btn' + (speed === i ? ' main' : '');
    }
  }
  function buildPanel(sh) {
    if (!sh.panelSlot) return;
    if (!sh.land) { sh.panelSlot.innerHTML = ''; panelBuilt = false; return; }
    if (panelBuilt) { refreshPanel(); return; }
    sh.panelSlot.innerHTML =
      '<button type="button" class="gp-btn main" id="pSummon" data-sum="summon">소환</button>' +
      '<button type="button" class="gp-btn" data-sum="sell">판매</button>' +
      '<button type="button" class="gp-btn" id="pDice" data-sum="dice">주사위</button>' +
      '<div style="display:flex;gap:6px">' +
      '<button type="button" class="gp-btn" id="pSp1" data-sum="sp1">×1</button>' +
      '<button type="button" class="gp-btn" id="pSp2" data-sum="sp2">×2</button>' +
      '<button type="button" class="gp-btn" id="pSp3" data-sum="sp3">×3</button></div>';
    panelBuilt = true;
    refreshPanel();
  }
  function onPanel(e) {
    var t = e.target.closest ? e.target.closest('[data-sum]') : null;
    if (!t || !isPlay()) return;
    e.preventDefault();
    act(t.getAttribute('data-sum'));
  }

  function injectCss() {
    var st = document.createElement('style');
    st.textContent = 'body.sum-intro #ovStart,body.sum-intro .g-top{opacity:0!important;visibility:hidden!important;pointer-events:none!important}' +
      '#sumBlock{position:absolute;top:0;right:0;bottom:0;left:0;z-index:28}' +
      '#sumShop{position:absolute;top:0;right:0;bottom:0;left:0;z-index:40;display:none;background:rgba(8,6,4,.92);overflow:auto;padding:16px 14px 24px}' +
      '#sumShop h2{font-family:"Black Han Sans",system-ui;font-weight:400;color:#f0e2c0;margin:0 0 6px;font-size:28px}' +
      '#sumShop p{color:rgba(240,226,192,.78);font-size:13px;margin:0 0 10px}' +
      '#sumShop .row{display:flex;justify-content:space-between;gap:8px;align-items:center;background:rgba(28,22,16,.9);border:1px solid rgba(198,161,90,.35);border-radius:12px;padding:8px 10px;margin:0 0 8px}' +
      '#sumShop button{min-height:44px;border-radius:12px;background:#c6a15a;color:#1a1206;font-weight:800;padding:0 12px}' +
      '#sumShop button.ghost{background:transparent;color:#f0e2c0;border:1px solid rgba(240,226,192,.4)}' +
      '#sumShop .codex{display:grid;grid-template-columns:1fr 1fr;gap:6px}' +
      '#sumShop .cd{padding:8px;border-radius:10px;background:rgba(20,16,12,.9);border:1px solid rgba(198,161,90,.25);font-size:12px;color:#f0e2c0;text-align:left}' +
      '#sumShop .cd.lock{opacity:.45}';
    document.head.appendChild(st);
  }
  function injectUi() {
    var start = document.getElementById('ovStart');
    if (start && !document.getElementById('sumOpenShop')) {
      var bar = document.createElement('div');
      bar.className = 'ov-diff'; bar.setAttribute('data-nostart', '');
      bar.innerHTML = '<button type="button" id="sumOpenShop">영혼석 강화</button><button type="button" id="sumOpenCodex">영웅 도감</button>';
      var anchor = start.querySelector('.ov-start-btn');
      if (anchor) start.insertBefore(bar, anchor);
      document.getElementById('sumOpenShop').addEventListener('click', function () { openShop('up'); });
      document.getElementById('sumOpenCodex').addEventListener('click', function () { openShop('codex'); });
    }
    var shop = document.createElement('div');
    shop.id = 'sumShop'; shop.setAttribute('data-nostart', '');
    document.getElementById('stage').appendChild(shop);
    shop.addEventListener('click', function (e) { e.stopPropagation(); });
    if (!introDone) {
      document.body.classList.add('sum-intro');
      var block = document.createElement('div');
      block.id = 'sumBlock';
      block.addEventListener('pointerdown', function (e) {
        if (introDone) return;
        e.preventDefault(); e.stopPropagation(); endIntro();
      });
      document.getElementById('stage').appendChild(block);
    }
    var slot = document.getElementById('panelSlot');
    if (slot) slot.addEventListener('click', onPanel);
  }
  var shopMode = 'up';
  function openShop(mode) { shopMode = mode || 'up'; paintShop(); var s = document.getElementById('sumShop'); if (s) s.style.display = 'block'; }
  function closeShop() { var s = document.getElementById('sumShop'); if (s) s.style.display = 'none'; }
  function upCost(key, lv) {
    var base = key === 'luck' ? 12 : key === 'gate' ? 10 : 8;
    var grow = key === 'luck' ? 1.62 : key === 'gate' ? 1.6 : 1.55;
    return Math.round(base * Math.pow(grow, lv));
  }
  function paintShop() {
    var s = document.getElementById('sumShop'); if (!s) return;
    var html = '<div style="display:flex;justify-content:space-between;align-items:center"><h2>' + (shopMode === 'codex' ? '영웅 도감' : '영혼석 강화') + '</h2><button type="button" class="ghost" id="sumShopX">닫기</button></div>';
    html += '<p>영혼석 <b style="color:#e6d3a1">' + (meta.stones || 0) + '</b> · 판이 끝나면 쌓입니다. 실제 결제는 없습니다.</p>';
    if (shopMode === 'codex') {
      html += '<div class="codex">';
      var i;
      for (i = 0; i < HEROES.length; i++) {
        var h = HEROES[i], seen = meta.codex[h.id];
        html += '<div class="cd' + (seen == null ? ' lock' : '') + '"><b>' + (seen == null ? '???' : h.name) + '</b><br>' + CLSN[h.cls] + (seen == null ? '' : ' · ' + RANK_N[seen]) + '</div>';
      }
      html += '</div>';
    } else {
      var ups = [
        { k: 'atk', name: '칼날 각인', desc: '영웅 공격력 +4%', max: 10 },
        { k: 'gold', name: '약탈의 눈', desc: '획득 골드 +6%', max: 8 },
        { k: 'gate', name: '성문 보강', desc: '성문 내구 +2', max: 6 },
        { k: 'luck', name: '운명의 기운', desc: '높은 등급이 더 잘 나옵니다', max: 8 }
      ];
      for (i = 0; i < ups.length; i++) {
        var u = ups[i], lv = meta[u.k] || 0;
        var cost = lv >= u.max ? 0 : upCost(u.k, lv);
        html += '<div class="row"><div><b>' + u.name + '</b> ' + lv + '/' + u.max + '<br><span style="opacity:.75">' + u.desc + '</span></div>';
        html += lv >= u.max ? '<button type="button" disabled>최대</button>' : '<button type="button" data-up="' + u.k + '">' + cost + '</button>';
        html += '</div>';
      }
    }
    s.innerHTML = html;
    var x = document.getElementById('sumShopX');
    if (x) x.addEventListener('click', closeShop);
    var btns = s.querySelectorAll('[data-up]');
    for (i = 0; i < btns.length; i++) btns[i].addEventListener('click', function (ev) {
      var key = ev.currentTarget.getAttribute('data-up');
      buy(key);
    });
  }
  function buy(key) {
    var max = key === 'atk' ? 10 : key === 'gold' || key === 'luck' ? 8 : 6;
    var lv = meta[key] || 0;
    if (lv >= max) return;
    var cost = upCost(key, lv);
    if (meta.stones < cost) { A.sfx('wrong'); return; }
    meta.stones -= cost; meta[key] = lv + 1; saveMeta();
    A.sfx('power'); paintShop();
  }

  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (!isPlay()) return;
    var p = S.toLocal(e);
    if (choosing) { var ci = cardAt(p.y); if (ci >= 0) applyCard(ci); return; }
    var b = hitBtn(p.x, p.y);
    if (b) { act(b.id === 'summon' ? 'summon' : b.sp ? 'sp' + b.sp : b.id); return; }
    var idx = cellAt(p.x, p.y);
    if (idx < 0) return;
    cur = idx;
    if (board[idx]) {
      drag = { id: e.pointerId, from: idx, unit: board[idx], x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false };
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    } else if (sel >= 0 && board[sel]) { combine(sel, idx); }
    else sel = -1;
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var p = S.toLocal(e);
    if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 10) drag.moved = true;
    drag.x = p.x; drag.y = p.y;
  });
  function endPointer(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var p = S.toLocal(e);
    var from = drag.from;
    var moved = drag.moved;
    drag = null;
    if (!moved) {
      if (sel < 0) sel = from;
      else if (sel === from) sel = -1;
      else combine(sel, from);
      return;
    }
    var idx = cellAt(p.x, p.y);
    if (idx >= 0 && idx !== from) combine(from, idx);
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  function moveCur(dc, dr) {
    var c = cur % 3, r = Math.floor(cur / 3);
    c = Math.max(0, Math.min(2, c + dc));
    r = Math.max(0, Math.min(5, r + dr));
    cur = r * 3 + c;
  }
  function onKey(e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = true;
    if (!board) return;
    if (choosing && (k === '1' || k === '2' || k === '3')) { applyCard(+k - 1); return; }
    if (k === 'ArrowLeft' || k === 'a') moveCur(-1, 0);
    else if (k === 'ArrowRight') moveCur(1, 0);
    else if (k === 'ArrowUp' || k === 'w') moveCur(0, -1);
    else if (k === 'ArrowDown') moveCur(0, 1);
    else if (k === 's') doSell();
    else if (k === ' ') doSummon();
    else if (k === 'Enter') {
      if (sel < 0) { if (board[cur]) sel = cur; }
      else if (sel === cur) sel = -1;
      else combine(sel, cur);
    } else if (k === 'd') doDice();
    else if (k === '1' || k === '2' || k === '3') { speed = +k; refreshPanel(); }
    hud();
  }

  introSeen = A.get('neowa_summon_seen', '') === '1';
  var forceIntro = /intro=1/.test(location.search);
  introLen = (!introSeen || forceIntro) ? 8.6 : 1.7;
  introT = 0;
  introDone = !forceIntro && !!navigator.webdriver;
  if (!introDone) document.body.classList.add('sum-intro');
  window.addEventListener('keydown', function (e) {
    if (introDone) return;
    endIntro();
    e.preventDefault();
    e.stopPropagation();
  }, true);

  var S = new A.Shell({
    id: 'summon',
    W: 540, H: 960,
    land: [960, 600],
    bloom: 0.16,
    init: function () {
      buildSprites(); injectCss(); injectUi();
      if (!board) {
        board = [];
        var i; for (i = 0; i < SLOTS; i++) board.push(null);
        foes = []; shots = []; dust = [];
        gold = 40; wave = 1; life = 10; maxLife = 10; speed = 1; cur = 0; sel = -1;
        mod = { dmg: 0, rate: 0, gold: 0, cost: 0, slow: 0, poison: 0, boss: 0, myth: 0 };
      }
    },
    onResize: geo,
    reset: reset,
    update: update,
    idle: idle,
    render: render,
    keydown: onKey,
    keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; }
  });

  function shotReady() {
    tutStep = 9; summons = Math.max(summons, 6);
    var b = document.getElementById('banner');
    if (b) { b.classList.remove('show'); b.innerHTML = ''; }
  }
  if (/shot=1|debug=1/.test(location.search)) {
    window.__SUM = {
      endIntro: endIntro,
      summon: doSummon,
      myth: function () {
        if (!isPlay()) S.start();
        var s = emptySlot(0); if (s < 0) s = 0;
        board[s] = makeUnit('flame', 4); unlock('flame', 4); beginMyth(s);
        shotReady();
      },
      boss: function () {
        if (!isPlay()) S.start();
        wave = 10; foes = []; queue = []; qi = 0; phase = 'fight';
        board[0] = makeUnit('swordsman', 2);
        board[1] = makeUnit('flame', 2);
        board[3] = makeUnit('longbow', 3);
        spawnOne('boss');
        hold = 0.4;
        shotReady();
      },
      late: function () {
        if (!isPlay()) S.start();
        var i;
        for (i = 0; i < SLOTS; i++) board[i] = makeUnit(HEROES[i % HEROES.length].id, i % 5 === 0 ? 4 : 3);
        wave = 27; gold = 420; life = maxLife; foes = [];
        var n; for (n = 0; n < 14; n++) { spawnOne(n % 5 === 0 ? 'a' : n % 3 === 0 ? 'y' : n % 2 ? 'f' : 'n'); foes[foes.length - 1].dist = 80 + n * 140; }
        shotReady();
      },
      snap: function () {
        var units = [], i;
        for (i = 0; i < SLOTS; i++) units.push(board[i] ? board[i].id + ':' + board[i].rank : '');
        return { wave: wave, life: Math.floor(life * 10) / 10, gold: Math.floor(gold), score: Math.floor(score), foes: foes.length, cost: Math.floor(summonCost()), choosing: choosing, dead: dead, speed: speed, cur: cur, sel: sel, units: units.join(',') };
      }
    };
  }
})();
