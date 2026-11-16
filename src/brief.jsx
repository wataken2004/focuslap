/* その日最初に開いたときの「今日やること」シート
   - 今日の予定（時刻順）・今日やるタスク（期限超過含む、同名はまとめて1行）
   - 昨日の集中時間・自動で片付けた毎日タスクのお知らせ
   - タスクをタップするとそのタスクで集中タブへ */
import { C, todayStr, fmt, addDays } from "./shared.jsx";
import { G } from "./glyphs.jsx";
import { Sheet, groupTasksByTitle, nearestOpen, dueLabel } from "./taskGroups.jsx";

const WD = "日月火水木金土";

// 同じタイトルを「英会話 ×3」のようにまとめる
export const countTitles = (titles) => {
  const m = new Map();
  titles.forEach((t) => m.set(t, (m.get(t) || 0) + 1));
  return [...m].map(([t, n]) => (n > 1 ? `${t} ×${n}` : t));
};

// 見せる中身があるか（今日の予定・今日以前の未完了タスク）
export const briefHasContent = (data, today) =>
  data.tasks.some((t) => (t.kind === "event" ? t.due === today : !t.done && t.due && t.due <= today));

export function TodayBrief({ data, skipped, onClose, onFocus }) {
  const today = todayStr();
  const now = new Date();
  const yesterday = fmt(addDays(now, -1));
  const hour = now.getHours();
  const hello = hour < 5 ? "夜ふかしおつかれさま" : hour < 11 ? "おはようございます" : hour < 17 ? "こんにちは" : "こんばんは";

  const events = data.tasks
    .filter((t) => t.kind === "event" && t.due === today)
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  const open = data.tasks.filter((t) => !t.done && t.kind !== "event" && t.due && t.due <= today);
  const groups = groupTasksByTitle(open, data.tasks)
    .map((g) => ({ g, t: nearestOpen(g.items, today) }))
    // 時刻のあるものを先に時刻順、その後は期限超過→今日
    .sort((a, b) => {
      const x = a.t.startTime || "99:99", y = b.t.startTime || "99:99";
      return x !== y ? x.localeCompare(y) : a.t.due.localeCompare(b.t.due);
    });
  const yMin = data.sessions.filter((s) => s.date === yesterday).reduce((a, s) => a + s.minutes, 0);
  const removed = skipped?.removed?.length ? countTitles(skipped.removed) : [];
  const moved = skipped?.moved?.length ? countTitles(skipped.moved) : [];

  const label = { fontSize: 11, fontWeight: 800, color: C.sub, margin: "14px 0 6px", display: "flex", alignItems: "center", gap: 5 };

  return (
    <Sheet onClose={onClose} z={999}>
      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>
        {now.getMonth() + 1}月{now.getDate()}日({WD[now.getDay()]})
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: C.ink, margin: "2px 0 4px" }}>{hello}</div>
      <div style={{ fontSize: 12, color: C.sub }}>
        {yMin > 0 ? <>昨日は <span className="num" style={{ color: C.deepAqua, fontSize: 14 }}>{yMin}</span> 分集中しました。</> : null}
        今日は予定{events.length}件・タスク{groups.length}件です
      </div>

      {(removed.length > 0 || moved.length > 0) && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#F4FAFA", border: `1px solid ${C.line}`, borderRadius: 12, fontSize: 12, color: C.ink, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, color: C.deepAqua, marginBottom: 2 }}><G n="repeat" size={13} /> やらなかった毎日タスクを整理しました</div>
          {removed.length > 0 && <div>片付けた回：{removed.join("、")}</div>}
          {moved.length > 0 && <div>今日に繰り越し：{moved.join("、")}</div>}
          <div style={{ fontSize: 11, color: C.sub }}>設定でOFFにできます</div>
        </div>
      )}

      {events.length > 0 && (
        <>
          <div style={label}><G n="clock" size={13} style={{ color: C.aqua }} /> 予定</div>
          {events.map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 4px", borderBottom: `1px dashed ${C.line}` }}>
              <span className="num" style={{ width: 46, fontSize: 13, color: C.deepAqua, flexShrink: 0 }}>{e.startTime || "終日"}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{e.title}</span>
            </div>
          ))}
        </>
      )}

      <div style={label}><G n="alarm" size={13} style={{ color: C.aqua }} /> 今日やるタスク</div>
      {groups.length === 0 && (
        <div style={{ fontSize: 13, color: C.sub, padding: "6px 4px" }}>期限が今日のタスクはありません。タスクタブから追加できます</div>
      )}
      {groups.map(({ g, t }) => {
        const overdue = t.due < today;
        const extra = g.items.length - 1;
        return (
          <button key={g.key} onClick={() => onFocus(t.id)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", marginBottom: 4, borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", textAlign: "left" }}>
            <span className="num" style={{ width: 42, fontSize: 12, color: t.startTime ? C.deepAqua : "#B8CDD0", flexShrink: 0 }}>{t.startTime || "--:--"}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <span style={{ display: "block", fontSize: 11, color: overdue ? C.red : C.sub }}>
                {overdue ? dueLabel(t.due, today) : "今日"}
                {extra > 0 && `　ほか期限超過${extra}件`}
                {t.progress > 0 && <span style={{ color: C.deepAqua, fontWeight: 800 }}>　{t.progress}%</span>}
              </span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 800, color: C.deepAqua, background: "#E6F5F5", borderRadius: 999, padding: "5px 9px", flexShrink: 0 }}>
              <G n="timer" size={13} /> 集中
            </span>
          </button>
        );
      })}

      <button onClick={onClose}
        style={{ width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 12, border: "none", background: C.deepAqua, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
        今日もはじめよう
      </button>
    </Sheet>
  );
}
