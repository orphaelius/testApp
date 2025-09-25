const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const DEFAULT_SETTINGS = { theme:'blue', tintStrength:0.25, pet:null };

function load(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; } }
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function loadSettings(){ return load('asym_settings', DEFAULT_SETTINGS); }
function saveSettings(s){ save('asym_settings', s); }
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); }

/* CONFIG: where your pets live */
const PET_FOLDER = './PetAssets/';
const PET_LIST = ['Pet1.gif','Pet2.gif','Pet3.gif']; // adjust to your filenames

function buildPetCard(filename){
  const url = new URL(PET_FOLDER + filename, document.baseURI).toString();
  const card = document.createElement('div'); card.className='pet-card';
  const img = document.createElement('img'); img.src=url; img.alt=filename;
  const btn = document.createElement('button'); btn.type='button'; btn.className='btn small'; btn.textContent='Select';
  btn.addEventListener('click', ()=>{
    const s = loadSettings(); s.pet = { url }; saveSettings(s);
    alert('Pet selected! It will appear next to your avatar on Home.');
  });
  card.appendChild(img); card.appendChild(btn);
  return card;
}

function buildPetGrid(){
  const grid = $('#petGrid'); grid.innerHTML='';
  PET_LIST.forEach(f=> grid.appendChild(buildPetCard(f)));
}

function init(){
  const s = loadSettings(); applyTheme(s.theme);
  $('#themeSelect').value = s.theme;
  $('#tintStrength').value = s.tintStrength;

  $('#themeSelect').addEventListener('change', e=>{
    const v=e.target.value; const s=loadSettings(); s.theme=v; saveSettings(s); applyTheme(v);
  });
  $('#tintStrength').addEventListener('input', e=>{
    const v=parseFloat(e.target.value)||0.25; const s=loadSettings(); s.tintStrength=v; saveSettings(s);
  });

  buildPetGrid();

  const y=document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
