import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./firebase.js";
import { C, fmt, todayStr, addDays } from "./shared.jsx";
import { FishSVG } from "./fish.jsx";
import { loadShareDoc, loadGroupData } from "./storage.js";

/* メンバーごとの色（uid順で割り当て） */
const MEMBER_COLORS = ["#0E7C7B", "#3A6EA5", "#B4762F", "#7B5EA7", "#C05B7A", "#4A8A58", "#5B7283"];

/* 共有カレンダー（閲覧専用ページ）
   ?share=ID で開く。ログイン不要。予定とタスクの「日付・時刻・タイトル」だけを表示する */
export function SharedCalendarPage({ shareId }) {
  const [state, setState] = useState({ loading: true, error: false, data: null });
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayStr());

  useEffect(() => {
    loadShareDoc(shareId)
      .then((d) => setState({ loading: false, error: !d, data: d }))
      .catch(() => setState({ loading: false, error: true, data: null }));
  }, [shareId]);

  const items = state.data?.items || [];
  const eventsOn = (key) =>
    items.filter((i) => i.due === key && i.kind === "event")
      .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  const tasksOn = (key) => items.filter((i) => i.due === key && i.kind !== "event");

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return [...Array(42)].map((_, i) => addDays(start, i));
  }, [cursor]);

  const move = (n) => {
    const c = new Date(cursor);
    c.setMonth(c.getMonth() + n);
    setCursor(c);
  };

  const selEvents = eventsOn(selected);
  const selTasks = tasksOn(selected);

  const card = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 22px rgba(13,60,84,0.12)", border: `1px solid ${C.line}` };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#EAF8F9 0%,#C9E7ED 38%,#ABD6E0 72%,#96C9D6 100%)",
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      color: C.ink,
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px calc(30px + env(safe-area-inset-bottom))" }}>

        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <FishSVG type="🐠" size={44} />
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", color: C.sub, fontWeight: 700 }}>FOCUSLAP — 共有カレンダー</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>
              {state.data?.ownerName ? `${state.data.ownerName}さんのカレンダー` : "カレンダー"}
            </div>
          </div>
        </div>

        {state.loading && (
          <div style={{ ...card, padding: 30, textAlign: "center", color: C.sub, fontSize: 13 }}>読み込み中…</div>
        )}

        {!state.loading && state.error && (
          <div style={{ ...card, padding: 30, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🫧</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>この共有リンクは無効です</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 6, lineHeight: 1.7 }}>
              リンクが間違っているか、持ち主が共有を停止しました。
            </div>
          </div>
        )}

        {!state.loading && !state.error && (
          <>
            {/* 月ナビ */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <button onClick={() => move(-1)} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.deepAqua, fontWeight: 800, cursor: "pointer" }}>◀</button>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{cursor.getFullYear()}年 {cursor.getMonth() + 1}月</div>
              <button onClick={() => move(1)} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.deepAqua, fontWeight: 800, cursor: "pointer" }}>▶</button>
            </div>

            {/* 月グリッド */}
            <div style={{ ...card, padding: 10, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", marginBottom: 4 }}>
                {"日月火水木金土".split("").map((w, i) => (
                  <div key={w} style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? C.red : i === 6 ? "#3A6EA5" : C.sub }}>{w}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", gap: 2 }}>
                {monthDays.map((d) => {
                  const key = fmt(d);
                  const evs = eventsOn(key);
                  const ts = tasksOn(key);
                  const isToday = key === todayStr();
                  const isSel = key === selected;
                  const inMonth = d.getMonth() === cursor.getMonth();
                  return (
                    <button key={key} onClick={() => setSelected(key)}
                      style={{
                        minHeight: 52, padding: "4px 2px", borderRadius: 10, cursor: "pointer",
                        border: isSel ? `2px solid ${C.deepAqua}` : `1px solid ${isToday ? C.aqua : "transparent"}`,
                        background: isSel ? "#E6F5F5" : "transparent",
                        color: inMonth ? (d.getDay() === 0 ? C.red : d.getDay() === 6 ? "#3A6EA5" : C.ink) : "#B8C9D2",
                      }}>
                      <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 600 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, lineHeight: 1.1, minHeight: 12, color: C.deepAqua }}>
                        <span style={{ color: "#2E6FA8" }}>{"○".repeat(Math.min(evs.length, 2))}</span>
                        {ts.slice(0, 3 - Math.min(evs.length, 2)).map((t) => (t.done ? "✓" : "●")).join("")}
                        {ts.length + evs.length > 3 && "…"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 選択日の内容 */}
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
              {selected.slice(5).replace("-", "/")} の予定とタスク
            </div>

            {selEvents.length === 0 && selTasks.length === 0 && (
              <div style={{ ...card, padding: 22, textAlign: "center", color: C.sub, fontSize: 13 }}>この日の予定はありません</div>
            )}

            {selEvents.map((ev, i) => (
              <div key={`e${i}`} style={{ ...card, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: ev.startTime ? C.deepAqua : "#9AB4BC", borderRadius: 6, padding: "3px 7px", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {ev.startTime || "終日"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{ev.title}</span>
              </div>
            ))}

            {selTasks.map((t, i) => (
              <div key={`t${i}`} style={{ ...card, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 6 }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{t.done ? "✅" : "☐"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, textDecoration: t.done ? "line-through" : "none", color: t.done ? C.sub : C.ink, flex: 1 }}>{t.title}</span>
                {t.startTime && <span style={{ fontSize: 11, color: C.sub }}>⏰ {t.startTime}〜</span>}
              </div>
            ))}
          </>
        )}

        {/* フッターCTA */}
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <a href={`${location.origin}${location.pathname}`}
            style={{ display: "inline-block", padding: "11px 22px", borderRadius: 999, background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 13, textDecoration: "none", boxShadow: "0 8px 20px rgba(13,60,84,0.25)" }}>
            🐠 FocusLapで自分の魚を育てる
          </a>
          <div style={{ fontSize: 10, color: C.sub, marginTop: 10 }}>
            このページは閲覧専用です。タイトルと時間だけが共有されています。
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= グループカレンダー（メンバー同士で見せ合う） ================= */
export function GroupCalendarPage({ groupId }) {
  const [authUser, setAuthUser] = useState(undefined); // undefined=確認中 / null=未ログイン
  const [g, setG] = useState({ loading: true, notFound: false, notMember: false, group: null, calendars: [], events: [] });
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayStr());

  useEffect(() => {
    if (!isFirebaseConfigured) { setAuthUser(null); return; }
    return onAuthStateChanged(auth, (u) => setAuthUser(u));
  }, []);

  useEffect(() => {
    if (!authUser) return;
    loadGroupData(groupId)
      .then((d) => {
        if (!d) { setG((s) => ({ ...s, loading: false, notFound: true })); return; }
        // uid順で色を固定
        const cals = [...d.calendars].sort((a, b) => a.uid.localeCompare(b.uid))
          .map((c, i) => ({ ...c, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }));
        setG({ loading: false, notFound: false, notMember: false, group: d.group, calendars: cals, events: d.events || [] });
      })
      .catch(() => setG((s) => ({ ...s, loading: false, notMember: true })));
  }, [authUser, groupId]);

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return [...Array(42)].map((_, i) => addDays(start, i));
  }, [cursor]);

  const move = (n) => { const c = new Date(cursor); c.setMonth(c.getMonth() + n); setCursor(c); };

  // その日の全メンバーの項目（メンバー情報つき）＋グループ共有の予定（金色）
  const itemsOn = (key) => {
    const out = [];
    (g.events || []).forEach((ev) => {
      if (ev.due === key) out.push({ ...ev, kind: "event", member: `👥${ev.createdByName || ""}`, color: "#B8860B" });
    });
    g.calendars.forEach((c) => {
      (c.items || []).forEach((it) => {
        if (it.due === key) out.push({ ...it, member: c.name || "メンバー", color: c.color });
      });
    });
    return out;
  };

  const card = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 22px rgba(13,60,84,0.12)", border: `1px solid ${C.line}` };
  const selItems = itemsOn(selected);
  const selEvents = selItems.filter((i) => i.kind === "event").sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  const selTasks = selItems.filter((i) => i.kind !== "event");

  const copyCode = () => {
    const url = `${location.origin}${location.pathname}?group=${groupId}`;
    try { navigator.clipboard.writeText(url); alert("招待リンクをコピーしました"); }
    catch { window.prompt("この招待リンクをコピーしてください", url); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#EAF8F9 0%,#C9E7ED 38%,#ABD6E0 72%,#96C9D6 100%)",
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      color: C.ink,
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px calc(30px + env(safe-area-inset-bottom))" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <FishSVG type="🐠" size={44} />
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", color: C.sub, fontWeight: 700 }}>FOCUSLAP — グループカレンダー</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{g.group?.name ? `👥 ${g.group.name}` : "グループ"}</div>
          </div>
        </div>

        {/* 認証確認中 / ログインが必要 */}
        {authUser === undefined && (
          <div style={{ ...card, padding: 30, textAlign: "center", color: C.sub, fontSize: 13 }}>確認中…</div>
        )}
        {authUser === null && (
          <div style={{ ...card, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>メンバー確認のためログインが必要です</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.7 }}>
              グループのカレンダーはメンバーだけが見られます。
            </div>
            <button onClick={() => signInWithPopup(auth, googleProvider).catch(() => {})}
              style={{ padding: "12px 24px", borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              <span style={{ color: "#4285F4", fontWeight: 800 }}>G</span>　Googleでログイン
            </button>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 12, lineHeight: 1.7 }}>
              メールで登録した方は、先にアプリでログインしてから<br />このリンクをもう一度開いてください。
            </div>
          </div>
        )}

        {authUser && g.loading && (
          <div style={{ ...card, padding: 30, textAlign: "center", color: C.sub, fontSize: 13 }}>読み込み中…</div>
        )}

        {authUser && !g.loading && g.notFound && (
          <div style={{ ...card, padding: 30, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🫧</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>グループが見つかりません</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>リンクが間違っているか、削除された可能性があります。</div>
          </div>
        )}

        {authUser && !g.loading && g.notMember && (
          <div style={{ ...card, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>このグループのメンバーではありません</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.8 }}>
              参加するには、FocusLapアプリの<br />
              <b>⚙️設定 → 👥グループ → コードで参加</b><br />
              にこの招待リンクを貼り付けてください。
            </div>
            <button onClick={copyCode}
              style={{ marginTop: 14, padding: "10px 18px", borderRadius: 999, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
              招待リンクをコピー
            </button>
          </div>
        )}

        {/* 本体：メンバー全員のカレンダー */}
        {authUser && !g.loading && !g.notFound && !g.notMember && (
          <>
            {/* メンバー凡例 */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {g.calendars.map((c) => (
                <span key={c.uid} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.75)", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: C.ink }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: c.color }} />
                  {c.name || "メンバー"}
                </span>
              ))}
              <button onClick={copyCode}
                style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.deepAqua, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                ＋招待
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <button onClick={() => move(-1)} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.deepAqua, fontWeight: 800, cursor: "pointer" }}>◀</button>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{cursor.getFullYear()}年 {cursor.getMonth() + 1}月</div>
              <button onClick={() => move(1)} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.deepAqua, fontWeight: 800, cursor: "pointer" }}>▶</button>
            </div>

            <div style={{ ...card, padding: 10, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", marginBottom: 4 }}>
                {"日月火水木金土".split("").map((w, i) => (
                  <div key={w} style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? C.red : i === 6 ? "#3A6EA5" : C.sub }}>{w}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", gap: 2 }}>
                {monthDays.map((d) => {
                  const key = fmt(d);
                  const its = itemsOn(key);
                  // その日に項目があるメンバー色（最大3色）
                  const colors = [...new Set(its.map((i) => i.color))].slice(0, 3);
                  const isToday = key === todayStr();
                  const isSel = key === selected;
                  const inMonth = d.getMonth() === cursor.getMonth();
                  return (
                    <button key={key} onClick={() => setSelected(key)}
                      style={{
                        minHeight: 52, padding: "4px 2px", borderRadius: 10, cursor: "pointer",
                        border: isSel ? `2px solid ${C.deepAqua}` : `1px solid ${isToday ? C.aqua : "transparent"}`,
                        background: isSel ? "#E6F5F5" : "transparent",
                        color: inMonth ? (d.getDay() === 0 ? C.red : d.getDay() === 6 ? "#3A6EA5" : C.ink) : "#B8C9D2",
                      }}>
                      <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 600 }}>{d.getDate()}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 2, minHeight: 12, alignItems: "center" }}>
                        {colors.map((c, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: c }} />)}
                        {its.length > 3 && <span style={{ fontSize: 9, color: C.sub }}>…</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
              {selected.slice(5).replace("-", "/")} のみんなの予定
            </div>

            {selItems.length === 0 && (
              <div style={{ ...card, padding: 22, textAlign: "center", color: C.sub, fontSize: 13 }}>この日の予定はありません</div>
            )}

            {selEvents.map((ev, i) => (
              <div key={`e${i}`} style={{ ...card, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 6, borderLeft: `4px solid ${ev.color}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: ev.startTime ? C.deepAqua : "#9AB4BC", borderRadius: 6, padding: "3px 7px", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {ev.startTime || "終日"}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0 }}>{ev.title}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: ev.color, flexShrink: 0 }}>{ev.member}</span>
              </div>
            ))}

            {selTasks.map((t, i) => (
              <div key={`t${i}`} style={{ ...card, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 6, borderLeft: `4px solid ${t.color}` }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{t.done ? "✅" : "☐"}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, textDecoration: t.done ? "line-through" : "none", color: t.done ? C.sub : C.ink, minWidth: 0 }}>{t.title}</span>
                {t.startTime && <span style={{ fontSize: 10, color: C.sub, flexShrink: 0 }}>⏰{t.startTime}</span>}
                <span style={{ fontSize: 10, fontWeight: 800, color: t.color, flexShrink: 0 }}>{t.member}</span>
              </div>
            ))}
          </>
        )}

        <div style={{ textAlign: "center", fontSize: 10, color: C.sub, marginTop: 20 }}>
          共有されるのはタイトルと時間だけ。魚・メモ・進捗は共有されません 🐟
        </div>
      </div>
    </div>
  );
}
