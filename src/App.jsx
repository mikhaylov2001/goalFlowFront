import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "./api";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const CATS = [
  { id: "work",     label: "Работа",      emoji: "💼", accent: "#6366F1" },
  { id: "health",   label: "Здоровье",    emoji: "💪", accent: "#10B981" },
  { id: "learn",    label: "Учёба",       emoji: "📖", accent: "#F97316" },
  { id: "personal", label: "Личное",      emoji: "🌟", accent: "#EC4899" },
  { id: "finance",  label: "Деньги",      emoji: "💰", accent: "#EAB308" },
  { id: "creative", label: "Творчество",  emoji: "🎨", accent: "#14B8A6" },
];

const PRIO = {
  high:   { l: "Важно",     c: "#EF4444", bg: "#FEF2F2", n: 0 },
  medium: { l: "Средне",    c: "#F59E0B", bg: "#FFFBEB", n: 1 },
  low:    { l: "Не срочно", c: "#22C55E", bg: "#F0FDF4", n: 2 },
};

const TPRIO = [
  { id: "high",   e: "🔴", l: "Важно",  c: "#EF4444" },
  { id: "medium", e: "🟡", l: "Средне", c: "#F59E0B" },
  { id: "low",    e: "🟢", l: "Обычно", c: "#22C55E" },
];

const HABIT_COLORS = ["#6366F1","#10B981","#F97316","#EC4899","#EAB308","#14B8A6","#EF4444","#8B5CF6"];
const EMOJI_LIST = ["💼","💪","📖","🌟","💰","🎨","🏃","💧","🧘","😴","🥗","🎯","✍️","🎸","🏠","✈️","🚗","💻","📱","🎓","🏖️","🎮","📚","🌍","☕","🎬"];
const MO_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const IDEA_TAGS = ["Все","Бизнес","Технологии","Творчество","Обучение","Личное","Другое"];
const IDEA_COLORS = ["#6366F1","#10B981","#F97316","#EC4899","#EAB308","#14B8A6","#EF4444","#8B5CF6"];

function fmtDate(d) { if (!d) return ""; return new Date(d).toLocaleDateString("ru-RU",{day:"numeric",month:"short"}); }
function fmtDateFull(d) { if (!d) return ""; return new Date(d).toLocaleDateString("ru-RU",{day:"numeric",month:"long"}); }
function daysLeft(d) {
  if (!d) return null;
  const t = new Date(d); t.setHours(0,0,0,0);
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t - n) / 864e5);
}
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function todayKey() { return dateKey(new Date()); }
function sameDay(a,b) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

function getWeekDays() {
  const now = new Date();
  const day = (now.getDay()+6)%7;
  const mon = new Date(now); mon.setDate(now.getDate()-day); mon.setHours(0,0,0,0);
  return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return dateKey(d); });
}

function monthDays(y,m) {
  const first=new Date(y,m,1); const last=new Date(y,m+1,0);
  const days=[]; const pad=(first.getDay()+6)%7;
  for(let i=pad-1;i>=0;i--) days.push({d:new Date(y,m,-i),cur:false});
  for(let i=1;i<=last.getDate();i++) days.push({d:new Date(y,m,i),cur:true});
  while(days.length<42){const n=days.length-pad-last.getDate()+1;days.push({d:new Date(y,m+1,n),cur:false});}
  return days;
}

function countTasks(tasks) {
  let total=0,done=0;
  (tasks||[]).forEach(t=>{total++;if(t.done)done++;const s=countTasks(t.children);total+=s.total;done+=s.done;});
  return {total,done};
}

/* ── API ── */
const BASE = import.meta.env?.VITE_API_URL || "";
async function apiFetch(path,options={}) {
  const res = await fetch(`${BASE}${path}`,{headers:{"Content-Type":"application/json"},...options});
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
async function loadData() {
  try {
    const [goals,habits,wishes] = await Promise.all([apiFetch("/api/goals"),apiFetch("/api/habits"),apiFetch("/api/wishes")]);
    return {goals,habits,wishes};
  } catch(e) { console.error("Load failed:",e); return {goals:[],habits:[],wishes:[]}; }
}

/* ── Styles ── */
const S = {
  field: { width:"100%",padding:"13px 16px",borderRadius:16,border:"1.5px solid #E8EDF5",fontSize:16,outline:"none",background:"#fff",color:"#0F172A",boxSizing:"border-box",transition:"border-color .2s" },
  lbl:   { display:"block",fontSize:11,fontWeight:800,color:"#94A3B8",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.06em" },
  ghostBtn: { background:"none",border:"none",fontSize:16,cursor:"pointer",padding:"6px 12px",borderRadius:10 },
};

const CSS_GLOBAL = `
  @keyframes sheetUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes pageIn    { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pop       { 0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)} }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  ::-webkit-scrollbar { display:none; }
  html,body { margin:0;padding:0;overscroll-behavior-y:none;background:#F8FAFC; }
  input,textarea,select,button { font-family:'Nunito',-apple-system,sans-serif;font-size:16px; }
  input:focus,textarea:focus { border-color:#6366F1 !important; }
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-width: 430px;
    margin: 0 auto;
    z-index: 100;
    background: #fff;
    border-top: 1px solid #F1F5F9;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.07);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .bottom-nav-inner {
    display: flex;
    justify-content: space-around;
    padding: 6px 0 4px;
  }
  .app-wrap {
    min-height: 100dvh;
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }
`;

/* ── Confetti ── */
function Confetti({active}) {
  const ref=useRef(null); const raf=useRef(null);
  useEffect(()=>{
    if(!active||!ref.current) return;
    const canvas=ref.current; const ctx=canvas.getContext("2d");
    canvas.width=canvas.offsetWidth*2; canvas.height=canvas.offsetHeight*2; ctx.scale(2,2);
    const W=canvas.offsetWidth; const H=canvas.offsetHeight;
    const cols=["#6366F1","#EC4899","#F97316","#10B981","#EAB308","#8B5CF6","#EF4444"];
    const particles=Array.from({length:70},()=>({x:W/2+(Math.random()-.5)*60,y:H*.4,vx:(Math.random()-.5)*14,vy:-Math.random()*18-4,sz:Math.random()*7+3,col:cols[Math.floor(Math.random()*cols.length)],rot:Math.random()*360,rs:(Math.random()-.5)*10,g:.4+Math.random()*.15,life:1,dec:.009+Math.random()*.006}));
    const animate=()=>{ctx.clearRect(0,0,W,H);let alive=false;particles.forEach(p=>{if(p.life<=0)return;alive=true;p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.98;p.rot+=p.rs;p.life-=p.dec;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle=p.col;ctx.fillRect(-p.sz/2,-p.sz/4,p.sz,p.sz/2);ctx.restore();});if(alive)raf.current=requestAnimationFrame(animate);};
    raf.current=requestAnimationFrame(animate);
    return()=>{if(raf.current)cancelAnimationFrame(raf.current);};
  },[active]);
  if(!active) return null;
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:9999,pointerEvents:"none",width:"100%",height:"100%"}}/>;
}

/* ── Ring ── */
function Ring({pct,size=50,stroke=4,color="#6366F1",children}) {
  const r=(size-stroke)/2; const c=2*Math.PI*r;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c*(1-clamp(pct,0,100)/100)} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{children}</div>
    </div>
  );
}

/* ── Sheet ── */
function Sheet({open,onClose,title,children}) {
  if(!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(8px)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:"#fff",borderRadius:"28px 28px 0 0",maxHeight:"92vh",overflow:"auto",padding:"0 20px calc(env(safe-area-inset-bottom,16px) + 20px)",animation:"sheetUp .32s cubic-bezier(.32,1.12,.36,1)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 6px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:"#E2E8F0"}}/>
        </div>
        {title && <h2 style={{margin:"6px 0 20px",fontSize:20,fontWeight:900}}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/* ── EmojiPick ── */
function EmojiPick({value,onChange}) {
  const [open,setOpen]=useState(false);
  return (
    <div>
      <button onClick={()=>setOpen(!open)} style={{height:48,paddingLeft:14,paddingRight:14,borderRadius:14,border:"1.5px solid #E8EDF5",background:value?"#EEF2FF":"#F8FAFC",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
        <span>{value||"😀"}</span>
        <span style={{fontSize:11,color:"#94A3B8",fontWeight:700}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{marginTop:8,background:"#fff",borderRadius:18,padding:12,border:"1.5px solid #F1F5F9",boxShadow:"0 8px 30px rgba(0,0,0,0.1)",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,zIndex:10,position:"relative"}}>
          {EMOJI_LIST.map(e=>(
            <button key={e} onClick={()=>{onChange(e);setOpen(false);}} style={{width:"100%",aspectRatio:"1",borderRadius:10,border:"none",background:value===e?"#EEF2FF":"#F8FAFC",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{e}</button>
          ))}
          <button onClick={()=>{onChange("");setOpen(false);}} style={{width:"100%",aspectRatio:"1",borderRadius:10,border:"none",background:"#FEF2F2",fontSize:14,cursor:"pointer",fontWeight:700,color:"#EF4444",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      )}
    </div>
  );
}

/* ── GoalForm ── */
function GoalForm({goal,onSave,onClose}) {
  const [f,sf]=useState(goal||{id:uid(),title:"",desc:"",cat:"work",prio:"medium",deadline:"",reward:"",tasks:[],done:false,created:new Date().toISOString()});
  const u=(k,v)=>sf(p=>({...p,[k]:v}));
  const un=(k,v)=>sf(p=>({...p,notif:{...p.notif,[k]:v}}));
  return (
    <>
      <input value={f.title} onChange={e=>u("title",e.target.value)} placeholder="Название цели"
        style={{width:"100%",fontSize:22,fontWeight:900,border:"none",padding:"4px 0",background:"transparent",outline:"none",color:"#0F172A",marginBottom:4}}/>
      <textarea value={f.desc} onChange={e=>u("desc",e.target.value)} placeholder="Описание (необязательно)"
        style={{width:"100%",minHeight:40,resize:"none",border:"none",padding:"4px 0",background:"transparent",fontSize:15,color:"#64748B",outline:"none",marginBottom:16,lineHeight:1.5}}/>

      <label style={S.lbl}>Категория</label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {CATS.map(c=>(
          <button key={c.id} onClick={()=>u("cat",c.id)} style={{padding:"11px 8px",borderRadius:16,border:f.cat===c.id?`2px solid ${c.accent}`:"2px solid #F1F5F9",background:f.cat===c.id?c.accent+"16":"#FAFAFA",fontSize:13,fontWeight:700,cursor:"pointer",color:f.cat===c.id?c.accent:"#94A3B8",textAlign:"center",transition:"all .15s"}}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <label style={S.lbl}>Приоритет</label>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {Object.entries(PRIO).map(([k,v])=>(
          <button key={k} onClick={()=>u("prio",k)} style={{flex:1,padding:"12px 0",borderRadius:14,border:f.prio===k?`2px solid ${v.c}`:"2px solid #F1F5F9",background:f.prio===k?v.bg:"#FAFAFA",fontSize:13,fontWeight:700,cursor:"pointer",color:f.prio===k?v.c:"#B0B8C4",transition:"all .15s"}}>{v.l}</button>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <div style={{flex:"1 1 0",minWidth:0}}>
          <label style={S.lbl}>Дедлайн 📅</label>
          <input type="date" value={f.deadline} onChange={e=>u("deadline",e.target.value)}
            style={{width:"100%",height:50,padding:"0 8px",borderRadius:16,border:"1.5px solid #E8EDF5",fontSize:13,outline:"none",background:"#fff",color:"#0F172A",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <div style={{flex:"1 1 0",minWidth:0}}>
          <label style={S.lbl}>Награда 🎁</label>
          <input value={f.reward} onChange={e=>u("reward",e.target.value)} placeholder="За победу!"
            style={{width:"100%",height:50,padding:"0 8px",borderRadius:16,border:"1.5px solid #E8EDF5",fontSize:14,outline:"none",background:"#fff",color:"#0F172A",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
      </div>

      <button onClick={()=>{if(f.title.trim()){onSave(f);onClose();}}} style={{width:"100%",padding:"17px 0",borderRadius:18,border:"none",background:f.title.trim()?"linear-gradient(135deg,#6366F1,#8B5CF6)":"#E2E8F0",color:f.title.trim()?"#fff":"#94A3B8",fontSize:16,fontWeight:800,cursor:f.title.trim()?"pointer":"default",boxShadow:f.title.trim()?"0 6px 20px rgba(99,102,241,.35)":"none",transition:"all .2s"}}>
        {goal?"Сохранить ✨":"Создать 🚀"}
      </button>
    </>
  );
}

/* ── GoalCard ── */
function GoalCard({g,onTap,onToggle}) {
  const cat=CATS.find(c=>c.id===g.cat)||CATS[0];
  const pri=PRIO[g.prio]||PRIO.medium;
  const {total,done}=countTasks(g.tasks);
  const pct=total>0?(done/total)*100:g.done?100:0;
  const dl=daysLeft(g.deadline);
  const overdue=dl!==null&&dl<0&&!g.done;
  return (
    <div onClick={onTap} style={{background:"#fff",borderRadius:22,overflow:"hidden",marginBottom:10,boxShadow:"0 2px 14px rgba(0,0,0,0.06)",opacity:g.done?.6:1,cursor:"pointer",animation:"fadeIn .3s ease"}}>
      <div style={{height:4,background:`linear-gradient(90deg,${cat.accent},${cat.accent}77)`}}/>
      <div style={{padding:"14px 16px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:48,height:48,borderRadius:15,background:cat.accent+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
            {g.done?"🎉":cat.emoji}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:6,background:pri.bg,color:pri.c}}>{pri.l}</span>
              {g.reward&&<span style={{fontSize:12}}>🎁</span>}
            </div>
            <div style={{fontSize:16,fontWeight:800,color:g.done?"#94A3B8":"#0F172A",textDecoration:g.done?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2}}>{g.title}</div>
            <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap",alignItems:"center"}}>
              {g.deadline&&(
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:overdue?"#FEE2E2":"#F1F5F9",color:overdue?"#DC2626":"#64748B"}}>
                  📅 {fmtDate(g.deadline)}{dl!==null&&!g.done&&<span style={{opacity:.7}}> · {overdue?`${Math.abs(dl)}д назад`:dl===0?"сегодня!":dl===1?"завтра":`${dl}д`}</span>}
                </span>
              )}
              {total>0&&<span style={{fontSize:11,fontWeight:700,color:done===total?"#10B981":"#94A3B8"}}>✅ {done}/{total}</span>}
            </div>
          </div>
          <div onClick={e=>{e.stopPropagation();onToggle(g.id);}} style={{width:36,height:36,borderRadius:12,flexShrink:0,border:g.done?"none":"2.5px solid #E2E8F0",background:g.done?`linear-gradient(135deg,${cat.accent},${cat.accent}BB)`:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,fontWeight:900,transition:"all .2s"}}>
            {g.done&&"✓"}
          </div>
        </div>
        {total>0&&(
          <div style={{marginTop:10,height:4,borderRadius:2,background:"#F1F5F9",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:2,width:`${pct}%`,background:`linear-gradient(90deg,${cat.accent},${cat.accent}99)`,transition:"width .5s"}}/>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── GoalDetail ── */
function GoalDetail({goal,onBack,onUpdate,onDelete,onConfetti,onEdit}) {
  const cat=CATS.find(c=>c.id===goal.cat)||CATS[0];
  const pri=PRIO[goal.prio]||PRIO.medium;
  const {total,done}=countTasks(goal.tasks);
  const pct=total>0?Math.round((done/total)*100):goal.done?100:0;
  const dl=daysLeft(goal.deadline);
  const [newTask,setNewTask]=useState("");
  const [newTP,setNewTP]=useState("medium");
  const [exp,setExp]=useState({});
  const [sortBy,setSortBy]=useState("priority");

  useEffect(()=>{
    if(total>0&&done===total&&!goal.done){const t=setTimeout(()=>{onUpdate({...goal,done:true});onConfetti();},400);return()=>clearTimeout(t);}
    if(total>0&&done<total&&goal.done){onUpdate({...goal,done:false});}
  },[total,done]);

  const addTask=async()=>{
    if(!newTask.trim())return;
    const tid=uid();
    try{await apiFetch("/api/tasks",{method:"POST",body:JSON.stringify({id:tid,goal_id:goal.id,title:newTask.trim(),prio:newTP})});}catch(e){console.error(e);}
    onUpdate({...goal,tasks:[...goal.tasks,{id:tid,title:newTask.trim(),done:false,prio:newTP,children:[]}]});
    setNewTask("");
  };

  const toggleTask=async(tid)=>{
    const tog=ts=>ts.map(t=>t.id===tid?{...t,done:!t.done,children:t.children.map(c=>({...c,done:!t.done}))}:{...t,children:tog(t.children)});
    const updated=tog(goal.tasks);
    const task=goal.tasks.find(t=>t.id===tid);
    if(task){try{await apiFetch(`/api/tasks/${tid}`,{method:"PUT",body:JSON.stringify({done:!task.done})});for(const c of task.children)await apiFetch(`/api/microtasks/${c.id}`,{method:"PUT",body:JSON.stringify({done:!task.done})});}catch(e){console.error(e);}}
    onUpdate({...goal,tasks:updated});
  };

  const toggleMicro=async(tid,mid)=>{
    const upd=ts=>ts.map(t=>{if(t.id===tid){const nc=t.children.map(c=>c.id===mid?{...c,done:!c.done}:c);const allDone=nc.length>0&&nc.every(c=>c.done);return{...t,children:nc,done:allDone};}return t;});
    const updated=upd(goal.tasks);
    const task=goal.tasks.find(t=>t.id===tid);
    const micro=task?.children.find(c=>c.id===mid);
    if(micro){try{await apiFetch(`/api/microtasks/${mid}`,{method:"PUT",body:JSON.stringify({done:!micro.done})});const nc=task.children.map(c=>c.id===mid?{...c,done:!c.done}:c);const allDone=nc.length>0&&nc.every(c=>c.done);if(allDone!==task.done)await apiFetch(`/api/tasks/${tid}`,{method:"PUT",body:JSON.stringify({done:allDone})});}catch(e){console.error(e);}}
    onUpdate({...goal,tasks:updated});
  };

  const deleteTask=async(tid)=>{try{await apiFetch(`/api/tasks/${tid}`,{method:"DELETE"});}catch(e){console.error(e);}onUpdate({...goal,tasks:goal.tasks.filter(t=>t.id!==tid)});};
  const addMicro=async(pid,title)=>{if(!title.trim())return;const mid=uid();try{await apiFetch("/api/microtasks",{method:"POST",body:JSON.stringify({id:mid,task_id:pid,title:title.trim()})});}catch(e){console.error(e);}onUpdate({...goal,tasks:goal.tasks.map(t=>t.id===pid?{...t,children:[...t.children,{id:mid,title:title.trim(),done:false}],done:false}:t)});};
  const setTPrio=async(tid,p)=>{try{await apiFetch(`/api/tasks/${tid}`,{method:"PUT",body:JSON.stringify({prio:p})});}catch(e){console.error(e);}onUpdate({...goal,tasks:goal.tasks.map(t=>t.id===tid?{...t,prio:p}:t)});};
  const renameTask=async(tid,newTitle)=>{if(!newTitle.trim())return;try{await apiFetch(`/api/tasks/${tid}`,{method:"PUT",body:JSON.stringify({title:newTitle.trim()})});}catch(e){console.error(e);}onUpdate({...goal,tasks:goal.tasks.map(t=>t.id===tid?{...t,title:newTitle.trim()}:t)});};
  const renameMicro=async(tid,mid,newTitle)=>{if(!newTitle.trim())return;try{await apiFetch(`/api/microtasks/${mid}`,{method:"PUT",body:JSON.stringify({title:newTitle.trim()})});}catch(e){console.error(e);}onUpdate({...goal,tasks:goal.tasks.map(t=>t.id===tid?{...t,children:t.children.map(c=>c.id===mid?{...c,title:newTitle.trim()}:c)}:t)});};

  const sorted=useMemo(()=>{const arr=[...goal.tasks];if(sortBy==="priority"){arr.sort((a,b)=>{const pa={high:0,medium:1,low:2}[a.prio||"medium"];const pb={high:0,medium:1,low:2}[b.prio||"medium"];if(pa!==pb)return pa-pb;return a.done===b.done?0:a.done?1:-1;});}return arr;},[goal.tasks,sortBy]);

  return (
    <div style={{animation:"pageIn .3s ease",minHeight:"100vh",background:"#F8FAFC"}}>
      <div style={{background:`linear-gradient(135deg,${cat.accent},${cat.accent}CC)`,padding:"calc(env(safe-area-inset-top,16px) + 8px) 20px 28px",color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:70,background:"rgba(255,255,255,0.08)"}}/>
        <div style={{position:"absolute",bottom:-20,left:-20,width:100,height:100,borderRadius:50,background:"rgba(255,255,255,0.06)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,position:"relative"}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",fontSize:18,cursor:"pointer",padding:"8px 14px",borderRadius:14,fontWeight:700,backdropFilter:"blur(8px)"}}>←</button>
          <div style={{flex:1}}/>
          <button onClick={()=>onEdit(goal)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",fontSize:14,cursor:"pointer",padding:"8px 14px",borderRadius:14,fontWeight:700,backdropFilter:"blur(8px)"}}>✏️ Изменить</button>
          <button onClick={()=>onDelete(goal.id)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:14,cursor:"pointer",padding:"8px 14px",borderRadius:14,fontWeight:700,backdropFilter:"blur(8px)"}}>🗑️</button>
        </div>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:30}}>{cat.emoji}</span>
            <span style={{fontSize:12,fontWeight:800,background:"rgba(255,255,255,0.22)",padding:"4px 12px",borderRadius:10,backdropFilter:"blur(4px)"}}>{cat.label}</span>
            <span style={{fontSize:12,fontWeight:800,background:"rgba(255,255,255,0.22)",padding:"4px 12px",borderRadius:10,backdropFilter:"blur(4px)"}}>{pri.l}</span>
          </div>
          <h1 style={{margin:"0 0 6px",fontSize:26,fontWeight:900,letterSpacing:"-0.03em",lineHeight:1.2}}>{goal.title}</h1>
          {goal.desc&&<p style={{margin:"0 0 16px",fontSize:14,opacity:.8,lineHeight:1.5}}>{goal.desc}</p>}
        </div>
        <div style={{display:"flex",gap:10,position:"relative"}}>
          <div style={{flex:1,background:"rgba(255,255,255,0.18)",borderRadius:18,padding:"14px 16px",backdropFilter:"blur(8px)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,opacity:.85}}>Прогресс</span>
              <span style={{fontSize:20,fontWeight:900}}>{pct}%</span>
            </div>
            <div style={{height:7,borderRadius:4,background:"rgba(255,255,255,0.25)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,width:`${pct}%`,background:"#fff",transition:"width .5s"}}/>
            </div>
            <div style={{fontSize:11,marginTop:6,opacity:.75,fontWeight:700}}>{done} из {total} задач</div>
          </div>
          {(goal.deadline||goal.reward)&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {goal.deadline&&(
                <div style={{background:"rgba(255,255,255,0.18)",borderRadius:14,padding:"10px 14px",textAlign:"center",backdropFilter:"blur(8px)"}}>
                  <div style={{fontSize:14,fontWeight:800}}>📅 {fmtDate(goal.deadline)}</div>
                  {dl!==null&&<div style={{fontSize:10,opacity:.75,marginTop:2}}>{dl<0?"просрочено!":dl===0?"сегодня!":dl===1?"завтра":`${dl} дн.`}</div>}
                </div>
              )}
              {goal.reward&&(
                <div style={{background:"rgba(255,255,255,0.18)",borderRadius:14,padding:"10px 14px",textAlign:"center",backdropFilter:"blur(8px)"}}>
                  <div style={{fontSize:13,fontWeight:800}}>🎁 {goal.reward}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{padding:"20px 16px 100px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:16,fontWeight:900}}>Задачи</span>
          <button onClick={()=>setSortBy(s=>s==="priority"?"default":"priority")} style={{background:sortBy==="priority"?`${cat.accent}18`:"#F8FAFC",border:"none",padding:"7px 14px",borderRadius:12,fontSize:12,fontWeight:700,cursor:"pointer",color:sortBy==="priority"?cat.accent:"#94A3B8"}}>
            {sortBy==="priority"?"🔽 По приоритету":"📋 По порядку"}
          </button>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:8}}>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="＋ Новая задача..."
            style={{flex:1,padding:"14px 16px",borderRadius:18,border:"2px solid #F1F5F9",fontSize:15,outline:"none",background:"#fff",color:"#0F172A",boxSizing:"border-box",transition:"border-color .2s"}}/>
          <button onClick={addTask} style={{width:52,height:52,borderRadius:16,border:"none",background:`linear-gradient(135deg,${cat.accent},${cat.accent}CC)`,color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 14px ${cat.accent}44`}}>+</button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {TPRIO.map(p=>(
            <button key={p.id} onClick={()=>setNewTP(p.id)} style={{padding:"6px 12px",borderRadius:50,border:newTP===p.id?`2px solid ${p.c}`:"2px solid #F1F5F9",background:newTP===p.id?p.c+"18":"#FAFAFA",fontSize:11,fontWeight:700,cursor:"pointer",color:newTP===p.id?p.c:"#B0B8C4"}}>{p.e} {p.l}</button>
          ))}
        </div>
        {goal.tasks.length===0?(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:52}}>📝</div>
            <div style={{fontSize:16,fontWeight:800,color:"#94A3B8",marginTop:8}}>Добавь задачу</div>
            <div style={{fontSize:13,color:"#CBD5E1",marginTop:4}}>Разбей цель на шаги</div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {sorted.map(task=>{
              const tp=TPRIO.find(p=>p.id===(task.prio||"medium"))||TPRIO[1];
              const isExp=!!exp[task.id];
              const cd=task.children.filter(c=>c.done).length;
              const ct=task.children.length;
              return <TaskItem key={task.id} task={task} tp={tp} accent={cat.accent} isExp={isExp} onToggleExp={()=>setExp(p=>({...p,[task.id]:!p[task.id]}))} onToggle={()=>toggleTask(task.id)} onToggleMicro={mid=>toggleMicro(task.id,mid)} onDelete={()=>deleteTask(task.id)} onAddMicro={t=>addMicro(task.id,t)} onSetPrio={p=>setTPrio(task.id,p)} onRenameTask={title=>renameTask(task.id,title)} onRenameMicro={(mid,title)=>renameMicro(task.id,mid,title)} cd={cd} ct={ct}/>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── TaskItem ── */
function TaskItem({task,tp,accent,isExp,onToggleExp,onToggle,onToggleMicro,onDelete,onAddMicro,onSetPrio,onRenameTask,onRenameMicro,cd,ct}) {
  const [micro,setMicro]=useState("");
  const [editing,setEditing]=useState(false);
  const [editVal,setEditVal]=useState(task.title);
  const [editMicro,setEditMicro]=useState(null);
  const [editMicroVal,setEditMicroVal]=useState("");
  const has=ct>0;
  const saveTitle=()=>{if(editVal.trim())onRenameTask(editVal.trim());setEditing(false);};
  const saveMicro=mid=>{if(editMicroVal.trim())onRenameMicro(mid,editMicroVal.trim());setEditMicro(null);};
  return (
    <div style={{background:"#fff",borderRadius:18,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.05)",opacity:task.done?.55:1}}>
      <div style={{height:3,background:tp.c}}/>
      <div style={{padding:"13px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div onClick={onToggle} style={{width:26,height:26,borderRadius:9,flexShrink:0,border:task.done?"none":`2px solid ${tp.c}55`,background:task.done?accent:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:900,transition:"all .2s"}}>
            {task.done&&"✓"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            {editing?(
              <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={saveTitle} onKeyDown={e=>e.key==="Enter"&&saveTitle()}
                style={{width:"100%",fontSize:15,fontWeight:700,border:"none",borderBottom:`2px solid ${accent}`,outline:"none",padding:"2px 0",background:"transparent"}}/>
            ):(
              <div onClick={()=>{setEditing(true);setEditVal(task.title);}} style={{fontSize:15,fontWeight:700,textDecoration:task.done?"line-through":"none",color:task.done?"#B0B8C4":"#1E293B",cursor:"text"}}>{task.title}</div>
            )}
          </div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            {TPRIO.map(p=>(
              <div key={p.id} onClick={()=>onSetPrio(p.id)} style={{width:14,height:14,borderRadius:7,cursor:"pointer",background:task.prio===p.id?p.c:"#F1F5F9",border:task.prio===p.id?"none":"1px solid #E2E8F0",transition:"background .15s"}}/>
            ))}
          </div>
          <button onClick={onDelete} style={{background:"none",border:"none",color:"#D1D5DB",fontSize:14,cursor:"pointer",padding:2,flexShrink:0,lineHeight:1}}>✕</button>
        </div>
        {has&&(
          <div onClick={onToggleExp} style={{display:"flex",alignItems:"center",gap:6,marginTop:7,marginLeft:36,cursor:"pointer"}}>
            <div style={{display:"flex",gap:3}}>
              {task.children.map(c=><div key={c.id} style={{width:7,height:7,borderRadius:4,background:c.done?"#10B981":"#E2E8F0",transition:"background .2s"}}/>)}
            </div>
            <span style={{fontSize:11,fontWeight:700,color:cd===ct&&ct>0?"#10B981":"#94A3B8"}}>{cd}/{ct} {isExp?"▲":"▼"}</span>
          </div>
        )}
        {!has&&!task.done&&(
          <div onClick={onToggleExp} style={{marginLeft:36,marginTop:5,fontSize:11,color:"#CBD5E1",cursor:"pointer",fontWeight:700}}>{isExp?"Скрыть":"+ подзадачи"}</div>
        )}
      </div>
      {isExp&&(
        <div style={{padding:"0 14px 12px",borderTop:"1px solid #F8FAFC"}}>
          {task.children.map(ch=>(
            <div key={ch.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0 8px 36px",borderBottom:"1px solid #FAFAFA"}}>
              <div onClick={()=>onToggleMicro(ch.id)} style={{width:20,height:20,borderRadius:6,flexShrink:0,border:ch.done?"none":"2px solid #E2E8F0",background:ch.done?"#10B981":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:900,transition:"all .2s"}}>{ch.done&&"✓"}</div>
              {editMicro===ch.id?(
                <input autoFocus value={editMicroVal} onChange={e=>setEditMicroVal(e.target.value)} onBlur={()=>saveMicro(ch.id)} onKeyDown={e=>e.key==="Enter"&&saveMicro(ch.id)}
                  style={{flex:1,fontSize:14,border:"none",borderBottom:`2px solid ${accent}`,outline:"none",padding:"2px 0",background:"transparent"}}/>
              ):(
                <span onClick={()=>{setEditMicro(ch.id);setEditMicroVal(ch.title);}} style={{flex:1,fontSize:14,fontWeight:600,color:ch.done?"#B0B8C4":"#475569",textDecoration:ch.done?"line-through":"none",cursor:"text"}}>{ch.title}</span>
              )}
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:8,marginLeft:36}}>
            <input value={micro} onChange={e=>setMicro(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onAddMicro(micro);setMicro("");}}} placeholder="＋ Подзадача..."
              style={{flex:1,padding:"9px 12px",borderRadius:12,border:"1.5px solid #F1F5F9",fontSize:14,outline:"none",background:"#F8FAFC",color:"#0F172A",boxSizing:"border-box"}}/>
            <button onClick={()=>{onAddMicro(micro);setMicro("");}} style={{width:36,height:36,borderRadius:10,border:"none",background:"#F1F5F9",color:accent,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── HabitsPage ── */
function HabitsPage({habits,onUpdate}) {
  const [sheet,setSheet]=useState(false);
  const [editH,setEditH]=useState(null);
  const week=useMemo(()=>getWeekDays(),[]);
  const tk=todayKey();
  const todayDone=habits.filter(h=>h.logs&&h.logs[tk]).length;

  const toggleDay=async(id,dk)=>{
    try{
      const res=await apiFetch(`/api/habits/${id}/toggle`,{method:"POST",body:JSON.stringify({date:dk})});
      onUpdate(habits.map(h=>{if(h.id!==id)return h;const logs={...h.logs};if(logs[dk])delete logs[dk];else logs[dk]=true;return{...h,logs,streak:res.streak};}));
    }catch(e){console.error(e);}
  };

  const saveH=async(h)=>{
    try{
      const ex=habits.find(x=>x.id===h.id);
      if(ex){await apiFetch(`/api/habits/${h.id}`,{method:"PUT",body:JSON.stringify({title:h.title,emoji:h.emoji,color:h.color,streak:ex.streak||0})});onUpdate(habits.map(x=>x.id===h.id?{...x,title:h.title,emoji:h.emoji,color:h.color}:x));}
      else{await apiFetch("/api/habits",{method:"POST",body:JSON.stringify(h)});onUpdate([...habits,{...h,logs:{},streak:0}]);}
    }catch(e){console.error(e);}
    setSheet(false);setEditH(null);
  };

  const delH=async(id)=>{try{await apiFetch(`/api/habits/${id}`,{method:"DELETE"});}catch(e){console.error(e);}onUpdate(habits.filter(x=>x.id!==id));};

  return (
    <div>
      {/* Today summary */}
      <div style={{background:"linear-gradient(135deg,#10B981,#059669)",borderRadius:22,padding:"18px 20px",marginBottom:14,color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,opacity:.85,fontWeight:600,marginBottom:4}}>Сегодня</div>
            <div style={{fontSize:26,fontWeight:900}}>{todayDone} из {habits.length} ✓</div>
            <div style={{fontSize:12,opacity:.75,marginTop:2}}>
              {todayDone===habits.length&&habits.length>0?"🎉 Все выполнено!":todayDone===0?"Начни прямо сейчас":"Так держать!"}
            </div>
          </div>
          <button onClick={()=>{setEditH(null);setSheet(true);}} style={{width:48,height:48,borderRadius:16,border:"none",background:"rgba(255,255,255,0.22)",color:"#fff",fontSize:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>+</button>
        </div>
        {habits.length>0&&(
          <div style={{marginTop:14,height:6,borderRadius:3,background:"rgba(255,255,255,0.3)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:3,background:"#fff",width:`${(todayDone/habits.length)*100}%`,transition:"width .5s"}}/>
          </div>
        )}
      </div>

      {habits.length===0?(
        <div style={{textAlign:"center",padding:"50px 20px"}}>
          <div style={{fontSize:56}}>🔄</div>
          <div style={{fontSize:17,fontWeight:800,color:"#94A3B8",marginTop:10}}>Создай первую привычку</div>
          <div style={{fontSize:13,color:"#CBD5E1",marginTop:4}}>Маленькие шаги — большие результаты</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {habits.map(h=>{
            const weekDone=week.filter(dk=>h.logs&&h.logs[dk]).length;
            const todayActive=!!(h.logs&&h.logs[tk]);
            return (
              <div key={h.id} style={{background:"#fff",borderRadius:22,overflow:"hidden",boxShadow:"0 2px 14px rgba(0,0,0,0.06)"}}>
                <div style={{height:4,background:`linear-gradient(90deg,${h.color},${h.color}66)`}}/>
                <div style={{padding:"14px 16px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                    {h.emoji&&<div style={{width:46,height:46,borderRadius:15,background:h.color+"16",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{h.emoji}</div>}
                    <div style={{flex:1}}>
                      <div style={{fontSize:16,fontWeight:800,color:"#0F172A"}}>{h.title}</div>
                      <div style={{fontSize:12,fontWeight:700,color:h.color,marginTop:2}}>🔥 {h.streak||0} дней · <span style={{color:"#94A3B8",fontWeight:600}}>{weekDone}/7 на неделе</span></div>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <button onClick={()=>{setEditH(h);setSheet(true);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:"#CBD5E1",padding:4}}>✏️</button>
                      <button onClick={()=>delH(h.id)} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:"#E2E8F0",padding:4}}>✕</button>
                      <div onClick={()=>toggleDay(h.id,tk)} style={{width:40,height:40,borderRadius:13,flexShrink:0,border:todayActive?"none":"2.5px solid #E2E8F0",background:todayActive?`linear-gradient(135deg,${h.color},${h.color}CC)`:"#F8FAFC",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:todayActive?"#fff":"#94A3B8",fontSize:18,fontWeight:900,transition:"all .2s"}}>
                        {todayActive?"✓":"○"}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5}}>
                    {week.map((dk,i)=>{
                      const active=!!(h.logs&&h.logs[dk]);
                      const isToday=dk===tk;
                      return (
                        <div key={dk} onClick={()=>toggleDay(h.id,dk)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
                          <div style={{width:"100%",height:32,borderRadius:9,background:active?h.color:"#F1F5F9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:active?"#fff":"#CBD5E1",fontWeight:800,border:isToday&&!active?`2px solid ${h.color}55`:"2px solid transparent",transition:"all .2s"}}>
                            {active?"✓":""}
                          </div>
                          <span style={{fontSize:9,color:isToday?"#0F172A":"#94A3B8",fontWeight:isToday?800:600}}>{WEEKDAYS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Sheet open={sheet} onClose={()=>{setSheet(false);setEditH(null);}} title={editH?"Редактировать привычку":"Новая привычка"}>
        <HabitForm habit={editH} onSave={saveH} onClose={()=>{setSheet(false);setEditH(null);}}/>
      </Sheet>
    </div>
  );
}

function HabitForm({habit,onSave,onClose}) {
  const [f,sf]=useState(habit||{id:uid(),title:"",emoji:"",color:"#6366F1"});
  const u=(k,v)=>sf(p=>({...p,[k]:v}));
  return (
    <>
      <input value={f.title} onChange={e=>u("title",e.target.value)} placeholder="Название привычки"
        style={{width:"100%",fontSize:20,fontWeight:900,border:"none",padding:"6px 0",background:"transparent",outline:"none",color:"#0F172A",marginBottom:20}}/>
      <label style={S.lbl}>Цвет</label>
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        {HABIT_COLORS.map(c=>(
          <div key={c} onClick={()=>u("color",c)} style={{width:40,height:40,borderRadius:13,background:c,cursor:"pointer",border:f.color===c?"3px solid #0F172A":"3px solid transparent",boxShadow:f.color===c?`0 3px 10px ${c}66`:"none",transition:"all .2s"}}/>
        ))}
      </div>
      <label style={S.lbl}>Иконка (необязательно)</label>
      <div style={{marginBottom:24}}><EmojiPick value={f.emoji} onChange={v=>u("emoji",v)}/></div>
      <button onClick={()=>{if(f.title.trim()){onSave(f);onClose();}}} style={{width:"100%",padding:"17px 0",borderRadius:18,border:"none",background:f.title.trim()?"linear-gradient(135deg,#10B981,#059669)":"#E2E8F0",color:f.title.trim()?"#fff":"#94A3B8",fontSize:16,fontWeight:800,cursor:f.title.trim()?"pointer":"default",boxShadow:f.title.trim()?"0 6px 20px rgba(16,185,129,.35)":"none",transition:"all .2s"}}>Сохранить</button>
    </>
  );
}

/* ── WishesPage ── */
function WishesPage({wishes,onUpdate}) {
  const [sheet,setSheet]=useState(false);
  const [editW,setEditW]=useState(null);
  const done=wishes.filter(w=>w.done).length;
  const pct=wishes.length>0?Math.round((done/wishes.length)*100):0;

  const saveW=async(w)=>{
    try{
      const ex=wishes.find(x=>x.id===w.id);
      if(ex){await apiFetch(`/api/wishes/${w.id}`,{method:"PUT",body:JSON.stringify(w)});onUpdate(wishes.map(x=>x.id===w.id?w:x));}
      else{await apiFetch("/api/wishes",{method:"POST",body:JSON.stringify(w)});onUpdate([...wishes,w]);}
    }catch(e){console.error(e);}
    setSheet(false);setEditW(null);
  };

  const delW=async(id)=>{
    onUpdate(wishes.filter(x=>x.id!==id));
    try{await apiFetch(`/api/wishes/${id}`,{method:"DELETE"});}catch(e){console.error(e);}
  };

  const toggleW=async(id)=>{
    const w=wishes.find(x=>x.id===id);if(!w)return;
    onUpdate(wishes.map(x=>x.id===id?{...x,done:!x.done}:x));
    try{await apiFetch(`/api/wishes/${id}`,{method:"PUT",body:JSON.stringify({...w,done:!w.done})});}catch(e){console.error(e);}
  };

  return (
    <div>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#EC4899,#DB2777)",borderRadius:22,padding:"18px 20px",marginBottom:14,color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div>
            <div style={{fontSize:26,fontWeight:900}}>💫 Желания</div>
            <div style={{fontSize:13,opacity:.85,marginTop:3}}>{done} из {wishes.length} исполнено</div>
          </div>
          <button onClick={()=>{setEditW(null);setSheet(true);}} style={{width:48,height:48,borderRadius:16,border:"none",background:"rgba(255,255,255,0.22)",color:"#fff",fontSize:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>+</button>
        </div>
        {wishes.length>0&&(
          <>
            <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.3)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,background:"#fff",width:`${pct}%`,transition:"width .5s"}}/>
            </div>
            <div style={{fontSize:11,opacity:.75,marginTop:5,fontWeight:700}}>{pct}% выполнено</div>
          </>
        )}
      </div>

      {wishes.length===0?(
        <div style={{textAlign:"center",padding:"50px 20px"}}>
          <div style={{fontSize:56}}>💫</div>
          <div style={{fontSize:17,fontWeight:800,color:"#94A3B8",marginTop:10}}>Добавь мечту</div>
          <div style={{fontSize:13,color:"#CBD5E1",marginTop:4}}>Визуализируй свои желания</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {wishes.map(w=>(
            <div key={w.id} style={{background:w.done?"#F0FDF4":"#fff",borderRadius:20,padding:"14px 16px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)",border:w.done?"1.5px solid #86EFAC":"1.5px solid #F1F5F9",display:"flex",alignItems:"center",gap:12,animation:"fadeIn .25s ease"}}>
              <div onClick={()=>toggleW(w.id)} style={{width:34,height:34,borderRadius:11,flexShrink:0,border:w.done?"none":"2.5px solid #E2E8F0",background:w.done?"linear-gradient(135deg,#10B981,#059669)":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,fontWeight:900,transition:"all .2s"}}>
                {w.done&&"✓"}
              </div>
              {w.emoji&&<span style={{fontSize:24,flexShrink:0}}>{w.emoji}</span>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:16,fontWeight:700,color:w.done?"#059669":"#1E293B",textDecoration:w.done?"line-through":"none"}}>{w.title}</div>
                {w.note&&<div style={{fontSize:12,color:"#94A3B8",marginTop:2,lineHeight:1.4}}>{w.note}</div>}
              </div>
              <button onClick={()=>{setEditW(w);setSheet(true);}} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:"#CBD5E1",padding:4}}>✏️</button>
              <button onClick={()=>delW(w.id)} style={{background:"none",border:"none",color:"#E2E8F0",fontSize:16,cursor:"pointer",padding:4}}>✕</button>
            </div>
          ))}
        </div>
      )}
      <Sheet open={sheet} onClose={()=>{setSheet(false);setEditW(null);}} title={editW?"Редактировать":"Новое желание"}>
        <WishForm wish={editW} onSave={saveW} onClose={()=>{setSheet(false);setEditW(null);}}/>
      </Sheet>
    </div>
  );
}

function WishForm({wish,onSave,onClose}) {
  const [f,sf]=useState(wish||{id:uid(),title:"",note:"",emoji:"",done:false});
  const u=(k,v)=>sf(p=>({...p,[k]:v}));
  return (
    <>
      <input value={f.title} onChange={e=>u("title",e.target.value)} placeholder="Я хочу..."
        style={{width:"100%",fontSize:22,fontWeight:900,border:"none",padding:"6px 0",background:"transparent",outline:"none",color:"#0F172A",marginBottom:14}}/>
      <label style={S.lbl}>Описание</label>
      <textarea value={f.note} onChange={e=>u("note",e.target.value)} placeholder="Подробности..."
        style={{...S.field,minHeight:70,resize:"none",lineHeight:1.5,marginBottom:14}}/>
      <label style={S.lbl}>Иконка (необязательно)</label>
      <div style={{marginBottom:24}}><EmojiPick value={f.emoji} onChange={v=>u("emoji",v)}/></div>
      <button onClick={()=>{if(f.title.trim()){onSave(f);onClose();}}} style={{width:"100%",padding:"17px 0",borderRadius:18,border:"none",background:f.title.trim()?"linear-gradient(135deg,#EC4899,#DB2777)":"#E2E8F0",color:f.title.trim()?"#fff":"#94A3B8",fontSize:16,fontWeight:800,cursor:f.title.trim()?"pointer":"default",boxShadow:f.title.trim()?"0 6px 20px rgba(236,72,153,.35)":"none",transition:"all .2s"}}>Сохранить 💫</button>
    </>
  );
}

/* ── CalendarView ── */
/* ── CalTaskItem ── */
function CalTaskItem({t,pr,onToggle,onDelete,onUpdate}) {
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(t.title);
  const [prio,setPrio]=useState(t.prio);
  const save=()=>{if(val.trim()){onUpdate(val.trim(),prio);}setEditing(false);};
  if(editing) return(
    <div style={{padding:"10px 14px",borderRadius:14,background:"#fff",boxShadow:"0 1px 6px rgba(0,0,0,0.05)",borderLeft:`3px solid ${pr.c}`}}>
      <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()}
        style={{width:"100%",fontSize:14,fontWeight:700,border:"none",borderBottom:"2px solid #6366F1",outline:"none",padding:"2px 0",background:"transparent",marginBottom:8}}/>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {TPRIO.map(p=>(
          <button key={p.id} onClick={()=>setPrio(p.id)} style={{flex:1,padding:"6px 0",borderRadius:10,border:prio===p.id?`2px solid ${p.c}`:"2px solid #F1F5F9",background:prio===p.id?p.c+"18":"#FAFAFA",fontSize:11,fontWeight:700,cursor:"pointer",color:prio===p.id?p.c:"#B0B8C4"}}>{p.e} {p.l}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={save} style={{flex:1,padding:"8px 0",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Сохранить</button>
        <button onClick={()=>setEditing(false)} style={{padding:"8px 14px",borderRadius:10,border:"none",background:"#F1F5F9",color:"#64748B",fontSize:13,fontWeight:700,cursor:"pointer"}}>Отмена</button>
      </div>
    </div>
  );
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:14,background:"#fff",boxShadow:"0 1px 6px rgba(0,0,0,0.05)",borderLeft:`3px solid ${t.done?"#10B981":pr.c}`}}>
      <div onClick={onToggle} style={{width:24,height:24,borderRadius:8,flexShrink:0,border:`2px solid ${t.done?"#10B981":"#E2E8F0"}`,background:t.done?"#10B981":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:900}}>
        {t.done&&"✓"}
      </div>
      <span onClick={()=>setEditing(true)} style={{flex:1,fontSize:14,textDecoration:t.done?"line-through":"none",color:t.done?"#94A3B8":"#0F172A",cursor:"text"}}>{t.title}</span>
      <span style={{fontSize:10,fontWeight:700,color:pr.c,background:pr.c+"15",padding:"2px 8px",borderRadius:6,flexShrink:0}}>{pr.l}</span>
      <button onClick={()=>setEditing(true)} style={{background:"none",border:"none",color:"#CBD5E1",fontSize:13,cursor:"pointer",padding:2,flexShrink:0}}>✏️</button>
      <button onClick={onDelete} style={{background:"none",border:"none",color:"#E2E8F0",fontSize:14,cursor:"pointer",padding:2,flexShrink:0}}>✕</button>
    </div>
  );
}

function CalView({goals,calTasks,setCalTasks}) {
  const [cur,setCur]=useState(new Date());
  const [prioFilter,setPrioFilter]=useState("all");
  const [prioOpen,setPrioOpen]=useState(false);
  const y=cur.getFullYear(); const m=cur.getMonth();
  const days=monthDays(y,m); const today=new Date();
  const gmap=useMemo(()=>{const mp={};goals.forEach(g=>{if(g.deadline)(mp[g.deadline]=mp[g.deadline]||[]).push(g);});return mp;},[goals]);
  const [sheet,setSheet]=useState(false);
  const [selectedDate,setSelectedDate]=useState(null);
  const [newTask,setNewTask]=useState("");
  const [newPrio,setNewPrio]=useState("medium");

  const tasksByDate=useMemo(()=>{
    const prioOrder={high:0,medium:1,low:2};
    const map={};
    [...calTasks]
      .sort((a,b)=>{
        if(a.date!==b.date) return a.date.localeCompare(b.date);
        return (prioOrder[a.prio]||1)-(prioOrder[b.prio]||1);
      })
      .forEach(t=>{map[t.date]=map[t.date]||[];map[t.date].push(t);});
    return map;
  },[calTasks]);

  const filteredByDate=useMemo(()=>{
    if(prioFilter==="all") return tasksByDate;
    const map={};
    Object.entries(tasksByDate).forEach(([date,tasks])=>{
      const f=tasks.filter(t=>t.prio===prioFilter);
      if(f.length>0) map[date]=f;
    });
    return map;
  },[tasksByDate,prioFilter]);

  const openSheet=(date)=>{
    setSelectedDate(date instanceof Date ? date : new Date(date));
    setNewTask("");
    setNewPrio("medium");
    setSheet(true);
  };

  const addTask=async()=>{
    if(!newTask.trim()||!selectedDate) return;
    const dk=dateKey(selectedDate);
    try{
      const res=await api.createCalendar({title:newTask.trim(),date:dk,prio:newPrio});
      setCalTasks(prev=>[...prev,{id:res.id,title:newTask.trim(),date:dk,done:false,prio:newPrio}]);
      setNewTask(""); setNewPrio("medium"); setSheet(false); setSelectedDate(null);
    }catch(e){console.error(e);}
  };

  const toggleTask=async(tid,done)=>{
    try{
      await api.updateCalendar(tid,{done:!done});
      setCalTasks(prev=>prev.map(t=>t.id===tid?{...t,done:!done}:t));
    }catch(e){console.error(e);}
  };

  const deleteTask=async(tid)=>{
    try{
      await api.deleteCalendar(tid);
      setCalTasks(prev=>prev.filter(t=>t.id!==tid));
    }catch(e){console.error(e);}
  };

  const updateTask=async(tid,title,prio)=>{
    try{
      await api.updateCalendar(tid,{title,prio});
      setCalTasks(prev=>prev.map(t=>t.id===tid?{...t,title,prio}:t));
    }catch(e){console.error(e);}
  };

  // Upcoming days: today + tomorrow + any future days with tasks (up to 7 days)
  const upcomingDays=useMemo(()=>{
    const shown=new Set([0,1]);
    for(let i=2;i<=7;i++){
      const d=new Date(); d.setDate(d.getDate()+i);
      if(filteredByDate[dateKey(d)]?.length>0) shown.add(i);
    }
    return Array.from(shown).sort((a,b)=>a-b);
  },[filteredByDate]);

  const prioColors={high:"#EF4444",medium:"#F59E0B",low:"#22C55E"};
  const prioLabel={all:"Приоритет",high:"⚡ Важно",medium:"🟡 Средне",low:"✅ Не срочно"};

  return (
    <div>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#8B5CF6,#7C3AED)",borderRadius:22,padding:"16px 20px",marginBottom:14,color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <button onClick={()=>setCur(new Date(y,m-1,1))} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",fontSize:18,cursor:"pointer",padding:"8px 14px",borderRadius:12}}>◀</button>
          <span style={{fontWeight:900,fontSize:18}}>{MO_NAMES[m]} {y}</span>
          <button onClick={()=>setCur(new Date(y,m+1,1))} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",fontSize:18,cursor:"pointer",padding:"8px 14px",borderRadius:12}}>▶</button>
        </div>
        <button onClick={()=>openSheet(new Date())} style={{width:"100%",background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:14,fontWeight:700,padding:"11px 0",borderRadius:14,border:"1.5px solid rgba(255,255,255,0.35)",cursor:"pointer"}}>
          ＋ Добавить задачу
        </button>
      </div>

      {/* Priority filter dropdown */}
      <div style={{position:"relative",marginBottom:12,display:"inline-block"}}>
        <button onClick={()=>setPrioOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:14,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:prioFilter!=="all"?prioColors[prioFilter]:"#fff",color:prioFilter!=="all"?"#fff":"#64748B",boxShadow:"0 1px 6px rgba(0,0,0,.08)"}}>
          <span>{prioLabel[prioFilter]}</span>
          <span style={{fontSize:10,opacity:.7,display:"inline-block",transform:prioOpen?"rotate(180deg)":"rotate(0)",transition:"transform .2s"}}>▼</span>
        </button>
        {prioOpen&&(
          <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,background:"#fff",borderRadius:14,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:200,overflow:"hidden",minWidth:160}}>
            {[{id:"all",l:"Все"},{id:"high",l:"⚡ Важно"},{id:"medium",l:"🟡 Средне"},{id:"low",l:"✅ Не срочно"}].map(p=>(
              <button key={p.id} onClick={()=>{setPrioFilter(p.id);setPrioOpen(false);}} style={{width:"100%",padding:"11px 16px",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left",background:prioFilter===p.id?"#EEF2FF":"#fff",color:prioFilter===p.id?"#6366F1":"#64748B",borderBottom:"1px solid #F8FAFC"}}>{p.l}</button>
            ))}
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div style={{background:"#fff",borderRadius:22,padding:"14px 12px",boxShadow:"0 2px 14px rgba(0,0,0,0.06)",marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:8}}>
          {WEEKDAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:800,color:"#94A3B8",padding:4}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {days.map(({d,cur:cm},i)=>{
            const k=dateKey(d); const dg=gmap[k]||[]; const td=sameDay(d,today);
            const ct=filteredByDate[k]||[];
            return (
              <div key={i} onClick={()=>openSheet(d)} style={{height:52,padding:"3px 3px",borderRadius:12,background:td?"#EEF2FF":cm?"#FAFAFA":"transparent",border:td?"2px solid #6366F1":"2px solid transparent",opacity:cm?1:.25,cursor:"pointer",overflow:"hidden"}}>
                <div style={{fontSize:11,fontWeight:td?900:600,color:td?"#6366F1":"#64748B",marginBottom:1,lineHeight:1}}>{d.getDate()}</div>
                {dg.slice(0,1).map(g=>{
                  const cat=CATS.find(c=>c.id===g.cat);
                  return <div key={g.id} style={{fontSize:7,padding:"1px 3px",borderRadius:3,marginBottom:1,background:cat?.accent+"20",color:cat?.accent,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.title}</div>;
                })}
                {ct.slice(0,1).map(t=>{
                  const pr=TPRIO.find(x=>x.id===t.prio)||TPRIO[1];
                  return <div key={t.id} style={{fontSize:7,padding:"1px 3px",borderRadius:3,marginBottom:1,background:pr.c+"20",color:pr.c,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>;
                })}
                {dg.length+ct.length>1&&<div style={{fontSize:7,color:"#94A3B8",fontWeight:700}}>+{dg.length+ct.length-1}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming days */}
      <div style={{fontWeight:900,fontSize:16,marginBottom:12}}>📅 Задачи на ближайшие дни</div>
      {upcomingDays.map(i=>{
        const d=new Date(); d.setDate(d.getDate()+i);
        const dk=dateKey(d);
        const tasks=filteredByDate[dk]||[];
        const label=i===0?"Сегодня":i===1?"Завтра":fmtDate(d);
        return (
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:800,color:"#0F172A"}}>{label}</span>
              <button onClick={()=>openSheet(d)} style={{fontSize:11,fontWeight:700,color:"#6366F1",background:"#EEF2FF",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>＋</button>
            </div>
            {tasks.length===0?(
              <div style={{textAlign:"center",padding:"10px",color:"#CBD5E1",fontSize:13}}>Нет задач</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {tasks.map(t=>{
                  const pr=TPRIO.find(x=>x.id===t.prio)||TPRIO[1];
                  return (
                    <CalTaskItem key={t.id} t={t} pr={pr} onToggle={()=>toggleTask(t.id,t.done)} onDelete={()=>deleteTask(t.id)} onUpdate={(title,prio)=>updateTask(t.id,title,prio)}/>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Add task sheet */}
      <Sheet open={sheet} onClose={()=>{setSheet(false);setSelectedDate(null);setNewTask("");setNewPrio("medium");}} title={`Задача на ${selectedDate?fmtDate(selectedDate):""}`}>
        <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Название задачи..." autoFocus
          style={{width:"100%",padding:"14px 16px",borderRadius:18,border:"2px solid #F1F5F9",fontSize:15,outline:"none",background:"#fff",color:"#0F172A",boxSizing:"border-box",marginBottom:12}}/>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {TPRIO.map(p=>(
            <button key={p.id} onClick={()=>setNewPrio(p.id)} style={{flex:1,padding:"10px 0",borderRadius:14,border:newPrio===p.id?`2px solid ${p.c}`:"2px solid #F1F5F9",background:newPrio===p.id?p.c+"18":"#FAFAFA",fontSize:12,fontWeight:700,cursor:"pointer",color:newPrio===p.id?p.c:"#B0B8C4",transition:"all .15s"}}>{p.e} {p.l}</button>
          ))}
        </div>
        <button onClick={addTask} style={{width:"100%",padding:"17px 0",borderRadius:18,border:"none",background:newTask.trim()?"linear-gradient(135deg,#6366F1,#8B5CF6)":"#E2E8F0",color:newTask.trim()?"#fff":"#94A3B8",fontSize:16,fontWeight:800,cursor:newTask.trim()?"pointer":"default",boxShadow:newTask.trim()?"0 6px 20px rgba(99,102,241,.35)":"none",transition:"all .2s"}}>
          Добавить 🚀
        </button>
      </Sheet>
    </div>
  );
}

/* ── DeadlinesView ── */
function DeadlinesView({goals}) {
  const upcoming=useMemo(()=>goals.filter(g=>!g.done&&g.deadline).sort((a,b)=>{const pa=PRIO[a.prio]?.n??1;const pb=PRIO[b.prio]?.n??1;if(pa!==pb)return pa-pb;return new Date(a.deadline)-new Date(b.deadline);}),[goals]);
  return (
    <div>
      <div style={{fontWeight:900,fontSize:16,marginBottom:12}}>📋 Дедлайны <span style={{fontSize:12,fontWeight:600,color:"#94A3B8"}}>(по важности)</span></div>
      {upcoming.length===0?(
        <div style={{textAlign:"center",padding:"24px",color:"#94A3B8",fontSize:14,fontWeight:700}}>Нет дедлайнов 🎉</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {upcoming.map(g=>{
            const cat=CATS.find(c=>c.id===g.cat)||CATS[0];
            const dl=daysLeft(g.deadline); const overdue=dl<0; const pri=PRIO[g.prio];
            return (
              <div key={g.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderRadius:18,background:"#fff",boxShadow:"0 2px 10px rgba(0,0,0,0.04)",borderLeft:`4px solid ${pri.c}`}}>
                <span style={{fontSize:22}}>{cat.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.title}</div>
                  <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>{fmtDateFull(g.deadline)}</div>
                </div>
                <span style={{fontSize:12,fontWeight:800,padding:"5px 12px",borderRadius:10,whiteSpace:"nowrap",background:overdue?"#FEE2E2":dl<=3?"#FEF3C7":"#F1F5F9",color:overdue?"#DC2626":dl<=3?"#D97706":"#64748B"}}>
                  {overdue?`${Math.abs(dl)}д назад`:dl===0?"Сегодня!":dl===1?"Завтра":`${dl} дн.`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function StatsPage({goals,habits}) {
  const t=goals.length; const d=goals.filter(g=>g.done).length;
  const pct=t>0?Math.round((d/t)*100):0;
  const allT=goals.reduce((a,g)=>{const c=countTasks(g.tasks);return{total:a.total+c.total,done:a.done+c.done};},{total:0,done:0});
  const byCat=CATS.map(c=>{const cg=goals.filter(g=>g.cat===c.id);return{...c,t:cg.length,d:cg.filter(g=>g.done).length};}).filter(c=>c.t>0);
  const topStreak=habits.length>0?Math.max(...habits.map(h=>h.streak||0)):0;
  const doneToday=habits.filter(h=>h.logs&&h.logs[todayKey()]).length;

  if(t===0) return(
    <div style={{textAlign:"center",padding:"70px 20px"}}>
      <div style={{fontSize:60}}>📊</div>
      <div style={{fontSize:18,fontWeight:800,color:"#94A3B8",marginTop:12}}>Создай первую цель</div>
      <div style={{fontSize:14,color:"#CBD5E1",marginTop:6}}>Статистика появится здесь</div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{background:"linear-gradient(135deg,#6366F1,#8B5CF6,#A78BFA)",borderRadius:24,padding:"22px 20px",color:"#fff",textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
          <Ring pct={pct} size={92} stroke={7} color="#fff"><span style={{color:"#fff",fontSize:20,fontWeight:900}}>{pct}%</span></Ring>
        </div>
        <div style={{fontSize:13,fontWeight:700,opacity:.85,marginBottom:14}}>Прогресс целей</div>
        <div style={{display:"flex",justifyContent:"center",gap:0}}>
          {[{v:d,l:"Выполнено"},{v:t-d,l:"В работе"},{v:allT.done,l:"Задач ✓"}].map((item,i)=>(
            <div key={i} style={{flex:1,borderRight:i<2?"1px solid rgba(255,255,255,0.2)":"none",padding:"0 8px"}}>
              <div style={{fontSize:26,fontWeight:900}}>{item.v}</div>
              <div style={{fontSize:10,opacity:.7,fontWeight:700,marginTop:2}}>{item.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{background:"#fff",borderRadius:20,padding:"16px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)",textAlign:"center"}}>
          <div style={{fontSize:30,marginBottom:4}}>🔥</div>
          <div style={{fontSize:28,fontWeight:900,color:"#F97316"}}>{topStreak}</div>
          <div style={{fontSize:12,color:"#94A3B8",fontWeight:700,marginTop:2}}>Лучшая серия</div>
        </div>
        <div style={{background:"#fff",borderRadius:20,padding:"16px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)",textAlign:"center"}}>
          <div style={{fontSize:30,marginBottom:4}}>✅</div>
          <div style={{fontSize:28,fontWeight:900,color:"#10B981"}}>{doneToday}/{habits.length}</div>
          <div style={{fontSize:12,color:"#94A3B8",fontWeight:700,marginTop:2}}>Привычек сегодня</div>
        </div>
      </div>

      {allT.total>0&&(
        <div style={{background:"#fff",borderRadius:20,padding:"16px 18px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:14,fontWeight:800}}>Все задачи</span>
            <span style={{fontSize:14,fontWeight:900,color:"#8B5CF6"}}>{allT.done}/{allT.total}</span>
          </div>
          <div style={{height:8,borderRadius:4,background:"#F1F5F9",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:4,width:`${allT.total>0?(allT.done/allT.total)*100:0}%`,background:"linear-gradient(90deg,#8B5CF6,#6366F1)",transition:"width .5s"}}/>
          </div>
        </div>
      )}

      {byCat.length>0&&(
        <div style={{background:"#fff",borderRadius:20,padding:"16px 18px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
          <div style={{fontSize:14,fontWeight:900,marginBottom:16}}>По категориям</div>
          {byCat.map(c=>(
            <div key={c.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700}}>{c.emoji} {c.label}</span>
                <span style={{fontSize:12,fontWeight:900,color:c.accent,background:c.accent+"16",padding:"2px 9px",borderRadius:6}}>{c.d}/{c.t}</span>
              </div>
              <div style={{height:7,borderRadius:4,background:"#F1F5F9",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,width:`${c.t>0?(c.d/c.t)*100:0}%`,background:c.accent,transition:"width .5s"}}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── IdeasPage ── */
function useIdeas() {
  const lsKey="goalflow_ideas";
  const fromLS=()=>{try{return JSON.parse(localStorage.getItem(lsKey)||"[]");}catch{return[];}};
  const [ideas,setIdeasState]=useState(fromLS);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    apiFetch("/api/ideas").then(data=>{
      setIdeasState(data); setLoaded(true);
      localStorage.setItem(lsKey,JSON.stringify(data));
    }).catch(()=>setLoaded(true));
  },[]);

  const setIdeas=updated=>{
    setIdeasState(updated);
    localStorage.setItem(lsKey,JSON.stringify(updated));
  };
  return [ideas,setIdeas,loaded];
}

function IdeaForm({idea,onSave,onClose}) {
  const [f,sf]=useState(idea||{id:uid(),title:"",note:"",emoji:"💡",tag:"Другое",color:"#6366F1",done:false,created:new Date().toISOString()});
  const u=(k,v)=>sf(p=>({...p,[k]:v}));
  return (
    <>
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"flex-start"}}>
        <div><label style={S.lbl}>Иконка</label><EmojiPick value={f.emoji} onChange={v=>u("emoji",v||"💡")}/></div>
        <div style={{flex:1}}>
          <label style={S.lbl}>Название</label>
          <input value={f.title} onChange={e=>u("title",e.target.value)} placeholder="Моя идея..." style={{...S.field,fontSize:17,fontWeight:700}}/>
        </div>
      </div>
      <label style={S.lbl}>Описание</label>
      <textarea value={f.note} onChange={e=>u("note",e.target.value)} placeholder="Подробности, мысли, ссылки..." style={{...S.field,minHeight:80,resize:"none",lineHeight:1.5,marginBottom:14}}/>
      <label style={S.lbl}>Тег</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {IDEA_TAGS.filter(t=>t!=="Все").map(tag=>(
          <button key={tag} onClick={()=>u("tag",tag)} style={{padding:"7px 14px",borderRadius:50,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:f.tag===tag?"#6366F1":"#F1F5F9",color:f.tag===tag?"#fff":"#64748B",transition:"all .15s"}}>{tag}</button>
        ))}
      </div>
      <label style={S.lbl}>Цвет</label>
      <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
        {IDEA_COLORS.map(c=>(
          <div key={c} onClick={()=>u("color",c)} style={{width:36,height:36,borderRadius:12,background:c,cursor:"pointer",border:f.color===c?"3px solid #0F172A":"3px solid transparent",boxShadow:f.color===c?`0 3px 10px ${c}66`:"none",transition:"all .2s"}}/>
        ))}
      </div>
      <button onClick={()=>{if(f.title.trim()){onSave(f);onClose();}}} style={{width:"100%",padding:"17px 0",borderRadius:18,border:"none",background:f.title.trim()?"linear-gradient(135deg,#F97316,#EA580C)":"#E2E8F0",color:f.title.trim()?"#fff":"#94A3B8",fontSize:16,fontWeight:800,cursor:f.title.trim()?"pointer":"default",boxShadow:f.title.trim()?"0 6px 20px rgba(249,115,22,.35)":"none",transition:"all .2s"}}>
        {idea?"Сохранить ✨":"Записать 💡"}
      </button>
    </>
  );
}

function IdeasPage({onMakeGoal}) {
  const [ideas,setIdeas]=useIdeas();
  const [activeTag,setActiveTag]=useState("Все");
  const [sheet,setSheet]=useState(false);
  const [editIdea,setEditIdea]=useState(null);
  const [showDone,setShowDone]=useState(false);

  const filtered=ideas.filter(i=>{if(!showDone&&i.done)return false;if(activeTag!=="Все"&&i.tag!==activeTag)return false;return true;});

  const saveIdea=async(idea)=>{
    const exists=ideas.find(x=>x.id===idea.id);
    if(exists){
      setIdeas(ideas.map(x=>x.id===idea.id?idea:x));
      try{await apiFetch(`/api/ideas/${idea.id}`,{method:"PUT",body:JSON.stringify(idea)});}catch(e){console.error(e);}
    } else {
      setIdeas([idea,...ideas]);
      try{await apiFetch("/api/ideas",{method:"POST",body:JSON.stringify(idea)});}catch(e){console.error(e);}
    }
  };

  const toggleIdea=async(id)=>{
    const idea=ideas.find(i=>i.id===id);if(!idea)return;
    setIdeas(ideas.map(i=>i.id===id?{...i,done:!i.done}:i));
    try{await apiFetch(`/api/ideas/${id}`,{method:"PUT",body:JSON.stringify({...idea,done:!idea.done})});}catch(e){console.error(e);}
  };

  const deleteIdea=async(id)=>{
    setIdeas(ideas.filter(i=>i.id!==id));
    try{await apiFetch(`/api/ideas/${id}`,{method:"DELETE"});}catch(e){console.error(e);}
  };

  const activeCount=ideas.filter(i=>!i.done).length;

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#F97316,#EA580C)",borderRadius:22,padding:"18px 20px",marginBottom:14,color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:26,fontWeight:900}}>💡 Банк идей</div>
            <div style={{fontSize:13,opacity:.85,marginTop:3}}>{activeCount} {activeCount===1?"идея":activeCount>=2&&activeCount<=4?"идеи":"идей"} ждут воплощения</div>
          </div>
          <button onClick={()=>{setEditIdea(null);setSheet(true);}} style={{width:48,height:48,borderRadius:16,border:"none",background:"rgba(255,255,255,0.22)",color:"#fff",fontSize:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>+</button>
        </div>
      </div>

      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:2}}>
        {IDEA_TAGS.map(tag=>{
          const count=tag==="Все"?ideas.filter(i=>!i.done).length:ideas.filter(i=>i.tag===tag&&!i.done).length;
          return(
            <button key={tag} onClick={()=>setActiveTag(tag)} style={{padding:"8px 14px",borderRadius:50,border:"none",whiteSpace:"nowrap",fontSize:12,fontWeight:700,cursor:"pointer",background:activeTag===tag?"#F97316":"#fff",color:activeTag===tag?"#fff":"#94A3B8",boxShadow:activeTag===tag?"0 2px 10px rgba(249,115,22,.3)":"0 1px 4px rgba(0,0,0,.05)",transition:"all .2s"}}>
              {tag}{count>0?` · ${count}`:""}
            </button>
          );
        })}
      </div>

      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"50px 20px"}}>
          <div style={{fontSize:56}}>💡</div>
          <div style={{fontSize:17,fontWeight:800,color:"#94A3B8",marginTop:10}}>Запиши первую идею!</div>
          <div style={{fontSize:13,color:"#CBD5E1",marginTop:4}}>Хорошие идеи исчезают быстро</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(idea=>(
            <div key={idea.id} style={{background:"#fff",borderRadius:22,overflow:"hidden",boxShadow:"0 2px 14px rgba(0,0,0,0.06)",opacity:idea.done?.6:1,animation:"fadeIn .25s ease"}}>
              <div style={{height:4,background:`linear-gradient(90deg,${idea.color},${idea.color}66)`}}/>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{width:46,height:46,borderRadius:15,flexShrink:0,background:idea.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{idea.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:800,padding:"2px 9px",borderRadius:6,background:idea.color+"18",color:idea.color}}>{idea.tag}</span>
                      <span style={{fontSize:10,color:"#CBD5E1",fontWeight:600}}>{new Date(idea.created).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</span>
                    </div>
                    <div style={{fontSize:16,fontWeight:800,color:idea.done?"#94A3B8":"#0F172A",textDecoration:idea.done?"line-through":"none",lineHeight:1.3,marginBottom:idea.note?4:0}}>{idea.title}</div>
                    {idea.note&&<div style={{fontSize:13,color:"#64748B",lineHeight:1.4}}>{idea.note}</div>}
                  </div>
                  <button onClick={()=>toggleIdea(idea.id)} style={{width:36,height:36,borderRadius:12,border:"none",flexShrink:0,background:idea.done?`linear-gradient(135deg,${idea.color},${idea.color}BB)`:"#F1F5F9",color:idea.done?"#fff":"#94A3B8",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
                    {idea.done?"✓":"○"}
                  </button>
                </div>
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button onClick={()=>onMakeGoal&&onMakeGoal(idea)} style={{flex:1,padding:"9px 0",borderRadius:12,border:"none",background:"#EEF2FF",color:"#6366F1",fontSize:12,fontWeight:700,cursor:"pointer",transition:"background .15s"}}>🎯 Сделать целью</button>
                  <button onClick={()=>{setEditIdea(idea);setSheet(true);}} style={{padding:"9px 14px",borderRadius:12,border:"none",background:"#F8FAFC",color:"#64748B",fontSize:12,fontWeight:700,cursor:"pointer"}}>✏️</button>
                  <button onClick={()=>deleteIdea(idea.id)} style={{padding:"9px 14px",borderRadius:12,border:"none",background:"#FEF2F2",color:"#EF4444",fontSize:12,fontWeight:700,cursor:"pointer"}}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {ideas.filter(i=>i.done).length>0&&(
        <button onClick={()=>setShowDone(s=>!s)} style={{width:"100%",marginTop:12,padding:"12px 0",borderRadius:14,border:"none",background:"#F8FAFC",color:"#94A3B8",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {showDone?"Скрыть":"Показать выполненные · "+ideas.filter(i=>i.done).length}
        </button>
      )}

      <Sheet open={sheet} onClose={()=>{setSheet(false);setEditIdea(null);}} title={editIdea?"Редактировать идею":"Новая идея 💡"}>
        <IdeaForm idea={editIdea} onSave={saveIdea} onClose={()=>{setSheet(false);setEditIdea(null);}}/>
      </Sheet>
    </div>
  );
}

/* ═════════ MAIN APP ═════════ */
export default function App() {
  const [data,setData]=useState({goals:[],habits:[],wishes:[]});
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState("goals");
  const [sheet,setSheet]=useState(false);
  const [editG,setEditG]=useState(null);
  const [openGId,setOpenGId]=useState(null);
  const [filt,setFilt]=useState("all");
  const [prioFilt,setPrioFilt]=useState("all");
  const [prioOpen,setPrioOpen]=useState(false);
  const [filtOpen,setFiltOpen]=useState(false);
  const [calTasks,setCalTasks]=useState([]);
  const [search,setSearch]=useState("");
  const [confetti,setConfetti]=useState(false);

  useEffect(()=>{api.getCalendar().then(setCalTasks).catch(()=>setCalTasks([]));},[]);

  useEffect(()=>{loadData().then(d=>{setData(d);setReady(true);});},[]);

  const reload=useCallback(async()=>{const d=await loadData();setData(d);},[]);
  const {goals,habits,wishes}=data;
  const setGoals=fn=>setData(d=>({...d,goals:typeof fn==="function"?fn(d.goals):fn}));
  const setHabits=h=>setData(d=>({...d,habits:h}));
  const setWishes=w=>setData(d=>({...d,wishes:w}));

  const fireConfetti=useCallback(()=>{setConfetti(false);setTimeout(()=>setConfetti(true),10);setTimeout(()=>setConfetti(false),3000);},[]);

  const doSave=useCallback(async(g)=>{
    try{const exists=goals.find(x=>x.id===g.id);if(exists){await apiFetch(`/api/goals/${g.id}`,{method:"PUT",body:JSON.stringify(g)});}else{await apiFetch("/api/goals",{method:"POST",body:JSON.stringify(g)});}await reload();}catch(e){console.error(e);}
    setSheet(false);setEditG(null);
  },[goals,reload]);

  const doDel=useCallback(async(id)=>{
    try{await apiFetch(`/api/goals/${id}`,{method:"DELETE"});await reload();}catch(e){console.error(e);}
    setOpenGId(null);
  },[reload]);

  const doToggle=useCallback(async(id)=>{
    const g=goals.find(x=>x.id===id);if(!g)return;
    const newDone=!g.done;
    setGoals(prev=>prev.map(x=>x.id===id?{...x,done:newDone}:x));
    if(newDone)setTimeout(()=>fireConfetti(),50);
    try{await apiFetch(`/api/goals/${id}`,{method:"PUT",body:JSON.stringify({...g,done:newDone})});}catch(e){console.error(e);}
  },[goals,fireConfetti]);

  const doUpdate=useCallback(async(u)=>{
    setGoals(prev=>prev.map(g=>g.id===u.id?u:g));
    try{await apiFetch(`/api/goals/${u.id}`,{method:"PUT",body:JSON.stringify(u)});}catch(e){console.error(e);}
  },[]);

  const doEditGoal=useCallback(g=>{setEditG(g);setSheet(true);setOpenGId(null);},[]);

  const filtered=useMemo(()=>{
    let l=[...goals];
    if(filt==="active")l=l.filter(g=>!g.done);
    else if(filt==="done")l=l.filter(g=>g.done);
    else if(filt==="overdue")l=l.filter(g=>!g.done&&g.deadline&&daysLeft(g.deadline)<0);
    if(prioFilt!=="all")l=l.filter(g=>g.prio===prioFilt);
    if(search.trim())l=l.filter(g=>g.title.toLowerCase().includes(search.toLowerCase()));
    const prioN={high:0,medium:1,low:2};
    l.sort((a,b)=>{
      if(a.done!==b.done)return a.done?1:-1;
      const pa=prioN[a.prio]??1; const pb=prioN[b.prio]??1;
      if(pa!==pb)return pa-pb;
      if(a.deadline&&b.deadline)return new Date(a.deadline)-new Date(b.deadline);
      if(a.deadline)return -1;
      if(b.deadline)return 1;
      return 0;
    });
    return l;
  },[goals,filt,prioFilt,search]);

  const tabs=[
    {id:"goals",  emoji:"🎯",label:"Цели"},
    {id:"cal",    emoji:"📅",label:"Календарь"},
    {id:"habits", emoji:"🔄",label:"Привычки"},
    {id:"wishes", emoji:"💫",label:"Желания"},
    {id:"deadlines", emoji:"⏰",label:"Дедлайны"},
    {id:"ideas",  emoji:"💡",label:"Идеи"},
  ];

  if(!ready) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12,background:"#F8FAFC"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{fontSize:42,animation:"pop 1s ease infinite"}}>✨</div>
      <div style={{fontSize:15,fontWeight:700,color:"#94A3B8",fontFamily:"Nunito,sans-serif"}}>Загрузка...</div>
    </div>
  );

  const openGoal=openGId?goals.find(g=>g.id===openGId):null;

  if(openGoal) return(
    <div style={{fontFamily:"'Nunito',-apple-system,sans-serif",background:"#F8FAFC",minHeight:"100vh",maxWidth:430,margin:"0 auto",color:"#0F172A"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{CSS_GLOBAL}</style>
      <Confetti active={confetti}/>
      <GoalDetail goal={openGoal} onBack={()=>setOpenGId(null)} onUpdate={doUpdate} onDelete={doDel} onConfetti={fireConfetti} onEdit={doEditGoal}/>
    </div>
  );

  const tabAddActions={
    goals: {label:"+ Цель",action:()=>{setEditG(null);setSheet(true);},color:"linear-gradient(135deg,#6366F1,#8B5CF6)",shadow:"0 4px 16px rgba(99,102,241,.4)"},
  };

  return(
    <div className="app-wrap" style={{fontFamily:"'Nunito',-apple-system,sans-serif",background:"#F8FAFC",maxWidth:430,margin:"0 auto",color:"#0F172A"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{CSS_GLOBAL}</style>
      <Confetti active={confetti}/>

      {/* Header */}
      <div style={{paddingTop:"calc(env(safe-area-inset-top,14px) + 10px)",paddingLeft:20,paddingRight:20,paddingBottom:14,background:"#fff",borderBottom:"1px solid #F1F5F9",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 8px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#94A3B8",fontWeight:700,textTransform:"capitalize",letterSpacing:"0.02em"}}>
              {new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}
            </div>
            <h1 style={{margin:"2px 0 0",fontSize:22,fontWeight:900,letterSpacing:"-0.03em",color:"#0F172A"}}>GoalFlow ✨</h1>
          </div>
          {tabAddActions[tab]&&(
            <button onClick={tabAddActions[tab].action} style={{height:44,paddingLeft:18,paddingRight:18,borderRadius:14,border:"none",background:tabAddActions[tab].color,color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:tabAddActions[tab].shadow,transition:"transform .15s",letterSpacing:"-0.02em"}}>
              {tabAddActions[tab].label}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"16px 16px 0"}}>
        {tab==="goals"&&(
          <>
            <div style={{marginBottom:14}}>
              <div style={{position:"relative",marginBottom:10}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск целей..."
                  style={{...S.field,paddingLeft:42}}/>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>🔍</span>
              </div>
              {/* Two dropdowns in one row */}
              <div style={{display:"flex",gap:8,marginBottom:6}}>
                {/* Status dropdown */}
                <div style={{flex:1,position:"relative"}}>
                  <button onClick={()=>{setFiltOpen(o=>!o);setPrioOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,padding:"10px 14px",borderRadius:14,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:filt!=="all"?"#6366F1":"#fff",color:filt!=="all"?"#fff":"#64748B",boxShadow:"0 1px 6px rgba(0,0,0,.08)",transition:"all .2s"}}>
                    <span>{filt==="all"?"Все":filt==="active"?"Активные":filt==="done"?"Готово ✓":"Просрочено"}</span>
                    <span style={{fontSize:10,opacity:.7,transform:filtOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s",display:"inline-block"}}>▼</span>
                  </button>
                  {filtOpen&&(
                    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#fff",borderRadius:14,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:200,overflow:"hidden",animation:"fadeIn .15s ease"}}>
                      {[{id:"all",l:"Все"},{id:"active",l:"Активные"},{id:"done",l:"Готово ✓"},{id:"overdue",l:"Просрочено"}].map(f=>(
                        <button key={f.id} onClick={()=>{setFilt(f.id);setFiltOpen(false);}} style={{width:"100%",padding:"11px 14px",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left",background:filt===f.id?"#EEF2FF":"#fff",color:filt===f.id?"#6366F1":"#64748B",borderBottom:"1px solid #F8FAFC"}}>{f.l}</button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Priority dropdown */}
                <div style={{flex:1,position:"relative"}}>
                  <button onClick={()=>{setPrioOpen(o=>!o);setFiltOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,padding:"10px 14px",borderRadius:14,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:prioFilt!=="all"?({high:"#EF4444",medium:"#F59E0B",low:"#22C55E"}[prioFilt]):"#fff",color:prioFilt!=="all"?"#fff":"#64748B",boxShadow:"0 1px 6px rgba(0,0,0,.08)",transition:"all .2s"}}>
                    <span>{prioFilt==="all"?"Приоритет":prioFilt==="high"?"⚡ Важно":prioFilt==="medium"?"🟡 Средне":"✅ Не срочно"}</span>
                    <span style={{fontSize:10,opacity:.7,transform:prioOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s",display:"inline-block"}}>▼</span>
                  </button>
                  {prioOpen&&(
                    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#fff",borderRadius:14,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:200,overflow:"hidden",animation:"fadeIn .15s ease"}}>
                      {[{id:"all",l:"Все"},{id:"high",l:"⚡ Важно"},{id:"medium",l:"🟡 Средне"},{id:"low",l:"✅ Не срочно"}].map(p=>(
                        <button key={p.id} onClick={()=>{setPrioFilt(p.id);setPrioOpen(false);}} style={{width:"100%",padding:"11px 14px",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left",background:prioFilt===p.id?"#EEF2FF":"#fff",color:prioFilt===p.id?"#6366F1":"#64748B",borderBottom:"1px solid #F8FAFC"}}>{p.l}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {filtered.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{fontSize:60}}>{goals.length===0?"🎯":"🔍"}</div>
                <div style={{fontSize:18,fontWeight:800,color:"#94A3B8",marginTop:12}}>{goals.length===0?"Начни с первой цели!":"Ничего не найдено"}</div>
                <div style={{fontSize:13,color:"#CBD5E1",marginTop:6}}>{goals.length===0?"Нажми + чтобы добавить":"Попробуй другой запрос"}</div>
              </div>
            ):(
              filtered.map(g=><GoalCard key={g.id} g={g} onTap={()=>setOpenGId(g.id)} onToggle={doToggle}/>)
            )}
          </>
        )}
        {tab==="habits"&&<HabitsPage habits={habits} onUpdate={setHabits}/>}
        {tab==="wishes"&&<WishesPage wishes={wishes} onUpdate={setWishes}/>}
        {tab==="cal"&&<CalView goals={goals} calTasks={calTasks} setCalTasks={setCalTasks}/>}
        {tab==="deadlines"&&<DeadlinesView goals={goals}/>}
        {tab==="ideas"&&<IdeasPage onMakeGoal={idea=>{setTab("goals");setEditG({id:uid(),title:idea.title,desc:idea.note||"",cat:"work",prio:"medium",deadline:"",reward:"",tasks:[],done:false,created:new Date().toISOString()});setSheet(true);}}/>}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav" aria-label="Навигация">
        <div className="bottom-nav-inner">
          {tabs.map(t=>{
            const active=tab===t.id;
            return(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:active?"#EEF2FF":"none",border:"none",cursor:"pointer",padding:"6px 10px",borderRadius:16,minWidth:0,transition:"background .2s",flex:1}}>
                <span style={{fontSize:20,filter:active?"none":"grayscale(60%)",opacity:active?1:.5,transform:active?"scale(1.1)":"scale(1)",transition:"all .2s",display:"block"}}>{t.emoji}</span>
                <span style={{fontSize:10,fontWeight:active?800:600,color:active?"#6366F1":"#94A3B8",transition:"color .2s",whiteSpace:"nowrap"}}>{t.label}</span>
                {active&&<div style={{width:20,height:3,borderRadius:2,background:"#6366F1",marginTop:1}}/>}
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={sheet} onClose={()=>{setSheet(false);setEditG(null);}} title={editG?"Редактировать цель":"Новая цель 🎯"}>
        <GoalForm goal={editG} onSave={doSave} onClose={()=>{setSheet(false);setEditG(null);}}/>
      </Sheet>
    </div>
  );
}