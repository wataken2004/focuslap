// アプリを閉じていても届くプッシュ通知の購読処理（Web Push）
import { isFirebaseConfigured, db } from "./firebase.js";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
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
    const reg = await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
    // エンドポイント末尾からドキュメントIDを生成（端末ごとに1件）
    const key = sub.endpoint.replace(/[^a-zA-Z0-9]/g, "").slice(-48);
    await setDoc(doc(db, "users", uid, "push", key), {
      sub: JSON.stringify(sub),
      ua: navigator.userAgent.slice(0, 200),
      ts: Date.now(),
    });
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
