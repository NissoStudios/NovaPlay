import type { InternalGameId } from "@novaplay/shared";

interface GameArtworkProps {
  internalGameId: InternalGameId | null;
  fallbackIcon: string;
  accentColor: string;
  secondaryColor: string;
}

export function GameArtwork({
  internalGameId,
  fallbackIcon,
  accentColor,
  secondaryColor,
}: GameArtworkProps) {
  switch (internalGameId) {
    case "eco-arcade-hub":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <rect x="8" y="18" width="48" height="30" rx="14" fill="#10251c" stroke={accentColor} strokeWidth="2.5" />
          <path d="M22 27v12M16 33h12" stroke={secondaryColor} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="42" cy="29" r="3.2" fill={accentColor} />
          <circle cx="48" cy="36" r="3.2" fill="#ffcc66" />
          <path d="M32 18c0-6 6-10 11-10-1 5-5 10-11 10Z" fill={accentColor} />
        </svg>
      );
    case "eco-arcade-hub-3d":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <polygon points="32,8 54,20 54,44 32,56 10,44 10,20" fill="#0d221c" stroke={accentColor} strokeWidth="2.5" />
          <polygon points="32,8 54,20 32,32 10,20" fill={accentColor} fillOpacity="0.32" />
          <polygon points="32,32 54,20 54,44 32,56" fill={secondaryColor} fillOpacity="0.28" />
          <path d="M32 32v24M10 20l22 12 22-12" stroke={accentColor} strokeWidth="2.2" fill="none" />
          <circle cx="32" cy="32" r="4.5" fill="#effbf4" />
        </svg>
      );
    case "neon-snake":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <path
            d="M14 44h16a6 6 0 0 0 6-6v-8a6 6 0 0 1 6-6h8"
            fill="none"
            stroke={accentColor}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="24" r="5.5" fill="#b7a5ff" />
          <circle cx="52" cy="22.5" r="1.4" fill="#090b16" />
          <circle cx="20" cy="20" r="5" fill={secondaryColor} />
        </svg>
      );
    case "merge-2048":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <rect x="9" y="9" width="21" height="21" rx="5" fill="#4c405b" stroke="rgba(255,255,255,0.22)" />
          <rect x="34" y="9" width="21" height="21" rx="5" fill="#d86f50" />
          <rect x="9" y="34" width="21" height="21" rx="5" fill="#ea5b62" />
          <rect x="34" y="34" width="21" height="21" rx="5" fill={accentColor} />
          <text x="19.5" y="23" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">4</text>
          <text x="44.5" y="23" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">16</text>
          <text x="19.5" y="48" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">32</text>
          <text x="44.5" y="48" textAnchor="middle" fill="#1b1424" fontSize="10" fontWeight="900">2K</text>
        </svg>
      );
    case "astro-dodge":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <polygon points="32,12 46,48 32,41 18,48" fill={accentColor} />
          <polygon points="32,12 46,48 32,41" fill="#89d8ff" fillOpacity="0.45" />
          <polygon points="27,44 37,44 32,56" fill={secondaryColor} />
          <circle cx="15" cy="18" r="5.5" fill="#ff7d66" />
          <circle cx="50" cy="24" r="4" fill="#ffb86c" />
        </svg>
      );
    case "brick-blast":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <rect x="9" y="13" width="14" height="7" rx="2.5" fill="#7c5cff" />
          <rect x="25" y="13" width="14" height="7" rx="2.5" fill="#ec5fca" />
          <rect x="41" y="13" width="14" height="7" rx="2.5" fill={secondaryColor} />
          <rect x="17" y="23" width="14" height="7" rx="2.5" fill={accentColor} />
          <rect x="33" y="23" width="14" height="7" rx="2.5" fill="#ff984a" />
          <circle cx="34" cy="39" r="4.5" fill="#ffffff" />
          <rect x="17" y="49" width="30" height="6" rx="3" fill="#55f5d0" />
        </svg>
      );
    case "memory-flip":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <rect x="10" y="12" width="22" height="30" rx="5" transform="rotate(-10 21 27)" fill="#20233c" stroke={accentColor} strokeWidth="2" />
          <rect x="30" y="18" width="22" height="30" rx="5" transform="rotate(8 41 33)" fill="#292d4e" stroke={secondaryColor} strokeWidth="2" />
          <path d="M41 26l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7Z" fill="#ffd86b" />
        </svg>
      );
    case "morpion-solo":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <path d="M24 12v40M40 12v40M12 24h40M12 40h40" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14 14l7 7M21 14l-7 7" stroke={accentColor} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="32" cy="32" r="5" fill="none" stroke={secondaryColor} strokeWidth="3.2" />
          <path d="M43 43l7 7M50 43l-7 7" stroke={accentColor} strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    case "puissance-quatre":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <rect x="9" y="13" width="46" height="38" rx="8" fill="#232754" stroke="rgba(255,255,255,0.24)" strokeWidth="2" />
          <circle cx="20" cy="24" r="5" fill="#090b17" />
          <circle cx="32" cy="24" r="5" fill="#ff5d7d" />
          <circle cx="44" cy="24" r="5" fill="#090b17" />
          <circle cx="20" cy="39" r="5" fill={accentColor} />
          <circle cx="32" cy="39" r="5" fill={accentColor} />
          <circle cx="44" cy="39" r="5" fill="#ff5d7d" />
        </svg>
      );
    case "pulse-tap":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <circle cx="32" cy="32" r="21" fill="none" stroke={secondaryColor} strokeWidth="2.5" strokeOpacity="0.5" />
          <circle cx="32" cy="32" r="13" fill={accentColor} fillOpacity="0.28" stroke={accentColor} strokeWidth="3" />
          <circle cx="32" cy="32" r="5" fill="#ffffff" />
        </svg>
      );
    case "simon-orbit":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <path d="M30 10A22 22 0 0 0 10 30h12a10 10 0 0 1 8-8Z" fill="#5ecfff" />
          <path d="M34 10v12a10 10 0 0 1 8 8h12A22 22 0 0 0 34 10Z" fill="#ff678b" />
          <path d="M10 34a22 22 0 0 0 20 20V42a10 10 0 0 1-8-8Z" fill="#ffd34f" />
          <path d="M42 34a10 10 0 0 1-8 8v12a22 22 0 0 0 20-20Z" fill="#66e1a9" />
          <circle cx="32" cy="32" r="6" fill="#171a30" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
        </svg>
      );
    case "crystal-mines":
      return (
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <polygon points="32,10 50,24 42,52 22,52 14,24" fill={accentColor} fillOpacity="0.3" stroke={accentColor} strokeWidth="2.5" />
          <polygon points="32,10 41,25 32,52 23,25" fill={secondaryColor} fillOpacity="0.55" />
          <path d="M14 24h36" stroke="#c8fff5" strokeWidth="1.8" strokeOpacity="0.65" />
        </svg>
      );
    default:
      return <span>{fallbackIcon}</span>;
  }
}
