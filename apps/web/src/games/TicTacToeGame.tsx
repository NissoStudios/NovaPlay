import { useEffect, useState } from "react";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { GameHud } from "./GameHud";

type Mark = "X" | "O";
type Cell = Mark | null;

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

function winner(board: Cell[]): Mark | "draw" | null {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : null;
}

function minimax(board: Cell[], maximizing: boolean): number {
  const result = winner(board);
  if (result === "O") return 10;
  if (result === "X") return -10;
  if (result === "draw") return 0;

  const scores = board.flatMap((cell, index) => {
    if (cell) return [];
    const next = [...board];
    next[index] = maximizing ? "O" : "X";
    return [minimax(next, !maximizing)];
  });
  return maximizing ? Math.max(...scores) : Math.min(...scores);
}

function chooseAiMove(board: Cell[]): number {
  const available = board.flatMap((cell, index) => (cell ? [] : [index]));
  let bestScore = -Infinity;
  let bestMoves: number[] = [];
  for (const index of available) {
    const next = [...board];
    next[index] = "O";
    const score = minimax(next, false);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) {
      bestMoves.push(index);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? available[0] ?? -1;
}

export function TicTacToeGame() {
  const [board, setBoard] = useState<Cell[]>(Array<Cell>(9).fill(null));
  const [turn, setTurn] = useState<Mark>("X");
  const [wins, setWins] = useState(0);
  const { best, submitScore } = useBestScore("morpion-solo", "high");
  const result = winner(board);

  function restart() {
    sfx.click();
    setBoard(Array<Cell>(9).fill(null));
    setTurn("X");
  }

  function play(index: number) {
    if (turn !== "X" || board[index] || result) return;
    const next = [...board];
    next[index] = "X";
    const nextResult = winner(next);
    setBoard(next);
    if (nextResult === "X") {
      const nextWins = wins + 1;
      setWins(nextWins);
      submitScore(nextWins);
      awardNovaCoins(5);
      sfx.win();
    } else {
      sfx.click();
      if (!nextResult) setTurn("O");
    }
  }

  useEffect(() => {
    if (turn !== "O" || result) return;
    const timer = window.setTimeout(() => {
      setBoard((current) => {
        const index = chooseAiMove(current);
        if (index < 0) return current;
        const next = [...current];
        next[index] = "O";
        if (winner(next) === "O") sfx.fail();
        else sfx.click();
        return next;
      });
      setTurn("X");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [result, turn]);

  return (
    <div className="mini-game tictactoe-game">
      <GameHud
        label="Victoires"
        score={wins}
        secondaryLabel="Tour"
        secondaryValue={result ? "Terminé" : turn === "X" ? "Toi" : "Nova"}
        bestLabel="Record"
        bestValue={best}
        onRestart={restart}
      />
      <div className="tictactoe-board">
        {board.map((cell, index) => (
          <button
            className={cell ? `mark-${cell.toLowerCase()}` : ""}
            type="button"
            key={index}
            aria-label={cell ? `Case ${cell}` : `Case vide ${index + 1}`}
            onClick={() => play(index)}
          >
            {cell}
          </button>
        ))}
        {result && (
          <div className="game-overlay">
            <span>
              {result === "X" ? "Victoire !" : result === "O" ? "Nova gagne" : "Égalité parfaite"}
            </span>
            <strong>{result === "X" ? "Bien joué" : "Nouvelle manche ?"}</strong>
            <button type="button" onClick={restart}>Rejouer</button>
          </div>
        )}
      </div>
      <p className="game-help">Tu joues avec X. Aligne trois symboles.</p>
    </div>
  );
}
