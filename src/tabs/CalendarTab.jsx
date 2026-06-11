import { useState, useEffect, useMemo } from "react";
import { C, fmt, todayStr, addDays, TaskRow, TaskForm } from "../shared.jsx";
import { listCalendarEvents, createCalendarEvent } from "../googleCalendar.js";

export function CalendarTab({ data, update, growthOf, onFocus, googleAccessToken }) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayStr());
  const [showForm, setShowForm] = useState(false);
  const [gcalEvents, setGcalEvents] = useState([]);
  const [gcalSync, setGcalSync] = useState(false);
  const [gcalError, setGcalError] = useState("");

  const tasksOn = (key) => data.tasks.filter((t) => t.due === key);

  // Googleカレンダー取得
  useEffect(() => {
    if (!gcalSync || !googleAccessToken) return;
    setGcalError("");
    const from = fmt(addDays(cursor, -31));
    const to = fmt(addDays(cursor, 31));
    listCalendarEvents(googleAccessToken, from, to)
      .then(setGcalEvents)
      .catch((e) => {
        setGcalError("カレンダーの取得に失敗しました。再ログインをお試しください。");
        setGcalSync(false);
      });
  }, [gcalSync, googleAccessToken, cursor]);

  const gcalOn = (key) => gcalEvents.filter((e) => e.date === key);

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
    const gc = gcalOn(key);
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
        <div style={{ fontSize: 10, lineHeight: 1.1, minHeight: 12 }}>
          {ts.slice(0, 2).map((t) => t.done ? "✓" : "●").join("")}
          {gc.length > 0 && <span style={{ color: "#4285F4" }}>📅</span>}
          {ts.length > 2 && "…"}
        </div>
      </button>
    );
  };

  const selTasks = tasksOn(selected);
  const selGcal = gcalOn(selected);
  const selDone = selTasks.filter((t) => t.done).length;

  const pushToGcal = async (task) => {
    if (!googleAccessToken) return;
    try {
      await createCalendarEvent(googleAccessToken, { title: task.title, date: task.due || selected });
      alert("Googleカレンダーに追加しました！");
    } catch {
      alert("Googleカレンダーへの追加に失敗しました。");
    }
  };

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

      {/* Googleカレンダー同期トグル */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 14px", background: C.card, borderRadius: 12, border: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, flex: 1 }}>📅 Googleカレンダーと同期</span>
        {googleAccessToken ? (
          <button onClick={() => setGcalSync((s) => !s)}
            style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: gcalSync ? C.deepAqua : C.line, color: gcalSync ? "#fff" : C.sub, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {gcalSync ? "ON" : "OFF"}
          </button>
        ) : (
          <span style={{ fontSize: 11, color: C.sub }}>Googleログインが必要です</span>
        )}
      </div>
      {gcalError && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{gcalError}</div>}

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
            {selTasks.length === 0 && selGcal.length === 0 ? "この日の予定はありません" : `タスク ${selDone}/${selTasks.length} 完了`}
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

      {/* Googleカレンダーのイベント */}
      {selGcal.map((ev) => (
        <div key={ev.id} style={{ background: "#EEF3FF", border: "1px solid #C5D3F0", borderRadius: 14, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#2A4080" }}>{ev.title}</div>
          <span style={{ fontSize: 10, color: "#4285F4" }}>Googleカレンダー</span>
        </div>
      ))}

      {selTasks.length === 0 && selGcal.length === 0 && !showForm && (
        <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "24px 0" }}>この日の予定はまだありません。</div>
      )}

      {selTasks.map((t) => (
        <div key={t.id}>
          <TaskRow t={t} data={data} update={update} growthOf={growthOf} onFocus={onFocus} />
          {googleAccessToken && gcalSync && t.due && (
            <div style={{ textAlign: "right", marginTop: -4, marginBottom: 6 }}>
              <button onClick={() => pushToGcal(t)}
                style={{ fontSize: 11, color: "#4285F4", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Googleカレンダーにも追加
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const navBtn = {
  padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.line}`,
  background: C.card, color: C.deepAqua, fontWeight: 800, cursor: "pointer",
};
