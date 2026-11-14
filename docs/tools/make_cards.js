/*
  게임 카드 그림 만들기 (assets/<id>-card.jpg, 1200x750)
  - 실제 게임을 열어 잠깐 플레이한 뒤, 캔버스 화면을 '세로 화면 + 흐린 배경' 카드로 저장합니다.
  - 사용법: (저장소 맨 위에서) python3 -m http.server 8765  →  node docs/tools/make_cards.js runner tower
  - 새 게임을 추가하면 아래 G 목록에 { acts: 시작 후 할 조작, cy: 흐린 배경 세로 중심(0~1), acc: 대표색 } 을 넣으세요.
  - 손으로 그린 일러스트(shooting, snake, breakout 카드)는 이 도구로 만든 것이 아닙니다.
*/
const {chromium}=require('playwright');const fs=require('fs');
const path=require('path');
const OUT=path.join(__dirname,'..','..','assets')+'/';
const BASE=process.env.BASE||'http://localhost:8765/';
const ONLY=process.argv.slice(2);
const CAT=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog.json'),'utf8'));
const DEF={acts:async(p)=>{await p.keyboard.press('Space');await p.waitForTimeout(1400);},cy:0.5};
const G={
 runner:{acts:async(p,b)=>{await p.keyboard.press('Space');for(let i=0;i<6;i++){await p.waitForTimeout(260);await p.keyboard.down('ArrowUp');await p.waitForTimeout(120);await p.keyboard.up('ArrowUp');}}, cy:0.62, acc:'#b48cff'},
 tower:{acts:async(p)=>{}, cy:0.66, acc:'#ffe066'},
 orbit:{acts:async(p)=>{await p.keyboard.press('Space');await p.waitForTimeout(900);}, cy:0.5, acc:'#ff7a45'},
 dodge:{acts:async(p,b)=>{await p.keyboard.press('Space');await p.mouse.move(b.x+b.width/2,b.y+b.height*0.7);await p.mouse.down();for(let t=0;t<45;t++){await p.mouse.move(b.x+b.width*(0.5+0.3*Math.sin(t/4)),b.y+b.height*(0.65+0.1*Math.cos(t/3)),{steps:2});await p.waitForTimeout(100);} }, cy:0.5, acc:'#ff4d6d'},
 blocks:{acts:async(p,b)=>{await p.keyboard.press('Space');const s=b.width/540;for(let r=0;r<4;r++)for(const sl of [95,270,445]){await p.mouse.move(b.x+sl*s,b.y+790*s);await p.mouse.down();await p.mouse.move(b.x+(38+((r*3+sl)%6)*58+60)*s,b.y+(140+((r*5+sl)%6)*58+60)*s,{steps:4});await p.mouse.up();}}, cy:0.36, acc:'#7aa2ff'},
 mines:{acts:async(p)=>{await p.click('[data-diff="1"]');await p.keyboard.press('Space');await p.keyboard.press('Space');await p.keyboard.press('ArrowUp');await p.keyboard.press('ArrowUp');await p.keyboard.press('ArrowUp');await p.keyboard.press('ArrowUp');await p.keyboard.press('x');await p.waitForTimeout(500);}, cy:0.42, acc:'#4dffd2'},
 fall:{acts:async(p)=>{await p.keyboard.press('Space');await p.waitForTimeout(200);const mv=[-4,4,-2,2,0,-3,3,1,-1,4,-4,2,-2];for(let i=0;i<mv.length;i++){if(i%3===1)await p.keyboard.press('ArrowUp');const k=mv[i]<0?'ArrowLeft':'ArrowRight';for(let j=0;j<Math.abs(mv[i]);j++)await p.keyboard.press(k);await p.keyboard.press('Space');await p.waitForTimeout(90);}await p.waitForTimeout(500);}, cy:0.62, acc:'#5ee7ff'},
 sudoku:{acts:async(p)=>{await p.keyboard.press('Space');await p.waitForTimeout(300);for(const k of ['h','ArrowDown','ArrowRight','ArrowRight','h','ArrowDown','h'])await p.keyboard.press(k);await p.waitForTimeout(250);}, cy:0.36, acc:'#c3ff5e'},
};
(async()=>{const br=await chromium.launch();
for(const cat of CAT){
 const id=cat.id; if(cat.art!=='capture')continue; if(ONLY.length&&ONLY.indexOf(id)<0)continue;
 const g=Object.assign({},DEF,G[id]||{}); g.acc=g.acc||cat.accent;
 const p=await br.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2});
 await p.goto(BASE+id+'/');await p.waitForTimeout(800);
 const b=await p.locator('#stage').boundingBox();
 await g.acts(p,b);await p.waitForTimeout(150);
 const data=await p.evaluate(([cy,acc])=>{const src=document.getElementById('cv');
  const c=document.createElement('canvas');c.width=1200;c.height=750;const x=c.getContext('2d');
  const sw=src.width, sh=src.height;
  x.filter='blur(30px) brightness(.5) saturate(1.3)';
  const bw=1400, bh=bw*sh/sw; x.drawImage(src,(1200-bw)/2,375-bh*cy,bw,bh); x.filter='none';
  const fh=690, fw=fh*sw/sh, fx0=(1200-fw)/2, fy0=30;
  x.save(); x.shadowColor=acc; x.shadowBlur=70; x.fillStyle='#000';
  const r=26; x.beginPath(); x.moveTo(fx0+r,fy0); x.arcTo(fx0+fw,fy0,fx0+fw,fy0+fh,r); x.arcTo(fx0+fw,fy0+fh,fx0,fy0+fh,r); x.arcTo(fx0,fy0+fh,fx0,fy0,r); x.arcTo(fx0,fy0,fx0+fw,fy0,r); x.closePath(); x.fill();
  x.shadowBlur=0; x.clip(); x.drawImage(src,fx0,fy0,fw,fh); x.restore();
  x.strokeStyle=acc+'99'; x.lineWidth=2; x.beginPath(); x.moveTo(fx0+r,fy0); x.arcTo(fx0+fw,fy0,fx0+fw,fy0+fh,r); x.arcTo(fx0+fw,fy0+fh,fx0,fy0+fh,r); x.arcTo(fx0,fy0+fh,fx0,fy0,r); x.arcTo(fx0,fy0,fx0+fw,fy0,r); x.closePath(); x.stroke();
  return c.toDataURL('image/jpeg',0.84);},[g.cy,g.acc]);
 fs.writeFileSync(OUT+id+'-card.jpg',Buffer.from(data.split(',')[1],'base64'));
 console.log(id,fs.statSync(OUT+id+'-card.jpg').size);await p.close();}
await br.close();})();
