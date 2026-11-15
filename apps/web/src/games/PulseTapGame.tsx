import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { GameHud } from "./GameHud";

interface PulseTarget {
  id: number;
  x: number;
  y: number;
  hazard: boolean;
}

function createTarget(id: number): PulseTarget {
  return {
    id,
    x: 10 + Math.random() * 80,
    y: 12 + Math.random() * 74,
    hazard: Math.random() < 0.18,
  };
}

export function PulseTapGame() {
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "over">("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(30);
  const [target, setTarget] = useState(() => createTarget(1));
  const scoreRef = useRef(0);
  const { best, submitScore } = useBestScore("pulse-tap", "high");

  scoreRef.current = score;

  const start = useCallback(() => {
    sfx.click();
    setScore(0);
    setCombo(0);
    setTime(30);
    setTarget(createTarget(Date.now()));
    setStatus("playing");
  }, []);

  const togglePause = useCallback(() => {
    setStatus((current) =>
      current === "playing" ? "paused" : current === "paused" ? "playing" : current,
    );
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        setStatus((current) => (current === "playing" ? "paused" : current));
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    const countdown = window.setInterval(() => {
      setTime((current) => {
        if (current <= 1) {
          submitScore(scoreRef.current);
          if (scoreRef.current > 0) {
            awardNovaCoins(Math.max(2, Math.floor(scoreRef.current / 35)));
            sfx.win();
          }
          setStatus("over");
          return 0;
        }
        return current - 1;
      });
    }, 1_000);
    return () => window.clearInterval(countdown);
  }, [status, submitScore]);

  useEffect(() => {
    if (status !== "playing") return;
    const mover = window.setInterval(() => {
      setTarget((current) => createTarget(current.id + 1));
      setCombo(0);
    }, 1_250);
    return () => window.clearInterval(mover);
  }, [status]);

  function hitTarget() {
    if (status !== "playing") return;
    if (target.hazard) {
      sfx.fail();
      setScore((current) => Math.max(0, current - 20));
      setCombo(0);
    } else {
      sfx.pickup();
      setScore((current) => current + 10 + Math.min(combo, 10) * 2);
      setCombo((current) => current + 1);
    }
    setTarget((current) => createTarget(current.id + 1));
  }

  return (
    <div className="mini-game pulse-game">
      <GameHud
        score={score}
        secondaryLabel="Temps"
        secondaryValue={`${time}s`}
        bestLabel="Record"
        bestValue={best}
        paused={status === "paused"}
        onTogglePause={status === "playing" || status === "paused" ? togglePause : undefined}
        onRestart={start}
      />
      <div className="pulse-arena">
        <span className="pulse-grid" />
        {status === "playing" && (
          <button
            className={`pulse-target ${target.hazard ? "pulse-target--hazard" : ""}`}
            type="button"
            aria-label={target.hazard ? "Leurre, ne pas toucher" : "Cible"}
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
            onClick={hitTarget}
          >
            <span />
          </button>
        )}
        <div className="pulse-combo">Combo <strong>x{combo}</strong></div>
        {status !== "playing" && (
          <div className="game-overlay">
            <span>
              {status === "paused"
                ? "En pause"
                : status === "over"
                  ? "Temps écoulé"
                  : "Test de réflexes"}
            </span>
            <strong>{status === "idle" ? "Pulse Pop" : `${score} points`}</strong>
            <button type="button" onClick={status === "paused" ? togglePause : start}>
              {status === "paused" ? "Reprendre" : status === "over" ? "Retenter" : "Démarrer"}
            </button>
          </div>
        )}
      </div>
      <p className="game-help">Touche les cibles violettes, évite les leurres rouges</p>
    </div>
  );
}
