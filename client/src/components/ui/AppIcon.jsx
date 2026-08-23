import React from 'react';

const PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5" /><path d="M8 10h8M8 14h6M8 18h4" /></>,
  trend: <><path d="M3 19V5" /><path d="M3 19h18" /><path d="m6 15 4-4 3 2 5-7" /><path d="M15 6h3v3" /></>,
  dna: <><path d="M8 3c5 4 5 14 0 18M16 3c-5 4-5 14 0 18" /><path d="M7 7h10M7 12h10M7 17h10" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M13 4h6v16h-6" /></>,
  chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-3 3 2 5-6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.2 2.7-5 6-5s6 1.8 6 5" /><path d="M16 5.5a3 3 0 0 1 0 5.7M17 15c2.5.5 4 2.1 4 5" /></>,
  report: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h5" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.8v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1A1.7 1.7 0 0 0 7.4 15a1.7 1.7 0 0 0-1.5-1H5v-2.8h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.8v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  arrow: <><path d="M4 12h16M13 5l7 7-7 7" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  warning: <><path d="M12 3 2.8 19h18.4z" /><path d="M12 9v4M12 16h.01" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.7-4L3 10" /><path d="M3 5v5h5M4 13a8 8 0 0 0 14.7 4L21 14" /><path d="M21 19v-5h-5" /></>,
  camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 10v6M12 7h.01" /></>,
  flask: <><path d="M9 3h6M10 3v6l-5 8.5A2 2 0 0 0 6.7 21h10.6a2 2 0 0 0 1.7-3.5L14 9V3" /><path d="M7 15h10" /></>,
  ruler: <><path d="M3 17 17 3l4 4L7 21z" /><path d="m8 12 2 2M11 9l2 2M14 6l2 2" /></>,
  person: <><circle cx="12" cy="7" r="3.5" /><path d="M5 21c.6-4 2.8-6 7-6s6.4 2 7 6" /></>,
  foot: <><path d="M10 21c-2.8 0-4.5-1.4-4.5-3.5 0-1.7 1.1-3 2.5-4.4 1.4-1.4 2.2-2.8 2.2-4.8V5.5a2.5 2.5 0 1 1 5 0v4.2c0 2.4.9 3.6 2.2 4.9 1.2 1.2 2.1 2.4 2.1 4.1 0 1.4-1.1 2.3-2.8 2.3z" /></>,
  run: <><circle cx="15.5" cy="4.5" r="2" /><path d="m13 8-3 4 4 2 2 7M10 12l-4 3M14 14l5-2" /></>,
  spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" /></>,
  pipeline: <><path d="M3 7h6v4H3zM15 13h6v4h-6z" /><path d="M9 9h4a3 3 0 0 1 3 3v1" /><path d="M12 7v2" /></>,
  note: <><path d="M5 3h14v18H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
};

export default function AppIcon({ name, size = 18, strokeWidth = 1.8, className = '', title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name] || PATHS.info}
    </svg>
  );
}
