import { useState, useEffect } from "react";

/* ---------- デザイントークン ---------- */
export const C = {
  ink: "#0A2238", aqua: "#14A3A1", deepAqua: "#0E7C7B",
  yellow: "#F5BE3D", deck: "#F2F7F7", card: "#FFFFFF",
  line: "#DCE8E8", sub: "#5B7283", red: "#E05B5B",
};

/* ---------- 魚：集中時間に応じて獲得 ---------- */
export const FISHES = [
  { e: "🫧", name: "シャボン玉",       minutes: 5   },
  { e: "🐠", name: "熱帯魚",           minutes: 10  },
  { e: "🐟", name: "さかな",           minutes: 15  },
  { e: "🐡", name: "フグ",             minutes: 25  },
  { e: "🐙", name: "タコ",             minutes: 30  },
  { e: "🦑", name: "イカ",             minutes: 40  },
  { e: "🐬", name: "イルカ",           minutes: 50  },
  { e: "🦈", name: "サメ",             minutes: 60  },
  { e: "🦭", name: "アザラシ",         minutes: 75  },
  { e: "🐳", name: "クジラ",           minutes: 90  },
  { e: "🦕", name: "プレシオサウルス", minutes: 120 },
];

/** 指定分数で獲得できる魚を返す */
export const fishForMinutes = (min) => {
  const sorted = [...FISHES].sort((a, b) => b.minutes - a.minutes);
  return sorted.find((f) => min >= f.minutes) ?? FISHES[0];
};

/* ---------- 日付ユーティリティ ---------- */
export const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayStr = () => fmt(new Date());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- タスクの成長ステージ（セッション回数） ---------- */
export const stageOf = (g) =>
  g === 0  ? { label: "たまご",   size: 0  } :
  g <= 2   ? { label: "稚魚",     size: 20 } :
  g <= 4   ? { label: "若魚",     size: 28 } :
  g <= 7   ? { label: "成魚",     size: 36 } :
             { label: "大物",     size: Math.min(42 + (g - 8) * 2, 52) };

/* ================= TaskForm ================= */
export function TaskForm({ data, update, defaultDue = "", onAdded }) {
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [due, setDue] = useState(defaultDue);
  const [startTime, setStartTime] = useState("");

  useEffect(() => setDue(defaultDue), [defaultDue]);

  const weekend = () => {
    const d = new Date();
    return fmt(addDays(d, (6 - d.getDay() + 7) % 7 || 7));
  };
  const chips = [
    ["今日", todayStr()],
    ["明日", fmt(addDays(new Date(), 1))],
    ["今週末", weekend()],
    ["なし", ""],
  ];

  const add = () => {
    if (!title.trim()) return;
    update((d) => {
      d.tasks.unshift({ id: uid(), title: title.trim(), goalId: goalId || null, due: due || null, startTime: startTime || null, done: false });
      return d;
    });
    setTitle("");
    setStartTime("");
    onAdded?.();
  };

  const label = { fontSize: 11, fontWeight: 800, color: C.sub, margin: "10px 0 6px", display: "block" };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14 }}>
      <span style={{ ...label, marginTop: 0 }}>① タスク名</span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="例：英語リスニング 30分"
        style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14 }}
      />

      <span style={label}>② 期限</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {chips.map(([l, v]) => (
          <button key={l} onClick={() => setDue(v)}
            style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${due === v ? C.deepAqua : C.line}`, background: due === v ? C.deepAqua : "#fff", color: due === v ? "#fff" : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {l}
          </button>
        ))}
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
          style={{ padding: "7px 8px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12 }} />
      </div>

      <span style={label}>③ 開始予定時刻（任意・5分前に通知）</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="time" value={startTime}
          onChange={(e) => {
            setStartTime(e.target.value);
            if (e.target.value && "Notification" in window && Notification.permission === "default") {
              Notification.requestPermission().catch(() => {});
            }
          }}
          style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
        {startTime && (
          <button onClick={() => setStartTime("")}
            style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 12, cursor: "pointer" }}>クリア</button>
        )}
        <span style={{ fontSize: 11, color: C.sub }}>※ 期限日の当日に通知されます</span>
      </div>

      <span style={label}>④ 長期目標と紐付け（任意）</span>
      <select value={goalId} onChange={(e) => setGoalId(e.target.value)}
        style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, background: "#fff" }}>
        <option value="">紐付けない</option>
        {data.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
      </select>

      <button onClick={add}
        style={{ width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 12, border: "none", background: title.trim() ? C.aqua : "#BFDEDE", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
        タスクを追加する
      </button>
    </div>
  );
}

/* ================= TaskRow ================= */
export function TaskRow({ t, data, update, growthOf, onFocus }) {
  const g = data.goals.find((x) => x.id === t.goalId);
  const growth = growthOf(t.id);
  const stage = stageOf(growth);
  const overdue = t.due && !t.done && t.due < todayStr();

  // タスクに紐づいたセッションの中で最新のセッションから魚を取得
  const lastSession = [...data.sessions].reverse().find((s) => s.taskId === t.id);
  const displayFish = lastSession?.fish ?? "🥚";

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={() => update((d) => {
          const x = d.tasks.find((x) => x.id === t.id);
          x.done = !x.done;
          // 完了したらアーカイブに永久記録（目標名も焼き込み、タスク/目標を消しても残る）
          if (!Array.isArray(d.archive)) d.archive = [];
          d.archive = d.archive.filter((a) => a.id !== x.id);
          if (x.done) {
            const g = d.goals.find((gg) => gg.id === x.goalId);
            const sess = d.sessions.filter((s) => s.taskId === x.id);
            d.archive.push({
              id: x.id, title: x.title,
              goalTitle: g?.title ?? null, goalType: g?.type ?? null,
              due: x.due ?? null, completedAt: todayStr(),
              sessions: sess.length,
              fish: sess.length ? sess[sess.length - 1].fish : null,
            });
          }
          return d;
        })}
        style={{ width: 24, height: 24, borderRadius: 999, border: `2px solid ${t.done ? C.aqua : C.line}`, background: t.done ? C.aqua : "#fff", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: "20px", padding: 0, flexShrink: 0 }}>
        {t.done ? "✓" : ""}
      </button>
      <div style={{ fontSize: 22, flexShrink: 0 }}>{displayFish}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, textDecoration: t.done ? "line-through" : "none", color: t.done ? C.sub : C.ink }}>{t.title}</div>
        <div style={{ fontSize: 11, color: overdue ? C.red : C.sub, marginTop: 2 }}>
          {g && <span style={{ color: C.deepAqua, fontWeight: 700 }}>● {g.title}　</span>}
          {stage.label}（{growth}回）
          {t.due ? (overdue ? `　期限超過 ${t.due}` : `　期限 ${t.due}`) : ""}
          {t.startTime ? `　⏰ ${t.startTime}〜` : ""}
        </div>
      </div>
      {onFocus && !t.done && (
        <button onClick={() => onFocus(t.id)} title="このタスクで集中する"
          style={{ border: "none", background: "#E6F5F5", color: C.deepAqua, cursor: "pointer", fontSize: 14, borderRadius: 10, padding: "6px 8px", flexShrink: 0 }}>⏱</button>
      )}
      <button onClick={() => { if (window.confirm(`「${t.title}」を削除しますか？`)) update((d) => { d.tasks = d.tasks.filter((x) => x.id !== t.id); return d; }); }}
        style={{ border: "none", background: "none", color: C.sub, cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

export const numInput = {
  width: 48, margin: "0 4px", padding: "6px", borderRadius: 8,
  border: `1px solid ${C.line}`, textAlign: "center", fontSize: 13,
};

export function Stat({ label, value, accent }) {
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "12px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ? C.deepAqua : C.ink }}>{value}</div>
      <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>{label}</div>
    </div>
  );
}
