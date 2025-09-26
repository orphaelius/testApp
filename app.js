import { topicsRegistry, findTopic, setDifficulty, getDifficultyLabel, cycleDifficulty } from './topics.js';

const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const clear = n=>{ if(!n) return; while(n.firstChild) n.removeChild(n.firstChild); };
async function typesetMath(el){ const mj = window.MathJax; if (mj?.typesetPromise) await mj.typesetPromise([el]); }

const DEFAULT_PLAYER = {
  name:'Player',
  avatarId:0,
  shape:'rounded',
  color:'#6aa6ff',
  asset:{ url:'assets/avatars/avatarA.gif', scale:3, offset:{x:0,y:0} } // <- your GIF
};

const DEFAULT_SETTINGS = { theme:'blue', tintStrength:0.25, pet:null };

function load(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; } }
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function loadPlayer(){ return load('mq_player', DEFAULT_PLAYER); }
function normalizePlayer(p){
  // If an avatar is selected but scale is missing/old (<= 2.5), bump to 3×
  if (p && p.asset && p.asset.url) {
    if (typeof p.asset.scale !== 'number' || p.asset.scale <= 2.5) {
      p.asset.scale = 3;
      save('mq_player', p); // persist the migration
    }
  }
  return p;
}
function loadSettings(){ return load('asym_settings', DEFAULT_SETTINGS); }
function applyTheme(theme){ document.documentElement.setAttribute('data-theme', theme); }
function resolveURL(urlLike){ try{ return new URL(urlLike, document.baseURI).toString(); }catch{ return urlLike; } }

/* ---------- Avatar & Pet Rendering ---------- */
function shapeClip(shape){
  return shape==='circle' ? 'circle(50% at 50% 50%)' :
         shape==='diamond'? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
         shape==='hex'    ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%)' :
         'inset(0 round 14%)';
}
function renderAvatarBG(){
  const settings = loadSettings();
  const bg = $('#avatarBG');
  if (!bg) return;
  bg.style.background = `color-mix(in srgb, var(--avatar-tint) ${(settings.tintStrength*100)|0}%, transparent)`;
}
function renderAvatar(){
  const p = loadPlayer();  // no migration logic
  const nameNode = $('#hudPlayerName');
  if (nameNode) nameNode.textContent = p?.name || DEFAULT_PLAYER.name;

  const wrap = $('#pixelCharContainer'); if (!wrap) return;
  clear(wrap);

  const bbox = wrap.getBoundingClientRect();
  const size = Math.min(bbox.width || 0, bbox.height || 0) || 180;

  const container = document.createElement('div');
  Object.assign(container.style, {
    width:size+'px', height:size+'px',
    clipPath:shapeClip(p?.shape || 'rounded'),
    borderRadius:'14%', background:'transparent',
    position:'relative', display:'grid', placeItems:'center'
  });

  if (p?.asset?.url){
    const scale = (typeof p.asset.scale === 'number') ? p.asset.scale : 3;
    const off = p.asset.offset || {x:0,y:0};
    const img = document.createElement('img');
    img.src = resolveURL(p.asset.url);
    img.alt = 'avatar';
    img.style.width  = Math.round(64*scale)+'px';
    img.style.height = Math.round(64*scale)+'px';
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'pixelated';
    img.style.transform = `translate(${off.x||0}px, ${off.y||0}px)`;
    container.appendChild(img);
  } else {
    // No fallback; nothing rendered if no GIF set
  }

  wrap.appendChild(container);

  // Keep your existing pet/background behavior if you want
  renderAvatarBG();
  const pet = loadSettings().pet;
  const petStage = $('#petStage');
  if (petStage){
    clear(petStage);
    if (pet?.url){
      const img = document.createElement('img');
      img.src = resolveURL(pet.url); img.alt='pet';
      img.style.width='100%'; img.style.height='100%';
      img.style.objectFit='contain'; img.style.imageRendering='pixelated';
      petStage.appendChild(img);
      petStage.classList.add('on');
    } else {
      petStage.classList.remove('on');
    }
  }
}

function renderChestTest(){
  const host = document.querySelector('#treasureWindow, #lootWindow, #treasureIcon'); // pick the right id/class
  if (!host) { console.warn('Treasure host not found'); return; }
  // Give the window a visible box while testing
  Object.assign(host.style, { minWidth:'64px', minHeight:'64px', display:'grid', placeItems:'center' });

  // Clear and inject the image
  while (host.firstChild) host.removeChild(host.firstChild);
  const img = new Image();
  img.src = resolveURL('assets/Loot/TreasureChestDefault.png'); // <- adjust to your exact path & case
  img.alt = 'Treasure Chest';
  Object.assign(img.style, { width:'100%', height:'100%', objectFit:'contain', imageRendering:'pixelated' });

  img.addEventListener('load', () => console.log('[chest] OK', img.naturalWidth, img.naturalHeight, img.src));
  img.addEventListener('error', () => console.error('[chest] load FAIL → check path/case:', img.src));

  host.appendChild(img);
}
renderChestTest();


   


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
  const gained = newLevel - oldLevel;
  let loot = gained; // +1 each level
  for (let L=oldLevel+1; L<=newLevel; L++){ if (L%10===0) loot += 2; } // +2 extra at multiples of 10 (total 3)
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
    const step = Math.max(1, Math.round(amountTotal/20));
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
let difficulty = 'easy';

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
  // Prevent native keyboard on mobile (input stays readonly; desktop can dbl-click to toggle)
  const inp = $('#answerInput'); inp.addEventListener('dblclick', ()=>{ inp.readOnly = !inp.readOnly; });
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
  const y=$('#year'); if (y) y.textContent = new Date().getFullYear();

  // theme & avatar BG tint
  const s = loadSettings(); applyTheme(s.theme); renderAvatarBG();

  // avatar & pet
  renderAvatar();
  window.addEventListener('resize', renderAvatar, { passive:true });

  // xp & loot
  loadXP(); syncHUD();

  // topics
  populateTopics(); renderDifficulty();
  $('#topicSelect').addEventListener('change', e=>{ currentTopicId = e.target.value; newQuestion(); });
  if (currentTopicId) newQuestion();

  // actions
  $('#checkBtn').addEventListener('click', checkAnswer);
  $('#nextBtn').addEventListener('click', ()=>{ xpState.streak=0; saveXP(); syncHUD(); newQuestion(); });

  // keyboard + difficulty
  wireKeyboard(); wireDifficulty();
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
