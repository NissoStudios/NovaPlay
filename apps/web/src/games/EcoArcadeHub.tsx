import { useSearchParams } from "react-router-dom";

const VALID_2D_GAMES = new Set(["harvest", "collapse", "runner", "chroma", "clash"]);

export function EcoArcadeHub() {
  const [params] = useSearchParams();
  const requested = params.get("game");
  const suffix = requested && VALID_2D_GAMES.has(requested) ? `?game=${requested}` : "";
  return (
    <div className="arcade-hub-host">
      <iframe
        src={`/arcade-hub.html${suffix}`}
        title="Eco Arcade Hub — cinq jeux NovaPlay"
        allow="fullscreen"
      />
    </div>
  );
}
