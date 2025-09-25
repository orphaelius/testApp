import { topicsRegistry, findTopic, setDifficulty, getDifficultyLabel, cycleDifficulty } from './topics.js';

const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const clear = n=>{ if(!n) return; while(n.firstChild) n.removeChild(n.firstChild); };
async function typesetMath(el){ const mj = window.MathJax; if (mj?.typesetPromise) await mj.typesetPromise([el]); }

const DEFAULT_PLAYER = { name:'Player', avatarId:0, shape:'rounded', color:'#6aa6ff', asset:null };
const DEFAULT_SETTINGS = { theme:'blue', tintStrength:0.25, pet:null }; // pet = {url}

function load(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; } }
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function loadPlayer(){ return load('mq_player', DEFAULT_PLAYER); }
function savePlayer(p){ save('mq_player', p); }
function loadSettings(){ return load('asym_settings', DEFAULT_SETTINGS); }
function saveSettings(s){ save('asym_settings', s); }
function applyTheme(theme){ document.documentElement.setAttribute('data-theme', theme); }

function resolveURL(urlLike){ try{ return new URL(urlLike, document.baseURI).toString(); }catch{ return urlLike; } }

/* ---------- Avatar & Pet Rendering ---------- */
function shapeClip(shape){
  return shape==='circle' ? 'circle(50% at 50% 50%)' :
         shape==='diamond'? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
         shape==='hex'    ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' :
         'inset(0 round 14%)';
}
function renderAvatarBG(){
  const settings = loadSettings();
  const bg = $('#avatarBG');
  if (!bg) return;
  bg.style.background = `color-mix(in srgb, var(--avatar-tint) ${(settings.tintStrength*100)|0}%, transparent)`;
}
function renderAvatar(){
  const p = loadPlayer();
  $('#hudPlayerName').textContent = p.name || DEFAULT_PLAYER.name;

  const wrap = $('#pixelCharContainer'); if (!wrap) return; clear(wrap);
  const bbox = wrap.getBoundingClientRect(); const size = Math.min(bbox.width, bbox.height) || 180;

  const container = document.createElement('div');
  Object.assign(container.style, { width:size+'px', height:size+'px', clipPath:shapeClip(p.shape), borderRadius:'14%', background:'transparent', position:'relative', display:'grid', placeItems:'center' });

  // custom asset?
  if (p.asset?.url){
    const scale = (typeof p.asset.scale==='number')?p.asset.scale:1;
    const off = p.asset.offset || {x:0,y:0};
    if (p.asset.type==='sprite'){
      const cols = Math.max(1, p.asset.cols||6);
      const fps  = Math.max(1, p.asset.fps||8);
      const frameSize = 64;
      const el = document.createElement('div');
      el.style.width = Math.round(frameSize*scale)+'px';
      el.style.height= Math.round(frameSize*scale)+'px';
      el.style.backgroundImage = `url(${resolveURL(p.asset.url)})`;
      el.style.backgroundRepeat='no-repeat';
      el.style.backgroundSize = `${cols*frameSize}px ${frameSize}px`;
      el.style.transform = `translate(${off.x||0}px, ${off.y||0}px)`;
      const anim=`sprite-${cols}-${fps}-${Math.random().toString(36).slice(2)}`;
      const style=document.createElement('style');
      style.textContent = `@keyframes ${anim}{from{background-position-x:0px}to{background-position-x:-${cols*frameSize}px}}`;
      document.head.appendChild(style);
      el.style.animation = `${anim} ${(cols/fps).toFixed(4)}s steps(${cols}) infinite`;
      container.appendChild(el);
    } else {
      const img = document.createElement('img');
      img.src = resolveURL(p.asset.url); img.alt='avatar';
      img.style.width = Math.round(64*scale)+'px';
      img.style.height= Math.round(64*scale)+'px';
      img.style.objectFit='contain'; img.style.imageRendering='pixelated';
      const t = `translate(${off.x||0}px, ${off.y||0}px)`;
      img.style.transform = t;
      img.addEventListener('error', ()=>console.error('[avatar] load fail', p.asset.url));
      container.appendChild(img);
    }
  } else {
    // simple block avatar
    const svgNS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 64 64'); svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.style.clipPath = shapeClip(p.shape); svg.style.background='transparent'; svg.style.borderRadius='14%';
    const defs=document.createElementNS(svgNS,'defs');
    const glow=document.createElementNS(svgNS,'filter'); glow.setAttribute('id','glow');
    glow.innerHTML=`<feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    defs.appendChild(glow); svg.appendChild(defs);
    const presets=[
      [[1,1],[2,1],[1,2],[2,2],[1,3],[2,3]], [[0,1],[1,1],[2,1],[1,2],[1,3]],
      [[0,0],[3,0],[1,1],[2,1],[1,2],[2,2],[0,3],[3,3]], [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2],[1,3],[2,3]],
      [[0,0],[1,1],[2,2],[3,3],[3,0],[2,1],[1,2],[0,3]], [[1,0],[2,0],[0,2],[1,2],[2,2],[3,2]],
      [[0,1],[3,1],[1,2],[2,2],[1,3],[2,3]], [[1,1],[2,1],[0,2],[1,2],[2,2],[3,2]],
      [[1,0],[2,0],[1,1],[2,1],[1,2],[2,2]], [[0,0],[3,0],[0,3],[3,3],[1,1],[2,2]],
    ];
    const cells = presets[(p.avatarId||0) % presets.length];
    const cellSize=14, pad=6;
    cells.forEach(([cx,cy])=>{
      const r=document.createElementNS(svgNS,'rect');
      r.setAttribute('x', pad + cx*cellSize);
      r.setAttribute('y', pad + cy*cellSize);
      r.setAttribute('width', cellSize); r.setAttribute('height', cellSize); r.setAttribute('rx',3);
      r.setAttribute('fill', p.color); r.setAttribute('filter', 'url(#glow)');
      svg.appendChild(r);
    });
    container.appendChild(svg);
  }

  wrap.appendChild(container);

  // Pet
  const pet = loadSettings().pet;
  const petStage = $('#petStage');
  clear(petStage);
  if (pet?.url){
    const img = document.createElement('img');
    img.src = resolveURL(pet.url); img.alt='pet';
    img.style.width='100%'; img.style.height='100%'; img.style.objectFit='contain'; img.style.imageRendering='pixelated';
    petStage.appendChild(img);
    petStage.classList.add('on');
  } else {
    petStage.classList.remove('on');
  }

  // Avatar BG tint
  renderAvatarBG();
}

/* ---------- XP / Level / Loot ---------- */
const xpState = { level:1, xp:0, streak:0, loot:0, get xpNeeded(){ return 100*this.level; } };
function loadXP(){ Object.assign(xpState, load('mq_xp', {level:1,xp:0,streak:0,loot:0})); }
function saveXP(){ save('mq_xp', {level:xpState.level, xp:xpState.xp, streak:xpState.streak, loot:xpState.loot}); }
function syncHUD(){
  $('#hudLevel').textContent = xpState.level;
  $('#hudXP').textContent = xpState.xp;
  $('#streakVal').textContent = xpState.streak;
  $('#lootCount').textContent = xpState.loot;
  updateXPBar();
}
function updateXPBar(){
  const pct = Math.max(0, Math.min(100, Math.round(xpState.xp/xpState.xpNeeded*100)));
  $('#xpBar').style.width = pct + '%';
}
function pulseXP(){
  const rail = $('#xpRail'); rail.classList.remove('pulse'); void rail.offsetWidth; rail.classList.add('pulse');
}
function addLootForLevelUp(newLevel, oldLevel){
  // +1 per level; +3 bonus at every 10th level
  const gained = newLevel - oldLevel;
  let loot = gained; // 1 per level
  for (let L=oldLevel+1; L<=newLevel; L++){ if (L%10===0) loot += 2; } // +2 extra so total 3 at each 10th
  xpState.loot += loot;
}
function awardXPAnimated(amountTotal=15){
  // float chip
  const tpl = $('#xpFloatTpl'); const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('span').textContent = amountTotal; const host = $('#feedback'); host.style.position='relative'; host.appendChild(node); setTimeout(()=>node.remove(), 1850);
  // pulse & slow add
  pulseXP();
  let remaining = amountTotal;
  const tick = ()=>{
    if (remaining<=0) { saveXP(); syncHUD(); return; }
    const step = Math.max(1, Math.round(amountTotal/20)); // ~20 ticks
    const need = xpState.xpNeeded - xpState.xp;
    const delta = Math.min(step, remaining, need);
    const beforeLevel = xpState.level;
    xpState.xp += delta; remaining -= delta;
    if (xpState.xp >= xpState.xpNeeded){ xpState.level += 1; xpState.xp = 0; addLootForLevelUp(xpState.level, beforeLevel); }
    syncHUD();
    requestAnimationFrame(()=> setTimeout(tick, 40));
  };
  tick();
}

/* ---------- Topics & Difficulty ---------- */
let currentTopicId = null, currentQ = null;
let difficulty = 'easy'; // easy | medium | hard

async function newQuestion(){
  const topic = findTopic(currentTopicId); if (!topic) return;
  currentQ = topic.generateQuestion(difficulty);
  const p = $('#questionPrompt'); p.textContent = currentQ.prompt; await typesetMath(p);
  const ai = $('#answerInput'); ai.value=''; $('#feedback').className='feedback'; $('#feedback').textContent='';
}
function parseResult(r){ return (typeof r==='boolean')? {correct:r} : r; }
function checkAnswer(){
  const topic = findTopic(currentTopicId); if (!topic || !currentQ) return;
  const result = parseResult(topic.checkAnswer($('#answerInput').value.trim(), currentQ));
  if (result.correct){
    $('#feedback').className='feedback ok'; $('#feedback').textContent='Correct!';
    xpState.streak += 1;
    const bonus = Math.min(xpState.streak*5, 25);
    awardXPAnimated(15 + bonus);
    setTimeout(()=> newQuestion(), 600);
  } else {
    $('#feedback').className='feedback bad'; $('#feedback').textContent = result.feedback || 'Try again.';
    xpState.streak = 0; saveXP(); syncHUD();
  }
}
function populateTopics(){
  const sel = $('#topicSelect'); clear(sel);
  for (const t of topicsRegistry){
    const o = document.createElement('option'); o.value=t.id; o.textContent=t.label; sel.appendChild(o);
  }
  currentTopicId = topicsRegistry[0]?.id || null; sel.value = currentTopicId || '';
}

/* ---------- On-screen keyboard & mobile suppression ---------- */
function insertAtCursor(input, text){
  // make input writable (temporarily) to update value without mobile keyboard
  const wasReadOnly = input.readOnly; input.readOnly = false;
  const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0,start) + text + input.value.slice(end);
  const pos = start + text.length; input.setSelectionRange(pos,pos); input.readOnly = wasReadOnly;
  input.focus({ preventScroll:true });
}
function wireKeyboard(){
  $$('#kbd [data-ins]').forEach(btn=> btn.addEventListener('click', ()=> insertAtCursor($('#answerInput'), btn.getAttribute('data-ins'))));
  $('#kbdBack').addEventListener('click', ()=>{
    const s=$('#answerInput'); const was=s.readOnly; s.readOnly=false; const st=s.selectionStart??s.value.length; if(st>0){ s.value=s.value.slice(0,st-1)+s.value.slice(st); s.setSelectionRange(st-1,st-1); } s.readOnly=was; s.focus({preventScroll:true});
  });
  $('#kbdClear').addEventListener('click', ()=>{ const s=$('#answerInput'); const was=s.readOnly; s.readOnly=false; s.value=''; s.readOnly=was; s.focus({preventScroll:true}); });
  $('#kbdEnter').addEventListener('click', checkAnswer);
  $('#kbdToggle').addEventListener('click', ()=>{
    const k=$('#kbd'); const open = k.classList.toggle('open'); $('#kbdToggle').setAttribute('aria-expanded', open?'true':'false');
  });
  // Prevent native keyboard on mobile by keeping input readonly; allow desktop typing via double-click to toggle
  const inp = $('#answerInput');
  inp.addEventListener('dblclick', ()=>{ inp.readOnly = !inp.readOnly; });
}

/* ---------- Difficulty toggle ---------- */
function renderDifficulty(){ $('#difficultyBtn').textContent = getDifficultyLabel(difficulty); }
function wireDifficulty(){
  $('#difficultyBtn').addEventListener('click', ()=>{
    difficulty = cycleDifficulty(difficulty);
    setDifficulty(difficulty);
    renderDifficulty();
    newQuestion();
  });
}

/* ---------- Init ---------- */
function init(){
  // year
  const y=$('#year'); if (y) y.textContent = new Date().getFullYear();

  // settings / theme
  const s = loadSettings(); applyTheme(s.theme); renderAvatarBG();

  // player + avatar
  renderAvatar();
  window.addEventListener('resize', renderAvatar, { passive:true });

  // xp & loot
  loadXP(); syncHUD();

  // topics & first question
  populateTopics(); renderDifficulty();
  $('#topicSelect').addEventListener('change', e=>{ currentTopicId = e.target.value; newQuestion(); });
  if (currentTopicId) newQuestion();

  // actions
  $('#checkBtn').addEventListener('click', checkAnswer);
  $('#nextBtn').addEventListener('click', ()=>{ xpState.streak=0; saveXP(); syncHUD(); newQuestion(); });

  // keyboard
  wireKeyboard();
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
