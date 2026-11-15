import type { PublicGame } from "@novaplay/shared";
import { GameCard } from "./GameCard";

interface GameGridProps {
  games: PublicGame[];
}

export function GameGrid({ games }: GameGridProps) {
  return (
    <div className="game-grid">
      {games.map((game) => (
        <GameCard game={game} key={game.id} />
      ))}
    </div>
  );
}
