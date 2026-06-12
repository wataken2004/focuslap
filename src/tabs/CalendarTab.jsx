import { useState, useMemo } from "react";
import { C, fmt, todayStr, addDays, TaskRow, TaskForm } from "../shared.jsx";

export function CalendarTab({ data, update, growthOf, onFocus }) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayStr());
  const [showForm, setShowForm] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [assignTime, setAssignTime] = useState("");

  const tasksOn = (key) => data.tasks.filter((t) => t.due === key);

  const move = (n) => {
    const c = new Date(cursor);
    if (view === "month") c.setMonth(c.getMonth() + n);
    else if (view === "week") c.setDate(c.getDate() + n * 7);
    else { c.setDate(c.getDate() + n); setSelected(fmt(c)); }
    setCursor(c);
  };

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return [...Array(42)].map((_, i) => addDays(start, i));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = addDays(cursor, -cursor.getDay());
    return [...Array(7)].map((_, i) => addDays(start, i));
  }, [cursor]);

  const headerLabel =
    view === "month" ? `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月` :
    view === "week"  ? `${fmt(weekDays[0]).slice(5).replace("-", "/")} 〜 ${fmt(weekDays[6]).slice(5).replace("-", "/")}` :
    `${cursor.getFullYear()}年${cursor.getMonth() + 1}月${cursor.getDate()}日`;

  const dayCell = (d, compact) => {
    const key = fmt(d);
    const ts = tasksOn(key);
    const isToday = key === todayStr();
    const isSel = key === selected;
    const inMonth = d.getMonth() === cursor.getMonth();
    return (
      <button key={key} onClick={() => { setSelected(key); if (view === "day") setCursor(d); }}
        style={{
          flex: compact ? 1 : "none", minHeight: compact ? 56 : 52, padding: "4px 2px", borderRadius: 10, cursor: "pointer",
          border: isSel ? `2px solid ${C.deepAqua}` : `1px solid ${isToday ? C.aqua : "transparent"}`,
          background: isSel ? "#E6F5F5" : "transparent",
          color: inMonth || compact ? (d.getDay() === 0 ? C.red : d.getDay() === 6 ? "#3A6EA5" : C.ink) : "#B8C9D2",
        }}>
        <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 600 }}>{d.getDate()}</div>
        <div style={{ fontSize: 10, lineHeight: 1.1, minHeight: 12, color: C.deepAqua }}>
          {ts.slice(0, 3).map((t) => (t.done ? "✓" : "●")).join("")}
          {ts.length > 3 && "…"}
        </div>
      </button>
    );
  };

  const selTasks = tasksOn(selected);
  const selDone = selTasks.filter((t) => t.done).length;

  return (
    <div>
      {/* ビュー切替 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["month", "月"], ["week", "週"], ["day", "日"]].map(([k, l]) => (
          <button key={k} onClick={() => { setView(k); if (k === "day") setCursor(new Date(selected)); }}
            style={{ flex: 1, padding: "9px 0", borderRadius: 12, border: `1px solid ${view === k ? C.deepAqua : C.line}`, background: view === k ? C.deepAqua : C.card, color: view === k ? "#fff" : C.sub, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ナビ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => move(-1)} style={navBtn}>◀</button>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{headerLabel}</div>
        <button onClick={() => move(1)} style={navBtn}>▶</button>
      </div>

      {/* グリッド */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 10, marginBottom: 14 }}>
        {view !== "day" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", marginBottom: 4 }}>
            {"日月火水木金土".split("").map((w, i) => (
              <div key={w} style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? C.red : i === 6 ? "#3A6EA5" : C.sub }}>{w}</div>
            ))}
          </div>
        )}
        {view === "month" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", gap: 2 }}>
            {monthDays.map((d) => dayCell(d, false))}
          </div>
        )}
        {view === "week" && (
          <div style={{ display: "flex", gap: 2, textAlign: "center" }}>
            {weekDays.map((d) => dayCell(d, true))}
          </div>
        )}
        {view === "day" && (
          <div style={{ textAlign: "center", padding: "8px 0", fontSize: 13, color: C.sub }}>
            {selTasks.length === 0 ? "この日のタスクはありません" : `タスク ${selDone}/${selTasks.length} 完了`}
          </div>
        )}
      </div>

      {/* 選択日のタスク */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>
          {selected.slice(5).replace("-", "/")} のタスク
          <span style={{ color: C.sub, fontWeight: 600 }}>（{selDone}/{selTasks.length}）</span>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: showForm ? C.sub : C.aqua, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
          {showForm ? "閉じる" : "＋ この日に追加"}
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 12 }}>
          <TaskForm data={data} update={update} defaultDue={selected} onAdded={() => setShowForm(false)} />
        </div>
      )}

      {/* 既存タスクをこの日に割り振る（開始時刻も設定可能） */}
      <div style={{ background: C.card, border: `1px solid ${assignId ? C.aqua : C.line}`, borderRadius: 12, padding: 10, marginBottom: 12 }}>
        <select value={assignId}
          onChange={(e) => {
            const id = e.target.value;
            setAssignId(id);
            const t = data.tasks.find((x) => x.id === id);
            setAssignTime(t?.startTime || "");
          }}
          style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", fontSize: 12, color: assignId ? C.ink : C.sub }}>
          <option value="">📌 既存タスクをこの日（{selected.slice(5).replace("-", "/")}）に割り振る…</option>
          {data.tasks.filter((t) => !t.done && t.due !== selected).map((t) => (
            <option key={t.id} value={t.id}>{t.title}{t.due ? `（現在: ${t.due}）` : "（期限なし）"}</option>
          ))}
        </select>

        {assignId && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 11, color: C.sub }}>
              開始時刻（任意・5分前に通知）
              <input type="time" value={assignTime}
                onChange={(e) => {
                  setAssignTime(e.target.value);
                  if (e.target.value && "Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission().catch(() => {});
                  }
                }}
                style={{ marginLeft: 6, padding: "7px 8px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
            </label>
            {assignTime && (
              <button onClick={() => setAssignTime("")}
                style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 11, cursor: "pointer" }}>クリア</button>
            )}
            <button
              onClick={() => {
                update((d) => {
                  const x = d.tasks.find((x) => x.id === assignId);
                  if (x) { x.due = selected; x.startTime = assignTime || null; }
                  return d;
                });
                setAssignId("");
                setAssignTime("");
              }}
              style={{ marginLeft: "auto", padding: "9px 16px", borderRadius: 10, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
              この日に割り振る
            </button>
          </div>
        )}
      </div>

      {selTasks.length === 0 && !showForm && (
        <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "24px 0" }}>この日のタスクはまだありません。</div>
      )}

      {selTasks.map((t) => (
        <TaskRow key={t.id} t={t} data={data} update={update} growthOf={growthOf} onFocus={onFocus} />
      ))}
    </div>
  );
}

const navBtn = {
  padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.line}`,
  background: C.card, color: C.deepAqua, fontWeight: 800, cursor: "pointer",
};
