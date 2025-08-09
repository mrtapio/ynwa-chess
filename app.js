// Utilities
const $ = (id)=>document.getElementById(id);
const fmt = (ms)=>{ if(ms<0) ms=0; const s=Math.floor(ms/1000), m=Math.floor(s/60), sec=String(s%60).padStart(2,'0'); const t=Math.floor((ms%1000)/100); return s<20? `${m}:${sec}.${t}` : `${m}:${sec}`; };
function escapeHtml(str){ return str.replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

// Player labels
let labelMap = {
  w:{K:"VIRGIL van DIJK (C)", Q:"MO SALAH", R:"TAA / ROBBO", B:"Mac A / Szobo", N:"NÚÑEZ / JOTA", P:"AKADEMIET"},
  b:{K:"STEVEN GERRARD", Q:"SADIO MANÉ", R:"CARRA / HYYPIÄ", B:"XABI / HENDERSON", N:"TORRES / OWEN", P:"BOOT ROOM"}
};

function svgPiece({color, type}){
  const base = color==='w' ? '#c8102e' : '#f6f6f6';
  const text = color==='w' ? '#ffffff' : '#c8102e';
  const ring = color==='w' ? '#ffd100' : '#99162b';
  const label = (labelMap[color] && labelMap[color][type]) || type;
  const title = ({K:'KONGE',Q:'DRONNING',R:'TÅRN',B:'LØPER',N:'SPRINGER',P:'BONDE'})[type] || type;
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'>
    <defs><radialGradient id='g' cx='50%' cy='40%'><stop offset='0%' stop-color='${color==='w'?'#ff8593':'#ffffff'}'/><stop offset='65%' stop-color='${base}'/><stop offset='100%' stop-color='${color==='w'?'#7f0a19':'#d9d9d9'}'/></radialGradient></defs>
    <circle cx='50' cy='50' r='46' fill='url(#g)' stroke='${color==='w' ? '#8a0f20' : '#cfcfcf'}' stroke-width='3'/>
    <circle cx='50' cy='50' r='40' fill='none' stroke='${ring}' stroke-width='2' stroke-dasharray='3 3' opacity='.9'/>
    <text x='50' y='34' text-anchor='middle' font-family='Segoe UI, Roboto, system-ui' font-size='14' font-weight='700' fill='${text}'>${title}</text>
    <foreignObject x='12' y='42' width='76' height='50'>
      <div xmlns='http://www.w3.org/1999/xhtml' style='width:76px;height:50px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:Segoe UI, Roboto, system-ui;font-weight:800;font-size:12px;line-height:1.05;color:${text};'>
        <div>${escapeHtml(label).slice(0,36)}</div>
      </div>
    </foreignObject>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
window.themeImage = function(code){ const color=code[0]==='w'?'w':'b'; const type=code[1].toUpperCase(); return svgPiece({color,type}); };

function applyPreset(name){
  if(name==='modern'){
    labelMap = {
      w:{K:"VIRGIL van DIJK (C)", Q:"MO SALAH", R:"TAA / ROBBO", B:"Mac A / Szobo", N:"NÚÑEZ / JOTA", P:"AKADEMIET"},
      b:{K:"STEVEN GERRARD", Q:"SADIO MANÉ", R:"CARRA / HYYPIÄ", B:"XABI / HENDERSON", N:"TORRES / OWEN", P:"BOOT ROOM"}
    };
  }else if(name==='legendsFirst'){
    labelMap = {
      w:{K:"STEVEN GERRARD", Q:"KENNY DALGLISH", R:"CARRA / HYYPIÄ", B:"XABI / S.GERRARD", N:"TORRES / SUÁREZ", P:"BOOT ROOM"},
      b:{K:"VIRGIL van DIJK (C)", Q:"MO SALAH", R:"TAA / ROBBO", B:"Mac A / Szobo", N:"NÚÑEZ / JOTA", P:"AKADEMIET"}
    };
  }else{
    labelMap = { w:{K:"KAPTEIN",Q:"PLAYMAKER",R:"BACKER",B:"MIDTBANE",N:"ANGRIPER",P:"REKRUTT"}, b:{K:"KAPTEIN",Q:"PLAYMAKER",R:"BACKER",B:"MIDTBANE",N:"ANGRIPER",P:"REKRUTT"} };
  }
  if(window.board && window.game){ board.position(game.fen(), false); }
}

// Size board
function sizeBoardDiv(){
  const pad = 24;
  const max = 680;
  const size = Math.min(window.innerWidth - pad, max);
  const el = $('board');
  el.style.width = size + 'px';
  el.style.height = size + 'px';
}

// Clocks
let baseMin=5, inc=3, wTime=baseMin*60*1000, bTime=baseMin*60*1000, running=false, tick=null;
function resetClocks(){ wTime=baseMin*60*1000; bTime=baseMin*60*1000; $('wTime').textContent=fmt(wTime); $('bTime').textContent=fmt(bTime); $('wBar').style.transform='scaleX(0)'; $('bBar').style.transform='scaleX(0)'; }
function start(){ running=true; tick && clearInterval(tick); tick=setInterval(()=>{
  if(game.game_over()){ running=false; clearInterval(tick); return; }
  if(game.turn()==='w'){ wTime-=100; } else { bTime-=100; }
  $('wTime').textContent=fmt(wTime); $('bTime').textContent=fmt(bTime);
  const tot=baseMin*60*1000; $('wBar').style.transform=`scaleX(${Math.max(0,Math.min(1,1-(wTime/(tot||1))))})`; $('bBar').style.transform=`scaleX(${Math.max(0,Math.min(1,1-(bTime/(tot||1))))})`;
  if(wTime<=0){ running=false; clearInterval(tick); $('status').textContent='Svart vinner på tid.'; }
  if(bTime<=0){ running=false; clearInterval(tick); $('status').textContent='Hvit vinner på tid.'; }
},100); maybeAIMoveAtStart(); }
function pause(){ running=false; tick && clearInterval(tick); }

// AI
function orderMoves(g,moves){ return moves.map(m=>{ const c=/x/.test(m.san), h=/\+/.test(m.san); return {m,w:(c?2:0)+(h?1:0)}; }).sort((a,b)=>b.w-a.w).map(x=>x.m); }
function evaluate(g){ if(g.in_checkmate()) return g.turn()==='w'? -99999:99999; if(g.in_draw()) return 0; const val={p:100,n:320,b:330,r:500,q:900,k:0}; let s=0; const bd=g.board(); const center=new Set(['d4','e4','d5','e5']); for(let r=0;r<8;r++){ for(let c=0;c<8;c++){ const cell=bd[r][c]; if(!cell) continue; const v=val[cell.type]||0; s+=cell.color==='w'?v:-v; const file=String.fromCharCode(97+c),rank=(8-r),sq=file+rank; if(center.has(sq)) s+=cell.color==='w'?3:-3; }} const mob=g.moves().length; s+=(g.turn()==='w'?mob:-mob)*0.1; return s; }
function negamax(g,d,a,b){ if(d===0||g.game_over()) return evaluate(g); let best=-Infinity; const ms=orderMoves(g,g.moves({verbose:true})); for(const mv of ms){ g.move(mv); const sc=-negamax(g,d-1,-b,-a); g.undo(); if(sc>best) best=sc; if(sc>a) a=sc; if(a>=b) break; } return best; }
function findBestMove(g,d){ let best=null,bestScore=-Infinity; const ms=orderMoves(g,g.moves({verbose:true})); for(const mv of ms){ g.move(mv); const sc=-negamax(g,d-1,-Infinity,Infinity); g.undo(); if(sc>bestScore){ bestScore=sc; best=mv; } } return best||ms[0]||null; }
function aiMoveSoon(){ setTimeout(()=>{ const depth=Math.max(1,Math.min(4,parseInt($('aiDepth').value||'2',10))); const best=findBestMove(game,depth); if(best){ const m=game.move(best); board.position(game.fen(), false); if(running){ if(m.color==='w'){ wTime+=inc*1000; } else { bTime+=inc*1000; } } updateMoves(); updateStatus(); } },120); }
function maybeAIMoveAtStart(){ if($('mode').value!=='ai') return; const side=$('aiSide').value; if((side==='white'&&game.turn()==='w')||(side==='black'&&game.turn()==='b')) aiMoveSoon(); }

// Moves/status
function afterLegalMove(m){ updateMoves(); updateStatus(); if(running){ if(m.color==='w'){ wTime+=inc*1000; } else { bTime+=inc*1000; } } }
function updateMoves(){ const hist=game.history(); const box=$('moves'); if(hist.length===0){ box.innerHTML='<div style="opacity:.8">Trekk vil vises her…</div>'; return; } let out=''; for(let i=0;i<hist.length;i++){ if(i%2===0){ out += `<span>${(i/2)+1}.</span>`; } out += `<span>${hist[i]}</span>`; } box.innerHTML=out; }
function updateStatus(){ const s=$('status'); if(game.game_over()){ if(game.in_checkmate()) s.textContent=(game.turn()==='w'?'Svart':'Hvit')+' vant (sjakkmatt).'; else if(game.in_stalemate()) s.textContent='Patt (uavgjort).'; else if(game.in_draw()) s.textContent='Uavgjort.'; else s.textContent='Spillet er slutt.'; running=false; } else { s.textContent=(game.turn()==='w'?'Hvit':'Svart')+(game.in_check()?' i trekket (sjakk)':' i trekket')+'.'; } }

// Init
let game=null, board=null;
function initGame(){
  sizeBoardDiv();
  window.addEventListener('resize', ()=>{ sizeBoardDiv(); if(board) board.resize(); });
  try{
    game = new window.Chess();
    board = window.Chessboard('board', {
      draggable: true,
      position: 'start',
      pieceTheme: window.themeImage,
      onDrop: (source, target)=>{
        const move = game.move({from:source,to:target,promotion:'q'});
        if(move===null){ return 'snapback'; }
        afterLegalMove(move);
        if($('mode').value==='ai' && !game.game_over()){ aiMoveSoon(); }
      }
    });
  }catch(e){
    console.error(e);
    $('fallback').style.display='block';
  }

  // controls
  $('startBtn').onclick = start;
  $('pauseBtn').onclick = pause;
  $('newBtn').onclick = ()=>{ pause(); game.reset(); board.start(); updateMoves(); updateStatus(); resetClocks(); };
  $('flipBtn').onclick = ()=>{ board.flip(); };
  $('undoBtn').onclick = ()=>{ if($('mode').value==='ai'){ if(game.history().length>=2){ game.undo(); game.undo(); } } else { game.undo(); } board.position(game.fen(), false); updateMoves(); updateStatus(); };
  $('drawBtn').onclick = ()=>{ pause(); $('status').textContent='Uavgjort etter avtale.'; };
  $('resignBtn').onclick = ()=>{ pause(); $('status').textContent=(game.turn()==='w'?'Hvit':'Svart')+' resignerte.'; };
  $('pgnBtn').onclick = ()=>{ const pgn=game.pgn(); navigator.clipboard && navigator.clipboard.writeText(pgn).then(()=>alert('PGN kopiert.')); };
  $('preset').onchange = (e)=>{ const map={"1+0":[1,0],"3+2":[3,2],"5+3":[5,3],"10+0":[10,0],"15+10":[15,10],"30+0":[30,0]}; const v=e.target.value; if(map[v]){ baseMin=map[v][0]; inc=map[v][1]; $('initMin').value=baseMin; $('increment').value=inc; resetClocks(); } };
  $('initMin').onchange = (e)=>{ baseMin=Math.max(1,parseInt(e.target.value||'5',10)); resetClocks(); };
  $('increment').onchange = (e)=>{ inc=Math.max(0,parseInt(e.target.value||'0',10)); };
  $('mode').onchange = ()=>{ const ai = $('mode').value==='ai'; $('aiRow1').style.display = ai?'':'none'; $('aiRow2').style.display = ai?'':'none'; pause(); game.reset(); board.start(); updateMoves(); updateStatus(); resetClocks(); };
  $('aiSide').onchange = ()=>{ pause(); game.reset(); board.start(); updateMoves(); updateStatus(); resetClocks(); };
  $('setSelect').onchange = (e)=>applyPreset(e.target.value);
  $('applyLabels').onclick = ()=>{ labelMap.w.K=$('labelK').value||labelMap.w.K; labelMap.w.Q=$('labelQ').value||labelMap.w.Q; labelMap.w.R=$('labelR').value||labelMap.w.R; labelMap.w.B=$('labelB').value||labelMap.w.B; labelMap.w.N=$('labelN').value||labelMap.w.N; labelMap.w.P=$('labelP').value||labelMap.w.P; board.position(game.fen(), false); };

  resetClocks(); updateStatus(); updateMoves(); applyPreset('modern');
}

window.addEventListener('load', ()=>{
  // If libs are already loaded in index.html scripts, just init
  if(window.Chess && window.Chessboard){ initGame(); }
  else{
    // fallback: dynamic load (shouldn't normally happen)
    const s1 = document.createElement('script'); s1.src='https://unpkg.com/chess.js@1.0.0/dist/chess.min.js';
    const s2 = document.createElement('script'); s2.src='https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js';
    s1.onload=()=>{ s2.onload=()=>initGame(); document.body.appendChild(s2); }; s1.onerror=()=>{$('fallback').style.display='block';}; s2.onerror=()=>{$('fallback').style.display='block';};
    document.body.appendChild(s1);
  }
});
