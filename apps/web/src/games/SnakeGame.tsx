import { useEffect, useReducer, useRef } from "react";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { GameHud } from "./GameHud";

const BOARD_SIZE = 18;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

type Direction = "up" | "down" | "left" | "right";
type GameStatus = "idle" | "playing" | "paused" | "over";

interface SnakeState {
  snake: number[];
  direction: Direction;
  queuedDirection: Direction;
  food: number;
  score: number;
  status: GameStatus;
}

type SnakeAction =
  | { type: "start" }
  | { type: "pause"; paused?: boolean }
  | { type: "turn"; direction: Direction }
  | { type: "tick" };

const directionDelta: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const oppositeDirection: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function createFood(snake: number[]): number {
  const freeCells = Array.from({ length: CELL_COUNT }, (_, index) => index).filter(
    (cell) => !snake.includes(cell),
  );
  return freeCells[Math.floor(Math.random() * freeCells.length)] ?? 0;
}

function initialSnakeState(): SnakeState {
  const center = Math.floor(BOARD_SIZE / 2) * BOARD_SIZE + Math.floor(BOARD_SIZE / 2);
  const snake = [center, center - 1, center - 2];
  return {
    snake,
    direction: "right",
    queuedDirection: "right",
    food: createFood(snake),
    score: 0,
    status: "idle",
  };
}

function snakeReducer(state: SnakeState, action: SnakeAction): SnakeState {
  if (action.type === "start") {
    return { ...initialSnakeState(), status: "playing" };
  }
  if (action.type === "pause") {
    if (state.status !== "playing" && state.status !== "paused") return state;
    const nextPaused = action.paused ?? state.status === "playing";
    return { ...state, status: nextPaused ? "paused" : "playing" };
  }
  if (action.type === "turn") {
    if (oppositeDirection[state.direction] === action.direction) return state;
    return { ...state, queuedDirection: action.direction };
  }
  if (state.status !== "playing") return state;

  const head = state.snake[0] ?? 0;
  const headX = head % BOARD_SIZE;
  const headY = Math.floor(head / BOARD_SIZE);
  const delta = directionDelta[state.queuedDirection];
  const nextX = headX + delta.x;
  const nextY = headY + delta.y;
  const hitWall = nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE;
  if (hitWall) return { ...state, status: "over" };

  const nextHead = nextY * BOARD_SIZE + nextX;
  const ateFood = nextHead === state.food;
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);
  if (collisionBody.includes(nextHead)) return { ...state, status: "over" };

  const snake = [nextHead, ...state.snake];
  if (!ateFood) snake.pop();

  return {
    snake,
    direction: state.queuedDirection,
    queuedDirection: state.queuedDirection,
    food: ateFood ? createFood(snake) : state.food,
    score: state.score + (ateFood ? 10 : 0),
    status: "playing",
  };
}

export function SnakeGame() {
  const [state, dispatch] = useReducer(snakeReducer, undefined, initialSnakeState);
  const { best, submitScore } = useBestScore("neon-snake", "high");
  const prevScore = useRef(0);
  const prevStatus = useRef<GameStatus>("idle");
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (state.score > prevScore.current) {
      sfx.pickup();
    }
    prevScore.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.status === "over" && prevStatus.current !== "over") {
      sfx.fail();
      submitScore(state.score);
      if (state.score > 0) {
        awardNovaCoins(Math.max(2, Math.floor(state.score / 20)));
      }
    }
    prevStatus.current = state.status;
  }, [state.score, state.status, submitScore]);

  useEffect(() => {
    if (state.status !== "playing") return;
    const delay = Math.max(75, 155 - Math.floor(state.score / 40) * 8);
    const timer = window.setInterval(() => dispatch({ type: "tick" }), delay);
    return () => window.clearInterval(timer);
  }, [state.score, state.status]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const directions: Record<string, Direction | undefined> = {
        ArrowUp: "up",
        w: "up",
        z: "up",
        ArrowDown: "down",
        s: "down",
        ArrowLeft: "left",
        a: "left",
        q: "left",
        ArrowRight: "right",
        d: "right",
      };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        dispatch({ type: "turn", direction });
      } else if ((event.key.toLowerCase() === "p" || event.key === "Escape") && (state.status === "playing" || state.status === "paused")) {
        event.preventDefault();
        dispatch({ type: "pause" });
      } else if (event.code === "Space" && (state.status === "idle" || state.status === "over")) {
        event.preventDefault();
        sfx.click();
        dispatch({ type: "start" });
      }
    }
    function onVisibilityChange() {
      if (document.hidden) {
        dispatch({ type: "pause", paused: true });
      }
    }
    window.addEventListener("keydown", handleKeydown);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [state.status]);

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
      dispatch({ type: "turn", direction: dx > 0 ? "right" : "left" });
    } else {
      dispatch({ type: "turn", direction: dy > 0 ? "down" : "up" });
    }
  }

  return (
    <div className="mini-game snake-game">
      <GameHud
        score={state.score}
        bestLabel="Record"
        bestValue={best}
        paused={state.status === "paused"}
        onTogglePause={
          state.status === "playing" || state.status === "paused"
            ? () => dispatch({ type: "pause" })
            : undefined
        }
        onRestart={() => {
          sfx.click();
          dispatch({ type: "start" });
        }}
      />
      <div
        className="snake-board"
        aria-label="Plateau de Neon Serpent"
        onPointerDown={onBoardPointerDown}
        onPointerUp={onBoardPointerUp}
      >
        {Array.from({ length: CELL_COUNT }, (_, cell) => {
          const snakeIndex = state.snake.indexOf(cell);
          const classNames = [
            "snake-cell",
            snakeIndex === 0 ? "snake-cell--head" : "",
            snakeIndex > 0 ? "snake-cell--body" : "",
            cell === state.food ? "snake-cell--food" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return <span className={classNames} key={cell} />;
        })}
        {state.status !== "playing" && (
          <div className="game-overlay">
            <span>
              {state.status === "paused"
                ? "Partie en pause"
                : state.status === "over"
                  ? "Collision !"
                  : "Prêt à briller ?"}
            </span>
            <strong>{state.status === "idle" ? "Neon Serpent" : `${state.score} points`}</strong>
            <button
              type="button"
              onClick={() => {
                sfx.click();
                dispatch(
                  state.status === "paused"
                    ? { type: "pause", paused: false }
                    : { type: "start" },
                );
              }}
            >
              {state.status === "paused"
                ? "Reprendre"
                : state.status === "over"
                  ? "Rejouer"
                  : "Commencer"}
            </button>
          </div>
        )}
      </div>
      <div className="direction-pad" aria-label="Commandes directionnelles">
        <button type="button" aria-label="Haut" onClick={() => dispatch({ type: "turn", direction: "up" })}>↑</button>
        <button type="button" aria-label="Gauche" onClick={() => dispatch({ type: "turn", direction: "left" })}>←</button>
        <button type="button" aria-label="Bas" onClick={() => dispatch({ type: "turn", direction: "down" })}>↓</button>
        <button type="button" aria-label="Droite" onClick={() => dispatch({ type: "turn", direction: "right" })}>→</button>
      </div>
      <p className="game-help">Flèches, ZQSD, glisser sur le plateau ou commandes tactiles • P pour pause</p>
    </div>
  );
}
