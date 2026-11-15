import { Gamepad2, Globe, Heart, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useNovaCoins } from "../lib/economy";
import { useLanguage } from "../lib/i18n";
import { useFavorites } from "../lib/storage";
import { Logo } from "./Logo";

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites } = useFavorites();
  const coins = useNovaCoins();
  const { lang, toggleLanguage, t } = useLanguage();

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    navigate(value ? `/?q=${encodeURIComponent(value)}` : "/");
    setMenuOpen(false);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner container">
          <Logo />
          <nav className={`main-nav ${menuOpen ? "main-nav--open" : ""}`} aria-label="Navigation">
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>
              <Gamepad2 size={18} aria-hidden="true" />
              {t("navGames")}
            </NavLink>
            <NavLink to="/favorites" onClick={() => setMenuOpen(false)}>
              <Heart size={18} aria-hidden="true" />
              {t("navFavorites")}
              {favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}
            </NavLink>
            <Link
              className="nav-coins"
              to="/game/eco-arcade-hub"
              title="Solde Nova Coins partagé avec la boutique des hubs"
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-coins__dot">N</span>
              <span>{coins.toLocaleString("fr-FR")}</span>
            </Link>
          </nav>
          <form className="header-search" role="search" onSubmit={submitSearch}>
            <Search size={17} aria-hidden="true" />
            <input
              aria-label={t("searchPlaceholder")}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              value={search}
            />
            <kbd>↵</kbd>
          </form>
          <button
            className="lang-toggle"
            type="button"
            aria-label="Changer la langue / Switch language"
            onClick={toggleLanguage}
          >
            <Globe size={15} aria-hidden="true" />
            {lang.toUpperCase()}
          </button>
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main key={location.pathname}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div>
            <Logo />
            <p>{t("footerTagline")}</p>
          </div>
          <div className="site-footer__links">
            <Link to="/">{t("footerAllGames")}</Link>
            <Link to="/favorites">{t("footerFavorites")}</Link>
            <Link to="/admin">{t("footerAdmin")}</Link>
          </div>
          <div className="site-footer__copy">
            <span>© {new Date().getFullYear()} NovaPlay</span>
            <span className="studio-credit">Powered by Nisso Studios</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
