import { isFirebaseConfigured, db } from "./firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
