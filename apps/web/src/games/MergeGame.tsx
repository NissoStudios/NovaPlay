import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { createSeededRng, getDailyKey, getDailySeed } from "../lib/seededRng";
import { GameHud } from "./GameHud";

export type MergeDirection = "left" | "right" | "up" | "down";

function mergeLine(line: number[]): { line: number[]; gained: number } {
  const compact = line.filter((value) => value !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let index = 0; index < compact.length; index += 1) {
    const current = compact[index] ?? 0;
    if (current === compact[index + 1]) {
      const value = current * 2;
      merged.push(value);
      gained += value;
      index += 1;
    } else {
      merged.push(current);
    }
  }
  return { line: [...merged, ...Array<number>(4 - merged.length).fill(0)], gained };
}

function transpose(board: number[]): number[] {
  return board.map((_, index) => board[(index % 4) * 4 + Math.floor(index / 4)] ?? 0);
}

function reverseRows(board: number[]): number[] {
  return Array.from({ length: 4 }, (_, row) =>
    board.slice(row * 4, row * 4 + 4).reverse(),
  ).flat();
}

function moveLeft(board: number[]): { board: number[]; gained: number } {
  let gained = 0;
  const next = Array.from({ length: 4 }, (_, row) => {
    const result = mergeLine(board.slice(row * 4, row * 4 + 4));
    gained += result.gained;
    return result.line;
  }).flat();
  return { board: next, gained };
}

export function moveMergeBoard(
  board: number[],
  direction: MergeDirection,
): { board: number[]; gained: number } {
  if (direction === "left") return moveLeft(board);
  if (direction === "right") {
    const result = moveLeft(reverseRows(board));
    return { board: reverseRows(result.board), gained: result.gained };
  }
  if (direction === "up") {
    const result = moveLeft(transpose(board));
    return { board: transpose(result.board), gained: result.gained };
  }
  const result = moveLeft(reverseRows(transpose(board)));
  return { board: transpose(reverseRows(result.board)), gained: result.gained };
}

function spawnTile(board: number[], rng: () => number = Math.random): number[] {
  const empty = board
    .map((value, index) => (value === 0 ? index : -1))
    .filter((index) => index >= 0);
  const index = empty[Math.floor(rng() * empty.length)];
  if (index === undefined) return board;
  const next = [...board];
  next[index] = rng() < 0.9 ? 2 : 4;
  return next;
}

function createBoard(rng: () => number = Math.random): number[] {
  return spawnTile(spawnTile(Array<number>(16).fill(0), rng), rng);
}

function canMove(board: number[]): boolean {
  if (board.includes(0)) return true;
  return board.some((value, index) => {
    const right = index % 4 < 3 ? board[index + 1] : undefined;
    const down = index < 12 ? board[index + 4] : undefined;
    return value === right || value === down;
  });
}

export function MergeGame() {
  const [params] = useSearchParams();
  const [dailyMode, setDailyMode] = useState(() => params.get("daily") === "1");
  const dailyRngRef = useRef<() => number>(
    createSeededRng(getDailySeed("merge-2048")),
  );
  const [board, setBoard] = useState(() =>
    createBoard(params.get("daily") === "1" ? dailyRngRef.current : Math.random),
  );
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "over">("playing");
  const { best, submitScore } = useBestScore("merge-2048", "high");
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);

  function restart(nextDaily = dailyMode) {
    sfx.click();
    if (nextDaily) {
      dailyRngRef.current = createSeededRng(getDailySeed("merge-2048"));
      setBoard(createBoard(dailyRngRef.current));
    } else {
      setBoard(createBoard());
    }
    setScore(0);
    setStatus("playing");
  }

  function toggleDaily() {
    const next = !dailyMode;
    setDailyMode(next);
    restart(next);
  }

  function move(direction: MergeDirection) {
    if (status !== "playing") return;
    const result = moveMergeBoard(board, direction);
    if (result.board.every((value, index) => value === board[index])) return;
    const next = spawnTile(result.board, dailyMode ? dailyRngRef.current : Math.random);
    const nextScore = score + result.gained;
    setBoard(next);
    setScore(nextScore);
    if (result.gained > 0) {
      sfx.merge(Math.log2(Math.max(2, result.gained)));
    } else {
      sfx.click();
    }
    if (next.includes(2048)) {
      submitScore(nextScore);
      awardNovaCoins(Math.max(15, Math.floor(nextScore / 250)));
      sfx.win();
      setStatus("won");
    } else if (!canMove(next)) {
      submitScore(nextScore);
      if (nextScore >= 100) {
        awardNovaCoins(Math.max(2, Math.floor(nextScore / 350)));
      }
      sfx.fail();
      setStatus("over");
    }
  }

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const directions: Record<string, MergeDirection | undefined> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        move(direction);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  });

  function onBoardPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    swipeOrigin.current = { x: event.clientX, y: event.clientY };
  }

  function onBoardPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!swipeOrigin.current) return;
    const dx = event.clientX - swipeOrigin.current.x;
    const dy = event.clientY - swipeOrigin.current.y;
    swipeOrigin.current = null;
    if (Math.hypot(dx, dy) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "down" : "up");
    }
  }

  return (
    <div className="mini-game merge-game">
      <GameHud
        score={score}
        secondaryLabel="Maximum"
        secondaryValue={Math.max(...board)}
        bestLabel="Record"
        bestValue={best}
        onRestart={() => restart()}
      />
      <div className="mine-toolbar">
        <button
          className={dailyMode ? "active" : ""}
          type="button"
          aria-pressed={dailyMode}
          onClick={toggleDaily}
        >
          📅 {dailyMode ? `Défi ${getDailyKey()}` : "Défi du jour"}
        </button>
      </div>
      <div
        className="merge-board"
        onPointerDown={onBoardPointerDown}
        onPointerUp={onBoardPointerUp}
      >
        {board.map((value, index) => (
          <div
            className={`merge-tile merge-tile--${Math.min(value, 2048)}`}
            key={index}
            data-empty={value === 0}
          >
            {value || ""}
          </div>
        ))}
        {status !== "playing" && (
          <div className="game-overlay">
            <span>{status === "won" ? "Noyau stabilisé !" : "Plus de mouvement"}</span>
            <strong>{status === "won" ? "2048 atteint" : `${score} points`}</strong>
            <button type="button" onClick={() => restart()}>Nouvelle partie</button>
          </div>
        )}
      </div>
      <div className="direction-pad">
        <button type="button" aria-label="Haut" onClick={() => move("up")}>↑</button>
        <button type="button" aria-label="Gauche" onClick={() => move("left")}>←</button>
        <button type="button" aria-label="Bas" onClick={() => move("down")}>↓</button>
        <button type="button" aria-label="Droite" onClick={() => move("right")}>→</button>
      </div>
      <p className="game-help">Glisse sur la grille ou utilise les flèches pour fusionner les tuiles</p>
    </div>
  );
}
