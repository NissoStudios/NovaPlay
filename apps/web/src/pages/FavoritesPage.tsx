import { Award, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { FeedbackState } from "../components/FeedbackState";
import { GameGrid } from "../components/GameGrid";
import { ACHIEVEMENTS, useAchievements } from "../lib/achievements";
import { useLanguage } from "../lib/i18n";
import { useFavorites } from "../lib/storage";
import { useGames } from "../lib/useGames";

export function FavoritesPage() {
  const { favorites } = useFavorites();
  const { data: games, loading, error } = useGames();
  const { unlocked, unlockedCount, totalCount } = useAchievements();
  const { lang, t } = useLanguage();
  const favoriteGames = favorites
    .map((slug) => games.find((game) => game.slug === slug))
    .filter((game) => game !== undefined);

  return (
    <div className="page container">
      <div className="page-heading">
        <span className="page-heading__icon"><Heart fill="currentColor" /></span>
        <div>
          <span className="section-kicker">{t("favKicker")}</span>
          <h1>{t("favHeading")}</h1>
          <p>{t("favSub")}</p>
        </div>
      </div>
      {loading ? (
        <FeedbackState type="loading" />
      ) : error ? (
        <FeedbackState type="error" message={error} />
      ) : favoriteGames.length > 0 ? (
        <GameGrid games={favoriteGames} />
      ) : (
        <div className="empty-favorites">
          <span>💜</span>
          <h2>{t("favEmptyTitle")}</h2>
          <p>{t("favEmptyDesc")}</p>
          <Link className="button button--primary" to="/">{t("favEmptyCta")}</Link>
        </div>
      )}

      <section className="achievements-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("achKicker")}</span>
            <h2>
              <Award size={22} aria-hidden="true" /> {t("achHeading")} ({unlockedCount}/{totalCount})
            </h2>
          </div>
        </div>
        <div className="achievements-grid">
          {ACHIEVEMENTS.map((item) => {
            const earned = Boolean(unlocked[item.id]);
            return (
              <article
                key={item.id}
                className={`achievement-card ${earned ? "achievement-card--unlocked" : ""}`}
              >
                <span className="achievement-card__icon">{item.icon}</span>
                <div>
                  <strong>{lang === "en" ? item.titleEn : item.titleFr}</strong>
                  <p>{lang === "en" ? item.descEn : item.descFr}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
