import { describe, it, expect, vi, beforeEach } from "vitest";

// メモリ上の Firestore もどき（1ドキュメント・購読・トランザクション）
const server = { doc: null, subs: new Set() };
const notify = () => server.subs.forEach((cb) => cb({ exists: () => !!server.doc, data: () => structuredClone(server.doc), metadata: { hasPendingWrites: false } }));
vi.mock("./firebase.js", () => ({ isFirebaseConfigured: true, db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: () => ({}), getDoc: async () => ({ exists: () => !!server.doc, data: () => structuredClone(server.doc) }),
  setDoc: async (_r, v) => { server.doc = structuredClone(v); notify(); },
  deleteDoc: async () => {}, collection: () => ({}), getDocs: async () => ({ docs: [] }),
  onSnapshot: (_r, cb) => { server.subs.add(cb); return () => server.subs.delete(cb); },
  runTransaction: async (_db, fn) => {
    let write = null;
    const res = await fn({ get: async () => ({ exists: () => !!server.doc, data: () => structuredClone(server.doc) }), set: (_r, v) => { write = v; } });
    server.doc = structuredClone(write); notify();
    return res;
  },
}));
const { saveMerged, subscribeUserData, loadUserData } = await import("./storage.js");
const { merge3 } = await import("./sync.js");

// App.jsx と同じ流れの「端末」
async function device() {
  const dev = { base: await loadUserData("u") };
  dev.data = structuredClone(dev.base);
  dev.unsub = subscribeUserData("u", (remote) => {
    const m = merge3(dev.base, dev.data, remote);
    dev.base = remote; dev.data = m;
  });
  dev.save = async () => { const local = dev.data; dev.base = await saveMerged("u", dev.base, local); dev.data = merge3(local, dev.data, dev.base); };
  return dev;
}

const T = (id, title) => ({ id, title, due: "2026-11-17", done: false });

beforeEach(() => { server.doc = { payload: { tasks: [T("a", "英会話"), T("b", "簿記")], sessions: [], collection: {}, memos: {}, settings: {} } }; server.subs.clear(); });

describe("saveMerged / subscribeUserData — 2台同時", () => {
  it("購読していない古い画面が保存しても、他の端末の変更は残る", async () => {
    const pc = await device(); pc.unsub();          // PC：放置（受信が止まっている状態）
    const phone = await device();
    phone.data.tasks[0].done = true;
    phone.data.sessions.push({ date: "2026-11-17", minutes: 25, taskId: "a", fish: "🐟" });
    await phone.save();
    pc.data.tasks = pc.data.tasks.filter((t) => t.id !== "b"); // PCで古い画面のまま削除
    await pc.save();
    const p = server.doc.payload;
    expect(p.tasks).toEqual([{ ...T("a", "英会話"), done: true }]);
    expect(p.sessions).toHaveLength(1);
  });
  it("購読中の端末には他の端末の変更が届き、未保存の変更も残る", async () => {
    const pc = await device(), phone = await device();
    pc.data.tasks.push(T("p", "PCで追加（未保存）"));
    phone.data.tasks[1].title = "簿記1級";
    await phone.save();
    expect(pc.data.tasks.map((t) => t.title)).toEqual(["英会話", "簿記1級", "PCで追加（未保存）"]);
    await pc.save();
    expect(server.doc.payload.tasks.map((t) => t.title)).toEqual(["英会話", "簿記1級", "PCで追加（未保存）"]);
    expect(phone.data.tasks).toHaveLength(3); // スマホにも届く
  });
});
