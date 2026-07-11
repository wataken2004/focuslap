import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase.js";
import {
  loadUserData, saveUserData,
  saveShareDoc, deleteShareDoc,
  createGroupDocs, joinGroupDocs, leaveGroupDocs, saveGroupCalendar,
} from "./storage.js";
import { C, todayStr } from "./shared.jsx";
import { FocusTab } from "./tabs/FocusTab.jsx";
// デフォルト以外のタブは遅延ロードして初回の読み込みを軽くする
const TasksTab    = lazy(() => import("./tabs/TasksTab.jsx").then((m) => ({ default: m.TasksTab })));
const CalendarTab = lazy(() => import("./tabs/CalendarTab.jsx").then((m) => ({ default: m.CalendarTab })));
const GoalsTab    = lazy(() => import("./tabs/GoalsTab.jsx").then((m) => ({ default: m.GoalsTab })));
const TankTab     = lazy(() => import("./tabs/TankTab.jsx").then((m) => ({ default: m.TankTab })));
import { LoginScreen } from "./auth/LoginScreen.jsx";
import { IconFocus, IconTasks, IconCal, IconGoals, IconTank } from "./icons.jsx";
import { enablePush, disablePush } from "./push.js";

// アプリ内通知（許可済みのときだけ）
const appNotify = (msg) => {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("FocusLap", { body: msg, icon: "./icon.svg" });
    }
  } catch { /* 非対応ブラウザは無視 */ }
};

// 共有用：カレンダーに載る最小限の情報だけを抜き出す（魚・メモ・進捗は含めない）
const calendarItems = (d) =>
  d.tasks.filter((t) => t.due).map((t) => ({
    title: t.title, due: t.due, startTime: t.startTime || null,
    kind: t.kind === "event" ? "event" : "task", done: !!t.done,
  }));

// 招待コード等に使う推測不能なID
const genShareId = () =>
  (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") :
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36));

/* ---- タブごとの使い方説明 ---- */
const HELP = {
  focus: [
    "下の魚カードで集中時間を選んでスタート。時間が長いほどレアな魚が獲れます（未獲得の魚はシルエットで、獲るまでのお楽しみ）",
    "⏲ストップウォッチに切り替えると時間を計り上げて記録できます。「終了して記録」を押した時点の時間で魚を獲得（5分以上）",
    "画面スリープはOK。ただし1分以上アプリを離れると魚が逃げます。スマホで勉強するときは📱スマホ学習モードをONに",
    "🔁繰り返しモードONなら、休憩が終わると自動で次の集中が始まります",
    "タイマーなしで勉強した分は「✏️あとから記録」で追加すれば、ちゃんと魚がもらえます",
    "セッション後に進捗入力が出ます。5%刻みで積み上げて引き継ぎメモを残せば、次回は続きから取り組めます",
    "📲プッシュ通知が有効なら、アプリを閉じていても集中終了をお知らせします",
  ],
  tasks: [
    "①タスク名だけで追加OK。期限・開始時刻・目標との紐付けは任意です",
    "開始時刻を設定すると、その5分前に通知が届きます",
    "🔔期限リマインドONで、期限が今日・または過ぎた未完了タスクを1時間ごとにお知らせ（8〜22時）",
    "📲プッシュ通知を有効にすると、アプリを閉じていても通知が届きます",
    "🔁繰り返し（毎日/毎週/隔週/毎月/隔月）が設定可能。最終日を指定するとカレンダーに全回分が並び、未指定なら完了するたび次回分が作られます",
    "📊ボタンで進捗を5%刻みで入力。引き継ぎメモを残せば次回は続きから取り組めます。100%で自動的に完了へ",
    "✓の丸ボタンでいつでも完了にできます（×は確認してから削除）",
    "✎ボタンでタスク名・期限・開始時刻・繰り返し・紐付けを後から編集できます",
  ],
  cal: [
    "月・週・日を切り替えて、日付をタップするとその日の予定とタスクが見えます",
    "🕐予定：授業・バイト・約束など時間の約束を登録。開始5分前に通知（完了チェック不要）。時刻なしは「終日」ボタンで登録できます",
    "👥グループに参加していれば、上の切替チップで「自分」とグループを切替。グループ表示中も自分の予定・タスクは追加でき、他メンバーの分は色分けで見られます",
    "「＋この日に追加」で新規タスク、「📌既存タスクを割り振る」で持っているタスクをその日へ移動／コピーできます",
    "コピーなら同じタスクを複数の日に置けます。開始時刻は割り振り後に✎編集で設定します",
    "タスク追加時に繰り返し＋最終日を設定すると、その期間の予定がカレンダーに全部並びます",
    "📤 ⚙️設定からカレンダーを共有できます：閲覧専用リンク（見るだけ）と、👥グループ（メンバー同士で色分け表示）の2種類",
  ],
  goals: [
    "🎯目標 / 💼仕事を追加し、タスクを紐付けて進捗バーで管理します",
    "目標を開いて「＋タスクを追加」すると、期限・開始時刻・繰り返しまで設定して紐付けられます",
    "目標ごとに合計集中時間・セッション数・獲得した魚の内訳が見えます",
    "期限まで30日を切ると残り日数が赤く表示されます",
  ],
  tank: [
    "泳いでいる魚や図鑑のマスをタップすると、大きく泳ぐ姿を観察できます",
    "図鑑は獲得した魚ほど中央に集まります。未獲得はシルエット＋必要時間のヒント付き",
    "振り返り：完了したタスクのカードをタップすると、メモを書いて記録できます",
    "完了タスクの記録とメモは、タスクを×で削除しても振り返りに残り続けます（🗑で記録やメモを個別に削除もできます）",
  ],
};

function HelpSheet({ tab, title, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(6,18,32,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="sheet" style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px calc(28px + env(safe-area-inset-bottom))" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 12 }}>💡「{title}」タブの使い方</div>
        {HELP[tab].map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>
            <span style={{ color: C.aqua, fontWeight: 800 }}>•</span>
            <span>{h}</span>
          </div>
        ))}
        <button onClick={onClose} style={{ width: "100%", marginTop: 8, padding: "12px 0", borderRadius: 12, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>閉じる</button>
      </div>
    </div>
  );
}

const DEFAULT_DATA = {
  goals: [
    { id: "g1", title: "英語力アップ",   date: null, type: "goal" },
    { id: "g2", title: "資格・試験対策", date: null, type: "goal" },
    { id: "g3", title: "健康・運動習慣", date: null, type: "goal" },
  ],
  tasks: [
    { id: "t1", title: "英語リスニング 30分",  goalId: "g1", due: todayStr(), done: false },
    { id: "t2", title: "単語帳 50問",           goalId: "g1", due: todayStr(), done: false },
    { id: "t3", title: "参考書 1章",            goalId: "g2", due: null,        done: false },
    { id: "t4", title: "ストレッチ・運動",      goalId: "g3", due: null,        done: false },
    { id: "t5", title: "読書 20分",             goalId: null, due: null,        done: false },
  ],
  sessions: [],
  settings: { work: 25, rest: 5 },
  collection: {},
  escapes: 0,
  memos: {},
};

function migrateData(d) {
  // collection を配列→オブジェクト形式に移行
  if (Array.isArray(d.collection)) {
    const obj = {};
    d.collection.forEach((e) => { obj[e] = (obj[e] || 0) + 1; });
    d.collection = obj;
  }
  if (!d.collection) d.collection = {};
  if (!d.memos) d.memos = {};
  if (typeof d.escapes !== "number") d.escapes = 0;
  if (!d.settings) d.settings = { work: 25, rest: 5 };
  if (typeof d.settings.phoneMode !== "boolean") d.settings.phoneMode = false;
  if (typeof d.settings.autoRepeat !== "boolean") d.settings.autoRepeat = false;
  if (typeof d.settings.hourlyReminder !== "boolean") d.settings.hourlyReminder = false;
  if (d.settings.timerKind !== "timer" && d.settings.timerKind !== "stopwatch") d.settings.timerKind = "timer";
  // 逃げた魚カウントは日ごとにリセット
  if (d.escapesDate !== todayStr()) { d.escapes = 0; d.escapesDate = todayStr(); }
  d.goals.forEach((g) => { if (!g.type) g.type = "goal"; });
  // カレンダー共有：参加中グループの一覧
  if (!Array.isArray(d.groups)) d.groups = [];
  // 完了タスクの永久アーカイブ（タスクを削除しても記録とメモが残る）
  if (!Array.isArray(d.archive)) d.archive = [];
  d.tasks.forEach((t) => {
    if (t.done && !d.archive.some((a) => a.id === t.id)) {
      const g = d.goals.find((gg) => gg.id === t.goalId);
      const sess = d.sessions.filter((s) => s.taskId === t.id);
      d.archive.push({
        id: t.id, title: t.title,
        goalTitle: g?.title ?? null, goalType: g?.type ?? null,
        due: t.due ?? null,
        completedAt: sess.length ? sess[sess.length - 1].date : todayStr(),
        sessions: sess.length,
        fish: sess.length ? sess[sess.length - 1].fish : null,
      });
    }
  });
  // sessions に fish フィールドがなければスキップ（古いデータ互換）
  return d;
}

/* ---- 設定シート（通知・アカウント） ---- */
function SettingsSheet({ user, data, update, onClose }) {
  const [pushOn, setPushOn] = useState(localStorage.getItem("focuslap:pushOn") === "1");
  const [busy, setBusy] = useState(false);

  const togglePush = async () => {
    setBusy(true);
    if (pushOn) {
      await disablePush(user?.uid);
      localStorage.setItem("focuslap:pushOn", "0");
      setPushOn(false);
    } else {
      const r = await enablePush(user?.uid);
      if (r.ok) {
        localStorage.setItem("focuslap:pushOn", "1");
        setPushOn(true);
      } else {
        const msgs = {
          login: "プッシュ通知にはGoogleログインが必要です。",
          denied: "通知がブロックされています。ブラウザの設定から許可してください。",
          unsupported: "この環境ではプッシュ通知を利用できません。iPhoneの場合は、ホーム画面に追加したアプリから有効にしてください。",
          error: "登録に失敗しました。時間をおいて再度お試しください。",
        };
        alert(msgs[r.reason] || msgs.error);
      }
    }
    setBusy(false);
  };

  /* ---- カレンダー共有（閲覧リンク／グループ） ---- */
  const [gBusy, setGBusy] = useState(false);

  const copyText = (text, msg) => {
    try { navigator.clipboard.writeText(text); alert(msg); }
    catch { window.prompt("コピーしてください", text); }
  };
  const shareUrl = data.shareId ? `${location.origin}${location.pathname}?share=${data.shareId}` : "";

  const createShare = async () => {
    const id = genShareId();
    setGBusy(true);
    try {
      // 先にFirestoreへ書き込み、成功した場合だけ発行済みにする（失敗を握りつぶさない）
      await saveShareDoc(id, {
        owner: user.uid,
        ownerName: user.displayName || "",
        updatedAt: Date.now(),
        items: calendarItems(data),
      });
      update((d) => { d.shareId = id; return d; });
      copyText(`${location.origin}${location.pathname}?share=${id}`, "閲覧リンクを発行してコピーしました！そのまま友達に送れます。");
    } catch (e) {
      console.error("share create failed", e);
      alert(
        e?.code === "permission-denied"
          ? "発行に失敗しました：Firestoreのルールが未更新です。\nFirebaseコンソール → Firestore Database → ルール に、共有用ルール（shares / groups）を追加して「公開」してください。"
          : `発行に失敗しました（${e?.code || e?.message || "不明なエラー"}）。通信環境を確認して再度お試しください。`
      );
    }
    setGBusy(false);
  };

  const stopShare = () => {
    const id = data.shareId;
    update((d) => { delete d.shareId; return d; });
    if (id) deleteShareDoc(id).catch(() => {});
  };

  const createGroup = async () => {
    const name = window.prompt("グループ名を入力（例：ゼミ、家族、勉強仲間）");
    if (!name || !name.trim()) return;
    setGBusy(true);
    try {
      const gid = genShareId();
      await createGroupDocs(gid, name.trim(), user.uid, user.displayName || user.email || "メンバー");
      update((d) => { d.groups = [...(d.groups || []), { id: gid, name: name.trim() }]; return d; });
      copyText(`${location.origin}${location.pathname}?group=${gid}`,
        "グループを作成し、招待リンクをコピーしました。友達に送ってください！");
    } catch (e) {
      console.error(e);
      alert("作成に失敗しました。Firestoreルールの更新が必要かもしれません。");
    }
    setGBusy(false);
  };

  const joinGroup = async () => {
    const raw = window.prompt("招待リンク（またはコード）を貼り付けてください");
    if (!raw) return;
    const m = raw.match(/group=([A-Za-z0-9]+)/);
    const gid = m ? m[1] : raw.trim();
    if (!gid) return;
    if ((data.groups || []).some((g) => g.id === gid)) { alert("すでに参加しています"); return; }
    setGBusy(true);
    try {
      const g = await joinGroupDocs(gid, user.uid, user.displayName || user.email || "メンバー");
      if (!g) {
        alert("グループが見つかりません。リンクを確認してください。");
      } else {
        update((d) => { d.groups = [...(d.groups || []), { id: gid, name: g.name }]; return d; });
        alert(`「${g.name}」に参加しました！`);
      }
    } catch (e) {
      console.error(e);
      alert("参加に失敗しました。");
    }
    setGBusy(false);
  };

  const leaveGroup = (g) => {
    if (!window.confirm(`「${g.name}」から退出しますか？`)) return;
    update((d) => { d.groups = (d.groups || []).filter((x) => x.id !== g.id); return d; });
    leaveGroupDocs(g.id, user.uid).catch(() => {});
  };

  const miniBtn = { padding: "6px 10px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.deepAqua, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 };

  const row = { display: "flex", alignItems: "center", gap: 10, padding: "13px 0", borderBottom: `1px solid ${C.line}` };
  const toggleBtn = (on, onClick, disabled) => (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "7px 16px", borderRadius: 999, border: "none", background: on ? C.deepAqua : C.line, color: on ? "#fff" : C.sub, fontWeight: 800, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
      {disabled ? "…" : on ? "ON" : "OFF"}
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(6,18,32,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="sheet" style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px calc(28px + env(safe-area-inset-bottom))" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 6 }}>⚙️ 設定</div>

        {/* アカウント */}
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>アカウント</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>{user ? (user.displayName || user.email) : "ゲストモード（このブラウザのみ保存）"}</div>
          </div>
          {user && (
            <button onClick={() => { signOut(auth); onClose(); }}
              style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
              ログアウト
            </button>
          )}
        </div>

        {/* プッシュ通知 */}
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>📲 プッシュ通知</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>
              {user ? "アプリを閉じていても開始時刻・リマインドが届きます" : "Googleログインすると利用できます"}
            </div>
          </div>
          {user && toggleBtn(pushOn, togglePush, busy)}
        </div>

        {/* 期限リマインド */}
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>🔔 期限リマインド</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>期限が今日・または過ぎた未完了タスクを1時間ごとに通知（8〜22時）</div>
          </div>
          {toggleBtn(data.settings.hourlyReminder, () => {
            if (!data.settings.hourlyReminder && "Notification" in window && Notification.permission === "default") {
              Notification.requestPermission().catch(() => {});
            }
            update((d) => { d.settings.hourlyReminder = !d.settings.hourlyReminder; return d; });
          }, false)}
        </div>

        {/* カレンダー共有 */}
        <div style={{ ...row, borderBottom: "none", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>📤 カレンダー共有</div>
          {!user ? (
            <div style={{ fontSize: 11, color: C.sub }}>Googleまたはメールでログインすると使えます</div>
          ) : (
            <>
              {/* 閲覧専用リンク */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontSize: 11, color: C.sub, lineHeight: 1.5 }}>
                  {data.shareId
                    ? "閲覧リンク発行中（見るだけ・タイトルと時間のみ共有）"
                    : "リンクを知っている人が見られる、閲覧専用リンクを発行"}
                </div>
                {data.shareId ? (
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => copyText(shareUrl, "リンクをコピーしました")} style={miniBtn}>コピー</button>
                    <button onClick={() => window.open(shareUrl, "_blank")} style={miniBtn}>開く</button>
                    <button onClick={stopShare} style={{ ...miniBtn, color: C.red, borderColor: "#F2C9C9" }}>停止</button>
                  </div>
                ) : (
                  <button onClick={createShare} disabled={gBusy}
                    style={{ padding: "7px 16px", borderRadius: 999, border: "none", background: gBusy ? "#BFDEDE" : C.aqua, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                    {gBusy ? "処理中…" : "発行"}
                  </button>
                )}
              </div>

              <div style={{ height: 1, background: C.line }} />

              {/* グループ */}
              <div style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                👥 グループ
                <span style={{ fontSize: 10, fontWeight: 600, color: C.sub, marginLeft: 6 }}>メンバー同士でカレンダーを見せ合う</span>
              </div>
              {(data.groups || []).length === 0 && (
                <div style={{ fontSize: 11, color: C.sub }}>まだ参加していません。作成するか、招待リンクで参加できます。</div>
              )}
              {(data.groups || []).map((g) => (
                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F0FAFA", borderRadius: 10, padding: "8px 10px" }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
                  <button onClick={() => copyText(`${location.origin}${location.pathname}?group=${g.id}`, "招待リンクをコピーしました")} style={miniBtn}>招待</button>
                  <button onClick={() => window.open(`${location.origin}${location.pathname}?group=${g.id}`, "_blank")} style={miniBtn}>開く</button>
                  <button onClick={() => leaveGroup(g)} style={{ ...miniBtn, color: C.red, borderColor: "#F2C9C9" }}>退出</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={createGroup} disabled={gBusy}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                  {gBusy ? "処理中…" : "＋ グループ作成"}
                </button>
                <button onClick={joinGroup} disabled={gBusy}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${C.deepAqua}`, background: "#fff", color: C.deepAqua, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                  コードで参加
                </button>
              </div>
            </>
          )}
        </div>

        <button onClick={onClose}
          style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 12, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function FocusLapApp() {
  const [user, setUser] = useState(undefined);         // undefined = 読み込み中
  const [guestMode, setGuestMode] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("focus");
  const [focusTaskId, setFocusTaskId] = useState("");
  const [help, setHelp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pushPromptDismissed, setPushPromptDismissed] = useState(
    () => localStorage.getItem("focuslap:pushPrompted") === "1"
  );
  const dismissPushPrompt = () => {
    localStorage.setItem("focuslap:pushPrompted", "1");
    setPushPromptDismissed(true);
  };

  // Firebase Auth の状態監視
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser(null);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // 画面が隠れている間は全アニメーションを停止（バッテリー節約）
  useEffect(() => {
    const onVis = () => document.documentElement.classList.toggle("app-paused", document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // 通知スケジューラ：開始時刻5分前の通知＆期限リマインド（1日1回）
  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const now = new Date();
      const today = todayStr();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      // 開始予定時刻の5分前に通知
      data.tasks.forEach((t) => {
        if (t.done || !t.startTime || t.due !== today) return;
        const [h, m] = t.startTime.split(":").map(Number);
        const startMin = h * 60 + m;
        const key = `focuslap:ntf:${today}:${t.id}`;
        if (nowMin >= startMin - 5 && nowMin <= startMin && !localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          appNotify(`${t.kind === "event" ? "🕐 まもなく予定" : "⏰ まもなく開始"}：${t.title}（${t.startTime}〜）`);
        }
      });
      // 期限リマインド：期限が今日or過去の未完了タスクを1時間ごとに通知（8〜22時）
      if (data.settings.hourlyReminder && nowMin >= 8 * 60 && nowMin <= 22 * 60) {
        const last = +localStorage.getItem("focuslap:lastDueReminder") || 0;
        if (Date.now() - last >= 3600000) {
          const dueToday = data.tasks.filter((t) => !t.done && t.kind !== "event" && t.due === today);
          const overdue = data.tasks.filter((t) => !t.done && t.kind !== "event" && t.due && t.due < today);
          if (dueToday.length + overdue.length > 0) {
            localStorage.setItem("focuslap:lastDueReminder", String(Date.now()));
            if (dueToday.length + overdue.length === 1) {
              const t = dueToday[0] || overdue[0];
              appNotify(dueToday.length ? `📅 今日が期限：${t.title}` : `⚠️ 期限超過：${t.title}（${t.due}）`);
            } else {
              const parts = [];
              if (dueToday.length) parts.push(`今日が期限${dueToday.length}件`);
              if (overdue.length) parts.push(`期限超過${overdue.length}件`);
              appNotify(`📝 未完了のタスク：${parts.join("・")}`);
            }
          }
        }
      }
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [data]);

  // ユーザーが決まったらデータをロード
  useEffect(() => {
    if (user === undefined) return;
    const uid = user?.uid ?? (guestMode ? "guest" : null);
    if (uid === null && !guestMode) return;
    (async () => {
      try {
        const raw = await loadUserData(user?.uid ?? null);
        const d = raw ?? DEFAULT_DATA;
        setData(migrateData(d));
      } catch { setData(DEFAULT_DATA); }
    })();
  }, [user, guestMode]);

  // データが変わったら保存（400ms デバウンス）＋共有先へカレンダーを同期
  const lastPushRef = useRef({});
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => {
      saveUserData(user?.uid ?? null, data).catch((e) => console.error("save failed", e));
      if (user) {
        const items = calendarItems(data);
        const json = JSON.stringify(items);
        // 個人共有リンク
        if (data.shareId && lastPushRef.current["s:" + data.shareId] !== json) {
          lastPushRef.current["s:" + data.shareId] = json;
          saveShareDoc(data.shareId, {
            owner: user.uid, ownerName: user.displayName || "",
            updatedAt: Date.now(), items,
          }).catch((e) => console.error("share sync failed", e));
        }
        // 参加中グループ
        (data.groups || []).forEach((g) => {
          const k = "g:" + g.id;
          if (lastPushRef.current[k] !== json) {
            lastPushRef.current[k] = json;
            saveGroupCalendar(g.id, user.uid, {
              name: user.displayName || user.email || "メンバー",
              updatedAt: Date.now(), items,
            }).catch((e) => console.error("group sync failed", e));
          }
        });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [data, user]);

  // ── ローディング中 ──
  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: C.deck, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontFamily: "sans-serif" }}>
        読み込み中…
      </div>
    );
  }

  // ── 未ログイン かつ ゲストモードでもない ──
  if (!user && !guestMode) {
    return (
      <LoginScreen onGuestLogin={() => setGuestMode(true)} />
    );
  }

  // ── データロード中 ──
  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: C.deck, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontFamily: "sans-serif" }}>
        データを読み込み中…
      </div>
    );
  }

  const update = (fn) => setData((d) => fn(structuredClone(d)));
  const growthOf = (taskId) => data.sessions.filter((s) => s.taskId === taskId).length;
  const goFocus = (id) => { setFocusTaskId(id); setTab("focus"); };

  const titles = { focus: "集中する", tasks: "タスク", cal: "カレンダー", goals: "目標・仕事", tank: "水槽" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#EAF8F9 0%,#C9E7ED 38%,#ABD6E0 72%,#96C9D6 100%)",
      color: C.ink,
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto",
    }}>
      <style>{`
        @keyframes bob    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes bubble { 0%{transform:translateY(0);opacity:.7} 100%{transform:translateY(-120px);opacity:0} }
        @keyframes drift  { 0%,100%{transform:translateX(0) scaleX(-1)} 48%{transform:translateX(26px) scaleX(-1)} 50%{transform:translateX(26px) scaleX(1)} 98%{transform:translateX(0) scaleX(1)} }
        @keyframes floatUp { 0%{transform:translateY(0);opacity:0} 8%{opacity:1} 100%{transform:translateY(-130vh);opacity:.5} }
        .app-paused * { animation-play-state: paused !important; }
        /* ボトムシート共通：モバイルで確実にスクロールできるようにする */
        .sheet { max-height: 85vh; max-height: 85dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; }
        /* 水中の立体感：白カードはふわっと浮かせ、上辺に水面の反射ハイライト */
        .wcard { box-shadow: 0 8px 22px rgba(13,60,84,0.12), inset 0 1.5px 0 rgba(255,255,255,0.9); }
        /* 深海パネル（タイマー・水槽・図鑑）：深い影＋アクアの縁光 */
        .dpanel { box-shadow: 0 18px 40px rgba(4,20,34,0.40), inset 0 1px 0 rgba(127,214,212,0.25); border: 1px solid rgba(127,214,212,0.20) !important; }
        button { transition: transform .08s ease, filter .15s ease; }
        button:active { transform: scale(.96); }
        button:hover { filter: brightness(1.05); }
        @media (prefers-reduced-motion:reduce){ *{animation:none !important;transition:none !important} }
      `}</style>

      {/* 背景の水中演出：差し込む光＋漂う泡 */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {/* 水面から差し込む光のカーテン */}
        <div style={{ position: "absolute", top: -120, left: "8%", width: 150, height: "72vh", background: "linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))", transform: "rotate(16deg)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", top: -140, left: "42%", width: 90, height: "60vh", background: "linear-gradient(180deg,rgba(255,255,255,0.38),rgba(255,255,255,0))", transform: "rotate(20deg)", filter: "blur(12px)" }} />
        <div style={{ position: "absolute", top: -100, right: "10%", width: 120, height: "55vh", background: "linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0))", transform: "rotate(-14deg)", filter: "blur(11px)" }} />
        {/* 深さのグラデーション（下ほど暗く） */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(255,255,255,0) 55%,rgba(23,70,96,0.10) 100%)" }} />
        {/* 漂う泡 */}
        {[[8, 75, 44, 38], [76, 95, 80, 55], [54, 82, 28, 30], [28, 92, 60, 47]].map(([l, t, s, dur], i) => (
          <div key={i} style={{
            position: "absolute", left: `${l}%`, top: `${t}%`, width: s, height: s, borderRadius: 999,
            border: "2px solid rgba(20,163,161,0.14)", background: "rgba(127,214,212,0.10)",
            boxShadow: "inset -4px -4px 8px rgba(255,255,255,0.35)",
            animation: `floatUp ${dur}s linear ${i * 7}s infinite`,
          }} />
        ))}
      </div>

      <header style={{ padding: "18px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: C.sub, fontWeight: 600 }}>FOCUS LAP</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{titles[tab]}</div>
            <button onClick={() => setHelp(true)} title="このタブの使い方"
              style={{ width: 22, height: 22, borderRadius: 999, border: "1.5px solid #9FBCC4", color: C.sub, background: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 800, cursor: "pointer", lineHeight: "19px", padding: 0 }}>?</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.sub, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user ? (user.displayName || user.email) : "ゲストモード"}
          </span>
          <button onClick={() => setSettingsOpen(true)} title="設定"
            style={{ width: 32, height: 32, borderRadius: 999, border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 15, padding: 0 }}>
            ⚙️
          </button>
        </div>
      </header>

      {/* ログイン済みで通知未設定の人への案内（1回だけ表示） */}
      {user && !pushPromptDismissed && localStorage.getItem("focuslap:pushOn") !== "1" && (
        <div style={{ margin: "0 16px 10px", padding: "10px 14px", background: "#E6F5F5", border: `1px solid ${C.aqua}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: 12, flex: 1, color: C.ink, fontWeight: 600 }}>📲 アプリを閉じていても通知を受け取れます</span>
          <button onClick={() => { setSettingsOpen(true); dismissPushPrompt(); }}
            style={{ padding: "6px 12px", borderRadius: 999, border: "none", background: C.aqua, color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
            設定する
          </button>
          <button onClick={dismissPushPrompt}
            style={{ border: "none", background: "none", color: C.sub, cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0 }}>×</button>
        </div>
      )}

      <main style={{ flex: 1, padding: "0 16px 96px", position: "relative", zIndex: 1 }}>
        <Suspense fallback={<div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "40px 0" }}>読み込み中…</div>}>
          {tab === "focus" && (
            <FocusTab data={data} update={update} growthOf={growthOf} taskId={focusTaskId} setTaskId={setFocusTaskId} />
          )}
          {tab === "tasks" && <TasksTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} uid={user?.uid} />}
          {tab === "cal"   && <CalendarTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} myUid={user?.uid} />}
          {tab === "goals" && <GoalsTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} />}
          {tab === "tank"  && <TankTab data={data} update={update} />}
        </Suspense>
      </main>

      {help && <HelpSheet tab={tab} title={titles[tab]} onClose={() => setHelp(false)} />}
      {settingsOpen && <SettingsSheet user={user} data={data} update={update} onClose={() => setSettingsOpen(false)} />}

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(14px) saturate(1.4)", WebkitBackdropFilter: "blur(14px) saturate(1.4)", borderTop: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 -10px 28px rgba(10,44,64,0.16)", display: "flex", zIndex: 10, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[["focus", IconFocus, "集中"], ["tasks", IconTasks, "タスク"], ["cal", IconCal, "予定"], ["goals", IconGoals, "目標"], ["tank", IconTank, "水槽"]].map(([k, Icon, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, padding: "8px 0 12px", background: "none", border: "none", cursor: "pointer", color: tab === k ? C.deepAqua : C.sub, fontWeight: tab === k ? 800 : 500, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
              <div style={{ padding: "3px 14px", borderRadius: 999, background: tab === k ? "#D9F0EF" : "transparent", transition: "background .2s" }}>
                <Icon size={20} />
              </div>
            </div>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
