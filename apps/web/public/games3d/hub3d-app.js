// Hub 3D — contrôleur principal : navigation, boutique, boucle de rendu.
import {
  HubStore,
  PALETTES,
  THEMES,
  MULTIPLIERS,
  MULTIPLIER_COSTS,
  SHOP_ITEMS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  MODE_GAMES,
  MODES,
  MODE_LABELS,
  QUALITY_MODES,
  QUALITY_LABELS,
  getQualityMode,
  setQualityMode,
  clamp,
  formatNumber,
} from "/games3d/hub3d-core.js";
import { hubAudio } from "/games3d/hub-audio.js";
import { RallyGame } from "/games3d/game-rally.js";
import { QuarryGame } from "/games3d/game-quarry.js";
import { SiegeGame } from "/games3d/game-siege.js";
import { ICONS_3D } from "/games3d/game-icons.js";

const GAME_META = [
  {
    id: "rally",
    icon: ICONS_3D.rally,
    short: "Rally",
    title: "Neon Canopy Rally",
    genre: "Course 3D • Arcade",
    subtitle: "Drift, boost, survie",
    tip: "Flèches / joystick pour diriger, maintiens Maj ou le bouton BOOST.",
  },
  {
    id: "quarry",
    icon: ICONS_3D.quarry,
    short: "Quarry",
    title: "Crystal Quarry",
    genre: "Bac à sable 3D • Voxel",
    subtitle: "Mine, construis, prospère",
    tip: "Glisse pour regarder, E/MINER pour creuser, F/POSER pour construire.",
  },
  {
    id: "siege",
    icon: ICONS_3D.siege,
    short: "Siege",
    title: "Stellar Siege",
    genre: "Défense 3D • Vagues",
    subtitle: "Vise, tire, améliore",
    tip: "Vise avec le joystick ou les flèches, la tourelle tire automatiquement.",
  },
];

class Hub3D {
  constructor() {
    this.store = new HubStore();
    this.viewport = document.getElementById("engineViewport");
    this.currentGameId = null;
    this.currentGame = null;
    this.games = new Map();
    this.lastTime = performance.now();
    this.resizeObserver = null;
    this.loop = this.loop.bind(this);
    this.gameConstructors = {
      rally: RallyGame,
      quarry: QuarryGame,
      siege: SiegeGame,
    };
    this.initialize();
  }

  initialize() {
    this.renderNavigation();
    this.bindShop();
    this.bindTopControls();
    this.store.addEventListener("change", () => this.updateSharedUi());
    window.addEventListener("beforeunload", () => this.store.save());
    document.addEventListener("visibilitychange", () => {
      this.lastTime = performance.now();
      if (document.hidden) this.store.save();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.getElementById("shopModal").classList.contains("open")) {
        this.closeShop();
      }
    });
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.viewport);
    this.updateSharedUi();

    const requestedGame = new URLSearchParams(location.search).get("game");
    this.switchGame(GAME_META.some((game) => game.id === requestedGame) ? requestedGame : "rally");
    requestAnimationFrame(this.loop);
  }

  renderNavigation() {
    const desktop = document.getElementById("desktopNav");
    const mobile = document.getElementById("mobileNav");
    desktop.innerHTML = "";
    mobile.innerHTML = "";
    for (const game of GAME_META) {
      const desktopButton = document.createElement("button");
      desktopButton.type = "button";
      desktopButton.dataset.game = game.id;
      desktopButton.innerHTML = `
        <span class="game-nav__icon">${game.icon}</span>
        <span class="game-nav__copy">
          <strong>${game.title}</strong>
          <small>${game.subtitle}</small>
        </span>
      `;
      desktopButton.addEventListener("click", () => this.switchGame(game.id));
      desktop.append(desktopButton);

      const mobileButton = document.createElement("button");
      mobileButton.type = "button";
      mobileButton.dataset.game = game.id;
      mobileButton.innerHTML = `<span>${game.icon}</span><small>${game.short}</small>`;
      mobileButton.addEventListener("click", () => this.switchGame(game.id));
      mobile.append(mobileButton);
    }
  }

  viewportWidth() {
    return Math.max(1, this.viewport.clientWidth);
  }

  viewportHeight() {
    return Math.max(1, this.viewport.clientHeight);
  }

  mountEngine(container) {
    if (container.parentElement !== this.viewport) {
      this.viewport.innerHTML = "";
      this.viewport.append(container);
    }
  }

  handleResize() {
    this.currentGame?.resize(this.viewportWidth(), this.viewportHeight());
  }

  switchGame(id) {
    if (this.currentGameId === id) return;
    this.currentGame?.exit();
    if (!this.games.has(id)) {
      const GameConstructor = this.gameConstructors[id];
      this.games.set(id, new GameConstructor(this));
    }
    this.currentGameId = id;
    this.currentGame = this.games.get(id);
    this.currentGame.enter();
    const metadata = GAME_META.find((game) => game.id === id);
    document.getElementById("gameTitle").textContent = metadata.title;
    document.getElementById("gameGenre").textContent = metadata.genre;
    document.getElementById("gameTip").textContent = metadata.tip;
    document.querySelectorAll("[data-game]").forEach((button) => {
      button.classList.toggle("active", button.dataset.game === id);
      button.setAttribute("aria-current", button.dataset.game === id ? "page" : "false");
    });
    this.renderRunSettings(id);
    history.replaceState(null, "", `${location.pathname}?game=${id}`);
    this.lastTime = performance.now();
    requestAnimationFrame(() => this.handleResize());
  }

  renderRunSettings(id) {
    const container = document.getElementById("runSettings");
    const difficultyButtons = DIFFICULTIES.map(
      (level) => `<button type="button" data-difficulty="${level}">${DIFFICULTY_LABELS[level]}</button>`,
    ).join("");
    const modeButtons = MODE_GAMES.includes(id)
      ? MODES.map((mode) => `<button type="button" data-mode="${mode}">${MODE_LABELS[mode]}</button>`).join("")
      : "";
    container.innerHTML = `
      <div class="run-settings__group" data-field="difficultyGroup">${difficultyButtons}</div>
      ${modeButtons ? `<div class="run-settings__group" data-field="modeGroup">${modeButtons}</div>` : ""}
    `;
    const activeDifficulty = this.store.data.difficulty[id] || "normal";
    container.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.classList.toggle("active", button.dataset.difficulty === activeDifficulty);
      button.addEventListener("click", () => {
        this.store.setDifficulty(id, button.dataset.difficulty);
        this.renderRunSettings(id);
        this.toast("Difficulté", DIFFICULTY_LABELS[button.dataset.difficulty]);
      });
    });
    if (modeButtons) {
      const activeMode = this.store.modeOf(id);
      container.querySelectorAll("[data-mode]").forEach((button) => {
        button.classList.toggle("active", button.dataset.mode === activeMode);
        button.addEventListener("click", () => {
          this.store.setMode(id, button.dataset.mode);
          this.renderRunSettings(id);
          this.toast("Mode de jeu", MODE_LABELS[button.dataset.mode]);
          this.currentGame?.onModeChanged?.();
        });
      });
    }
  }

  bindTopControls() {
    const soundBtn = document.getElementById("soundToggle");
    const syncSound = () => {
      if (!soundBtn) return;
      const muted = hubAudio.isMuted();
      soundBtn.textContent = muted ? "🔇" : "🔊";
      soundBtn.setAttribute("aria-pressed", String(muted));
    };
    syncSound();
    soundBtn?.addEventListener("click", () => {
      const muted = hubAudio.toggleMuted();
      syncSound();
      if (!muted) hubAudio.click();
    });

    const qualityBtn = document.getElementById("qualityToggle");
    const qualityLabel = document.querySelector("[data-quality-label]");
    const syncQuality = () => {
      const q = getQualityMode();
      if (qualityLabel) qualityLabel.textContent = QUALITY_LABELS[q] || "Auto";
    };
    syncQuality();
    qualityBtn?.addEventListener("click", () => {
      const current = getQualityMode();
      const next = QUALITY_MODES[(QUALITY_MODES.indexOf(current) + 1) % QUALITY_MODES.length];
      setQualityMode(next);
      syncQuality();
      hubAudio.click();
      this.currentGame?.onQualityChanged?.(next);
      this.toast("Qualité 3D", QUALITY_LABELS[next]);
    });
  }

  bindShop() {
    document.querySelectorAll("[data-open-shop]").forEach((button) =>
      button.addEventListener("click", () => this.openShop()),
    );
    document.getElementById("closeShop").addEventListener("click", () => this.closeShop());
    document.getElementById("shopModal").addEventListener("pointerdown", (event) => {
      if (event.target.id === "shopModal") this.closeShop();
    });
  }

  openShop() {
    this.renderShop();
    const modal = document.getElementById("shopModal");
    modal.inert = false;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("open");
    document.getElementById("closeShop").focus();
  }

  closeShop() {
    const modal = document.getElementById("shopModal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modal.inert = true;
  }

  renderShop() {
    const themeShop = document.getElementById("themeShop");
    themeShop.innerHTML = "";
    for (const theme of THEMES) {
      const owned = this.store.data.ownedThemes.includes(theme.id);
      const equipped = this.store.data.theme === theme.id;
      const item = document.createElement("article");
      item.className = "shop-item";
      item.innerHTML = `
        <div class="theme-preview theme-preview--${theme.id}"></div>
        <strong>${theme.name}</strong>
        <small>${theme.description}</small>
        <button type="button" class="${owned && !equipped ? "secondary" : ""}" ${equipped ? "disabled" : ""}>
          ${equipped ? "ÉQUIPÉ" : owned ? "ÉQUIPER" : `${theme.cost} NOVA COINS`}
        </button>
      `;
      item.querySelector("button").addEventListener("click", () => {
        if (!this.store.buyTheme(theme)) {
          this.toast("Solde insuffisant", `${theme.cost} Nova Coins requises`);
          return;
        }
        this.toast(theme.name, owned ? "Thème équipé" : "Thème débloqué");
        this.renderShop();
      });
      themeShop.append(item);
    }

    const level = this.store.data.multiplierLevel;
    const nextLevel = level + 1;
    const maxed = nextLevel >= MULTIPLIERS.length;
    const cost = MULTIPLIER_COSTS[nextLevel] || 0;
    const multiplierShop = document.getElementById("multiplierShop");
    multiplierShop.innerHTML = `
      <article class="multiplier-card">
        <span class="multiplier-card__value">x${this.store.multiplier}</span>
        <span class="multiplier-card__copy">
          <strong>${maxed ? "Amplificateur au maximum" : `Prochain niveau : x${MULTIPLIERS[nextLevel]}`}</strong>
          <small>${maxed ? "Tous tes gains bénéficient du bonus maximal." : "Bonus permanent appliqué aux trois expériences 3D."}</small>
        </span>
        <button type="button" ${maxed ? "disabled" : ""}>
          ${maxed ? "NIVEAU MAX" : `${cost} NOVA COINS`}
        </button>
      </article>
    `;
    multiplierShop.querySelector("button").addEventListener("click", () => {
      if (!this.store.upgradeMultiplier()) {
        this.toast("Solde insuffisant", `${cost} Nova Coins requises`);
        return;
      }
      this.toast("Amplificateur amélioré", `Tous les gains passent à x${this.store.multiplier}`);
      this.renderShop();
    });

    const itemShop = document.getElementById("itemShop");
    itemShop.innerHTML = "";
    for (const item of SHOP_ITEMS) {
      const owned = this.store.data.inventory[item.id] || 0;
      const card = document.createElement("article");
      card.className = "item-card";
      card.innerHTML = `
        <div class="item-card__icon">${item.icon}</div>
        <strong>${item.name}</strong>
        <small>${item.description}</small>
        <div class="item-card__footer">
          <span class="item-card__owned">Possédés : ${owned}</span>
          <button type="button" data-action="buy">${item.cost} N</button>
          ${item.id === "megaBoost" ? `<button type="button" class="secondary" data-action="use" ${owned ? "" : "disabled"}>Utiliser</button>` : ""}
        </div>
      `;
      card.querySelector("[data-action='buy']").addEventListener("click", () => {
        if (!this.store.buyItem(item.id)) {
          this.toast("Solde insuffisant", `${item.cost} Nova Coins requises`);
          return;
        }
        this.renderShop();
      });
      const useButton = card.querySelector("[data-action='use']");
      if (useButton) {
        useButton.addEventListener("click", () => {
          if (this.store.consumeItem(item.id)) {
            this.toast(item.name, "Activé pour la prochaine partie terminée");
            this.renderShop();
          }
        });
      }
      itemShop.append(card);
    }
  }

  updateSharedUi() {
    document.documentElement.dataset.theme = this.store.data.theme;
    document.querySelectorAll("[data-coins]").forEach((element) => {
      element.textContent = formatNumber(this.store.data.coins);
    });
    document.querySelectorAll("[data-multiplier]").forEach((element) => {
      element.textContent = `x${this.store.multiplier}`;
    });
    if (document.getElementById("shopModal").classList.contains("open")) this.renderShop();
  }

  toast(title, value) {
    const region = document.getElementById("toastRegion");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span class="coin-dot">✦</span><strong>${title}</strong><span>${value}</span>`;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  loop(timestamp) {
    const delta = clamp((timestamp - this.lastTime) / 1000, 0, 0.034);
    this.lastTime = timestamp;
    if (!document.hidden && !document.getElementById("shopModal").classList.contains("open")) {
      this.currentGame?.update(delta);
    }
    this.currentGame?.render();
    requestAnimationFrame(this.loop);
  }
}

// Expose la palette pour un éventuel usage externe (cohérence avec le hub 2D).
window.Hub3DPalettes = PALETTES;
window.hub3dApp = new Hub3D();
