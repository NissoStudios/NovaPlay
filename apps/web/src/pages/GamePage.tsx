import {
  ArrowLeft,
  Expand,
  Heart,
  Minimize,
  Play,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FeedbackState } from "../components/FeedbackState";
import { GameGrid } from "../components/GameGrid";
import { LeaderboardPanel } from "../components/LeaderboardPanel";
import { InternalGame } from "../games";
import { evaluateGameAchievements } from "../lib/achievements";
import { recordPlay } from "../lib/api";
import { useMuted } from "../lib/audio";
import { useLanguage } from "../lib/i18n";
import { addRecentGame, useFavorites } from "../lib/storage";
import { useGame, useGames } from "../lib/useGames";

const trackedGames = new Set<string>();

export function GamePage() {
  const { slug } = useParams();
  const { data: game, loading, error } = useGame(slug);
  const { data: allGames } = useGames();
  const { favorites, toggleFavorite } = useFavorites();
  const { muted, toggleMuted } = useMuted();
  const { t } = useLanguage();
  const [fullscreen, setFullscreen] = useState(false);
  const [playCount, setPlayCount] = useState<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (game) setPlayCount(game.playCount);
  }, [game]);

  useEffect(() => {
    if (!game || trackedGames.has(game.slug)) return;
    trackedGames.add(game.slug);
    addRecentGame(game.slug);
    evaluateGameAchievements({ playedSlug: game.slug });
    void recordPlay(game.slug)
      .then(setPlayCount)
      .catch((trackingError: unknown) => {
        console.error("[NovaPlay] Le compteur de partie n’a pas pu être mis à jour.", trackingError);
      });
  }, [game]);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === playerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const related = useMemo(
    () =>
      game
        ? allGames
            .filter((candidate) => candidate.id !== game.id && candidate.category === game.category)
            .slice(0, 4)
        : [],
    [allGames, game],
  );

  async function toggleFullscreen() {
    if (!playerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await playerRef.current.requestFullscreen();
      }
    } catch (fullscreenError) {
      console.error("[NovaPlay] Le plein écran est indisponible.", fullscreenError);
    }
  }

  if (loading) {
    return <div className="page container"><FeedbackState type="loading" /></div>;
  }
  if (error || !game) {
    return (
      <div className="page container">
        <FeedbackState type="error" message={error ?? "Ce jeu est introuvable."} />
        <Link className="button button--secondary centered-button" to="/">
          <ArrowLeft size={18} /> Retour au catalogue
        </Link>
      </div>
    );
  }

  const favorite = favorites.includes(game.slug);

  return (
    <div className="game-page">
      <div className="container">
        <Link className="back-link" to="/">
          <ArrowLeft size={17} /> {t("backAllGames")}
        </Link>

        <div className="game-title-row">
          <div>
            <span className="game-title-row__icon" style={{ background: game.accentColor }}>
              {game.icon}
            </span>
            <div>
              <span className="section-kicker">{game.category}</span>
              <h1>{game.title}</h1>
            </div>
          </div>
          <button
            className={`button button--secondary ${favorite ? "button--favorite" : ""}`}
            type="button"
            aria-pressed={favorite}
            onClick={() => toggleFavorite(game.slug)}
          >
            <Heart size={18} fill={favorite ? "currentColor" : "none"} />
            {favorite ? t("favAdded") : t("favAdd")}
          </button>
        </div>

        <section className="game-player" ref={playerRef}>
          <div className="game-player__bar">
            <span><i /> {t("inGame")}</span>
            <div className="game-player__actions">
              <button
                type="button"
                aria-pressed={muted}
                aria-label={muted ? "Activer le son" : "Couper le son"}
                onClick={toggleMuted}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                {muted ? t("soundOff") : t("soundOn")}
              </button>
              <button type="button" onClick={() => void toggleFullscreen()}>
                {fullscreen ? <Minimize size={18} /> : <Expand size={18} />}
                {fullscreen ? t("exitFullscreen") : t("fullscreen")}
              </button>
            </div>
          </div>
          <div className="game-player__content">
            {game.sourceType === "internal" && game.internalGameId ? (
              <InternalGame gameId={game.internalGameId} />
            ) : game.embedUrl ? (
              <iframe
                src={game.embedUrl}
                title={game.title}
                allow="fullscreen; autoplay"
                sandbox="allow-scripts allow-forms allow-pointer-lock"
                allowFullScreen
              />
            ) : (
              <FeedbackState type="error" message="La source de ce jeu est invalide." />
            )}
          </div>
        </section>

        <div className="game-details">
          <article className="game-description">
            <span className="section-kicker">{t("aboutGame")}</span>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            <div className="tag-list">
              {game.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>
          <aside className="game-facts">
            <div><Play size={20} /><span><strong>{(playCount ?? game.playCount).toLocaleString("fr-FR")}</strong> {t("playsLaunched")}</span></div>
            <div><Users size={20} /><span><strong>{t("onePlayer")}</strong> {t("noAccount")}</span></div>
            <div><ShieldCheck size={20} /><span><strong>{t("safeGame")}</strong> {t("integrated")}</span></div>
          </aside>
        </div>

        {game.sourceType === "internal" &&
          game.internalGameId !== "eco-arcade-hub" &&
          game.internalGameId !== "eco-arcade-hub-3d" && (
            <LeaderboardPanel slug={game.slug} internalGameId={game.internalGameId} />
          )}

        {related.length > 0 && (
          <section className="related-games">
            <div className="section-heading">
              <div>
                <span className="section-kicker">{t("relatedKicker")}</span>
                <h2>{t("relatedHeading")}</h2>
              </div>
            </div>
            <GameGrid games={related} />
          </section>
        )}
      </div>
    </div>
  );
}
