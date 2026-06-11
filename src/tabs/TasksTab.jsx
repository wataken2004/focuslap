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
