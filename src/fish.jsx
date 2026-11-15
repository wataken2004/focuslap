/* オリジナル魚のSVGモデル（全11種）— 海中イラスト調
   ・背は濃く腹は明るい「カウンターシェーディング」のグラデーション
   ・半透明のヒレ＋ひれすじ、ハイライト、瞳の映り込みで水中の立体感を出す
   ・全員左向き（drift等のscaleXで反転）。viewBox は 0 0 120 80
   ・グラデーションIDは個体ごとにuseIdで一意化（同じ画面に何匹いても崩れない） */
import { useId } from "react";

/* ---- 共通パーツ ---- */
// 縦グラデーション（上=背、下=腹）
const VGrad = ({ id, stops }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    {stops.map(([o, c, a = 1], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a} />)}
  </linearGradient>
);
// 目：白目＋前寄りの瞳＋光の映り込み
const Eye = ({ x, y, r = 5, iris = "#0B1B2B", ring }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#FFFFFF" />
    {ring && <circle cx={x} cy={y} r={r} fill="none" stroke={ring} strokeWidth={r * 0.28} />}
    <circle cx={x - r * 0.22} cy={y + r * 0.05} r={r * 0.58} fill={iris} />
    <circle cx={x - r * 0.42} cy={y - r * 0.3} r={r * 0.24} fill="#FFFFFF" />
  </g>
);
// ひれすじ（扇状の細線）
const Rays = ({ from, to, color, w = 1, o = 0.5 }) => (
  <g stroke={color} strokeWidth={w} strokeLinecap="round" opacity={o} fill="none">
    {to.map(([x, y], i) => <path key={i} d={`M${from[0]} ${from[1]} L${x} ${y}`} />)}
  </g>
);
// 背中の水面反射（細いハイライト）
const Sheen = ({ d, o = 0.55 }) => (
  <path d={d} stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity={o} />
);

const BODIES = {
  /* ---------------- シャボン玉 ---------------- */
  "🫧": (u) => (
    <>
      <defs>
        <radialGradient id={`${u}b`} cx="0.42" cy="0.38" r="0.62">
          <stop offset="0.55" stopColor="#BFF3F0" stopOpacity="0.05" />
          <stop offset="0.8" stopColor="#7FD6D4" stopOpacity="0.28" />
          <stop offset="0.92" stopColor="#B59CFF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FF9EC7" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <circle cx="58" cy="40" r="26" fill={`url(#${u}b)`} />
      <circle cx="58" cy="40" r="26" fill="none" stroke="#4FC3C0" strokeWidth="2.2" opacity="0.75" />
      <circle cx="58" cy="40" r="24.6" fill="none" stroke="#DFFBFA" strokeWidth="1" opacity="0.8" />
      {/* 窓の映り込み */}
      <path d="M40 30 Q44 20 54 17" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85" />
      <circle cx="40" cy="37" r="2.2" fill="#FFFFFF" opacity="0.8" />
      <path d="M70 60 Q78 56 81 48" stroke="#FFE6F3" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* 子どもの泡 */}
      <circle cx="91" cy="22" r="7" fill="#BFF3F0" fillOpacity="0.18" stroke="#4FC3C0" strokeWidth="1.4" strokeOpacity="0.8" />
      <circle cx="88.5" cy="19.5" r="1.6" fill="#FFFFFF" opacity="0.85" />
      <circle cx="98" cy="38" r="3.6" fill="none" stroke="#4FC3C0" strokeWidth="1.2" opacity="0.8" />
    </>
  ),

  /* ---------------- 熱帯魚（チョウチョウウオ風の縞） ---------------- */
  "🐠": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#FFC94A"], [0.55, "#FFB12E"], [1, "#FFE7A3"]]} />
        <clipPath id={`${u}c`}><path d="M18 42 C20 22 44 10 64 14 C80 18 90 30 90 42 C90 54 80 66 64 70 C44 74 20 62 18 42 Z" /></clipPath>
      </defs>
      {/* 背びれ・尻びれ（後ろへ流れる） */}
      <path d="M46 14 C58 2 82 4 96 20 C88 22 80 24 72 22 Z" fill="#FF8A3D" opacity="0.9" />
      <path d="M46 70 C58 80 82 78 96 62 C88 60 80 58 72 60 Z" fill="#FF8A3D" opacity="0.9" />
      <Rays from={[60, 18]} to={[[70, 6], [80, 8], [90, 14]]} color="#B8501A" />
      <Rays from={[60, 64]} to={[[70, 76], [80, 74], [90, 68]]} color="#B8501A" />
      {/* 尾びれ（半透明の扇） */}
      <path d="M88 42 L112 26 Q106 42 112 58 Z" fill="#FFD36B" opacity="0.75" />
      <Rays from={[90, 42]} to={[[110, 30], [108, 42], [110, 54]]} color="#C97A12" />
      {/* 胴 */}
      <path d="M18 42 C20 22 44 10 64 14 C80 18 90 30 90 42 C90 54 80 66 64 70 C44 74 20 62 18 42 Z" fill={`url(#${u}b)`} />
      <g clipPath={`url(#${u}c)`}>
        <path d="M34 0 L44 0 L40 80 L30 80 Z" fill="#FFFFFF" />
        <path d="M44 0 L47 0 L43 80 L40 80 Z" fill="#1B2A4A" />
        <path d="M58 0 L68 0 L66 80 L56 80 Z" fill="#FFFFFF" opacity="0.92" />
        <path d="M68 0 L71 0 L69 80 L66 80 Z" fill="#1B2A4A" opacity="0.9" />
        {/* 目を隠す黒帯 */}
        <path d="M22 0 L30 0 L28 80 L20 80 Z" fill="#1B2A4A" opacity="0.85" />
      </g>
      <circle cx="80" cy="34" r="4" fill="#1B2A4A" opacity="0.85" />
      <circle cx="80" cy="34" r="5.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
      <Eye x={26} y={38} r={4.6} iris="#0B1B2B" ring="#FFC94A" />
      <path d="M17 44 Q14 45 13 43" stroke="#B8501A" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Sheen d="M40 18 Q56 13 72 18" o={0.5} />
    </>
  ),

  /* ---------------- さかな（アジ風・銀青のうろこ） ---------------- */
  "🐟": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#24537D"], [0.45, "#5C9CC6"], [0.62, "#CFE6F2"], [1, "#F4FAFD"]]} />
        <clipPath id={`${u}c`}><path d="M14 44 C24 28 50 24 72 28 C82 30 90 36 94 42 C90 48 82 54 72 56 C50 60 24 58 14 44 Z" /></clipPath>
        <pattern id={`${u}s`} width="7" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 6 Q3.5 1 7 6" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.35" />
        </pattern>
      </defs>
      {/* 二股の尾びれ */}
      <path d="M90 42 L114 24 Q104 36 106 42 Q104 48 114 60 Z" fill="#3D74A0" opacity="0.85" />
      <Rays from={[92, 42]} to={[[110, 28], [104, 40], [104, 44], [110, 56]]} color="#1B3F60" />
      {/* 背びれ */}
      <path d="M46 27 L54 12 L66 27 Z" fill="#3D74A0" opacity="0.85" />
      <path d="M58 57 L64 66 L72 56 Z" fill="#3D74A0" opacity="0.7" />
      {/* 胴＋うろこ */}
      <path d="M14 44 C24 28 50 24 72 28 C82 30 90 36 94 42 C90 48 82 54 72 56 C50 60 24 58 14 44 Z" fill={`url(#${u}b)`} />
      <g clipPath={`url(#${u}c)`}>
        <rect x="30" y="20" width="70" height="40" fill={`url(#${u}s)`} />
        {/* ぜいご（側線） */}
        <path d="M30 42 Q60 38 92 42" stroke="#F5C04A" strokeWidth="1.6" fill="none" opacity="0.8" />
      </g>
      {/* えら・胸びれ */}
      <path d="M32 33 Q27 43 32 53" stroke="#1B3F60" strokeWidth="1.6" fill="none" opacity="0.55" />
      <path d="M36 46 Q46 46 50 54 Q42 54 36 48 Z" fill="#9CC7E0" opacity="0.8" />
      <Eye x={24} y={40} r={5} ring="#F5C04A" />
      <path d="M14 45 L19 46" stroke="#1B3F60" strokeWidth="1.6" strokeLinecap="round" />
      <Sheen d="M34 31 Q54 26 76 30" />
    </>
  ),

  /* ---------------- フグ ---------------- */
  "🐡": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#C9952A"], [0.5, "#EDC659"], [0.68, "#FFF3D6"], [1, "#FFFFFF"]]} />
        <clipPath id={`${u}c`}><circle cx="56" cy="41" r="26" /></clipPath>
      </defs>
      {/* とげ */}
      <g fill="#B98423" opacity="0.9">
        {[[-90], [-60], [-30], [-120], [-150], [150], [120], [30], [60], [90], [180]].map(([a], i) => {
          const r = (a * Math.PI) / 180, x = 56 + Math.cos(r) * 27, y = 41 + Math.sin(r) * 27;
          const tx = 56 + Math.cos(r) * 33, ty = 41 + Math.sin(r) * 33;
          const px = Math.cos(r + Math.PI / 2) * 2.4, py = Math.sin(r + Math.PI / 2) * 2.4;
          return <path key={i} d={`M${x + px} ${y + py} L${tx} ${ty} L${x - px} ${y - py} Z`} />;
        })}
      </g>
      {/* 尾びれ */}
      <path d="M80 41 L98 30 Q94 41 98 52 Z" fill="#E3B13E" opacity="0.8" />
      <Rays from={[82, 41]} to={[[96, 33], [94, 41], [96, 49]]} color="#9A6E14" />
      <circle cx="56" cy="41" r="26" fill={`url(#${u}b)`} />
      <g clipPath={`url(#${u}c)`}>
        {/* 背中の斑点 */}
        {[[50, 22, 3], [62, 20, 2.4], [70, 28, 3], [42, 28, 2.2], [76, 38, 2.2], [58, 30, 2]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#7A5410" opacity="0.55" />
        ))}
      </g>
      {/* 小さな胸びれ（パタパタ） */}
      <path d="M62 44 Q72 38 74 46 Q68 50 62 46 Z" fill="#F7D77B" opacity="0.9" />
      <Eye x={41} y={34} r={6.2} />
      {/* おちょぼ口 */}
      <ellipse cx="31" cy="44" rx="2.6" ry="2" fill="#C2577A" />
      <ellipse cx="44" cy="42" rx="3.4" ry="2" fill="#FF9E9E" opacity="0.45" />
      <Sheen d="M42 20 Q56 14 70 20" />
    </>
  ),

  /* ---------------- タコ ---------------- */
  "🐙": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#E05A54"], [0.7, "#F07C6C"], [1, "#F9A794"]]} />
      </defs>
      {/* 足（吸盤つき） */}
      {[
        "M40 46 C30 54 22 54 16 66 C14 72 22 74 22 68",
        "M50 52 C46 62 40 70 34 74 C30 77 36 80 40 76",
        "M66 52 C70 62 76 70 84 74 C88 77 82 80 78 76",
        "M76 46 C86 54 94 54 100 66 C102 72 94 74 94 68",
      ].map((d, i) => (
        <g key={i}>
          <path d={d} stroke="#D44E4A" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d={d} stroke="#F7B6A6" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeDasharray="0.1 5.5" />
        </g>
      ))}
      {/* 頭（外套膜） */}
      <path d="M34 44 C30 22 44 6 60 6 C76 6 88 20 84 42 C82 52 72 56 58 56 C44 56 36 52 34 44 Z" fill={`url(#${u}b)`} />
      {[[50, 16, 2], [64, 12, 1.6], [72, 22, 2.2], [44, 26, 1.6], [76, 32, 1.4]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#B8393A" opacity="0.5" />
      ))}
      {/* 横長の瞳（タコ特有） */}
      {[[50, 38], [68, 38]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill="#FFF4DA" />
          <rect x={x - 4} y={y - 1.6} width="8" height="3.4" rx="1.7" fill="#2A1414" />
          <circle cx={x - 2} cy={y - 3} r="1.3" fill="#FFFFFF" />
        </g>
      ))}
      <path d="M56 47 Q59 50 62 47" stroke="#9E3030" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Sheen d="M46 12 Q58 6 72 12" />
    </>
  ),

  /* ---------------- イカ（ヒレを先にして泳ぐ） ---------------- */
  "🦑": (u) => (
    <>
      <defs>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F2C6E2" />
          <stop offset="1" stopColor="#C88BD8" />
        </linearGradient>
      </defs>
      {/* 腕と触腕（左へなびく） */}
      {[[34, -10], [34, -4], [34, 2], [34, 8]].map(([x, dy], i) => (
        <path key={i} d={`M${x} ${40 + dy / 2} C24 ${40 + dy} 16 ${40 + dy * 1.3} 8 ${40 + dy * 1.6}`} stroke="#E3A8D2" strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}
      <path d="M34 38 C22 30 10 26 4 28" stroke="#D896C6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="4" cy="28" rx="3.4" ry="2.2" fill="#D896C6" />
      {/* 胴（外套膜）＋三角のヒレ */}
      <path d="M88 40 L112 26 L108 40 L112 54 Z" fill="#B97BCB" opacity="0.85" />
      <path d="M34 40 C34 30 50 28 70 30 C84 31 100 36 110 40 C100 44 84 49 70 50 C50 52 34 50 34 40 Z" fill={`url(#${u}b)`} />
      {/* 色素胞のつぶつぶ */}
      {[[58, 34], [66, 36], [74, 35], [82, 38], [62, 44], [72, 44], [86, 42], [94, 40], [52, 38]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1.1} fill="#8E4FA6" opacity="0.5" />
      ))}
      {/* 頭と大きな目 */}
      <ellipse cx="38" cy="40" rx="7" ry="8" fill="#F2C6E2" />
      <Eye x={39} y={38} r={5.4} iris="#2B1640" />
      <Sheen d="M50 31 Q72 28 96 36" o={0.6} />
    </>
  ),

  /* ---------------- イルカ ---------------- */
  "🐬": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#3E6F96"], [0.48, "#76A8CB"], [0.62, "#E3F0F7"], [1, "#FFFFFF"]]} />
      </defs>
      {/* 尾びれ（横向きのフルーク） */}
      <path d="M92 40 C100 36 106 26 114 24 C110 32 110 36 108 40 C112 44 112 50 116 56 C106 52 100 46 92 44 Z" fill="#3E6F96" />
      {/* 背びれ */}
      <path d="M54 25 C58 14 66 8 72 8 C68 14 68 20 70 28 Z" fill="#3E6F96" />
      {/* 胴 */}
      <path d="M10 44 C14 40 20 38 26 36 C40 26 70 24 86 34 C92 38 96 40 96 42 C90 48 76 54 56 55 C38 56 24 52 16 48 C12 47 9 46 10 44 Z" fill={`url(#${u}b)`} />
      {/* 胸びれ */}
      <path d="M44 50 C48 58 54 62 60 62 C56 58 54 54 54 50 Z" fill="#4F82A8" />
      {/* 口元のスマイル・噴気孔 */}
      <path d="M12 46 Q20 48 28 45" stroke="#2F5577" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M42 28 Q44 27 46 28" stroke="#2F5577" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Eye x={32} y={40} r={3.6} />
      <Sheen d="M34 31 Q56 24 80 30" />
    </>
  ),

  /* ---------------- サメ ---------------- */
  "🦈": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#4C5F6E"], [0.5, "#7D93A3"], [0.56, "#E8EEF1"], [1, "#FFFFFF"]]} />
      </defs>
      {/* 尾（上が大きい異尾） */}
      <path d="M90 42 C98 34 104 20 112 10 C112 24 108 36 104 44 C106 48 108 52 110 56 C102 52 96 48 90 46 Z" fill="#4C5F6E" />
      {/* 背びれ・腹びれ */}
      <path d="M48 28 C52 16 56 6 60 4 C62 12 64 22 68 28 Z" fill="#4C5F6E" />
      <path d="M84 36 L90 30 L91 37 Z" fill="#4C5F6E" />
      {/* 胴 */}
      <path d="M6 42 C10 34 22 30 36 29 C58 27 80 32 94 40 C96 42 96 44 94 45 C80 52 58 56 36 54 C22 53 10 50 6 42 Z" fill={`url(#${u}b)`} />
      {/* 胸びれ */}
      <path d="M38 50 C42 60 46 66 54 70 C52 62 52 56 52 50 Z" fill="#5A6E7D" />
      {/* えら孔 */}
      {[30, 33.5, 37, 40.5].map((x, i) => (
        <path key={i} d={`M${x} 37 Q${x - 1.4} 42 ${x} 47`} stroke="#3B4B57" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
      ))}
      {/* 口 */}
      <path d="M10 46 Q16 49 22 47" stroke="#3B4B57" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="38" r="3" fill="#0B1B2B" />
      <circle cx="19" cy="37" r="1" fill="#FFFFFF" />
      <Sheen d="M24 33 Q50 27 80 33" />
    </>
  ),

  /* ---------------- アザラシ（ゴマフアザラシ） ---------------- */
  "🦭": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#9EAFBA"], [0.55, "#C7D3DA"], [1, "#EEF3F6"]]} />
        <clipPath id={`${u}c`}><path d="M16 40 C16 26 32 22 50 28 C70 30 90 36 98 46 C92 56 72 62 50 60 C30 60 16 54 16 40 Z" /></clipPath>
      </defs>
      {/* 後ろびれ */}
      <path d="M94 46 C102 40 110 36 116 36 C112 44 112 48 116 56 C108 56 100 52 94 50 Z" fill="#8A9CA8" />
      {/* 胴 */}
      <path d="M16 40 C16 26 32 22 50 28 C70 30 90 36 98 46 C92 56 72 62 50 60 C30 60 16 54 16 40 Z" fill={`url(#${u}b)`} />
      <g clipPath={`url(#${u}c)`}>
        {[[48, 32], [58, 36], [68, 34], [76, 40], [56, 44], [86, 44], [42, 40], [66, 46], [78, 50]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="1.8" ry="1.3" fill="#5D6E7A" opacity="0.55" />
        ))}
      </g>
      {/* 前びれ */}
      <path d="M40 54 C42 62 48 66 54 66 C52 60 50 56 50 54 Z" fill="#8A9CA8" />
      {/* 顔 */}
      <Eye x={26} y={34} r={4.4} iris="#141A20" />
      <Eye x={36} y={33} r={3.4} iris="#141A20" />
      <ellipse cx="18" cy="41" rx="3" ry="2.2" fill="#3A444C" />
      <path d="M20 45 Q23 47 26 45" stroke="#5D6E7A" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <g stroke="#E8EEF1" strokeWidth="0.9" strokeLinecap="round" opacity="0.9">
        <path d="M14 43 L4 41" /><path d="M14 45 L5 46" /><path d="M24 43 L33 41" /><path d="M24 45 L33 46" />
      </g>
      <Sheen d="M30 27 Q50 24 72 32" />
    </>
  ),

  /* ---------------- クジラ（ザトウクジラ風） ---------------- */
  "🐳": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#1E3F6B"], [0.55, "#3A6EA5"], [0.66, "#C7DCEC"], [1, "#EAF3FA"]]} />
        <clipPath id={`${u}c`}><path d="M6 46 C8 30 30 22 56 24 C76 26 92 34 100 42 C94 54 74 64 48 64 C24 64 6 58 6 46 Z" /></clipPath>
      </defs>
      {/* 潮吹き */}
      <g fill="#9FE3F0" opacity="0.85">
        <path d="M26 22 C24 14 18 10 12 10 C18 12 22 16 24 22 Z" />
        <path d="M28 22 C30 14 36 10 42 10 C36 12 32 16 30 22 Z" />
        <circle cx="12" cy="6" r="1.8" /><circle cx="42" cy="6" r="1.8" /><circle cx="27" cy="5" r="1.4" />
      </g>
      {/* 尾びれ */}
      <path d="M96 44 C102 38 106 28 116 24 C114 34 112 40 108 46 C112 52 114 58 116 66 C106 62 102 54 96 50 Z" fill="#1E3F6B" />
      {/* 胴 */}
      <path d="M6 46 C8 30 30 22 56 24 C76 26 92 34 100 42 C94 54 74 64 48 64 C24 64 6 58 6 46 Z" fill={`url(#${u}b)`} />
      <g clipPath={`url(#${u}c)`}>
        {/* のどのうね */}
        {[52, 55, 58, 61].map((y, i) => (
          <path key={i} d={`M8 ${y - 4} Q34 ${y + 2} 60 ${y}`} stroke="#8FB3D0" strokeWidth="1" fill="none" opacity="0.7" />
        ))}
        {/* 頭のこぶ */}
        {[[16, 34], [22, 31], [28, 29]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.2" fill="#14304F" opacity="0.6" />)}
      </g>
      {/* 長い胸びれ */}
      <path d="M38 56 C44 66 56 72 66 74 C60 68 54 62 52 56 Z" fill="#2B5584" />
      <path d="M8 48 Q22 52 34 50" stroke="#14304F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Eye x={30} y={42} r={3.4} />
      <Sheen d="M30 28 Q56 22 84 32" />
    </>
  ),

  /* ---------------- プレシオサウルス ---------------- */
  "🦕": (u) => (
    <>
      <defs>
        <VGrad id={`${u}b`} stops={[[0, "#2F7A6A"], [0.55, "#4FA88F"], [1, "#BFE6D6"]]} />
      </defs>
      {/* 尾 */}
      <path d="M86 52 C96 52 106 50 116 46 C108 54 98 58 86 58 Z" fill="#2F7A6A" />
      {/* 奥のひれ */}
      <path d="M62 50 C70 42 80 40 88 42 C80 46 72 50 66 54 Z" fill="#2A6B5D" opacity="0.8" />
      {/* 首と頭 */}
      <path d="M50 50 C38 46 30 36 28 24 C27 18 24 14 18 14" stroke={`url(#${u}b)`} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M8 16 C10 10 18 8 24 11 C28 13 28 18 24 20 C18 22 10 21 8 16 Z" fill="#4FA88F" />
      <path d="M8 17 Q14 19 20 18" stroke="#245E51" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* 胴 */}
      <path d="M44 54 C44 42 58 38 72 40 C84 42 92 48 92 54 C92 62 80 66 68 66 C54 66 44 62 44 54 Z" fill={`url(#${u}b)`} />
      {/* 背の斑点 */}
      {[[58, 44], [66, 42], [74, 44], [82, 48], [36, 40], [31, 31]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill="#1F5A4D" opacity="0.6" />
      ))}
      {/* 手前のひれ（パドル） */}
      <path d="M52 60 C46 70 38 76 30 76 C36 70 42 64 46 58 Z" fill="#2F7A6A" />
      <path d="M80 62 C84 70 92 76 100 76 C94 70 90 64 86 60 Z" fill="#2F7A6A" />
      <Eye x={15} y={13} r={2.8} />
      <Sheen d="M54 43 Q68 38 84 44" />
    </>
  ),
};

export function FishSVG({ type, size = 48, style }) {
  const u = useId().replace(/:/g, "");
  const body = BODIES[type] ?? BODIES["🐟"];
  return (
    <svg viewBox="0 0 120 80" width={size} height={size * (80 / 120)} style={{ display: "block", overflow: "visible", ...style }} aria-hidden="true">
      {body(u)}
    </svg>
  );
}
