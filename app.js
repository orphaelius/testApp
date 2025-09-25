// app.js
import { topicsRegistry, findTopic } from './topics.js';

/* ---------- helpers ---------- */
const $ = (q)=> document.querySelector(q);
const $all = (q)=> Array.from(document.querySelectorAll(q));
const clear = (node)=> { if (!node) return; while(node.firstChild) node.removeChild(node.firstChild); };
async function typesetMath(rootEl){ const mj = window.MathJax; if (!mj?.typesetPromise) return; await mj.typesetPromise([rootEl]); }

/* ---------- Theme ---------- */
const DEFAULT_THEME = 'blue';
function loadTheme(){ try { return localStorage.getItem('mq_theme') || DEFAULT_THEME; } catch { return DEFAULT_THEME; } }
function saveTheme(t){ localStorage.setItem('mq_theme', t); }
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); const s=$('#themeSelect'); if (s) s.value = t; }

/* ---------- Player & Avatar Rendering ---------- */
const DEFAULT_PLAYER = { name:'Player', avatarId:0, shape:'rounded', color:'#6aa6ff', asset:null };
function loadPlayer(){ try{ return JSON.parse(localStorage.getItem('mq_player')) || { ...DEFAULT_PLAYER }; }catch{ return { ...DEFAULT_PLAYER }; } }
function savePlayer(p){ localStorage.setItem('mq_player', JSON.stringify(p)); }

/**
 * Render avatar into #pixelCharContainer.
 * Supports:
 *  - Block presets (10 layouts)
 *  - asset.type === 'image' | 'gif' (img element; GIF animates natively)
 *  - asset.type === 'sprite' (sprite-sheet strip; cols+fps)
 * p.asset = { type:'gif'|'image'|'sprite', url:string, scale:number, offset:{x,y}, cols?:number, fps?:number }
 */
function renderAvatar(p){
  const wrap = $('#pixelCharContainer'); if (!wrap) return;
  clear(wrap);

  const bbox = wrap.getBoundingClientRect();
  const size = Math.min(bbox.width, bbox.height) || 240;

  const shapeClip =
    p.shape === 'circle' ? 'circle(50% at 50% 50%)' :
    p.shape === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
    p.shape === 'hex' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' :
    'inset(0 round 14%)';

  // If custom asset provided
  if (p.asset && p.asset.url){
    const container = document.createElement('div');
    container.style.width = size+'px'; container.style.height = size+'px';
    container.style.clipPath = shapeClip; container.style.borderRadius = '14%';
    container.style.background = '#101425'; container.style.position = 'relative';
    container.style.display = 'grid'; container.style.placeItems = 'center';
    container.classList.add('block-glow');

    const scale = (typeof p.asset.scale === 'number' ? p.asset.scale : 1);
    const off = p.asset.offset || {x:0,y:0};

    if (p.asset.type === 'sprite'){
      // CSS steps animation from a sprite strip
      const cols = Math.max(1, p.asset.cols || 6);
      const fps = Math.max(1, p.asset.fps || 8);
      const frameSize = 64; // logical frame size
      const el = document.createElement('div');
      el.style.width = Math.round(frameSize * scale) + 'px';
      el.style.height = Math.round(frameSize * scale) + 'px';
      el.style.backgroundImage = `url(${p.asset.url})`;
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundSize = `${cols*frameSize}px ${frameSize}px`;
      el.style.transform = `translate(${off.x||0}px, ${off.y||0}px)`;
      const animName = `sprite-${cols}-${fps}-${Math.random().toString(36).slice(2)}`;
      const style = document.createElement('style');
      style.textContent = `
        @keyframes ${animName} {
          from { background-position-x: 0px; }
          to   { background-position-x: -${cols*frameSize}px; }
        }`;
      document.head.appendChild(style);
      el.style.animation = `${animName} ${(cols/fps).toFixed(4)}s steps(${cols}) infinite`;
      container.appendChild(el);
    } else {
      // gif/image: use <img> (GIF animates automatically; transparency preserved)
      const img = document.createElement('img');
      img.src = p.asset.url;
      img.alt = 'avatar';
      img.style.width = Math.round(64*scale)+'px';
      img.style.height = Math.round(64*scale)+'px';
      img.style.objectFit = 'contain';
      img.style.imageRendering = 'pixelated';
      img.style.transform = `translate(${off.x||0}px, ${off.y||0}px)`;
      container.appendChild(img);
    }

    // border
    const border = document.createElement('div');
    Object.assign(border.style, {
      position:'absolute', inset:'4px', border:'2px solid #223055', borderRadius:'12px', pointerEvents:'none'
    });
    container.appendChild(border);

    wrap.appendChild(container);
    return;
  }

  // Otherwise draw abstract block avatar (SVG)
  const svgNS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 64 64');
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.style.clipPath = shapeClip; svg.style.background = '#101425'; svg.style.borderRadius='14%';

  const defs=document.createElementNS(svgNS,'defs');
  const glow=document.createElementNS(svgNS,'filter'); glow.setAttribute('id','glow');
  glow.innerHTML=`<feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`;
  defs.appendChild(glow); svg.appendChild(defs);

  const borderRect=document.createElementNS(svgNS,'rect');
  borderRect.setAttribute('x',1); borderRect.setAttribute('y',1);
  borderRect.setAttribute('width',62); borderRect.setAttribute('height',62);
  borderRect.setAttribute('rx',10); borderRect.setAttribute('fill','none');
  borderRect.setAttribute('stroke','#223055'); borderRect.setAttribute('stroke-width',2);
  svg.appendChild(borderRect);

  const presets = [
    [[1,1],[2,1],[1,2],[2,2],[1,3],[2,3]], [[0,1],[1,1],[2,1],[1,2],[1,3]],
    [[0,0],[3,0],[1,1],[2,1],[1,2],[2,2],[0,3],[3,3]], [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2],[1,3],[2,3]],
    [[0,0],[1,1],[2,2],[3,3],[3,0],[2,1],[1,2],[0,3]], [[1,0],[2,0],[0,2],[1,2],[2,2],[3,2]],
    [[0,1],[3,1],[1,2],[2,2],[1,3],[2,3]], [[1,1],[2,1],[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[2,0],[1,1],[2,1],[1,2],[2,2]], [[0,0],[3,0],[0,3],[3,3],[1,1],[2,2]],
  ];
  const cells = presets[p.avatarId % presets.length];
  const cellSize = 14, pad = 6;

  cells.forEach(([cx,cy])=>{
    const r=document.createElementNS(svgNS,'rect');
    r.setAttribute('x', pad + cx*cellSize);
    r.setAttribute('y', pad + cy*cellSize);
    r.setAttribute('width', cellSize); r.setAttribute('height', cellSize); r.setAttribute('rx',3);
    r.setAttribute('fill', p.color); r.setAttribute('filter', 'url(#glow)');
    svg.appendChild(r);
  });

  svg.classList.add('block-glow');
  wrap.appendChild(svg);
}

/* ---------- XP / Level / Streak ---------- */
const xpState = { level:1, xp:0, streak:0, get xpNeeded(){ return 100*this.level; } };
function loadXP(){ try{ Object.assign(xpState, JSON.parse(localStorage.getItem('mq_xp')||'{}')); }catch{} }
function saveXP(){ localStorage.setItem('mq_xp', JSON.stringify({level:xpState.level, xp:xpState.xp, streak:xpState.streak})); }
function renderHUD(){
  $('#hudLevel').textContent = xpState.level; $('#hudXP').textContent = xpState.xp; $('#streakVal').textContent = xpState.streak;
  const pct = Math.max(0, Math.min(100, Math.round(xpState.x/xpState.xpNeeded*100)));
}
Object.defineProperty(xpState,'x',{ get(){return this.xp;}, set(v){ this.xp=v; } }); // helper for expression above
function updateXPBar(){ const pct = Math.max(0, Math.min(100, Math.round(xpState.xp/xpState.xpNeeded*100))); $('#xpBar').style.width = pct + '%'; }
function spawnXPFloat(amount){
  const tpl = $('#xpFloatTpl'); const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('span').textContent = amount;
  const host = $('#feedback'); host.style.position = 'relative'; host.appendChild(node);
  setTimeout(()=> node.remove(), 1650);
}
function awardXP(base=15){
  const bonus = Math.min(xpState.streak*5, 25);
  let remaining = base + bonus;
  spawnXPFloat(remaining);
  while(remaining>0){
    const need = xpState.xpNeeded - xpState.xp;
    const take = Math.min(need, remaining);
    xpState.xp += take; remaining -= take;
    if (xpState.xp >= xpState.xpNeeded){ xpState.level += 1; xpState.xp = 0; }
  }
  saveXP(); renderHUD(); updateXPBar();
}

/* ---------- Topics / Questions ---------- */
let currentTopicId = null, currentQ = null;
const els = {};
function cacheEls(){
  els.topicSelect    = $('#topicSelect');
  els.questionPrompt = $('#questionPrompt');
  els.answerInput    = $('#answerInput');
  els.feedback       = $('#feedback');
  els.checkBtn       = $('#checkBtn');
  els.nextBtn        = $('#nextBtn');
  els.kbd            = $('#kbd');
  els.kbdToggle      = $('#kbdToggle');
  els.themeSelect    = $('#themeSelect');
}
function populateTopics(){
  clear(els.topicSelect);
  topicsRegistry.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = t.label;
    els.topicSelect.appendChild(opt);
  });
  currentTopicId = topicsRegistry[0]?.id || null;
  els.topicSelect.value = currentTopicId || '';
}
async function newQuestion(){
  const topic = findTopic(currentTopicId); if (!topic) return;
  currentQ = topic.generateQuestion();
  els.questionPrompt.textContent = currentQ.prompt;
  await typesetMath(els.questionPrompt);
  els.answerInput.value = ''; els.feedback.className = 'feedback'; els.feedback.textContent = '';
  els.answerInput.placeholder =
    currentQ.answerFormat==='number' ? 'Enter a number (fractions ok: -7/2)'
    : currentQ.answerFormat==='line' ? 'Enter a line: y = mx + b'
    : 'Enter your answer (e.g., DNE, ∞, -∞, y=0)';
  els.answerInput.focus();
}
function parseResult(res){ return (typeof res === 'boolean') ? { correct: res } : res; }
function checkAnswer(){
  const topic = findTopic(currentTopicId); if (!topic || !currentQ) return;
  const result = parseResult(topic.checkAnswer(els.answerInput.value.trim(), currentQ));
  if (result.correct){
    els.feedback.className = 'feedback ok'; els.feedback.textContent = 'Correct!';
    xpState.streak += 1; awardXP(15);
    setTimeout(()=> newQuestion(), 500);
  } else {
    els.feedback.className = 'feedback bad'; els.feedback.textContent = result.feedback || 'Try again.';
    xpState.streak = 0; renderHUD(); updateXPBar(); saveXP();
  }
}

/* ---------- Keyboard ---------- */
function insertAtCursor(input, text){
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0,start) + text + input.value.slice(end);
  const pos = start + text.length; input.setSelectionRange(pos,pos); input.focus();
}
function wireKeyboard(){
  $all('#kbd [data-ins]').forEach(btn=>{
    btn.addEventListener('click', ()=> insertAtCursor(els.answerInput, btn.getAttribute('data-ins')));
  });
  $('#kbdBack').addEventListener('click', ()=>{
    const s = els.answerInput; const start = s.selectionStart ?? s.value.length;
    if (start>0){ s.value = s.value.slice(0,start-1)+s.value.slice(start); s.setSelectionRange(start-1,start-1); }
    s.focus();
  });
  $('#kbdClear').addEventListener('click', ()=>{ els.answerInput.value=''; els.answerInput.focus(); });
  $('#kbdEnter').addEventListener('click', checkAnswer);
  els.kbdToggle.addEventListener('click', ()=>{
    const open = els.kbd.classList.toggle('open');
    els.kbdToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

/* ---------- Init ---------- */
function init(){
  cacheEls();

  // Theme
  applyTheme(loadTheme());
  els.themeSelect.addEventListener('change', e=>{ applyTheme(e.target.value); saveTheme(e.target.value); });

  // Player
  const player = loadPlayer();
  $('#hudPlayerName').textContent = player.name || DEFAULT_PLAYER.name;
  renderAvatar(player);
  // Re-render avatar on resize to maintain crisp centering/scaling
  window.addEventListener('resize', ()=> renderAvatar(loadPlayer()), { passive:true });

  // XP HUD
  loadXP(); renderHUD(); updateXPBar();

  // Topics
  populateTopics();
  els.topicSelect.addEventListener('change', e=>{ currentTopicId = e.target.value; newQuestion(); });
  if (currentTopicId) newQuestion();

  // Actions
  els.checkBtn.addEventListener('click', checkAnswer);
  els.nextBtn.addEventListener('click', ()=>{ xpState.streak = 0; renderHUD(); updateXPBar(); newQuestion(); });

  // Keyboard
  wireKeyboard();
}

if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
