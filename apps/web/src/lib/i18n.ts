import { useCallback, useSyncExternalStore } from "react";

export type Language = "fr" | "en";

const LANG_KEY = "novaplay:lang";
const LANG_EVENT = "novaplay:lang-change";

const DICTIONARY = {
  fr: {
    navGames: "Jeux",
    navFavorites: "Favoris",
    searchPlaceholder: "Rechercher un jeu...",
    heroEyebrow: "Ta prochaine partie commence ici",
    heroTitleTop: "Une galaxie de jeux.",
    heroTitleBottom: "Zéro attente.",
    heroDesc:
      "Lance des jeux originaux directement dans ton navigateur. Sans téléchargement, sans inscription, gratuitement.",
    heroExplore: "Explorer",
    heroSearchPlaceholder: "À quoi veux-tu jouer ?",
    heroInstant: "Jeu instantané",
    heroCountSuffix: "jeux inclus",
    heroCrossDevice: "Mobile & ordinateur",
    spotlightLabel: "Coup de cœur",
    catKicker: "Choisis ton univers",
    catHeading: "Explore les catégories",
    catAll: "Tous",
    hubsKicker: "Accès direct aux hubs 2D & 3D",
    hubsHeading: "Expériences des Hubs",
    hubLaunch: "Lancer →",
    dailyKicker: "Même graine mondiale chaque jour",
    dailyHeading: "Défis du jour",
    dailyBtn: "Jouer au défi",
    recentKicker: "Reprendre la partie",
    recentHeading: "Joués récemment",
    selectionKicker: "Notre sélection",
    searchResultsKicker: "Résultats de recherche",
    allGamesHeading: "Tous les jeux",
    sortFeatured: "En vedette",
    sortPopular: "Plus joués",
    sortNewest: "Nouveautés",
    sortAlpha: "A → Z",
    gamesUnit: "jeux",
    backAllGames: "Tous les jeux",
    inGame: "En jeu",
    soundOn: "Son actif",
    soundOff: "Son coupé",
    fullscreen: "Plein écran",
    exitFullscreen: "Quitter",
    favAdd: "Ajouter aux favoris",
    favAdded: "Dans mes favoris",
    aboutGame: "À propos du jeu",
    playsLaunched: "parties lancées",
    onePlayer: "1 joueur",
    noAccount: "sans inscription",
    safeGame: "Jeu sûr",
    integrated: "intégré à NovaPlay",
    relatedKicker: "Continue l’aventure",
    relatedHeading: "Tu aimeras aussi",
    favKicker: "Ta collection",
    favHeading: "Mes favoris",
    favSub: "Retrouve rapidement les jeux que tu veux garder sous la main.",
    favEmptyTitle: "Ta collection est encore vide",
    favEmptyDesc: "Appuie sur le cœur d’un jeu pour le retrouver ici.",
    favEmptyCta: "Découvrir les jeux",
    achKicker: "Progression joueur",
    achHeading: "Succès débloqués",
    footerTagline: "Des jeux originaux, instantanés et gratuits. Aucun compte nécessaire.",
    footerAllGames: "Tous les jeux",
    footerFavorites: "Mes favoris",
    footerAdmin: "Administration",
    lbKicker: "Classement mondial",
    lbHeading: "Meilleurs scores",
    lbEmpty: "Aucun score enregistré. Sois le premier !",
    lbNickPlaceholder: "Ton pseudo",
    lbPublish: "Publier mon record",
    lbNoBest: "Joue une partie pour enregistrer ton premier record local.",
  },
  en: {
    navGames: "Games",
    navFavorites: "Favorites",
    searchPlaceholder: "Search a game...",
    heroEyebrow: "Your next game starts here",
    heroTitleTop: "A galaxy of games.",
    heroTitleBottom: "Zero waiting.",
    heroDesc:
      "Launch original games straight in your browser. No downloads, no sign-up, completely free.",
    heroExplore: "Explore",
    heroSearchPlaceholder: "What do you want to play?",
    heroInstant: "Instant play",
    heroCountSuffix: "games included",
    heroCrossDevice: "Mobile & desktop",
    spotlightLabel: "Featured",
    catKicker: "Pick your universe",
    catHeading: "Browse categories",
    catAll: "All",
    hubsKicker: "Direct launch to 2D & 3D hubs",
    hubsHeading: "Hub Experiences",
    hubLaunch: "Launch →",
    dailyKicker: "Same global seed every day",
    dailyHeading: "Daily Challenges",
    dailyBtn: "Play challenge",
    recentKicker: "Jump back in",
    recentHeading: "Recently played",
    selectionKicker: "Our selection",
    searchResultsKicker: "Search results",
    allGamesHeading: "All games",
    sortFeatured: "Featured",
    sortPopular: "Most played",
    sortNewest: "Newest",
    sortAlpha: "A → Z",
    gamesUnit: "games",
    backAllGames: "All games",
    inGame: "Playing",
    soundOn: "Sound on",
    soundOff: "Muted",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit",
    favAdd: "Add to favorites",
    favAdded: "In favorites",
    aboutGame: "About the game",
    playsLaunched: "plays launched",
    onePlayer: "1 player",
    noAccount: "no sign-up",
    safeGame: "Safe play",
    integrated: "built into NovaPlay",
    relatedKicker: "Keep playing",
    relatedHeading: "You may also like",
    favKicker: "Your collection",
    favHeading: "My favorites",
    favSub: "Quickly find the games you want to keep close at hand.",
    favEmptyTitle: "Your collection is still empty",
    favEmptyDesc: "Tap the heart on any game to save it here.",
    favEmptyCta: "Discover games",
    achKicker: "Player progression",
    achHeading: "Unlocked achievements",
    footerTagline: "Original, instant, free browser games. No account required.",
    footerAllGames: "All games",
    footerFavorites: "Favorites",
    footerAdmin: "Admin",
    lbKicker: "Global leaderboard",
    lbHeading: "Top scores",
    lbEmpty: "No scores yet. Be the first!",
    lbNickPlaceholder: "Your nickname",
    lbPublish: "Submit my best",
    lbNoBest: "Finish a run first to submit your local best score.",
  },
} as const;

export type TranslationKey = keyof typeof DICTIONARY.fr;

function readLanguage(): Language {
  if (typeof window === "undefined") return "fr";
  try {
    return window.localStorage.getItem(LANG_KEY) === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

function subscribeLanguage(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANG_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LANG_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("LANG_EVENT", callback);
  };
}

export function setLanguage(lang: Language): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new Event(LANG_EVENT));
  } catch {
    // Ignore storage errors
  }
}

export function useLanguage(): {
  lang: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
} {
  const lang = useSyncExternalStore<Language>(
    subscribeLanguage,
    readLanguage,
    () => "fr",
  );
  const toggleLanguage = useCallback(() => {
    setLanguage(readLanguage() === "fr" ? "en" : "fr");
  }, []);
  const t = useCallback((key: TranslationKey) => DICTIONARY[lang][key], [lang]);
  return { lang, toggleLanguage, t };
}
