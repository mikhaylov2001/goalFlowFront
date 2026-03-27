import { useState, useEffect, useCallback, useMemo, useRef } from "react";

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
const EMOJI_LIST   = ["💼","💪","📖","🌟","💰","🎨","🏃","💧","🧘","😴","🥗","🎯","✍️","🎸","🏠","✈️","🚗","💻","📱","🎓","🏖️","🎮","📚","🌍","☕","🎬"];
const MO_NAMES     = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WEEKDAYS     = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const IDEA_TAGS    = ["Все","Бизнес","Технологии","Творчество","Обучение","Личное","Другое"];
const IDEA_COLORS  = ["#6366F1","#10B981","#F97316","#EC4899","#EAB308","#14B8A6","#EF4444","#8B5CF6"];

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
function fmtDateFull(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}
function daysLeft(d) {
  if (!d) return null;
  const t = new Date(d); t.setHours(0,0,0,0);
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t - n) / 864e5);
}
function dateKey(d) {
  if (typeof d === "string") return d;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayKey() {
  return dateKey(new Date());
}
function sameDay(a,b) {
  return a.getFullYear()===b.getFullYear() &&
         a.getMonth()===b.getMonth() &&
         a.getDate()===b.getDate();
}

function getWeekDays() {
  const now = new Date();
  const day = (now.getDay()+6)%7;
  const mon = new Date(now); mon.setDate(now.getDate()-day); mon.setHours(0,0,0,0);
  return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return dateKey(d); });
}

function monthDays(y,m) {
  const first=new Date(y,m,1);
  const last=new Date(y,m+1,0);
  const days=[];
  const pad=(first.getDay()+6)%7;

  for(let i=pad-1;i>=0;i--) days.push({d:new Date(y,m,-i),cur:false});
  for(let i=1;i<=last.getDate();i++) days.push({d:new Date(y,m,i),cur:true});
  while(days.length<42){
    const n=days.length-pad-last.getDate()+1;
    days.push({d:new Date(y,m+1,n),cur:false});
  }
  return days;
}

function countTasks(tasks) {
  let total=0,done=0;
  (tasks||[]).forEach(t=>{
    total++;
    if(t.done) done++;
    const s=countTasks(t.children);
    total+=s.total;
    done+=s.done;
  });
  return {total,done};
}

// ── API ──

const BASE = import.meta.env?.VITE_API_URL || "";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API ${res.status}`);
  }
  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("application/json")) return null;
  return res.json();
}

const api = {
  getCalendar() {
    return apiFetch("/api/calendar");
  },
  createCalendar(payload) {
    return apiFetch("/api/calendar", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateCalendar(id, payload) {
    return apiFetch(`/api/calendar/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteCalendar(id) {
    return apiFetch(`/api/calendar/${id}`, { method: "DELETE" });
  },
};

async function loadData() {
  try {
    const [goals, habits, wishes, calendar] = await Promise.all([
      apiFetch("/api/goals"),
      apiFetch("/api/habits"),
      apiFetch("/api/wishes"),
      api.getCalendar(),
    ]);
    return { goals, habits, wishes, calendar };
  } catch (e) {
    console.error("Load failed:", e);
    return { goals: [], habits: [], wishes: [], calendar: [] };
  }
}

// ── Styles ──

const S = {
  field: {
    width:"100%",padding:"13px 16px",borderRadius:16,
    border:"1.5px solid #E8EDF5",fontSize:16,outline:"none",
    background:"#fff",color:"#0F172A",boxSizing:"border-box",
    transition:"border-color .2s",
  },
  lbl: {
    display:"block",fontSize:11,fontWeight:800,color:"#94A3B8",
    marginBottom:7,textTransform:"uppercase",letterSpacing:"0.06em",
  },
  ghostBtn: {
    background:"none",border:"none",fontSize:16,cursor:"pointer",
    padding:"6px 12px",borderRadius:10,
  },
};

const CSS_GLOBAL = `
  @keyframes sheetUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes pageIn    { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pop       { 0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)} }

  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  ::-webkit-scrollbar { display:none; }

  html, body, #root {
    margin:0;
    padding:0;
    min-height:100%;
    background:#F8FAFC;
    overscroll-behavior:none;
  }

  body {
    min-height:100dvh;
  }

  input,textarea,select,button {
    font-family:'Nunito',-apple-system,sans-serif;
    font-size:16px;
  }

  input:focus,textarea:focus {
    border-color:#6366F1 !important;
  }

  .app-wrap {
    min-height:100dvh;
    padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  }

  .bottom-nav {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: 0;
    width: min(100%, 430px);
    padding: 10px 10px calc(env(safe-area-inset-bottom, 0px) + 10px);
    background: rgba(255,255,255,.96);
    backdrop-filter: blur(16px);
    border-top: 1px solid #F1F5F9;
    box-shadow: 0 -8px 30px rgba(15,23,42,.08);
    z-index: 100;
  }
`;

// ── Confetti ──

function Confetti({active}) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const canvas = ref.current;
    const ctx = canvas.getContext("2d");

    canvas.width  = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2,2);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    const cols = ["#6366F1","#EC4899","#F97316","#10B981","#EAB308","#8B5CF6","#EF4444"];

    const particles = Array.from({length:70}, () => ({
      x: W/2 + (Math.random()-.5)*60,
      y: H*.4,
      vx: (Math.random()-.5)*14,
      vy: -Math.random()*18 - 4,
      sz: Math.random()*7 + 3,
      col: cols[Math.floor(Math.random()*cols.length)],
      rot: Math.random()*360,
      rs:  (Math.random()-.5)*10,
      g:   .4 + Math.random()*.15,
      life: 1,
      dec: .009 + Math.random()*.006,
    }));

    const animate = () => {
      ctx.clearRect(0,0,W,H);
      let alive = false;
      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.vx *= .98;
        p.rot += p.rs;
        p.life -= p.dec;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI/180);
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.sz/2, -p.sz/4, p.sz, p.sz/2);
        ctx.restore();
      });
      if (alive) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={ref}
      style={{
        position:"fixed",inset:0,zIndex:9999,pointerEvents:"none",
        width:"100%",height:"100%",
      }}
    />
  );
}

// ── Sheet ──

function Sheet({open,onClose,title,children}) {
  if (!open) return null;
  return (
    <div
      style={{
        position:"fixed",inset:0,zIndex:999,
        display:"flex",flexDirection:"column",justifyContent:"flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position:"absolute",inset:0,
          background:"rgba(0,0,0,0.4)",
          backdropFilter:"blur(8px)",
        }}
      />
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          position:"relative",background:"#fff",
          borderRadius:"28px 28px 0 0",
          maxHeight:"92vh",overflow:"auto",
          padding:"0 20px calc(env(safe-area-inset-bottom,16px) + 20px)",
          animation:"sheetUp .32s cubic-bezier(.32,1.12,.36,1)",
        }}
      >
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 6px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:"#E2E8F0"}} />
        </div>
        {title && (
          <h2 style={{margin:"6px 0 20px",fontSize:20,fontWeight:900}}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Emoji pick ──

function EmojiPick({value,onChange}) {
  const [open,setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={()=>setOpen(!open)}
        style={{
          height:48,paddingLeft:14,paddingRight:14,borderRadius:14,
          border:"1.5px solid #E8EDF5",
          background:value?"#EEF2FF":"#F8FAFC",
          fontSize:22,cursor:"pointer",
          display:"flex",alignItems:"center",gap:8,
        }}
      >
        <span>{value || "😀"}</span>
        <span style={{fontSize:11,color:"#94A3B8",fontWeight:700}}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div
          style={{
            marginTop:8,background:"#fff",borderRadius:18,padding:12,
            border:"1.5px solid #F1F5F9",
            boxShadow:"0 8px 30px rgba(0,0,0,0.1)",
            display:"grid",gridTemplateColumns:"repeat(7,1fr)",
            gap:4,zIndex:10,position:"relative",
          }}
        >
          {EMOJI_LIST.map(e => (
            <button
              key={e}
              onClick={() => { onChange(e); setOpen(false); }}
              style={{
                width:"100%",aspectRatio:"1",borderRadius:10,
                border:"none",
                background:value===e?"#EEF2FF":"#F8FAFC",
                fontSize:20,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}
            >
              {e}
            </button>
          ))}
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            style={{
              width:"100%",aspectRatio:"1",borderRadius:10,
              border:"none",background:"#FEF2F2",
              fontSize:14,cursor:"pointer",
              fontWeight:700,color:"#EF4444",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── GoalForm ──

function GoalForm({goal,onSave,onClose}) {
  const [f,sf] = useState(
    goal || {
      id:uid(),
      title:"",
      desc:"",
      cat:"work",
      prio:"medium",
      deadline:"",
      reward:"",
      tasks:[],
      done:false,
      created:new Date().toISOString(),
    }
  );

  const u  = (k,v) => sf(p => ({...p,[k]:v}));
  const un = (k,v) => sf(p => ({...p,notif:{...p.notif,[k]:v}}));

  return (
    <>
      <input
        value={f.title}
        onChange={e=>u("title",e.target.value)}
        placeholder="Название цели"
        style={{
          width:"100%",fontSize:22,fontWeight:900,border:"none",
          padding:"4px 0",background:"transparent",outline:"none",
          color:"#0F172A",marginBottom:4,
        }}
      />
      <textarea
        value={f.desc}
        onChange={e=>u("desc",e.target.value)}
        placeholder="Описание (необязательно)"
        style={{
          width:"100%",minHeight:40,resize:"none",
          border:"none",padding:"4px 0",
          background:"transparent",fontSize:15,
          color:"#64748B",outline:"none",
          marginBottom:16,lineHeight:1.5,
        }}
      />

      <label style={S.lbl}>Категория</label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {CATS.map(c => (
          <button
            key={c.id}
            onClick={()=>u("cat",c.id)}
            style={{
              padding:"11px 8px",borderRadius:16,
              border:f.cat===c.id?`2px solid ${c.accent}`:"2px solid #F1F5F9",
              background:f.cat===c.id?c.accent+"16":"#FAFAFA",
              fontSize:13,fontWeight:700,cursor:"pointer",
              color:f.cat===c.id?c.accent:"#94A3B8",
              textAlign:"center",transition:"all .15s",
            }}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <label style={S.lbl}>Приоритет</label>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {Object.entries(PRIO).map(([k,v])=>(
          <button
            key={k}
            onClick={()=>u("prio",k)}
            style={{
              flex:1,padding:"12px 0",borderRadius:14,
              border:f.prio===k?`2px solid ${v.c}`:"2px solid #F1F5F9",
              background:f.prio===k?v.bg:"#FAFAFA",
              fontSize:13,fontWeight:700,cursor:"pointer",
              color:f.prio===k?v.c:"#B0B8C4",
              transition:"all .15s",
            }}
          >
            {v.l}
          </button>
        ))}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <label style={S.lbl}>Дедлайн 📅</label>
          <input
            type="date"
            value={f.deadline}
            onChange={e=>u("deadline",e.target.value)}
            style={{...S.field,height:52,padding:"0 12px",display:"block",width:"100%"}}
          />
        </div>
        <div style={{flex:1}}>
          <label style={S.lbl}>Награда 🎁</label>
          <input
            value={f.reward}
            onChange={e=>u("reward",e.target.value)}
            placeholder="За победу!"
            style={{...S.field,height:52,padding:"0 12px",display:"block",width:"100%"}}
          />
        </div>
      </div>

      <button
        onClick={()=>{
          if (f.title.trim()) { onSave(f); onClose(); }
        }}
        style={{
          width:"100%",padding:"17px 0",borderRadius:18,border:"none",
          background:f.title.trim() ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "#E2E8F0",
          color:f.title.trim() ? "#fff" : "#94A3B8",
          fontSize:16,fontWeight:800,
          cursor:f.title.trim() ? "pointer" : "default",
          boxShadow:f.title.trim() ? "0 6px 20px rgba(99,102,241,.35)" : "none",
          transition:"all .2s",
        }}
      >
        {goal ? "Сохранить ✨" : "Создать 🚀"}
      </button>
    </>
  );
}

// ── TaskItem ──

function TaskItem({
  task,tp,accent,isExp,onToggleExp,onToggle,
  onToggleMicro,onDelete,onAddMicro,onSetPrio,
  onRenameTask,onRenameMicro,cd,ct,
}) {
  const [micro,setMicro] = useState("");
  const [editing,setEditing] = useState(false);
  const [editVal,setEditVal] = useState(task.title);
  const [editMicro,setEditMicro] = useState(null);
  const [editMicroVal,setEditMicroVal] = useState("");

  const has = ct > 0;

  const saveTitle = () => {
    if (editVal.trim()) onRenameTask(editVal.trim());
    setEditing(false);
  };

  const saveMicro = (mid) => {
    if (editMicroVal.trim()) onRenameMicro(mid, editMicroVal.trim());
    setEditMicro(null);
  };

  return (
    <div
      style={{
        background:"#fff",borderRadius:18,overflow:"hidden",
        boxShadow:"0 1px 6px rgba(0,0,0,0.05)",
        opacity:task.done?.55:1,
      }}
    >
      <div style={{height:3,background:tp.c}} />
      <div style={{padding:"13px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div
            onClick={onToggle}
            style={{
              width:26,height:26,borderRadius:9,flexShrink:0,
              border:task.done?"none":`2px solid ${tp.c}55`,
              background:task.done?accent:"#fff",
              cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"#fff",fontSize:13,fontWeight:900,transition:"all .2s",
            }}
          >
            {task.done && "✓"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            {editing ? (
              <input
                autoFocus
                value={editVal}
                onChange={e=>setEditVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e=>e.key==="Enter" && saveTitle()}
                style={{
                  width:"100%",fontSize:15,fontWeight:700,
                  border:"none",borderBottom:`2px solid ${accent}`,
                  outline:"none",padding:"2px 0",
                  background:"transparent",
                }}
              />
            ) : (
              <div
                onClick={()=>{
                  setEditing(true);
                  setEditVal(task.title);
                }}
                style={{
                  fontSize:15,fontWeight:700,
                  textDecoration:task.done?"line-through":"none",
                  color:task.done?"#B0B8C4":"#1E293B",
                  cursor:"text",
                }}
              >
                {task.title}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            {TPRIO.map(p => (
              <div
                key={p.id}
                onClick={()=>onSetPrio(p.id)}
                style={{
                  width:14,height:14,borderRadius:7,cursor:"pointer",
                  background:task.prio===p.id?p.c:"#F1F5F9",
                  border:task.prio===p.id?"none":"1px solid #E2E8F0",
                  transition:"background .15s",
                }}
              />
            ))}
          </div>
          <button
            onClick={onDelete}
            style={{
              background:"none",border:"none",
              color:"#D1D5DB",fontSize:14,
              cursor:"pointer",padding:2,flexShrink:0,lineHeight:1,
            }}
          >
            ✕
          </button>
        </div>
        {has && (
          <div
            onClick={onToggleExp}
            style={{
              display:"flex",alignItems:"center",
              gap:6,marginTop:7,marginLeft:36,cursor:"pointer",
            }}
          >
            <div style={{display:"flex",gap:3}}>
              {task.children.map(c=>(
                <div
                  key={c.id}
                  style={{
                    width:7,height:7,borderRadius:4,
                    background:c.done?"#10B981":"#E2E8F0",
                    transition:"background .2s",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize:11,fontWeight:700,
                color:cd===ct && ct>0 ? "#10B981" : "#94A3B8",
              }}
            >
              {cd}/{ct} {isExp ? "▲" : "▼"}
            </span>
          </div>
        )}
        {!has && !task.done && (
          <div
            onClick={onToggleExp}
            style={{
              marginLeft:36,marginTop:5,fontSize:11,
              color:"#CBD5E1",cursor:"pointer",
              fontWeight:700,
            }}
          >
            {isExp ? "Скрыть" : "+ подзадачи"}
          </div>
        )}
      </div>
      {isExp && (
        <div style={{padding:"0 14px 12px",borderTop:"1px solid #F8FAFC"}}>
          {task.children.map(ch => (
            <div
              key={ch.id}
              style={{
                display:"flex",alignItems:"center",gap:8,
                padding:"8px 0 8px 36px",borderBottom:"1px solid #FAFAFA",
              }}
            >
              <div
                onClick={()=>onToggleMicro(ch.id)}
                style={{
                  width:20,height:20,borderRadius:6,flexShrink:0,
                  border:ch.done?"none":"2px solid #E2E8F0",
                  background:ch.done?"#10B981":"#fff",
                  cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:10,fontWeight:900,transition:"all .2s",
                }}
              >
                {ch.done && "✓"}
              </div>
              {editMicro === ch.id ? (
                <input
                  autoFocus
                  value={editMicroVal}
                  onChange={e=>setEditMicroVal(e.target.value)}
                  onBlur={()=>saveMicro(ch.id)}
                  onKeyDown={e=>e.key==="Enter" && saveMicro(ch.id)}
                  style={{
                    flex:1,fontSize:14,
                    border:"none",borderBottom:`2px solid ${accent}`,
                    outline:"none",padding:"2px 0",
                    background:"transparent",
                  }}
                />
              ) : (
                <span
                  onClick={()=>{
                    setEditMicro(ch.id);
                    setEditMicroVal(ch.title);
                  }}
                  style={{
                    flex:1,fontSize:14,fontWeight:600,
                    color:ch.done?"#B0B8C4":"#475569",
                    textDecoration:ch.done?"line-through":"none",
                    cursor:"text",
                  }}
                >
                  {ch.title}
                </span>
              )}
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:8,marginLeft:36}}>
            <input
              value={micro}
              onChange={e=>setMicro(e.target.value)}
              onKeyDown={e=>{
                if (e.key === "Enter") {
                  onAddMicro(micro);
                  setMicro("");
                }
              }}
              placeholder="＋ Подзадача..."
              style={{
                flex:1,padding:"9px 12px",borderRadius:12,
                border:"1.5px solid #F1F5F9",fontSize:14,
                outline:"none",background:"#F8FAFC",
                color:"#0F172A",boxSizing:"border-box",
              }}
            />
            <button
              onClick={()=>{
                onAddMicro(micro);
                setMicro("");
              }}
              style={{
                width:36,height:36,borderRadius:10,border:"none",
                background:"#F1F5F9",color:accent,fontSize:18,
                cursor:"pointer",display:"flex",alignItems:"center",
                justifyContent:"center",fontWeight:900,
              }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GoalCard ──

function GoalCard({g,onTap,onToggle}) {
  const cat = CATS.find(c=>c.id===g.cat) || CATS[0];
  const pri = PRIO[g.prio] || PRIO.medium;
  const {total,done} = countTasks(g.tasks);
  const pct = total>0 ? (done/total)*100 : g.done ? 100 : 0;
  const dl = daysLeft(g.deadline);
  const overdue = dl !== null && dl < 0 && !g.done;

  return (
    <div
      onClick={onTap}
      style={{
        background:"#fff",borderRadius:22,overflow:"hidden",
        marginBottom:10,boxShadow:"0 2px 14px rgba(0,0,0,0.06)",
        opacity:g.done?.6:1,cursor:"pointer",
        animation:"fadeIn .3s ease",
      }}
    >
      <div style={{height:4,background:`linear-gradient(90deg,${cat.accent},${cat.accent}77)`}} />
      <div style={{padding:"14px 16px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div
            style={{
              width:48,height:48,borderRadius:15,
              background:cat.accent+"15",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:22,flexShrink:0,
            }}
          >
            {g.done ? "🎉" : cat.emoji}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4,flexWrap:"wrap"}}>
              <span
                style={{
                  fontSize:10,fontWeight:800,
                  padding:"2px 8px",borderRadius:6,
                  background:pri.bg,color:pri.c,
                }}
              >
                {pri.l}
              </span>
              {g.reward && <span style={{fontSize:12}}>🎁</span>}
            </div>
            <div
              style={{
                fontSize:16,fontWeight:800,
                color:g.done?"#94A3B8":"#0F172A",
                textDecoration:g.done?"line-through":"none",
                whiteSpace:"nowrap",overflow:"hidden",
                textOverflow:"ellipsis",lineHeight:1.2,
              }}
            >
              {g.title}
            </div>
            <div
              style={{
                display:"flex",gap:6,marginTop:5,
                flexWrap:"wrap",alignItems:"center",
              }}
            >
              {g.deadline && (
                <span
                  style={{
                    fontSize:11,fontWeight:700,
                    padding:"2px 8px",borderRadius:6,
                    background:overdue?"#FEE2E2":"#F1F5F9",
                    color:overdue?"#DC2626":"#64748B",
                  }}
                >
                  📅 {fmtDate(g.deadline)}
                  {dl!==null && !g.done && (
                    <span style={{opacity:.7}}>
                      {" · "}
                      {overdue
                        ? `${Math.abs(dl)}д назад`
                        : dl===0 ? "сегодня!" :
                          dl===1 ? "завтра" : `${dl}д`}
                    </span>
                  )}
                </span>
              )}
              {total>0 && (
                <span
                  style={{
                    fontSize:11,fontWeight:700,
                    color:done===total?"#10B981":"#94A3B8",
                  }}
                >
                  ✅ {done}/{total}
                </span>
              )}
            </div>
          </div>
          <div
            onClick={e=>{
              e.stopPropagation();
              onToggle(g.id);
            }}
            style={{
              width:36,height:36,borderRadius:12,flexShrink:0,
              border:g.done?"none":"2.5px solid #E2E8F0",
              background:g.done
                ? `linear-gradient(135deg,${cat.accent},${cat.accent}BB)`
                : "#fff",
              cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"#fff",fontSize:16,fontWeight:900,
              transition:"all .2s",
            }}
          >
            {g.done && "✓"}
          </div>
        </div>
        {total>0 && (
          <div
            style={{
              marginTop:10,height:4,borderRadius:2,
              background:"#F1F5F9",overflow:"hidden",
            }}
          >
            <div
              style={{
                height:"100%",borderRadius:2,width:`${pct}%`,
                background:`linear-gradient(90deg,${cat.accent},${cat.accent}99)`,
                transition:"width .5s",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── GoalDetail с вложенными приоритетами ──

function GoalDetail({goal,onBack,onUpdate,onDelete,onConfetti,onEdit}) {
  const cat = CATS.find(c=>c.id===goal.cat) || CATS[0];
  const pri = PRIO[goal.prio] || PRIO.medium;
  const {total,done} = countTasks(goal.tasks);
  const pct = total>0 ? Math.round((done/total)*100) : goal.done ? 100 : 0;
  const dl = daysLeft(goal.deadline);

  const [newTask,setNewTask] = useState("");
  const [newTP,setNewTP] = useState("medium");
  const [exp,setExp] = useState({});
  const [groupsOpen,setGroupsOpen] = useState({ high:true, medium:true, low:true });

  useEffect(() => {
    if (total>0 && done===total && !goal.done) {
      const t = setTimeout(() => {
        onUpdate({...goal,done:true});
        onConfetti();
      }, 400);
      return () => clearTimeout(t);
    }
    if (total>0 && done<total && goal.done) {
      onUpdate({...goal,done:false});
    }
  }, [total,done]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    const tid = uid();

    try {
      await apiFetch("/api/tasks", {
        method:"POST",
        body:JSON.stringify({
          id:tid,
          goal_id:goal.id,
          title:newTask.trim(),
          prio:newTP,
        }),
      });
    } catch (e) {
      console.error(e);
    }

    onUpdate({
      ...goal,
      tasks:[
        ...goal.tasks,
        {id:tid,title:newTask.trim(),done:false,prio:newTP,children:[]},
      ],
    });

    setNewTask("");
  };

  const toggleTask = async (tid) => {
    const updated = goal.tasks.map(t =>
      t.id === tid
        ? {
            ...t,
            done:!t.done,
            children:t.children.map(c => ({...c,done:!t.done})),
          }
        : t
    );

    const task = goal.tasks.find(t=>t.id===tid);
    if (task) {
      try {
        await apiFetch(`/api/tasks/${tid}`, {
          method:"PUT",
          body:JSON.stringify({done:!task.done}),
        });
        for (const c of task.children) {
          await apiFetch(`/api/microtasks/${c.id}`, {
            method:"PUT",
            body:JSON.stringify({done:!task.done}),
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    onUpdate({...goal,tasks:updated});
  };

  const toggleMicro = async (tid,mid) => {
    const updated = goal.tasks.map(t => {
      if (t.id !== tid) return t;
      const children = t.children.map(c =>
        c.id === mid ? {...c,done:!c.done} : c
      );
      const allDone = children.length>0 && children.every(c=>c.done);
      return {...t,children,done:allDone};
    });

    const task  = goal.tasks.find(t=>t.id===tid);
    const micro = task?.children.find(c=>c.id===mid);

    if (micro && task) {
      try {
        await apiFetch(`/api/microtasks/${mid}`, {
          method:"PUT",
          body:JSON.stringify({done:!micro.done}),
        });

        const nextChildren = task.children.map(c =>
          c.id === mid ? {...c,done:!c.done} : c
        );
        const allDone = nextChildren.length>0 && nextChildren.every(c=>c.done);

        if (allDone !== task.done) {
          await apiFetch(`/api/tasks/${tid}`, {
            method:"PUT",
            body:JSON.stringify({done:allDone}),
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    onUpdate({...goal,tasks:updated});
  };

  const deleteTask = async (tid) => {
    try {
      await apiFetch(`/api/tasks/${tid}`, {method:"DELETE"});
    } catch (e) {
      console.error(e);
    }
    onUpdate({...goal,tasks:goal.tasks.filter(t=>t.id!==tid)});
  };

  const addMicro = async (pid,title) => {
    if (!title.trim()) return;
    const mid = uid();
    try {
      await apiFetch("/api/microtasks", {
        method:"POST",
        body:JSON.stringify({id:mid,task_id:pid,title:title.trim()}),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks:goal.tasks.map(t =>
        t.id === pid
          ? {
              ...t,
              children:[...t.children,{id:mid,title:title.trim(),done:false}],
              done:false,
            }
          : t
      ),
    });
  };

  const setTPrio = async (tid,p) => {
    try {
      await apiFetch(`/api/tasks/${tid}`, {
        method:"PUT",
        body:JSON.stringify({prio:p}),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks:goal.tasks.map(t=>t.id===tid ? {...t,prio:p} : t),
    });
  };

  const renameTask = async (tid,newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await apiFetch(`/api/tasks/${tid}`, {
        method:"PUT",
        body:JSON.stringify({title:newTitle.trim()}),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks:goal.tasks.map(t =>
        t.id===tid ? {...t,title:newTitle.trim()} : t
      ),
    });
  };

  const renameMicro = async (tid,mid,newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await apiFetch(`/api/microtasks/${mid}`, {
        method:"PUT",
        body:JSON.stringify({title:newTitle.trim()}),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks:goal.tasks.map(t =>
        t.id === tid
          ? {
              ...t,
              children:t.children.map(c =>
                c.id === mid ? {...c,title:newTitle.trim()} : c
              ),
            }
          : t
      ),
    });
  };

  const grouped = useMemo(() => {
    return TPRIO
      .map(p => {
        const tasks = goal.tasks
          .filter(t => (t.prio || "medium") === p.id)
          .sort((a,b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            return a.title.localeCompare(b.title,"ru");
          });
        return {...p,tasks};
      })
      .filter(section => section.tasks.length > 0);
  }, [goal.tasks]);

  return (
    <div
      style={{
        animation:"pageIn .3s ease",
        minHeight:"100vh",
        background:"#F8FAFC",
      }}
    >
      {/* шапка цели */}
      <div
        style={{
          background:`linear-gradient(135deg,${cat.accent},${cat.accent}CC)`,
          padding:"calc(env(safe-area-inset-top,16px) + 8px) 20px 28px",
          color:"#fff",position:"relative",overflow:"hidden",
        }}
      >
        <div
          style={{
            position:"absolute",top:-40,right:-40,
            width:140,height:140,borderRadius:70,
            background:"rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position:"absolute",bottom:-20,left:-20,
            width:100,height:100,borderRadius:50,
            background:"rgba(255,255,255,0.06)",
          }}
        />

        <div
          style={{
            display:"flex",alignItems:"center",gap:10,
            marginBottom:18,position:"relative",
          }}
        >
          <button
            onClick={onBack}
            style={{
              background:"rgba(255,255,255,0.2)",border:"none",
              color:"#fff",fontSize:18,cursor:"pointer",
              padding:"8px 14px",borderRadius:14,
              fontWeight:700,backdropFilter:"blur(8px)",
            }}
          >
            ←
          </button>
          <div style={{flex:1}} />
          <button
            onClick={()=>onEdit(goal)}
            style={{
              background:"rgba(255,255,255,0.2)",border:"none",
              color:"#fff",fontSize:14,cursor:"pointer",
              padding:"8px 14px",borderRadius:14,
              fontWeight:700,backdropFilter:"blur(8px)",
            }}
          >
            ✏️ Изменить
          </button>
          <button
            onClick={()=>onDelete(goal.id)}
            style={{
              background:"rgba(255,255,255,0.15)",border:"none",
              color:"#fff",fontSize:14,cursor:"pointer",
              padding:"8px 14px",borderRadius:14,
              fontWeight:700,backdropFilter:"blur(8px)",
            }}
          >
            🗑️
          </button>
        </div>

        <div style={{position:"relative"}}>
          <div
            style={{
              display:"flex",alignItems:"center",gap:8,
              marginBottom:8,flexWrap:"wrap",
            }}
          >
            <span style={{fontSize:30}}>{cat.emoji}</span>
            <span
              style={{
                fontSize:12,fontWeight:800,
                background:"rgba(255,255,255,0.22)",
                padding:"4px 12px",borderRadius:10,
                backdropFilter:"blur(4px)",
              }}
            >
              {cat.label}
            </span>
            <span
              style={{
                fontSize:12,fontWeight:800,
                background:"rgba(255,255,255,0.22)",
                padding:"4px 12px",borderRadius:10,
                backdropFilter:"blur(4px)",
              }}
            >
              {pri.l}
            </span>
          </div>

          <h1
            style={{
              margin:"0 0 6px",fontSize:26,fontWeight:900,
              letterSpacing:"-0.03em",lineHeight:1.2,
            }}
          >
            {goal.title}
          </h1>

          {goal.desc && (
            <p
              style={{
                margin:"0 0 16px",fontSize:14,
                opacity:.85,lineHeight:1.5,
              }}
            >
              {goal.desc}
            </p>
          )}
        </div>

        <div style={{display:"flex",gap:10,position:"relative"}}>
          <div
            style={{
              flex:1,background:"rgba(255,255,255,0.18)",
              borderRadius:18,padding:"14px 16px",
              backdropFilter:"blur(8px)",
            }}
          >
            <div
              style={{
                display:"flex",justifyContent:"space-between",
                marginBottom:8,
              }}
            >
              <span style={{fontSize:12,fontWeight:700,opacity:.85}}>
                Прогресс
              </span>
              <span style={{fontSize:20,fontWeight:900}}>
                {pct}%
              </span>
            </div>
            <div
              style={{
                height:7,borderRadius:4,
                background:"rgba(255,255,255,0.25)",overflow:"hidden",
              }}
            >
              <div
                style={{
                  height:"100%",borderRadius:4,width:`${pct}%`,
                  background:"#fff",transition:"width .5s",
                }}
              />
            </div>
            <div
              style={{
                fontSize:11,marginTop:6,
                opacity:.75,fontWeight:700,
              }}
            >
              {done} из {total} задач
            </div>
          </div>

          {(goal.deadline || goal.reward) && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {goal.deadline && (
                <div
                  style={{
                    background:"rgba(255,255,255,0.18)",
                    borderRadius:14,padding:"10px 14px",
                    textAlign:"center",backdropFilter:"blur(8px)",
                  }}
                >
                  <div style={{fontSize:14,fontWeight:800}}>
                    📅 {fmtDate(goal.deadline)}
                  </div>
                  {dl !== null && (
                    <div
                      style={{
                        fontSize:10,opacity:.75,
                        marginTop:2,
                      }}
                    >
                      {dl<0 ? "просрочено" :
                       dl===0 ? "сегодня" :
                       dl===1 ? "завтра" : `${dl} дн.`}
                    </div>
                  )}
                </div>
              )}
              {goal.reward && (
                <div
                  style={{
                    background:"rgba(255,255,255,0.18)",
                    borderRadius:14,padding:"10px 14px",
                    textAlign:"center",backdropFilter:"blur(8px)",
                  }}
                >
                  <div style={{fontSize:13,fontWeight:800}}>
                    🎁 {goal.reward}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* задачи, сгруппированные по приоритету */}
      <div style={{padding:"20px 16px 100px"}}>
        <div style={{display:"flex",gap:10,marginBottom:8}}>
          <input
            value={newTask}
            onChange={e=>setNewTask(e.target.value)}
            onKeyDown={e=>e.key==="Enter" && addTask()}
            placeholder="＋ Новая задача..."
            style={{
              flex:1,padding:"14px 16px",
              borderRadius:18,border:"2px solid #F1F5F9",
              fontSize:15,outline:"none",
              background:"#fff",color:"#0F172A",
              boxSizing:"border-box",transition:"border-color .2s",
            }}
          />
          <button
            onClick={addTask}
            style={{
              width:52,height:52,borderRadius:16,border:"none",
              background:`linear-gradient(135deg,${cat.accent},${cat.accent}CC)`,
              color:"#fff",fontSize:22,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:`0 4px 14px ${cat.accent}44`,
            }}
          >
            +
          </button>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {TPRIO.map(p=>(
            <button
              key={p.id}
              onClick={()=>setNewTP(p.id)}
              style={{
                padding:"6px 12px",borderRadius:50,
                border:newTP===p.id?`2px solid ${p.c}`:"2px solid #F1F5F9",
                background:newTP===p.id?p.c+"18":"#FAFAFA",
                fontSize:11,fontWeight:700,cursor:"pointer",
                color:newTP===p.id?p.c:"#B0B8C4",
              }}
            >
              {p.e} {p.l}
            </button>
          ))}
        </div>

        {goal.tasks.length === 0 ? (
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:52}}>📝</div>
            <div
              style={{
                fontSize:16,fontWeight:800,
                color:"#94A3B8",marginTop:8,
              }}
            >
              Добавь задачу
            </div>
            <div style={{fontSize:13,color:"#CBD5E1",marginTop:4}}>
              Разбей цель на шаги
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {grouped.map(section => (
              <div
                key={section.id}
                style={{
                  background:"#F8FAFC",borderRadius:20,
                  border:"1px solid #EEF2F7",overflow:"hidden",
                }}
              >
                <button
                  onClick={() =>
                    setGroupsOpen(prev => ({
                      ...prev,
                      [section.id]: !prev[section.id],
                    }))
                  }
                  style={{
                    width:"100%",display:"flex",alignItems:"center",
                    justifyContent:"space-between",
                    padding:"14px 14px",
                    border:"none",background:"#fff",cursor:"pointer",
                  }}
                >
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:18}}>{section.e}</span>
                    <div
                      style={{
                        display:"flex",flexDirection:"column",
                        alignItems:"flex-start",
                      }}
                    >
                      <span
                        style={{
                          fontSize:14,fontWeight:900,
                          color:section.c,
                        }}
                      >
                        {section.l}
                      </span>
                      <span
                        style={{
                          fontSize:11,fontWeight:700,
                          color:"#94A3B8",
                        }}
                      >
                        {section.tasks.length} задач
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize:12,fontWeight:800,
                      color:"#94A3B8",
                    }}
                  >
                    {groupsOpen[section.id] === false ? "▼" : "▲"}
                  </span>
                </button>

                {groupsOpen[section.id] !== false && (
                  <div
                    style={{
                      display:"flex",flexDirection:"column",
                      gap:10,padding:"12px",
                    }}
                  >
                    {section.tasks.map(task => {
                      const tp = TPRIO.find(p=>p.id===(task.prio||"medium")) || TPRIO[1];
                      const isExp = !!exp[task.id];
                      const cd = task.children.filter(c=>c.done).length;
                      const ct = task.children.length;
                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          tp={tp}
                          accent={cat.accent}
                          isExp={isExp}
                          onToggleExp={() =>
                            setExp(prev => ({
                              ...prev,
                              [task.id]: !prev[task.id],
                            }))
                          }
                          onToggle={() => toggleTask(task.id)}
                          onToggleMicro={mid => toggleMicro(task.id,mid)}
                          onDelete={() => deleteTask(task.id)}
                          onAddMicro={t => addMicro(task.id,t)}
                          onSetPrio={p => setTPrio(task.id,p)}
                          onRenameTask={title => renameTask(task.id,title)}
                          onRenameMicro={(mid,title) => renameMicro(task.id,mid,title)}
                          cd={cd}
                          ct={ct}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── HabitsPage / WishesPage / IdeasPage ──
// (оставляю как в твоем исходнике, без изменений логики,
//  кроме совместимости с CSS_GLOBAL и оболочкой)

function HabitsPage({habits,onUpdate}) {
  const [sheet,setSheet] = useState(false);
  const [editH,setEditH] = useState(null);
  const week = useMemo(()=>getWeekDays(),[]);
  const tk = todayKey();
  const todayDone = habits.filter(h => h.logs && h.logs[tk]).length;

  const toggleDay = async (id,dk) => {
    try {
      const res = await apiFetch(`/api/habits/${id}/toggle`,{
        method:"POST",
        body:JSON.stringify({date:dk}),
      });
      onUpdate(
        habits.map(h=>{
          if (h.id !== id) return h;
          const logs = {...h.logs};
          if (logs[dk]) delete logs[dk];
          else logs[dk] = true;
          return {...h,logs,streak:res.streak};
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  const saveH = async (h) => {
    try {
      const ex = habits.find(x=>x.id===h.id);
      if (ex) {
        await apiFetch(`/api/habits/${h.id}`, {
          method:"PUT",
          body:JSON.stringify({
            title:h.title,
            emoji:h.emoji,
            color:h.color,
            streak:ex.streak||0,
          }),
        });
        onUpdate(
          habits.map(x=>x.id===h.id ? {...x,title:h.title,emoji:h.emoji,color:h.color} : x)
        );
      } else {
        await apiFetch("/api/habits", {
          method:"POST",
          body:JSON.stringify(h),
        });
        onUpdate([...habits,{...h,logs:{},streak:0}]);
      }
    } catch (e) {
      console.error(e);
    }
    setSheet(false);
    setEditH(null);
  };

  const delH = async (id) => {
    try {
      await apiFetch(`/api/habits/${id}`, {method:"DELETE"});
    } catch (e) {
      console.error(e);
    }
    onUpdate(habits.filter(x=>x.id!==id));
  };

  return (
    <div>
      <div
        style={{
          background:"linear-gradient(135deg,#10B981,#059669)",
          borderRadius:22,padding:"18px 20px",marginBottom:14,
          color:"#fff",
        }}
      >
        <div
          style={{
            display:"flex",alignItems:"center",
            justifyContent:"space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize:13,opacity:.85,
                fontWeight:600,marginBottom:4,
              }}
            >
              Сегодня
            </div>
            <div style={{fontSize:26,fontWeight:900}}>
              {todayDone} из {habits.length} ✓
            </div>
            <div
              style={{
                fontSize:12,opacity:.75,
                marginTop:2,
              }}
            >
              {todayDone===habits.length && habits.length>0
                ? "🎉 Все выполнено!"
                : todayDone===0
                ? "Начни прямо сейчас"
                : "Так держать!"}
            </div>
          </div>
          <button
            onClick={() => { setEditH(null); setSheet(true); }}
            style={{
              width:48,height:48,borderRadius:16,
              border:"none",
              background:"rgba(255,255,255,0.22)",
              color:"#fff",fontSize:26,cursor:"pointer",
              display:"flex",alignItems:"center",
              justifyContent:"center",
              backdropFilter:"blur(8px)",
            }}
          >
            +
          </button>
        </div>
        {habits.length>0 && (
          <div
            style={{
              marginTop:14,height:6,borderRadius:3,
              background:"rgba(255,255,255,0.3)",overflow:"hidden",
            }}
          >
            <div
              style={{
                height:"100%",borderRadius:3,
                background:"#fff",
                width:`${(todayDone/habits.length)*100}%`,
                transition:"width .5s",
              }}
            />
          </div>
        )}
      </div>

      {habits.length===0 ? (
        <div style={{textAlign:"center",padding:"50px 20px"}}>
          <div style={{fontSize:56}}>🔄</div>
          <div
            style={{
              fontSize:17,fontWeight:800,
              color:"#94A3B8",marginTop:10,
            }}
          >
            Создай первую привычку
          </div>
          <div style={{fontSize:13,color:"#CBD5E1",marginTop:4}}>
            Маленькие шаги — большие результаты
          </div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {habits.map(h=>{
            const weekDone = week.filter(dk => h.logs && h.logs[dk]).length;
            const todayActive = !!(h.logs && h.logs[tk]);
            return (
              <div
                key={h.id}
                style={{
                  background:"#fff",borderRadius:22,overflow:"hidden",
                  boxShadow:"0 2px 14px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    height:4,
                    background:`linear-gradient(90deg,${h.color},${h.color}66)`,
                  }}
                />
                <div style={{padding:"14px 16px 14px"}}>
                  <div
                    style={{
                      display:"flex",alignItems:"center",
                      gap:12,marginBottom:12,
                    }}
                  >
                    {h.emoji && (
                      <div
                        style={{
                          width:46,height:46,borderRadius:15,
                          background:h.color+"16",
                          display:"flex",alignItems:"center",
                          justifyContent:"center",
                          fontSize:24,flexShrink:0,
                        }}
                      >
                        {h.emoji}
                      </div>
                    )}
                    <div style={{flex:1}}>
                      <div
                        style={{
                          fontSize:16,fontWeight:800,
                          color:"#0F172A",
                        }}
                      >
                        {h.title}
                      </div>
                      <div
                        style={{
                          fontSize:12,fontWeight:700,
                          color:h.color,marginTop:2,
                        }}
                      >
                        🔥 {h.streak||0} дней ·{" "}
                        <span
                          style={{
                            color:"#94A3B8",fontWeight:600,
                          }}
                        >
                          {weekDone}/7 на неделе
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display:"flex",gap:6,
                        alignItems:"center",
                      }}
                    >
                      <button
                        onClick={() => { setEditH(h); setSheet(true); }}
                        style={{
                          background:"none",border:"none",
                          fontSize:14,cursor:"pointer",
                          color:"#CBD5E1",padding:4,
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => delH(h.id)}
                        style={{
                          background:"none",border:"none",
                          fontSize:14,cursor:"pointer",
                          color:"#E2E8F0",padding:4,
                        }}
                      >
                        ✕
                      </button>
                      <div
                        onClick={()=>toggleDay(h.id,tk)}
                        style={{
                          width:40,height:40,borderRadius:13,flexShrink:0,
                          border:todayActive?"none":"2.5px solid #E2E8F0",
                          background:todayActive
                            ? `linear-gradient(135deg,${h.color},${h.color}CC)`
                            : "#F8FAFC",
                          cursor:"pointer",
                          display:"flex",alignItems:"center",
                          justifyContent:"center",
                          color:todayActive?"#fff":"#94A3B8",
                          fontSize:18,fontWeight:900,
                          transition:"all .2s",
                        }}
                      >
                        {todayActive ? "✓" : "○"}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display:"grid",
                      gridTemplateColumns:"repeat(7,1fr)",
                      gap:5,
                    }}
                  >
                    {week.map((dk,i)=>{
                      const active = !!(h.logs && h.logs[dk]);
                      const isToday = dk === tk;
                      return (
                        <div
                          key={dk}
                          onClick={()=>toggleDay(h.id,dk)}
                          style={{
                            display:"flex",flexDirection:"column",
                            alignItems:"center",gap:3,
                            cursor:"pointer",
                          }}
                        >
                          <div
                            style={{
                              width:"100%",height:32,borderRadius:9,
                              background:active ? h.color : "#F1F5F9",
                              display:"flex",alignItems:"center",
                              justifyContent:"center",
                              fontSize:12,
                              color:active ? "#fff" : "#CBD5E1",
                              fontWeight:800,
                              border:isToday && !active
                                ? `2px solid ${h.color}55`
                                : "2px solid transparent",
                              transition:"all .2s",
                            }}
                          >
                            {active ? "✓" : ""}
                          </div>
                          <span
                            style={{
                              fontSize:9,
                              color:isToday ? "#0F172A" : "#94A3B8",
                              fontWeight:isToday ? 800 : 600,
                            }}
                          >
                            {WEEKDAYS[i]}
                          </span>
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

      <Sheet
        open={sheet}
        onClose={() => { setSheet(false); setEditH(null); }}
        title={editH ? "Редактировать привычку" : "Новая привычка"}
      >
        <HabitForm
          habit={editH}
          onSave={saveH}
          onClose={() => { setSheet(false); setEditH(null); }}
        />
      </Sheet>
    </div>
  );
}

function HabitForm({habit,onSave,onClose}) {
  const [f,sf] = useState(
    habit || {id:uid(),title:"",emoji:"",color:"#6366F1"}
  );
  const u = (k,v) => sf(p => ({...p,[k]:v}));

  return (
    <>
      <input
        value={f.title}
        onChange={e=>u("title",e.target.value)}
        placeholder="Название привычки"
        style={{
          width:"100%",fontSize:20,fontWeight:900,
          border:"none",padding:"6px 0",
          background:"transparent",outline:"none",
          color:"#0F172A",marginBottom:20,
        }}
      />

      <label style={S.lbl}>Цвет</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
        {HABIT_COLORS.map(c=>(
          <button
            key={c}
            onClick={()=>u("color",c)}
            style={{
              width:32,height:32,borderRadius:16,
              border:f.color===c?"2px solid #0F172A":"2px solid #E5E7EB",
              background:c,cursor:"pointer",
            }}
          />
        ))}
      </div>

      <label style={S.lbl}>Иконка</label>
      <div style={{marginBottom:20}}>
        <EmojiPick
          value={f.emoji}
          onChange={v=>u("emoji",v)}
        />
      </div>

      <button
        onClick={()=>{
          if (f.title.trim()) {
            onSave(f);
            onClose();
          }
        }}
        style={{
          width:"100%",padding:"16px 0",borderRadius:18,
          border:"none",
          background:f.title.trim()
            ? "linear-gradient(135deg,#10B981,#06B6D4)"
            : "#E2E8F0",
          color:f.title.trim() ? "#fff" : "#94A3B8",
          fontSize:16,fontWeight:800,
          cursor:f.title.trim() ? "pointer" : "default",
          boxShadow:f.title.trim()
            ? "0 6px 20px rgba(16,185,129,.35)"
            : "none",
        }}
      >
        {habit ? "Сохранить" : "Создать"}
      </button>
    </>
  );
}

// ── Заглушки для Wishes/Ideas (можно вернуть свой код) ──

function WishesPage() {
  return (
    <div style={{textAlign:"center",padding:"50px 20px",color:"#64748B"}}>
      Страница желаний (оставь свой текущий код, если он у тебя был).
    </div>
  );
}

function IdeasPage() {
  return (
    <div style={{textAlign:"center",padding:"50px 20px",color:"#64748B"}}>
      Страница идей (оставь свой текущий код, если он у тебя был).
    </div>
  );
}

// ── CalendarView с кастомными датами ──

function CalView({goals,calTasks,setCalTasks}) {
  const [cur,setCur] = useState(new Date());
  const [priorityFilter,setPriorityFilter] = useState("all");
  const [sheet,setSheet] = useState(false);
  const [form,setForm] = useState({
    id:null,
    title:"",
    date:todayKey(),
    prio:"medium",
    done:false,
  });

  const y = cur.getFullYear();
  const m = cur.getMonth();
  const days = monthDays(y,m);
  const today = new Date();
  const todayK = dateKey(today);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const tomorrowK = dateKey(tomorrowDate);

  const gmap = useMemo(() => {
    const mp = {};
    goals.forEach(g=>{
      if (g.deadline) {
        (mp[g.deadline] ||= []).push(g);
      }
    });
    return mp;
  }, [goals]);

  const tasksByDate = useMemo(() => {
    const prioOrder = {high:0,medium:1,low:2};
    const map = {};
    calTasks
      .filter(t => priorityFilter==="all" || t.prio===priorityFilter)
      .sort((a,b)=>{
        if (a.date!==b.date) return a.date.localeCompare(b.date);
        const pa = prioOrder[a.prio] ?? 1;
        const pb = prioOrder[b.prio] ?? 1;
        if (pa!==pb) return pa-pb;
        if (a.done!==b.done) return a.done?1:-1;
        return a.title.localeCompare(b.title,"ru");
      })
      .forEach(t => {
        (map[t.date] ||= []).push(t);
      });
    return map;
  }, [calTasks,priorityFilter]);

  const sections = useMemo(() => {
    const otherDates = Object.keys(tasksByDate)
      .filter(k => k!==todayK && k!==tomorrowK)
      .sort((a,b)=>a.localeCompare(b))
      .map(k => ({
        id:k,
        title:fmtDateFull(k),
        date:k,
        tasks:tasksByDate[k] || [],
      }));

    return [
      {id:"today",title:"Сегодня",date:todayK,tasks:tasksByDate[todayK] || []},
      {id:"tomorrow",title:"Завтра",date:tomorrowK,tasks:tasksByDate[tomorrowK] || []},
      ...otherDates,
    ];
  }, [tasksByDate,todayK,tomorrowK]);

  const openCreate = (date) => {
    setForm({
      id:null,
      title:"",
      date:date || todayKey(),
      prio:"medium",
      done:false,
    });
    setSheet(true);
  };

  const openEdit = (task) => {
    setForm({
      id:task.id,
      title:task.title,
      date:task.date,
      prio:task.prio || "medium",
      done:!!task.done,
    });
    setSheet(true);
  };

  const closeSheet = () => {
    setSheet(false);
    setForm({
      id:null,
      title:"",
      date:todayKey(),
      prio:"medium",
      done:false,
    });
  };

  const saveTask = async () => {
    if (!form.title.trim() || !form.date) return;
    try {
      if (form.id) {
        await api.updateCalendar(form.id,{
          title:form.title.trim(),
          date:form.date,
          prio:form.prio,
          done:form.done,
        });
        setCalTasks(prev =>
          prev.map(t =>
            t.id===form.id
              ? {...t,title:form.title.trim(),date:form.date,prio:form.prio,done:form.done}
              : t
          )
        );
      } else {
        const res = await api.createCalendar({
          title:form.title.trim(),
          date:form.date,
          prio:form.prio,
        });
        setCalTasks(prev => [
          ...prev,
          {
            id:res.id,
            title:form.title.trim(),
            date:form.date,
            prio:form.prio,
            done:false,
          },
        ]);
      }
      closeSheet();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTask = async (task) => {
    try {
      await api.updateCalendar(task.id,{done:!task.done});
      setCalTasks(prev =>
        prev.map(t => t.id===task.id ? {...t,done:!t.done} : t)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTask = async (id) => {
    try {
      await api.deleteCalendar(id);
      setCalTasks(prev => prev.filter(t=>t.id!==id));
      if (form.id===id) closeSheet();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div
        style={{
          background:"linear-gradient(135deg,#8B5CF6,#7C3AED)",
          borderRadius:22,padding:"16px 20px",
          marginBottom:14,color:"#fff",
        }}
      >
        <div
          style={{
            display:"flex",justifyContent:"space-between",
            alignItems:"center",gap:10,flexWrap:"wrap",
          }}
        >
          <button
            onClick={()=>setCur(new Date(y,m-1,1))}
            style={{
              background:"rgba(255,255,255,0.2)",
              border:"none",color:"#fff",fontSize:18,
              cursor:"pointer",padding:"8px 14px",
              borderRadius:12,backdropFilter:"blur(8px)",
            }}
          >
            ◀
          </button>

          <span style={{fontWeight:900,fontSize:18}}>
            {MO_NAMES[m]} {y}
          </span>

          <button
            onClick={()=>setCur(new Date(y,m+1,1))}
            style={{
              background:"rgba(255,255,255,0.2)",
              border:"none",color:"#fff",fontSize:18,
              cursor:"pointer",padding:"8px 14px",
              borderRadius:12,backdropFilter:"blur(8px)",
            }}
          >
            ▶
          </button>

          <button
            onClick={()=>openCreate(todayKey())}
            style={{
              background:"#fff",color:"#4F46E5",
              fontSize:13,fontWeight:700,
              padding:"8px 12px",borderRadius:12,
              border:"none",cursor:"pointer",
            }}
          >
            ＋ Добавить задачу
          </button>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {[{id:"all",l:"Все"},{id:"high",l:"Важные"},{id:"medium",l:"Средние"},{id:"low",l:"Низкие"}].map(p => (
          <button
            key={p.id}
            onClick={()=>setPriorityFilter(p.id)}
            style={{
              padding:"8px 14px",borderRadius:50,border:"none",
              background:priorityFilter===p.id?"#6366F1":"#fff",
              color:priorityFilter===p.id?"#fff":"#94A3B8",
              fontSize:12,fontWeight:700,cursor:"pointer",
            }}
          >
            {p.l}
          </button>
        ))}
      </div>

      <div
        style={{
          background:"#fff",borderRadius:22,padding:"14px 12px",
          boxShadow:"0 2px 14px rgba(0,0,0,0.06)",marginBottom:14,
        }}
      >
        <div
          style={{
            display:"grid",
            gridTemplateColumns:"repeat(7,1fr)",
            gap:3,marginBottom:8,
          }}
        >
          {WEEKDAYS.map(d => (
            <div
              key={d}
              style={{
                textAlign:"center",fontSize:10,
                fontWeight:800,color:"#94A3B8",
                padding:4,
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div
          style={{
            display:"grid",
            gridTemplateColumns:"repeat(7,1fr)",gap:3,
          }}
        >
          {days.map(({d,cur:cm},i) => {
            const k = dateKey(d);
            const dg = gmap[k] || [];
            const td = sameDay(d,today);
            const ct = tasksByDate[k] || [];
            return (
              <div
                key={i}
                onClick={()=>openCreate(k)}
                style={{
                  minHeight:58,padding:4,borderRadius:12,
                  background:td ? "#EEF2FF" : cm ? "#FAFAFA" : "transparent",
                  border:td ? "2px solid #6366F1" : "2px solid transparent",
                  opacity:cm ? 1 : .25,
                  cursor:"pointer",
                }}
              >
                <div
                  style={{
                    fontSize:11,fontWeight:td?900:600,
                    color:td?"#6366F1":"#64748B",
                    marginBottom:2,
                  }}
                >
                  {d.getDate()}
                </div>

                {dg.slice(0,1).map(g => {
                  const cat = CATS.find(c=>c.id===g.cat);
                  return (
                    <div
                      key={g.id}
                      style={{
                        fontSize:8,padding:"1px 4px",
                        borderRadius:4,marginBottom:2,
                        background:(cat?.accent || "#6366F1")+"20",
                        color:cat?.accent || "#6366F1",
                        fontWeight:700,
                        whiteSpace:"nowrap",overflow:"hidden",
                        textOverflow:"ellipsis",
                        textDecoration:g.done?"line-through":"none",
                      }}
                    >
                      {g.title}
                    </div>
                  );
                })}

                {ct.slice(0,2).map(t => {
                  const pr = TPRIO.find(x=>x.id===t.prio) || TPRIO[1];
                  return (
                    <div
                      key={t.id}
                      style={{
                        fontSize:8,padding:"1px 4px",
                        borderRadius:4,marginBottom:2,
                        background:t.done ? "#10B98120" : pr.c+"20",
                        color:t.done ? "#10B981" : pr.c,
                        fontWeight:700,
                        whiteSpace:"nowrap",overflow:"hidden",
                        textOverflow:"ellipsis",
                        textDecoration:t.done?"line-through":"none",
                      }}
                    >
                      {t.title}
                    </div>
                  );
                })}

                {dg.length+ct.length>2 && (
                  <div
                    style={{
                      fontSize:8,color:"#94A3B8",
                      fontWeight:700,
                    }}
                  >
                    +{dg.length+ct.length-2}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          fontWeight:900,fontSize:16,
          marginBottom:12,
        }}
      >
        📅 Задачи
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {sections.map(section => (
          <div key={section.id}>
            <div
              style={{
                display:"flex",alignItems:"center",
                justifyContent:"space-between",
                marginBottom:8,
              }}
            >
              <div
                style={{
                  fontSize:14,fontWeight:800,
                  color:"#475569",
                }}
              >
                {section.title}{" "}
                <span
                  style={{
                    color:"#94A3B8",fontWeight:700,
                  }}
                >
                  ({fmtDate(section.date)})
                </span>
              </div>
              <button
                onClick={()=>openCreate(section.date)}
                style={{
                  background:"#EEF2FF",color:"#6366F1",
                  border:"none",padding:"6px 10px",
                  borderRadius:10,fontSize:12,
                  fontWeight:800,cursor:"pointer",
                }}
              >
                + задача
              </button>
            </div>

            {section.tasks.length===0 ? (
              <div
                style={{
                  textAlign:"center",padding:"12px",
                  color:"#CBD5E1",fontSize:13,
                  background:"#fff",borderRadius:14,
                }}
              >
                Нет задач
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {section.tasks.map(task => {
                  const pr = TPRIO.find(x=>x.id===task.prio) || TPRIO[1];
                  return (
                    <div
                      key={task.id}
                      style={{
                        display:"flex",alignItems:"center",
                        gap:10,padding:"12px 14px",
                        borderRadius:16,background:"#fff",
                        boxShadow:"0 1px 6px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        onClick={()=>toggleTask(task)}
                        style={{
                          width:24,height:24,borderRadius:8,
                          border:"2px solid #E2E8F0",
                          background:task.done?"#10B981":"#fff",
                          cursor:"pointer",
                          display:"flex",alignItems:"center",
                          justifyContent:"center",
                          color:"#fff",fontSize:14,
                          fontWeight:900,flexShrink:0,
                        }}
                      >
                        {task.done && "✓"}
                      </div>

                      <div style={{flex:1,minWidth:0}}>
                        <div
                          style={{
                            fontSize:14,fontWeight:800,
                            textDecoration:task.done?"line-through":"none",
                            color:task.done?"#94A3B8":"#0F172A",
                            marginBottom:4,
                          }}
                        >
                          {task.title}
                        </div>
                        <div
                          style={{
                            display:"flex",alignItems:"center",
                            gap:8,flexWrap:"wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize:11,fontWeight:800,
                              padding:"4px 8px",borderRadius:999,
                              background:pr.c+"18",color:pr.c,
                            }}
                          >
                            {pr.e} {pr.l}
                          </span>
                          <span
                            style={{
                              fontSize:11,color:"#94A3B8",
                              fontWeight:700,
                            }}
                          >
                            {fmtDate(task.date)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={()=>openEdit(task)}
                        style={{
                          background:"none",border:"none",
                          fontSize:15,cursor:"pointer",
                          padding:4,color:"#94A3B8",
                        }}
                      >
                        ✏️
                      </button>

                      <button
                        onClick={()=>deleteTask(task.id)}
                        style={{
                          background:"none",border:"none",
                          fontSize:15,cursor:"pointer",
                          padding:4,color:"#CBD5E1",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <Sheet
        open={sheet}
        onClose={closeSheet}
        title={
          form.id
            ? "Редактировать задачу"
            : `Новая задача на ${fmtDate(form.date)}`
        }
      >
        <input
          value={form.title}
          onChange={e=>setForm(prev=>({...prev,title:e.target.value}))}
          placeholder="Название задачи..."
          style={{
            width:"100%",padding:"14px 16px",
            borderRadius:18,border:"2px solid #F1F5F9",
            fontSize:15,outline:"none",
            background:"#fff",color:"#0F172A",
            marginBottom:14,
          }}
        />

        <label style={S.lbl}>Дата</label>
        <input
          type="date"
          value={form.date}
          onChange={e=>setForm(prev=>({...prev,date:e.target.value}))}
          style={{...S.field,height:52,padding:"0 12px",marginBottom:14}}
        />

        <label style={S.lbl}>Приоритет</label>
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          {TPRIO.map(p=>(
            <button
              key={p.id}
              onClick={()=>setForm(prev=>({...prev,prio:p.id}))}
              style={{
                padding:"8px 12px",borderRadius:50,
                border:form.prio===p.id?`2px solid ${p.c}`:"2px solid #F1F5F9",
                background:form.prio===p.id?p.c+"18":"#FAFAFA",
                fontSize:12,fontWeight:800,
                cursor:"pointer",color:form.prio===p.id?p.c:"#94A3B8",
              }}
            >
              {p.e} {p.l}
            </button>
          ))}
        </div>

        <div style={{display:"flex",gap:10}}>
          <button
            onClick={saveTask}
            style={{
              flex:1,padding:"17px 0",
              borderRadius:18,border:"none",
              background:form.title.trim()
                ? "linear-gradient(135deg,#6366F1,#8B5CF6)"
                : "#E2E8F0",
              color:form.title.trim()?"#fff":"#94A3B8",
              fontSize:16,fontWeight:800,
              cursor:form.title.trim()?"pointer":"default",
            }}
          >
            {form.id ? "Сохранить" : "Добавить"}
          </button>

          {form.id && (
            <button
              onClick={()=>deleteTask(form.id)}
              style={{
                padding:"17px 16px",borderRadius:18,
                border:"none",background:"#FEF2F2",
                color:"#EF4444",fontSize:16,
                fontWeight:800,cursor:"pointer",
              }}
            >
              Удалить
            </button>
          )}
        </div>
      </Sheet>
    </div>
  );
}

// ── Main App ──

export default function App() {
  const [tab,setTab] = useState("goals");
  const [goals,setGoals] = useState([]);
  const [habits,setHabits] = useState([]);
  const [wishes,setWishes] = useState([]);
  const [calTasks,setCalTasks] = useState([]);
  const [selectedGoal,setSelectedGoal] = useState(null);
  const [goalSheet,setGoalSheet] = useState(false);
  const [editGoal,setEditGoal] = useState(null);
  const [confetti,setConfetti] = useState(false);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = CSS_GLOBAL;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await loadData();
    setGoals(data.goals);
    setHabits(data.habits);
    setWishes(data.wishes);
    setCalTasks(data.calendar);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onGoalUpdate = (g) => {
    setGoals(prev => prev.map(x=>x.id===g.id ? g : x));
    setSelectedGoal(g);
  };

  const onGoalDelete = (id) => {
    setGoals(prev => prev.filter(x=>x.id!==id));
    setSelectedGoal(null);
  };

  const onGoalToggle = async (id) => {
    try {
      const g = goals.find(x=>x.id===id);
      if (!g) return;
      await apiFetch(`/api/goals/${id}`,{
        method:"PUT",
        body:JSON.stringify({...g,done:!g.done}),
      });
      setGoals(prev =>
        prev.map(x=>x.id===id ? {...x,done:!x.done} : x)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const onGoalSave = async (goal) => {
    if (goals.some(g=>g.id===goal.id)) {
      try {
        await apiFetch(`/api/goals/${goal.id}`,{
          method:"PUT",
          body:JSON.stringify(goal),
        });
      } catch (e) {
        console.error(e);
      }
      setGoals(prev =>
        prev.map(g => g.id===goal.id ? goal : g)
      );
    } else {
      try {
        await apiFetch("/api/goals",{
          method:"POST",
          body:JSON.stringify(goal),
        });
      } catch (e) {
        console.error(e);
      }
      setGoals(prev => [goal,...prev]);
    }
  };

  const tabs = [
    {id:"goals",    emoji:"🎯", label:"Цели"},
    {id:"habits",   emoji:"🔥", label:"Привычки"},
    {id:"calendar", emoji:"📅", label:"Календарь"},
    {id:"wishes",   emoji:"💭", label:"Желания"},
    {id:"ideas",    emoji:"💡", label:"Идеи"},
  ];

  return (
    <div
      className="app-wrap"
      style={{
        maxWidth:430,margin:"0 auto",
        padding:"16px 16px 0",
      }}
    >
      <Confetti active={confetti} />
      {loading ? (
        <div style={{padding:"60px 20px",textAlign:"center",color:"#94A3B8"}}>
          Загрузка…
        </div>
      ) : selectedGoal ? (
        <GoalDetail
          goal={selectedGoal}
          onBack={()=>setSelectedGoal(null)}
          onUpdate={onGoalUpdate}
          onDelete={async (id)=>{
            try {
              await apiFetch(`/api/goals/${id}`,{method:"DELETE"});
            } catch (e) {
              console.error(e);
            }
            onGoalDelete(id);
          }}
          onConfetti={()=>{
            setConfetti(true);
            setTimeout(()=>setConfetti(false),1200);
          }}
          onEdit={g=>{
            setEditGoal(g);
            setGoalSheet(true);
          }}
        />
      ) : (
        <>
          {tab==="goals" && (
            <div>
              <div
                style={{
                  display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:14,
                }}
              >
                <h1
                  style={{
                    margin:0,fontSize:24,fontWeight:900,
                    letterSpacing:"-0.03em",color:"#0F172A",
                  }}
                >
                  Твои цели
                </h1>
                <button
                  onClick={()=>{
                    setEditGoal(null);
                    setGoalSheet(true);
                  }}
                  style={{
                    width:44,height:44,borderRadius:16,
                    border:"none",
                    background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
                    color:"#fff",fontSize:26,cursor:"pointer",
                    display:"flex",alignItems:"center",
                    justifyContent:"center",
                    boxShadow:"0 4px 18px rgba(99,102,241,.45)",
                  }}
                >
                  +
                </button>
              </div>
              {goals.length===0 ? (
                <div style={{textAlign:"center",padding:"40px 20px"}}>
                  <div style={{fontSize:52}}>🚀</div>
                  <div
                    style={{
                      fontSize:17,fontWeight:800,
                      color:"#94A3B8",marginTop:8,
                    }}
                  >
                    Добавь первую цель
                  </div>
                  <div
                    style={{
                      fontSize:13,color:"#CBD5E1",
                      marginTop:4,
                    }}
                  >
                    Станет проще держать курс
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {goals.map(g=>(
                    <GoalCard
                      key={g.id}
                      g={g}
                      onTap={()=>setSelectedGoal(g)}
                      onToggle={onGoalToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab==="habits" && (
            <HabitsPage
              habits={habits}
              onUpdate={setHabits}
            />
          )}

          {tab==="calendar" && (
            <CalView
              goals={goals}
              calTasks={calTasks}
              setCalTasks={setCalTasks}
            />
          )}

          {tab==="wishes" && <WishesPage />}

          {tab==="ideas" && <IdeasPage />}
        </>
      )}

      <Sheet
        open={goalSheet}
        onClose={() => { setGoalSheet(false); setEditGoal(null); }}
        title={editGoal ? "Редактировать цель" : "Новая цель"}
      >
        <GoalForm
          goal={editGoal}
          onSave={onGoalSave}
          onClose={() => { setGoalSheet(false); setEditGoal(null); }}
        />
      </Sheet>

      {/* нижняя навигация снизу */}
      <div className="bottom-nav">
        <div style={{display:"flex",justifyContent:"space-around",gap:6}}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={()=>setTab(t.id)}
                style={{
                  display:"flex",flexDirection:"column",
                  alignItems:"center",gap:2,
                  background:active?"#EEF2FF":"none",
                  border:"none",cursor:"pointer",
                  padding:"6px 10px",borderRadius:16,
                  minWidth:0,transition:"background .2s",
                  flex:1,
                }}
              >
                <span
                  style={{
                    fontSize:20,
                    filter:active?"none":"grayscale(60%)",
                    opacity:active?1:.5,
                    transform:active?"scale(1.1)":"scale(1)",
                    transition:"all .2s",display:"block",
                  }}
                >
                  {t.emoji}
                </span>
                <span
                  style={{
                    fontSize:10,fontWeight:active?800:600,
                    color:active?"#6366F1":"#94A3B8",
                    transition:"color .2s",
                    whiteSpace:"nowrap",
                  }}
                >
                  {t.label}
                </span>
                {active && (
                  <div
                    style={{
                      width:20,height:3,borderRadius:2,
                      background:"#6366F1",marginTop:1,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
