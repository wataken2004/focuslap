import { isFirebaseConfigured, db } from "./firebase.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

/** ユーザーIDに紐づいたデータを取得 */
export async function loadUserData(uid) {
  if (isFirebaseConfigured && uid) {
    try {
      const snap = await getDoc(doc(db, "users", uid, "data", "main"));
      return snap.exists() ? snap.data().payload : null;
    } catch (e) {
      console.error("Firestore load failed, falling back to localStorage", e);
    }
  }
  const v = localStorage.getItem("focuslap:data");
  return v ? JSON.parse(v) : null;
}

/** ユーザーIDに紐づいたデータを保存 */
export async function saveUserData(uid, data) {
  if (isFirebaseConfigured && uid) {
    try {
      await setDoc(doc(db, "users", uid, "data", "main"), { payload: data });
      return;
    } catch (e) {
      console.error("Firestore save failed, falling back to localStorage", e);
    }
  }
  localStorage.setItem("focuslap:data", JSON.stringify(data));
}

/* ---------- カレンダー共有（shares/{shareId}・閲覧専用の秘密リンク） ---------- */

/** 共有ドキュメントを保存（オーナーのみ書ける。ルールでownerを検証） */
export async function saveShareDoc(shareId, payload) {
  if (!isFirebaseConfigured || !shareId) return;
  await setDoc(doc(db, "shares", shareId), payload);
}

/** 共有を停止（ドキュメント削除） */
export async function deleteShareDoc(shareId) {
  if (!isFirebaseConfigured || !shareId) return;
  await deleteDoc(doc(db, "shares", shareId));
}

/** 共有カレンダーを読む（ログイン不要・リンクを知っている人だけ） */
export async function loadShareDoc(shareId) {
  if (!isFirebaseConfigured || !shareId) return null;
  const snap = await getDoc(doc(db, "shares", shareId));
  return snap.exists() ? snap.data() : null;
}

/* ---------- グループ共有（groups/{gid}・メンバー同士でカレンダーを見せ合う） ---------- */

/** グループを新規作成（本体＋自分をメンバー登録） */
export async function createGroupDocs(gid, name, uid, userName) {
  await setDoc(doc(db, "groups", gid), { name, createdBy: uid, createdAt: Date.now() });
  await setDoc(doc(db, "groups", gid, "members", uid), { name: userName, joinedAt: Date.now() });
}

/** 招待コードでグループに参加。存在すればグループ情報を返す */
export async function joinGroupDocs(gid, uid, userName) {
  const g = await getDoc(doc(db, "groups", gid));
  if (!g.exists()) return null;
  await setDoc(doc(db, "groups", gid, "members", uid), { name: userName, joinedAt: Date.now() });
  return g.data();
}

/** グループから退出（メンバー登録と自分のカレンダーを削除） */
export async function leaveGroupDocs(gid, uid) {
  await deleteDoc(doc(db, "groups", gid, "calendars", uid)).catch(() => {});
  await deleteDoc(doc(db, "groups", gid, "members", uid));
}

/** 自分のカレンダーをグループへ同期 */
export async function saveGroupCalendar(gid, uid, payload) {
  if (!isFirebaseConfigured || !gid || !uid) return;
  await setDoc(doc(db, "groups", gid, "calendars", uid), payload);
}

/** グループの全データを読む（メンバーのみ成功。非メンバーはpermission-deniedで失敗する） */
export async function loadGroupData(gid) {
  const gSnap = await getDoc(doc(db, "groups", gid));
  if (!gSnap.exists()) return null;
  const mem = await getDocs(collection(db, "groups", gid, "members"));
  const cal = await getDocs(collection(db, "groups", gid, "calendars"));
  const evs = await getDocs(collection(db, "groups", gid, "events")).catch(() => ({ docs: [] }));
  return {
    group: gSnap.data(),
    members: mem.docs.map((d) => ({ uid: d.id, ...d.data() })),
    calendars: cal.docs.map((d) => ({ uid: d.id, ...d.data() })),
    events: evs.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

/** グループ共有の予定を追加（メンバー全員に見える） */
export async function addGroupEvent(gid, ev) {
  await setDoc(doc(db, "groups", gid, "events", ev.id), ev);
}

/** グループ共有の予定を削除（作成者のみ。ルールで検証） */
export async function deleteGroupEvent(gid, eventId) {
  await deleteDoc(doc(db, "groups", gid, "events", eventId));
}
