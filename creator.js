const DEFAULT_PLAYER = {
  name: 'Player',
  shape: 'rounded',
  color: '#6aa6ff',
  asset: {
    url: 'CharacterAssets/Model1.gif', // no leading "./"
    scale: 3,
    offset: { x: 0, y: 0 }
  }
};
const ASSET_FOLDER = 'CharacterAssets/';
const ASSET_LIST   = ['Model1.gif','Model2.gif','Model3.gif'];
const MODEL_ASSETS = [
  { label:'Model 1', url:'CharacterAssets/Model1.gif' },
  { label:'Model 2', url:'CharacterAssets/Model2.gif' },
  { label:'Model 3', url:'CharacterAssets/Model3.gif' },
];



/* ---- storage helpers ---- */
function loadPlayer(){ try{ return JSON.parse(localStorage.getItem('mq_player')) || { ...DEFAULT_PLAYER }; }catch{ return { ...DEFAULT_PLAYER }; } }
function savePlayer(p){ localStorage.setItem('mq_player', JSON.stringify(p)); }
function resolveURL(u){ try{ return new URL(u, document.baseURI).toString(); }catch{ return u; } }

/* ---- visuals ---- */
function shapeClip(shape){
  return shape==='circle' ? 'circle(50% at 50% 50%)' :
         shape==='diamond'? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
         shape==='hex'    ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%)' :
         'inset(0 round 14%)';
}
function renderAvatarInto(el, p, size=220){
  el.innerHTML='';
  const sclip = shapeClip(p.shape);
  const container = document.createElement('div');
  Object.assign(container.style, {
    width:size+'px', height:size+'px', clipPath:sclip, borderRadius:'14%',
    background:'transparent', display:'grid', placeItems:'center'
  });

  if (p.asset?.url){
    const sc  = p.asset.scale ?? 3;
    const off = p.asset.offset || {x:0,y:0};
    const img = document.createElement('img');
    img.src = resolveURL(p.asset.url);
    img.alt = 'avatar';
    img.style.width  = Math.round(64*sc)+'px';
    img.style.height = Math.round(64*sc)+'px';
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'pixelated';
    img.style.transform = `translate(${off.x||0}px, ${off.y||0}px)`;
    container.appendChild(img);
  }

  el.appendChild(container);
} // <-- important: close the function here

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
      delete state.avatarId;                 // ensure presets can’t come back
      savePlayer(state);                     // <-- use your helper
      refresh();
    });

    card.appendChild(thumb);
    card.appendChild(btn);
    grid.appendChild(card);
  }
}

  
  


/* ---- DOM refs ---- */
const form = document.getElementById('creatorForm');
const preview = document.getElementById('creatorPreview');
const avatarGrid = document.getElementById('avatarGrid');
const assetGrid  = document.getElementById('assetGrid');
const shapeSel = document.getElementById('shape');
const nameInput = document.getElementById('name');

let state = loadPlayer();

/* ---- build preset grid ---- 
function buildAvatarGrid(){
  for(let i=0;i<10;i++){
    const card=document.createElement('div'); card.className='avatar-card';
    const thumb=document.createElement('div'); thumb.style.width='100px'; thumb.style.height='100px';
    renderAvatarInto(thumb, { ...state, asset:null, avatarId:i }, 100);
    const btn=document.createElement('button'); btn.type='button'; btn.className='btn small'; btn.textContent='Use preset';
    btn.addEventListener('click', ()=>{ state.avatarId=i; state.asset=null; refresh(); });
    card.appendChild(thumb); card.appendChild(btn); avatarGrid.appendChild(card);
  }
} */

/* ---- assets folder grid (your 3 GIFs) ---- */
function buildAssetCard(file){
  const url = ASSET_FOLDER + file;
  const card=document.createElement('div'); card.className='avatar-card';
  const img=document.createElement('img'); img.src=url; img.alt=file; img.style.width='64px'; img.style.height='64px'; img.style.objectFit='contain'; img.style.imageRendering='pixelated';
  const btn=document.createElement('button'); btn.type='button'; btn.className='btn small'; btn.textContent='Select';
  btn.addEventListener('click', ()=>{
  state.asset = {
    type: 'gif',
    url,
    scale: 3,
    offset: { x: 0, y: 0 }
  };
+ savePlayer(state);
  refresh();
});


  card.appendChild(img); card.appendChild(btn); assetGrid.appendChild(card);
}
function buildAssetGrid(){
  assetGrid.innerHTML='';
  ASSET_LIST.forEach(f=> buildAssetCard(f));
}

/* ---- swatches ---- */
function wireSwatches(){ document.querySelectorAll('.swatch').forEach(b=> b.addEventListener('click', ()=>{ state.color = b.getAttribute('data-color'); refresh(); })); }

/* ---- Preview + form ---- */
function refresh(){
  document.getElementById('name').value = state.name || '';
  document.getElementById('shape').value = state.shape || 'rounded';
  renderAvatarInto(preview, state, 220);
}
function goHome(){ const u=new URL('./index.html', window.location.href); window.location.assign(u.toString()); }

function init(){
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  //buildModelGrid();
  buildAssetGrid();
  wireSwatches();
  refresh();

  shapeSel.addEventListener('change', e=>{ state.shape = e.target.value; refresh(); });
  nameInput.addEventListener('input', e=>{ state.name = e.target.value; });
  form.addEventListener('submit', e=>{ e.preventDefault(); savePlayer(state); goHome(); });
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
