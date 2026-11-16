/* 複数端末の同時利用で変更が消えないようにする3者マージ（純粋関数・依存なし）
   base   = この端末が最後にサーバーと一致していたデータ
   local  = この端末の今のデータ（base からの変更を含む）
   remote = サーバーの最新データ（他の端末の変更を含む）
   方針：「この端末で変えたところ」だけを remote の上に重ねる。変えていないところは remote を採用。
   - id を持つ配列（tasks/goals/archive/groups）：要素ごと。両方で変えたらこの端末の方を優先。
     この端末で消したが他端末で変更されていた要素は残す（変更を消さない側に倒す）
   - sessions（id なし・追記のみ）：同一内容の件数を remote + (local - base) で合わせる
   - collection（魚の数）：数値の差分を足す
   - memos / settings：キーごとに3者比較
   - escapes：日付が新しい方、同じ日なら大きい方 */

const J = (x) => JSON.stringify(x ?? null);
const same = (a, b) => J(a) === J(b);

// 単純な値：この端末で変えていればこの端末、そうでなければ remote
const pick = (b, l, r) => (same(l, b) ? r : l);

function mergeById(base = [], local = [], remote = []) {
  const idOf = (x) => x?.id;
  const B = new Map(base.map((x) => [idOf(x), x]));
  const L = new Map(local.map((x) => [idOf(x), x]));
  const R = new Map(remote.map((x) => [idOf(x), x]));
  const out = [];
  const seen = new Set();
  // remote の並びを基準にする
  remote.forEach((r) => {
    const id = idOf(r); seen.add(id);
    const b = B.get(id), l = L.get(id);
    if (l === undefined) {
      // この端末に無い：この端末で消した（base にあった）なら、他端末で変更されていない限り消す
      if (b !== undefined && same(b, r)) return;
      out.push(r);
      return;
    }
    out.push(b !== undefined && same(l, b) ? r : l);
  });
  // この端末で新しく追加したもの（remote に無い）
  local.forEach((l) => {
    const id = idOf(l);
    if (seen.has(id)) return;
    const b = B.get(id);
    // base にあって remote に無い＝他端末で消された。この端末で変更していなければ消えたままにする
    if (b !== undefined && same(l, b)) return;
    out.push(l);
  });
  return out;
}

function mergeMultiset(base = [], local = [], remote = []) {
  const count = (arr) => { const m = new Map(); arr.forEach((x) => { const k = J(x); m.set(k, (m.get(k) || 0) + 1); }); return m; };
  const B = count(base), L = count(local);
  const out = [...remote];
  // この端末で増えた分を足す
  const added = new Map();
  L.forEach((n, k) => { const d = n - (B.get(k) || 0); if (d > 0) added.set(k, d); });
  local.forEach((x) => {
    const k = J(x), d = added.get(k);
    if (d > 0) { out.push(x); added.set(k, d - 1); }
  });
  // この端末で減った分を引く
  B.forEach((n, k) => {
    let d = n - (L.get(k) || 0);
    for (let i = out.length - 1; i >= 0 && d > 0; i--) if (J(out[i]) === k) { out.splice(i, 1); d--; }
  });
  return out;
}

function mergeKeys(base = {}, local = {}, remote = {}, numeric = false) {
  const out = { ...remote };
  new Set([...Object.keys(base), ...Object.keys(local)]).forEach((k) => {
    if (numeric) {
      const d = (local[k] || 0) - (base[k] || 0);
      if (d) out[k] = Math.max(0, (remote[k] || 0) + d);
      return;
    }
    if (same(local[k], base[k])) return;      // この端末で変えていない
    if (local[k] === undefined) delete out[k]; // この端末で消した
    else out[k] = local[k];
  });
  return out;
}

const BY_ID = new Set(["tasks", "goals", "archive", "groups"]);

export function merge3(base, local, remote) {
  if (!remote) return local;
  if (!base) base = remote;   // 初回など base が無いときは「全部この端末の変更」扱いにしない
  if (!local) return remote;
  const out = { ...remote };
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
  keys.forEach((k) => {
    const b = base[k], l = local[k], r = remote[k];
    if (BY_ID.has(k)) out[k] = mergeById(b, l, r);
    else if (k === "sessions") out[k] = mergeMultiset(b, l, r);
    else if (k === "collection") out[k] = mergeKeys(b, l, r, true);
    else if (k === "memos" || k === "settings") out[k] = mergeKeys(b, l, r);
    else if (k === "escapes" || k === "escapesDate") return; // 下でまとめて
    else { const v = pick(b, l, r); if (v === undefined) delete out[k]; else out[k] = v; }
  });
  // 逃げた魚：日付が新しい方。同じ日なら多い方
  const ld = local.escapesDate || "", rd = remote.escapesDate || "";
  if (ld > rd) { out.escapesDate = ld; out.escapes = local.escapes || 0; }
  else if (rd > ld) { out.escapesDate = rd; out.escapes = remote.escapes || 0; }
  else { out.escapesDate = rd; out.escapes = Math.max(local.escapes || 0, remote.escapes || 0); }
  return out;
}

export const sameData = same;
