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
    let lastHourly = state.lastHourly || 0;
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

    // ② 1時間ごとの未完了リマインド（8時〜22時のみ）
    if (d.settings?.hourlyReminder) {
      const open = tasks.filter((t) => !t.done).length;
      if (open > 0 && Date.now() - lastHourly >= 3600000 && nowMin >= 8 * 60 && nowMin <= 22 * 60) {
        lastHourly = Date.now();
        messages.push({ title: "📝 リマインド", body: `未完了のタスクが${open}件あります` });
      }
    }

    if (messages.length === 0) continue;

    // 今日以外の送信済みキーを掃除して保存
    const pruned = {};
    for (const k of Object.keys(sent)) if (k.startsWith(today)) pruned[k] = true;
    await stateRef.set({ sent: pruned, lastHourly });

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
