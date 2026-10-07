/* Interactive toy illustrations for the Code page. Vanilla JS, no deps. */
(function(){
"use strict";
const css = getComputedStyle(document.documentElement);
const C = {
  ink:   css.getPropertyValue('--ink').trim()   || '#1d1c19',
  ink2:  css.getPropertyValue('--ink-2').trim() || '#57544a',
  ink3:  css.getPropertyValue('--ink-3').trim() || '#8c887a',
  accent:css.getPropertyValue('--accent').trim()|| '#7a2e2e',
  soft:  css.getPropertyValue('--accent-soft').trim() || '#a05252',
  rule:  css.getPropertyValue('--rule').trim()  || '#e7e3d9',
  blue:  '#3d6a8f', grey:'#b9b4a5'
};
function setupCanvas(id, h){
  const cv = document.getElementById(id);
  if(!cv) return null;
  const dpr = window.devicePixelRatio || 1;
  function resize(){
    const w = cv.parentElement.clientWidth - 2;
    cv.width = w*dpr; cv.height = h*dpr;
    cv.style.width = w+'px'; cv.style.height = h+'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return ctx;
  }
  cv._resize = resize;
  return cv;
}
// deterministic RNG
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(rng){let u=0,v=0;while(u===0)u=rng();while(v===0)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}

/* ---------- 1. Robust policy gradient: Wasserstein ambiguity ball ---------- */
(function(){
  const cv = setupCanvas('toy-dro', 240); if(!cv) return;
  const slider = document.getElementById('toy-dro-rho');
  const lbl = document.getElementById('toy-dro-lbl');
  function density(x, mu, s){ return Math.exp(-0.5*((x-mu)/s)**2)/(s*Math.sqrt(2*Math.PI)); }
  function draw(){
    const ctx = cv._resize();
    const W = cv.clientWidth, H = 240, pad=34;
    const rho = parseFloat(slider.value); // 0..1
    ctx.clearRect(0,0,W,H);
    // axes
    ctx.strokeStyle=C.rule; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad,H-28); ctx.lineTo(W-pad,H-28); ctx.stroke();
    const xmin=-4, xmax=5;
    const X = x=> pad + (x-xmin)/(xmax-xmin)*(W-2*pad);
    const nomMu=0, nomS=1;
    const advMu=nomMu+1.6*rho, advS=nomS+0.9*rho;
    const Y = d=> H-28 - d*(H-70)/0.42;
    function curve(mu,s,color,fill){
      ctx.beginPath();
      for(let i=0;i<=200;i++){ const x=xmin+i*(xmax-xmin)/200; const y=Y(density(x,mu,s)); i?ctx.lineTo(X(x),y):ctx.moveTo(X(x),y); }
      ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke();
      if(fill){ ctx.lineTo(X(xmax),H-28); ctx.lineTo(X(xmin),H-28); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); }
    }
    curve(nomMu,nomS,C.blue,'rgba(61,106,143,.10)');
    curve(advMu,advS,C.accent,'rgba(122,46,46,.10)');
    // Wasserstein "budget" arrow
    ctx.strokeStyle=C.ink3; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(X(nomMu),46); ctx.lineTo(X(advMu),46); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=C.ink3; ctx.font='11px Inter,sans-serif';
    if(rho>0.02) ctx.fillText('W-distance ≤ ε', (X(nomMu)+X(advMu))/2-34, 40);
    ctx.fillStyle=C.blue; ctx.fillText('nominal model P₀', X(nomMu)-46, 66);
    ctx.fillStyle=C.accent; ctx.fillText('worst-case P*', X(advMu)+8, 82);
    // robust value readout
    const val = (1.00 - 0.55*rho).toFixed(2);
    ctx.fillStyle=C.ink2; ctx.font='12px Inter,sans-serif';
    ctx.fillText('robust value J(θ) = '+val, W-pad-140, 28);
    lbl.textContent = 'ε = '+rho.toFixed(2);
  }
  slider.addEventListener('input',draw);
  window.addEventListener('resize',draw);
  draw();
})();

/* ---------- 2. McKean–Vlasov generative transport ---------- */
(function(){
  const cv = setupCanvas('toy-mkv', 240); if(!cv) return;
  const slider = document.getElementById('toy-mkv-t');
  const chk = document.getElementById('toy-mkv-law');
  const lbl = document.getElementById('toy-mkv-lbl');
  const rng = mulberry32(7); const N=260;
  const pts = Array.from({length:N},()=>({a:gauss(rng)*0.5, b:gauss(rng)*0.5, ph:rng()}));
  function draw(){
    const ctx = cv._resize();
    const W = cv.clientWidth, H=240, pad=30;
    const t = parseFloat(slider.value), law = chk.checked;
    ctx.clearRect(0,0,W,H);
    const X = u=> pad + u*(W-2*pad), Y = v=> H-30 - v*(H-60)/3;
    // target law curve (arch)
    ctx.strokeStyle=C.grey; ctx.lineWidth=1.5; ctx.beginPath();
    for(let i=0;i<=100;i++){ const u=i/100; const y=2.6*Math.sin(Math.PI*u); i?ctx.lineTo(X(u),Y(y)):ctx.moveTo(X(u),Y(y)); }
    ctx.stroke();
    ctx.fillStyle=C.ink3; ctx.font='11px Inter,sans-serif';
    ctx.fillText('prescribed law (marginals)', W/2-62, 24);
    // particles: interpolate source (left, y≈0) to target (right, y≈0) along arch
    for(const p of pts){
      const jitterX = 0.05*p.a, jitterY = 0.28*p.b;
      const u = Math.min(1,Math.max(0, t + jitterX));
      let y;
      if(law){ y = 2.6*Math.sin(Math.PI*u) + jitterY*0.55; }
      else   { y = 2.6*Math.sin(Math.PI*Math.min(1,t*1.0+0.0))* (0.25+0.3*p.ph) + jitterY; }
      const x = u;
      ctx.beginPath();
      ctx.arc(X(x), Y(y), 2.2, 0, 7);
      ctx.fillStyle = law ? 'rgba(122,46,46,.55)' : 'rgba(61,106,143,.5)';
      ctx.fill();
    }
    lbl.textContent = 't = '+t.toFixed(2);
  }
  slider.addEventListener('input',draw);
  chk.addEventListener('change',draw);
  window.addEventListener('resize',draw);
  draw();
})();

/* ---------- 3. Queue-reactive LOB simulator ---------- */
(function(){
  const cv = setupCanvas('toy-qrm', 260); if(!cv) return;
  const btn = document.getElementById('toy-qrm-btn');
  const exe = document.getElementById('toy-qrm-exec');
  let running=true, tick=0;
  const rng = mulberry32(42);
  let mid=100.0, tickSz=0.01;
  let bids=[14,9,6], asks=[12,8,5]; // queue sizes at 3 levels
  const midHist=[mid];
  function step(){
    tick++;
    // queue-reactive dynamics: arrival intensities depend on queue sizes
    for(let i=0;i<3;i++){
      const lam = 1.4/(1+0.12*bids[i]);
      if(rng()<0.35*lam) bids[i]+=1;
      if(rng()<0.30 && bids[i]>0) bids[i]-=1;
      const lam2 = 1.4/(1+0.12*asks[i]);
      if(rng()<0.35*lam2) asks[i]+=1;
      if(rng()<0.30 && asks[i]>0) asks[i]-=1;
    }
    if(bids[0]===0){ mid-=tickSz; bids.shift(); bids.push(5+Math.floor(rng()*8)); }
    if(asks[0]===0){ mid+=tickSz; asks.shift(); asks.push(5+Math.floor(rng()*8)); }
    midHist.push(mid); if(midHist.length>340) midHist.shift();
  }
  function draw(){
    const ctx = cv._resize();
    const W=cv.clientWidth, H=260;
    ctx.clearRect(0,0,W,H);
    // LOB on left
    const lw = Math.min(230, W*0.4), x0=16, yMid=70, bh=14;
    ctx.font='11px Inter,sans-serif';
    for(let i=0;i<3;i++){
      ctx.fillStyle='rgba(61,106,143,.75)';
      ctx.fillRect(x0+lw/2 - bids[i]*4, yMid+8+i*(bh+4), bids[i]*4, bh);
      ctx.fillStyle='rgba(122,46,46,.75)';
      ctx.fillRect(x0+lw/2, yMid-8-(i+1)*(bh+4)+4, asks[i]*4, bh);
    }
    ctx.fillStyle=C.ink3;
    ctx.fillText('bids', x0+lw/2-40, yMid+8+3*(bh+4)+12);
    ctx.fillText('asks', x0+lw/2+16, yMid-8-3*(bh+4)-4);
    ctx.strokeStyle=C.rule; ctx.beginPath(); ctx.moveTo(x0+lw/2, 16); ctx.lineTo(x0+lw/2, 170); ctx.stroke();
    ctx.fillStyle=C.ink2; ctx.fillText('limit order book (queue sizes)', x0, 190);
    // mid price on right
    const px0=x0+lw+26, pw=W-px0-16, py0=24, ph=150;
    const mn=Math.min(...midHist)-0.01, mx=Math.max(...midHist)+0.01;
    ctx.strokeStyle=C.rule; ctx.strokeRect(px0,py0,pw,ph);
    ctx.beginPath();
    midHist.forEach((m,i)=>{ const x=px0+i/(340-1)*pw; const y=py0+ph-(m-mn)/(mx-mn)*ph; i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.strokeStyle=C.blue; ctx.lineWidth=1.6; ctx.stroke(); ctx.lineWidth=1;
    ctx.fillStyle=C.ink2; ctx.fillText('mid price  '+mid.toFixed(2), px0, 190);
  }
  function loop(){ if(running){ step(); draw(); } requestAnimationFrame(loop); }
  btn.addEventListener('click',()=>{ running=!running; btn.textContent=running?'Pause':'Run'; });
  exe.addEventListener('click',()=>{ // market sell order walks the bid side
    let q=12; for(let i=0;i<3&&q>0;i++){ const take=Math.min(q,bids[i]); bids[i]-=take; q-=take; }
    if(bids[0]===0){ mid-=tickSz; bids.shift(); bids.push(5+Math.floor(rng()*8)); }
  });
  window.addEventListener('resize',draw);
  loop();
})();

/* ---------- 4. Hidden-regime Hawkes process ---------- */
(function(){
  const cv = setupCanvas('toy-hawkes', 240); if(!cv) return;
  const chk = document.getElementById('toy-hawkes-reveal');
  const btn = document.getElementById('toy-hawkes-new');
  let seed=11;
  let lam, regimes, events;
  function simulate(){
    const rng = mulberry32(seed);
    const T=600, dt=1;
    lam=[]; regimes=[]; events=[];
    let regime=0, l=0.02, base=[0.02,0.10];
    let nextSwitch=120+rng()*160;
    for(let t=0;t<T;t++){
      if(t>nextSwitch){ regime=1-regime; nextSwitch=t+120+rng()*180; }
      l = l + 0.25*(base[regime]-l);
      if(rng()<l){ events.push(t); l+=0.06; }
      lam.push(l); regimes.push(regime);
    }
  }
  function draw(){
    const ctx = cv._resize();
    const W=cv.clientWidth, H=240, pad=30;
    ctx.clearRect(0,0,W,H);
    const T=lam.length;
    const X=t=>pad+t/T*(W-2*pad);
    const mx=Math.max(...lam);
    const Y=v=>H-52-(v/mx)*(H-100);
    // regime shading
    if(chk.checked){
      for(let t=0;t<T;t++) if(regimes[t]===1){ ctx.fillStyle='rgba(122,46,46,.07)'; ctx.fillRect(X(t),20,(W-2*pad)/T+0.5,H-72); }
    }
    // events
    ctx.strokeStyle='rgba(61,106,143,.35)';
    events.forEach(t=>{ ctx.beginPath(); ctx.moveTo(X(t),H-50); ctx.lineTo(X(t),H-38); ctx.stroke(); });
    // intensity
    ctx.beginPath();
    lam.forEach((v,t)=>{ t?ctx.lineTo(X(t),Y(v)):ctx.moveTo(X(t),Y(v)); });
    ctx.strokeStyle=C.blue; ctx.lineWidth=1.6; ctx.stroke(); ctx.lineWidth=1;
    ctx.fillStyle=C.ink3; ctx.font='11px Inter,sans-serif';
    ctx.fillText('order-flow intensity λ(t)  ·  ticks = trade events', pad, 16);
    ctx.fillStyle=C.ink2;
    ctx.fillText(chk.checked ? 'shaded: hidden liquidity regime (revealed)' : 'the trader only sees λ(t) and events — the regime is hidden', pad, H-16);
  }
  chk.addEventListener('change',draw);
  btn.addEventListener('click',()=>{ seed+=1; simulate(); draw(); });
  window.addEventListener('resize',draw);
  simulate(); draw();
})();

/* ---------- 5. Optimal execution: TWAP vs a schedule that tilts with the trend ---------- */
(function(){
  const cv = setupCanvas('toy-exec', 270); if(!cv) return;
  const sel = document.getElementById('toy-exec-drift');
  const btn = document.getElementById('toy-exec-new');
  const N = 180, W_BAND = 0.2, LOOK = 30, THR = 3.0, SIGMA = 0.8, MU = 0.12;
  let seed = 7, prog = 0, hold = 0, sim = null;
  function simulate(){
    const rng = mulberry32(seed*7919+13);
    let d = sel.value; if(d==='random') d = rng()<0.5 ? 'up' : 'down';
    const mu = d==='up' ? MU : d==='down' ? -MU : 0;
    const p = [100]; for(let k=1;k<=N;k++) p.push(p[k-1] + mu + SIGMA*gauss(rng));
    // TWAP: 1/N of the order per step. Tilted: rate multiplier 2 / 1 / 0 from the trailing move,
    // cumulative executed fraction kept inside a corridor around the TWAP schedule that closes on 1.
    const twap=[0], tilt=[0];
    let cT=0, cA=0, costT=0, costA=0;
    const costTw=[0], costTl=[0];
    for(let k=1;k<=N;k++){
      cT = k/N; const qT = cT - twap[k-1];
      const trail = k>LOOK ? p[k-1]-p[k-1-LOOK] : 0;
      const m = trail>THR ? 2 : (trail<-THR ? 0 : 1);
      const s = k/N;
      const lo = Math.max(0, s-W_BAND, 1-2*(1-s)), hi = Math.min(1, s+W_BAND);
      cA = Math.min(Math.max(cA + m/N, lo), Math.max(lo,hi));
      if(k===N) cA = 1;
      const qA = cA - tilt[k-1];
      twap.push(cT); tilt.push(cA);
      costT += qT*(p[k]-p[0]); costA += qA*(p[k]-p[0]);
      costTw.push(costT); costTl.push(costA);
    }
    sim = {p, twap, tilt, costTw, costTl, d};
  }
  function draw(){
    const ctx = cv._resize();
    const Wd = cv.clientWidth, H = 270, pad = 34;
    ctx.clearRect(0,0,Wd,H);
    const k = Math.max(1, Math.min(N, Math.floor(prog*N)));
    const X = i => pad + i/N*(Wd-2*pad);
    // price panel
    const t0=14, t1=128;
    const mn = Math.min(...sim.p)-1, mx = Math.max(...sim.p)+1;
    const Yp = v => t1 - (v-mn)/(mx-mn)*(t1-t0);
    ctx.strokeStyle=C.rule; ctx.lineWidth=1; ctx.strokeRect(pad,t0,Wd-2*pad,t1-t0);
    ctx.setLineDash([4,4]); ctx.strokeStyle=C.ink3; ctx.beginPath(); ctx.moveTo(pad,Yp(sim.p[0])); ctx.lineTo(Wd-pad,Yp(sim.p[0])); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); for(let i=0;i<=k;i++){ const x=X(i), y=Yp(sim.p[i]); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.strokeStyle=C.blue; ctx.lineWidth=1.7; ctx.stroke();
    ctx.fillStyle=C.ink3; ctx.font='11px Inter,sans-serif'; ctx.fillText('mid price (arrival level dashed)', pad+6, t0+13);
    // executed-fraction panel
    const b0=150, b1=232;
    const Ye = v => b1 - v*(b1-b0);
    ctx.strokeStyle=C.rule; ctx.strokeRect(pad,b0,Wd-2*pad,b1-b0);
    // corridor
    ctx.beginPath();
    for(let i=0;i<=N;i++){ const s=i/N, hi=Math.min(1,s+W_BAND); const x=X(i), y=Ye(hi); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    for(let i=N;i>=0;i--){ const s=i/N, lo=Math.max(0,s-W_BAND,1-2*(1-s)); ctx.lineTo(X(i),Ye(lo)); }
    ctx.closePath(); ctx.fillStyle='rgba(61,106,143,.07)'; ctx.fill();
    ctx.setLineDash([4,4]); ctx.strokeStyle=C.ink3; ctx.beginPath(); ctx.moveTo(X(0),Ye(0)); ctx.lineTo(X(N),Ye(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); for(let i=0;i<=k;i++){ const x=X(i), y=Ye(sim.tilt[i]); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.strokeStyle=C.accent; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle=C.ink3; ctx.fillText('executed fraction: TWAP (dashed), tilted schedule (red), corridor (shaded)', pad+6, b0+13);
    ctx.fillText('time  →', Wd-pad-40, b1+16);
    // readout: average price paid minus arrival, per share, in price units (lower is better)
    const cT = sim.costTw[k]/Math.max(sim.twap[k],1e-9), cA = sim.costTl[k]/Math.max(sim.tilt[k],1e-9);
    ctx.fillStyle=C.ink2; ctx.font='12px Inter,sans-serif';
    const txt = 'avg. price paid − arrival:  TWAP '+cT.toFixed(1)+'   tilted '+cA.toFixed(1);
    ctx.fillText(txt, pad, H-8);
  }
  function loop(){
    if(prog<1){ prog = Math.min(1, prog+0.0035); }
    else if(++hold>150){ seed++; hold=0; prog=0; simulate(); }
    draw(); requestAnimationFrame(loop);
  }
  function restart(){ hold=0; prog=0; simulate(); draw(); }
  sel.addEventListener('change', restart);
  btn.addEventListener('click', ()=>{ seed++; restart(); });
  window.addEventListener('resize', draw);
  simulate(); draw(); loop();
})();
})();
