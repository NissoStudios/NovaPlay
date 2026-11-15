import type { AdminStats, Game, GameInput } from "@novaplay/shared";
import {
  BarChart3,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminGameEditor } from "../components/AdminGameEditor";
import { FeedbackState } from "../components/FeedbackState";
import { Logo } from "../components/Logo";
import {
  adminLogout,
  ApiClientError,
  createAdminGame,
  deleteAdminGame,
  getAdminGames,
  getAdminSession,
  getAdminStats,
  updateAdminGame,
} from "../lib/api";

export function AdminPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    setLoadError(null);
    try {
      const [admin, nextGames, nextStats] = await Promise.all([
        getAdminSession(signal),
        getAdminGames(signal),
        getAdminStats(signal),
      ]);
      setUsername(admin.username);
      setGames(nextGames);
      setStats(nextStats);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof ApiClientError && error.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      setLoadError(error instanceof Error ? error.message : "Le tableau de bord est indisponible.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return games;
    return games.filter((game) =>
      `${game.title} ${game.slug} ${game.category}`.toLocaleLowerCase("fr").includes(normalized),
    );
  }, [games, query]);

  function openCreate() {
    setSelectedGame(null);
    setEditorError(null);
    setFieldErrors(undefined);
    setEditorOpen(true);
  }

  function openEdit(game: Game) {
    setSelectedGame(game);
    setEditorError(null);
    setFieldErrors(undefined);
    setEditorOpen(true);
  }

  async function refreshStatsAfterMutation() {
    try {
      setStats(await getAdminStats());
    } catch (error) {
      setActionError(
        error instanceof Error
          ? `La modification est enregistrée, mais les statistiques n’ont pas été actualisées : ${error.message}`
          : "La modification est enregistrée, mais les statistiques n’ont pas été actualisées.",
      );
    }
  }

  async function saveGame(input: GameInput) {
    setSaving(true);
    setEditorError(null);
    setFieldErrors(undefined);
    try {
      if (selectedGame) {
        const updated = await updateAdminGame(selectedGame.id, input);
        setGames((current) => current.map((game) => (game.id === updated.id ? updated : game)));
      } else {
        const created = await createAdminGame(input);
        setGames((current) => [...current, created].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      setEditorOpen(false);
      await refreshStatsAfterMutation();
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : "L’enregistrement a échoué.");
      if (error instanceof ApiClientError) setFieldErrors(error.details);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(game: Game) {
    setActionError(null);
    try {
      const input: GameInput = {
        ...game,
        status: game.status === "published" ? "draft" : "published",
      };
      const updated = await updateAdminGame(game.id, input);
      setGames((current) => current.map((item) => (item.id === game.id ? updated : item)));
      await refreshStatsAfterMutation();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "La mise à jour a échoué.");
    }
  }

  async function removeGame(game: Game) {
    if (!window.confirm(`Supprimer définitivement « ${game.title} » ?`)) return;
    setActionError(null);
    try {
      await deleteAdminGame(game.id);
      setGames((current) => current.filter((item) => item.id !== game.id));
      await refreshStatsAfterMutation();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "La suppression a échoué.");
    }
  }

  async function logout() {
    try {
      await adminLogout();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "La déconnexion a échoué.");
    }
  }

  if (loading) {
    return <main className="admin-loading"><FeedbackState type="loading" /></main>;
  }
  if (loadError) {
    return (
      <main className="admin-loading">
        <FeedbackState type="error" message={loadError} />
        <button className="button button--primary" type="button" onClick={() => void loadDashboard()}>
          Réessayer
        </button>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo />
        <nav aria-label="Administration">
          <a className="active" href="#dashboard"><LayoutDashboard size={19} /> Vue d’ensemble</a>
          <a href="#catalogue"><Gamepad2 size={19} /> Catalogue</a>
        </nav>
        <div className="admin-sidebar__bottom">
          <Link to="/" target="_blank"><ExternalLink size={18} /> Voir le site</Link>
          <button type="button" onClick={() => void logout()}><LogOut size={18} /> Déconnexion</button>
          <span className="admin-sidebar__credit">Powered by Nisso Studios</span>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>Console NovaPlay</span>
            <strong>Bonjour, {username}</strong>
          </div>
          <span className="admin-avatar">{username.slice(0, 1).toUpperCase()}</span>
        </header>

        <div className="admin-content" id="dashboard">
          <div className="admin-heading">
            <div>
              <span className="section-kicker">Vue d’ensemble</span>
              <h1>Tableau de bord</h1>
              <p>Gère le catalogue et suis l’activité de la plateforme.</p>
            </div>
            <button className="button button--primary" type="button" onClick={openCreate}>
              <Plus size={18} /> Ajouter un jeu
            </button>
          </div>

          {actionError && <div className="form-alert" role="alert">{actionError}</div>}

          <section className="stats-grid" aria-label="Statistiques">
            <article>
              <span className="stat-icon stat-icon--purple"><Gamepad2 /></span>
              <div><small>Jeux au catalogue</small><strong>{stats?.totalGames ?? 0}</strong></div>
              <em>{stats?.publishedGames ?? 0} publiés</em>
            </article>
            <article>
              <span className="stat-icon stat-icon--green"><BarChart3 /></span>
              <div><small>Parties lancées</small><strong>{(stats?.totalPlays ?? 0).toLocaleString("fr-FR")}</strong></div>
              <em>Depuis le lancement</em>
            </article>
            <article>
              <span className="stat-icon stat-icon--orange"><Sparkles /></span>
              <div><small>Jeux mis en avant</small><strong>{stats?.featuredGames ?? 0}</strong></div>
              <em>Sur la page d’accueil</em>
            </article>
            <article>
              <span className="stat-icon stat-icon--blue"><EyeOff /></span>
              <div><small>Brouillons</small><strong>{stats?.draftGames ?? 0}</strong></div>
              <em>Non visibles du public</em>
            </article>
          </section>

          <section className="admin-catalogue" id="catalogue">
            <header>
              <div>
                <h2>Catalogue</h2>
                <p>{games.length} fiches enregistrées</p>
              </div>
              <label className="admin-search">
                <Search size={17} />
                <input
                  aria-label="Rechercher dans le catalogue"
                  placeholder="Rechercher..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </header>

            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Jeu</th>
                    <th>Catégorie</th>
                    <th>État</th>
                    <th>Parties</th>
                    <th>Ordre</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.map((game) => (
                    <tr key={game.id}>
                      <td>
                        <span
                          className="admin-game-icon"
                          style={{ background: `linear-gradient(135deg, ${game.accentColor}, ${game.secondaryColor})` }}
                        >
                          {game.icon}
                        </span>
                        <span><strong>{game.title}</strong><small>/{game.slug}</small></span>
                      </td>
                      <td>{game.category}</td>
                      <td>
                        <button
                          className={`status-pill status-pill--${game.status}`}
                          type="button"
                          onClick={() => void togglePublished(game)}
                          title="Changer l’état"
                        >
                          {game.status === "published" ? <Eye size={14} /> : <EyeOff size={14} />}
                          {game.status === "published" ? "Publié" : "Brouillon"}
                        </button>
                      </td>
                      <td>{game.playCount.toLocaleString("fr-FR")}</td>
                      <td>{game.sortOrder}</td>
                      <td>
                        <span className="table-actions">
                          <button type="button" aria-label={`Modifier ${game.title}`} onClick={() => openEdit(game)}>
                            <Edit3 size={17} />
                          </button>
                          <button
                            className="danger"
                            type="button"
                            aria-label={`Supprimer ${game.title}`}
                            onClick={() => void removeGame(game)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredGames.length === 0 && (
                <div className="admin-empty">Aucun jeu ne correspond à cette recherche.</div>
              )}
            </div>
          </section>
        </div>
      </main>

      {editorOpen && (
        <AdminGameEditor
          game={selectedGame}
          saving={saving}
          error={editorError}
          fieldErrors={fieldErrors}
          onClose={() => !saving && setEditorOpen(false)}
          onSave={saveGame}
        />
      )}
    </div>
  );
}
