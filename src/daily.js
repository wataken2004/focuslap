/* 毎日の繰り返しタスクの「やらなかった回」を自動で片付ける（純粋関数・依存なし）
   - アプリ（App.jsx）と push 送信スクリプト（scripts/send-push.mjs）の両方から使う
   - 対象：repeat === "daily" ・未完了・期限が今日より前・進捗や引き継ぎメモが無い回
     （手を付けた回は勝手に消さず、従来どおり期限超過として残す）
   - 事前生成の系列（repeatGroup あり）：その回を削除（次の回はすでに並んでいる）
   - 完了で次を作る系列（repeatGroup なし）：期限を今日へ繰り越す（1件しか無いので消すと系列が途切れる） */

export const isMissedDaily = (t, today) =>
  !!t && !t.done && t.kind !== "event" && t.repeat === "daily" &&
  !!t.due && t.due < today && !(t.progress > 0) && !t.progressNote;

// 設定がOFFなら何もしない（未設定＝ON）
export const skipEnabled = (d) => d?.settings?.skipMissedDaily !== false;

// d を直接書き換える。戻り値：{ removed: タイトル配列, moved: タイトル配列 }
export function skipMissedDaily(d, today) {
  const res = { removed: [], moved: [] };
  if (!skipEnabled(d) || !Array.isArray(d.tasks)) return res;
  const del = new Set();
  d.tasks.forEach((t) => {
    if (!isMissedDaily(t, today)) return;
    if (t.repeatGroup) { del.add(t.id); res.removed.push(t.title); }
    else {
      // repeatUntil を過ぎた系列は繰り越さず片付ける
      if (t.repeatUntil && t.repeatUntil < today) { del.add(t.id); res.removed.push(t.title); }
      else { t.due = today; res.moved.push(t.title); }
    }
  });
  if (del.size) {
    d.tasks = d.tasks.filter((t) => !del.has(t.id));
    d.tasks.forEach((t) => { if (t.nextId && del.has(t.nextId)) delete t.nextId; });
  }
  return res;
}

export const countMissedDaily = (d, today) =>
  skipEnabled(d) ? (d.tasks || []).filter((t) => isMissedDaily(t, today)).length : 0;
