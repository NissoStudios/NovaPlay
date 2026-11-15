import type { InternalGameId } from "@novaplay/shared";
import type { ComponentType } from "react";
import { ConnectFourGame } from "./ConnectFourGame";
import { MemoryGame } from "./MemoryGame";
import { MergeGame } from "./MergeGame";
import { SnakeGame } from "./SnakeGame";
import { TicTacToeGame } from "./TicTacToeGame";
import { AstroDodgeGame } from "./AstroDodgeGame";
import { BrickBlastGame } from "./BrickBlastGame";
import { MinesGame } from "./MinesGame";
import { PulseTapGame } from "./PulseTapGame";
import { SimonGame } from "./SimonGame";
import { EcoArcadeHub } from "./EcoArcadeHub";
import { EcoArcadeHub3D } from "./EcoArcadeHub3D";

const games: Record<InternalGameId, ComponentType> = {
  "neon-snake": SnakeGame,
  "merge-2048": MergeGame,
  "astro-dodge": AstroDodgeGame,
  "brick-blast": BrickBlastGame,
  "memory-flip": MemoryGame,
  "morpion-solo": TicTacToeGame,
  "puissance-quatre": ConnectFourGame,
  "pulse-tap": PulseTapGame,
  "simon-orbit": SimonGame,
  "crystal-mines": MinesGame,
  "eco-arcade-hub": EcoArcadeHub,
  "eco-arcade-hub-3d": EcoArcadeHub3D,
};

interface InternalGameProps {
  gameId: InternalGameId;
}

export function InternalGame({ gameId }: InternalGameProps) {
  const Component = games[gameId];
  return <Component />;
}
