const DEFAULT_PLAYER = { name:'Player', avatarId:0, shape:'rounded', color:'#6aa6ff', asset:null };

/* === Assets config (your three GIFs) === */
const ASSET_FOLDER = './CharacterAssets/';
const ASSET_LIST   = ['Model1.gif','Model2.gif','Model3.gif'];
const USE_MANIFEST = false; // set true only if you add CharacterAssets/manifest.json
const SHOW_UPLOAD  = true;  // set false to hide local upload UI

/* ---- storage helpers ---- */
function loadPlayer(){ try{ return JSON.parse(localStorage.getItem('mq_player')) || { ...DEFAULT_PLAYER }; }catch{ return { ...DEFAULT_PLAYER }; } }
function savePlayer(p){ localStorage.setItem('mq_player', JSON.stringify(p)); }
function resolveURL(u){ try{ return new URL(u, document.baseURI).toString(); }catch{ return u; } }

/* ---- visuals ---- */
function shapeClip(shape){
  return shape==='circle' ? 'circle(50% at 50% 50%)' :
         shape==='diamond'? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
         shape==='hex'    ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' :
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
  for(let i=0;i<10;i++){
    const card=document.createElement('div'); card.className='avatar-card';
    const thumb=document.createElement('div'); thumb.style.width='100px'; thumb.style.height='100px';
    renderAvatarInto(thumb, { ...state, asset:null, avatarId:i }, 100);
    const btn=document.createElement('button'); btn.type='button'; btn.className='btn small'; btn.textContent='Use preset';
    btn.addEventListener('click', ()=>{ state.avatarId=i; state.asset=null; refresh(); });
    card.appendChild(thumb); card.appendChild(btn); avatarGrid.appendChild(card);
  }
}

/* ---- assets folder grid ---- */
async function loadManifestList(){
  if (!USE_MANIFEST) return null;
  try {
    const url = ASSET_FOLDER.replace(/\/+$/,'/') + 'manifest.json';
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) return null; const json = await res.json();
    if (Array.isArray(json.gifs) && json.gifs.length) return json.gifs;
    return null;
  } catch { return null; }
}
function buildAssetCard(file){
  const url = ASSET_FOLDER + file;
  const card=document.createElement('div'); card.className='avatar-card';
  const img=document.createElement('img'); img.src=url; img.alt=file; img.style.width='64px'; img.style.height='64px'; img.style.objectFit='contain'; img.style.imageRendering='pixelated';
  const btn=document.createElement('button'); btn.type='button'; btn.className='btn small'; btn.textContent='Select';
  btn.addEventListener('click', ()=>{
    const scale=parseFloat(scaleInput.value)||1, offx=parseInt(offxInput.value||'0',10), offy=parseInt(offyInput.value||'0',10);
    state.asset={ type:'gif', url, scale, offset:{x:offx,y:offy} };
    refresh();
  });
  card.appendChild(img); card.appendChild(btn); assetGrid.appendChild(card);
}
async function buildAssetGrid(){
  assetGrid.innerHTML='';
  let list = await loadManifestList();
  if (!Array.isArray(list) || list.length===0) list = ASSET_LIST;
  if (!list.length){
    const msg=document.createElement('div'); msg.className='note'; msg.textContent='No assets found. Check ASSET_LIST or add manifest.json.'; assetGrid.appendChild(msg);
    return;
  }
  list.forEach(f=> buildAssetCard(f));
}

/* ---- swatches ---- */
function wireSwatches(){ document.querySelectorAll('.swatch').forEach(b=> b.addEventListener('click', ()=>{ state.color = b.getAttribute('data-color'); refresh(); })); }

/* ---- optional file upload handling ---- */
function detectTypeFromFile(file, override){ if (override && override!=='auto') return override; const ext=(file.name.split('.').pop()||'').toLowerCase(); return (file.type==='image/gif'||ext==='gif')?'gif':'image'; }
function readFileAsDataURL(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }
if (fileInput){
  fileInput.addEventListener('change', async ()=>{
    const file=fileInput.files?.[0]; if(!file) return;
    const t=detectTypeFromFile(file, assetTypeSel.value);
    const url=await readFileAsDataURL(file);
    const scale=parseFloat(scaleInput.value)||1, offx=parseInt(offxInput.value||'0',10), offy=parseInt(offyInput.value||'0',10);
    const asset={type:t,url,scale,offset:{x:offx,y:offy}};
    if(t==='sprite'){ asset.cols=Math.max(1,parseInt(colsInput.value||'6',10)); asset.fps=Math.max(1,parseInt(fpsInput.value||'8',10)); }
    state.asset=asset; refresh();
  });
}
if (assetTypeSel){
  assetTypeSel.addEventListener('change', ()=>{
    spriteOptions.style.display = (assetTypeSel.value==='sprite') ? 'grid' : 'none';
    if (state.asset && assetTypeSel.value!=='auto') state.asset.type = assetTypeSel.value;
    refresh();
  });
}
[scaleInput,offxInput,offyInput,colsInput,fpsInput].forEach(inp=> inp?.addEventListener('input', ()=>{
  if(!state.asset) state.asset={type:'gif',url:'',scale:1,offset:{x:0,y:0}};
  state.asset.scale=parseFloat(scaleInput.value)||1;
  state.asset.offset={x:parseInt(offxInput.value||'0',10), y:parseInt(offyInput.value||'0',10)};
  if(state.asset.type==='sprite'){
    state.asset.cols=Math.max(1,parseInt(colsInput.value||'6',10));
    state.asset.fps=Math.max(1,parseInt(fpsInput.value||'8',10));
  }
  refresh();
}));

/* ---- GIF → sprite conversion (speed control) ---- */
async function fetchArrayBuffer(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('Fetch fail '+r.status); return await r.arrayBuffer(); }
async function gifToSpriteStrip(gifUrl){
  const { parseGIF, decompressFrames } = window.gifuctJs;
  const ab=await fetchArrayBuffer(gifUrl); const gif=parseGIF(ab); const frames=decompressFrames(gif,true);
  const w=gif.lsd.width, h=gif.lsd.height, cols=frames.length;
  const canvas=document.createElement('canvas'); canvas.width=w*cols; canvas.height=h; const ctx=canvas.getContext('2d');
  for(let i=0;i<cols;i++){ const f=frames[i]; const imgData=ctx.createImageData(w,h); imgData.data.set(f.patch); ctx.putImageData(imgData, i*w, 0); }
  return { dataURL: canvas.toDataURL('image/png'), cols, frameW:w, frameH:h };
}
async function convertCurrentGifToSprite(){
  if (!state.asset || state.asset.type!=='gif' || !state.asset.url){ alert('Select a GIF from assets first.'); return; }
  try{
    const { dataURL, cols } = await gifToSpriteStrip(resolveURL(state.asset.url));
    const fps = Math.max(1, parseInt((document.getElementById('fps')?.value)||'6', 10));
    state.asset = { type:'sprite', url:dataURL, cols, fps, scale: state.asset.scale??1, offset: state.asset.offset??{x:0,y:0} };
    document.getElementById('spriteOptions').style.display='grid';
    document.getElementById('cols').value=cols; document.getElementById('fps').value=fps;
    refresh(); alert('Converted! Adjust FPS to control speed.');
  } catch(e){ console.error('GIF→sprite failed', e); alert('Could not convert this GIF.'); }
}

/* ---- UI wiring ---- */
function refresh(){
  document.getElementById('name').value = state.name || '';
  document.getElementById('shape').value = state.shape || 'rounded';
  renderAvatarInto(preview, state, 220);
}
function goHome(){ const u=new URL('./index.html', window.location.href); window.location.assign(u.toString()); }

function init(){
  document.getElementById('year')?.textContent = new Date().getFullYear();

  // optionally hide uploads
  if (!SHOW_UPLOAD) document.getElementById('uploadRow')?.style && (document.getElementById('uploadRow').style.display='none');

  buildAvatarGrid(); buildAssetGrid(); wireSwatches(); refresh();
  shapeSel.addEventListener('change', e=>{ state.shape=e.target.value; refresh(); });
  document.getElementById('convertBtn').addEventListener('click', convertCurrentGifToSprite);
  nameInput.addEventListener('input', e=>{ state.name = e.target.value; });

  form.addEventListener('submit', e=>{ e.preventDefault(); savePlayer(state); goHome(); });
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
