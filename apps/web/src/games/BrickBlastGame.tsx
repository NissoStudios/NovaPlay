import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { GameHud } from "./GameHud";

const WIDTH = 720;
const HEIGHT = 440;
const PADDLE_WIDTH = 110;
const PADDLE_SPEED = 450;
const BALL_SPEED = 360;

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface BrickRuntime {
  ballX: number;
  ballY: number;
  velocityX: number;
  velocityY: number;
  paddleX: number;
  bricks: Brick[];
  sparks: Spark[];
  score: number;
  lives: number;
}

function createBricks(): Brick[] {
  const colors = ["#7c5cff", "#a767ff", "#ec5fca", "#ff6584", "#ff984a"];
  return Array.from({ length: 40 }, (_, index) => ({
    x: 45 + (index % 8) * 80,
    y: 42 + Math.floor(index / 8) * 34,
    alive: true,
    color: colors[Math.floor(index / 8)] ?? "#7c5cff",
  }));
}

function createRuntime(): BrickRuntime {
  return {
    ballX: WIDTH / 2,
    ballY: HEIGHT - 75,
    velocityX: BALL_SPEED * 0.68,
    velocityY: -BALL_SPEED * 0.73,
    paddleX: WIDTH / 2 - PADDLE_WIDTH / 2,
    bricks: createBricks(),
    sparks: [],
    score: 0,
    lives: 3,
  };
}

export function BrickBlastGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<BrickRuntime>(createRuntime());
  const keysRef = useRef({ left: false, right: false });
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "won" | "over">("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [runId, setRunId] = useState(0);
  const { best, submitScore } = useBestScore("brick-blast", "high");

  const start = useCallback(() => {
    runtimeRef.current = createRuntime();
    setScore(0);
    setLives(3);
    setRunId((current) => current + 1);
    setStatus("playing");
    sfx.click();
  }, []);

  const togglePause = useCallback(() => {
    setStatus((current) =>
      current === "playing" ? "paused" : current === "paused" ? "playing" : current,
    );
  }, []);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") keysRef.current.left = true;
      if (event.key === "ArrowRight") keysRef.current.right = true;
      if ((event.key.toLowerCase() === "p" || event.key === "Escape") && (status === "playing" || status === "paused")) {
        event.preventDefault();
        togglePause();
      }
    }
    function keyup(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") keysRef.current.left = false;
      if (event.key === "ArrowRight") keysRef.current.right = false;
    }
    function onVisibilityChange() {
      if (document.hidden) {
        setStatus((current) => (current === "playing" ? "paused" : current));
      }
    }
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, togglePause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    function draw(runtime: BrickRuntime) {
      if (!context) return;
      const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, "#11152c");
      gradient.addColorStop(1, "#090b17");
      context.fillStyle = gradient;
      context.fillRect(0, 0, WIDTH, HEIGHT);

      context.strokeStyle = "rgba(124, 92, 255, 0.08)";
      for (let x = 0; x < WIDTH; x += 40) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, HEIGHT);
        context.stroke();
      }

      for (const brick of runtime.bricks) {
        if (!brick.alive) continue;
        context.shadowBlur = 12;
        context.shadowColor = brick.color;
        context.fillStyle = brick.color;
        context.beginPath();
        context.roundRect(brick.x, brick.y, 68, 20, 6);
        context.fill();
      }

      for (const spark of runtime.sparks) {
        context.globalAlpha = Math.max(0, spark.life * 2);
        context.shadowBlur = 8;
        context.shadowColor = spark.color;
        context.fillStyle = spark.color;
        context.fillRect(spark.x - 2, spark.y - 2, 4, 4);
      }
      context.globalAlpha = 1;

      context.shadowBlur = 20;
      context.shadowColor = "#55f5d0";
      context.fillStyle = "#55f5d0";
      context.beginPath();
      context.roundRect(runtime.paddleX, HEIGHT - 28, PADDLE_WIDTH, 12, 8);
      context.fill();

      context.shadowColor = "#ffffff";
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(runtime.ballX, runtime.ballY, 8, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }

    draw(runtimeRef.current);
    if (status !== "playing") return;

    let animationFrame = 0;
    let lastTime = performance.now();

    function spawnSparks(runtime: BrickRuntime, x: number, y: number, color: string) {
      for (let i = 0; i < 7; i += 1) {
        const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
        const speed = 70 + Math.random() * 110;
        runtime.sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.45,
          color,
        });
      }
    }

    function frame(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      const runtime = runtimeRef.current;
      if (keysRef.current.left) runtime.paddleX -= PADDLE_SPEED * dt;
      if (keysRef.current.right) runtime.paddleX += PADDLE_SPEED * dt;
      runtime.paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, runtime.paddleX));
      runtime.ballX += runtime.velocityX * dt;
      runtime.ballY += runtime.velocityY * dt;

      if (runtime.ballX <= 8) {
        runtime.ballX = 8;
        runtime.velocityX = Math.abs(runtime.velocityX);
        sfx.bounce();
      } else if (runtime.ballX >= WIDTH - 8) {
        runtime.ballX = WIDTH - 8;
        runtime.velocityX = -Math.abs(runtime.velocityX);
        sfx.bounce();
      }
      if (runtime.ballY <= 8) {
        runtime.ballY = 8;
        runtime.velocityY = Math.abs(runtime.velocityY);
        sfx.bounce();
      }

      if (
        runtime.velocityY > 0 &&
        runtime.ballY >= HEIGHT - 40 &&
        runtime.ballY <= HEIGHT - 16 &&
        runtime.ballX >= runtime.paddleX - 4 &&
        runtime.ballX <= runtime.paddleX + PADDLE_WIDTH + 4
      ) {
        const impact = (runtime.ballX - (runtime.paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
        const clampedImpact = Math.max(-0.92, Math.min(0.92, impact));
        const speed = Math.min(520, Math.hypot(runtime.velocityX, runtime.velocityY) * 1.015);
        runtime.velocityX = clampedImpact * speed * 0.85;
        runtime.velocityY = -Math.sqrt(Math.max(40_000, speed * speed - runtime.velocityX * runtime.velocityX));
        runtime.ballY = HEIGHT - 40;
        spawnSparks(runtime, runtime.ballX, HEIGHT - 28, "#55f5d0");
        sfx.bounce();
      }

      for (const brick of runtime.bricks) {
        if (
          brick.alive &&
          runtime.ballX >= brick.x - 6 &&
          runtime.ballX <= brick.x + 74 &&
          runtime.ballY >= brick.y - 8 &&
          runtime.ballY <= brick.y + 28
        ) {
          brick.alive = false;
          runtime.velocityY *= -1;
          runtime.score += 10;
          setScore(runtime.score);
          spawnSparks(runtime, brick.x + 34, brick.y + 10, brick.color);
          sfx.brick();
          break;
        }
      }

      runtime.sparks = runtime.sparks
        .map((spark) => ({
          ...spark,
          x: spark.x + spark.vx * dt,
          y: spark.y + spark.vy * dt,
          life: spark.life - dt,
        }))
        .filter((spark) => spark.life > 0);

      if (runtime.bricks.every((brick) => !brick.alive)) {
        draw(runtime);
        submitScore(runtime.score);
        awardNovaCoins(Math.max(10, Math.floor(runtime.score / 20)));
        sfx.win();
        setStatus("won");
        return;
      }

      if (runtime.ballY > HEIGHT + 10) {
        runtime.lives -= 1;
        setLives(runtime.lives);
        sfx.fail();
        if (runtime.lives <= 0) {
          draw(runtime);
          submitScore(runtime.score);
          if (runtime.score > 0) {
            awardNovaCoins(Math.max(2, Math.floor(runtime.score / 30)));
          }
          setStatus("over");
          return;
        }
        runtime.ballX = WIDTH / 2;
        runtime.ballY = HEIGHT - 75;
        runtime.velocityX = (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED * 0.68;
        runtime.velocityY = -BALL_SPEED * 0.73;
      }

      draw(runtime);
      animationFrame = window.requestAnimationFrame(frame);
    }

    animationFrame = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [runId, status, submitScore]);

  function movePaddle(event: React.PointerEvent<HTMLCanvasElement>) {
    if (status !== "playing") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    runtimeRef.current.paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2));
  }

  return (
    <div className="mini-game brick-game">
      <GameHud
        score={score}
        secondaryLabel="Vies"
        secondaryValue={"●".repeat(lives) || "0"}
        bestLabel="Record"
        bestValue={best}
        paused={status === "paused"}
        onTogglePause={status === "playing" || status === "paused" ? togglePause : undefined}
        onRestart={start}
      />
      <div className="canvas-game">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerMove={movePaddle}
          onPointerDown={movePaddle}
          aria-label="Jeu de casse-briques Mur de Plasma"
        />
        {status !== "playing" && (
          <div className="game-overlay">
            <span>
              {status === "paused"
                ? "Partie en pause"
                : status === "won"
                  ? "Mur désintégré"
                  : status === "over"
                    ? "Sphère perdue"
                    : "Système prêt"}
            </span>
            <strong>{status === "idle" ? "Mur de Plasma" : `${score} points`}</strong>
            <button type="button" onClick={status === "paused" ? togglePause : start}>
              {status === "paused"
                ? "Reprendre"
                : status === "idle"
                  ? "Lancer la sphère"
                  : "Rejouer"}
            </button>
          </div>
        )}
      </div>
      <p className="game-help">Déplace la souris, le doigt ou utilise les flèches • P pour pause</p>
    </div>
  );
}
