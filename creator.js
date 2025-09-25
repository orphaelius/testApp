const DEFAULT_PLAYER = { name:'Player', avatarId:0, shape:'rounded', color:'#6aa6ff', asset:null };

/* === Assets config (your three GIFs) === */
const ASSET_FOLDER = './CharacterAssets/';
const ASSET_LIST   = ['Model1.gif','Model2.gif','Model3.gif'];

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
  const sclip=shapeClip(p.shape);
  const container=document.createElement('div');
  Object.assign(container.style,{width:size+'px',height:size+'px',clipPath:sclip,borderRadius:'14%',background:'transparent',display:'grid',placeItems:'center'});

  if (p.asset?.url){
    const sc=p.asset.scale ?? 1; const off=p.asset.offset || {x:0,y:0};
    if (p.asset.type==='sprite'){
      const cols=p.asset.cols||6, fps=p.asset.fps||8, frame=64;
      const d=document.createElement('div');
      d.style.width=Math.round(frame*sc)+'px'; d.style.height=Math.round(frame*sc)+'px';
      d.style.backgroundImage=`url(${resolveURL(p.asset.url)})`;
      d.style.backgroundRepeat='no-repeat';
      d.style.backgroundSize=`${cols*frame}px ${frame}px`;
      d.style.transform=`translate(${off.x||0}px, ${off.y||0}px)`;
      const anim=`s-${cols}-${fps}-${Math.random().toString(36).slice(2)}`;
      const st=document.createElement('style');
      st.textContent=`@keyframes ${anim}{from{background-position-x:0px}to{background-position-x:-${cols*frame}px}}`;
      document.head.appendChild(st);
      d.style.animation=`${anim} ${(cols/fps).toFixed(4)}s steps(${cols}) infinite`;
      container.appendChild(d);
    } else {
      const img=document.createElement('img');
      img.src=resolveURL(p.asset.url); img.alt='avatar';
      img.style.width=Math.round(64*sc)+'px'; img.style.height=Math.round(64*sc)+'px';
      img.style.objectFit='contain'; img.style.imageRendering='pixelated';
      img.style.transform=`translate(${off.x||0}px, ${off.y||0}px)`;
      container.appendChild(img);
    }
  } else {
    // preset block avatar
    const svgNS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 64 64'); svg.setAttribute('width',size); svg.setAttribute('height',size);
    svg.style.clipPath=sclip; svg.style.background='transparent';
    const presets=[[[1,1],[2,1],[1,2],[2,2],[1,3],[2,3]],[[0,1],[1,1],[2,1],[1,2],[1,3]],[[0,0],[3,0],[1,1],[2,1],[1,2],[2,2],[0,3],[3,3]],[[1,0],[2,0],[0,1],[3,1],[1,2],[2,2],[1,3],[2,3]],[[0,0],[1,1],[2,2],[3,3],[3,0],[2,1],[1,2],[0,3]],[[1,0],[2,0],[0,2],[1,2],[2,2],[3,2]],[[0,1],[3,1],[1,2],[2,2],[1,3],[2,3]],[[1,1],[2,1],[0,2],[1,2],[2,2],[3,2]],[[1,0],[2,0],[1,1],[2,1],[1,2],[2,2]],[[0,0],[3,0],[0,3],[3,3],[1,1],[2,2]]];
    const cells=presets[(p.avatarId||0)%presets.length]; const cell=14, pad=6;
    cells.forEach(([cx,cy])=>{ const r=document.createElementNS(svgNS,'rect'); r.setAttribute('x', pad + cx*cell); r.setAttribute('y', pad + cy*cell); r.setAttribute('width',cell); r.setAttribute('height',cell); r.setAttribute('rx',3); r.setAttribute('fill', p.color); svg.appendChild(r); });
    container.appendChild(svg);
  }
  el.appendChild(container);
}

/* ---- DOM refs ---- */
const form = document.getElementById('creatorForm');
const preview = document.getElementById('creatorPreview');
const avatarGrid = document.getElementById('avatarGrid');
const assetGrid  = document.getElementById('assetGrid');
const shapeSel = document.getElementById('shape');
const nameInput = document.getElementById('name');

let state = loadPlayer();

/* ---- build preset grid ---- */
function buildAvatarGrid(){
  for(let i=0;i<10;i++){
    const card=document.createElement('div'); card.className='avatar-card';
    const thumb=document.createElement('div'); thumb.style.width='100px'; thumb.style.height='100px';
    renderAvatarInto(thumb, { ...state, asset:null, avatarId:i }, 100);
    const btn=document.createElement('button'); btn.type='button'; btn.className='btn small'; btn.textContent='Use preset';
    btn.addEventListener('click', ()=>{ state.avatarId=i; state.asset=null; refresh(); });
    card.appendChild(thumb); card.appendChild(btn); avatarGrid.appendChild(card);
  }
}

/* ---- assets folder grid (your 3 GIFs) ---- */
function buildAssetCard(file){
  const url = ASSET_FOLDER + file;
  const card=document.createElement('div'); card.className='avatar-card';
  const img=document.createElement('img'); img.src=url; img.alt=file; img.style.width='64px'; img.style.height='64px'; img.style.objectFit='contain'; img.style.imageRendering='pixelated';
  const btn=document.createElement('button'); btn.type='button'; btn.className='btn small'; btn.textContent='Select';
  btn.addEventListener('click', ()=>{
    state.asset={ type:'gif', url, scale:1, offset:{x:0,y:0} };
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
  buildAvatarGrid(); buildAssetGrid(); wireSwatches(); refresh();
  shapeSel.addEventListener('change', e=>{ state.shape=e.target.value; refresh(); });
  nameInput.addEventListener('input', e=>{ state.name = e.target.value; });
  form.addEventListener('submit', e=>{ e.preventDefault(); savePlayer(state); goHome(); });
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
