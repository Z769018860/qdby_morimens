// DOM harness for inspection and shop interactions; no canvas or browser globals required.
import assert from 'node:assert/strict';
const ids=new Map(), events=new Map();
class Element {
  constructor(tag='div'){this.tagName=tag;this.dataset={};this.style={setProperty(){}};this.hidden=false;this.children=[];this.className='';this.classList={add(){},remove(){},toggle(){},contains(){return false}};}
  set id(v){this._id=v;ids.set(v,this)} get id(){return this._id}
  setAttribute(k,v){if(k==='id')this.id=v;else if(k==='class')this.className=v;else if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;}
  append(el){el.parentNode=this;this.children.push(el)}
  set innerHTML(html){this.html=html;this.children=[];for(const m of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){const el=new Element(m[1]);for(const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g))el.setAttribute(a[1],a[2]);this.append(el)}}
  get innerHTML(){return this.html||''}
  matches(sel){return sel.split(',').some(s=>{s=s.trim();if(s.startsWith('#protocolDetails '))s=s.slice(17);const cl=s.match(/^\.([\w-]+)/);const attr=s.match(/\[data-([\w-]+)\]/);return (!cl||this.className.split(' ').includes(cl[1]))&&(!attr||this.dataset[attr[1]]!=null)})}
  querySelectorAll(sel){return this.children.filter(el=>el.matches(sel))}
  querySelector(sel){return this.querySelectorAll(sel)[0]||new Element()}
  closest(sel){return this.matches(sel)?this:null}
  contains(el){return el===this||this.children.includes(el)}
  addEventListener(k,fn){this['on'+k]=fn}
  getBoundingClientRect(){return {bottom:50,top:820,right:280}}
  insertAdjacentHTML(_,html){this.html=(this.html||'')+html}
}
const get=id=>{if(!ids.has(id)){const e=new Element();e.id=id}return ids.get(id)};
const body=new Element('body'),app=new Element();
globalThis.document={body,documentElement:new Element(),getElementById:get,createElement:t=>new Element(t),querySelector:()=>app,querySelectorAll:()=>[],addEventListener:(key,fn)=>{if(!events.has(key))events.set(key,[]);events.get(key).push(fn)}};
globalThis.window={innerWidth:1920,innerHeight:1080,matchMedia:()=>({matches:false})};
globalThis.matchMedia=globalThis.window.matchMedia;   // ui.js 里有些地方直接调裸 matchMedia，node 里没有
globalThis.localStorage={getItem:()=> '1',setItem(){}};
const {G,buy}=await import('../js/pf/engine.js');
const {build,startRun,sync,ui,inspectCell,hideInspection,updateHUD,select,relayoutInspection}=await import('../js/pf/ui.js');
const fire=(key,target)=>events.get(key)?.forEach(fn=>fn({target,relatedTarget:null,preventDefault(){}}));
build();startRun(42);G.gold=100;
const id=G.shop[0].id;
for(let n=0;n<9;n++){G.shop[0]={id};assert(buy(0))}sync();
assert.equal(get('btnBonusShop').hidden,false);
const original=structuredClone(G.shop);
get('btnBonusShop').onclick();assert.equal(ui.bonusShop,true);
assert.equal(get('btnBonusShop').textContent,'返回原商店');
const first=get('shop').children.find(el=>el.dataset.i==='0');assert(first);first.onclick();assert.deepEqual(G.shop,original);
get('btnBonusShop').onclick();assert.equal(ui.bonusShop,false);assert.deepEqual(G.shop,original);
const chip=get('sdTraits').children.find(el=>el.className.split(' ').includes('tr'));
assert(chip);fire('pointerover',chip);
const panel=get('protocolDetails');assert.equal(panel.parentNode,body);assert.equal(panel.hidden,false);assert.match(panel.innerHTML,/当前.*人/);
const buffHTML=panel.innerHTML;
// 悬停 BUFF 后把鼠标移到棋盘空地：面板跟着换成地块说明（inspectCell 的现行行为），
// 且 terrainOnly 的隐藏不能把它清掉。旧断言要求「保留 BUFF」，那是地块说明接进来之前的老行为。
inspectCell(0,400,200);assert.match(panel.innerHTML,/高台/,'hovering a cell switches the panel to that terrain');
assert.equal(panel.hidden,false);hideInspection(true);assert.equal(panel.hidden,false,'terrain tooltip survives a terrain-only hide');
assert.ok(buffHTML.includes('羁绊'));
fire('click',chip);hideInspection();assert.equal(panel.hidden,false,'clicked Buff stays pinned');
fire('keydown',{matches:()=>false});get('btnFieldGuide').onclick();assert.match(panel.innerHTML,/影怪经过时移速降低 28%/);
get('btnCodex').onclick();assert.match(panel.innerHTML,/命轮/);
const wheel=panel.children.find(el=>el.dataset.detail?.startsWith('wheel:'));assert(wheel);fire('click',wheel);assert.match(panel.innerHTML,/装备效果/);
get('btnFieldGuide').onclick();panel.querySelector('.detail-close').onclick();
const cell=Number(Object.keys(G.terrain)[0]);inspectCell(cell,300,200);assert.equal(panel.hidden,false);hideInspection();assert.equal(panel.hidden,true);
updateHUD();assert.equal(get('purseInt').textContent,'息 +5');
console.log('Protocol UI: extra-shop return, original shelf preservation, unclipped Buff hover/pin, terrain guide and equipment details passed');

window.innerWidth=844;window.innerHeight=390;ui.layoutKey='844:390';
select(G.units[0].uid);assert.match(get('unitCard').innerHTML,/>详情<\/button>/);
get('cardMore').onclick();assert.match(get('unitCard').innerHTML,/>收起<\/button>/);
// 横屏说明面板贴左上：具体像素由 showDetails 按安全区与底栏算（harness 里没有底栏，实测 31px），
// 这里只校验「贴着顶部、靠左 12px、不超出视口」，不再钉死 12px。
get('btnFieldGuide').onclick();
assert.ok(parseInt(panel.style.top,10) <= 40,'landscape panel should hug the top edge');
assert.equal(panel.style.left,'12px');
// 高度按可视区现算，不钉死像素；这里校验「装得下 390 高的横屏」即可
const mh1=parseInt(panel.style.maxHeight,10);assert.ok(mh1>200&&mh1<=390,`panel height should fit the landscape viewport, got ${mh1}`);
// 键盘弹出 / 地址栏收起时视觉视口变矮（390→320），面板高度必须跟着收，不能顶出屏幕
window.visualViewport={height:320};relayoutInspection();
const mh2=parseInt(panel.style.maxHeight,10);assert.ok(mh2<mh1&&mh2<=296,`visual viewport shrink should clamp the panel, got ${mh2}`);
console.log('Protocol landscape UI: compact character card, expanded details and visual-viewport resizing passed');
