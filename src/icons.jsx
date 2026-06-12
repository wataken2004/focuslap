/* タブナビ用の海テイストSVGアイコン（線画＋泡） */

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export const IconFocus = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 10v3.5l2.3 1.8" />
    <path d="M9.8 3h4.4" />
    <circle cx="19.5" cy="5" r="1.2" />
    <circle cx="3.8" cy="8.5" r="0.9" />
  </svg>
);

export const IconTasks = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="4" y="3.5" width="14" height="17" rx="3" />
    <path d="M7.5 9.2l2 2 3.8-4" />
    <path d="M7.5 14.5h7" />
    <path d="M7.5 17.3h4.5" />
    <circle cx="20.8" cy="6" r="1" />
  </svg>
);

export const IconCal = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3v3.5M16 3v3.5" />
    <path d="M7 15.5c1.2-1.4 2.4-1.4 3.6 0s2.4 1.4 3.6 0" />
  </svg>
);

export const IconGoals = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="20.5" cy="4" r="0.9" />
  </svg>
);

export const IconTank = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M3.5 12.5c2.4-3.6 5.6-5.4 8.7-5.4 2.9 0 5.2 1.7 6.6 5.4-1.4 3.7-3.7 5.4-6.6 5.4-3.1 0-6.3-1.8-8.7-5.4Z" />
    <path d="M18.8 12.5l2.7-2.8v5.6l-2.7-2.8Z" fill="currentColor" stroke="none" />
    <circle cx="7.8" cy="11.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="20" cy="4.5" r="0.9" />
  </svg>
);
