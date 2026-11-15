import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "../lib/audio";
import { awardNovaCoins } from "../lib/economy";
import { useBestScore } from "../lib/scores";
import { GameHud } from "./GameHud";

const WIDTH = 720;
const HEIGHT = 480;
const PLAYER_Y = HEIGHT - 54;
const PLAYER_SPEED = 420;

interface Asteroid {
  x: number;
  y: number;
  vy: number;
  radius: number;
  angle: number;
  spin: number;
  vertices: number[];
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface AstroRuntime {
  playerX: number;
  asteroids: Asteroid[];
  stars: Star[];
  sparks: Spark[];
  spawnTimer: number;
  elapsed: number;
  score: number;
}

function createStars(): Star[] {
  return Array.from({ length: 58 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: 1 + Math.random() * 1.8,
    speed: 32 + Math.random() * 95,
    alpha: 0.25 + Math.random() * 0.65,
  }));
}

function createAsteroid(score: number): Asteroid {
  const radius = 15 + Math.random() * 17;
  const speedBoost = Math.min(260, score * 0.35);
  return {
    x: 24 + Math.random() * (WIDTH - 48),
    y: -radius - 10,
    vy: 155 + speedBoost + Math.random() * 75,
    radius,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 3.2,
    vertices: Array.from({ length: 8 }, () => 0.76 + Math.random() * 0.34),
  };
}

function createRuntime(): AstroRuntime {
  return {
    playerX: WIDTH / 2,
    asteroids: [],
    stars: createStars(),
    sparks: [],
    spawnTimer: 0.15,
    elapsed: 0,
    score: 0,
  };
}

export function AstroDodgeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<AstroRuntime>(createRuntime());
  const keysRef = useRef({ left: false, right: false });
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "over">("idle");
  const [score, setScore] = useState(0);
  const [runId, setRunId] = useState(0);
  const { best, submitScore } = useBestScore("astro-dodge", "high");

  const movePlayer = useCallback((percentX: number) => {
    const clamped = Math.max(6, Math.min(94, percentX));
    runtimeRef.current.playerX = (clamped / 100) * WIDTH;
  }, []);

  const start = useCallback(() => {
    runtimeRef.current = createRuntime();
    setScore(0);
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
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "q" || event.key.toLowerCase() === "a") {
        keysRef.current.left = true;
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keysRef.current.right = true;
      }
      if ((event.key.toLowerCase() === "p" || event.key === "Escape") && (status === "playing" || status === "paused")) {
        event.preventDefault();
        togglePause();
      } else if (event.code === "Space" && (status === "idle" || status === "over")) {
        event.preventDefault();
        start();
      }
    }
    function handleKeyup(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "q" || event.key.toLowerCase() === "a") {
        keysRef.current.left = false;
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keysRef.current.right = false;
      }
    }
    function onVisibilityChange() {
      if (document.hidden) {
        setStatus((current) => (current === "playing" ? "paused" : current));
      }
    }
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keyup", handleKeyup);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [start, status, togglePause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    function draw(runtime: AstroRuntime) {
      if (!ctx) return;
      const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      bg.addColorStop(0, "#070a17");
      bg.addColorStop(1, "#0d132b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (const star of runtime.stars) {
        ctx.fillStyle = `rgba(195, 224, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      for (const asteroid of runtime.asteroids) {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.angle);
        ctx.fillStyle = "#5c3e35";
        ctx.strokeStyle = "#ff8559";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(255, 114, 72, 0.45)";
        ctx.beginPath();
        asteroid.vertices.forEach((factor, i) => {
          const theta = (i / asteroid.vertices.length) * Math.PI * 2;
          const r = asteroid.radius * factor;
          const px = Math.cos(theta) * r;
          const py = Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      const px = runtime.playerX;
      ctx.save();
      ctx.translate(px, PLAYER_Y);
      const flameLen = 12 + Math.sin(performance.now() * 0.03) * 4;
      ctx.fillStyle = "#7c5cff";
      ctx.beginPath();
      ctx.moveTo(-7, 14);
      ctx.lineTo(7, 14);
      ctx.lineTo(0, 14 + flameLen);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 16;
      ctx.shadowColor = "#57e8d0";
      ctx.fillStyle = "#57e8d0";
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(17, 15);
      ctx.lineTo(0, 9);
      ctx.lineTo(-17, 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#091524";
      ctx.beginPath();
      ctx.arc(0, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      for (const spark of runtime.sparks) {
        ctx.globalAlpha = Math.max(0, spark.life * 1.8);
        ctx.fillStyle = spark.color;
        ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    draw(runtimeRef.current);
    if (status !== "playing") return;

    let frameId = 0;
    let lastTime = performance.now();
    let scoreTick = 0;

    function tick(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const runtime = runtimeRef.current;

      if (keysRef.current.left) runtime.playerX -= PLAYER_SPEED * dt;
      if (keysRef.current.right) runtime.playerX += PLAYER_SPEED * dt;
      runtime.playerX = Math.max(26, Math.min(WIDTH - 26, runtime.playerX));

      for (const star of runtime.stars) {
        star.y += star.speed * dt;
        if (star.y > HEIGHT) {
          star.y = -4;
          star.x = Math.random() * WIDTH;
        }
      }

      runtime.elapsed += dt;
      runtime.spawnTimer -= dt;
      if (runtime.spawnTimer <= 0) {
        runtime.asteroids.push(createAsteroid(runtime.score));
        runtime.spawnTimer = Math.max(0.24, 0.72 - runtime.score / 900);
      }

      let avoided = 0;
      const nextAsteroids: Asteroid[] = [];
      let collision = false;

      for (const asteroid of runtime.asteroids) {
        asteroid.y += asteroid.vy * dt;
        asteroid.angle += asteroid.spin * dt;
        if (asteroid.y - asteroid.radius > HEIGHT + 12) {
          avoided += 1;
          continue;
        }
        const dist = Math.hypot(asteroid.x - runtime.playerX, asteroid.y - PLAYER_Y);
        if (dist < asteroid.radius + 14) {
          collision = true;
        }
        nextAsteroids.push(asteroid);
      }
      runtime.asteroids = nextAsteroids;

      scoreTick += dt;
      if (avoided > 0 || scoreTick >= 0.4) {
        runtime.score += avoided * 10 + (scoreTick >= 0.4 ? 1 : 0);
        if (scoreTick >= 0.4) scoreTick = 0;
        setScore(runtime.score);
      }

      runtime.sparks = runtime.sparks
        .map((s) => ({ ...s, x: s.x + s.vx * dt, y: s.y + s.vy * dt, life: s.life - dt }))
        .filter((s) => s.life > 0);

      if (collision) {
        for (let i = 0; i < 18; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 80 + Math.random() * 190;
          runtime.sparks.push({
            x: runtime.playerX,
            y: PLAYER_Y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 0.55,
            color: i % 2 === 0 ? "#ff6b8a" : "#57e8d0",
          });
        }
        draw(runtime);
        submitScore(runtime.score);
        if (runtime.score > 10) {
          awardNovaCoins(Math.max(2, Math.floor(runtime.score / 30)));
        }
        sfx.fail();
        setStatus("over");
        return;
      }

      draw(runtime);
      frameId = window.requestAnimationFrame(tick);
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [runId, status, submitScore]);

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (status !== "playing") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    movePlayer(((event.clientX - bounds.left) / bounds.width) * 100);
  }

  return (
    <div className="mini-game astro-game">
      <GameHud
        score={score}
        secondaryLabel="Vitesse"
        secondaryValue={`x${(1 + score / 260).toFixed(1)}`}
        bestLabel="Record"
        bestValue={best}
        paused={status === "paused"}
        onTogglePause={status === "playing" || status === "paused" ? togglePause : undefined}
        onRestart={start}
      />
      <div className="canvas-game astro-arena">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          aria-label="Arène de Évasion Stellaire"
        />
        {status !== "playing" && (
          <div className="game-overlay">
            <span>
              {status === "paused"
                ? "En pause"
                : status === "over"
                  ? "Impact détecté"
                  : "Moteurs prêts"}
            </span>
            <strong>
              {status === "idle" ? "Évasion Stellaire" : `${score} points`}
            </strong>
            <button type="button" onClick={status === "paused" ? togglePause : start}>
              {status === "paused"
                ? "Reprendre"
                : status === "over"
                  ? "Redécoller"
                  : "Décoller"}
            </button>
          </div>
        )}
      </div>
      <div className="horizontal-controls">
        <button
          type="button"
          onPointerDown={() => {
            runtimeRef.current.playerX = Math.max(26, runtimeRef.current.playerX - 58);
          }}
        >
          ← Gauche
        </button>
        <button
          type="button"
          onPointerDown={() => {
            runtimeRef.current.playerX = Math.min(WIDTH - 26, runtimeRef.current.playerX + 58);
          }}
        >
          Droite →
        </button>
      </div>
      <p className="game-help">Déplace la souris, le doigt ou utilise les flèches • P pour pause</p>
    </div>
  );
}
