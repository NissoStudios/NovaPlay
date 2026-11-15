import { Pause, Play, RotateCcw } from "lucide-react";

interface GameHudProps {
  label?: string;
  score: number | string;
  secondaryLabel?: string;
  secondaryValue?: number | string;
  bestLabel?: string;
  bestValue?: number | string | null;
  paused?: boolean;
  onTogglePause?: () => void;
  onRestart: () => void;
}

export function GameHud({
  label = "Score",
  score,
  secondaryLabel,
  secondaryValue,
  bestLabel,
  bestValue,
  paused,
  onTogglePause,
  onRestart,
}: GameHudProps) {
  return (
    <div className="game-hud">
      <div className="game-hud__metric">
        <span>{label}</span>
        <strong>{score}</strong>
      </div>
      {secondaryLabel && (
        <div className="game-hud__metric">
          <span>{secondaryLabel}</span>
          <strong>{secondaryValue}</strong>
        </div>
      )}
      {bestLabel && bestValue !== null && bestValue !== undefined && (
        <div className="game-hud__metric game-hud__metric--best">
          <span>{bestLabel}</span>
          <strong>{bestValue}</strong>
        </div>
      )}
      <div className="game-hud__actions">
        {onTogglePause && (
          <button
            type="button"
            aria-label={paused ? "Reprendre" : "Pause"}
            aria-pressed={paused}
            onClick={onTogglePause}
          >
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
            {paused ? "Reprendre" : "Pause"}
          </button>
        )}
        <button type="button" onClick={onRestart}>
          <RotateCcw size={16} aria-hidden="true" />
          Recommencer
        </button>
      </div>
    </div>
  );
}
