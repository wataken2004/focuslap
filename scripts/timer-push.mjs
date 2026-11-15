// 集中タイマーの終了時刻まで待ち、まだそのタイマーが有効なら終了通知を送る
// （timer-push.yml から起動。5分おきの send-push.mjs はバックアップとして残す）
import admin from "firebase-admin";
import webpush from "web-push";

const uid = process.env.UID;
const endAt = Number(process.env.END_AT);
if (!uid || !endAt) throw new Error("UID / END_AT missing");

// 終了時刻＋3秒まで待つ（アプリが開いていて自分で終了処理した場合は、その間に pendingSession が消える）
const wait = endAt + 3000 - Date.now();
if (wait > 0) {
  console.log(`waiting ${Math.round(wait / 1000)}s`);
  await new Promise((r) => setTimeout(r, wait));
}

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
webpush.setVapidDetails(
  "mailto:wataken2004agu@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const userRef = db.collection("users").doc(uid);
const d = (await userRef.collection("data").doc("main").get()).data()?.payload || {};
const ps = d.pendingSession;
if (!ps || ps.endAt !== endAt) {
  console.log("timer was cancelled / finished in app -> skip");
  process.exit(0);
}

// 5分おきのチェックと二重送信しないよう、同じ送信済みキーを使う
const stateRef = userRef.collection("pushMeta").doc("state");
const key = `end:${endAt}`;
const ok = await db.runTransaction(async (tx) => {
  const st = (await tx.get(stateRef)).data() || {};
  if (st.sent?.[key]) return false;
  tx.set(stateRef, { sent: { ...(st.sent || {}), [key]: true } }, { merge: true });
  return true;
});
if (!ok) { console.log("already sent"); process.exit(0); }

const msg = { title: "⏱ 集中終了！", body: `${ps.minutes}分やりきった！アプリに戻って魚を受け取ろう 🐟` };
let sent = 0;
for (const subDoc of (await userRef.collection("push").get()).docs) {
  try {
    await webpush.sendNotification(JSON.parse(subDoc.data().sub), JSON.stringify(msg));
    sent++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      console.log(`subscription expired (${e.statusCode}) -> deleted`);
      await subDoc.ref.delete();
    } else console.error("send failed", e.statusCode || e.message);
  }
}
console.log(`done: ${sent} sent (delay ${Math.round((Date.now() - endAt) / 1000)}s)`);
