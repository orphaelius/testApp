// topics.js — Arithmetic, Trig Specials, Rational Limits, Derivatives
const rnd = (min,max)=> Math.floor(Math.random()*(max-min+1))+min;
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const approxEq = (a,b,tol=1e-3)=> Math.abs(a-b) <= tol;

function parseNumberish(s){
  const t = s.trim().toLowerCase();
  if (t==='∞'||t==='+∞'||t==='inf'||t==='+inf'||t==='+infinity') return Infinity;
  if (t==='-∞'||t==='-inf'||t==='-infinity') return -Infinity;
  if (t==='dne'||t==='does not exist') return NaN;
  if (/^[+-]?\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = t.match(/^\s*([+-]?\d+)\s*\/\s*([+-]?\d+)\s*$/);
  if (m){ const num=Number(m[1]), den=Number(m[2]); if (den!==0) return num/den; }
  return null;
}

const arithmetic = {
  id:'arithmetic', label:'Arithmetic (±×÷)',
  generateQuestion(){
    const a=rnd(1,30), b=rnd(1,30), op=pick(['+','-','×','÷']);
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
  id:'trig_basics', label:'Trig (sin/cos special angles)',
  generateQuestion(){
    const angles=[0,30,45,60,90], fns=['\\sin','\\cos'], θ=pick(angles), fn=pick(fns);
    const val = fn==='\\sin' ? Math.sin((θ*Math.PI)/180) : Math.cos((θ*Math.PI)/180);
    const correct=Number(val.toFixed(3));
    return { prompt:`\\( ${fn}(${θ}^{\\circ}) \\approx ?\\;\\text{(3dp)} \\)`, correct, answerFormat:'number' };
  },
  checkAnswer(i,d){ const n=parseNumberish(i); if (n===null) return {correct:false,feedback:'Enter a number (e.g., 0.866 or 3/4).'}; return approxEq(n,d.correct,1e-3); }
};

const rationalLimits = {
  id:'rational_limits', label:'Rational Limits',
  generateQuestion(){
    const mode=pick(['finite','infty']);
    if (mode==='finite'){
      const c=rnd(-6,6)||2, correct=2*c;
      return { prompt:`\\( \\displaystyle \\lim_{x\\to ${c}} \\frac{x^2 - ${c}^2}{x - ${c}} \\)`, meta:{mode,c,correct}, correct, answerFormat:'number' };
    } else {
      const degNum=rnd(1,3), shift=pick([-1,0,1]), degDen=Math.max(1,degNum+shift), aLead=(rnd(-6,6)||2), bLead=(rnd(-6,6)||3);
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
  id:'derivatives_eval', label:`Derivatives (evaluate f'(x₀))`,
  generateQuestion(){
    const mode=pick(['poly','prod']);
    if (mode==='poly'){
      const a=rnd(-3,3)||1, b=rnd(-4,4), c=rnd(-6,6), d=rnd(-8,8), x0=rnd(-3,3);
      const fp=(x)=>3*a*x*x + 2*b*x + c, correct=fp(x0);
      return { prompt:`\\( f(x)= ${a}x^{3}+${b}x^{2}+${c}x+${d}.\\;\\; \\text{Find } f'(${x0}). \\)`, meta:{mode,a,b,c,d,x0,correct}, correct, answerFormat:'number' };
    } else {
      const a=rnd(-5,5)||2, b=rnd(-5,5), c=rnd(-5,5)||-3, d=rnd(-5,5), x0=rnd(-3,3);
      const correct=2*a*c*x0 + (a*d + b*c);
      return { prompt:`\\( f(x)=(${a}x+${b})(${c}x+${d}).\\;\\; \\text{Find } f'(${x0}). \\)`, meta:{mode,a,b,c,d,x0,correct}, correct, answerFormat:'number' };
    }
  },
  checkAnswer(i,d){ const n=parseNumberish(i); if (n===null) return {correct:false,feedback:'Enter a number (fractions ok).'}; return approxEq(n,d.meta.correct,1e-6); }
};

export const topicsRegistry = [ arithmetic, trigBasics, rationalLimits, derivativesEval ];
export function findTopic(id){ return topicsRegistry.find(t=>t.id===id); }
