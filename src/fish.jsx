/* オリジナル魚のSVGモデル（全11種）
   アプリアイコンと同じフラット積み木調。全員左向き（drift等のscaleXで反転） */

const BODIES = {
  // シャボン玉
  "🫧": (
    <>
      <circle cx="60" cy="40" r="25" fill="#7FD6D4" opacity="0.16" />
      <circle cx="60" cy="40" r="25" fill="none" stroke="#7FD6D4" strokeWidth="4" />
      <circle cx="50" cy="30" r="6" fill="#FFFFFF" opacity="0.75" />
      <circle cx="72" cy="48" r="3.5" fill="#FFFFFF" opacity="0.45" />
    </>
  ),
  // 熱帯魚（アイコンと同じ配色）
  "🐠": (
    <>
      <polygon points="84,40 110,24 110,56" fill="#F5A830" />
      <ellipse cx="54" cy="42" rx="34" ry="23" fill="#14ADAA" />
      <polygon points="44,20 66,20 55,34" fill="#F5A830" />
      <rect x="60" y="24" width="7" height="36" rx="3.5" fill="#0E7C7B" opacity="0.55" />
      <rect x="72" y="28" width="7" height="28" rx="3.5" fill="#0E7C7B" opacity="0.45" />
      <circle cx="36" cy="36" r="6" fill="#FFFFFF" />
    </>
  ),
  // さかな
  "🐟": (
    <>
      <polygon points="82,40 108,26 108,54" fill="#3A719A" />
      <ellipse cx="54" cy="42" rx="32" ry="17" fill="#4A90B8" />
      <ellipse cx="52" cy="48" rx="26" ry="9" fill="#7FB8D8" opacity="0.7" />
      <polygon points="46,26 62,26 54,14" fill="#3A719A" />
      <circle cx="34" cy="38" r="5" fill="#FFFFFF" />
    </>
  ),
  // フグ
  "🐡": (
    <>
      <polygon points="58,10 52,22 64,22" fill="#D9A832" />
      <polygon points="58,70 52,58 64,58" fill="#D9A832" />
      <polygon points="30,22 40,28 32,36" fill="#D9A832" />
      <polygon points="86,22 76,28 84,36" fill="#D9A832" />
      <polygon points="30,58 40,52 32,44" fill="#D9A832" />
      <polygon points="86,58 76,52 84,44" fill="#D9A832" />
      <circle cx="58" cy="40" r="23" fill="#E8C04A" />
      <ellipse cx="56" cy="48" rx="14" ry="9" fill="#F5E6C0" />
      <polygon points="80,40 98,32 98,48" fill="#D9A832" />
      <circle cx="44" cy="34" r="5" fill="#FFFFFF" />
      <circle cx="38" cy="44" r="2.5" fill="#B8901F" />
    </>
  ),
  // タコ
  "🐙": (
    <>
      <path d="M40 48 Q34 66 24 70" stroke="#D96459" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M52 52 Q50 70 42 74" stroke="#D96459" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M68 52 Q70 70 78 74" stroke="#D96459" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M80 48 Q86 66 96 70" stroke="#D96459" strokeWidth="8" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="32" r="23" fill="#D96459" />
      <circle cx="51" cy="28" r="5" fill="#FFFFFF" />
      <circle cx="69" cy="28" r="5" fill="#FFFFFF" />
      <path d="M54 42 Q60 47 66 42" stroke="#A8453C" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  // イカ
  "🦑": (
    <>
      <polygon points="60,4 40,36 80,36" fill="#C98BB8" />
      <ellipse cx="60" cy="44" rx="15" ry="19" fill="#E0A8CE" />
      <path d="M50 60 Q46 72 38 76" stroke="#E0A8CE" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M57 63 Q56 76 50 79" stroke="#E0A8CE" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M63 63 Q64 76 70 79" stroke="#E0A8CE" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M70 60 Q74 72 82 76" stroke="#E0A8CE" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="53" cy="42" r="4.5" fill="#FFFFFF" />
      <circle cx="67" cy="42" r="4.5" fill="#FFFFFF" />
    </>
  ),
  // イルカ
  "🐬": (
    <>
      <polygon points="88,42 108,26 104,48" fill="#558BAE" />
      <ellipse cx="56" cy="44" rx="36" ry="16" fill="#6FA8C9" />
      <ellipse cx="54" cy="50" rx="28" ry="8" fill="#B8D8EA" opacity="0.85" />
      <polygon points="50,30 70,30 62,12" fill="#558BAE" />
      <ellipse cx="20" cy="46" rx="8" ry="4.5" fill="#6FA8C9" />
      <polygon points="52,56 66,56 56,68" fill="#558BAE" />
      <circle cx="34" cy="38" r="4.5" fill="#FFFFFF" />
    </>
  ),
  // サメ
  "🦈": (
    <>
      <polygon points="90,42 112,24 106,48" fill="#5F7280" />
      <ellipse cx="56" cy="44" rx="38" ry="15" fill="#7A8C99" />
      <ellipse cx="54" cy="50" rx="30" ry="7" fill="#CBD6DC" />
      <polygon points="44,30 70,30 56,8" fill="#5F7280" />
      <polygon points="48,56 64,56 52,70" fill="#5F7280" />
      <circle cx="30" cy="38" r="4" fill="#FFFFFF" />
      <path d="M22 48 L34 48" stroke="#46555F" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M66 38 L66 50 M73 38 L73 50" stroke="#46555F" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // アザラシ
  "🦭": (
    <>
      <ellipse cx="60" cy="48" rx="34" ry="18" fill="#B8C4CC" />
      <circle cx="30" cy="38" r="15" fill="#B8C4CC" />
      <polygon points="90,48 108,38 108,58" fill="#94A4AE" />
      <ellipse cx="54" cy="64" rx="11" ry="5" fill="#94A4AE" />
      <circle cx="25" cy="33" r="3.5" fill="#0D2137" />
      <ellipse cx="17" cy="41" rx="3.5" ry="2.5" fill="#8A98A2" />
      <path d="M12 44 L20 45 M12 48 L20 47" stroke="#8A98A2" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  // クジラ
  "🐳": (
    <>
      <path d="M30 14 Q26 6 20 4 M30 14 Q34 6 40 4" stroke="#7FD6D4" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <polygon points="88,42 110,26 110,54" fill="#2A5580" />
      <ellipse cx="52" cy="46" rx="40" ry="22" fill="#3A6EA5" />
      <ellipse cx="50" cy="56" rx="32" ry="10" fill="#9FC4E0" opacity="0.85" />
      <circle cx="26" cy="40" r="4.5" fill="#FFFFFF" />
      <path d="M16 50 Q24 54 32 52" stroke="#2A5580" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  // プレシオサウルス
  "🦕": (
    <>
      <polygon points="88,52 108,44 106,62" fill="#4A8A58" />
      <ellipse cx="64" cy="52" rx="28" ry="15" fill="#5FA86F" />
      <path d="M42 48 Q28 40 26 20" stroke="#5FA86F" strokeWidth="10" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="15" r="8" fill="#5FA86F" />
      <ellipse cx="52" cy="66" rx="10" ry="4.5" fill="#4A8A58" transform="rotate(18 52 66)" />
      <ellipse cx="74" cy="66" rx="10" ry="4.5" fill="#4A8A58" transform="rotate(-14 74 66)" />
      <circle cx="22" cy="13" r="2.5" fill="#FFFFFF" />
    </>
  ),
};

export function FishSVG({ type, size = 48, style }) {
  return (
    <svg viewBox="0 0 120 80" width={size} height={size * (80 / 120)} style={{ display: "block", overflow: "visible", ...style }} aria-hidden="true">
      {BODIES[type] ?? BODIES["🐟"]}
    </svg>
  );
}
