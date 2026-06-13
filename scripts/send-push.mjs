// GitHub Actions から5分ごとに実行されるプッシュ通知送信スクリプト
// 必要な環境変数:
//   FIREBASE_SERVICE_ACCOUNT … Firebaseサービスアカウントの JSON 文字列
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY … Web Push の VAPID 鍵
import admin from "firebase-admin";
import webpush from "web-push";

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

webpush.setVapidDetails(
  "mailto:wataken2004agu@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 日本時間で現在時刻を計算
const jst = new Date(Date.now() + 9 * 3600 * 1000);
const today = jst.toISOString().slice(0, 10);
const nowMin = jst.getUTCHours() * 60 + jst.getUTCMinutes();

const userRefs = await db.collection("users").listDocuments();
let sentCount = 0;

for (const userRef of userRefs) {
  try {
    const dataSnap = await userRef.collection("data").doc("main").get();
    if (!dataSnap.exists) continue;
    const d = dataSnap.data().payload || {};
    const tasks = d.tasks || [];

    // この端末の購読情報
    const subsSnap = await userRef.collection("push").get();
    if (subsSnap.empty) continue;

    // 送信済み管理（重複防止）
    const stateRef = userRef.collection("pushMeta").doc("state");
    const state = (await stateRef.get()).data() || {};
    const sent = state.sent || {};
    let lastDue = state.lastDue || 0;
    const messages = [];

    // ① 開始予定時刻の通知（10分前〜定刻の間に1回だけ）
    for (const t of tasks) {
      if (t.done || !t.startTime || t.due !== today) continue;
      const [h, m] = t.startTime.split(":").map(Number);
      const startMin = h * 60 + m;
      const key = `${today}:${t.id}`;
      if (nowMin >= startMin - 10 && nowMin <= startMin && !sent[key]) {
        sent[key] = true;
        messages.push({ title: "⏰ まもなく開始", body: `${t.title}（${t.startTime}〜）` });
      }
    }

    // ② 期限リマインド：期限が今日or過去の未完了タスクを1時間ごと（8〜22時JST）
    if (d.settings?.hourlyReminder && nowMin >= 8 * 60 && nowMin <= 22 * 60 && Date.now() - lastDue >= 3600000) {
      const dueToday = tasks.filter((t) => !t.done && t.due === today);
      const overdue = tasks.filter((t) => !t.done && t.due && t.due < today);
      if (dueToday.length + overdue.length > 0) {
        lastDue = Date.now();
        if (dueToday.length + overdue.length === 1) {
          const t = dueToday[0] || overdue[0];
          messages.push(dueToday.length
            ? { title: "📅 今日が期限", body: t.title }
            : { title: "⚠️ 期限超過", body: `${t.title}（${t.due}）` });
        } else {
          const parts = [];
          if (dueToday.length) parts.push(`今日が期限${dueToday.length}件`);
          if (overdue.length) parts.push(`期限超過${overdue.length}件`);
          messages.push({ title: "📝 未完了のタスク", body: parts.join("・") });
        }
      }
    }

    // ③ 集中セッション終了の通知（終了後3時間以内・1回だけ。魚の名前は開けてのお楽しみ）
    const ps = d.pendingSession;
    if (ps && ps.endAt && Date.now() >= ps.endAt && Date.now() - ps.endAt < 3 * 3600000) {
      const key = `end:${ps.endAt}`;
      if (!sent[key]) {
        sent[key] = true;
        messages.push({ title: "⏱ 集中終了！", body: `${ps.minutes}分やりきった！アプリに戻って魚を受け取ろう 🐟` });
      }
    }

    if (messages.length === 0) continue;

    // 古い送信済みキーを掃除して保存（今日の分とここ24時間のセッション終了分だけ残す）
    const pruned = {};
    for (const k of Object.keys(sent)) {
      if (k.startsWith(today)) pruned[k] = true;
      else if (k.startsWith("end:") && Date.now() - (+k.slice(4) || 0) < 86400000) pruned[k] = true;
    }
    await stateRef.set({ sent: pruned, lastDue });

    // 全端末に送信（無効になった購読は削除）
    for (const subDoc of subsSnap.docs) {
      let sub;
      try { sub = JSON.parse(subDoc.data().sub); } catch { continue; }
      for (const msg of messages) {
        try {
          await webpush.sendNotification(sub, JSON.stringify(msg));
          sentCount++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) {
            await subDoc.ref.delete();
            break;
          }
          console.error("send failed", e.statusCode || e.message);
        }
      }
    }
  } catch (e) {
    console.error("user processing failed", e.message);
  }
}

console.log(`done: ${sentCount} notifications sent`);
