/* creator.js — safe without shape/color pickers
   - No reliance on #shape or color swatches
   - Null-safe DOM reads
   - Rounded, frameless avatar preview (no clipPath)
*/

/* ---- config ---- */
const DEFAULT_PLAYER = {
  name: 'Player',
  asset: {
    
    url: 'CharacterAssets/Model1Walk.gif',
    scale: 3,
    offset: { x: 0, y: 0 }
  }
};

const ASSET_FOLDER = 'CharacterAssets/';
const ASSET_LIST   = ['Model1Walk.gif','Model2Walk.gif','Model3Walk.gif'];
const MODEL_ASSETS = [
  { label:'Model 1', url:'CharacterAssets/Model1Walk.gif' },
  { label:'Model 2', url:'CharacterAssets/Model2Walk.gif' },
  { label:'Model 3', url:'CharacterAssets/Model3Walk.gif' },
];

/* ---- storage helpers ---- */
function loadPlayer(){
  try{
    const raw = localStorage.getItem('mq_player');
    const p = raw ? JSON.parse(raw) : { ...DEFAULT_PLAYER };
    // Drop legacy fields if present
    delete p.shape;
    delete p.color;
    // Normalize asset block
    p.asset = p.asset || {};
    if (typeof p.asset.scale !== 'number') p.asset.scale = 3;
    if (!p.asset.offset) p.asset.offset = { x:0, y:0 };
    return p;
  }catch{
    return { ...DEFAULT_PLAYER };
  }
}
function savePlayer(p){
  // Persist only supported fields
  const clean = {
    name: p?.name ?? DEFAULT_PLAYER.name,
    asset: {
      url: p?.asset?.url ?? DEFAULT_PLAYER.asset.url,
      scale: typeof p?.asset?.scale === 'number' ? p.asset.scale : 3,
      offset: {
        x: typeof p?.asset?.offset?.x === 'number' ? p.asset.offset.x : 0,
        y: typeof p?.asset?.offset?.y === 'number' ? p.asset.offset.y : 0
      }
    }
  };
  localStorage.setItem('mq_player', JSON.stringify(clean));
}
function resolveURL(u){
  try{ return new URL(u, document.baseURI).toString(); }
  catch{ return u; }
}

/* ---- visuals ---- */
function renderAvatarInto(el, p, size=220){
  if (!el) return;
  el.innerHTML = '';

  const container = document.createElement('div');
  Object.assign(container.style, {
    width: size + 'px',
    height: size + 'px',
    borderRadius: '14%',
    background: 'transparent',
    display: 'grid',
    placeItems: 'center',
    overflow: 'visible'
  });

  if (p.asset?.url){
    const sc  = p.asset.scale ?? 3;
    const off = p.asset.offset || {x:0,y:0};
    const img = document.createElement('img');
    img.src = resolveURL(p.asset.url);
    img.alt = 'avatar';
    img.style.width  = Math.round(64*sc) + 'px';
    img.style.height = Math.round(64*sc) + 'px';
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'pixelated';
    img.style.transform = `translate(${off.x||0}px, ${off.y||0}px)`;

    // simple diagnostics if asset path is wrong
    img.addEventListener('error', () => console.error('[creator] avatar failed to load:', img.src));
    container.appendChild(img);
  }

  el.appendChild(container);
}

/* ---- model presets (optional grid) ---- */
function buildModelGrid(){
  const grid = document.getElementById('avatarGrid') || window.avatarGrid;
  if (!grid) return;
  grid.textContent = '';

  for (const m of MODEL_ASSETS){
    const card = document.createElement('div');
    card.className = 'avatar-card';

    const thumb = document.createElement('div');
    thumb.style.width = '100px';
    thumb.style.height = '100px';
    renderAvatarInto(thumb, { ...state, asset:{ url:m.url, scale:3, offset:{x:0,y:0} } }, 100);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn small';
    btn.textContent = `Use ${m.label}`;
    btn.addEventListener('click', ()=>{
      state.asset = { url:m.url, scale:3, offset:{x:0,y:0} };
      savePlayer(state);
      refresh();
    });

    card.appendChild(thumb);
    card.appendChild(btn);
    grid.appendChild(card);
  }
}

/* ---- assets folder grid (your 3 GIFs) ---- */
function buildAssetCard(file){
  const grid = document.getElementById('assetGrid');
  if (!grid) return;

  const url = ASSET_FOLDER + file;

  const card = document.createElement('div');
  card.className = 'avatar-card';

  const img  = document.createElement('img');
  img.src = url;
  img.alt = file;
  Object.assign(img.style, {
    width:'64px', height:'64px', objectFit:'contain', imageRendering:'pixelated'
  });

  const btn  = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn small';
  btn.textContent = 'Select';
  btn.addEventListener('click', ()=>{
    state.asset = { type:'gif', url, scale:3, offset:{ x:0, y:0 } };
    savePlayer(state);
    refresh();
  });

  card.appendChild(img);
  card.appendChild(btn);
  grid.appendChild(card);
}
function buildAssetGrid(){
  const grid = document.getElementById('assetGrid');
  if (!grid) return;
  grid.innerHTML = '';
  ASSET_LIST.forEach(buildAssetCard);
}

/* ---- state & DOM refs ---- */
let state = loadPlayer();

/* ---- Preview + form ---- */
function refresh(){
  // DOM refs (re-query in case page fragments change)
  const preview = document.getElementById('creatorPreview');
  const nameInput = document.getElementById('name');

  if (nameInput){
    // keep input reflecting state (don’t overwrite while typing if focused)
    if (document.activeElement !== nameInput){
      nameInput.value = state.name || '';
    }
  }

  if (preview){
    // ensure the preview region can actually display
    if (!preview.style.minWidth)  preview.style.minWidth  = '120px';
    if (!preview.style.minHeight) preview.style.minHeight = '120px';
    if (!preview.style.display)   preview.style.display   = 'grid';
    preview.style.placeItems = preview.style.placeItems || 'center';

    renderAvatarInto(preview, state, 220);
  }
}

function goHome(){
  const u = new URL('./index.html', window.location.href);
  window.location.assign(u.toString());
}

/* ---- init wiring ---- */
function init(){
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Build selectors/grids if present
  buildAssetGrid();     // uses #assetGrid if it exists
  // buildModelGrid();  // enable if you render #avatarGrid on this page

  // Input listeners (all null-safe)
  const nameInput = document.getElementById('name');
  if (nameInput){
    nameInput.addEventListener('input', e=>{
      state.name = e.target.value || 'Player';
      savePlayer(state);
      refresh();
    });
  }

  const form = document.getElementById('creatorForm');
  if (form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      savePlayer(state);
      goHome();
    });
  }

  // First paint
  refresh();
}

/* ---- bootstrap ---- */
if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, { once:true });
} else {
  init();
}
