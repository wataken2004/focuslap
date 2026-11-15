// タイマー開始時に呼ばれ、「終了ぴったりにプッシュ通知を送る」GitHub Actionsを起動する
// 必要な環境変数（Vercel）:
//   GH_DISPATCH_TOKEN … GitHubのfine-grainedトークン（Actions: Read and write）
//   VITE_FIREBASE_API_KEY … ログイン確認用（アプリと共通）
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { idToken, endAt } = req.body || {};
    const end = Number(endAt);
    const now = Date.now();
    if (!idToken || !end || end < now - 60000 || end > now + 4 * 3600000) {
      return res.status(400).json({ error: "bad request" });
    }
    // Firebaseのログイントークンを確認して本人のuidを得る（なりすまし防止）
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.VITE_FIREBASE_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) }
    );
    const uid = (await r.json()).users?.[0]?.localId;
    if (!uid) return res.status(401).json({ error: "unauthorized" });

    const gh = await fetch(
      "https://api.github.com/repos/wataken2004/focuslap/actions/workflows/timer-push.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GH_DISPATCH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main", inputs: { uid, endAt: String(end) } }),
      }
    );
    if (!gh.ok) {
      console.error("dispatch failed", gh.status, await gh.text());
      return res.status(502).json({ error: "dispatch failed" });
    }
    return res.status(204).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "error" });
  }
}
