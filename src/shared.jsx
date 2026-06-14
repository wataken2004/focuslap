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

/* ---------- 繰り返しタスク ---------- */
export const REPEATS = { daily: "毎日", weekly: "毎週", biweekly: "隔週", monthly: "毎月", bimonthly: "隔月" };

/** 期限と繰り返し種別から次回の期限を計算（月末はみ出しは月末に丸める） */
export const nextRepeatDate = (dueStr, repeat) => {
  const base = dueStr ? new Date(dueStr + "T00:00:00") : new Date();
  const d = new Date(base);
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  else if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "biweekly") d.setDate(d.getDate() + 14);
  else if (repeat === "monthly" || repeat === "bimonthly") {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + (repeat === "monthly" ? 1 : 2));
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  return fmt(d);
};

/** 開始日〜最終日(until)までの繰り返し日付を全て返す（上限370件で暴走防止） */
export const repeatDates = (startStr, repeat, untilStr) => {
  const dates = [];
  let cur = startStr;
  let guard = 0;
  while (cur <= untilStr && guard < 370) {
    dates.push(cur);
    cur = nextRepeatDate(cur, repeat);
    guard++;
  }
  return dates;
};

/* ---------- タスクの成長ステージ（セッション回数） ---------- */
export const stageOf = (g) =>
  g === 0  ? { label: "たまご",   size: 0  } :
  g <= 2   ? { label: "稚魚",     size: 20 } :
  g <= 4   ? { label: "若魚",     size: 28 } :
  g <= 7   ? { label: "成魚",     size: 36 } :
             { label: "大物",     size: Math.min(42 + (g - 8) * 2, 52) };

/* 完了処理（アーカイブ記録＋繰り返し次回生成）。チェックボックスと進捗100%で共用 */
export function applyTaskDone(d, taskId, done) {
  const x = d.tasks.find((t) => t.id === taskId);
  if (!x) return d;
  x.done = done;
  if (!Array.isArray(d.archive)) d.archive = [];
  d.archive = d.archive.filter((a) => a.id !== x.id);
  if (done) {
    x.progress = 100;
    const g = d.goals.find((gg) => gg.id === x.goalId);
    const sess = d.sessions.filter((s) => s.taskId === x.id);
    d.archive.push({
      id: x.id, title: x.title,
      goalTitle: g?.title ?? null, goalType: g?.type ?? null,
      due: x.due ?? null, completedAt: todayStr(),
      sessions: sess.length,
      fish: sess.length ? sess[sess.length - 1].fish : null,
    });
    // 最終日なしの単発繰り返しのみ、完了時に次回分を自動作成
    if (x.repeat && !x.repeatGroup) {
      const next = nextRepeatDate(x.due, x.repeat);
      if (!x.repeatUntil || next <= x.repeatUntil) {
        const newId = uid();
        d.tasks.push({
          id: newId, title: x.title, goalId: x.goalId,
          due: next, startTime: x.startTime ?? null,
          repeat: x.repeat, repeatUntil: x.repeatUntil ?? null, note: x.note, done: false,
        });
        x.nextId = newId;
      }
    }
  } else if (x.nextId) {
    // チェックを外したら、自動作成した次回分を取り消す（未着手の場合のみ）
    const nt = d.tasks.find((y) => y.id === x.nextId);
    if (nt && !nt.done) d.tasks = d.tasks.filter((y) => y.id !== x.nextId);
    delete x.nextId;
  }
  return d;
}

/* ================= 進捗シート（5%刻みで積み上げ・100%で完了） ================= */
export function ProgressSheet({ task, update, onClose }) {
  const [p, setP] = useState(task.progress || 0);
  const [memo, setMemo] = useState(task.progressNote || "");
  const clamp = (v) => Math.max(0, Math.min(100, v));

  const save = (forceComplete) => {
    const complete = forceComplete || p >= 100;
    update((d) => {
      const x = d.tasks.find((t) => t.id === task.id);
      if (x) { x.progress = complete ? 100 : p; x.progressNote = memo; }
      if (complete) applyTaskDone(d, task.id, true);
      return d;
    });
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(6,18,32,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 28px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontSize: 12, color: C.sub, fontWeight: 800 }}>📊 タスクの進捗</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: "2px 0 14px" }}>{task.title}</div>

        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: p >= 100 ? C.deepAqua : C.aqua, fontVariantNumeric: "tabular-nums" }}>{p}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.sub }}>%</span>
        </div>
        <div style={{ height: 14, borderRadius: 7, background: "#E4EFEF", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ width: `${p}%`, height: "100%", background: `linear-gradient(90deg,${C.aqua},${C.deepAqua})`, transition: "width .25s" }} />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <button onClick={() => setP((v) => clamp(v - 5))}
            style={{ flex: 1, padding: "16px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 18, fontWeight: 800, cursor: "pointer" }}>− 5%</button>
          <button onClick={() => setP((v) => clamp(v + 5))}
            style={{ flex: 1, padding: "16px 0", borderRadius: 12, border: "none", background: C.aqua, color: "#fff", fontSize: 18, fontWeight: 800, cursor: "pointer" }}>＋ 5%</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[0, 25, 50, 75].map((v) => (
            <button key={v} onClick={() => setP(v)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 999, border: `1px solid ${p === v ? C.deepAqua : C.line}`, background: p === v ? C.deepAqua : "#fff", color: p === v ? "#fff" : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{v}%</button>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, marginBottom: 6 }}>✏️ 引き継ぎメモ（次回の自分へ）</div>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
          placeholder="例：CH3まで完了。次はCH4の演習から"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, resize: "vertical", minHeight: 60, fontFamily: "inherit", marginBottom: 16 }} />

        <button onClick={() => save(true)}
          style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.deepAqua, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 8 }}>
          ✅ 完了にする（100%）
        </button>
        <button onClick={() => save(false)}
          style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1px solid ${C.aqua}`, background: "#fff", color: C.deepAqua, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          {p >= 100 ? "完了して保存" : `${p}%で保存（続きは次回）`}
        </button>
      </div>
    </div>
  );
}

/* ================= TaskForm ================= */
export function TaskForm({ data, update, defaultDue = "", onAdded }) {
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [due, setDue] = useState(defaultDue);
  const [startTime, setStartTime] = useState("");
  const [repeat, setRepeat] = useState("");
  const [repeatUntil, setRepeatUntil] = useState("");

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
    const base = due || (repeat ? todayStr() : null);
    update((d) => {
      if (repeat && repeatUntil && base && repeatUntil >= base) {
        // 繰り返し＋最終日：期間中の全回分を事前生成してカレンダーに並べる
        const group = uid();
        repeatDates(base, repeat, repeatUntil).forEach((dt) => {
          d.tasks.push({
            id: uid(), title: title.trim(), goalId: goalId || null,
            due: dt, startTime: startTime || null,
            repeat, repeatUntil, repeatGroup: group, done: false,
          });
        });
      } else {
        // 単発、または最終日なしの繰り返し（完了すると次回分を自動追加）
        d.tasks.unshift({
          id: uid(), title: title.trim(), goalId: goalId || null,
          due: base,
          startTime: startTime || null,
          repeat: repeat || null,
          done: false,
        });
      }
      return d;
    });
    setTitle("");
    setStartTime("");
    setRepeat("");
    setRepeatUntil("");
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

      <span style={label}>④ 繰り返し（任意）</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["", "なし"], ["daily", "毎日"], ["weekly", "毎週"], ["biweekly", "隔週"], ["monthly", "毎月"], ["bimonthly", "隔月"]].map(([v, l]) => (
          <button key={v} onClick={() => setRepeat(v)}
            style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${repeat === v ? C.deepAqua : C.line}`, background: repeat === v ? C.deepAqua : "#fff", color: repeat === v ? "#fff" : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
      {repeat && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 11, color: C.sub, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            いつまで繰り返す？（最終日）
            <input type="date" value={repeatUntil} min={due || todayStr()}
              onChange={(e) => setRepeatUntil(e.target.value)}
              style={{ padding: "7px 8px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
            {repeatUntil && (
              <button onClick={() => setRepeatUntil("")}
                style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 11, cursor: "pointer" }}>クリア</button>
            )}
          </label>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>
            {repeatUntil
              ? `🔁 ${REPEATS[repeat]}で最終日まで予定をカレンダーに入れます（${repeatDates(due || todayStr(), repeat, repeatUntil).length}回）`
              : `🔁 最終日なし：完了するたびに次回分（${REPEATS[repeat]}）が自動で追加されます`}
          </div>
        </div>
      )}

      <span style={label}>⑤ 長期目標と紐付け（任意）</span>
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
  const [editing, setEditing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eDue, setEDue] = useState("");
  const [eStart, setEStart] = useState("");
  const [eGoal, setEGoal] = useState("");
  const [eRepeat, setERepeat] = useState("");

  const startEdit = () => {
    setETitle(t.title);
    setEDue(t.due || "");
    setEStart(t.startTime || "");
    setEGoal(t.goalId || "");
    setERepeat(t.repeat || "");
    setEditing(true);
  };

  const saveEdit = () => {
    if (!eTitle.trim()) return;
    update((d) => {
      const x = d.tasks.find((x) => x.id === t.id);
      if (!x) return d;
      x.title = eTitle.trim();
      x.due = eDue || (eRepeat ? todayStr() : null);
      x.startTime = eStart || null;
      x.goalId = eGoal || null;
      x.repeat = eRepeat || null;
      // 完了済みならアーカイブ側の記録も同期
      const a = d.archive?.find((y) => y.id === t.id);
      if (a) {
        const gg = d.goals.find((gg) => gg.id === x.goalId);
        a.title = x.title;
        a.due = x.due;
        a.goalTitle = gg?.title ?? null;
        a.goalType = gg?.type ?? null;
      }
      return d;
    });
    setEditing(false);
  };

  const g = data.goals.find((x) => x.id === t.goalId);
  const growth = growthOf(t.id);
  const stage = stageOf(growth);
  const overdue = t.due && !t.done && t.due < todayStr();

  // 編集モード
  if (editing) {
    return (
      <div style={{ background: C.card, border: `2px solid ${C.aqua}`, borderRadius: 14, padding: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, marginBottom: 6 }}>✎ タスクを編集</div>
        <input value={eTitle} onChange={(e) => setETitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveEdit()}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 11, color: C.sub }}>期限
            <input type="date" value={eDue} onChange={(e) => setEDue(e.target.value)}
              style={{ marginLeft: 4, padding: "7px 8px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
          </label>
          <label style={{ fontSize: 11, color: C.sub }}>開始
            <input type="time" value={eStart} onChange={(e) => setEStart(e.target.value)}
              style={{ marginLeft: 4, padding: "7px 8px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
          </label>
          {(eDue || eStart) && (
            <button onClick={() => { setEDue(""); setEStart(""); }}
              style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 11, cursor: "pointer" }}>クリア</button>
          )}
        </div>
        <select value={eRepeat} onChange={(e) => setERepeat(e.target.value)}
          style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, background: "#fff", marginBottom: 8 }}>
          <option value="">🔁 繰り返しなし</option>
          {Object.entries(REPEATS).map(([v, l]) => <option key={v} value={v}>🔁 {l}（完了すると次回分を自動追加）</option>)}
        </select>
        <select value={eGoal} onChange={(e) => setEGoal(e.target.value)}
          style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, background: "#fff", marginBottom: 10 }}>
          <option value="">目標と紐付けない</option>
          {data.goals.map((gg) => <option key={gg.id} value={gg.id}>{gg.type === "work" ? "💼" : "🎯"} {gg.title}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button onClick={() => setEditing(false)}
            style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
          <button onClick={saveEdit}
            style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: eTitle.trim() ? C.aqua : "#BFDEDE", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>保存</button>
        </div>
      </div>
    );
  }

  // タスクに紐づいたセッションの中で最新のセッションから魚を取得
  const lastSession = [...data.sessions].reverse().find((s) => s.taskId === t.id);
  const displayFish = lastSession?.fish ?? "🥚";
  const progress = t.progress || 0;

  return (
    <>
      {showProgress && <ProgressSheet task={t} update={update} onClose={() => setShowProgress(false)} />}
      <div style={{ background: C.card, border: `1px solid ${t.done ? C.line : progress >= 100 ? C.aqua : C.line}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => update((d) => applyTaskDone(d, t.id, !t.done))}
          title={t.done ? "未完了に戻す" : "完了にする"}
          style={{ width: 28, height: 28, borderRadius: 999, border: `2px solid ${t.done ? C.aqua : "#B8CDD0"}`, background: t.done ? C.aqua : "#fff", color: t.done ? "#fff" : "#C7D6D9", cursor: "pointer", fontSize: 15, fontWeight: 800, lineHeight: "24px", padding: 0, flexShrink: 0 }}>
          ✓
        </button>
        <div style={{ fontSize: 22, flexShrink: 0 }}>{displayFish}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, textDecoration: t.done ? "line-through" : "none", color: t.done ? C.sub : C.ink }}>{t.title}</div>
          <div style={{ fontSize: 11, color: overdue ? C.red : C.sub, marginTop: 2 }}>
            {g && <span style={{ color: C.deepAqua, fontWeight: 700 }}>● {g.title}　</span>}
            {stage.label}（{growth}回）
            {t.due ? (overdue ? `　期限超過 ${t.due}` : `　期限 ${t.due}`) : ""}
            {t.startTime ? `　⏰ ${t.startTime}〜` : ""}
            {t.repeat ? `　🔁${REPEATS[t.repeat]}` : ""}
          </div>
          {/* 進捗バー（着手済みで未完了のとき） */}
          {progress > 0 && !t.done && (
            <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#E4EFEF", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg,${C.aqua},${C.deepAqua})` }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: C.deepAqua }}>{progress}%</span>
            </div>
          )}
        </div>
        {!t.done && (
          <button onClick={() => setShowProgress(true)} title="進捗を入力"
            style={{ border: "none", background: "#E6F5F5", color: C.deepAqua, cursor: "pointer", fontSize: 14, borderRadius: 10, padding: "6px 8px", flexShrink: 0 }}>📊</button>
        )}
        <button onClick={startEdit} title="タスクを編集"
          style={{ border: "none", background: "none", color: C.sub, cursor: "pointer", fontSize: 14, flexShrink: 0, padding: "4px 2px" }}>✎</button>
        {onFocus && !t.done && (
          <button onClick={() => onFocus(t.id)} title="このタスクで集中する"
            style={{ border: "none", background: "#E6F5F5", color: C.deepAqua, cursor: "pointer", fontSize: 14, borderRadius: 10, padding: "6px 8px", flexShrink: 0 }}>⏱</button>
        )}
        <button onClick={() => { if (window.confirm(`「${t.title}」を削除しますか？`)) update((d) => { d.tasks = d.tasks.filter((x) => x.id !== t.id); return d; }); }}
          style={{ border: "none", background: "none", color: C.sub, cursor: "pointer", fontSize: 16 }}>×</button>
      </div>
    </>
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
