import { useState, useEffect, useMemo, useRef } from "react";
import api from "./api";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const CATS = [
  { id: "work", label: "Работа", emoji: "💼", accent: "#6366F1" },
  { id: "health", label: "Здоровье", emoji: "💪", accent: "#10B981" },
  { id: "learn", label: "Учёба", emoji: "📖", accent: "#F97316" },
  { id: "personal", label: "Личное", emoji: "🌟", accent: "#EC4899" },
  { id: "finance", label: "Деньги", emoji: "💰", accent: "#EAB308" },
  { id: "creative", label: "Творчество", emoji: "🎨", accent: "#14B8A6" },
];

const PRIO = {
  high: { l: "Важно", c: "#EF4444", bg: "#FEF2F2", n: 0 },
  medium: { l: "Средне", c: "#F59E0B", bg: "#FFFBEB", n: 1 },
  low: { l: "Не срочно", c: "#22C55E", bg: "#F0FDF4", n: 2 },
};

const TPRIO = [
  { id: "high", e: "🔴", l: "Важно", c: "#EF4444" },
  { id: "medium", e: "🟡", l: "Средне", c: "#F59E0B" },
  { id: "low", e: "🟢", l: "Обычно", c: "#22C55E" },
];

const HABIT_COLORS = [
  "#6366F1",
  "#10B981",
  "#F97316",
  "#EC4899",
  "#EAB308",
  "#14B8A6",
  "#EF4444",
  "#8B5CF6",
];

const EMOJI_LIST = [
  "💼",
  "💪",
  "📖",
  "🌟",
  "💰",
  "🎨",
  "🏃",
  "💧",
  "🧘",
  "😴",
  "🥗",
  "🎯",
  "✍️",
  "🎸",
  "🏠",
  "✈️",
  "🚗",
  "💻",
  "📱",
  "🎓",
  "🏖️",
  "🎮",
  "📚",
  "🌍",
  "☕",
  "🎬",
];

const MO_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const IDEA_TAGS = ["Все", "Бизнес", "Технологии", "Творчество", "Обучение", "Личное", "Другое"];
const IDEA_COLORS = [
  "#6366F1",
  "#10B981",
  "#F97316",
  "#EC4899",
  "#EAB308",
  "#14B8A6",
  "#EF4444",
  "#8B5CF6",
];

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
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.ceil((t - n) / 864e5);
}
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function todayKey() {
  return dateKey(new Date());
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function getWeekDays() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - day);
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return dateKey(d);
  });
}
function monthDays(y, m) {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const days = [];
  const pad = (first.getDay() + 6) % 7;
  for (let i = pad - 1; i >= 0; i--) days.push({ d: new Date(y, m, -i), cur: false });
  for (let i = 1; i <= last.getDate(); i++) days.push({ d: new Date(y, m, i), cur: true });
  while (days.length < 42) {
    const n = days.length - pad - last.getDate() + 1;
    days.push({ d: new Date(y, m + 1, n), cur: false });
  }
  return days;
}
function countTasks(tasks) {
  let total = 0,
    done = 0;
  (tasks || []).forEach((t) => {
    total++;
    if (t.done) done++;
    const s = countTasks(t.children || []);
    total += s.total;
    done += s.done;
  });
  return { total, done };
}

/* API (оставляю как у тебя) */
const BASE = import.meta.env?.VITE_API_URL || "";
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
async function loadData() {
  try {
    const [goals, habits, wishes, ideas, calendar] = await Promise.all([
      apiFetch("/api/goals"),
      apiFetch("/api/habits"),
      apiFetch("/api/wishes"),
      apiFetch("/api/ideas"),
      apiFetch("/api/calendar"),
    ]);
    return { goals, habits, wishes, ideas, calendar };
  } catch (e) {
    console.error("Load failed:", e);
    return { goals: [], habits: [], wishes: [], ideas: [], calendar: [] };
  }
}

/* Styles */
const S = {
  field: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 16,
    border: "1.5px solid #E8EDF5",
    fontSize: 16,
    outline: "none",
    background: "#fff",
    color: "#0F172A",
    boxSizing: "border-box",
    transition: "border-color .2s",
  },
  lbl: {
    display: "block",
    fontSize: 11,
    fontWeight: 800,
    color: "#94A3B8",
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
};

const CSS_GLOBAL = `
  @keyframes sheetUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes pageIn    { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pop       { 0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)} }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  ::-webkit-scrollbar { display:none; }
  html,body { margin:0;padding:0;overscroll-behavior:none;background:#F8FAFC; }
  input,textarea,select,button { font-family:'Nunito',-apple-system,sans-serif;font-size:16px; }
  input:focus,textarea:focus { border-color:#6366F1 !important; }
  .bottom-nav{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    padding:10px 14px 14px;
    background:#ffffffee;
    backdrop-filter:blur(20px);
    border-top:1px solid #E2E8F0;
    display:flex;
    gap:10px;
    z-index:50;
  }
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .bottom-nav{
      padding-bottom:calc(10px + env(safe-area-inset-bottom));
    }
  }
  .app-wrap{
    min-height:100vh;
    padding-bottom:90px;
  }
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .app-wrap{
      padding-bottom:calc(90px + env(safe-area-inset-bottom));
    }
  }
`;

function Confetti({ active }) {
  const ref = useRef(null);
  const raf = useRef(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const cols = ["#6366F1", "#EC4899", "#F97316", "#10B981", "#EAB308", "#8B5CF6", "#EF4444"];
    const particles = Array.from({ length: 70 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 60,
      y: H * 0.4,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 18 - 4,
      sz: Math.random() * 7 + 3,
      col: cols[Math.floor(Math.random() * cols.length)],
      rot: Math.random() * 360,
      rs: (Math.random() - 0.5) * 10,
      g: 0.4 + Math.random() * 0.15,
      life: 1,
      dec: 0.009 + Math.random() * 0.006,
    }));
    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      particles.forEach((p) => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.vx *= 0.98;
        p.rot += p.rs;
        p.life -= p.dec;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.sz / 2, -p.sz / 4, p.sz, p.sz / 2);
        ctx.restore();
      });
      if (alive) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [active]);
  if (!active) return null;
  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          maxHeight: "92vh",
          overflow: "auto",
          padding: "0 20px calc(env(safe-area-inset-bottom, 16px) + 20px)",
          animation: "sheetUp .32s cubic-bezier(.32,1.12,.36,1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E2E8F0" }} />
        </div>
        {title && (
          <h2 style={{ margin: "6px 0 20px", fontSize: 20, fontWeight: 900 }}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}

function EmojiPick({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          height: 48,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 14,
          border: "1.5px solid #E8EDF5",
          background: value ? "#EEF2FF" : "#F8FAFC",
          fontSize: 22,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{value || "😀"}</span>
        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div
          style={{
            marginTop: 8,
            background: "#fff",
            borderRadius: 18,
            padding: 12,
            border: "1.5px solid #F1F5F9",
            boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 4,
            zIndex: 10,
            position: "relative",
          }}
        >
          {EMOJI_LIST.map((e) => (
            <button
              key={e}
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 10,
                border: "none",
                background: value === e ? "#EEF2FF" : "#F8FAFC",
                fontSize: 20,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {e}
            </button>
          ))}
          <button
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: 10,
              border: "none",
              background: "#FEF2F2",
              fontSize: 14,
              cursor: "pointer",
              fontWeight: 700,
              color: "#EF4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function GoalForm({ goal, onSave, onClose }) {
  const [f, sf] = useState(
    goal || {
      id: uid(),
      title: "",
      desc: "",
      cat: "work",
      prio: "medium",
      deadline: "",
      reward: "",
      tasks: [],
      done: false,
      created: new Date().toISOString(),
    }
  );
  const u = (k, v) => sf((p) => ({ ...p, [k]: v }));

  return (
    <>
      <input
        value={f.title}
        onChange={(e) => u("title", e.target.value)}
        placeholder="Название цели"
        style={{
          width: "100%",
          fontSize: 22,
          fontWeight: 900,
          border: "none",
          padding: "4px 0",
          background: "transparent",
          outline: "none",
          color: "#0F172A",
          marginBottom: 4,
        }}
      />
      <textarea
        value={f.desc}
        onChange={(e) => u("desc", e.target.value)}
        placeholder="Описание (необязательно)"
        style={{
          width: "100%",
          minHeight: 40,
          resize: "none",
          border: "none",
          padding: "4px 0",
          background: "transparent",
          fontSize: 15,
          color: "#64748B",
          outline: "none",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      />

      <label style={S.lbl}>Категория</label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => u("cat", c.id)}
            style={{
              padding: "11px 8px",
              borderRadius: 16,
              border: f.cat === c.id ? `2px solid ${c.accent}` : "2px solid #F1F5F9",
              background: f.cat === c.id ? c.accent + "16" : "#FAFAFA",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              color: f.cat === c.id ? c.accent : "#94A3B8",
              textAlign: "center",
              transition: "all .15s",
            }}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <label style={S.lbl}>Приоритет</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {Object.entries(PRIO).map(([k, v]) => (
          <button
            key={k}
            onClick={() => u("prio", k)}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 14,
              border: f.prio === k ? `2px solid ${v.c}` : "2px solid #F1F5F9",
              background: f.prio === k ? v.bg : "#FAFAFA",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              color: f.prio === k ? v.c : "#B0B8C4",
              transition: "all .15s",
            }}
          >
            {v.l}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 14,
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <label style={S.lbl}>Дедлайн 📅</label>
          <input
            type="date"
            value={f.deadline}
            onChange={(e) => u("deadline", e.target.value)}
            style={{ ...S.field, height: 52, padding: "0 12px", display: "block", width: "100%" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.lbl}>Награда 🎁</label>
          <input
            value={f.reward}
            onChange={(e) => u("reward", e.target.value)}
            placeholder="За победу!"
            style={{ ...S.field, height: 52, padding: "0 12px", display: "block", width: "100%" }}
          />
        </div>
      </div>

      <button
        onClick={() => {
          if (f.title.trim()) {
            onSave(f);
            onClose();
          }
        }}
        style={{
          width: "100%",
          padding: "17px 0",
          borderRadius: 18,
          border: "none",
          background: f.title.trim()
            ? "linear-gradient(135deg,#6366F1,#8B5CF6)"
            : "#E2E8F0",
          color: f.title.trim() ? "#fff" : "#94A3B8",
          fontSize: 16,
          fontWeight: 800,
          cursor: f.title.trim() ? "pointer" : "default",
          boxShadow: f.title.trim() ? "0 6px 20px rgba(99,102,241,.35)" : "none",
          transition: "all .2s",
        }}
      >
        {goal ? "Сохранить ✨" : "Создать 🚀"}
      </button>
    </>
  );
}

function GoalCard({ g, onTap, onToggle }) {
  const cat = CATS.find((c) => c.id === g.cat) || CATS[0];
  const pri = PRIO[g.prio] || PRIO.medium;
  const { total, done } = countTasks(g.tasks || []);
  const pct = total > 0 ? (done / total) * 100 : g.done ? 100 : 0;
  const dl = daysLeft(g.deadline);
  const overdue = dl !== null && dl < 0 && !g.done;

  return (
    <div
      onClick={onTap}
      style={{
        background: "#fff",
        borderRadius: 22,
        overflow: "hidden",
        marginBottom: 10,
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        opacity: g.done ? 0.6 : 1,
        cursor: "pointer",
        animation: "fadeIn .3s ease",
      }}
    >
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg,${cat.accent},${cat.accent}77)`,
        }}
      />
      <div style={{ padding: "14px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              background: cat.accent + "15",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {g.done ? "🎉" : cat.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 4,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: pri.bg,
                  color: pri.c,
                }}
              >
                {pri.l}
              </span>
              {g.reward && <span style={{ fontSize: 12 }}>🎁</span>}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: g.done ? "#94A3B8" : "#0F172A",
                textDecoration: g.done ? "line-through" : "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {g.title}
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 5,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {g.deadline && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: overdue ? "#FEE2E2" : "#F1F5F9",
                    color: overdue ? "#DC2626" : "#64748B",
                  }}
                >
                  📅 {fmtDate(g.deadline)}
                  {dl !== null && !g.done && (
                    <span style={{ opacity: 0.7 }}>
                      {" · "}
                      {overdue
                        ? `${Math.abs(dl)}д назад`
                        : dl === 0
                        ? "сегодня!"
                        : dl === 1
                        ? "завтра"
                        : `${dl}д`}
                    </span>
                  )}
                </span>
              )}
              {total > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: done === total ? "#10B981" : "#94A3B8",
                  }}
                >
                  ✅ {done}/{total}
                </span>
              )}
            </div>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggle(g.id);
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              flexShrink: 0,
              border: g.done ? "none" : "2.5px solid #E2E8F0",
              background: g.done
                ? `linear-gradient(135deg,${cat.accent},${cat.accent}BB)`
                : "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
              transition: "all .2s",
            }}
          >
            {g.done && "✓"}
          </div>
        </div>
        {total > 0 && (
          <div
            style={{
              marginTop: 10,
              height: 4,
              borderRadius: 2,
              background: "#F1F5F9",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 2,
                width: `${pct}%`,
                background: `linear-gradient(90deg,${cat.accent},${cat.accent}99)`,
                transition: "width .5s",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function GoalDetail({ goal, onBack, onUpdate, onDelete, onConfetti, onEdit }) {
  const cat = CATS.find((c) => c.id === goal.cat) || CATS[0];
  const pri = PRIO[goal.prio] || PRIO.medium;
  const { total, done } = countTasks(goal.tasks || []);
  const pct = total > 0 ? Math.round((done / total) * 100) : goal.done ? 100 : 0;
  const dl = daysLeft(goal.deadline);

  const [newTask, setNewTask] = useState("");
  const [newTP, setNewTP] = useState("medium");
  const [exp, setExp] = useState({});
  const [sortBy, setSortBy] = useState("priority");

  useEffect(() => {
    if (total > 0 && done === total && !goal.done) {
      const t = setTimeout(() => {
        onUpdate({ ...goal, done: true });
        onConfetti();
      }, 400);
      return () => clearTimeout(t);
    }
    if (total > 0 && done < total && goal.done) {
      onUpdate({ ...goal, done: false });
    }
  }, [total, done]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    const tid = uid();
    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          id: tid,
          goal_id: goal.id,
          title: newTask.trim(),
          prio: newTP,
        }),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks: [
        ...(goal.tasks || []),
        { id: tid, title: newTask.trim(), done: false, prio: newTP, children: [] },
      ],
    });
    setNewTask("");
  };

  const toggleTask = async (tid) => {
    const upd = (list) =>
      list.map((t) =>
        t.id === tid
          ? {
              ...t,
              done: !t.done,
              children: (t.children || []).map((c) => ({ ...c, done: !t.done })),
            }
          : { ...t, children: upd(t.children || []) }
      );
    const updated = upd(goal.tasks || []);
    const task = (goal.tasks || []).find((t) => t.id === tid);
    if (task) {
      try {
        await apiFetch(`/api/tasks/${tid}`, {
          method: "PUT",
          body: JSON.stringify({ done: !task.done }),
        });
        for (const c of task.children || []) {
          await apiFetch(`/api/microtasks/${c.id}`, {
            method: "PUT",
            body: JSON.stringify({ done: !task.done }),
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    onUpdate({ ...goal, tasks: updated });
  };

  const toggleMicro = async (tid, mid) => {
    const upd = (list) =>
      list.map((t) => {
        if (t.id === tid) {
          const nc = (t.children || []).map((c) =>
            c.id === mid ? { ...c, done: !c.done } : c
          );
          const allDone = nc.length > 0 && nc.every((c) => c.done);
          return { ...t, children: nc, done: allDone };
        }
        return t;
      });
    const updated = upd(goal.tasks || []);
    const task = (goal.tasks || []).find((t) => t.id === tid);
    const micro = task?.children.find((c) => c.id === mid);
    if (micro) {
      try {
        await apiFetch(`/api/microtasks/${mid}`, {
          method: "PUT",
          body: JSON.stringify({ done: !micro.done }),
        });
        const nc = (task.children || []).map((c) =>
          c.id === mid ? { ...c, done: !c.done } : c
        );
        const allDone = nc.length > 0 && nc.every((c) => c.done);
        if (allDone !== task.done) {
          await apiFetch(`/api/tasks/${tid}`, {
            method: "PUT",
            body: JSON.stringify({ done: allDone }),
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    onUpdate({ ...goal, tasks: updated });
  };

  const deleteTask = async (tid) => {
    try {
      await apiFetch(`/api/tasks/${tid}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks: (goal.tasks || []).filter((t) => t.id !== tid),
    });
  };

  const addMicro = async (pid, title) => {
    if (!title.trim()) return;
    const mid = uid();
    try {
      await apiFetch("/api/microtasks", {
        method: "POST",
        body: JSON.stringify({
          id: mid,
          task_id: pid,
          title: title.trim(),
        }),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks: (goal.tasks || []).map((t) =>
        t.id === pid
          ? {
              ...t,
              children: [...(t.children || []), { id: mid, title: title.trim(), done: false }],
              done: false,
            }
          : t
      ),
    });
  };

  const setTPrio = async (tid, p) => {
    try {
      await apiFetch(`/api/tasks/${tid}`, {
        method: "PUT",
        body: JSON.stringify({ prio: p }),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks: (goal.tasks || []).map((t) => (t.id === tid ? { ...t, prio: p } : t)),
    });
  };

  const renameTask = async (tid, newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await apiFetch(`/api/tasks/${tid}`, {
        method: "PUT",
        body: JSON.stringify({ title: newTitle.trim() }),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks: (goal.tasks || []).map((t) =>
        t.id === tid ? { ...t, title: newTitle.trim() } : t
      ),
    });
  };

  const renameMicro = async (tid, mid, newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await apiFetch(`/api/microtasks/${mid}`, {
        method: "PUT",
        body: JSON.stringify({ title: newTitle.trim() }),
      });
    } catch (e) {
      console.error(e);
    }
    onUpdate({
      ...goal,
      tasks: (goal.tasks || []).map((t) =>
        t.id === tid
          ? {
              ...t,
              children: (t.children || []).map((c) =>
                c.id === mid ? { ...c, title: newTitle.trim() } : c
              ),
            }
          : t
      ),
    });
  };

  const grouped = useMemo(() => {
    const res = { high: [], medium: [], low: [] };
    (goal.tasks || []).forEach((t) => {
      const key = ["high", "medium", "low"].includes(t.prio) ? t.prio : "medium";
      res[key].push(t);
    });
    const order = { high: 0, medium: 1, low: 2 };
    Object.keys(res).forEach((k) => {
      res[k].sort((a, b) => {
        if (sortBy === "priority") {
          const pa = order[a.prio || "medium"];
          const pb = order[b.prio || "medium"];
          if (pa !== pb) return pa - pb;
          return a.done === b.done ? 0 : a.done ? 1 : -1;
        }
        return a.done === b.done ? 0 : a.done ? 1 : -1;
      });
    });
    return res;
  }, [goal.tasks, sortBy]);

  const hasTasks = (goal.tasks || []).length > 0;

  return (
    <div
      style={{
        animation: "pageIn .3s ease",
        minHeight: "100vh",
        background: "#F8FAFC",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg,${cat.accent},${cat.accent}CC)`,
          padding: "calc(env(safe-area-inset-top,16px) + 8px) 20px 28px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: 70,
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -20,
            left: -20,
            width: 100,
            height: 100,
            borderRadius: 50,
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
            position: "relative",
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: 14,
              fontWeight: 700,
              backdropFilter: "blur(8px)",
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => onEdit(goal)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: 14,
              fontWeight: 700,
              backdropFilter: "blur(8px)",
            }}
          >
            ✏️ Изменить
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: 14,
              fontWeight: 700,
              backdropFilter: "blur(8px)",
            }}
          >
            🗑️
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 30 }}>{cat.emoji}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                background: "rgba(255,255,255,0.22)",
                padding: "4px 12px",
                borderRadius: 10,
                backdropFilter: "blur(4px)",
              }}
            >
              {cat.label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                background: "rgba(255,255,255,0.22)",
                padding: "4px 12px",
                borderRadius: 10,
                backdropFilter: "blur(4px)",
              }}
            >
              {pri.l}
            </span>
          </div>
          <h1
            style={{
              margin: "0 0 6px",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          >
            {goal.title}
          </h1>
          {goal.desc && (
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 14,
                opacity: 0.8,
                lineHeight: 1.5,
              }}
            >
              {goal.desc}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, position: "relative" }}>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.18)",
              borderRadius: 18,
              padding: "14px 16px",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>Прогресс</span>
              <span style={{ fontSize: 20, fontWeight: 900 }}>{pct}%</span>
            </div>
            <div
              style={{
                height: 7,
                borderRadius: 4,
                background: "rgba(255,255,255,0.25)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 4,
                  width: `${pct}%`,
                  background: "#fff",
                  transition: "width .5s",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                marginTop: 6,
                opacity: 0.75,
                fontWeight: 700,
              }}
            >
              {done} из {total} задач
            </div>
          </div>
          {(goal.deadline || goal.reward) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {goal.deadline && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    borderRadius: 14,
                    padding: "10px 14px",
                    textAlign: "center",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800 }}>📅 {fmtDate(goal.deadline)}</div>
                  {dl !== null && (
                    <div
                      style={{
                        fontSize: 10,
                        opacity: 0.75,
                        marginTop: 2,
                      }}
                    >
                      {dl < 0
                        ? "просрочено!"
                        : dl === 0
                        ? "сегодня!"
                        : dl === 1
                        ? "завтра"
                        : `${dl} дн.`}
                    </div>
                  )}
                </div>
              )}
              {goal.reward && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    borderRadius: 14,
                    padding: "10px 14px",
                    textAlign: "center",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800 }}>🎁 {goal.reward}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 16px 100px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 900 }}>Задачи</span>
          <button
            onClick={() =>
              setSortBy((s) => (s === "priority" ? "default" : "priority"))
            }
            style={{
              background: sortBy === "priority" ? `${cat.accent}18` : "#F8FAFC",
              border: "none",
              padding: "7px 14px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              color: sortBy === "priority" ? cat.accent : "#94A3B8",
            }}
          >
            {sortBy === "priority" ? "🔽 По приоритету" : "📋 По порядку"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="＋ Новая задача..."
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 18,
              border: "2px solid #F1F5F9",
              fontSize: 15,
              outline: "none",
              background: "#fff",
              color: "#0F172A",
              boxSizing: "border-box",
              transition: "border-color .2s",
            }}
          />
          <button
            onClick={addTask}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              border: "none",
              background: `linear-gradient(135deg,${cat.accent},${cat.accent}CC)`,
              color: "#fff",
              fontSize: 22,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 14px ${cat.accent}44`,
            }}
          >
            +
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {TPRIO.map((p) => (
            <button
              key={p.id}
              onClick={() => setNewTP(p.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 50,
                border: newTP === p.id ? `2px solid ${p.c}` : "2px solid #F1F5F9",
                background: newTP === p.id ? p.c + "18" : "#FAFAFA",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                color: newTP === p.id ? p.c : "#B0B8C4",
              }}
            >
              {p.e} {p.l}
            </button>
          ))}
        </div>

        {!hasTasks ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 52 }}>📝</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#94A3B8",
                marginTop: 8,
              }}
            >
              Добавь задачу
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#CBD5E1",
                marginTop: 4,
              }}
            >
              Разбей цель на шаги
            </div>
          </div>
        ) : (
          ["high", "medium", "low"].map((pk) => {
            const list = grouped[pk];
            if (!list || list.length === 0) return null;
            const tp = TPRIO.find((p) => p.id === pk) || TPRIO[1];
            return (
              <div key={pk} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{tp.e}</span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: tp.c,
                    }}
                  >
                    {tp.l}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {list.map((task) => {
                    const tpObj =
                      TPRIO.find((p) => p.id === (task.prio || "medium")) || TPRIO[1];
                    const isExp = !!exp[task.id];
                    const cd = (task.children || []).filter((c) => c.done).length;
                    const ct = (task.children || []).length;
                    return (
                      <TaskItem
                        key={task.id}
                        task={task}
                        tp={tpObj}
                        accent={cat.accent}
                        isExp={isExp}
                        onToggleExp={() =>
                          setExp((p) => ({ ...p, [task.id]: !p[task.id] }))
                        }
                        onToggle={() => toggleTask(task.id)}
                        onToggleMicro={(mid) => toggleMicro(task.id, mid)}
                        onDelete={() => deleteTask(task.id)}
                        onAddMicro={(t) => addMicro(task.id, t)}
                        onSetPrio={(p) => setTPrio(task.id, p)}
                        onRenameTask={(title) => renameTask(task.id, title)}
                        onRenameMicro={(mid, title) => renameMicro(task.id, mid, title)}
                        cd={cd}
                        ct={ct}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  tp,
  accent,
  isExp,
  onToggleExp,
  onToggle,
  onToggleMicro,
  onDelete,
  onAddMicro,
  onSetPrio,
  onRenameTask,
  onRenameMicro,
  cd,
  ct,
}) {
  const [micro, setMicro] = useState("");
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(task.title);
  const [editMicro, setEditMicro] = useState(null);
  const [editMicroVal, setEditMicroVal] = useState("");
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
        background: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        opacity: task.done ? 0.55 : 1,
      }}
    >
      <div style={{ height: 3, background: tp.c }} />
      <div style={{ padding: "13px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            onClick={onToggle}
            style={{
              width: 26,
              height: 26,
              borderRadius: 9,
              flexShrink: 0,
              border: task.done ? "none" : `2px solid ${tp.c}55`,
              background: task.done ? accent : "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 900,
              transition: "all .2s",
            }}
          >
            {task.done && "✓"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                style={{
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 700,
                  border: "none",
                  borderBottom: `2px solid ${accent}`,
                  outline: "none",
                  padding: "2px 0",
                  background: "transparent",
                }}
              />
            ) : (
              <div
                onClick={() => {
                  setEditing(true);
                  setEditVal(task.title);
                }}
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: task.done ? "line-through" : "none",
                  color: task.done ? "#B0B8C4" : "#1E293B",
                  cursor: "text",
                }}
              >
                {task.title}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {TPRIO.map((p) => (
              <div
                key={p.id}
                onClick={() => onSetPrio(p.id)}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  cursor: "pointer",
                  background: task.prio === p.id ? p.c : "#F1F5F9",
                  border: task.prio === p.id ? "none" : "1px solid #E2E8F0",
                  transition: "background .15s",
                }}
              />
            ))}
          </div>
          <button
            onClick={onDelete}
            style={{
              background: "none",
              border: "none",
              color: "#D1D5DB",
              fontSize: 14,
              cursor: "pointer",
              padding: 2,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        {has && (
          <div
            onClick={onToggleExp}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 7,
              marginLeft: 36,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", gap: 3 }}>
              {(task.children || []).map((c) => (
                <div
                  key={c.id}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    background: c.done ? "#10B981" : "#E2E8F0",
                    transition: "background .2s",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: cd === ct && ct > 0 ? "#10B981" : "#94A3B8",
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
              marginLeft: 36,
              marginTop: 5,
              fontSize: 11,
              color: "#CBD5E1",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {isExp ? "Скрыть" : "+ подзадачи"}
          </div>
        )}
      </div>
      {isExp && (
        <div
          style={{
            padding: "0 14px 12px",
            borderTop: "1px solid #F8FAFC",
          }}
        >
          {(task.children || []).map((ch) => (
            <div
              key={ch.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0 8px 36px",
                borderBottom: "1px solid #FAFAFA",
              }}
            >
              <div
                onClick={() => onToggleMicro(ch.id)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  flexShrink: 0,
                  border: ch.done ? "none" : "2px solid #E2E8F0",
                  background: ch.done ? "#10B981" : "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 900,
                  transition: "all .2s",
                }}
              >
                {ch.done && "✓"}
              </div>
              {editMicro === ch.id ? (
                <input
                  autoFocus
                  value={editMicroVal}
                  onChange={(e) => setEditMicroVal(e.target.value)}
                  onBlur={() => saveMicro(ch.id)}
                  onKeyDown={(e) => e.key === "Enter" && saveMicro(ch.id)}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    border: "none",
                    borderBottom: `2px solid ${accent}`,
                    outline: "none",
                    padding: "2px 0",
                    background: "transparent",
                  }}
                />
              ) : (
                <span
                  onClick={() => {
                    setEditMicro(ch.id);
                    setEditMicroVal(ch.title);
                  }}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: ch.done ? "#B0B8C4" : "#475569",
                    textDecoration: ch.done ? "line-through" : "none",
                    cursor: "text",
                  }}
                >
                  {ch.title}
                </span>
              )}
            </div>
          ))}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              marginLeft: 36,
            }}
          >
            <input
              value={micro}
              onChange={(e) => setMicro(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddMicro(micro);
                  setMicro("");
                }
              }}
              placeholder="＋ Подзадача..."
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 12,
                border: "1.5px solid #F1F5F9",
                fontSize: 14,
                outline: "none",
                background: "#F8FAFC",
                color: "#0F172A",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => {
                onAddMicro(micro);
                setMicro("");
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "none",
                background: "#F1F5F9",
                color: accent,
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
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
function IdeasPage({ onMakeGoal }) {
  const [ideas, setIdeas] = useState([]);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [editIdea, setEditIdea] = useState(null);
  const [activeTag, setActiveTag] = useState("Все");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    apiFetch("/api/ideas")
      .then((data) => {
        setIdeas(data || []);
        setReady(true);
      })
      .catch((e) => {
        console.error(e);
        setReady(true);
      });
  }, []);

  const saveIdea = async (idea) => {
    try {
      const ex = ideas.find((i) => i.id === idea.id);
      if (ex) {
        await apiFetch(`/api/ideas/${idea.id}`, {
          method: "PUT",
          body: JSON.stringify(idea),
        });
        setIdeas(ideas.map((i) => (i.id === idea.id ? idea : i)));
      } else {
        await apiFetch("/api/ideas", {
          method: "POST",
          body: JSON.stringify(idea),
        });
        setIdeas([...ideas, idea]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteIdea = async (id) => {
    setIdeas(ideas.filter((i) => i.id !== id));
    try {
      await apiFetch(`/api/ideas/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleIdea = async (id) => {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) return;
    const upd = { ...idea, done: !idea.done };
    setIdeas(ideas.map((i) => (i.id === id ? upd : i)));
    try {
      await apiFetch(`/api/ideas/${id}`, {
        method: "PUT",
        body: JSON.stringify(upd),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = useMemo(() => {
    return ideas.filter((i) => {
      if (!showDone && i.done) return false;
      if (activeTag === "Все") return true;
      return i.tag === activeTag;
    });
  }, [ideas, activeTag, showDone]);

  const activeCount = ideas.filter((i) => !i.done).length;

  if (!ready) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px", color: "#94A3B8" }}>
        Загрузка идей...
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          background: "linear-gradient(135deg,#F97316,#EA580C)",
          borderRadius: 22,
          padding: "18px 20px",
          marginBottom: 14,
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>💡 Банк идей</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>
              {activeCount}{" "}
              {activeCount === 1
                ? "идея"
                : activeCount >= 2 && activeCount <= 4
                ? "идеи"
                : "идей"}{" "}
              ждут воплощения
            </div>
          </div>
          <button
            onClick={() => {
              setEditIdea(null);
              setSheet(true);
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              border: "none",
              background: "rgba(255,255,255,0.22)",
              color: "#fff",
              fontSize: 26,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          marginBottom: 14,
          paddingBottom: 2,
        }}
      >
        {IDEA_TAGS.map((tag) => {
          const count =
            tag === "Все"
              ? ideas.filter((i) => !i.done).length
              : ideas.filter((i) => i.tag === tag && !i.done).length;
          return (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{
                padding: "8px 14px",
                borderRadius: 50,
                border: "none",
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                background: activeTag === tag ? "#F97316" : "#fff",
                color: activeTag === tag ? "#fff" : "#94A3B8",
                boxShadow:
                  activeTag === tag
                    ? "0 2px 10px rgba(249,115,22,.3)"
                    : "0 1px 4px rgba(0,0,0,.05)",
                transition: "all .2s",
              }}
            >
              {tag}
              {count > 0 ? ` · ${count}` : ""}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px" }}>
          <div style={{ fontSize: 56 }}>💡</div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "#94A3B8",
              marginTop: 10,
            }}
          >
            Запиши первую идею!
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#CBD5E1",
              marginTop: 4,
            }}
          >
            Хорошие идеи исчезают быстро
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((idea) => (
            <div
              key={idea.id}
              style={{
                background: "#fff",
                borderRadius: 22,
                overflow: "hidden",
                boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
                opacity: idea.done ? 0.6 : 1,
                animation: "fadeIn .25s ease",
              }}
            >
              <div
                style={{
                  height: 4,
                  background: `linear-gradient(90deg,${idea.color},${idea.color}66)`,
                }}
              />
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      flexShrink: 0,
                      background: idea.color + "18",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    {idea.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 9px",
                          borderRadius: 6,
                          background: idea.color + "18",
                          color: idea.color,
                        }}
                      >
                        {idea.tag}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "#CBD5E1",
                          fontWeight: 600,
                        }}
                      >
                        {new Date(idea.created).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: idea.done ? "#94A3B8" : "#0F172A",
                        textDecoration: idea.done ? "line-through" : "none",
                        lineHeight: 1.3,
                        marginBottom: idea.note ? 4 : 0,
                      }}
                    >
                      {idea.title}
                    </div>
                    {idea.note && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "#64748B",
                          lineHeight: 1.4,
                        }}
                      >
                        {idea.note}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleIdea(idea.id)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      border: "none",
                      flexShrink: 0,
                      background: idea.done
                        ? `linear-gradient(135deg,${idea.color},${idea.color}BB)`
                        : "#F1F5F9",
                      color: idea.done ? "#fff" : "#94A3B8",
                      fontSize: 16,
                      fontWeight: 900,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all .2s",
                    }}
                  >
                    {idea.done ? "✓" : "○"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => onMakeGoal && onMakeGoal(idea)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      borderRadius: 12,
                      border: "none",
                      background: "#EEF2FF",
                      color: "#6366F1",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "background .15s",
                    }}
                  >
                    🎯 Сделать целью
                  </button>
                  <button
                    onClick={() => {
                      setEditIdea(idea);
                      setSheet(true);
                    }}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 12,
                      border: "none",
                      background: "#F8FAFC",
                      color: "#64748B",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteIdea(idea.id)}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 12,
                      border: "none",
                      background: "#FEF2F2",
                      color: "#EF4444",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {ideas.filter((i) => i.done).length > 0 && (
        <button
          onClick={() => setShowDone((s) => !s)}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "12px 0",
            borderRadius: 14,
            border: "none",
            background: "#F8FAFC",
            color: "#94A3B8",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showDone
            ? "Скрыть"
            : "Показать выполненные · " +
              ideas.filter((i) => i.done).length}
        </button>
      )}

      <Sheet
        open={sheet}
        onClose={() => {
          setSheet(false);
          setEditIdea(null);
        }}
        title={editIdea ? "Редактировать идею" : "Новая идея 💡"}
      >
        <IdeaForm
          idea={editIdea}
          onSave={saveIdea}
          onClose={() => {
            setSheet(false);
            setEditIdea(null);
          }}
        />
      </Sheet>
    </div>
  );
}

function IdeaForm({ idea, onSave, onClose }) {
  const [f, sf] = useState(
    idea || {
      id: uid(),
      title: "",
      note: "",
      emoji: "💡",
      color: "#F97316",
      tag: "Технологии",
      done: false,
      created: new Date().toISOString(),
    }
  );
  const u = (k, v) => sf((p) => ({ ...p, [k]: v }));

  return (
    <>
      <input
        value={f.title}
        onChange={(e) => u("title", e.target.value)}
        placeholder="Идея..."
        style={{
          width: "100%",
          fontSize: 22,
          fontWeight: 900,
          border: "none",
          padding: "6px 0",
          background: "transparent",
          outline: "none",
          color: "#0F172A",
          marginBottom: 14,
        }}
      />
      <label style={S.lbl}>Описание</label>
      <textarea
        value={f.note}
        onChange={(e) => u("note", e.target.value)}
        placeholder="Как это будет работать, зачем нужно..."
        style={{
          ...S.field,
          minHeight: 70,
          resize: "none",
          lineHeight: 1.5,
          marginBottom: 14,
        }}
      />
      <label style={S.lbl}>Категория</label>
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          marginBottom: 12,
          paddingBottom: 2,
        }}
      >
        {IDEA_TAGS.filter((t) => t !== "Все").map((tag, i) => (
          <button
            key={tag}
            onClick={() => u("tag", tag)}
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: f.tag === tag ? IDEA_COLORS[i] : "#F8FAFC",
              color: f.tag === tag ? "#fff" : "#94A3B8",
            }}
          >
            {tag}
          </button>
        ))}
      </div>
      <label style={S.lbl}>Иконка и цвет</label>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
        <EmojiPick value={f.emoji} onChange={(v) => u("emoji", v)} />
        <div style={{ display: "flex", gap: 8 }}>
          {IDEA_COLORS.map((c) => (
            <div
              key={c}
              onClick={() => u("color", c)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: c,
                cursor: "pointer",
                border: f.color === c ? "3px solid #0F172A" : "3px solid transparent",
                boxShadow:
                  f.color === c ? `0 3px 10px ${c}66` : "0 1px 4px rgba(0,0,0,0.1)",
                transition: "all .2s",
              }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={() => {
          if (f.title.trim()) {
            onSave(f);
            onClose();
          }
        }}
        style={{
          width: "100%",
          padding: "17px 0",
          borderRadius: 18,
          border: "none",
          background: f.title.trim()
            ? "linear-gradient(135deg,#F97316,#EA580C)"
            : "#E2E8F0",
          color: f.title.trim() ? "#fff" : "#94A3B8",
          fontSize: 16,
          fontWeight: 800,
          cursor: f.title.trim() ? "pointer" : "default",
          boxShadow: f.title.trim()
            ? "0 6px 20px rgba(249,115,22,.35)"
            : "none",
          transition: "all .2s",
        }}
      >
        Сохранить 💡
      </button>
    </>
  );
}

function DeadlinesView({ goals }) {
  const upcoming = useMemo(
    () =>
      goals
        .filter((g) => !g.done && g.deadline)
        .sort((a, b) => {
          const pa = PRIO[a.prio]?.n ?? 1;
          const pb = PRIO[b.prio]?.n ?? 1;
          if (pa !== pb) return pa - pb;
          return new Date(a.deadline) - new Date(b.deadline);
        }),
    [goals]
  );

  return (
    <div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 16,
          marginBottom: 12,
        }}
      >
        📋 Дедлайны{" "}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#94A3B8",
          }}
        >
          (по важности)
        </span>
      </div>
      {upcoming.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px",
            color: "#94A3B8",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Нет дедлайнов 🎉
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.map((g) => {
            const cat = CATS.find((c) => c.id === g.cat) || CATS[0];
            const dl = daysLeft(g.deadline);
            const overdue = dl < 0;
            const pri = PRIO[g.prio] || PRIO.medium;
            return (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  borderRadius: 18,
                  background: "#fff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  borderLeft: `4px solid ${pri.c}`,
                }}
              >
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {g.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#94A3B8",
                      marginTop: 2,
                    }}
                  >
                    {fmtDateFull(g.deadline)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "5px 12px",
                    borderRadius: 10,
                    whiteSpace: "nowrap",
                    background: overdue
                      ? "#FEE2E2"
                      : dl <= 3
                      ? "#FEF3C7"
                      : "#F1F5F9",
                    color: overdue
                      ? "#DC2626"
                      : dl <= 3
                      ? "#D97706"
                      : "#64748B",
                  }}
                >
                  {overdue
                    ? `${Math.abs(dl)}д назад`
                    : dl === 0
                    ? "Сегодня!"
                    : dl === 1
                    ? "Завтра"
                    : `${dl} дн.`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Ring({ pct, size = 50, stroke = 4, color = "#6366F1", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamp(pct, 0, 100) / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StatsPage({ goals, habits }) {
  const t = goals.length;
  const d = goals.filter((g) => g.done).length;
  const pct = t > 0 ? Math.round((d / t) * 100) : 0;
  const allT = goals.reduce(
    (a, g) => {
      const c = countTasks(g.tasks || []);
      return { total: a.total + c.total, done: a.done + c.done };
    },
    { total: 0, done: 0 }
  );
  const byCat = CATS.map((c) => {
    const cg = goals.filter((g) => g.cat === c.id);
    return { ...c, t: cg.length, d: cg.filter((g) => g.done).length };
  }).filter((c) => c.t > 0);
  const topStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streak || 0)) : 0;
  const doneToday = habits.filter((h) => h.logs && h.logs[todayKey()]).length;

  if (t === 0)
    return (
      <div style={{ textAlign: "center", padding: "70px 20px" }}>
        <div style={{ fontSize: 60 }}>📊</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#94A3B8",
            marginTop: 12,
          }}
        >
          Создай первую цель
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#CBD5E1",
            marginTop: 6,
          }}
        >
          Статистика появится здесь
        </div>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          background: "linear-gradient(135deg,#6366F1,#8B5CF6,#A78BFA)",
          borderRadius: 24,
          padding: "22px 20px",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <Ring pct={pct} size={92} stroke={7} color="#fff">
            <span
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              {pct}%
            </span>
          </Ring>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            opacity: 0.85,
            marginBottom: 14,
          }}
        >
          Прогресс целей
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
          {[
            { v: d, l: "Выполнено" },
            { v: t - d, l: "В работе" },
            { v: allT.done, l: "Задач ✓" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.2)" : "none",
                padding: "0 8px",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                {item.v}
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.7,
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                {item.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 4 }}>🔥</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#F97316",
            }}
          >
            {topStreak}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#94A3B8",
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            Лучшая серия
          </div>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 4 }}>✅</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#10B981",
            }}
          >
            {doneToday}/{habits.length}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#94A3B8",
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            Привычек сегодня
          </div>
        </div>
      </div>

      {byCat.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "16px 14px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 10,
              color: "#0F172A",
            }}
          >
            По сферам жизни
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {byCat.map((c) => {
              const pct = c.t > 0 ? Math.round((c.d / c.t) * 100) : 0;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 12,
                      background: c.accent + "18",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {c.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 3,
                        color: "#64748B",
                        fontWeight: 700,
                      }}
                    >
                      <span>{c.label}</span>
                      <span>
                        {c.d}/{c.t}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        borderRadius: 999,
                        background: "#F1F5F9",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: c.accent,
                          transition: "width .4s",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CalView({ goals, calTasks, setCalTasks }) {
  const [cur, setCur] = useState(new Date());
  const [priorityFilter, setPriorityFilter] = useState("all");
  const y = cur.getFullYear();
  const m = cur.getMonth();
  const days = monthDays(y, m);
  const today = new Date();
  const gmap = useMemo(() => {
    const mp = {};
    goals.forEach((g) => {
      if (g.deadline) (mp[g.deadline] = mp[g.deadline] || []).push(g);
    });
    return mp;
  }, [goals]);
  const [sheet, setSheet] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const tasksByDate = useMemo(() => {
    const prioOrder = { high: 0, medium: 1, low: 2 };
    const map = {};
    (calTasks || [])
      .filter((t) => priorityFilter === "all" || t.prio === priorityFilter)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const pa = prioOrder[a.prio] ?? 1;
        const pb = prioOrder[b.prio] ?? 1;
        if (pa !== pb) return pa - pb;
        return a.title.localeCompare(b.title);
      })
      .forEach((t) => {
        map[t.date] = map[t.date] || [];
        map[t.date].push(t);
      });
    return map;
  }, [calTasks, priorityFilter]);

  const addTask = async () => {
    if (!newTask.trim() || !selectedDate) return;
    const dk = dateKey(selectedDate);
    try {
      const res = await api.createCalendar({
        title: newTask.trim(),
        date: dk,
        prio: "medium",
      });
      setCalTasks((prev) => [
        ...prev,
        { id: res.id, title: newTask.trim(), date: dk, done: false, prio: "medium" },
      ]);
      setNewTask("");
      setSheet(false);
      setSelectedDate(null);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTask = async (tid, done) => {
    try {
      await api.updateCalendar(tid, { done: !done });
      setCalTasks((prev) =>
        prev.map((t) => (t.id === tid ? { ...t, done: !done } : t))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditingTitle(t.title);
  };

  const saveEdit = async (t) => {
    const title = editingTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    try {
      await api.updateCalendar(t.id, { title });
      setCalTasks((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, title } : x))
      );
    } catch (e) {
      console.error(e);
    }
    setEditingId(null);
  };

  const deleteTask = async (tid) => {
    try {
      await api.deleteCalendar(tid);
    } catch (e) {
      console.error(e);
    }
    setCalTasks((prev) => prev.filter((t) => t.id !== tid));
  };

  const todayD = new Date();
  const tomorrowD = new Date();
  tomorrowD.setDate(todayD.getDate() + 1);

  const dkToday = dateKey(todayD);
  const dkTomorrow = dateKey(tomorrowD);

  const otherDates = Object.keys(tasksByDate)
    .filter((dk) => dk !== dkToday && dk !== dkTomorrow)
    .sort();

  return (
    <div>
      <div
        style={{
          background: "linear-gradient(135deg,#8B5CF6,#7C3AED)",
          borderRadius: 22,
          padding: "16px 20px",
          marginBottom: 14,
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setCur(new Date(y, m - 1, 1))}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: 12,
              backdropFilter: "blur(8px)",
            }}
          >
            ◀
          </button>
          <span style={{ fontWeight: 900, fontSize: 18 }}>
            {MO_NAMES[m]} {y}
          </span>
          <button
            onClick={() => setCur(new Date(y, m + 1, 1))}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: 12,
              backdropFilter: "blur(8px)",
            }}
          >
            ▶
          </button>
          <button
            onClick={() => {
              setSelectedDate(today);
              setSheet(true);
            }}
            style={{
              background: "#fff",
              color: "#4F46E5",
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 12px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
            }}
          >
            ＋ Добавить задачу
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { id: "all", l: "Все" },
          { id: "high", l: "Важные" },
          { id: "medium", l: "Средние" },
          { id: "low", l: "Низкие" },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPriorityFilter(p.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 50,
              border: "none",
              background: priorityFilter === p.id ? "#6366F1" : "#fff",
              color: priorityFilter === p.id ? "#fff" : "#94A3B8",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {p.l}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 22,
          padding: "14px 12px",
          boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 3,
            marginBottom: 8,
          }}
        >
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                fontSize: 10,
                fontWeight: 800,
                color: "#94A3B8",
                padding: 4,
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 3,
          }}
        >
          {days.map(({ d, cur: cm }, i) => {
            const k = dateKey(d);
            const dg = gmap[k] || [];
            const td = sameDay(d, today);
            const ct = tasksByDate[k] || [];
            return (
              <div
                key={i}
                onClick={() => {
                  setSelectedDate(d);
                  setSheet(true);
                }}
                style={{
                  minHeight: 48,
                  padding: 4,
                  borderRadius: 12,
                  background: td ? "#EEF2FF" : cm ? "#FAFAFA" : "transparent",
                  border: td ? "2px solid #6366F1" : "2px solid transparent",
                  opacity: cm ? 1 : 0.2,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: td ? 900 : 600,
                    color: td ? "#6366F1" : "#64748B",
                    marginBottom: 2,
                  }}
                >
                  {d.getDate()}
                </div>
                {dg.slice(0, 2).map((g) => {
                  const cat = CATS.find((c) => c.id === g.cat);
                  return (
                    <div
                      key={g.id}
                      style={{
                        fontSize: 8,
                        padding: "1px 4px",
                        borderRadius: 4,
                        marginBottom: 1,
                        background: cat?.accent + "20",
                        color: cat?.accent,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textDecoration: g.done ? "line-through" : "none",
                      }}
                    >
                      {g.title}
                    </div>
                  );
                })}
                {ct.slice(0, 2).map((t) => {
                  const pr = TPRIO.find((x) => x.id === t.prio) || TPRIO[1];
                  return (
                    <div
                      key={t.id}
                      style={{
                        fontSize: 8,
                        padding: "1px 4px",
                        borderRadius: 4,
                        marginBottom: 1,
                        background: t.done ? "#10B98120" : pr.c + "20",
                        color: t.done ? "#10B981" : pr.c,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textDecoration: t.done ? "line-through" : "none",
                      }}
                    >
                      {t.title}
                    </div>
                  );
                })}
                {dg.length + ct.length > 2 && (
                  <div
                    style={{
                      fontSize: 8,
                      color: "#94A3B8",
                      fontWeight: 700,
                    }}
                  >
                    +{dg.length + ct.length - 2}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          fontWeight: 900,
          fontSize: 16,
          marginBottom: 12,
        }}
      >
        📅 Задачи на ближайшие дни
      </div>

      {[{ label: "Сегодня", d: todayD, dk: dkToday }, { label: "Завтра", d: tomorrowD, dk: dkTomorrow }].map(
        ({ label, d, dk }) => {
          const tasks = tasksByDate[dk] || [];
          return (
            <div key={dk} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#64748B",
                  marginBottom: 8,
                }}
              >
                {label} ({fmtDate(d)})
              </div>
              {tasks.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "12px",
                    color: "#CBD5E1",
                    fontSize: 13,
                  }}
                >
                  Нет задач
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 14,
                        background: "#fff",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        onClick={() => toggleTask(t.id, t.done)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          border: "2px solid #E2E8F0",
                          background: t.done ? "#10B981" : "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 900,
                        }}
                      >
                        {t.done && "✓"}
                      </div>
                      {editingId === t.id ? (
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => saveEdit(t)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(t)}
                          style={{
                            flex: 1,
                            fontSize: 14,
                            border: "none",
                            borderBottom: "2px solid #6366F1",
                            outline: "none",
                            padding: "2px 0",
                            background: "transparent",
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(t)}
                          style={{
                            flex: 1,
                            fontSize: 14,
                            textDecoration: t.done ? "line-through" : "none",
                            color: t.done ? "#94A3B8" : "#0F172A",
                            cursor: "text",
                          }}
                        >
                          {t.title}
                        </span>
                      )}
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#E2E8F0",
                          fontSize: 16,
                          cursor: "pointer",
                          padding: 4,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }
      )}

      {otherDates.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 16,
              marginBottom: 8,
            }}
          >
            📆 Другие даты
          </div>
          {otherDates.map((dk) => {
            const d = new Date(dk);
            const tasks = tasksByDate[dk] || [];
            return (
              <div key={dk} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#64748B",
                    marginBottom: 6,
                  }}
                >
                  {fmtDateFull(d)} ({dk})
                </div>
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 12,
                      background: "#fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      onClick={() => toggleTask(t.id, t.done)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 8,
                        border: "2px solid #E2E8F0",
                        background: t.done ? "#10B981" : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      {t.done && "✓"}
                    </div>
                    {editingId === t.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => saveEdit(t)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(t)}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          border: "none",
                          borderBottom: "2px solid #6366F1",
                          outline: "none",
                          padding: "2px 0",
                          background: "transparent",
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => startEdit(t)}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          textDecoration: t.done ? "line-through" : "none",
                          color: t.done ? "#94A3B8" : "#0F172A",
                          cursor: "text",
                        }}
                      >
                        {t.title}
                      </span>
                    )}
                    <button
                      onClick={() => deleteTask(t.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#E2E8F0",
                        fontSize: 16,
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {sheet && (
        <Sheet
          open={sheet}
          onClose={() => {
            setSheet(false);
            setSelectedDate(null);
            setNewTask("");
          }}
          title={`Добавить задачу на ${
            selectedDate ? fmtDate(selectedDate) : ""
          }`}
        >
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Название задачи..."
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 18,
              border: "2px solid #F1F5F9",
              fontSize: 15,
              outline: "none",
              background: "#fff",
              color: "#0F172A",
              boxSizing: "border-box",
              marginBottom: 16,
            }}
          />
          <button
            onClick={addTask}
            style={{
              width: "100%",
              padding: "17px 0",
              borderRadius: 18,
              border: "none",
              background: newTask.trim()
                ? "linear-gradient(135deg,#6366F1,#8B5CF6)"
                : "#E2E8F0",
              color: newTask.trim() ? "#fff" : "#94A3B8",
              fontSize: 16,
              fontWeight: 800,
              cursor: newTask.trim() ? "pointer" : "default",
              boxShadow: newTask.trim()
                ? "0 6px 20px rgba(99,102,241,.35)"
                : "none",
              transition: "all .2s",
            }}
          >
            Добавить 🚀
          </button>
        </Sheet>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState({
    goals: [],
    habits: [],
    wishes: [],
  });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("goals");
  const [sheet, setSheet] = useState(false);
  const [editG, setEditG] = useState(null);
  const [openGId, setOpenGId] = useState(null);
  const [filt, setFilt] = useState("all");
  const [prioFilt, setPrioFilt] = useState("all");
  const [calTasks, setCalTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    api.getCalendar().then(setCalTasks).catch(() => setCalTasks([]));
  }, []);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setReady(true);
    });
  }, []);

  const { goals, habits, wishes } = data;
  const setGoals = (fn) =>
    setData((d) => ({ ...d, goals: typeof fn === "function" ? fn(d.goals) : fn }));
  const setHabits = (h) => setData((d) => ({ ...d, habits: h }));
  const setWishes = (w) => setData((d) => ({ ...d, wishes: w }));

  const fireConfetti = () => {
    setConfetti(false);
    setTimeout(() => setConfetti(true), 10);
    setTimeout(() => setConfetti(false), 3000);
  };

  const tabs = [
    { id: "goals", label: "Цели", emoji: "🎯" },
    { id: "habits", label: "Привычки", emoji: "🔁" },
    { id: "wishes", label: "Желания", emoji: "💫" },
    { id: "cal", label: "Календарь", emoji: "📅" },
    { id: "deadlines", label: "Дедлайны", emoji: "⏰" },
    { id: "ideas", label: "Идеи", emoji: "💡" },
    { id: "stats", label: "Статистика", emoji: "📊" },
  ];

  const nowKey = todayKey();
  const filtered = goals.filter((g) => {
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      if (
        !(
          g.title.toLowerCase().includes(s) ||
          (g.desc || "").toLowerCase().includes(s)
        )
      )
        return false;
    }
    if (filt === "active" && g.done) return false;
    if (filt === "done" && !g.done) return false;
    if (filt === "overdue") {
      if (!g.deadline) return false;
      const dl = daysLeft(g.deadline);
      if (dl === null || dl >= 0 || g.done) return false;
    }
    if (prioFilt !== "all" && g.prio !== prioFilt) return false;
    return true;
  });

  const doSave = async (g) => {
    try {
      const ex = goals.find((x) => x.id === g.id);
      if (ex) {
        await apiFetch(`/api/goals/${g.id}`, {
          method: "PUT",
          body: JSON.stringify(g),
        });
        setGoals(goals.map((x) => (x.id === g.id ? g : x)));
      } else {
        await apiFetch("/api/goals", {
          method: "POST",
          body: JSON.stringify(g),
        });
        setGoals([...goals, g]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const doDelete = async (id) => {
    setGoals(goals.filter((g) => g.id !== id));
    try {
      await apiFetch(`/api/goals/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
    setOpenGId(null);
  };

  const doToggle = async (id) => {
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    const upd = { ...g, done: !g.done };
    setGoals(goals.map((x) => (x.id === id ? upd : x)));
    try {
      await apiFetch(`/api/goals/${id}`, {
        method: "PUT",
        body: JSON.stringify(upd),
      });
      if (upd.done) fireConfetti();
    } catch (e) {
      console.error(e);
    }
  };

  const openGoal = goals.find((g) => g.id === openGId) || null;

  const handleUpdateGoal = (ng) => {
    setGoals(goals.map((g) => (g.id === ng.id ? ng : g)));
  };

  if (!ready) {
    return (
      <div
        className="app-wrap"
        style={{
          maxWidth: 430,
          margin: "0 auto",
          padding: "18px 16px 90px",
        }}
      >
        <style>{CSS_GLOBAL}</style>
        <div
          style={{
            textAlign: "center",
            paddingTop: 80,
            color: "#94A3B8",
          }}
        >
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div
      className="app-wrap"
      style={{
        maxWidth: 430,
        margin: "0 auto",
        padding: "18px 16px 90px",
      }}
    >
      <style>{CSS_GLOBAL}</style>
      <Confetti active={confetti} />

      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
          }}
        >
          <span>{tab === "goals" ? "Мои цели" : ""}</span>
          <span>{tab === "habits" ? "Привычки" : ""}</span>
          <span>{tab === "wishes" ? "Желания" : ""}</span>
          <span>{tab === "cal" ? "Календарь задач" : ""}</span>
          <span>{tab === "deadlines" ? "Дедлайны" : ""}</span>
          <span>{tab === "ideas" ? "Идеи" : ""}</span>
          <span>{tab === "stats" ? "Статистика" : ""}</span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#94A3B8",
            marginTop: 2,
          }}
        >
          {tab === "goals" && "Планируй цели и разбивай их на задачи"}
          {tab === "habits" && "Отмечай ежедневные привычки"}
          {tab === "wishes" && "Сохраняй свои мечты и хотелки"}
          {tab === "cal" && "Смотри задачи по датам"}
          {tab === "deadlines" && "Не пропускай важные дедлайны"}
          {tab === "ideas" && "Храни и развивай идеи"}
          {tab === "stats" && "Смотри прогресс по целям и привычкам"}
        </div>
      </div>

      {tab === "goals" && !openGoal && (
        <button
          onClick={() => {
            setEditG(null);
            setSheet(true);
          }}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: 16,
            border: "none",
            marginBottom: 12,
            background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(99,102,241,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span>＋ Новая цель</span>
        </button>
      )}

      {openGoal && (
        <GoalDetail
          goal={openGoal}
          onBack={() => setOpenGId(null)}
          onUpdate={handleUpdateGoal}
          onDelete={doDelete}
          onConfetti={fireConfetti}
          onEdit={(g) => {
            setEditG(g);
            setSheet(true);
          }}
        />
      )}

      {!openGoal && (
        <div style={{ padding: "0 0 0" }}>
          {tab === "goals" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск целей..."
                    style={{ ...S.field, paddingLeft: 42 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 16,
                      pointerEvents: "none",
                    }}
                  >
                    🔍
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    overflowX: "auto",
                    paddingBottom: 2,
                  }}
                >
                  {[
                    { id: "all", l: "Все" },
                    { id: "active", l: "Активные" },
                    { id: "done", l: "Готово ✓" },
                    { id: "overdue", l: "Просрочено" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilt(f.id)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 50,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        background: filt === f.id ? "#6366F1" : "#fff",
                        color: filt === f.id ? "#fff" : "#94A3B8",
                        boxShadow:
                          filt === f.id
                            ? "0 2px 10px rgba(99,102,241,.3)"
                            : "0 1px 4px rgba(0,0,0,.05)",
                        transition: "all .2s",
                      }}
                    >
                      {f.l}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    overflowX: "auto",
                    paddingBottom: 2,
                    marginTop: 6,
                  }}
                >
                  {[
                    { id: "all", l: "Все приоритеты" },
                    { id: "high", l: "Важно", c: "#EF4444" },
                    { id: "medium", l: "Средне", c: "#F59E0B" },
                    { id: "low", l: "Не срочно", c: "#22C55E" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPrioFilt(p.id)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 50,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        background:
                          prioFilt === p.id ? p.c || "#6366F1" : "#fff",
                        color: prioFilt === p.id ? "#fff" : "#94A3B8",
                        boxShadow:
                          prioFilt === p.id
                            ? "0 2px 10px rgba(99,102,241,.3)"
                            : "0 1px 4px rgba(0,0,0,.05)",
                        transition: "all .2s",
                      }}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              {filtered.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                  }}
                >
                  <div style={{ fontSize: 60 }}>
                    {goals.length === 0 ? "🎯" : "🔍"}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#94A3B8",
                      marginTop: 12,
                    }}
                  >
                    {goals.length === 0
                      ? "Начни с первой цели!"
                      : "Ничего не найдено"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#CBD5E1",
                      marginTop: 6,
                    }}
                  >
                    {goals.length === 0
                      ? "Нажми + чтобы добавить"
                      : "Попробуй другой запрос"}
                  </div>
                </div>
              ) : (
                filtered.map((g) => (
                  <GoalCard
                    key={g.id}
                    g={g}
                    onTap={() => setOpenGId(g.id)}
                    onToggle={doToggle}
                  />
                ))
              )}
            </>
          )}
          {tab === "habits" && (
            <HabitsPage habits={habits} onUpdate={setHabits} />
          )}
          {tab === "wishes" && (
            <WishesPage wishes={wishes} onUpdate={setWishes} />
          )}
          {tab === "cal" && (
            <CalView
              goals={goals}
              calTasks={calTasks}
              setCalTasks={setCalTasks}
            />
          )}
          {tab === "deadlines" && <DeadlinesView goals={goals} />}
          {tab === "ideas" && (
            <IdeasPage
              onMakeGoal={(idea) => {
                setTab("goals");
                setEditG({
                  id: uid(),
                  title: idea.title,
                  desc: idea.note || "",
                  cat: "work",
                  prio: "medium",
                  deadline: "",
                  reward: "",
                  tasks: [],
                  done: false,
                  created: new Date().toISOString(),
                });
                setSheet(true);
              }}
            />
          )}
          {tab === "stats" && (
            <StatsPage goals={goals} habits={habits} />
          )}
        </div>
      )}

      <div
        className="bottom-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          background: "#fff",
          borderTop: "1px solid #F1F5F9",
          display: "flex",
          justifyContent: "space-around",
          paddingTop: 10,
          zIndex: 100,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.07)",
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                background: active ? "#EEF2FF" : "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: 16,
                minWidth: 0,
                transition: "background .2s",
                flex: 1,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  filter: active ? "none" : "grayscale(60%)",
                  opacity: active ? 1 : 0.5,
                  transform: active ? "scale(1.1)" : "scale(1)",
                  transition: "all .2s",
                  display: "block",
                }}
              >
                {t.emoji}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 800 : 600,
                  color: active ? "#6366F1" : "#94A3B8",
                  transition: "color .2s",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </span>
              {active && (
                <div
                  style={{
                    width: 20,
                    height: 3,
                    borderRadius: 2,
                    background: "#6366F1",
                    marginTop: 1,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <Sheet
        open={sheet}
        onClose={() => {
          setSheet(false);
          setEditG(null);
        }}
        title={editG ? "Редактировать цель" : "Новая цель 🎯"}
      >
        <GoalForm
          goal={editG}
          onSave={doSave}
          onClose={() => {
            setSheet(false);
            setEditG(null);
          }}
        />
      </Sheet>
    </div>
  );
}
