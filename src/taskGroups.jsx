/* 同名タスクのまとめ表示・まとめて削除・タスク選択シート
   - groupTasksByTitle: 同じタイトルのタスク（毎日の繰り返し等）を1グループに束ねる
   - SeriesSheet: グループのタスクを「全部／未完了だけ／期間／日付を選んで」まとめて削除
   - TaskGroup: タスク一覧で使う折りたたみグループ（開くと各日のTaskRowが並ぶ）
   - TaskPickerSheet: 集中タブのタスク選択画面（今日やる／目標別／その他／今日完了） */
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { C, REPEATS, TaskRow, applyTaskDone, todayStr, fmt, addDays } from "./shared.jsx";
import { G } from "./glyphs.jsx";

/* ================= ロジック（shared.test と同じく単体テスト対象） ================= */

// タイトルの比較キー（前後空白・連続空白・大文字小文字の違いは同一扱い）
export const titleKey = (t) => (t?.title || "").trim().replace(/\s+/g, " ").toLowerCase();

// 期限順（期限なしは最後）
const byDue = (a, b) => {
  const x = a.due || "9999-99-99", y = b.due || "9999-99-99";
  return x < y ? -1 : x > y ? 1 : 0;
};

// 同名タスクを束ねる。グループの並び順は元配列で最初に出てきた順、グループ内は期限順
export function groupTasksByTitle(tasks) {
  const map = new Map();
  const out = [];
  tasks.forEach((t) => {
    const k = titleKey(t);
    let g = map.get(k);
    if (!g) { g = { key: k, title: t.title, items: [] }; map.set(k, g); out.push(g); }
    g.items.push(t);
  });
  out.forEach((g) => g.items.sort(byDue));
  return out;
}

// グループの「直近」の1件：今日 → 今日以降で最も近い日 → 最も新しい期限超過 → 期限なし
export function nearestOpen(items, today = todayStr()) {
  const open = items.filter((t) => !t.done);
  if (open.length === 0) return null;
  const dated = open.filter((t) => t.due).sort(byDue);
  const upcoming = dated.find((t) => t.due >= today);
  if (upcoming) return upcoming;
  if (dated.length) return dated[dated.length - 1];
  return open[0];
}

// タスクをまとめて削除（アーカイブ・メモ・セッションは残す方針は従来の×削除と同じ）
export function deleteTaskIds(d, ids) {
  const set = new Set(ids);
  d.tasks = d.tasks.filter((t) => !set.has(t.id));
  // 削除した次回分を指していた参照を掃除
  d.tasks.forEach((t) => { if (t.nextId && set.has(t.nextId)) delete t.nextId; });
  return d;
}

// 今日完了したタスク（アーカイブの completedAt で判定）。完了した順
export function completedToday(data, today = todayStr()) {
  const order = (data.archive || []).filter((a) => a.completedAt === today).map((a) => a.id);
  return order
    .map((id) => data.tasks.find((t) => t.id === id && t.done && t.kind !== "event"))
    .filter(Boolean);
}

// 期限の短い表示（今日／明日／期限超過／M/D(曜)）
const WD = "日月火水木金土";
export function dueLabel(due, today = todayStr()) {
  if (!due) return "期限なし";
  if (due === today) return "今日";
  if (due === fmt(addDays(new Date(today + "T00:00:00"), 1))) return "明日";
  const d = new Date(due + "T00:00:00");
  const md = `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
  return due < today ? `期限超過 ${md}` : md;
}
const shortDate = (due) => {
  if (!due) return "期限なし";
  const d = new Date(due + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
};

/* ================= 共通UI ================= */

// main（z-index:1）の外＝body直下に描画して、下のナビより手前に出す
export function Sheet({ onClose, children, z = 998 }) {
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: z, background: "rgba(6,18,32,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="sheet"
        style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "20px 20px 0 0", padding: "8px 16px calc(20px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.line, margin: "0 auto 10px" }} />
        {children}
      </div>
    </div>,
    document.body
  );
}

const Chevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"
    style={{ transition: "transform .2s", transform: open ? "rotate(90deg)" : "none", flexShrink: 0 }}>
    <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CountBadge = ({ n, color = C.deepAqua, bg = "#E6F5F5" }) => (
  <span style={{ fontSize: 11, fontWeight: 800, color, background: bg, borderRadius: 999, padding: "1px 8px", flexShrink: 0 }}>{n}件</span>
);

/* ================= まとめて削除シート ================= */
export function SeriesSheet({ title, items, update, onClose, onDeleted }) {
  const today = todayStr();
  const sorted = useMemo(() => [...items].sort(byDue), [items]);
  const [sel, setSel] = useState(() => new Set());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(sorted.length ? (sorted[sorted.length - 1].due || today) : today);

  const openItems = sorted.filter((t) => !t.done);
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectWhere = (fn) => setSel(new Set(sorted.filter(fn).map((t) => t.id)));

  const run = (ids, label) => {
    if (ids.length === 0) return;
    if (!window.confirm(`「${title}」の${label}${ids.length}件を削除しますか？\n（完了した記録とメモは水槽の振り返りに残ります）`)) return;
    update((d) => deleteTaskIds(d, ids));
    onDeleted?.(ids);
    onClose();
  };

  // 月ごとに見出しを付けて並べる
  const months = [];
  sorted.forEach((t) => {
    const m = t.due ? `${+t.due.slice(0, 4)}年${+t.due.slice(5, 7)}月` : "期限なし";
    if (!months.length || months[months.length - 1].m !== m) months.push({ m, ts: [] });
    months[months.length - 1].ts.push(t);
  });

  const chip = (label, onClick) => (
    <button onClick={onClick}
      style={{ padding: "6px 11px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
  );

  return (
    <Sheet onClose={onClose} z={1000}>
      <div style={{ fontSize: 12, color: C.sub, fontWeight: 800 }}><G n="trash" size={14} /> まとめて削除</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: "2px 0 12px" }}>
        {title} <span style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>全{sorted.length}件（未完了{openItems.length}件）</span>
      </div>

      {/* ワンタップの一括削除 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => run(openItems.map((t) => t.id), "未完了")} disabled={!openItems.length}
          style={{ flex: 1, padding: "11px 6px", borderRadius: 12, border: `1.5px solid ${openItems.length ? C.red : "#EBC3C1"}`, background: "#fff", color: openItems.length ? C.red : "#EBC3C1", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          未完了をすべて削除
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{openItems.length}件</div>
        </button>
        <button onClick={() => run(sorted.map((t) => t.id), "")}
          style={{ flex: 1, padding: "11px 6px", borderRadius: 12, border: `1.5px solid ${C.red}`, background: "#fff", color: C.red, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          完了分も含めて全部
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{sorted.length}件</div>
        </button>
      </div>

      {/* 日付を指定して削除 */}
      <div style={{ background: "#F4FAFA", border: `1px solid ${C.line}`, borderRadius: 14, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.ink, marginBottom: 8 }}>日付を指定して削除</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="開始日"
            style={{ padding: "6px 6px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, flex: "1 1 120px", minWidth: 0 }} />
          <span style={{ fontSize: 12, color: C.sub }}>〜</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="終了日"
            style={{ padding: "6px 6px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, flex: "1 1 120px", minWidth: 0 }} />
          <button onClick={() => selectWhere((t) => t.due && (!from || t.due >= from) && (!to || t.due <= to))}
            style={{ padding: "7px 12px", borderRadius: 999, border: "none", background: C.deepAqua, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>この期間を選択</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {chip("明日以降", () => selectWhere((t) => t.due && t.due > today))}
          {chip("今日より前", () => selectWhere((t) => t.due && t.due < today))}
          {chip("未完了", () => selectWhere((t) => !t.done))}
          {chip("全選択", () => selectWhere(() => true))}
          {chip("解除", () => setSel(new Set()))}
        </div>

        <div style={{ maxHeight: "34vh", overflowY: "auto", overscrollBehavior: "contain", background: "#fff", borderRadius: 10, border: `1px solid ${C.line}` }}>
          {months.map(({ m, ts }) => (
            <div key={m}>
              <div style={{ position: "sticky", top: 0, background: "#fff", fontSize: 11, fontWeight: 800, color: C.sub, padding: "6px 10px 4px", borderBottom: `1px solid ${C.line}` }}>{m}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8 }}>
                {ts.map((t) => {
                  const on = sel.has(t.id);
                  return (
                    <button key={t.id} onClick={() => toggle(t.id)} aria-pressed={on}
                      style={{ padding: "6px 9px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${on ? C.red : t.due === today ? C.aqua : C.line}`,
                        background: on ? "#FDECEB" : t.done ? "#F2F5F5" : "#fff",
                        color: on ? C.red : t.done ? C.sub : C.ink,
                        textDecoration: t.done ? "line-through" : "none" }}>
                      {on && <G n="check" size={11} style={{ strokeWidth: 3 }} />} {shortDate(t.due)}{t.done ? " 済" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => run([...sel], "選択した")} disabled={!sel.size}
        style={{ position: "sticky", bottom: 0, width: "100%", marginTop: 12, padding: "13px 0", borderRadius: 12, border: "none", background: sel.size ? C.red : "#EBC3C1", color: "#fff", fontWeight: 800, fontSize: 15, cursor: sel.size ? "pointer" : "default" }}>
        {sel.size ? `選択した ${sel.size} 件を削除` : "削除する日付を選んでください"}
      </button>
    </Sheet>
  );
}

/* ================= タスク一覧のまとめ表示 ================= */
const PAGE = 10;
export function TaskGroup({ group, data, update, growthOf, onFocus }) {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [manage, setManage] = useState(false);
  const today = todayStr();
  const { items, title } = group;
  const openCount = items.filter((t) => !t.done).length;
  const next = nearestOpen(items, today);
  const first = items[0], last = items[items.length - 1];
  const repeat = items.find((t) => t.repeat)?.repeat;
  // 削除はタブの絞り込みに関係なく、同名タスク全体を対象にする
  const allSame = data.tasks.filter((t) => t.kind !== "event" && titleKey(t) === group.key);

  return (
    <div style={{ marginBottom: 8 }}>
      {manage && <SeriesSheet title={title} items={allSame} update={update} onClose={() => setManage(false)} />}
      <div className="wcard" style={{ position: "relative", background: C.card, border: `1px solid ${open ? C.aqua : C.line}`, borderRadius: 14, boxShadow: open ? "none" : `0 3px 0 -1px #fff, 0 4px 0 -1px ${C.line}, 0 7px 0 -3px #fff, 0 8px 0 -3px ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 10px 11px 12px" }}>
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
            style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left", color: C.ink }}>
            <span style={{ color: C.deepAqua }}><Chevron open={open} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
                <CountBadge n={items.length} />
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                {repeat && <span style={{ whiteSpace: "nowrap" }}><G n="repeat" size={11} /> {REPEATS[repeat]}　</span>}
                {first.due && last.due && first.due !== last.due ? `${shortDate(first.due)}〜${shortDate(last.due)}` : shortDate(first.due)}
                {next && <span style={{ color: next.due && next.due < today ? C.red : C.deepAqua, fontWeight: 700 }}>　次：{dueLabel(next.due, today)}</span>}
                {openCount < items.length && `　完了${items.length - openCount}`}
              </div>
            </div>
          </button>
          {onFocus && next && (
            <button onClick={() => onFocus(next.id)} title="直近の回で集中する"
              style={{ border: "none", background: "#E6F5F5", color: C.deepAqua, cursor: "pointer", borderRadius: 10, padding: "6px 7px", flexShrink: 0, lineHeight: 0 }}><G n="timer" size={16} /></button>
          )}
          <button onClick={() => setManage(true)} title="まとめて削除"
            style={{ border: "none", background: "none", color: C.sub, cursor: "pointer", flexShrink: 0, padding: "4px 2px", lineHeight: 0 }}><G n="trash" size={17} /></button>
        </div>
        {open && (
          <div style={{ padding: "0 8px 4px", borderTop: `1px dashed ${C.line}`, paddingTop: 8 }}>
            {items.slice(0, limit).map((t) => (
              <TaskRow key={t.id} t={t} data={data} update={update} growthOf={growthOf} onFocus={onFocus} />
            ))}
            {items.length > limit && (
              <button onClick={() => setLimit((l) => l + PAGE * 2)}
                style={{ width: "100%", padding: "9px 0", marginBottom: 8, borderRadius: 10, border: `1px dashed ${C.line}`, background: "#fff", color: C.deepAqua, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                さらに表示（残り{items.length - limit}件）
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 一覧の描画：2件以上の同名はまとめ、1件はそのまま
export function GroupedTaskList({ tasks, data, update, growthOf, onFocus }) {
  return groupTasksByTitle(tasks).map((g) => g.items.length > 1
    ? <TaskGroup key={"g:" + g.key} group={g} data={data} update={update} growthOf={growthOf} onFocus={onFocus} />
    : <TaskRow key={g.items[0].id} t={g.items[0]} data={data} update={update} growthOf={growthOf} onFocus={onFocus} />);
}

/* ================= 集中タブ：タスク選択シート ================= */
function PickRow({ t, selected, onPick, today, goal, indent }) {
  const overdue = t.due && t.due < today;
  const radio = (
    <span style={{ width: indent ? 16 : 18, height: indent ? 16 : 18, borderRadius: 999, flexShrink: 0, border: `2px solid ${selected ? C.aqua : "#B8CDD0"}`, background: selected ? C.aqua : "#fff", boxShadow: selected ? "inset 0 0 0 3px #fff" : "none", boxSizing: "border-box" }} />
  );
  if (indent) {
    // グループ内の各回：1行でコンパクトに
    return (
      <button onClick={() => onPick(t.id)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 32px", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left", background: selected ? "#E6F5F5" : "transparent" }}>
        {radio}
        <span style={{ fontSize: 13, fontWeight: 700, color: overdue ? C.red : C.ink, whiteSpace: "nowrap" }}>{dueLabel(t.due, today)}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t.startTime && `${t.startTime}〜`}
          {t.progress > 0 && <span style={{ color: C.deepAqua, fontWeight: 800 }}>　{t.progress}%</span>}
          {t.note && `　${t.note}`}
        </span>
        {selected && <span style={{ fontSize: 11, fontWeight: 800, color: C.deepAqua }}>選択中</span>}
      </button>
    );
  }
  return (
    <button onClick={() => onPick(t.id)}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", border: "none", borderRadius: 12, cursor: "pointer", textAlign: "left",
        background: selected ? "#E6F5F5" : "transparent", outline: selected ? `1.5px solid ${C.aqua}` : "none", marginBottom: 2 }}>
      {radio}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
        <span style={{ display: "block", fontSize: 11, color: overdue ? C.red : C.sub, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {dueLabel(t.due, today)}
          {t.startTime && `　${t.startTime}〜`}
          {goal && <span style={{ color: C.deepAqua }}>　● {goal.title}</span>}
          {t.progress > 0 && <span style={{ color: C.deepAqua, fontWeight: 800 }}>　{t.progress}%</span>}
          {t.note && <span>　メモ：{t.note}</span>}
        </span>
      </span>
    </button>
  );
}

function PickGroup({ g, taskId, onPick, today, goals, onManage, forceOpen }) {
  const containsSel = g.items.some((t) => t.id === taskId);
  const [open, setOpen] = useState(containsSel);
  const [limit, setLimit] = useState(7);
  const isOpen = open || forceOpen;
  const overdueN = g.items.filter((t) => t.due && t.due < today).length;
  const next = nearestOpen(g.items, today);
  const goal = goals.find((x) => x.id === g.items[0].goalId);
  return (
    <div style={{ borderRadius: 12, background: isOpen ? "#F6FBFB" : "transparent", marginBottom: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={isOpen}
          style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", border: "none", background: "none", cursor: "pointer", textAlign: "left", color: C.ink }}>
          <span style={{ width: 18, display: "flex", justifyContent: "center", color: containsSel ? C.aqua : C.deepAqua }}><Chevron open={isOpen} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</span>
              <CountBadge n={g.items.length} />
            </span>
            <span style={{ display: "block", fontSize: 11, color: C.sub, marginTop: 1 }}>
              {next && <>次：{dueLabel(next.due, today)}</>}
              {overdueN > 0 && next?.due >= today && <span style={{ color: C.red }}>　期限超過{overdueN}</span>}
              {goal && <span style={{ color: C.deepAqua }}>　● {goal.title}</span>}
            </span>
          </span>
        </button>
        {next && (
          <button onClick={() => onPick(next.id)}
            style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 999, border: "none", background: next.id === taskId ? C.aqua : "#E6F5F5", color: next.id === taskId ? "#fff" : C.deepAqua, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
            {next.id === taskId ? "選択中" : "直近を選ぶ"}
          </button>
        )}
      </div>
      {isOpen && (
        <div style={{ paddingBottom: 6 }}>
          {g.items.slice(0, limit).map((t) => <PickRow key={t.id} t={t} selected={t.id === taskId} onPick={onPick} today={today} indent />)}
          {g.items.length > limit && (
            <button onClick={() => setLimit((l) => l + 14)}
              style={{ marginLeft: 30, padding: "6px 4px", border: "none", background: "none", color: C.deepAqua, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
              さらに表示（残り{g.items.length - limit}件）
            </button>
          )}
          <button onClick={() => onManage(g)}
            style={{ display: "block", marginLeft: 30, padding: "6px 4px", border: "none", background: "none", color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <G n="trash" size={13} /> まとめて削除…
          </button>
        </div>
      )}
    </div>
  );
}

export function TaskPickerSheet({ data, update, taskId, onSelect, onClose }) {
  const today = todayStr();
  const [q, setQ] = useState("");
  const [manage, setManage] = useState(null);
  const [showDone, setShowDone] = useState(true);
  const query = q.trim().toLowerCase();

  const open = data.tasks.filter((t) => !t.done && t.kind !== "event" && (!query || t.title.toLowerCase().includes(query)));
  // 同名タスクは区分をまたいで1グループにまとめる（今日・期限超過の回があれば「今日やる」へ）
  const groups = groupTasksByTitle(open);
  const isToday = (g) => g.items.some((t) => t.due && t.due <= today);
  const goalOf = (g) => g.items.find((t) => t.goalId && data.goals.some((x) => x.id === t.goalId))?.goalId;
  const todayGroups = groups.filter(isToday);
  const laterGroups = groups.filter((g) => !isToday(g));
  const byGoal = data.goals
    .map((g) => ({ g, gs: laterGroups.filter((x) => goalOf(x) === g.id) }))
    .filter((x) => x.gs.length);
  const others = laterGroups.filter((x) => !goalOf(x));
  const doneToday = completedToday(data, today).filter((t) => !query || t.title.toLowerCase().includes(query));

  const pick = (id) => { onSelect(id); onClose(); };

  const section = (label, icon, gs, key) => gs.length > 0 && (
    <div key={key} style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, padding: "6px 4px 4px", display: "flex", alignItems: "center", gap: 5 }}>
        {icon} {label}
      </div>
      {gs.map((g) => g.items.length > 1
        ? <PickGroup key={g.key} g={g} taskId={taskId} onPick={pick} today={today} goals={data.goals} forceOpen={!!query}
            onManage={(gg) => setManage({ title: gg.title, key: gg.key })} />
        : <PickRow key={g.items[0].id} t={g.items[0]} selected={g.items[0].id === taskId} onPick={pick} today={today}
            goal={data.goals.find((x) => x.id === g.items[0].goalId)} />)}
    </div>
  );

  const manageItems = manage ? data.tasks.filter((t) => t.kind !== "event" && titleKey(t) === manage.key) : [];

  return (
    <Sheet onClose={onClose}>
      {manage && (
        <SeriesSheet title={manage.title} items={manageItems} update={update} onClose={() => setManage(null)}
          onDeleted={(ids) => { if (ids.includes(taskId)) onSelect(""); }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, flex: 1 }}><G n="timer" size={16} style={{ color: C.aqua }} /> 取り組むタスクを選ぶ</div>
        {taskId && (
          <button onClick={() => pick("")}
            style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>選択を外す</button>
        )}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="タスクを検索"
        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, marginBottom: 8, background: "#FBFEFE" }} />

      {open.length === 0 && doneToday.length === 0 && (
        <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "24px 0" }}>
          {query ? "見つかりませんでした" : "未完了のタスクはありません"}
        </div>
      )}

      {section("今日やる", <G n="alarm" size={13} style={{ color: C.aqua }} />, todayGroups, "today")}
      {byGoal.map(({ g, gs }) => section(g.title, <G n={g.type === "work" ? "work" : "goal"} size={13} style={{ color: C.deepAqua }} />, gs, g.id))}
      {section(byGoal.length ? "その他" : "これから", <G n="pin" size={13} style={{ color: C.sub }} />, others, "others")}

      {doneToday.length > 0 && (
        <div style={{ marginTop: 6, borderTop: `1px solid ${C.line}`, paddingTop: 6 }}>
          <button onClick={() => setShowDone((s) => !s)}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: "none", background: "none", padding: "6px 4px", cursor: "pointer", color: C.sub, fontSize: 11, fontWeight: 800 }}>
            <Chevron open={showDone} /> <G n="done" size={13} style={{ color: C.aqua }} /> 今日完了 · {doneToday.length}
          </button>
          {showDone && doneToday.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, background: C.aqua, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><G n="check" size={12} style={{ strokeWidth: 3 }} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.sub, textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <button onClick={() => update((d) => applyTaskDone(d, t.id, false))}
                style={{ padding: "4px 9px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 11, cursor: "pointer" }}>戻す</button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ================= 集中タブ：今日のタスク（未完了 → 完了済みへ流れる） ================= */
export function TodayChecklist({ data, update, taskId, onSelect }) {
  const today = todayStr();
  const [showDone, setShowDone] = useState(false);
  const [justDone, setJustDone] = useState(null); // 完了アニメーション中のid
  const todays = data.tasks.filter((t) => !t.done && t.kind !== "event" && t.due && t.due <= today);
  const done = completedToday(data, today);
  if (todays.length === 0 && done.length === 0) return null;

  const complete = (id) => {
    setJustDone(id);
    setTimeout(() => {
      update((d) => applyTaskDone(d, id, true));
      if (id === taskId) onSelect("");
      setJustDone(null);
    }, 380);
  };

  const groups = groupTasksByTitle(todays);
  // 進捗は表示している行数で数える（同名の期限超過はまとめて1行＝1件）
  const total = groups.length + done.length;

  return (
    <div className="wcard" style={{ background: C.card, borderRadius: 16, padding: "12px 12px 8px", marginTop: 14, border: `1px solid ${C.line}` }}>
      <style>{`@keyframes flowOut { 0%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(14px)} }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "0 4px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.ink, flex: 1 }}><G n="alarm" size={13} style={{ color: C.aqua }} /> 今日やること</div>
        <span className="num" style={{ fontSize: 13, color: C.deepAqua }}>{done.length}/{total}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "#E4EFEF", overflow: "hidden", margin: "0 4px 8px" }}>
        <div style={{ width: `${(done.length / total) * 100}%`, height: "100%", background: `linear-gradient(90deg,${C.aqua},${C.deepAqua})`, transition: "width .4s" }} />
      </div>

      {todays.length === 0 && (
        <div style={{ fontSize: 12, color: C.deepAqua, fontWeight: 700, textAlign: "center", padding: "6px 0 8px" }}>
          今日のタスクはすべて完了！おつかれさまでした
        </div>
      )}
      {groups.map((g) => {
        // 同名が複数（期限超過の毎日タスクなど）は直近1件を代表に、件数を添える
        const t = nearestOpen(g.items, today);
        const extra = g.items.length - 1;
        const sel = t.id === taskId;
        const overdue = t.due < today;
        return (
          <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 4px", borderRadius: 10, background: sel ? "#E6F5F5" : "transparent", animation: justDone === t.id ? "flowOut .38s ease-in forwards" : "none" }}>
            <button onClick={() => complete(t.id)} title="完了にする" aria-label={`${t.title}を完了にする`}
              style={{ width: 26, height: 26, borderRadius: 999, border: `2px solid ${justDone === t.id ? C.aqua : "#B8CDD0"}`, background: justDone === t.id ? C.aqua : "#fff", color: justDone === t.id ? "#fff" : "#C7D6D9", cursor: "pointer", padding: 0, flexShrink: 0, lineHeight: 0 }}>
              <G n="check" size={14} style={{ strokeWidth: 2.6 }} />
            </button>
            <button onClick={() => onSelect(sel ? "" : t.id)}
              style={{ flex: 1, minWidth: 0, border: "none", background: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <span style={{ display: "block", fontSize: 11, color: overdue ? C.red : C.sub }}>
                {overdue ? dueLabel(t.due, today) : "今日"}{t.startTime && `　${t.startTime}〜`}
                {extra > 0 && `　ほか期限超過${extra}件`}
                {t.progress > 0 && <span style={{ color: C.deepAqua, fontWeight: 800 }}>　{t.progress}%</span>}
              </span>
            </button>
            <span style={{ fontSize: 11, fontWeight: 800, color: sel ? C.deepAqua : C.sub, flexShrink: 0 }}>{sel ? "集中中" : ""}</span>
          </div>
        );
      })}

      {done.length > 0 && (
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 6, paddingTop: 2 }}>
          <button onClick={() => setShowDone((s) => !s)} aria-expanded={showDone}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: "none", background: "none", padding: "8px 4px", cursor: "pointer", color: C.sub, fontSize: 12, fontWeight: 800 }}>
            <Chevron open={showDone} /> 完了済み <span style={{ color: C.deepAqua }}>{done.length}</span>
          </button>
          {showDone && done.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px" }}>
              <span style={{ width: 26, height: 26, borderRadius: 999, background: C.aqua, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><G n="check" size={14} style={{ strokeWidth: 2.8 }} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.sub, textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <button onClick={() => update((d) => applyTaskDone(d, t.id, false))}
                style={{ padding: "4px 9px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>戻す</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
