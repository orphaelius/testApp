import { topicsRegistry, findTopic, setDifficulty, getDifficultyLabel, cycleDifficulty } from './topics.js';

const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const clear = n=>{ if(!n) return; while(n.firstChild) n.removeChild(n.firstChild); };
async function typesetMath(el){ const mj = window.MathJax; if (mj?.typesetPromise) await mj.typesetPromise([el]); }

const DEFAULT_PLAYER = {
  name:'Player',
  avatarId:0,  
  asset:{ url:'assets/avatars/avatarA.gif', scale:3, offset:{x:0,y:0} } // <- your GIF
};

const DEFAULT_SETTINGS = { theme:'blue', tintStrength:0.25, pet:null };

function load(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; } }
function save(key, val){
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (e) { console.warn('[storage/save] failed for', key, e); }
}


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

/* ---------- Avatar & Pet Rendering ---------- 
function shapeClip(shape){
  return shape==='circle' ? 'circle(50% at 50% 50%)' :
         shape==='diamond'? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
         shape==='hex'    ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%)' :
         'inset(0 round 14%)';
}*/
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
  borderRadius:'14%', background:'transparent',
  position:'relative', display:'grid', placeItems:'center'
  // no clipPath
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
  // Support id or class on the loot container
  const host = document.querySelector(
    '#lootWindow, .lootWindow, #treasureWindow, .treasureWindow, #treasureIcon, .treasureIcon'
  );
  if (!host) { console.warn('[chest] host not found'); return; }

  Object.assign(host.style, { minWidth:'64px', minHeight:'64px', display:'grid', placeItems:'center' });
  while (host.firstChild) host.removeChild(host.firstChild);

  const img = new Image();
  img.alt = 'Treasure Chest';
  Object.assign(img.style, { width:'100%', height:'100%', objectFit:'contain', imageRendering:'pixelated' });

  // Try likely locations based on your repo layout
  const tries = [
    'TreasureChestDefault.png',            // same folder as the Loot page (/testApp/Loot/)
    'Loot/TreasureChestDefault.png',       // if page is outside Loot/
    'LootAssets/TreasureChestDefault.png', // if you moved assets
    'assets/Loot/TreasureChestDefault.png' // if stored under /testApp/assets/Loot/
  ];

  let i = 0;
  const tryNext = () => {
    if (i >= tries.length){
      console.error('[chest] All path candidates failed. Check exact path/case.');
      return;
    }
    const rel = tries[i++];
    const url = new URL(rel, document.baseURI).toString();
    console.log('[chest] trying', url);
    img.src = url;
  };

  img.addEventListener('load',  () => { console.log('[chest] OK', img.naturalWidth, img.naturalHeight, img.src); host.appendChild(img); });
  img.addEventListener('error', () => { console.warn('[chest] FAIL →', img.src); tryNext(); });

  tryNext();
}





   


/* ---------- XP / Level / Loot ---------- */
const xpState = { level:1, xp:0, streak:0, loot:0, get xpNeeded(){ return 100*this.level; } };
function loadXP(){ Object.assign(xpState, load('mq_xp', {level:1,xp:0,streak:0,loot:0})); }
function saveXP(){ save('mq_xp', {level:xpState.level, xp:xpState.xp, streak:xpState.streak, loot:xpState.loot}); }
function syncHUD(){
  $('#hudLevel')  && ($('#hudLevel').textContent  = xpState.level);
  $('#hudXP')     && ($('#hudXP').textContent     = xpState.xp);
  $('#lootCount') && ($('#lootCount').textContent = xpState.loot);
  updateXPBar();
  // If the old node exists, blank it (optional)
  const sv = $('#streakVal'); if (sv) sv.textContent = '';
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

/* ---------- Robust Subject → Topic Picker (with first-topic auto-select) ---------- */

const SUBJECT_ORDER = ['Arithmetic','Algebra','Calculus','Trigonometry','Geometry','General', 'CISSP'];

function getSubject(t){
  if (t?.subject && typeof t.subject === 'string'){
    const map = {
      arithmetic:'Arithmetic',
      algebra:'Algebra',
      calculus:'Calculus',
      trigonometry:'Trigonometry',
      trig:'Trigonometry',
      geometry:'Geometry',
      general:'General',
      cissp:'CISSP'
    };
    const key = t.subject.trim().toLowerCase();
    return map[key] || t.subject.trim();
  }
  return 'General';
}
function hasWorkingGenerator(t){
  const gen = t?.generateQuestion ?? t?.generate ?? t?.next;
  return typeof gen === 'function';
}
function buildSubjectsMap(){
  const m = new Map();
  for (const t of (Array.isArray(topicsRegistry) ? topicsRegistry : [])){
    if (!t) continue;
    const s = getSubject(t);
    if (!m.has(s)) m.set(s, []);
    m.get(s).push(t);
  }
  return m;
}
function sortSubjects(keys){
  return keys.sort((a,b)=>{
    const ia = SUBJECT_ORDER.indexOf(a), ib = SUBJECT_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function renderTopicPicker(){
  // clean any legacy "Choose a topic" label
  document.querySelectorAll('label[for="topicSelect"], #topicLabel, .topic-label')
    .forEach(n => { if (/choose a topic/i.test(n.textContent||'')) n.remove(); });

  const old = document.getElementById('topicSelect');
  let host = old?.parentElement
           || document.querySelector('#toolbar, .toolbar, .header')
           || document.body;

  const row  = document.createElement('div');
  row.className = 'topic-picker-row';
  const wrap = document.createElement('div');
  wrap.className = 'topic-picker';
  row.appendChild(wrap);

  const subjectSel = document.createElement('select');
  subjectSel.id = 'subjectSelect';
  subjectSel.className = 'select';
  subjectSel.setAttribute('aria-label','Subject');

  const topicSel = document.createElement('select');
  topicSel.id = 'topicSelect';
  topicSel.className = 'select';
  topicSel.setAttribute('aria-label','Topic');
  topicSel.disabled = true;
  topicSel.style.display = 'none';

  wrap.appendChild(subjectSel);
  wrap.appendChild(topicSel);

  if (old){ host.insertBefore(row, old); old.remove(); } else { host.appendChild(row); }

  const map = buildSubjectsMap();
  const subjects = sortSubjects([...map.keys()]);

  // build Subject options
  subjectSel.innerHTML = '';
  const subjPh = new Option('Select subject…','', true, false);
  subjPh.disabled = true;
  subjectSel.appendChild(subjPh);
  for (const s of subjects) subjectSel.appendChild(new Option(s, s));

  // populate topics for a subject; returns filtered list
  function populateTopicsFor(subject){
    const list = (map.get(subject) || []).filter(hasWorkingGenerator);
    topicSel.innerHTML = '';
    const ph = new Option('Select topic…','', true, false);
    ph.disabled = true;
    topicSel.appendChild(ph);
    for (const t of list){
      topicSel.appendChild(new Option(t.label || t.id, t.id));
    }
    if (list.length){
      topicSel.disabled = false;
      topicSel.style.display = '';
    } else {
      topicSel.disabled = true;
      topicSel.style.display = 'none';
      const pEl = document.getElementById('questionPrompt');
      if (pEl) pEl.textContent = `No available topics in “${subject}” yet.`;
    }
    return list;
  }

  // helper to commit a topic selection and render (defers one tick for iOS)
  function selectTopicAndRender(topicId){
    if (!topicId) return;
    topicSel.value = topicId;
    if (typeof currentTopicId !== 'undefined') currentTopicId = topicId;
    // defer a tick so layout/selection settles on mobile Safari
    setTimeout(()=> { if (typeof newQuestion === 'function') newQuestion(); }, 0);
  }

  // Subject change: populate topics, then auto-select the FIRST real topic
  subjectSel.addEventListener('change', e=>{
    const subj = e.target.value;
    const list = populateTopicsFor(subj);
    if (typeof currentTopicId !== 'undefined') currentTopicId = null;
    const pEl = document.getElementById('questionPrompt');
    if (pEl) pEl.textContent = '';

    // auto-pick first topic to avoid the "first click does nothing" quirk
    if (list.length){
      const firstId = list[0].id;
      selectTopicAndRender(firstId);
      try { localStorage.setItem('mq_topic_picker', JSON.stringify({subject: subj, topic: firstId})); } catch {}
    } else {
      try { localStorage.setItem('mq_topic_picker', JSON.stringify({subject: subj, topic: ''})); } catch {}
    }
  });

  // Topic selection: listen to both 'change' and 'input' for maximum reliability
  const onTopicPick = (e)=>{
    const topicId = e.target.value;
    if (!topicId) return;
    if (typeof currentTopicId !== 'undefined') currentTopicId = topicId;
    try {
      const subj = subjectSel.value || '';
      localStorage.setItem('mq_topic_picker', JSON.stringify({subject: subj, topic: topicId}));
    } catch {}
    selectTopicAndRender(topicId);
  };
  topicSel.addEventListener('change', onTopicPick);
  topicSel.addEventListener('input',  onTopicPick);

  // Restore last selection (if valid); otherwise leave subject placeholder
  let last = null;
  try { last = JSON.parse(localStorage.getItem('mq_topic_picker') || 'null'); } catch {}
  if (last?.subject && map.has(last.subject)){
    subjectSel.value = last.subject;
    const list = populateTopicsFor(last.subject);
    const valid = last.topic && list.some(t=>t.id===last.topic);
    selectTopicAndRender(valid ? last.topic : (list[0]?.id || ''));
    try { localStorage.setItem('mq_topic_picker', JSON.stringify({
      subject: last.subject,
      topic: valid ? last.topic : (list[0]?.id || '')
    })); } catch {}
  }
}




/* ---------- Topics & Difficulty ---------- */
let currentTopicId = null, currentQ = null;
let difficulty = 'easy';

async function newQuestion(){
  const topic = findTopic(currentTopicId);
  if (!topic || !topic.generateQuestion) return;

  const maybe = topic.generateQuestion(difficulty);
  currentQ = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;

  const p = document.querySelector('#questionPrompt');
  if (p && currentQ?.prompt != null) {
    p.textContent = currentQ.prompt;
    await typesetMath(p); // safe if not math too
  }

  const ai = document.querySelector('#answerInput');
  if (ai) ai.value = '';
  const fb = document.querySelector('#feedback');
  if (fb){ fb.className='feedback'; fb.textContent=''; }
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

/*
function populateTopics(){
  const sel = $('#topicSelect'); clear(sel);
  for (const t of topicsRegistry){
    const o = document.createElement('option'); o.value=t.id; o.textContent=t.label; sel.appendChild(o);
  }
  currentTopicId = topicsRegistry[0]?.id || null; sel.value = currentTopicId || '';
}*/

/* ---------- On-screen keyboard & mobile suppression ---------- */

function setOnscreenKeyboard(on){
  const kbd = $('#kbd');
  const toggle = $('#kbdToggle');
  const inp = $('#answerInput');
  if (!kbd || !toggle || !inp) return;

  if (on){
    // Show on-screen keyboard; hide device keyboard
    kbd.removeAttribute('hidden');
    kbd.classList.add('open');
    toggle.setAttribute('aria-expanded','true');

    // Suppress device keyboard
    inp.setAttribute('inputmode','none');   // mobile-friendly
    inp.readOnly = true;                    // desktop friendly
    // Keep focus on input so inserts go where the cursor is
    inp.focus({ preventScroll: true });
  } else {
    // Hide on-screen keyboard; enable device keyboard
    kbd.classList.remove('open');
    kbd.setAttribute('hidden','');
    toggle.setAttribute('aria-expanded','false');

    // Re-enable device keyboard
    inp.removeAttribute('inputmode');
    inp.readOnly = false;
    // Focusing will pop the device keyboard on mobile
    inp.focus({ preventScroll: true });
  }
  // Persist user preference (optional)
  save('kbd_mode', { onscreen: on });
}

function toggleKeyboard(){
  const kbd = $('#kbd');
  const on = !(kbd?.classList.contains('open')); // will open if currently closed
  setOnscreenKeyboard(on);
}

function insertAtCursor(input, text){
  const wasReadOnly = input.readOnly; input.readOnly = false;
  const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0,start) + text + input.value.slice(end);
  const pos = start + text.length; input.setSelectionRange(pos,pos); input.readOnly = wasReadOnly;
  input.focus({ preventScroll:true });
}
function wireKeyboard(){
  // on-screen key inserts
  $$('#kbd [data-ins]').forEach(btn => {
    btn.addEventListener('click', () => insertAtCursor($('#answerInput'), btn.getAttribute('data-ins')));
  });

  const back  = $('#kbdBack');
  const clr   = $('#kbdClear');
  const enter = $('#kbdEnter');
  const inp   = $('#answerInput');
  const toggle= $('#kbdToggle');

  if (back)  back.addEventListener('click', ()=>{
    const s = $('#answerInput'); if (!s) return;
    const was = s.readOnly; s.readOnly=false;
    const st = s.selectionStart ?? s.value.length;
    if (st>0){ s.value = s.value.slice(0,st-1)+s.value.slice(st); s.setSelectionRange(st-1,st-1); }
    s.readOnly = was; s.focus({preventScroll:true});
  });

  if (clr)   clr.addEventListener('click', ()=>{
    const s = $('#answerInput'); if (!s) return;
    const was = s.readOnly; s.readOnly=false; s.value=''; s.readOnly=was; s.focus({preventScroll:true});
  });

  if (enter) enter.addEventListener('click', checkAnswer);
  /*
  if (toggle){
    toggle.addEventListener('click', ()=>{
      const k = $('#kbd'); if (!k) return;
      const open = k.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }*/

  if (inp) inp.addEventListener('dblclick', ()=>{ inp.readOnly = !inp.readOnly; });
}

function attachPressGlow(root = document){
  // Pick which buttons get the glow:
  const targets = [
    ...root.querySelectorAll('.btn'),
    ...root.querySelectorAll('#kbd button'),     // keyboard keys
    ...root.querySelectorAll('#kbdToggle'),      // toggle itself
  ];

  for (const el of targets){
    el.classList.add('press-glow');

    // Avoid duplicate listeners
    if (el.dataset.glowWired === '1') continue;
    el.dataset.glowWired = '1';

    const add = () => {
      el.classList.add('is-pressing');
      // Remove when animation ends OR after a timeout fallback
      const cleanup = () => el.classList.remove('is-pressing');
      el.addEventListener('animationend', cleanup, { once:true });
      setTimeout(cleanup, 500); // fallback
    };

    // Pointer-friendly for mouse + touch
    el.addEventListener('pointerdown', add);
    // Keyboard accessibility
    el.addEventListener('keydown', (e)=> {
      if (e.key === ' ' || e.key === 'Enter') add();
    });
  }
}

// REBINDING KEYBOARD TOGGLE 
function bindKbdToggle(){
  const toggle = $('#kbdToggle');
  const kbd = $('#kbd');
  if (!toggle || !kbd) return;
  if (toggle.dataset.wired === '1') return;

  toggle.dataset.wired = '1';
  try { toggle.type = 'button'; } catch {}

  toggle.addEventListener('click', toggleKeyboard);

  // Restore last mode
  const last = load('kbd_mode', { onscreen: false });
  setOnscreenKeyboard(!!last.onscreen);
}



function watchForKeyboardToggle(){
  // Re-attempt binding whenever DOM changes (e.g., toolbar injected later)
  const mo = new MutationObserver(bindKbdToggle);
  mo.observe(document.body, { childList:true, subtree:true });

  // Also retry when tab becomes visible (fixes restore-from-bfcache cases)
  document.addEventListener('visibilitychange', bindKbdToggle);
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
    // topics
  // populateTopics();  // <- remove old call
  renderTopicPicker();  // <- new two-step picker
  // NOTE: newQuestion() is called when a topic is picked.
  renderDifficulty();
  $('#topicSelect').addEventListener('change', e=>{ currentTopicId = e.target.value; newQuestion(); });
  if (currentTopicId) newQuestion();

  // actions
  $('#checkBtn').addEventListener('click', checkAnswer);
  $('#nextBtn').addEventListener('click', ()=>{ xpState.streak=0; saveXP(); syncHUD(); newQuestion(); });

  // keyboard + difficulty
  wireKeyboard(); wireDifficulty();
  bindKbdToggle();
  new MutationObserver(bindKbdToggle).observe(document.body, {childList:true, subtree:true});
  // attach glow after UI exists
  attachPressGlow();      
  watchForKeyboardToggle(); 
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
