import { useState, useEffect, useMemo } from "react";
import { C, fmt, todayStr, addDays, uid, TaskRow, TaskForm } from "../shared.jsx";
import { loadGroupData } from "../storage.js";

// グループ表示のメンバー色（uid順で割り当て）
const MEMBER_COLORS = ["#0E7C7B", "#3A6EA5", "#B4762F", "#7B5EA7", "#C05B7A", "#4A8A58", "#5B7283"];

export function CalendarTab({ data, update, growthOf, onFocus, myUid }) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayStr());
  const [showForm, setShowForm] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [evTitle, setEvTitle] = useState("");
  const [evTime, setEvTime] = useState("");
  const [evAllday, setEvAllday] = useState(false);
  const [viewGroup, setViewGroup] = useState(null); // null=自分のカレンダー / グループid
  const [grp, setGrp] = useState({ loading: false, error: false, name: "", calendars: [] });
  const inGroup = !!viewGroup;
  const groups = data.groups || [];

  // 選択中グループのメンバー全員のカレンダーを読み込む
  useEffect(() => {
    if (!viewGroup) { setGrp({ loading: false, error: false, name: "", calendars: [] }); return; }
    let alive = true;
    setGrp({ loading: true, error: false, name: "", calendars: [] });
    loadGroupData(viewGroup)
      .then((d) => {
        if (!alive) return;
        if (!d) { setGrp({ loading: false, error: true, name: "", calendars: [] }); return; }
        const cals = [...d.calendars].sort((a, b) => a.uid.localeCompare(b.uid))
          .map((c, i) => ({ ...c, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }));
        setGrp({ loading: false, error: false, name: d.group?.name || "", calendars: cals });
      })
      .catch(() => { if (alive) setGrp({ loading: false, error: true, name: "", calendars: [] }); });
    return () => { alive = false; };
  }, [viewGroup]);

  // タスク（やること）と予定（時間の約束）を分けて扱う
  const tasksOn = (key) => data.tasks.filter((t) => t.due === key && t.kind !== "event");
  const eventsOn = (key) =>
    data.tasks
      .filter((t) => t.due === key && t.kind === "event")
      .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

  // グループ表示：全メンバーの項目をその日ぶん集約（色・名前つき）
  const groupItemsOn = (key) => {
    const out = [];
    grp.calendars.forEach((c) => (c.items || []).forEach((it) => {
      if (it.due === key) out.push({ ...it, member: c.name || "メンバー", color: c.color, isMe: c.uid === myUid });
    }));
    return out.sort((a, b) => (a.kind === "event" ? 0 : 1) - (b.kind === "event" ? 0 : 1) || (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  };

  const addEvent = () => {
    if (!evTitle.trim()) return;
    const st = evAllday ? null : (evTime || null);
    update((d) => {
      d.tasks.unshift({ id: uid(), title: evTitle.trim(), kind: "event", goalId: null, due: selected, startTime: st, done: false });
      return d;
    });
    setEvTitle("");
    if (st && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  };

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
    const isToday = key === todayStr();
    const isSel = key === selected;
    const inMonth = d.getMonth() === cursor.getMonth();
    const cellStyle = {
      flex: compact ? 1 : "none", minHeight: compact ? 56 : 52, padding: "4px 2px", borderRadius: 10, cursor: "pointer",
      border: isSel ? `2px solid ${C.deepAqua}` : `1px solid ${isToday ? C.aqua : "transparent"}`,
      background: isSel ? "#E6F5F5" : "transparent",
      color: inMonth || compact ? (d.getDay() === 0 ? C.red : d.getDay() === 6 ? "#3A6EA5" : C.ink) : "#B8C9D2",
    };
    return (
      <button key={key} onClick={() => { setSelected(key); if (view === "day") setCursor(d); }} style={cellStyle}>
        <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 600 }}>{d.getDate()}</div>
        {inGroup ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 2, minHeight: 12, alignItems: "center" }}>
            {[...new Set(groupItemsOn(key).map((i) => i.color))].slice(0, 3).map((c, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: c }} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 10, lineHeight: 1.1, minHeight: 12, color: C.deepAqua }}>
            <span style={{ color: "#2E6FA8" }}>{"○".repeat(Math.min(eventsOn(key).length, 2))}</span>
            {tasksOn(key).slice(0, 3 - Math.min(eventsOn(key).length, 2)).map((t) => (t.done ? "✓" : "●")).join("")}
            {tasksOn(key).length + eventsOn(key).length > 3 && "…"}
          </div>
        )}
      </button>
    );
  };

  const selTasks = tasksOn(selected);
  const selDone = selTasks.filter((t) => t.done).length;

  // 割り振り候補：未完了かつこの日以外。同名タスクは1つにまとめて重複表示を防ぐ
  const assignableTasks = useMemo(() => {
    const seen = new Set();
    return data.tasks.filter((t) => {
      if (t.done || t.kind === "event" || t.due === selected || seen.has(t.title)) return false;
      seen.add(t.title);
      return true;
    });
  }, [data.tasks, selected]);

  return (
    <div>
      {/* 表示切替：自分／参加中グループ（グループがあるときだけ表示） */}
      {groups.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
          <button onClick={() => setViewGroup(null)}
            style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${!inGroup ? C.deepAqua : C.line}`, background: !inGroup ? C.deepAqua : C.card, color: !inGroup ? "#fff" : C.sub, fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
            🐟 自分
          </button>
          {groups.map((g) => (
            <button key={g.id} onClick={() => setViewGroup(g.id)}
              style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${viewGroup === g.id ? C.deepAqua : C.line}`, background: viewGroup === g.id ? C.deepAqua : C.card, color: viewGroup === g.id ? "#fff" : C.sub, fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
              👥 {g.name}
            </button>
          ))}
        </div>
      )}

      {/* グループ表示中：メンバー凡例／読み込み状態 */}
      {inGroup && (
        <div style={{ marginBottom: 10 }}>
          {grp.loading && <div style={{ fontSize: 12, color: C.sub, padding: "4px 2px" }}>読み込み中…</div>}
          {grp.error && <div style={{ fontSize: 12, color: C.red, padding: "4px 2px" }}>グループを読み込めませんでした。メンバーか確認してください。</div>}
          {!grp.loading && !grp.error && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {grp.calendars.map((c) => (
                <span key={c.uid} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.7)", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: C.ink }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: c.color }} />
                  {c.uid === myUid ? "自分" : (c.name || "メンバー")}
                </span>
              ))}
              {grp.calendars.length === 0 && <span style={{ fontSize: 11, color: C.sub }}>まだ誰も予定を追加していません。</span>}
            </div>
          )}
        </div>
      )}

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
      <div className="wcard" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 10, marginBottom: 14 }}>
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
            {inGroup
              ? (groupItemsOn(selected).length === 0 ? "この日の予定はありません" : `みんなの予定 ${groupItemsOn(selected).length}件`)
              : (selTasks.length === 0 ? "この日のタスクはありません" : `タスク ${selDone}/${selTasks.length} 完了`)}
          </div>
        )}
      </div>

      {/* グループ表示中：選択日の みんなの予定（閲覧のみ） */}
      {inGroup && !grp.loading && !grp.error && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{selected.slice(5).replace("-", "/")} のみんなの予定</div>
          {groupItemsOn(selected).length === 0 && (
            <div className="wcard" style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, padding: 18, textAlign: "center", color: C.sub, fontSize: 13 }}>この日の予定はありません</div>
          )}
          {groupItemsOn(selected).map((it, i) => (
            <div key={i} className="wcard" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 6, background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, borderLeft: `4px solid ${it.color}` }}>
              {it.kind === "event" ? (
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: it.startTime ? C.deepAqua : "#9AB4BC", borderRadius: 6, padding: "3px 7px", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{it.startTime || "終日"}</span>
              ) : (
                <span style={{ fontSize: 13, flexShrink: 0 }}>{it.done ? "✅" : "☐"}</span>
              )}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: it.done ? "line-through" : "none", color: it.done ? C.sub : C.ink }}>{it.title}</span>
              {it.kind !== "event" && it.startTime && <span style={{ fontSize: 10, color: C.sub, flexShrink: 0 }}>⏰{it.startTime}</span>}
              <span style={{ fontSize: 10, fontWeight: 800, color: it.color, flexShrink: 0 }}>{it.isMe ? "自分" : it.member}</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== 自分のカレンダー（編集可）。グループ表示中は隠す ===== */}
      {!inGroup && (
      <>
      {/* この日の予定（時間の約束。開始5分前に通知） */}
      <div className="wcard" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.ink, marginBottom: 8 }}>
          🕐 {selected.slice(5).replace("-", "/")} の予定
          <span style={{ fontSize: 10, fontWeight: 600, color: C.sub, marginLeft: 6 }}>授業・バイト・約束など（開始5分前に通知）</span>
        </div>

        {eventsOn(selected).map((ev) => (
          <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 10, background: "#F0FAFA", border: `1px solid ${C.line}`, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: ev.startTime ? C.deepAqua : "#9AB4BC", borderRadius: 6, padding: "3px 7px", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {ev.startTime || "終日"}
            </span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
            <button
              onClick={() => { if (window.confirm(`予定「${ev.title}」を削除しますか？`)) update((d) => { d.tasks = d.tasks.filter((x) => x.id !== ev.id); return d; }); }}
              style={{ border: "none", background: "none", color: C.sub, cursor: "pointer", fontSize: 15, flexShrink: 0, padding: "2px 4px" }}>×</button>
          </div>
        ))}

        <div style={{ display: "flex", gap: 6, marginTop: eventsOn(selected).length ? 2 : 0 }}>
          <button onClick={() => setEvAllday((a) => !a)}
            style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${evAllday ? C.deepAqua : C.line}`, background: evAllday ? C.deepAqua : "#fff", color: evAllday ? "#fff" : C.sub, fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>終日</button>
          {!evAllday && (
            <input type="time" value={evTime} onChange={(e) => setEvTime(e.target.value)}
              style={{ width: 88, padding: "8px 6px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, flexShrink: 0 }} />
          )}
          <input value={evTitle} onChange={(e) => setEvTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEvent()}
            placeholder="予定を追加（例：3限 経済学、バイト）"
            style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
          <button onClick={addEvent}
            style={{ padding: "8px 13px", borderRadius: 10, border: "none", background: evTitle.trim() ? C.aqua : "#BFDEDE", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>＋</button>
        </div>
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

      {/* 既存タスクをこの日に割り振る（移動 or 別日にコピー。同名は1つにまとめて表示） */}
      <div className="wcard" style={{ background: C.card, border: `1px solid ${assignId ? C.aqua : C.line}`, borderRadius: 12, padding: 10, marginBottom: 12 }}>
        <select value={assignId} onChange={(e) => setAssignId(e.target.value)}
          style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", fontSize: 12, color: assignId ? C.ink : C.sub }}>
          <option value="">📌 既存タスクをこの日（{selected.slice(5).replace("-", "/")}）に割り振る…</option>
          {assignableTasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}{t.due ? `（現在: ${t.due}）` : "（期限なし）"}</option>
          ))}
        </select>

        {assignId && (
          <>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button
                onClick={() => {
                  // 移動：この日へ動かすだけ（増えない）
                  update((d) => { const x = d.tasks.find((x) => x.id === assignId); if (x) x.due = selected; return d; });
                  setAssignId("");
                }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${C.deepAqua}`, background: "#fff", color: C.deepAqua, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                この日へ移動
              </button>
              <button
                onClick={() => {
                  // コピー：元はそのまま、この日にも同じタスクを追加
                  update((d) => {
                    const x = d.tasks.find((x) => x.id === assignId);
                    if (x) d.tasks.unshift({ id: uid(), title: x.title, goalId: x.goalId, due: selected, startTime: null, note: x.note, done: false });
                    return d;
                  });
                  setAssignId("");
                }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                ＋ この日にコピー
              </button>
            </div>
            <div style={{ fontSize: 10, color: C.sub, marginTop: 6 }}>
              移動＝予定をこの日へ動かす ／ コピー＝元の日は残してこの日にも置く。開始時刻は割り振り後に✎編集で設定できます
            </div>
          </>
        )}
      </div>

      {selTasks.length === 0 && !showForm && (
        <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "24px 0" }}>この日のタスクはまだありません。</div>
      )}

      {selTasks.map((t) => (
        <TaskRow key={t.id} t={t} data={data} update={update} growthOf={growthOf} onFocus={onFocus} />
      ))}
      </>
      )}
    </div>
  );
}

const navBtn = {
  padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.line}`,
  background: C.card, color: C.deepAqua, fontWeight: 800, cursor: "pointer",
};
