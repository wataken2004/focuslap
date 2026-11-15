/* FocusLap オリジナル図柄（絵文字の置き換え）
   線画＋ところどころに泡の点。海のモチーフで統一：
   目標＝灯台 / 仕事＝舵輪 / グループ＝魚の群れ / 共有＝ボトルメール / 図鑑＝魚の本 など
   使い方: <G n="bell" />（色は currentColor、サイズは size） */

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

const D = {
  // ⏱ ポモドーロ（砂時計型タイマー）
  timer: <><circle cx="12" cy="13.5" r="7" /><path d="M12 10v3.6l2.4 1.6" /><path d="M10 3.5h4" /><path d="M12 3.5v3" /></>,
  // ⏲ ストップウォッチ（計り上げ：矢印つき）
  stopwatch: <><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5 L15.5 10" /><path d="M10 3.5h4" /><path d="M18.2 6.2l1.4-1.4" /><circle cx="12" cy="13.5" r="0.9" fill="currentColor" stroke="none" /></>,
  // 📱 スマホ
  phone: <><rect x="7" y="2.8" width="10" height="18.4" rx="2.6" /><path d="M10.5 18h3" /></>,
  // 📲 プッシュ通知（スマホ＋波紋）
  push: <><rect x="5" y="4" width="9.5" height="16.5" rx="2.4" /><path d="M8.5 17.6h2.5" /><path d="M17.5 8.5a4 4 0 0 1 0 5" /><path d="M19.8 6.4a7 7 0 0 1 0 9.2" /></>,
  // 🔔 ベル
  bell: <><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.8H5z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /><circle cx="19.6" cy="5" r="1.1" /></>,
  // 🔁 繰り返し（波のループ）
  repeat: <><path d="M5 10.5a7 7 0 0 1 12.4-3.6L19 8.6" /><path d="M19 4.5v4.1h-4.1" /><path d="M19 13.5a7 7 0 0 1-12.4 3.6L5 15.4" /><path d="M5 19.5v-4.1h4.1" /></>,
  // ✏️ 鉛筆
  pencil: <><path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.9L8.7 18.5z" /><path d="M13.8 7l3.2 3.2" /></>,
  // ✎ 編集（短い鉛筆）
  edit: <><path d="M5 19l.8-3.6L15.4 5.8a1.8 1.8 0 0 1 2.6 0l.2.2a1.8 1.8 0 0 1 0 2.6L8.6 18.2z" /></>,
  // 📊 進捗（上昇する泡のグラフ）
  chart: <><path d="M4 20h16" /><rect x="5.5" y="13" width="3" height="5" rx="1" /><rect x="10.5" y="9.5" width="3" height="8.5" rx="1" /><rect x="15.5" y="6" width="3" height="12" rx="1" /><circle cx="17" cy="3" r="0.9" /></>,
  // ✓ チェック
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  // ✅ 完了（丸＋チェック）
  done: <><circle cx="12" cy="12" r="8.5" /><path d="M8 12.3l2.8 2.8L16.2 9.5" /></>,
  // ☐ 未完了
  todo: <circle cx="12" cy="12" r="8.5" />,
  // 🗑 ごみ箱
  trash: <><path d="M5 7h14" /><path d="M9.5 7V5h5v2" /><path d="M7 7l1 12.5h8L17 7" /><path d="M10.5 10.5v6M13.5 10.5v6" /></>,
  // 🕐 時計（予定）
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  // ⏰ アラーム（開始時刻）
  alarm: <><circle cx="12" cy="13" r="7" /><path d="M12 9.5V13l2.3 1.5" /><path d="M4.5 6.5l2.5-2" /><path d="M19.5 6.5l-2.5-2" /></>,
  // 🐟 自分（一匹の魚）
  fish: <><path d="M3.5 12c2.8-4 8.6-5 12.5-1.6L20.5 7v10L16 13.6C12.1 17 6.3 16 3.5 12z" /><circle cx="8" cy="11.2" r="0.9" fill="currentColor" stroke="none" /></>,
  // 👥 グループ（魚の群れ）
  school: <><path d="M2.5 9c1.6-2.2 4.8-2.7 7-.9L12 6.2v5.6l-2.5-1.9c-2.2 1.8-5.4 1.3-7-.9z" /><path d="M10.5 16c1.6-2.2 4.8-2.7 7-.9L20 13.2v5.6l-2.5-1.9c-2.2 1.8-5.4 1.3-7-.9z" /><circle cx="17" cy="5.5" r="1" /><circle cx="20" cy="8.5" r="0.7" /></>,
  // 📤 共有（ボトルメール）
  share: <><path d="M14.5 3.5l6 6" /><path d="M16 5l-1.5 1.5" /><path d="M15.5 8.5l-9 9a2.5 2.5 0 0 1-3.5-3.5l9-9z" /><path d="M8 14.5l3-3" /><path d="M3 21.5c2-1 4-1 6 0s4 1 6 0" /></>,
  // 🎯 目標（灯台）
  goal: <><path d="M9.5 21l1-12h3l1 12" /><path d="M9 9h6" /><path d="M10 9V6.5a2 2 0 0 1 4 0V9" /><path d="M10.2 14.5h3.6" /><path d="M4 5.5l3.5 1.5M20 5.5l-3.5 1.5" /><path d="M6.5 21h11" /></>,
  // 💼 仕事（舵輪）
  work: <><circle cx="12" cy="12" r="5.5" /><circle cx="12" cy="12" r="1.6" /><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5" /></>,
  // 📌 割り振り（ピン）
  pin: <><path d="M12 21v-6" /><path d="M8 15h8l-1.5-4V5.5h-5V11z" /><path d="M8.5 5.5h7" /></>,
  // 🔒 鍵
  lock: <><rect x="5.5" y="10.5" width="13" height="10" rx="2.4" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /><path d="M12 14.5v2.5" /></>,
  // 📖 図鑑（魚の本）
  book: <><path d="M12 6.5c-2-1.6-5-2-8-1.5v13c3-.5 6-.1 8 1.5 2-1.6 5-2 8-1.5V5c-3-.5-6-.1-8 1.5z" /><path d="M12 6.5v13" /><path d="M14.5 11.5c.9-1.2 2.6-1.4 3.6-.5l.9-.8v3l-.9-.8c-1 .9-2.7.7-3.6-.5z" /></>,
  // 🔍 振り返り（虫めがね＋泡）
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /><circle cx="8.6" cy="8.6" r="1.2" /></>,
  // ⚙️ 設定（歯車）
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /><circle cx="12" cy="12" r="6.5" /></>,
  // 💡 使い方（真珠と貝）
  tip: <><path d="M3.5 15c0-5 3.8-9 8.5-9s8.5 4 8.5 9z" /><path d="M8 15c0-3 1.8-5.5 4-5.5s4 2.5 4 5.5" /><path d="M5 18.5h14" /><circle cx="12" cy="15" r="0.1" /></>,
  // ⚠️ 注意
  warn: <><path d="M12 4l9 15.5H3z" /><path d="M12 10v4.5" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></>,
  // 🥚 たまご（魚卵のつぶ）
  roe: <><circle cx="9" cy="14" r="4" /><circle cx="15.5" cy="11" r="3.2" /><circle cx="13.5" cy="17.5" r="2.4" /><circle cx="8" cy="12.6" r="0.9" fill="currentColor" stroke="none" /></>,
  // 💨 逃げた
  escape: <><path d="M3 9h10a3 3 0 1 0-3-3" /><path d="M3 14h14a3 3 0 1 1-3 3" /><path d="M3 19h6" /></>,
  // ＋
  plus: <path d="M12 5v14M5 12h14" />,
  // 🫧 泡（空っぽの表示）
  bubbles: <><circle cx="10" cy="13" r="6" /><circle cx="18" cy="6.5" r="2.6" /><circle cx="18.5" cy="14.5" r="1.4" /><path d="M7 11a3 3 0 0 1 2.6-2.4" /></>,
};

export function G({ n, size = 16, style, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...P}
      style={{ display: "inline-block", verticalAlign: "-0.18em", flexShrink: 0, ...style }}
      role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {D[n]}
    </svg>
  );
}

/* ---- 水槽の飾り（🪸🌿🐚の置き換え） ---- */
export const Coral = ({ size = 26, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={style} aria-hidden="true">
    <path d="M16 31 V18 M16 22 C12 20 10 16 10 11 M16 19 C20 17 22 13 22 8 M10 14 C7 13 6 10 6 7 M22 11 C25 10 26 8 26 5"
      stroke="#F07C8A" strokeWidth="3" fill="none" strokeLinecap="round" />
    {[[10, 11], [22, 8], [6, 7], [26, 5], [16, 18]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#FFB7C0" />)}
  </svg>
);
export const Kelp = ({ size = 26, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={style} aria-hidden="true">
    <path d="M12 31 C8 25 16 21 12 15 C9 11 14 7 12 2" stroke="#3FAE7E" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M20 31 C17 26 23 23 20 18 C18 15 21 12 20 9" stroke="#2F8F68" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <ellipse cx="15" cy="12" rx="2.6" ry="1.2" fill="#6CCB9D" transform="rotate(-30 15 12)" />
    <ellipse cx="9.5" cy="20" rx="2.6" ry="1.2" fill="#6CCB9D" transform="rotate(30 9.5 20)" />
  </svg>
);
export const Shell = ({ size = 20, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={style} aria-hidden="true">
    <path d="M4 24 C4 13 10 6 16 6 C22 6 28 13 28 24 Z" fill="#FBE3D2" stroke="#E2A889" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M16 24 V8 M16 24 L9 10 M16 24 L23 10 M16 24 L5.5 17 M16 24 L26.5 17" stroke="#E2A889" strokeWidth="1.3" />
    <rect x="12" y="23" width="8" height="4" rx="1.5" fill="#E2A889" />
  </svg>
);
