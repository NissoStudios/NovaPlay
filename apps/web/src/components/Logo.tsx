import { Link } from "react-router-dom";

interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <Link className="logo" to="/" aria-label="NovaPlay — Accueil">
      <span className="logo__mark">
        <img
          className="logo__image"
          src="/novaplay-logo.png"
          alt=""
          width={38}
          height={38}
          aria-hidden="true"
        />
      </span>
      {!compact && (
        <span className="logo__word">
          Nova<span>Play</span>
        </span>
      )}
    </Link>
  );
}
