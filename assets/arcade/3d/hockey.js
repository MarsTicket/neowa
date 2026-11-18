/* 에어 하키 3D 장면 (게임 규칙은 docs/tools/games/hockey.js 그대로, 그림만 3D)
   위에서 내려다보는 카메라라 손가락으로 누른 곳 = 말렛이 있는 곳이 정확히 맞습니다(테이블 면이 게임 평면 z=0). */
Arcade.G3D.define('hockey', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960, TOP = 90, BOT = 930, GW = 180, MR = 38, PR = 24, MID = (TOP + BOT) / 2;
  var cam = X.planeCam(W / 2, H * 0.9, 950); // 내 쪽(아래)에서 비스듬히 보는 느낌

  scene.background = new THREE.Color(0x03050c);

  /* 바닥(테이블 밖): 어두운 경기장 */
  var floorTex = X.canvasTex(256, 256, function (x, w, h) {
    x.fillStyle = '#05070f'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(94,231,255,.07)'; x.lineWidth = 2;
    for (var i = 0; i <= w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(8, 12);
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(2400, 3200), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
  floor.position.set(W / 2, -H / 2, -90); floor.receiveShadow = X.shadows; scene.add(floor);

  /* 테이블 면: 얼음처럼 반짝이는 판 + 선 무늬 */
  var surfTex = X.canvasTex(540, 860, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1838'); g.addColorStop(0.5, '#10204a'); g.addColorStop(1, '#0d1838');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // 에어 구멍
    x.fillStyle = 'rgba(255,255,255,.05)';
    for (var yy = 16; yy < h; yy += 26) for (var xx = 16 + ((yy / 26) % 2) * 13; xx < w; xx += 26) { x.beginPath(); x.arc(xx, yy, 1.6, 0, 7); x.fill(); }
    var m = h / 2;
    x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, m); x.lineTo(w, m); x.stroke();
    x.beginPath(); x.arc(w / 2, m, 70, 0, 7); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(w / 2, m, 8, 0, 7); x.fill();
    // 골 구역 반원
    x.strokeStyle = 'rgba(255,77,109,.45)'; x.beginPath(); x.arc(w / 2, 0, 120, 0, Math.PI); x.stroke();
    x.strokeStyle = 'rgba(94,231,255,.45)'; x.beginPath(); x.arc(w / 2, h, 120, Math.PI, Math.PI * 2); x.stroke();
  });
  var surfH = BOT - TOP + 12;
  var surf = new THREE.Mesh(new THREE.PlaneGeometry(W - 12, surfH), new THREE.MeshStandardMaterial({ map: surfTex, roughness: 0.5, metalness: 0.15 }));
  surf.position.set(W / 2, -(TOP + BOT) / 2, 0); surf.receiveShadow = X.shadows; scene.add(surf);
  // 판 아래 받침
  var bodyM = new THREE.Mesh(X.roundBox(W + 30, surfH + 40, 80, 18, 2), X.std(0x141a2e, { r: 0.4, m: 0.6 }));
  bodyM.position.set(W / 2, -(TOP + BOT) / 2, -41); bodyM.receiveShadow = X.shadows; scene.add(bodyM);

  /* 테두리 (골문 자리는 비움) + 위쪽 네온 줄 */
  var railMat = X.std(0x1b2442, { r: 0.35, m: 0.7 }), RH = 26, RT = 14;
  function rail(x0, y0, x1, y1, neon) {
    var w = Math.abs(x1 - x0) || RT, h = Math.abs(y1 - y0) || RT;
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, RH), railMat); m.position.set((x0 + x1) / 2, -(y0 + y1) / 2, RH / 2); m.castShadow = X.shadows; m.receiveShadow = X.shadows; scene.add(m);
    var n = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), X.basic(neon)); n.position.set((x0 + x1) / 2, -(y0 + y1) / 2, RH + 1); scene.add(n);
  }
  var L = 6 - RT / 2, R = W - 6 + RT / 2, T = TOP - 6 - RT / 2, B = BOT + 6 + RT / 2;
  rail(L, T, L, B, 0x5ee7ff); rail(R, T, R, B, 0x5ee7ff);
  rail(L - RT / 2, T, W / 2 - GW / 2, T, 0xff4d6d); rail(W / 2 + GW / 2, T, R + RT / 2, T, 0xff4d6d);
  rail(L - RT / 2, B, W / 2 - GW / 2, B, 0x5ee7ff); rail(W / 2 + GW / 2, B, R + RT / 2, B, 0x5ee7ff);
  // 골문: 빛나는 구멍
  function goalMouth(y, hex) {
    var g = new THREE.Group();
    var hole = new THREE.Mesh(new THREE.BoxGeometry(GW, 22, 4), X.basic(0x000000)); hole.position.z = 1; g.add(hole);
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(GW * 1.5, 160), new THREE.MeshBasicMaterial({ map: X.glowTex(hex), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.z = 2; g.add(glow); g.userData.glow = glow;
    g.position.set(W / 2, -y, 0); scene.add(g); return g;
  }
  var goalTop = goalMouth(TOP - 8, '#ff4d6d'), goalBot = goalMouth(BOT + 8, '#5ee7ff');

  /* 판 위 큰 점수 (점수가 바뀔 때만 다시 그림) */
  var numCv = document.createElement('canvas'); numCv.width = 256; numCv.height = 512;
  var numTex = new THREE.CanvasTexture(numCv); if (THREE.SRGBColorSpace) numTex.colorSpace = THREE.SRGBColorSpace;
  var nums = new THREE.Mesh(new THREE.PlaneGeometry(240, 480), new THREE.MeshBasicMaterial({ map: numTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  nums.position.set(W / 2, -MID, 0.6); scene.add(nums);
  var lastNums = '';
  function paintNums(a, b, duo) {
    var k = a + ':' + b + ':' + duo; if (k === lastNums) return; lastNums = k;
    var x = numCv.getContext('2d'); x.clearRect(0, 0, 256, 512);
    x.font = '700 120px "Chakra Petch", system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(255,120,150,.22)';
    if (duo) { x.save(); x.translate(128, 96); x.rotate(Math.PI); x.fillText(String(b), 0, 0); x.restore(); } else x.fillText(String(b), 128, 96);
    x.fillStyle = 'rgba(120,230,255,.22)'; x.fillText(String(a), 128, 416);
    numTex.needsUpdate = true;
  }

  /* 말렛·퍽 */
  function mallet(hex) {
    var g = new THREE.Group(), c = new THREE.Color(hex);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR, 14, 40), X.std(c, { r: 0.25, m: 0.3, e: c, ei: 0.35 }));
    base.rotation.x = Math.PI / 2; base.position.z = 7; base.castShadow = X.shadows; g.add(base);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(MR - 3, 3, 10, 40), X.basic(0xffffff, { add: true, o: 0.55 })); rim.position.z = 14.5; g.add(rim);
    var dome = new THREE.Mesh(new THREE.CylinderGeometry(MR * 0.55, MR * 0.6, 10, 32), X.std(0x0a0d18, { r: 0.3, m: 0.5 }));
    dome.rotation.x = Math.PI / 2; dome.position.z = 19; g.add(dome);
    var knob = new THREE.Mesh(new THREE.SphereGeometry(MR * 0.34, 24, 16), X.std(c.clone().lerp(new THREE.Color(0xffffff), 0.5), { r: 0.15, m: 0.2, e: c, ei: 0.5 }));
    knob.position.z = 34; knob.scale.z = 1.3; knob.castShadow = X.shadows; g.add(knob);
    var under = new THREE.Mesh(new THREE.PlaneGeometry(MR * 5, MR * 5), new THREE.MeshBasicMaterial({ map: X.glowTex(hex), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    under.position.z = 0.8; g.add(under);
    var light = new THREE.PointLight(c, 1.2, 260, 1.6); light.position.z = 40; g.add(light);
    scene.add(g); return g;
  }
  var mMe = mallet('#5ee7ff'), mCpu = mallet('#ff4d6d');
  var puck = new THREE.Group();
  var pBody = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 9, 36), X.std(0xf4f5fb, { r: 0.2, m: 0.1, e: 0xffffff, ei: 0.25 }));
  pBody.rotation.x = Math.PI / 2; pBody.position.z = 4.5; pBody.castShadow = X.shadows; puck.add(pBody);
  var pRing = new THREE.Mesh(new THREE.TorusGeometry(PR * 0.6, 2, 8, 32), X.basic(0x9be7ff)); pRing.position.z = 9.5; puck.add(pRing);
  var pGlow = new THREE.Mesh(new THREE.PlaneGeometry(PR * 6, PR * 6), new THREE.MeshBasicMaterial({ map: X.glowTex('#ffffff'), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  pGlow.position.z = 0.7; puck.add(pGlow);
  scene.add(puck);
  // 퍽 잔상
  var ghosts = [], gPts = [];
  for (var i = 0; i < 8; i++) { var gh = new THREE.Mesh(new THREE.CircleGeometry(PR, 24), X.basic(0x9be7ff, { add: true, o: 0 })); gh.position.z = 1; scene.add(gh); ghosts.push(gh); }

  /* 빛 */
  scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x10081c, 0.55));
  var spot = new THREE.SpotLight(0xffffff, 1.4, 0, 0.75, 0.7, 0); spot.position.set(W / 2, -MID + 250, 1100);
  spot.target.position.set(W / 2, -MID, 0); scene.add(spot); scene.add(spot.target);
  if (X.shadows) { spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0008; spot.shadow.camera.near = 600; spot.shadow.camera.far = 1600; }
  var pLight = new THREE.PointLight(0xffffff, 0.8, 220, 1.6); pLight.position.z = 30; scene.add(pLight);

  var lastA = 0, lastB = 0, flashTop = 0, flashBot = 0;
  return {
    camera: cam,
    update: function (s, dt, o, time) {
      var me = s.me || { x: W / 2, y: BOT - 120 }, cpu = s.cpu || { x: W / 2, y: TOP + 120 };
      var pk = s.puck || { x: W / 2 + Math.sin(time) * 80, y: MID, vx: 0, vy: 0 };
      mMe.position.set(me.x, -me.y, 0); mCpu.position.set(cpu.x, -cpu.y, 0);
      // 말렛이 움직이는 방향으로 살짝 기울기
      mMe.rotation.set(A.clamp((me.vy || 0) * 0.00012, -0.25, 0.25), A.clamp((me.vx || 0) * 0.00012, -0.25, 0.25), 0);
      mCpu.rotation.set(A.clamp((cpu.vy || 0) * 0.00012, -0.25, 0.25), A.clamp((cpu.vx || 0) * 0.00012, -0.25, 0.25), 0);
      puck.position.set(pk.x, -pk.y, 0); pLight.position.set(pk.x, -pk.y, 30);
      var sp = Math.hypot(pk.vx || 0, pk.vy || 0);
      pRing.material.color.setHSL(0.52 - Math.min(1, sp / 1500) * 0.5, 1, 0.65);
      pLight.intensity = 0.6 + Math.min(1.6, sp / 700);
      gPts.unshift([pk.x, pk.y]); if (gPts.length > 8) gPts.pop();
      for (var i = 0; i < ghosts.length; i++) {
        var p = gPts[i], g = ghosts[i];
        if (!p || sp < 380) { g.visible = false; continue; }
        g.visible = true; g.position.set(p[0], -p[1], 1); g.material.opacity = (1 - i / ghosts.length) * 0.22 * Math.min(1, sp / 900); g.scale.setScalar(1 - i * 0.06);
      }
      // 골 섬광
      var a = s.sMe || 0, b = s.sCpu || 0;
      if (a > lastA) flashTop = 1; if (b > lastB) flashBot = 1; lastA = a; lastB = b;
      flashTop = Math.max(0, flashTop - dt * 1.5); flashBot = Math.max(0, flashBot - dt * 1.5);
      goalTop.userData.glow.material.opacity = 0.45 + flashTop * 0.9 + Math.sin(time * 3) * 0.05;
      goalBot.userData.glow.material.opacity = 0.45 + flashBot * 0.9 + Math.sin(time * 3 + 1) * 0.05;
      goalTop.userData.glow.scale.setScalar(1 + flashTop * 0.8); goalBot.userData.glow.scale.setScalar(1 + flashBot * 0.8);
      paintNums(a, b, !!s.duo);
      cam.fitPlane(W, H, o[0], o[1]);
    }
  };
});
