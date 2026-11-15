import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { createSeededRng, getDailyKey, getDailySeed } from "../lib/seededRng";
import { GameHud } from "./GameHud";

const SIZE = 9;
const MINE_COUNT = 10;

export interface MineCell {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
}

function neighbors(index: number): number[] {
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  const result: number[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow >= 0 && nextRow < SIZE && nextColumn >= 0 && nextColumn < SIZE) {
        result.push(nextRow * SIZE + nextColumn);
      }
    }
  }
  return result;
}

function emptyBoard(): MineCell[] {
  return Array.from({ length: SIZE * SIZE }, () => ({
    mine: false,
    adjacent: 0,
    revealed: false,
    flagged: false,
  }));
}

export function createMineBoard(firstIndex: number, rng: () => number = Math.random): MineCell[] {
  const board = emptyBoard();
  const excluded = new Set([firstIndex, ...neighbors(firstIndex)]);
  const available = Array.from({ length: SIZE * SIZE }, (_, index) => index).filter(
    (index) => !excluded.has(index),
  );
  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = available[i]!;
    available[i] = available[j]!;
    available[j] = tmp;
  }
  for (const index of available.slice(0, MINE_COUNT)) {
    const cell = board[index];
    if (cell) cell.mine = true;
  }
  return board.map((cell, index) => ({
    ...cell,
    adjacent: neighbors(index).filter((neighbor) => board[neighbor]?.mine).length,
  }));
}

function revealCells(board: MineCell[], start: number): MineCell[] {
  const next = board.map((cell) => ({ ...cell }));
  const queue = [start];
  const visited = new Set<number>();
  while (queue.length > 0) {
    const index = queue.shift();
    if (index === undefined || visited.has(index)) continue;
    visited.add(index);
    const cell = next[index];
    if (!cell || cell.flagged) continue;
    cell.revealed = true;
    if (!cell.mine && cell.adjacent === 0) {
      queue.push(...neighbors(index).filter((neighbor) => !visited.has(neighbor)));
    }
  }
  return next;
}

export function MinesGame() {
  const [params] = useSearchParams();
  const [dailyMode, setDailyMode] = useState(() => params.get("daily") === "1");
  const [board, setBoard] = useState(emptyBoard);
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "won" | "lost">("idle");
  const [flagMode, setFlagMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const { best, submitScore } = useBestScore("crystal-mines", "low");
  const flags = board.filter((cell) => cell.flagged).length;

  const restart = useCallback(() => {
    sfx.click();
    setBoard(emptyBoard());
    setStatus("idle");
    setFlagMode(false);
    setSeconds(0);
  }, []);

  function toggleDaily() {
    setDailyMode((current) => !current);
    setBoard(emptyBoard());
    setStatus("idle");
    setFlagMode(false);
    setSeconds(0);
    sfx.click();
  }

  const togglePause = useCallback(() => {
    setStatus((current) =>
      current === "playing" ? "paused" : current === "paused" ? "playing" : current,
    );
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        setStatus((current) => (current === "playing" ? "paused" : current));
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function toggleFlag(index: number) {
    if (status === "won" || status === "lost" || status === "paused") return;
    sfx.flag();
    setBoard((current) =>
      current.map((cell, cellIndex) =>
        cellIndex === index && !cell.revealed ? { ...cell, flagged: !cell.flagged } : cell,
      ),
    );
  }

  function reveal(index: number) {
    if (status === "won" || status === "lost" || status === "paused") return;
    if (flagMode) {
      toggleFlag(index);
      return;
    }
    let current = board;
    if (status === "idle") {
      const rng = dailyMode ? createSeededRng(getDailySeed("crystal-mines")) : Math.random;
      current = createMineBoard(index, rng).map((cell, cellIndex) => ({
        ...cell,
        flagged: board[cellIndex]?.flagged ?? false,
      }));
      setStatus("playing");
    }
    const selected = current[index];
    if (!selected || selected.flagged || selected.revealed) return;
    if (selected.mine) {
      setBoard(current.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell)));
      sfx.fail();
      setStatus("lost");
      return;
    }
    const next = revealCells(current, index);
    const safeCellsRevealed = next.every((cell) => cell.mine || cell.revealed);
    setBoard(next);
    if (safeCellsRevealed) {
      submitScore(seconds);
      awardNovaCoins(12);
      sfx.win();
      setStatus("won");
    } else {
      sfx.click();
    }
  }

  return (
    <div className="mini-game mines-game">
      <GameHud
        label="Temps"
        score={`${seconds}s`}
        secondaryLabel="Cristaux"
        secondaryValue={`${Math.max(0, MINE_COUNT - flags)}`}
        bestLabel="Record"
        bestValue={best !== null ? `${best}s` : null}
        paused={status === "paused"}
        onTogglePause={status === "playing" || status === "paused" ? togglePause : undefined}
        onRestart={restart}
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
        <button
          className={flagMode ? "active" : ""}
          type="button"
          aria-pressed={flagMode}
          onClick={() => setFlagMode((current) => !current)}
        >
          🚩 Mode drapeau
        </button>
      </div>
      <div className="mines-board">
        {board.map((cell, index) => (
          <button
            className={[
              "mine-cell",
              cell.revealed ? "mine-cell--revealed" : "",
              cell.mine && cell.revealed ? "mine-cell--mine" : "",
              cell.adjacent ? `mine-cell--n${cell.adjacent}` : "",
            ].filter(Boolean).join(" ")}
            type="button"
            key={index}
            aria-label={
              cell.flagged
                ? "Case marquée"
                : cell.revealed
                  ? cell.mine
                    ? "Mine"
                    : `${cell.adjacent} mine voisine`
                  : "Case cachée"
            }
            onClick={() => reveal(index)}
            onContextMenu={(event) => {
              event.preventDefault();
              toggleFlag(index);
            }}
          >
            {cell.flagged && !cell.revealed
              ? "🚩"
              : cell.revealed && cell.mine
                ? "💥"
                : cell.revealed && cell.adjacent > 0
                  ? cell.adjacent
                  : ""}
          </button>
        ))}
        {(status === "won" || status === "lost" || status === "paused") && (
          <div className="game-overlay">
            <span>
              {status === "paused"
                ? "Partie en pause"
                : status === "won"
                  ? "Mine sécurisée !"
                  : "Charge déclenchée"}
            </span>
            <strong>
              {status === "paused"
                ? `${seconds} secondes`
                : status === "won"
                  ? `${seconds} secondes`
                  : "Analyse interrompue"}
            </strong>
            <button type="button" onClick={status === "paused" ? togglePause : restart}>
              {status === "paused" ? "Reprendre" : "Nouvelle mine"}
            </button>
          </div>
        )}
      </div>
      <p className="game-help">Clic droit ou mode drapeau pour marquer une charge</p>
    </div>
  );
}
