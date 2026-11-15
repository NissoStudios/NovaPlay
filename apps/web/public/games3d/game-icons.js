// Icônes vectorielles illustrées originales pour les 3 jeux du hub 3D.
// Chaque icône est un SVG autonome (fond dégradé + pictogramme) prêt à être
// injecté dans les boutons de navigation (desktop + mobile).

export const ICONS_3D = {
  rally: `
    <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
      <defs>
        <linearGradient id="ic-rally-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0d2018"/>
          <stop offset="1" stop-color="#143126"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ic-rally-bg)" stroke="#56f39a" stroke-width="2"/>
      <path d="M11 41 L15 29 Q19 24 29 24 L37 24 Q47 24 51 31 L55 41 Z" fill="#20c7a2"/>
      <rect x="23" y="18" width="18" height="11" rx="4" fill="#56f39a"/>
      <circle cx="19" cy="43" r="6" fill="#0a1510" stroke="#eefbf3" stroke-width="2"/>
      <circle cx="45" cy="43" r="6" fill="#0a1510" stroke="#eefbf3" stroke-width="2"/>
      <path d="M53 30 L60 27 M53 34 L61 33" stroke="#ffcc66" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  quarry: `
    <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
      <defs>
        <linearGradient id="ic-quarry-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#101d17"/>
          <stop offset="1" stop-color="#17281f"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ic-quarry-bg)" stroke="#56f39a" stroke-width="2"/>
      <path d="M22 42 L40 24" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/>
      <path d="M32 16 L46 12 L51 24 L37 29 Z" fill="#9aa4ab"/>
      <path d="M24 46 L32 36 L42 42 L34 52 Z" fill="#56f39a"/>
      <circle cx="46" cy="18" r="2.4" fill="#eefbf3"/>
    </svg>`,
  siege: `
    <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
      <defs>
        <linearGradient id="ic-siege-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1a1018"/>
          <stop offset="1" stop-color="#241521"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ic-siege-bg)" stroke="#ff6d7a" stroke-width="2"/>
      <rect x="23" y="39" width="18" height="10" rx="2" fill="#56f39a"/>
      <rect x="30" y="25" width="4" height="15" fill="#20c7a2"/>
      <circle cx="32" cy="22" r="6.5" fill="#56f39a"/>
      <circle cx="48" cy="15" r="5" fill="#ff6d7a"/>
      <path d="M38 19 L44 16" stroke="#ffcc66" stroke-width="2" stroke-dasharray="2 2"/>
    </svg>`,
};
