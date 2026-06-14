import { useState } from "react";
import { C, uid, todayStr, TaskRow, TaskForm, FISHES } from "../shared.jsx";

// 目標に紐づくセッションの集計
function goalStats(goalId, tasks, sessions) {
  const taskIds = tasks.filter((t) => t.goalId === goalId).map((t) => t.id);
  const linked = sessions.filter((s) => taskIds.includes(s.taskId));
  const totalMin = linked.reduce((a, s) => a + s.minutes, 0);
  const fishCounts = linked.reduce((acc, s) => {
    if (s.fish) acc[s.fish] = (acc[s.fish] || 0) + 1;
    return acc;
  }, {});
  return { totalMin, fishCounts, sessionCount: linked.length };
}

export function GoalsTab({ data, update, growthOf, onFocus }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("goal");
  const [openId, setOpenId] = useState(null);
  const [addingFor, setAddingFor] = useState(null); // タスク追加フォームを開いている目標id

  const add = () => {
    if (!title.trim()) return;
    if (type === "goal" && !date) return;
    update((d) => { d.goals.push({ id: uid(), title: title.trim(), date: date || null, type }); return d; });
    setTitle(""); setDate("");
  };

  const daysLeft = (d) => Math.ceil((new Date(d) - new Date(todayStr())) / 86400000);
  const badge = (t) =>
    t === "goal"
      ? { label: "🎯 目標", bg: "#E6F5F5", fg: C.deepAqua }
      : { label: "💼 仕事", bg: "#FFF3D6", fg: "#9A6B12" };

  return (
    <div>
      {/* 追加フォーム */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[["goal", "🎯 目標"], ["work", "💼 仕事・プロジェクト"]].map(([k, l]) => (
            <button key={k} onClick={() => setType(k)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 12, border: `1px solid ${type === k ? C.deepAqua : C.line}`, background: type === k ? C.deepAqua : "#fff", color: type === k ? "#fff" : C.sub, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={type === "goal" ? "目標（例：英検2級）" : "仕事内容（例：アルバイト、部活）"}
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1, fontSize: 12, color: C.sub, display: "flex", alignItems: "center", gap: 8 }}>
            {type === "goal" ? "目標日" : "期日（任意）"}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
          </label>
          <button onClick={add}
            style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: title.trim() && (type === "work" || date) ? C.aqua : "#BFDEDE", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
            追加
          </button>
        </div>
      </div>

      {data.goals.map((g) => {
        const linked = data.tasks.filter((t) => t.goalId === g.id);
        const done = linked.filter((t) => t.done).length;
        const pct = linked.length ? Math.round((done / linked.length) * 100) : 0;
        const dl = g.date ? daysLeft(g.date) : null;
        const open = openId === g.id;
        const b = badge(g.type);
        const { totalMin, fishCounts, sessionCount } = goalStats(g.id, data.tasks, data.sessions);
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        return (
          <div key={g.id} style={{ background: C.card, border: `1px solid ${open ? C.aqua : C.line}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: b.fg, background: b.bg, padding: "4px 10px", borderRadius: 999, flexShrink: 0 }}>{b.label}</span>
              <div style={{ fontSize: 16, fontWeight: 800, flex: 1, minWidth: 0 }}>{g.title}</div>
              <button onClick={() => { if (window.confirm(`「${g.title}」を削除しますか？\n（紐づいたタスクは残ります）`)) update((d) => { d.goals = d.goals.filter((x) => x.id !== g.id); d.tasks.forEach((t) => { if (t.goalId === g.id) t.goalId = null; }); return d; }); }}
                style={{ border: "none", background: "none", color: C.sub, cursor: "pointer" }}>×</button>
            </div>

            {g.date && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "8px 0 10px" }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: dl <= 30 ? C.red : C.deepAqua, fontVariantNumeric: "tabular-nums" }}>{dl >= 0 ? dl : 0}</span>
                <span style={{ fontSize: 12, color: C.sub }}>日後（{g.date}）{dl < 0 && " — 期日を過ぎています"}</span>
              </div>
            )}

            <div style={{ height: 10, borderRadius: 5, background: "#E4EFEF", overflow: "hidden", marginTop: g.date ? 0 : 10 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.aqua}, ${C.deepAqua})`, transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>タスク {done}/{linked.length} 完了（{pct}%）</div>

            {/* 集中時間・魚カウント */}
            {sessionCount > 0 && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "#F0FAFA", border: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.deepAqua, fontVariantNumeric: "tabular-nums" }}>
                      {hours > 0 ? `${hours}時間` : ""}{mins > 0 ? `${mins}分` : hours === 0 ? `${totalMin}分` : ""}
                    </span>
                    <span style={{ fontSize: 11, color: C.sub, marginLeft: 6 }}>/ {sessionCount}セッション</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {FISHES.filter((f) => fishCounts[f.e]).map((f) => (
                    <div key={f.e} style={{ display: "flex", alignItems: "center", gap: 3, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: "3px 8px" }}>
                      <span style={{ fontSize: 16 }}>{f.e}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.deepAqua }}>×{fishCounts[f.e]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { setOpenId(open ? null : g.id); setAddingFor(null); }}
              style={{ width: "100%", marginTop: 10, padding: "9px 0", borderRadius: 10, border: `1px dashed ${C.line}`, background: open ? "#F0FAFA" : "#fff", color: C.deepAqua, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
              {open ? "タスクを閉じる ▲" : `タスクを見る・追加する ▼（${linked.length}件）`}
            </button>

            {open && (
              <div style={{ marginTop: 10 }}>
                {linked.length === 0 && (
                  <div style={{ fontSize: 12, color: C.sub, textAlign: "center", padding: "8px 0" }}>まだタスクがありません。</div>
                )}
                {linked.map((t) => <TaskRow key={t.id} t={t} data={data} update={update} growthOf={growthOf} onFocus={onFocus} />)}

                {addingFor === g.id ? (
                  <div style={{ marginTop: 8 }}>
                    <TaskForm data={data} update={update} defaultGoalId={g.id} hideGoal onAdded={() => setAddingFor(null)} />
                    <button onClick={() => setAddingFor(null)}
                      style={{ width: "100%", marginTop: 6, padding: "8px 0", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingFor(g.id)}
                    style={{ width: "100%", marginTop: 8, padding: "10px 0", borderRadius: 10, border: "none", background: C.aqua, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                    ＋ この目標にタスクを追加（時間・繰り返しも設定）
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
