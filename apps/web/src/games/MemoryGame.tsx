import { useMemo, useRef, useState } from "react";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { GameHud } from "./GameHud";

const symbols = ["🚀", "🪐", "🌙", "☄️", "👾", "⭐", "🛰️", "🌌"];

interface MemoryCard {
  id: number;
  symbol: string;
}

function createDeck(): MemoryCard[] {
  return [...symbols, ...symbols]
    .map((symbol, id) => ({ id, symbol }))
    .sort(() => Math.random() - 0.5);
}

export function MemoryGame() {
  const [deck, setDeck] = useState(createDeck);
  const [selected, setSelected] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const roundRef = useRef(0);
  const { best, submitScore } = useBestScore("memory-flip", "low");
  const complete = matched.length === deck.length;
  const matchedSymbols = useMemo(
    () => new Set(matched.map((id) => deck.find((card) => card.id === id)?.symbol)),
    [deck, matched],
  );

  function restart() {
    sfx.click();
    roundRef.current += 1;
    setDeck(createDeck());
    setSelected([]);
    setMatched([]);
    setMoves(0);
    setLocked(false);
  }

  function selectCard(card: MemoryCard) {
    if (locked || selected.includes(card.id) || matched.includes(card.id) || complete) return;
    sfx.click();
    const next = [...selected, card.id];
    setSelected(next);
    if (next.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setLocked(true);
    const round = roundRef.current;
    const [firstId] = next;
    const first = deck.find((item) => item.id === firstId);
    if (first?.symbol === card.symbol) {
      window.setTimeout(() => {
        if (round !== roundRef.current) return;
        const nextMatched = [...matched, ...next];
        setMatched(nextMatched);
        setSelected([]);
        setLocked(false);
        if (nextMatched.length === deck.length) {
          submitScore(nextMoves);
          awardNovaCoins(8);
          sfx.win();
        } else {
          sfx.pickup();
        }
      }, 350);
    } else {
      window.setTimeout(() => {
        if (round !== roundRef.current) return;
        setSelected([]);
        setLocked(false);
      }, 750);
    }
  }

  return (
    <div className="mini-game memory-game">
      <GameHud
        label="Mouvements"
        score={moves}
        secondaryLabel="Paires"
        secondaryValue={`${matchedSymbols.size}/${symbols.length}`}
        bestLabel="Record"
        bestValue={best}
        onRestart={restart}
      />
      <div className="memory-board">
        {deck.map((card) => {
          const revealed = selected.includes(card.id) || matched.includes(card.id);
          return (
            <button
              className={`memory-card ${revealed ? "memory-card--revealed" : ""} ${
                matched.includes(card.id) ? "memory-card--matched" : ""
              }`}
              type="button"
              key={card.id}
              aria-label={revealed ? card.symbol : "Carte cachée"}
              onClick={() => selectCard(card)}
            >
              <span className="memory-card__back">✦</span>
              <span className="memory-card__front">{card.symbol}</span>
            </button>
          );
        })}
        {complete && (
          <div className="game-overlay">
            <span>Constellation complète</span>
            <strong>{moves} mouvements</strong>
            <button type="button" onClick={restart}>Rejouer</button>
          </div>
        )}
      </div>
      <p className="game-help">Retourne deux cartes et retrouve toutes les paires</p>
    </div>
  );
}
