import { GAME_CATEGORIES } from "@novaplay/shared";
import { ArrowRight, Calendar, Flame, Gamepad2, Search, Sparkles, Zap } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FeedbackState } from "../components/FeedbackState";
import { GameCover } from "../components/GameCover";
import { GameGrid } from "../components/GameGrid";
import { useLanguage } from "../lib/i18n";
import { getDailyKey } from "../lib/seededRng";
import { useRecentGames } from "../lib/storage";
import { useGames } from "../lib/useGames";

type SortMode = "featured" | "popular" | "newest" | "alpha";

const HUB_SPOTLIGHTS = [
  { slug: "eco-arcade-hub-3d", game: "rally", title: "Neon Canopy Rally", badge: "3D • Solo/Duo", accent: "#56f39a" },
  { slug: "eco-arcade-hub-3d", game: "quarry", title: "Crystal Quarry", badge: "3D • Voxel", accent: "#20c7a2" },
  { slug: "eco-arcade-hub-3d", game: "siege", title: "Stellar Siege", badge: "3D • Vagues", accent: "#ff6d7a" },
  { slug: "eco-arcade-hub", game: "runner", title: "Canopy Runner", badge: "2D • Course", accent: "#56f39a" },
  { slug: "eco-arcade-hub", game: "clash", title: "Stick Clash", badge: "2D • 2 Joueurs", accent: "#ffcc66" },
  { slug: "eco-arcade-hub", game: "collapse", title: "Crop Collapse", badge: "2D • Fusion", accent: "#a47dff" },
  { slug: "eco-arcade-hub", game: "chroma", title: "Chroma Sort", badge: "2D • Puzzle", accent: "#4ce8f0" },
  { slug: "eco-arcade-hub", game: "harvest", title: "Harvest Clicker", badge: "2D • Idle", accent: "#ffb94f" },
] as const;

export function HomePage() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const activeTag = params.get("tag") ?? "";
  const sort = (params.get("sort") as SortMode | null) ?? "featured";
  const { data: games, loading, error } = useGames({
    search: search || undefined,
    category: category || undefined,
  });
  const { data: allGames } = useGames();
  const recentSlugs = useRecentGames();
  const featured = allGames.filter((game) => game.featured);
  const spotlight = featured[0] ?? allGames[0];
  const recent = recentSlugs
    .map((slug) => allGames.find((game) => game.slug === slug))
    .filter((game) => game !== undefined)
    .slice(0, 4);

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const game of allGames) {
      for (const tag of game.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [allGames]);

  const visibleGames = useMemo(() => {
    const filtered = activeTag
      ? games.filter((game) => game.tags.includes(activeTag))
      : games;
    const copy = [...filtered];
    if (sort === "popular") {
      copy.sort((a, b) => b.playCount - a.playCount || a.title.localeCompare(b.title, "fr"));
    } else if (sort === "newest") {
      copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sort === "alpha") {
      copy.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    return copy;
  }, [activeTag, games, sort]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("query") ?? "").trim();
    updateParam("q", query);
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-section__aurora" />
        <div className="container hero">
          <div className="hero__content">
            <span className="eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              {t("heroEyebrow")}
            </span>
            <h1>
              {t("heroTitleTop")}
              <br />
              <span>{t("heroTitleBottom")}</span>
            </h1>
            <p>{t("heroDesc")}</p>
            <form className="hero-search" role="search" onSubmit={submitSearch}>
              <Search size={20} aria-hidden="true" />
              <input
                key={search}
                name="query"
                defaultValue={search}
                placeholder={t("heroSearchPlaceholder")}
                aria-label="Rechercher dans le catalogue"
              />
              <button type="submit">{t("heroExplore")}</button>
            </form>
            <div className="hero__trust">
              <span><Zap size={16} /> {t("heroInstant")}</span>
              <span><Gamepad2 size={16} /> {allGames.length || 12} {t("heroCountSuffix")}</span>
              <span><Flame size={16} /> {t("heroCrossDevice")}</span>
            </div>
          </div>

          {spotlight && (
            <Link className="spotlight-card" to={`/game/${spotlight.slug}`}>
              <GameCover game={spotlight} large />
              <span className="spotlight-card__label">
                <Flame size={16} fill="currentColor" /> {t("spotlightLabel")}
              </span>
              <span className="spotlight-card__info">
                <span>
                  <strong>{spotlight.title}</strong>
                  <small>{spotlight.shortDescription}</small>
                </span>
                <span className="round-arrow"><ArrowRight /></span>
              </span>
            </Link>
          )}
        </div>
      </section>

      <section className="catalog-section container">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("catKicker")}</span>
            <h2>{t("catHeading")}</h2>
          </div>
        </div>
        <div className="category-list" role="list" aria-label="Catégories de jeux">
          <button
            className={!category ? "active" : ""}
            type="button"
            onClick={() => updateParam("category", "")}
          >
            <span>✦</span> {t("catAll")}
          </button>
          {GAME_CATEGORIES.map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              type="button"
              onClick={() => updateParam("category", item)}
            >
              <span aria-hidden="true">
                {item === "Arcade"
                  ? "👾"
                  : item === "Puzzle"
                    ? "🧩"
                    : item === "Réflexion"
                      ? "💡"
                      : item === "Adresse"
                        ? "🎯"
                        : item === "Stratégie"
                          ? "♟️"
                          : "🧠"}
              </span>
              {item}
            </button>
          ))}
        </div>
        {popularTags.length > 0 && (
          <div className="tag-filter-row" aria-label="Filtres par tag">
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={activeTag === tag ? "active" : ""}
                onClick={() => updateParam("tag", activeTag === tag ? "" : tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </section>

      {!search && !category && !activeTag && (
        <section className="games-section container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t("hubsKicker")}</span>
              <h2>{t("hubsHeading")}</h2>
            </div>
          </div>
          <div className="hub-quick-grid">
            {HUB_SPOTLIGHTS.map((item) => (
              <Link
                key={item.game}
                to={`/game/${item.slug}?game=${item.game}`}
                className="hub-quick-card"
                style={{ "--hub-accent": item.accent } as React.CSSProperties}
              >
                <span className="hub-quick-card__badge">{item.badge}</span>
                <strong>{item.title}</strong>
                <span className="hub-quick-card__cta">{t("hubLaunch")}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!search && !category && !activeTag && (
        <section className="games-section container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t("dailyKicker")}</span>
              <h2>
                <Calendar size={22} aria-hidden="true" /> {t("dailyHeading")} ({getDailyKey()})
              </h2>
            </div>
          </div>
          <div className="daily-grid">
            <Link className="daily-card" to="/game/mines-de-cristal?daily=1">
              <span>💎</span>
              <div>
                <strong>Mines de Cristal — Grille du jour</strong>
                <small>{t("dailyBtn")} →</small>
              </div>
            </Link>
            <Link className="daily-card" to="/game/fusion-2048?daily=1">
              <span>✨</span>
              <div>
                <strong>Fusion 2048 — Tirage du jour</strong>
                <small>{t("dailyBtn")} →</small>
              </div>
            </Link>
          </div>
        </section>
      )}

      {recent.length > 0 && !search && !category && !activeTag && (
        <section className="games-section container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t("recentKicker")}</span>
              <h2>{t("recentHeading")}</h2>
            </div>
          </div>
          <GameGrid games={recent} />
        </section>
      )}

      <section className="games-section container">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              {search || category || activeTag ? t("searchResultsKicker") : t("selectionKicker")}
            </span>
            <h2>
              {search
                ? `Jeux pour « ${search} »`
                : category
                  ? `Jeux ${category}`
                  : activeTag
                    ? `Tag #${activeTag}`
                    : t("allGamesHeading")}
            </h2>
          </div>
          <div className="catalog-controls">
            <label className="sort-select">
              <span className="sr-only">Trier par</span>
              <select
                aria-label="Trier les jeux"
                value={sort}
                onChange={(event) => updateParam("sort", event.target.value === "featured" ? "" : event.target.value)}
              >
                <option value="featured">{t("sortFeatured")}</option>
                <option value="popular">{t("sortPopular")}</option>
                <option value="newest">{t("sortNewest")}</option>
                <option value="alpha">{t("sortAlpha")}</option>
              </select>
            </label>
            {!loading && !error && (
              <span className="result-count">
                {visibleGames.length} {t("gamesUnit")}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <FeedbackState type="loading" />
        ) : error ? (
          <FeedbackState type="error" message={error} />
        ) : visibleGames.length === 0 ? (
          <FeedbackState
            type="empty"
            message="Essaie un autre mot-clé ou sélectionne une autre catégorie."
          />
        ) : (
          <GameGrid games={visibleGames} />
        )}
      </section>
    </>
  );
}
