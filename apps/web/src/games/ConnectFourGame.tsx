import { useEffect, useState } from "react";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { GameHud } from "./GameHud";

type Disc = 0 | 1 | 2;
const ROWS = 6;
const COLUMNS = 7;

function dropDisc(board: Disc[], column: number, disc: Disc): Disc[] | null {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    const index = row * COLUMNS + column;
    if (board[index] === 0) {
      const next = [...board];
      next[index] = disc;
      return next;
    }
  }
  return null;
}

function getWinner(board: Disc[]): Disc | 3 {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const disc = board[row * COLUMNS + column] ?? 0;
      if (!disc) continue;
      for (const [rowStep, columnStep] of directions) {
        let count = 1;
        for (let offset = 1; offset < 4; offset += 1) {
          const nextRow = row + rowStep * offset;
          const nextColumn = column + columnStep * offset;
          if (
            nextRow < 0 ||
            nextRow >= ROWS ||
            nextColumn < 0 ||
            nextColumn >= COLUMNS ||
            board[nextRow * COLUMNS + nextColumn] !== disc
          ) {
            break;
          }
          count += 1;
        }
        if (count === 4) return disc;
      }
    }
  }
  return board.every((cell) => cell !== 0) ? 3 : 0;
}

function chooseColumn(board: Disc[]): number {
  const available = Array.from({ length: COLUMNS }, (_, column) => column).filter(
    (column) => board[column] === 0,
  );
  for (const disc of [2, 1] as const) {
    const winning = available.find((column) => {
      const next = dropDisc(board, column, disc);
      return next && getWinner(next) === disc;
    });
    if (winning !== undefined) return winning;
  }
  const weighted = [3, 2, 4, 1, 5, 0, 6].filter((column) => available.includes(column));
  return weighted[Math.floor(Math.random() * Math.min(3, weighted.length))] ?? available[0] ?? -1;
}

export function ConnectFourGame() {
  const [board, setBoard] = useState<Disc[]>(Array<Disc>(ROWS * COLUMNS).fill(0));
  const [turn, setTurn] = useState<1 | 2>(1);
  const [wins, setWins] = useState(0);
  const { best, submitScore } = useBestScore("puissance-quatre", "high");
  const result = getWinner(board);

  function restart() {
    sfx.click();
    setBoard(Array<Disc>(ROWS * COLUMNS).fill(0));
    setTurn(1);
  }

  function playColumn(column: number) {
    if (turn !== 1 || result) return;
    const next = dropDisc(board, column, 1);
    if (!next) return;
    setBoard(next);
    if (getWinner(next) === 1) {
      const nextWins = wins + 1;
      setWins(nextWins);
      submitScore(nextWins);
      awardNovaCoins(7);
      sfx.win();
    } else {
      sfx.click();
      setTurn(2);
    }
  }

  useEffect(() => {
    if (turn !== 2 || result) return;
    const timer = window.setTimeout(() => {
      setBoard((current) => {
        const column = chooseColumn(current);
        if (column < 0) return current;
        const next = dropDisc(current, column, 2) ?? current;
        if (getWinner(next) === 2) sfx.fail();
        else sfx.click();
        return next;
      });
      setTurn(1);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [result, turn]);

  return (
    <div className="mini-game connect-game">
      <GameHud
        label="Victoires"
        score={wins}
        secondaryLabel="Tour"
        secondaryValue={result ? "Terminé" : turn === 1 ? "Toi" : "Nova"}
        bestLabel="Record"
        bestValue={best}
        onRestart={restart}
      />
      <div className="connect-column-buttons" aria-label="Choisir une colonne">
        {Array.from({ length: COLUMNS }, (_, column) => (
          <button
            type="button"
            key={column}
            aria-label={`Jouer dans la colonne ${column + 1}`}
            onClick={() => playColumn(column)}
          >
            ↓
          </button>
        ))}
      </div>
      <div className="connect-board">
        {board.map((disc, index) => (
          <span
            className={`connect-cell ${disc ? `connect-cell--p${disc}` : ""}`}
            key={index}
          />
        ))}
        {result !== 0 && (
          <div className="game-overlay">
            <span>
              {result === 1 ? "Quatre en ligne !" : result === 2 ? "Nova gagne" : "Grille complète"}
            </span>
            <strong>{result === 1 ? "Victoire orbitale" : "Prêt pour la revanche ?"}</strong>
            <button type="button" onClick={restart}>Rejouer</button>
          </div>
        )}
      </div>
      <p className="game-help">Clique sur une flèche pour lancer ton satellite jaune</p>
    </div>
  );
}
