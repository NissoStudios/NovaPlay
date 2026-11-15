import type { PublicGame } from "@novaplay/shared";
import { useState } from "react";
import { GameArtwork } from "./GameArtwork";

const COVER_BY_KEY: Record<string, string> = {
  "eco-arcade-hub": "/covers/eco-arcade-hub.png",
  "eco-arcade-hub-3d": "/covers/eco-arcade-hub-3d.png",
  "neon-snake": "/covers/neon-serpent.png",
  "neon-serpent": "/covers/neon-serpent.png",
  "merge-2048": "/covers/fusion-2048.png",
  "fusion-2048": "/covers/fusion-2048.png",
  "astro-dodge": "/covers/evasion-stellaire.png",
  "evasion-stellaire": "/covers/evasion-stellaire.png",
  "brick-blast": "/covers/mur-de-plasma.png",
  "mur-de-plasma": "/covers/mur-de-plasma.png",
  "memory-flip": "/covers/memo-cosmos.png",
  "memo-cosmos": "/covers/memo-cosmos.png",
  "morpion-solo": "/covers/morpion-nova.png",
  "morpion-nova": "/covers/morpion-nova.png",
  "puissance-quatre": "/covers/puissance-orbitale.png",
  "puissance-orbitale": "/covers/puissance-orbitale.png",
  "pulse-tap": "/covers/pulse-pop.png",
  "pulse-pop": "/covers/pulse-pop.png",
  "simon-orbit": "/covers/simon-orbital.png",
  "simon-orbital": "/covers/simon-orbital.png",
  "crystal-mines": "/covers/mines-de-cristal.png",
  "mines-de-cristal": "/covers/mines-de-cristal.png",
};

interface GameCoverProps {
  game: Pick<
    PublicGame,
    "title" | "icon" | "accentColor" | "secondaryColor" | "internalGameId"
  > & { slug?: string };
  large?: boolean;
}

export function GameCover({ game, large = false }: GameCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const coverSrc =
    (game.internalGameId && COVER_BY_KEY[game.internalGameId]) ||
    (game.slug && COVER_BY_KEY[game.slug]) ||
    null;

  return (
    <div
      className={`game-cover ${large ? "game-cover--large" : ""}`}
      style={
        {
          "--cover-primary": game.accentColor,
          "--cover-secondary": game.secondaryColor,
        } as React.CSSProperties
      }
      role="img"
      aria-label={`Illustration de ${game.title}`}
    >
      {coverSrc && !imageFailed ? (
        <img
          className="game-cover__image"
          src={coverSrc}
          alt={game.title}
          loading={large ? "eager" : "lazy"}
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <span className="game-cover__grid" />
          <span className="game-cover__orbit game-cover__orbit--one" />
          <span className="game-cover__orbit game-cover__orbit--two" />
          <span className="game-cover__glow" />
          <span className="game-cover__icon">
            <GameArtwork
              internalGameId={game.internalGameId}
              fallbackIcon={game.icon}
              accentColor={game.accentColor}
              secondaryColor={game.secondaryColor}
            />
          </span>
        </>
      )}
    </div>
  );
}
