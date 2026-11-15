import { useSearchParams } from "react-router-dom";

const VALID_3D_GAMES = new Set(["rally", "quarry", "siege"]);

export function EcoArcadeHub3D() {
  const [params] = useSearchParams();
  const requested = params.get("game");
  const suffix = requested && VALID_3D_GAMES.has(requested) ? `?game=${requested}` : "";
  return (
    <div className="arcade-hub-host">
      <iframe
        src={`/arcade-hub-3d.html${suffix}`}
        title="Eco Arcade Hub 3D — trois jeux NovaPlay en Three.js"
        allow="fullscreen"
      />
    </div>
  );
}
