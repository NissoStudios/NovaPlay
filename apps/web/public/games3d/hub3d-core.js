// Eco Arcade Hub 3D — noyau partagé (économie, entrées, utilitaires).
// Vanilla JS + Three.js (vendoré localement). Aucune autre dépendance.

export const STORAGE_KEY = "novaplay:eco-arcade:v1";

export const PALETTES = {
  verdant: {
    background: "#07140f",
    panel: "#0d2018",
    panelSoft: "#143126",
    line: "#2a5843",
    text: "#effbf4",
    muted: "#83a493",
    accent: "#56f39a",
    accent2: "#20c7a2",
    hot: "#ffcc66",
    danger: "#ff6d7a",
  },
  neon: {
    background: "#09091a",
    panel: "#11122a",
    panelSoft: "#1a1c40",
    line: "#393873",
    text: "#f5f2ff",
    muted: "#9995bb",
    accent: "#a47dff",
    accent2: "#4ce8f0",
    hot: "#ff79c6",
    danger: "#ff6d91",
  },
  solar: {
    background: "#160e08",
    panel: "#28190e",
    panelSoft: "#3a2414",
    line: "#6a4527",
    text: "#fff8ec",
    muted: "#b8a183",
    accent: "#ffb94f",
    accent2: "#ff6f61",
    hot: "#ffe66d",
    danger: "#ff615d",
  },
};

export const THEMES = [
  { id: "verdant", name: "Verdant Core", description: "La forêt cybernétique originale.", cost: 0 },
  { id: "neon", name: "Neon Bloom", description: "Violet électrique et cyan orbital.", cost: 120 },
  { id: "solar", name: "Solar Grove", description: "Une canopée chaude aux reflets dorés.", cost: 260 },
];

export const MULTIPLIERS = [1, 1.25, 1.5, 2];
export const MULTIPLIER_COSTS = [0, 150, 420, 950];

export const DIFFICULTIES = ["easy", "normal", "hard"];
export const DIFFICULTY_LABELS = { easy: "Facile", normal: "Normal", hard: "Difficile" };
// Multiplicateurs génériques appliqués aux paramètres sensibles de chaque jeu
// (vitesse, cadence d'ennemis, coûts...). 1 = réglage de référence (Normal).
export const DIFFICULTY_SCALE = {
  easy: { speed: 0.82, spawn: 0.75, cost: 0.85, reward: 0.9 },
  normal: { speed: 1, spawn: 1, cost: 1, reward: 1 },
  hard: { speed: 1.22, spawn: 1.35, cost: 1.2, reward: 1.2 },
};

export const MODE_GAMES = ["rally", "collapse", "chroma", "clash"];
export const MODES = ["solo", "nova", "duo"];
export const MODE_LABELS = { solo: "Solo", nova: "Vs Nova", duo: "2 Joueurs" };

export const SHOP_ITEMS = [
  {
    id: "shield",
    name: "Bouclier Renforcé",
    description: "+1 bouclier de départ pour la prochaine run (Rally, Siege).",
    cost: 40,
    icon: "🛡",
  },
  {
    id: "slowTime",
    name: "Chrono Ralenti",
    description: "Ralentit la montée en difficulté pendant toute la prochaine run (Runner, Rally).",
    cost: 50,
    icon: "⏳",
  },
  {
    id: "megaBoost",
    name: "Méga Multiplicateur",
    description: "Double les Nova Coins gagnées lors de la prochaine partie terminée, tous jeux confondus.",
    cost: 80,
    icon: "✦",
  },
  {
    id: "magnet",
    name: "Aimant à Pièces",
    description: "Élargit la zone de collecte des pièces et cristaux (Rally, Quarry).",
    cost: 45,
    icon: "🧲",
  },
  {
    id: "revive",
    name: "Jeton de Résurrection",
    description: "Relance automatiquement une fois en cas d'échec (Rally, Siege, Runner).",
    cost: 100,
    icon: "♻",
  },
  {
    id: "starterPack",
    name: "Kit de Démarrage",
    description: "Ressources, or ou feuilles bonus au lancement (Quarry, Stick Clash, Harvest Clicker).",
    cost: 60,
    icon: "📦",
  },
];

export const SIEGE_UPGRADES = [
  { id: "damage", name: "Impact des noyaux", baseCost: 60, growth: 1.55, maxLevel: 8 },
  { id: "fireRate", name: "Cadence de tir", baseCost: 70, growth: 1.6, maxLevel: 8 },
  { id: "splash", name: "Rayon de collapse", baseCost: 90, growth: 1.65, maxLevel: 6 },
  { id: "coreHp", name: "Blindage du noyau", baseCost: 80, growth: 1.5, maxLevel: 8 },
];

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const choose = (values) => values[Math.floor(Math.random() * values.length)];

export function formatNumber(value) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return Math.floor(value).toLocaleString("fr-FR");
}

export function upgradeCost(definition, level) {
  return Math.round(definition.baseCost * Math.pow(definition.growth, level));
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function makeRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bruit de valeur 2D lissé, sans dépendance externe — utilisé pour le terrain voxel. */
export function makeNoise2D(seed = 1) {
  const rng = makeRng(seed);
  const permutation = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) permutation[i] = i;
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = permutation[i];
    permutation[i] = permutation[j];
    permutation[j] = tmp;
  }
  const lattice = (x, y) => {
    const xi = x & 255;
    const yi = y & 255;
    return permutation[(permutation[xi] + yi) & 255] / 255;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return function noise2D(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const v00 = lattice(x0, y0);
    const v10 = lattice(x0 + 1, y0);
    const v01 = lattice(x0, y0 + 1);
    const v11 = lattice(x0 + 1, y0 + 1);
    const top = lerp(v00, v10, tx);
    const bottom = lerp(v01, v11, tx);
    return lerp(top, bottom, ty);
  };
}

/** Économie globale Nova Coins — partagée avec le hub 2D via la même clé localStorage. */
export class HubStore extends EventTarget {
  constructor() {
    super();
    this.data = this.load();
    this.saveTimer = 0;
  }

  defaults() {
    return {
      version: 1,
      coins: 30,
      theme: "verdant",
      ownedThemes: ["verdant"],
      multiplierLevel: 0,
      records: {
        collapse: 0,
        runner: 0,
        chroma: 0,
        clash: 0,
        rally: 0,
        quarry: 0,
        siege: 0,
      },
      harvest: {
        leaves: 0,
        totalLeaves: 0,
        coinMilestone: 0,
        producers: { grandma: 0, greenhouse: 0, drone: 0 },
        lastSeen: Date.now(),
      },
      siegeUpgrades: { damage: 0, fireRate: 0, splash: 0, coreHp: 0 },
      difficulty: {
        harvest: "normal",
        collapse: "normal",
        runner: "normal",
        chroma: "normal",
        clash: "normal",
        rally: "normal",
        quarry: "normal",
        siege: "normal",
      },
      mode: { rally: "solo", collapse: "solo", chroma: "solo", clash: "solo" },
      inventory: { shield: 0, slowTime: 0, megaBoost: 0, magnet: 0, revive: 0, starterPack: 0 },
      pendingMegaBoost: false,
    };
  }

  load() {
    const fallback = this.defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return fallback;
      return {
        ...fallback,
        ...saved,
        records: { ...fallback.records, ...(saved.records || {}) },
        harvest: {
          ...fallback.harvest,
          ...(saved.harvest || {}),
          producers: {
            ...fallback.harvest.producers,
            ...((saved.harvest && saved.harvest.producers) || {}),
          },
        },
        siegeUpgrades: { ...fallback.siegeUpgrades, ...(saved.siegeUpgrades || {}) },
        difficulty: { ...fallback.difficulty, ...(saved.difficulty || {}) },
        mode: { ...fallback.mode, ...(saved.mode || {}) },
        inventory: { ...fallback.inventory, ...(saved.inventory || {}) },
        ownedThemes: Array.isArray(saved.ownedThemes)
          ? [...new Set(["verdant", ...saved.ownedThemes])]
          : ["verdant"],
      };
    } catch (error) {
      console.error("[Eco Arcade 3D] Sauvegarde locale illisible.", error);
      return fallback;
    }
  }

  get multiplier() {
    return MULTIPLIERS[this.data.multiplierLevel] || 1;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error("[Eco Arcade 3D] Sauvegarde locale impossible.", error);
    }
  }

  scheduleSave(delta) {
    this.saveTimer += delta;
    if (this.saveTimer >= 2) {
      this.saveTimer = 0;
      this.save();
    }
  }

  emit() {
    this.dispatchEvent(new Event("change"));
  }

  award(baseAmount, reason) {
    let amount = Math.max(1, Math.round(baseAmount * this.multiplier));
    if (this.data.pendingMegaBoost) {
      amount *= 2;
      this.data.pendingMegaBoost = false;
      reason = `${reason} (x2 Méga Multiplicateur)`;
    }
    this.data.coins += amount;
    this.emit();
    this.save();
    window.hub3dApp?.toast(reason, `+${amount} N`);
    return amount;
  }

  spend(amount) {
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    this.emit();
    this.save();
    return true;
  }

  setDifficulty(gameId, level) {
    if (!DIFFICULTIES.includes(level)) return;
    this.data.difficulty[gameId] = level;
    this.emit();
    this.save();
  }

  difficultyOf(gameId) {
    return DIFFICULTY_SCALE[this.data.difficulty[gameId] || "normal"];
  }

  setMode(gameId, mode) {
    if (!MODES.includes(mode)) return;
    this.data.mode[gameId] = mode;
    this.emit();
    this.save();
  }

  modeOf(gameId) {
    return this.data.mode[gameId] || "solo";
  }

  buyItem(itemId) {
    const definition = SHOP_ITEMS.find((item) => item.id === itemId);
    if (!definition) return false;
    if (!this.spend(definition.cost)) return false;
    this.data.inventory[itemId] = (this.data.inventory[itemId] || 0) + 1;
    this.emit();
    this.save();
    window.hub3dApp?.toast(definition.name, "Ajouté à ton inventaire");
    return true;
  }

  /** Consomme un objet de l'inventaire s'il est disponible ; renvoie true si consommé. */
  consumeItem(itemId) {
    if (!this.data.inventory[itemId]) return false;
    this.data.inventory[itemId] -= 1;
    if (itemId === "megaBoost") this.data.pendingMegaBoost = true;
    this.emit();
    this.save();
    return true;
  }

  setRecord(key, score) {
    if (score <= (this.data.records[key] || 0)) return;
    this.data.records[key] = Math.floor(score);
    this.emit();
    this.save();
  }

  buyTheme(theme) {
    if (this.data.ownedThemes.includes(theme.id)) {
      this.data.theme = theme.id;
      this.emit();
      this.save();
      return true;
    }
    if (!this.spend(theme.cost)) return false;
    this.data.ownedThemes.push(theme.id);
    this.data.theme = theme.id;
    this.emit();
    this.save();
    return true;
  }

  upgradeMultiplier() {
    const nextLevel = this.data.multiplierLevel + 1;
    if (nextLevel >= MULTIPLIERS.length) return false;
    const cost = MULTIPLIER_COSTS[nextLevel];
    if (!this.spend(cost)) return false;
    this.data.multiplierLevel = nextLevel;
    this.emit();
    this.save();
    return true;
  }

  upgradeSiege(id) {
    const definition = SIEGE_UPGRADES.find((entry) => entry.id === id);
    if (!definition) return false;
    const level = this.data.siegeUpgrades[id] || 0;
    if (level >= definition.maxLevel) return false;
    const cost = upgradeCost(definition, level);
    if (!this.spend(cost)) return false;
    this.data.siegeUpgrades[id] = level + 1;
    this.emit();
    this.save();
    return true;
  }
}

/** Suivi clavier avec détection "vient d'être pressé" par frame. */
export class KeyState {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.onKeyDown = (event) => {
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);
    };
    this.onKeyUp = (event) => {
      this.down.delete(event.code);
    };
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.down.clear();
    this.pressed.clear();
  }

  isDown(...codes) {
    return codes.some((code) => this.down.has(code));
  }

  wasPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  endFrame() {
    this.pressed.clear();
  }
}

/** Joystick virtuel tactile (base + curseur) injecté dans un conteneur DOM. */
export class VirtualJoystick {
  constructor(container, { side = "left" } = {}) {
    this.axis = { x: 0, y: 0 };
    this.active = false;
    this.pointerId = null;

    this.root = document.createElement("div");
    this.root.className = `virtual-joystick virtual-joystick--${side}`;
    this.base = document.createElement("div");
    this.base.className = "virtual-joystick__base";
    this.knob = document.createElement("div");
    this.knob.className = "virtual-joystick__knob";
    this.base.append(this.knob);
    this.root.append(this.base);
    container.append(this.root);

    this.center = { x: 0, y: 0 };
    this.radius = 44;

    this.onPointerDown = (event) => {
      event.preventDefault();
      const rectangle = this.base.getBoundingClientRect();
      this.center = { x: rectangle.left + rectangle.width / 2, y: rectangle.top + rectangle.height / 2 };
      this.radius = rectangle.width / 2;
      this.pointerId = event.pointerId;
      this.active = true;
      this.updateFromEvent(event);
    };
    this.onPointerMove = (event) => {
      if (!this.active || event.pointerId !== this.pointerId) return;
      this.updateFromEvent(event);
    };
    this.onPointerEnd = (event) => {
      if (event.pointerId !== this.pointerId) return;
      this.active = false;
      this.pointerId = null;
      this.axis.x = 0;
      this.axis.y = 0;
      this.knob.style.transform = "translate(-50%, -50%)";
    };

    this.base.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerEnd);
    window.addEventListener("pointercancel", this.onPointerEnd);
  }

  updateFromEvent(event) {
    const dx = event.clientX - this.center.x;
    const dy = event.clientY - this.center.y;
    const distance = Math.min(1, Math.hypot(dx, dy) / this.radius);
    const angle = Math.atan2(dy, dx);
    this.axis.x = Math.cos(angle) * distance;
    this.axis.y = Math.sin(angle) * distance;
    const knobRadius = this.radius * 0.55;
    this.knob.style.transform = `translate(calc(-50% + ${this.axis.x * knobRadius}px), calc(-50% + ${this.axis.y * knobRadius}px))`;
  }

  dispose() {
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerEnd);
    window.removeEventListener("pointercancel", this.onPointerEnd);
    this.root.remove();
  }
}

/** Bouton d'action tactile réutilisable (boost, tir, minage...). */
export class TouchButton {
  constructor(container, { label = "", side = "right", offset = 0, variant = "" } = {}) {
    this.pressed = false;
    this.justPressed = false;
    this.el = document.createElement("button");
    this.el.type = "button";
    this.el.className = `touch-action touch-action--${side} ${variant}`.trim();
    this.el.style.setProperty("--offset", `${offset}px`);
    this.el.textContent = label;
    this.el.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        this.pressed = true;
        this.justPressed = true;
        this.el.classList.add("is-active");
      },
      { passive: false },
    );
    const release = () => {
      this.pressed = false;
      this.el.classList.remove("is-active");
    };
    this.el.addEventListener("pointerup", release);
    this.el.addEventListener("pointercancel", release);
    this.el.addEventListener("pointerleave", release);
    container.append(this.el);
  }

  consumeJustPressed() {
    const value = this.justPressed;
    this.justPressed = false;
    return value;
  }

  dispose() {
    this.el.remove();
  }
}

/** Lit le premier contrôleur Gamepad connecté avec une zone morte confortable. */
export function readGamepad() {
  const pads = navigator.getGamepads?.();
  if (!pads) return { axisX: 0, axisY: 0, actionA: false, actionB: false };
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    const rawX = pad.axes[0] || 0;
    const rawY = pad.axes[1] || 0;
    const dpadLeft = pad.buttons[14]?.pressed ? -1 : 0;
    const dpadRight = pad.buttons[15]?.pressed ? 1 : 0;
    const dpadUp = pad.buttons[12]?.pressed ? -1 : 0;
    const dpadDown = pad.buttons[13]?.pressed ? 1 : 0;
    const axisX = Math.abs(rawX) > 0.18 ? rawX : dpadLeft + dpadRight;
    const axisY = Math.abs(rawY) > 0.18 ? rawY : dpadUp + dpadDown;
    const actionA = Boolean(pad.buttons[0]?.pressed || pad.buttons[7]?.pressed);
    const actionB = Boolean(pad.buttons[1]?.pressed || pad.buttons[6]?.pressed);
    return { axisX: clamp(axisX, -1, 1), axisY: clamp(axisY, -1, 1), actionA, actionB };
  }
  return { axisX: 0, axisY: 0, actionA: false, actionB: false };
}

const QUALITY_KEY = "novaplay:3d-quality";
export const QUALITY_MODES = ["auto", "high", "eco"];
export const QUALITY_LABELS = { auto: "Auto", high: "Élevée", eco: "Éco" };

export function getQualityMode() {
  try {
    const val = localStorage.getItem(QUALITY_KEY);
    return QUALITY_MODES.includes(val) ? val : "auto";
  } catch {
    return "auto";
  }
}

export function setQualityMode(mode) {
  if (!QUALITY_MODES.includes(mode)) return;
  try {
    localStorage.setItem(QUALITY_KEY, mode);
  } catch {
    // Ignore
  }
}

/** Prépare un WebGLRenderer Three.js avec les réglages de qualité communs aux 3 jeux. */
export function configureRenderer(renderer, THREE, quality = getQualityMode()) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const low = quality === "eco";
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxDpr = low ? 1 : quality === "high" ? 2 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
}

export function showWebGLFallback(container) {
  const notice = document.createElement("div");
  notice.className = "engine3d__overlay visible";
  notice.innerHTML = `
    <div class="rally-results__card">
      <h3>Rendu 3D indisponible</h3>
      <p class="rally-results__stat">WebGL semble désactivé ou bloqué sur ce navigateur.</p>
      <a class="rally-results__button" href="/arcade-hub.html" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;">Ouvrir le Hub 2D</a>
    </div>
  `;
  container.append(notice);
}

/** Classe de base commune aux moteurs 3D — même contrat de cycle de vie que les jeux 2D. */
export class Game3D {
  constructor(hub) {
    this.hub = hub;
    this.store = hub.store;
    this.ready = false;
  }

  enter() {}

  exit() {}

  update() {}

  resize() {}

  pointerDown() {}

  pointerMove() {}

  pointerUp() {}

  dispose() {}
}
