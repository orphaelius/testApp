// cissp_topic.js
// Loads 100-question CISSP exam JSON and exposes a topic object.
function resolveURL(urlLike){ try{ return new URL(urlLike, document.baseURI).toString(); }catch{ return urlLike; } }
let _bank=null, _order=[], _cursor=0;
async function loadBank(){ if(_bank) return _bank; const url=resolveURL('cissp_practice_exam_v1.json'); const r=await fetch(url); if(!r.ok) throw new Error('Failed to load CISSP exam JSON: '+r.status); const j=await r.json(); _bank=j.questions||[]; _order=Array.from(_bank.keys()); for(let i=_order.length-1;i>0;i--){ const jx=Math.floor(Math.random()*(i+1)); [_order[i],_order[jx]]=[_order[jx],_order[i]];} _cursor=0; return _bank;}
function formatChoices(q){ return q.choices.map(c=>`${c.key}. ${c.text}`).join('\n'); }
export const cisspPracticeTopic = {
  id:'cissp_practice_100', label:'CISSP Practice Exam (100 Qs)', subject:'CISSP',
  async generateQuestion(){ await loadBank(); if(_order.length===0) return {prompt:'Exam not loaded.', correct:'A', answerFormat:'string'}; const idx=_order[_cursor % _order.length]; const q=_bank[idx]; const prompt = `${q.question}\n\n${formatChoices(q)}\n\n(Type A/B/C/D)`; return { prompt, meta:{ idx, answer:q.answer, choices:q.choices, domain:q.domain }, answerFormat:'string' }; },
  checkAnswer(input, data){ const t=(input||'').trim().toUpperCase(); const letter = t && t[0]; const ok = ['A','B','C','D'].includes(letter) && letter===data.meta.answer; if(ok){ _cursor++; } return { correct: ok, feedback: ok ? `Correct — Domain: ${data.meta.domain}` : `Expected ${data.meta.answer}` }; }
};