import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { adminLogin, ApiClientError, getAdminSession } from "../lib/api";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getAdminSession(controller.signal)
      .then(() => navigate("/admin", { replace: true }))
      .catch((sessionError: unknown) => {
        if (sessionError instanceof ApiClientError && sessionError.status === 401) return;
        if (sessionError instanceof DOMException && sessionError.name === "AbortError") return;
        console.error("[NovaPlay] Vérification de session impossible.", sessionError);
      });
    return () => controller.abort();
  }, [navigate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminLogin(username.trim(), password);
      navigate("/admin", { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "La connexion administrateur a échoué.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login__brand">
        <Logo />
        <div>
          <span className="eyebrow">Espace sécurisé</span>
          <h1>Pilote ton catalogue depuis une seule console.</h1>
          <p>
            Publie de nouveaux jeux, organise les sélections et suis l’activité de NovaPlay.
          </p>
        </div>
        <div className="admin-login__brand-footer">
          <div className="admin-login__orbs"><span /><span /><span /></div>
          <span className="studio-credit">Powered by Nisso Studios</span>
        </div>
      </div>
      <div className="admin-login__panel">
        <Link className="back-link" to="/"><ArrowLeft size={17} /> Retour au site</Link>
        <form className="admin-login__form" onSubmit={(event) => void submit(event)}>
          <span className="admin-login__icon"><LockKeyhole /></span>
          <h2>Administration</h2>
          <p>Connecte-toi avec les identifiants définis dans le serveur.</p>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <label>
            Identifiant
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Mot de passe
            <span className="password-field">
              <input
                autoComplete="current-password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <button className="button button--primary button--wide" type="submit" disabled={submitting}>
            {submitting ? "Connexion..." : "Ouvrir la console"}
          </button>
          {import.meta.env.DEV && (
            <small className="dev-hint">
              Développement : admin / NovaPlay-Dev-Admin-2026!
            </small>
          )}
        </form>
      </div>
    </main>
  );
}
