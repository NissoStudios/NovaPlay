import type { InternalGameId, LeaderboardEntry } from "@novaplay/shared";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { getLeaderboard, submitLeaderboardScore } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { useBestScore, type ScoreDirection } from "../lib/scores";

const NICKNAME_KEY = "novaplay:nickname";

interface LeaderboardPanelProps {
  slug: string;
  internalGameId: InternalGameId | null;
}

const LOW_SCORE_GAMES = new Set<InternalGameId>(["crystal-mines", "memory-flip"]);

export function LeaderboardPanel({ slug, internalGameId }: LeaderboardPanelProps) {
  const { t } = useLanguage();
  const direction: ScoreDirection =
    internalGameId && LOW_SCORE_GAMES.has(internalGameId) ? "low" : "high";
  const order = direction === "low" ? "asc" : "desc";
  const { best } = useBestScore(internalGameId ?? slug, direction);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [nickname, setNickname] = useState(() => {
    try {
      return window.localStorage.getItem(NICKNAME_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    void getLeaderboard(slug, order, controller.signal)
      .then(setEntries)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Classement indisponible.");
      });
    return () => controller.abort();
  }, [order, slug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (best === null) return;
    const cleanName = nickname.trim();
    if (cleanName.length < 2) return;
    setSubmitting(true);
    setError(null);
    try {
      try {
        window.localStorage.setItem(NICKNAME_KEY, cleanName);
      } catch {
        // Ignore
      }
      const next = await submitLeaderboardScore(slug, cleanName, best, order);
      setEntries(next);
      setSubmittedScore(best);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const unit =
    internalGameId === "crystal-mines"
      ? "s"
      : internalGameId === "memory-flip"
        ? " coups"
        : "";

  return (
    <section className="leaderboard-panel">
      <div className="leaderboard-panel__header">
        <div>
          <span className="section-kicker">{t("lbKicker")}</span>
          <h2>
            <Trophy size={20} aria-hidden="true" /> {t("lbHeading")}
          </h2>
        </div>
        {best !== null && (
          <form className="leaderboard-form" onSubmit={(e) => void submit(e)}>
            <input
              minLength={2}
              maxLength={24}
              required
              placeholder={t("lbNickPlaceholder")}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button
              className="button button--primary"
              type="submit"
              disabled={submitting || submittedScore === best}
            >
              {t("lbPublish")} ({best.toLocaleString("fr-FR")}
              {unit})
            </button>
          </form>
        )}
      </div>
      {best === null && <p className="leaderboard-hint">{t("lbNoBest")}</p>}
      {error && <p className="field-error">{error}</p>}
      {entries.length > 0 ? (
        <ol className="leaderboard-list">
          {entries.map((entry, idx) => (
            <li key={entry.id}>
              <span className="leaderboard-rank">#{idx + 1}</span>
              <strong>{entry.playerName}</strong>
              <span className="leaderboard-score">
                {entry.score.toLocaleString("fr-FR")}
                {unit}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="leaderboard-empty">{t("lbEmpty")}</p>
      )}
    </section>
  );
}
