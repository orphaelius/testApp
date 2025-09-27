// Difficulty state helpers
let DIFF = 'easy'; // easy | medium | hard
export function setDifficulty(d){ DIFF = d; }
export function cycleDifficulty(d){ return d==='easy'?'medium': d==='medium'?'hard':'easy'; }
export function getDifficultyLabel(d){ return d[0].toUpperCase()+d.slice(1); }
// topics.js (top)
import { cisspPracticeTopic } from './CISSP/cissp_topic.js';




const rnd = (min,max)=> Math.floor(Math.random()*(max-min+1))+min;
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const approxEq = (a,b,tol=1e-3)=> Math.abs(a-b) <= tol;

function parseNumberish(s){
  const t = s.trim().toLowerCase();
  if (['∞','+∞','inf','+inf','+infinity'].includes(t)) return Infinity;
  if (['-∞','-inf','-infinity'].includes(t)) return -Infinity;
  if (['dne','does not exist'].includes(t)) return NaN;
  if (/^[+-]?\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = t.match(/^\s*([+-]?\d+)\s*\/\s*([+-]?\d+)\s*$/); if (m){ const a=+m[1], b=+m[2]; if (b!==0) return a/b; }
  return null;
}

/* ---------- Base topics ---------- */
const arithmetic = {
  id:'arithmetic', label:'Arithmetic (±×÷)', subject:'Arithmetic',
  generateQuestion(d=DIFF){
    const range = d==='hard'? 200 : d==='medium'? 60 : 30;
    const a=rnd(1,range), b=rnd(1,range), op=pick(['+','-','×','÷']);
    const prompt = `\\( ${a}\\;${op}\\;${b} =\\; ? \\)`;
    let correct; switch(op){ case '+':correct=a+b;break; case '-':correct=a-b;break; case '×':correct=a*b;break; case '÷':correct=Number((a/b).toFixed(2)); }
    return { prompt, meta:{op}, correct, answerFormat:'number' };
  },
  checkAnswer(input,data){
    const num=parseNumberish(input); if (num===null) return {correct:false,feedback:'Enter a number (fractions ok: -7/2).'};
    if (data.meta.op==='÷'){ const ok=approxEq(num,data.correct,1e-2); return {correct:ok,feedback:ok?'Nice division!':`Expected ≈ ${data.correct}`}; }
    return num===data.correct;
  }
};

const trigBasics = {
  id:'trig_basics', label:'Trig (special angles)', subject:'Trigonometry',
  generateQuestion(d=DIFF){
    const angles = d==='hard' ? [0,15,30,45,60,75,90] : [0,30,45,60,90];
    const fns=['\\sin','\\cos'], θ=pick(angles), fn=pick(fns);
    const val = fn==='\\sin' ? Math.sin((θ*Math.PI)/180) : Math.cos((θ*Math.PI)/180);
    const dp = d==='hard'? 4 : 3; const correct=Number(val.toFixed(dp));
    return { prompt:`\\( ${fn}(${θ}^{\\circ}) \\approx ?\\;\\text{(${dp}dp)} \\)`, correct, meta:{dp}, answerFormat:'number' };
  },
  checkAnswer(i,data){
    const n=parseNumberish(i); if (n===null) return {correct:false,feedback:'Enter a number (e.g., 0.866 or 3/4).'};
    const tol = (data.meta?.dp ?? 3) >= 4 ? 1e-4 : 1e-3;
    return approxEq(n,data.correct,tol);
  }
};

const rationalLimits = {
  id:'rational_limits', label:'Rational Limits', subject:'Calculus',
  generateQuestion(d=DIFF){
    const mode=pick(['finite','infty']);
    if (mode==='finite'){
      const c=rnd(-6,6)||2, correct=2*c;
      return { prompt:`\\( \\displaystyle \\lim_{x\\to ${c}} \\frac{x^2 - ${c}^2}{x - ${c}} \\)`, meta:{mode,c,correct}, correct, answerFormat:'number' };
    } else {
      const degNum=rnd(1,3)+(d==='hard'?1:0), shift=pick([-1,0,1]), degDen=Math.max(1,degNum+shift), aLead=(rnd(-6,6)||2), bLead=(rnd(-6,6)||3);
      let L; if (degNum<degDen) L=0; else if (degNum===degDen) L=aLead/bLead; else L=(aLead/bLead)>0?Infinity:-Infinity;
      return { prompt:`\\( \\displaystyle \\lim_{x\\to \\infty} \\frac{${aLead}x^{${degNum}} + \\cdots}{${bLead}x^{${degDen}} + \\cdots} \\)`, meta:{mode:'infty',L}, correct:L, answerFormat:'string' };
    }
  },
  checkAnswer(i,d){
    if (d.meta.mode==='finite'){ const n=parseNumberish(i); if (n===null) return {correct:false,feedback:'Enter a number (fractions ok).'}; return approxEq(n,d.meta.correct,1e-6); }
    const t=i.trim().toLowerCase(), L=d.meta.L;
    if (Number.isFinite(L)){ const n=parseNumberish(i); return (n!==null)&&approxEq(n,L,1e-6); }
    if (L===Infinity)  return ['∞','inf','+∞','+inf','+infinity'].includes(t);
    if (L===-Infinity) return ['-∞','-inf','-infinity'].includes(t);
    return t==='dne';
  }
};

const derivativesEval = {
  id:'derivatives_eval', label:`Derivatives (evaluate f'(x₀))`, subject:'Calculus',
  generateQuestion(d=DIFF){
    const mode=pick(['poly','prod']);
    if (mode==='poly'){
      const range= d==='hard'? 6 : 3;
      const a=rnd(-range,range)||1, b=rnd(-4,4), c=rnd(-6,6), x0=rnd(-3,3);
      const fp=(x)=>3*a*x*x + 2*b*x + c, correct=fp(x0);
      return { prompt:`\\( f(x)= ${a}x^{3}+${b}x^{2}+${c}x.\\;\\; \\text{Find } f'(${x0}). \\)`, meta:{a,b,c,x0,correct}, correct, answerFormat:'number' };
    } else {
      const a=rnd(-5,5)||2, b=rnd(-5,5), c=rnd(-5,5)||-3, d=rnd(-5,5), x0=rnd(-3,3);
      const correct=2*a*c*x0 + (a*d + b*c);
      return { prompt:`\\( f(x)=(${a}x+${b})(${c}x+${d}).\\;\\; \\text{Find } f'(${x0}). \\)`, meta:{a,b,c,d,x0,correct}, correct, answerFormat:'number' };
    }
  },
  checkAnswer(i,d){ const n=parseNumberish(i); if (n===null) return {correct:false,feedback:'Enter a number (fractions ok).'}; return approxEq(n,d.meta.correct,1e-6); }
};

/* ---------- 10 NEW topics ---------- */
const topic_linear = {
  id:'linear_eq', label:'Solve Linear Eq.', subject:'Algebra',
  generateQuestion(d=DIFF){ const q=(function linearSolve(d){
    const m = (d==='hard')? rnd(-7,7)||2 : (d==='medium'? rnd(-5,5)||2 : rnd(2,7));
    const b = rnd(-12,12), c = rnd(-12,12);
    const x = (c - b)/m;
    return { prompt: `\\( ${m}x + ${b} = ${c} \\;\\; \\text{Solve for } x \\)`, x };
  })(d); return { prompt:q.prompt, meta:q, answerFormat:'number' }; },
  checkAnswer(i,d){ const n=parseNumberish(i); if (n===null) return {correct:false,feedback:'Enter a number.'}; return approxEq(n,d.meta.x,1e-3); }
};

const topic_quadratic = {
  id:'quadratic_fact', label:'Quadratic Roots', subject:'Algebra',
  generateQuestion(d=DIFF){
    const r1=rnd(-5,5), r2=rnd(-5,5); const a = (d==='hard')? pick([2,3]):1;
    const b = -a*(r1+r2), c = a*r1*r2;
    return { prompt:`\\( ${a}x^2 ${b>=0?'+':''}${b}x ${c>=0?'+':''}${c}=0 \\;\\; \\text{Find a root} \\)`, meta:{roots:[r1,r2]}, answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); if (n===null) return {correct:false,feedback:'Enter a number.'}; return d.meta.roots.some(r=>approxEq(n,r,1e-3)); }
};

const topic_exp_log = {
  id:'exp_log', label:'Exponentials & Logs', subject:'Algebra',
  generateQuestion(d=DIFF){
    const base = (d==='hard')? pick([2,3,5,7,10]) : pick([2,10]);
    const k = rnd(1,3); const x = rnd(1,4);
    const form = pick(['exp','log']);
    if (form==='exp'){
      const val = base**(k*x);
      return { prompt:`\\( \\log_{${base}}(${val}) = ? \\)`, correct: k*x, answerFormat:'number' };
    } else {
      const val = k*x; const out = base**(val);
      return { prompt:`\\( \\log_{${base}}(${out}) = ? \\)`, correct: val, answerFormat:'number' };
    }
  },
  checkAnswer(i,d){ const n=parseNumberish(i); return n!==null && approxEq(n,d.correct,1e-6); }
};

const topic_comp = {
  id:'function_comp', label:'Function Composition', subject:'Algebra',
  generateQuestion(d=DIFF){
    const a=rnd(1,4), b=rnd(-3,3), c=rnd(1,4), d0=rnd(-3,3), x0=rnd(-3,3);
    const val = a*(c*x0+d0)+b;
    return { prompt:`\\( f(x)=${a}x+${b},\\; g(x)=${c}x+${d0}.\\; (f\\circ g)(${x0})= ? \\)`, correct: val, answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); return n!==null && approxEq(n,d.correct,1e-6); }
};

const topic_systems = {
  id:'systems_2x2', label:'Solve 2×2 System', subject:'Algebra',
  generateQuestion(d=DIFF){
    const a=rnd(1,6), b=rnd(1,6), c=rnd(-8,8);
    const d1=rnd(1,6), e=rnd(1,6), f=rnd(-8,8);
    let det = a*e - b*d1; if(det===0) return topic_systems.generateQuestion(d);
    const x = (c*e - b*f)/det; const y = (a*f - c*d1)/det;
    return { prompt:`\\( \\begin{cases} ${a}x+${b}y=${c} \\\\ ${d1}x+${e}y=${f} \\end{cases} \\;\\; \\text{Find } x \\)`, meta:{x,y}, answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); return n!==null && approxEq(n,d.meta.x,1e-3); }
};

const topic_limit_point = {
  id:'limit_point', label:'Limit at a Point', subject:'Calculus',
  generateQuestion(d=DIFF){
    const c=rnd(-4,4), A=rnd(-3,3)||2, B=rnd(-3,3);
    return { prompt:`\\( \\lim_{x\\to ${c}} (${A}x+${B}) = ? \\)`, correct: A*c+B, answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); return n!==null && approxEq(n,d.correct,1e-6); }
};

const topic_diff_quotient = {
  id:'diff_quotient', label:'Numerical Derivative', subject:'Calculus',
  generateQuestion(d=DIFF){
    const a=rnd(1,3), b=rnd(-4,4), x0=rnd(-3,3), h = (d==='hard'? 1e-4 : d==='medium'? 1e-3 : 1e-2);
    const f=x=>a*x*x + b*x;
    const approx = (f(x0+h)-f(x0-h))/(2*h);
    return { prompt:`\\( f(x)=${a}x^2+${b}x.\\;\\text{Approx } f'(${x0}) \\)`, correct: Number(approx.toFixed(3)), answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); return n!==null && approxEq(n,d.correct,1e-2); }
};

const topic_power_rule = {
  id:'power_rule', label:'Derivatives: Power Rule', subject:'Calculus',
  generateQuestion(d=DIFF){
    const n = (d==='hard')? rnd(3,7) : rnd(2,5);
    const a = rnd(-4,4)||1, x0=rnd(-3,3);
    const correct = a*n*Math.pow(x0,n-1);
    return { prompt:`\\( f(x)=${a}x^{${n}}.\\; f'(${x0})=? \\)`, correct, answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); return n!==null && approxEq(n,d.correct,1e-6); }
};

const topic_product_rule = {
  id:'product_rule', label:'Derivatives: Product Rule', subject:'Calculus',
  generateQuestion(d=DIFF){
    const a=rnd(1,4), b=rnd(1,4), x0=rnd(-3,3);
    const correct = (a+b)*Math.pow(x0, a+b-1);
    return { prompt:`\\( f(x)=x^{${a}}\\cdot x^{${b}}.\\; f'(${x0})=? \\)`, correct, answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); return n!==null && approxEq(n,d.correct,1e-6); }
};

const topic_chain_rule = {
  id:'chain_rule', label:'Derivatives: Chain Rule', subject:'Calculus',
  generateQuestion(d=DIFF){
    const a=rnd(1,3), b=rnd(1,3), x0=rnd(-2,2);
    const correct = 3*Math.pow(a*x0+b,2)*a;
    return { prompt:`\\( f(x)=( ${a}x+${b} )^{3}.\\; f'(${x0})=? \\)`, correct, answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); return n!==null && approxEq(n,d.correct,1e-6); }
};

const topic_tangent_line = {
  id:'tangent_line', label:'Tangent Line at a Point', subject:'Calculus',
  generateQuestion(d=DIFF){
    const m=rnd(-5,5)||2, b=rnd(-6,6), x0=rnd(-3,3);
    const y0 = m*x0 + b;
    return { prompt:`\\( y=${m}x+${b}.\\; \\text{Tangent at } x=${x0}:\\; y=? \\)`, meta:{m,b,x0,y0}, answerFormat:'string' };
  },
  checkAnswer(i,d){
    const t=i.replace(/\s+/g,''); const m=d.meta.m, y0=d.meta.y0, x0=d.meta.x0;
    const B = y0 - m*x0; const cand = t.toLowerCase();
    return cand===`y=${m}x${B>=0?'+':''}${B}`;
  }
};

const topic_continuity = {
  id:'continuity', label:'Continuity (classify)', subject:'Calculus',
  generateQuestion(d=DIFF){
    const type = pick(['removable','jump','none']);
    let prompt, answer;
    if (type==='removable'){ prompt = `\\( f(x)=\\frac{x^2-4}{x-2} \\) at \\( x=2 \\): type?`; answer='removable'; }
    else if (type==='jump'){ prompt = `\\( f(x)=\\begin{cases}1,&x<0\\\\2,&x\\ge 0\\end{cases} \\) at \\( x=0 \\): type?`; answer='jump'; }
    else { prompt = `\\( f(x)=x^2 \\) at \\( x=1 \\): type?`; answer='none'; }
    return { prompt, correct: answer, answerFormat:'string' };
  },
  checkAnswer(i,d){ const t=i.trim().toLowerCase(); return (['removable','hole'].includes(t) && d.correct==='removable') || t===d.correct; }
};

export const topicsRegistry = [
  arithmetic, trigBasics, rationalLimits, derivativesEval,
  topic_linear, topic_quadratic, topic_exp_log, topic_comp, topic_systems,
  topic_limit_point, topic_diff_quotient, topic_power_rule, topic_product_rule,
  topic_chain_rule, topic_tangent_line, topic_continuity, cisspPracticeTopic
];


export function findTopic(id){ return topicsRegistry.find(t=>t.id===id); }
