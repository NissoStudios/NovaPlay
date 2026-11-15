import { useEffect, useState } from "react";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { GameHud } from "./GameHud";

type SimonStatus = "idle" | "showing" | "input" | "between" | "over";
const sectorLabels = ["Comète", "Nova", "Orbite", "Pulsar"];

function randomSector(): number {
  return Math.floor(Math.random() * 4);
}

export function SimonGame() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [status, setStatus] = useState<SimonStatus>("idle");
  const [active, setActive] = useState<number | null>(null);
  const [inputIndex, setInputIndex] = useState(0);
  const { best, submitScore } = useBestScore("simon-orbit", "high");
  const round = sequence.length;

  function start() {
    sfx.click();
    setSequence([randomSector()]);
    setInputIndex(0);
    setStatus("showing");
  }

  useEffect(() => {
    if (status !== "showing") return;
    const timers: number[] = [];
    sequence.forEach((sector, index) => {
      timers.push(
        window.setTimeout(() => {
          setActive(sector);
          sfx.simon(sector);
        }, 500 + index * 650),
        window.setTimeout(() => setActive(null), 950 + index * 650),
      );
    });
    timers.push(
      window.setTimeout(() => {
        setInputIndex(0);
        setStatus("input");
      }, 550 + sequence.length * 650),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [sequence, status]);

  useEffect(() => {
    if (status !== "between") return;
    const timer = window.setTimeout(() => {
      setSequence((current) => [...current, randomSector()]);
      setStatus("showing");
    }, 750);
    return () => window.clearTimeout(timer);
  }, [status]);

  function pressSector(sector: number) {
    if (status !== "input") return;
    setActive(sector);
    window.setTimeout(() => setActive(null), 220);
    if (sequence[inputIndex] !== sector) {
      sfx.fail();
      const cleared = Math.max(0, round - 1);
      submitScore(cleared);
      if (cleared >= 2) {
        awardNovaCoins(cleared * 2);
      }
      setStatus("over");
      return;
    }
    sfx.simon(sector);
    if (inputIndex === sequence.length - 1) {
      submitScore(round);
      setStatus("between");
      return;
    }
    setInputIndex((current) => current + 1);
  }

  return (
    <div className="mini-game simon-game">
      <GameHud
        label="Séquence"
        score={round}
        secondaryLabel="État"
        secondaryValue={
          status === "showing" ? "Observe" : status === "input" ? "À toi" : status === "between" ? "Bravo" : "Prêt"
        }
        bestLabel="Record"
        bestValue={best}
        onRestart={start}
      />
      <div className="simon-board">
        {[0, 1, 2, 3].map((sector) => (
          <button
            className={`simon-sector simon-sector--${sector} ${active === sector ? "active" : ""}`}
            type="button"
            key={sector}
            aria-label={sectorLabels[sector]}
            disabled={status !== "input"}
            onClick={() => pressSector(sector)}
          />
        ))}
        <div className="simon-core">
          <span>{status === "input" ? `${inputIndex + 1}/${round}` : round}</span>
          <small>{status === "showing" ? "Observe" : status === "input" ? "À toi" : "Niveau"}</small>
        </div>
        {(status === "idle" || status === "over") && (
          <div className="game-overlay game-overlay--transparent">
            <span>{status === "over" ? "Signal incorrect" : "Mémoire orbitale"}</span>
            <strong>{status === "over" ? `Niveau ${Math.max(0, round - 1)}` : "Simon Orbital"}</strong>
            <button type="button" onClick={start}>
              {status === "over" ? "Réessayer" : "Commencer"}
            </button>
          </div>
        )}
      </div>
      <p className="game-help">Observe les signaux puis reproduis la séquence</p>
    </div>
  );
}
