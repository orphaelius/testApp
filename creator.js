const DEFAULT_PLAYER = { name:'Player', avatarId:0, shape:'rounded', color:'#6aa6ff', asset:null };

/* ====== CONFIG: your assets live here ====== */
/* You said: testApp/CharacterAssets with files: Model1.gif, Model2.gif, Model3.gif */
const ASSET_FOLDER = './CharacterAssets/';
const ASSET_LIST   = ['Model1.gif','Model2.gif','Model3.gif'];
const USE_MANIFEST = false;   // set true only if you add manifest.json in that folder
const SHOW_UPLOAD  = true;    // set to false to hide the local upload UI entirely
/* =========================================== */

function loadPlayer(){ try{ return JSON.parse(localStorage.getItem('mq_player')) || { ...DEFAULT_PLAYER }; }catch{ return { ...DEFAULT_PLAYER }; } }
function savePlayer(p){ localStorage.setItem('mq_player', JSON.stringify(p)); }

/* Render avatar preview (supports presets, image/gif, and sprite strip) */
function renderAvatarInto(el, p, size=200){
  el.innerHTML = '';
  const shapeClip =
    p.shape === 'circle' ? 'circle(50% at 50% 50%)' :
    p.shape === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
    p.shape === 'hex' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' :
    'inset(0 round 14%)';

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
      img.src = p.asset.url; img.alt = 'avatar';
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

  // Block avatar (fallback/preset)
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
  const cells = presets[(p.avatarId||0) % presets.length];
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
const assetGrid  = document.getElementById('assetGrid');
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
const uploadRow  = document.getElementById('uploadRow');

let state = loadPlayer();

/* ---- presets grid ---- */
function buildAvatarGrid(){
  for (let i=0;i<10;i++){
    const card = document.createElement('label');
    card.className = 'avatar-card';
    const thumb = document.createElement('div'); thumb.style.width='100px'; thumb.style.height='100px';
    renderAvatarInto(thumb, { ...state, asset:null, avatarId:i }, 100);
    card.appendChild(thumb);
    const btn = document.createElement('button'); btn.type='button'; btn.className='btn small'; btn.textContent='Use preset';
    btn.addEventListener('click', ()=>{ state.avatarId = i; state.asset = null; refresh(); });
    card.appendChild(btn);
    avatarGrid.appendChild(card);
  }
}

/* ---- assets folder grid ---- */
async function loadManifestList(){
  if (!USE_MANIFEST) return null;
  try {
    const url = ASSET_FOLDER.replace(/\/+$/,'/') + 'manifest.json';
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json.gifs) && json.gifs.length) return json.gifs;
    return null;
  } catch { return null; }
}

function buildAssetCard(filename){
  const url = ASSET_FOLDER.replace(/\/+$/,'/') + filename;

  const card = document.createElement('div');
  card.className = 'avatar-card';
  card.title = filename;

  const thumb = document.createElement('div');
  thumb.style.width='100px'; thumb.style.height='100px'; thumb.style.display='grid'; thumb.style.placeItems='center';

  const img = document.createElement('img');
  img.src = url; img.alt = filename;
  img.style.width='64px'; img.style.height='64px'; img.style.objectFit='contain'; img.style.imageRendering='pixelated';
  thumb.appendChild(img);

  const btn = document.createElement('button');
  btn.className = 'btn small'; btn.type = 'button'; btn.textContent = 'Select';
  btn.addEventListener('click', ()=>{
    const scale = parseFloat(scaleInput.value)||1;
    const offx = parseInt(offxInput.value||'0',10);
    const offy = parseInt(offyInput.value||'0',10);
    state.asset = { type:'gif', url, scale, offset:{x:offx,y:offy} };
    refresh();
  });

  card.appendChild(thumb);
  card.appendChild(btn);
  assetGrid.appendChild(card);
}

async function buildAssetGrid(){
  if (!assetGrid){ console.error('[creator] #assetGrid missing'); return; }
  assetGrid.innerHTML = '';
  let list = await loadManifestList();
  if (!Array.isArray(list) || list.length === 0) list = ASSET_LIST;
  if (!Array.isArray(list) || list.length === 0){
    const msg = document.createElement('div'); msg.className = 'note';
    msg.textContent = 'No assets found. Check ASSET_LIST or add manifest.json.';
    assetGrid.appendChild(msg);
    return;
  }
  list.forEach(name => { try{ buildAssetCard(name); } catch(e){ console.error('Asset card failed:', name, e); } });
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

/* ---- optional file upload handling ---- */
function detectTypeFromFile(file, override){
  if (override && override !== 'auto') return override;
  const ext = (file.name.split('.').pop()||'').toLowerCase();
  if (file.type === 'image/gif' || ext === 'gif') return 'gif';
  return 'image';
}
function readFileAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = ()=> resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
if (fileInput){
  fileInput.addEventListener('change', async ()=>{
    const file = fileInput.files?.[0]; if (!file) return;
    const chosen = assetTypeSel.value;
    const type = detectTypeFromFile(file, chosen);
    const url = await readFileAsDataURL(file);
    const scale = parseFloat(scaleInput.value)||1;
    const offx = parseInt(offxInput.value||'0',10);
    const offy = parseInt(offyInput.value||'0',10);
    const asset = { type, url, scale, offset:{x:offx,y:offy} };
    if (type === 'sprite'){
      asset.cols = Math.max(1, parseInt(colsInput.value||'6',10));
      asset.fps  = Math.max(1, parseInt(fpsInput.value||'8',10));
    }
    state.asset = asset; refresh();
  });
}
if (assetTypeSel){
  assetTypeSel.addEventListener('change', ()=>{
    const v = assetTypeSel.value;
    spriteOptions.style.display = (v === 'sprite') ? 'grid' : 'none';
    if (state.asset) state.asset.type = (v==='auto') ? state.asset.type : v;
    refresh();
  });
}
[scaleInput, offxInput, offyInput, colsInput, fpsInput].forEach(inp=>{
  if (!inp) return;
  inp.addEventListener('input', ()=>{
    const scale = parseFloat(scaleInput.value)||1, offx = parseInt(offxInput.value||'0',10), offy = parseInt(offyInput.value||'0',10);
    if (!state.asset) state.asset = { type:'gif', url:'', scale:1, offset:{x:0,y:0} };
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
  nameInput.value = state.name || '';
  shapeSel.value = state.shape || 'rounded';
  if (scaleInput) scaleInput.value = state.asset?.scale ?? 1;
  if (offxInput) offxInput.value = state.asset?.offset?.x ?? 0;
  if (offyInput) offyInput.value = state.asset?.offset?.y ?? 0;
  if (assetTypeSel) assetTypeSel.value = state.asset?.type || 'auto';
  if (spriteOptions) spriteOptions.style.display = (state.asset?.type === 'sprite') ? 'grid' : 'none';
  if (state.asset?.type === 'sprite'){
    if (colsInput) colsInput.value = state.asset.cols || 6;
    if (fpsInput)  fpsInput.value  = state.asset.fps || 8;
  }
  renderAvatarInto(preview, state, 200);
}

function goHome(){
  // More robust than './index.html' — works under GitHub Pages subpaths
  const homeURL = new URL('./index.html', window.location.href);
  window.location.assign(homeURL.toString());
}

function init(){
  // Optional: hide upload block
  if (!SHOW_UPLOAD && uploadRow) uploadRow.style.display = 'none';

  nameInput.value = state.name || '';
  shapeSel.value = state.shape || 'rounded';

  buildAvatarGrid();
  buildAssetGrid();
  wireSwatches();
  refresh();

  shapeSel.addEventListener('change', e=>{ state.shape = e.target.value; refresh(); });

  form.addEventListener('submit', e=>{
    e.preventDefault();
    state.name = (nameInput.value || 'Player').trim();
    savePlayer(state);
    goHome(); // ✅ fixed navigation
  });
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
