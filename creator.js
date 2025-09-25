const DEFAULT_PLAYER = { name:'Player', avatarId:0, shape:'rounded', color:'#6aa6ff', asset:null };

function loadPlayer(){ try{ return JSON.parse(localStorage.getItem('mq_player')) || { ...DEFAULT_PLAYER }; }catch{ return { ...DEFAULT_PLAYER }; } }
function savePlayer(p){ localStorage.setItem('mq_player', JSON.stringify(p)); }

/* Reusable avatar renderer (mirror of app.js but used for preview) */
function renderAvatarInto(el, p, size=200){
  el.innerHTML = '';
  const shapeClip =
    p.shape === 'circle' ? 'circle(50% at 50% 50%)' :
    p.shape === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
    p.shape === 'hex' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' :
    'inset(0 round 14%)';

  // Custom asset?
  if (p.asset && p.asset.url){
    const container = document.createElement('div');
    Object.assign(container.style, {
      width:size+'px', height:size+'px', clipPath:shapeClip, borderRadius:'14%', background:'#101425',
      position:'relative', display:'grid', placeItems:'center'
    });
    container.classList.add('block-glow');

    const scale = (typeof p.asset.scale === 'number' ? p.asset.scale : 1);
    const off = p.asset.offset || {x:0,y:0};

    if (p.asset.type === 'sprite'){
      const cols = Math.max(1, p.asset.cols || 6);
      const fps = Math.max(1, p.asset.fps || 8);
      const frameSize = 64;
      const el2 = document.createElement('div');
      el2.style.width = Math.round(frameSize * scale)+'px';
      el2.style.height = Math.round(frameSize * scale)+'px';
      el2.style.backgroundImage = `url(${p.asset.url})`;
      el2.style.backgroundRepeat = 'no-repeat';
      el2.style.backgroundSize = `${cols*frameSize}px ${frameSize}px`;
      el2.style.transform = `translate(${off.x||0}px, ${off.y||0}px)`;
      const animName = `sprite-prev-${cols}-${fps}-${Math.random().toString(36).slice(2)}`;
      const style = document.createElement('style');
      style.textContent = `@keyframes ${animName}{from{background-position-x:0px}to{background-position-x:-${cols*frameSize}px}}`;
      document.head.appendChild(style);
      el2.style.animation = `${animName} ${(cols/fps).toFixed(4)}s steps(${cols}) infinite`;
      container.appendChild(el2);
    } else {
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

    const border = document.createElement('div');
    Object.assign(border.style, { position:'absolute', inset:'6px', border:'2px solid #223055', borderRadius:'12px', pointerEvents:'none' });
    container.appendChild(border);
    el.appendChild(container);
    return;
  }

  // Otherwise block avatar
  const svgNS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 64 64'); svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.style.clipPath = shapeClip; svg.style.background='#101425'; svg.style.borderRadius='14%';

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

  const presets=[
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
  el.appendChild(svg);
}

/* ---- DOM refs ---- */
const form = document.getElementById('creatorForm');
const preview = document.getElementById('creatorPreview');
const avatarGrid = document.getElementById('avatarGrid');
const shapeSel = document.getElementById('shape');
const nameInput = document.getElementById('name');
const fileInput = document.getElementById('fileInput');
const assetTypeSel = document.getElementById('assetType');
const spriteOptions = document.getElementById('spriteOptions');
const colsInput = document.getElementById('cols');
const fpsInput = document.getElementById('fps');
const scaleInput = document.getElementById('scale');
const offxInput = document.getElementById('offx');
const offyInput = document.getElementById('offy');

let state = loadPlayer();

/* ---- build preset grid ---- */
function buildAvatarGrid(){
  for (let i=0;i<10;i++){
    const card = document.createElement('label');
    card.className = 'avatar-card';
    const thumb = document.createElement('div'); thumb.style.width='100px'; thumb.style.height='100px';
    renderAvatarInto(thumb, { ...state, asset:null, avatarId:i }, 100);
    const radio = document.createElement('input'); radio.type='radio'; radio.name='avatarId'; radio.value=String(i);
    card.appendChild(thumb); card.appendChild(radio);
    if (i===state.avatarId && !state.asset) card.classList.add('active');
    card.addEventListener('click', ()=>{
      state.avatarId = i; state.asset = state.asset || null; // keep asset if set; selecting preset won't erase unless no asset yet
      document.querySelectorAll('.avatar-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active'); refresh();
    });
    avatarGrid.appendChild(card);
  }
}

/* ---- swatches ---- */
function wireSwatches(){
  document.querySelectorAll('.swatch').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.color = btn.getAttribute('data-color') || state.color;
      refresh();
    });
  });
}

/* ---- file handling ---- */
function detectTypeFromFile(file, override){
  if (override && override !== 'auto') return override;
  const ext = (file.name.split('.').pop()||'').toLowerCase();
  if (file.type === 'image/gif' || ext === 'gif') return 'gif';
  return 'image'; // default; user can switch to 'sprite' if it's a strip
}

function readFileAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = ()=> resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

fileInput.addEventListener('change', async ()=>{
  const file = fileInput.files?.[0];
  if (!file) return;
  const chosen = assetTypeSel.value;
  const type = detectTypeFromFile(file, chosen);
  const url = await readFileAsDataURL(file); // Data URL keeps it same-origin and persistent
  const scale = parseFloat(scaleInput.value)||1;
  const offx = parseInt(offxInput.value||'0',10);
  const offy = parseInt(offyInput.value||'0',10);

  const asset = { type, url, scale, offset:{x:offx,y:offy} };
  if (type === 'sprite'){
    asset.cols = Math.max(1, parseInt(colsInput.value||'6',10));
    asset.fps  = Math.max(1, parseInt(fpsInput.value||'8',10));
  }

  state.asset = asset;
  refresh();
});

assetTypeSel.addEventListener('change', ()=>{
  const v = assetTypeSel.value;
  spriteOptions.style.display = (v === 'sprite') ? 'grid' : 'none';
  // update existing asset type if present
  if (state.asset) state.asset.type = (v==='auto') ? state.asset.type : v;
  refresh();
});

[scaleInput, offxInput, offyInput, colsInput, fpsInput].forEach(inp=>{
  inp.addEventListener('input', ()=>{
    const scale = parseFloat(scaleInput.value)||1, offx = parseInt(offxInput.value||'0',10), offy = parseInt(offyInput.value||'0',10);
    if (!state.asset) state.asset = { type:'image', url:'', scale:1, offset:{x:0,y:0} };
    state.asset.scale = scale; state.asset.offset = {x:offx,y:offy};
    if (state.asset.type === 'sprite'){
      state.asset.cols = Math.max(1, parseInt(colsInput.value||'6',10));
      state.asset.fps  = Math.max(1, parseInt(fpsInput.value||'8',10));
    }
    refresh();
  });
});

/* ---- preview + form wiring ---- */
function refresh(){
  // reflect controls
  nameInput.value = state.name || '';
  shapeSel.value = state.shape || 'rounded';
  scaleInput.value = state.asset?.scale ?? 1;
  offxInput.value = state.asset?.offset?.x ?? 0;
  offyInput.value = state.asset?.offset?.y ?? 0;
  assetTypeSel.value = state.asset?.type || 'auto';
  spriteOptions.style.display = (state.asset?.type === 'sprite') ? 'grid' : 'none';
  if (state.asset?.type === 'sprite'){
    colsInput.value = state.asset.cols || 6;
    fpsInput.value  = state.asset.fps || 8;
  }
  renderAvatarInto(preview, state, 200);
}

function init(){
  // prefill
  nameInput.value = state.name || '';
  shapeSel.value = state.shape || 'rounded';
  buildAvatarGrid(); wireSwatches(); refresh();

  shapeSel.addEventListener('change', e=>{ state.shape = e.target.value; refresh(); });
  form.addEventListener('submit', e=>{
    e.preventDefault();
    state.name = (nameInput.value || 'Player').trim();
    savePlayer(state);
    window.location.href = './index.html';
  });
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
