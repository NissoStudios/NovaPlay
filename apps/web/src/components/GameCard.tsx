import type { PublicGame } from "@novaplay/shared";
import { Heart, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useFavorites } from "../lib/storage";
import { GameCover } from "./GameCover";

interface GameCardProps {
  game: PublicGame;
  priority?: boolean;
}

export function GameCard({ game }: GameCardProps) {
  const { favorites, toggleFavorite } = useFavorites();
  const favorite = favorites.includes(game.slug);

  return (
    <article className="game-card">
      <Link className="game-card__visual" to={`/game/${game.slug}`}>
        <GameCover game={game} />
        <span className="game-card__play">
          <Play size={18} fill="currentColor" aria-hidden="true" />
          Jouer
        </span>
      </Link>
      <div className="game-card__content">
        <div>
          <Link className="game-card__title" to={`/game/${game.slug}`}>
            {game.title}
          </Link>
          <p>
            {game.category} <span aria-hidden="true">•</span> {game.difficulty}
          </p>
        </div>
        <button
          className={`favorite-button ${favorite ? "favorite-button--active" : ""}`}
          type="button"
          aria-label={favorite ? `Retirer ${game.title} des favoris` : `Ajouter ${game.title} aux favoris`}
          aria-pressed={favorite}
          onClick={() => toggleFavorite(game.slug)}
        >
          <Heart size={18} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
