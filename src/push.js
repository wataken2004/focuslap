// アプリを閉じていても届くプッシュ通知の購読処理（Web Push）
import { isFirebaseConfigured, db, auth } from "./firebase.js";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// 購読を取得（無ければ新規作成）してFirestoreに保存する
async function subscribeAndSave(uid) {
  const reg = await navigator.serviceWorker.register("./sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }
  // エンドポイント末尾からドキュメントIDを生成（端末ごとに1件）
  const key = sub.endpoint.replace(/[^a-zA-Z0-9]/g, "").slice(-48);
  await setDoc(doc(db, "users", uid, "push", key), {
    sub: JSON.stringify(sub),
    ua: navigator.userAgent.slice(0, 200),
    ts: Date.now(),
  });
}

/**
 * 起動時の自己修復：「有効」にしている端末の購読を確認し、
 * iOSによる購読の失効やサーバー側での削除があっても自動で登録し直す。
 * （通知許可済みなので確認ダイアログは出ない）
 * 戻り値: true=有効を維持 / false=許可が取り消されている
 */
export async function resyncPush(uid) {
  if (!uid || !isFirebaseConfigured || !VAPID_PUBLIC) return true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return true;
  if (Notification.permission !== "granted") return false;
  try {
    await subscribeAndSave(uid);
  } catch (e) {
    console.error("push resync failed", e);
  }
  return true;
}

/**
 * プッシュ通知を有効化して購読情報をFirestoreに保存する。
 * 戻り値: { ok: true } または { ok: false, reason: "login"|"unsupported"|"denied"|"error" }
 */
export async function enablePush(uid) {
  if (!uid || !isFirebaseConfigured) return { ok: false, reason: "login" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC) {
    return { ok: false, reason: "unsupported" };
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };
  try {
    await subscribeAndSave(uid);
    return { ok: true };
  } catch (e) {
    console.error("push subscribe failed", e);
    return { ok: false, reason: "error" };
  }
}

/** プッシュ通知を無効化して購読情報をFirestoreから削除する */
export async function disablePush(uid) {
  try {
    if (!("serviceWorker" in navigator)) return { ok: true };
    const reg = await navigator.serviceWorker.register("./sw.js");
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const key = sub.endpoint.replace(/[^a-zA-Z0-9]/g, "").slice(-48);
      await sub.unsubscribe();
      if (uid && isFirebaseConfigured) {
        await deleteDoc(doc(db, "users", uid, "push", key)).catch(() => {});
      }
    }
    return { ok: true };
  } catch (e) {
    console.error("push unsubscribe failed", e);
    return { ok: false };
  }
}

/**
 * 集中タイマー開始時に呼ぶ：終了ぴったりにプッシュ通知を送るようサーバーに予約する。
 * （失敗しても5分おきのチェックがバックアップとして通知する）
 */
export async function scheduleTimerPush(endAt) {
  try {
    if (!isFirebaseConfigured || localStorage.getItem("focuslap:pushOn") !== "1") return;
    const user = auth?.currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    await fetch("/api/schedule-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, endAt }),
      keepalive: true,
    });
  } catch (e) {
    console.error("schedule push failed", e);
  }
}
