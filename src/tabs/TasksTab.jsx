import { C, TaskForm, TaskRow } from "../shared.jsx";
import { useState } from "react";

export function TasksTab({ data, update, growthOf, onFocus }) {
  const [filter, setFilter] = useState("open");
  const shown = data.tasks.filter((t) =>
    filter === "open" ? !t.done : filter === "done" ? t.done : true
  );

  return (
    <div>
      <TaskForm data={data} update={update} />

      {/* 1時間ごとの未完了リマインド */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "10px 14px", background: C.card, borderRadius: 12, border: `1px solid ${data.settings.hourlyReminder ? C.aqua : C.line}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>🔔 忘れ防止リマインド</div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>未完了タスクがある間、1時間ごとに通知します</div>
        </div>
        <button
          onClick={() => {
            if (!data.settings.hourlyReminder && "Notification" in window && Notification.permission === "default") {
              Notification.requestPermission().catch(() => {});
            }
            update((d) => { d.settings.hourlyReminder = !d.settings.hourlyReminder; return d; });
          }}
          style={{ padding: "7px 14px", borderRadius: 999, border: "none", background: data.settings.hourlyReminder ? C.deepAqua : C.line, color: data.settings.hourlyReminder ? "#fff" : C.sub, fontWeight: 800, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
          {data.settings.hourlyReminder ? "ON" : "OFF"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "14px 0 12px" }}>
        {[["open", "未完了"], ["done", "完了"], ["all", "すべて"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${filter === k ? C.deepAqua : C.line}`, background: filter === k ? C.deepAqua : C.card, color: filter === k ? "#fff" : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {l}
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "30px 0" }}>
          タスクがありません。上のフォームから追加できます。
        </div>
      )}
      {shown.map((t) => (
        <TaskRow key={t.id} t={t} data={data} update={update} growthOf={growthOf} onFocus={onFocus} />
      ))}
    </div>
  );
}
