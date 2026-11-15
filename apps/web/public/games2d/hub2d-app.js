import { hubAudio } from "/games3d/hub-audio.js";

(() => {
  "use strict";

  const LOGICAL_WIDTH = 960;
  const LOGICAL_HEIGHT = 600;
  const STORAGE_KEY = "novaplay:eco-arcade:v1";
  const TAU = Math.PI * 2;

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const lerp = (start, end, amount) => start + (end - start) * amount;
  const random = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
  const choose = (values) => values[Math.floor(Math.random() * values.length)];
  const formatNumber = (value) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return Math.floor(value).toLocaleString("fr-FR");
  };

  const roundedRect = (context, x, y, width, height, radius) => {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, safeRadius);
  };

  const hitRect = (point, rectangle) =>
    point.x >= rectangle.x &&
    point.x <= rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y <= rectangle.y + rectangle.height;

  const hexToRgba = (hex, alpha) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  };

  const PALETTES = {
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

  const GAME_META = [
    {
      id: "harvest",
      icon: `<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--panel-2)" stroke="var(--accent)" stroke-width="2"/>
        <path d="M32 46 V28" stroke="var(--line)" stroke-width="3" stroke-linecap="round"/>
        <path d="M32 30 C20 28 16 18 20 10 C30 12 36 20 32 30 Z" fill="var(--accent)"/>
        <path d="M32 34 C44 32 48 22 44 14 C34 16 28 24 32 34 Z" fill="var(--accent-2)"/>
        <circle cx="46" cy="16" r="3" fill="var(--hot)"/>
      </svg>`,
      short: "Harvest",
      title: "Harvest Clicker",
      genre: "Idle • Incremental",
      subtitle: "Cultive, automatise, prospère",
      tip: "Clique la plante et automatise ta récolte.",
    },
    {
      id: "collapse",
      icon: `<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--panel-2)" stroke="var(--danger)" stroke-width="2"/>
        <circle cx="22" cy="42" r="9" fill="var(--hot)"/>
        <circle cx="40" cy="37" r="13" fill="#ff8a3d"/>
        <circle cx="35" cy="18" r="7" fill="var(--accent)"/>
      </svg>`,
      short: "Collapse",
      title: "Crop Collapse",
      genre: "Physique • Fusion",
      subtitle: "Fusionne la récolte parfaite",
      tip: "Déplace le curseur puis lâche un fruit dans la cuve.",
    },
    {
      id: "runner",
      icon: `<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--panel-2)" stroke="var(--accent)" stroke-width="2"/>
        <circle cx="36" cy="15" r="5" fill="var(--text)"/>
        <path d="M34 20 L31 33 L22 41 M31 33 L39 39 M34 25 L42 21 M34 25 L25 29" stroke="var(--text)" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M12 48 L19 37 L26 48 Z" fill="var(--line)"/>
      </svg>`,
      short: "Runner",
      title: "Canopy Runner",
      genre: "Arcade • Réflexes",
      subtitle: "Cours sous la canopée",
      tip: "Saute les rochers et baisse-toi sous les branches.",
    },
    {
      id: "chroma",
      icon: `<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--panel-2)" stroke="var(--accent)" stroke-width="2"/>
        <circle cx="20" cy="20" r="7" fill="var(--accent)"/>
        <circle cx="44" cy="20" r="7" fill="var(--accent-2)"/>
        <circle cx="20" cy="44" r="7" fill="var(--accent-2)"/>
        <circle cx="44" cy="44" r="7" fill="var(--accent)"/>
        <circle cx="32" cy="32" r="7" fill="var(--hot)"/>
      </svg>`,
      short: "Chroma",
      title: "Chroma Sort",
      genre: "Puzzle • Combos",
      subtitle: "Aligne les noyaux chromatiques",
      tip: "Regroupe quatre couleurs identiques pour déclencher une réaction.",
    },
    {
      id: "clash",
      icon: `<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--panel-2)" stroke="var(--hot)" stroke-width="2"/>
        <circle cx="18" cy="18" r="5" fill="var(--accent)"/>
        <path d="M18 23 V38 M18 27 L10 32 M18 27 L26 24 M18 38 L12 48 M18 38 L24 48" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" fill="none"/>
        <circle cx="46" cy="18" r="5" fill="var(--danger)"/>
        <path d="M46 23 V38 M46 27 L54 32 M46 27 L38 24 M46 38 L52 48 M46 38 L40 48" stroke="var(--danger)" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>`,
      short: "Clash",
      title: "Stick Clash",
      genre: "Stratégie • Auto-battler",
      subtitle: "Tiens la ligne, vague après vague",
      tip: "Déploie des unités et améliore-les avant la prochaine vague.",
    },
  ];

  const THEMES = [
    { id: "verdant", name: "Verdant Core", description: "La forêt cybernétique originale.", cost: 0 },
    { id: "neon", name: "Neon Bloom", description: "Violet électrique et cyan orbital.", cost: 120 },
    { id: "solar", name: "Solar Grove", description: "Une canopée chaude aux reflets dorés.", cost: 260 },
  ];

  const MULTIPLIERS = [1, 1.25, 1.5, 2];
  const MULTIPLIER_COSTS = [0, 150, 420, 950];

  const DIFFICULTIES = ["easy", "normal", "hard"];
  const DIFFICULTY_LABELS = { easy: "Facile", normal: "Normal", hard: "Difficile" };
  const DIFFICULTY_SCALE = {
    easy: { speed: 0.82, spawn: 0.75, cost: 0.85, reward: 0.9 },
    normal: { speed: 1, spawn: 1, cost: 1, reward: 1 },
    hard: { speed: 1.22, spawn: 1.35, cost: 1.2, reward: 1.2 },
  };

  const MODE_GAMES = ["collapse", "chroma", "clash"];
  const MODES = ["solo", "nova", "duo"];
  const MODE_LABELS = { solo: "Solo", nova: "Vs Nova", duo: "2 Joueurs" };

  const SHOP_ITEMS = [
    {
      id: "shield",
      name: "Bouclier Renforcé",
      description: "+1 vie de départ pour la prochaine run (Canopy Runner).",
      cost: 40,
      icon: "🛡",
    },
    {
      id: "slowTime",
      name: "Chrono Ralenti",
      description: "Ralentit la montée en vitesse pendant toute la prochaine run (Canopy Runner).",
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
      name: "Aimant à Feuilles",
      description: "Augmente temporairement la production de Harvest Clicker au démarrage.",
      cost: 45,
      icon: "🧲",
    },
    {
      id: "revive",
      name: "Jeton de Résurrection",
      description: "Relance automatiquement une fois en cas d'échec (Canopy Runner).",
      cost: 100,
      icon: "♻",
    },
    {
      id: "starterPack",
      name: "Kit de Démarrage",
      description: "Or ou feuilles bonus au lancement (Harvest Clicker, Stick Clash).",
      cost: 60,
      icon: "📦",
    },
  ];

  class HubStore extends EventTarget {
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
        },
        harvest: {
          leaves: 0,
          totalLeaves: 0,
          coinMilestone: 0,
          producers: { grandma: 0, greenhouse: 0, drone: 0 },
          lastSeen: Date.now(),
        },
        difficulty: { harvest: "normal", collapse: "normal", runner: "normal", chroma: "normal", clash: "normal" },
        mode: { collapse: "solo", chroma: "solo", clash: "solo" },
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
          difficulty: { ...fallback.difficulty, ...(saved.difficulty || {}) },
          mode: { ...fallback.mode, ...(saved.mode || {}) },
          inventory: { ...fallback.inventory, ...(saved.inventory || {}) },
          ownedThemes: Array.isArray(saved.ownedThemes)
            ? [...new Set(["verdant", ...saved.ownedThemes])]
            : ["verdant"],
        };
      } catch (error) {
        console.error("[Eco Arcade] Sauvegarde locale illisible.", error);
        return fallback;
      }
    }

    get multiplier() {
      return MULTIPLIERS[this.data.multiplierLevel] || 1;
    }

    save() {
      this.data.harvest.lastSeen = Date.now();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (error) {
        console.error("[Eco Arcade] Sauvegarde locale impossible.", error);
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
      hubAudio.coin();
      window.hubApp?.toast(reason, `+${amount} N`);
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
      window.hubApp?.toast(definition.name, "Ajouté à ton inventaire");
      return true;
    }

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
  }

  class Particle {
    constructor(x, y, color, options = {}) {
      this.x = x;
      this.y = y;
      this.vx = options.vx ?? random(-85, 85);
      this.vy = options.vy ?? random(-150, -45);
      this.life = options.life ?? random(0.45, 0.85);
      this.maxLife = this.life;
      this.size = options.size ?? random(3, 7);
      this.color = color;
      this.gravity = options.gravity ?? 220;
      this.shape = options.shape || "circle";
    }

    update(delta) {
      this.life -= delta;
      this.vy += this.gravity * delta;
      this.x += this.vx * delta;
      this.y += this.vy * delta;
    }

    draw(context) {
      const alpha = clamp(this.life / this.maxLife, 0, 1);
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = this.color;
      context.translate(this.x, this.y);
      context.rotate((1 - alpha) * 2);
      if (this.shape === "leaf") {
        context.beginPath();
        context.ellipse(0, 0, this.size * 1.5, this.size * 0.75, 0.5, 0, TAU);
        context.fill();
      } else {
        context.beginPath();
        context.arc(0, 0, this.size, 0, TAU);
        context.fill();
      }
      context.restore();
    }
  }

  class BaseGame {
    constructor(hub) {
      this.hub = hub;
      this.particles = [];
    }

    get palette() {
      return this.hub.palette;
    }

    enter() {}
    exit() {}
    pointerDown() {}
    pointerMove() {}
    pointerUp() {}
    keyDown() {}
    keyUp() {}

    updateParticles(delta) {
      for (const particle of this.particles) particle.update(delta);
      this.particles = this.particles.filter((particle) => particle.life > 0);
    }

    drawParticles(context) {
      for (const particle of this.particles) particle.draw(context);
    }

    drawBackdrop(context, glowX = 480, glowY = 260) {
      const palette = this.palette;
      context.fillStyle = palette.background;
      context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      const gradient = context.createRadialGradient(glowX, glowY, 15, glowX, glowY, 430);
      gradient.addColorStop(0, hexToRgba(palette.accent, 0.12));
      gradient.addColorStop(1, hexToRgba(palette.accent, 0));
      context.fillStyle = gradient;
      context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      context.strokeStyle = hexToRgba(palette.line, 0.26);
      context.lineWidth = 1;
      for (let x = 0; x <= LOGICAL_WIDTH; x += 48) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, LOGICAL_HEIGHT);
        context.stroke();
      }
      for (let y = 0; y <= LOGICAL_HEIGHT; y += 48) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(LOGICAL_WIDTH, y);
        context.stroke();
      }
    }

    panel(context, x, y, width, height, alpha = 0.9) {
      roundedRect(context, x, y, width, height, 16);
      context.fillStyle = hexToRgba(this.palette.panel, alpha);
      context.fill();
      context.strokeStyle = hexToRgba(this.palette.line, 0.65);
      context.stroke();
    }

    label(context, text, x, y, options = {}) {
      context.save();
      context.fillStyle = options.color || this.palette.text;
      context.font = `${options.weight || 700} ${options.size || 14}px Inter, system-ui, sans-serif`;
      context.textAlign = options.align || "left";
      context.textBaseline = options.baseline || "alphabetic";
      context.fillText(text, x, y);
      context.restore();
    }

    button(context, rectangle, label, options = {}) {
      roundedRect(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, options.radius || 10);
      context.fillStyle = options.disabled
        ? hexToRgba(this.palette.muted, 0.1)
        : options.secondary
          ? hexToRgba(this.palette.accent, 0.1)
          : this.palette.accent;
      context.fill();
      context.strokeStyle = options.disabled
        ? hexToRgba(this.palette.line, 0.45)
        : hexToRgba(this.palette.accent, options.secondary ? 0.45 : 0.75);
      context.stroke();
      this.label(context, label, rectangle.x + rectangle.width / 2, rectangle.y + rectangle.height / 2, {
        align: "center",
        baseline: "middle",
        color: options.disabled
          ? this.palette.muted
          : options.secondary
            ? this.palette.accent
            : "#03170e",
        size: options.size || 11,
        weight: 850,
      });
    }
  }

  class HarvestClicker extends BaseGame {
    constructor(hub) {
      super(hub);
      this.plant = { x: 330, y: 308, radius: 91 };
      this.pulse = 0;
      this.floaters = [];
      this.producerDefinitions = [
        {
          key: "grandma",
          icon: "👵",
          name: "Grand-mère jardinière",
          baseCost: 25,
          production: 1,
        },
        {
          key: "greenhouse",
          icon: "▱",
          name: "Serre automatisée",
          baseCost: 180,
          production: 8,
        },
        {
          key: "drone",
          icon: "✦",
          name: "Drone agricole quantique",
          baseCost: 1450,
          production: 65,
        },
      ];
      this.cardRects = this.producerDefinitions.map((_, index) => ({
        x: 605,
        y: 132 + index * 116,
        width: 316,
        height: 98,
      }));
      this.magnetBoostRemaining = 0;
      if (this.hub.store.consumeItem("starterPack")) {
        this.state.leaves += 150;
        this.state.totalLeaves += 150;
        this.hub.toast("Kit de Démarrage", "+150 feuilles bonus");
      }
      if (this.hub.store.consumeItem("magnet")) {
        this.magnetBoostRemaining = 90;
        this.hub.toast("Aimant à Feuilles", "Production x1.6 pendant 90s");
      }
      this.applyOfflineProgress();
    }

    get state() {
      return this.hub.store.data.harvest;
    }

    get leavesPerSecond() {
      const boost = this.magnetBoostRemaining > 0 ? 1.6 : 1;
      return (
        boost *
        this.producerDefinitions.reduce(
          (sum, producer) => sum + this.state.producers[producer.key] * producer.production,
          0,
        )
      );
    }

    get clickPower() {
      const totalProducers = Object.values(this.state.producers).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      return 1 + Math.floor(totalProducers / 12);
    }

    applyOfflineProgress() {
      const elapsed = clamp((Date.now() - this.state.lastSeen) / 1000, 0, 4 * 60 * 60);
      const earned = this.leavesPerSecond * elapsed;
      if (earned < 1) return;
      this.state.leaves += earned;
      this.state.totalLeaves += earned;
      window.setTimeout(
        () => this.hub.toast("Récolte hors ligne", `+${formatNumber(earned)} feuilles`),
        650,
      );
    }

    producerCost(producer) {
      const amount = this.state.producers[producer.key];
      const costScale = this.hub.store.difficultyOf("harvest").cost;
      return Math.floor(producer.baseCost * 1.18 ** amount * costScale);
    }

    clickPlant() {
      const amount = this.clickPower;
      this.state.leaves += amount;
      this.state.totalLeaves += amount;
      this.pulse = 1;
      this.floaters.push({
        x: this.plant.x + random(-25, 25),
        y: this.plant.y - 95,
        text: `+${amount}`,
        life: 0.8,
      });
      for (let index = 0; index < 8; index += 1) {
        this.particles.push(
          new Particle(this.plant.x, this.plant.y - 25, choose(["#56f39a", "#b8ff8a", "#20c7a2"]), {
            shape: "leaf",
          }),
        );
      }
      this.checkCoinMilestone();
    }

    buyProducer(index) {
      const producer = this.producerDefinitions[index];
      if (!producer) return;
      const cost = this.producerCost(producer);
      if (this.state.leaves < cost) {
        this.hub.toast("Récolte insuffisante", `${formatNumber(cost)} feuilles requises`);
        return;
      }
      this.state.leaves -= cost;
      this.state.producers[producer.key] += 1;
      this.hub.store.save();
      this.hub.toast(producer.name, `Niveau ${this.state.producers[producer.key]}`);
    }

    checkCoinMilestone() {
      const milestone = Math.floor(this.state.totalLeaves / 250);
      if (milestone <= this.state.coinMilestone) return;
      const difference = milestone - this.state.coinMilestone;
      this.state.coinMilestone = milestone;
      const reward = Math.round(Math.min(difference, 25) * this.hub.store.difficultyOf("harvest").reward);
      this.hub.store.award(Math.max(1, reward), "Récolte florissante");
    }

    update(delta) {
      if (this.magnetBoostRemaining > 0) this.magnetBoostRemaining -= delta;
      const production = this.leavesPerSecond * delta;
      this.state.leaves += production;
      this.state.totalLeaves += production;
      this.pulse = Math.max(0, this.pulse - delta * 3.5);
      for (const floater of this.floaters) {
        floater.y -= 45 * delta;
        floater.life -= delta;
      }
      this.floaters = this.floaters.filter((floater) => floater.life > 0);
      this.updateParticles(delta);
      this.checkCoinMilestone();
    }

    pointerDown(point) {
      if (Math.hypot(point.x - this.plant.x, point.y - this.plant.y) <= this.plant.radius + 25) {
        this.clickPlant();
        return;
      }
      const cardIndex = this.cardRects.findIndex((rectangle) => hitRect(point, rectangle));
      if (cardIndex >= 0) this.buyProducer(cardIndex);
    }

    keyDown(event) {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        this.clickPlant();
      }
      const number = Number(event.key);
      if (number >= 1 && number <= 3) this.buyProducer(number - 1);
    }

    draw(context) {
      this.drawBackdrop(context, 320, 290);
      const palette = this.palette;

      this.label(context, "JARDIN QUANTIQUE", 39, 46, {
        color: palette.accent,
        size: 10,
        weight: 850,
      });
      this.label(context, "Cultive ton écosystème", 39, 75, { size: 25, weight: 850 });
      this.label(context, "Clique, automatise et laisse la canopée travailler.", 39, 97, {
        color: palette.muted,
        size: 11,
        weight: 500,
      });

      this.panel(context, 39, 122, 170, 69);
      this.label(context, "FEUILLES", 55, 145, { color: palette.muted, size: 9, weight: 850 });
      this.label(context, formatNumber(this.state.leaves), 55, 174, {
        color: palette.accent,
        size: 25,
        weight: 900,
      });

      this.panel(context, 219, 122, 150, 69);
      this.label(context, "PAR SECONDE", 235, 145, { color: palette.muted, size: 9, weight: 850 });
      this.label(context, formatNumber(this.leavesPerSecond), 235, 174, {
        color: palette.text,
        size: 25,
        weight: 900,
      });

      const groundGradient = context.createRadialGradient(
        this.plant.x,
        this.plant.y + 95,
        10,
        this.plant.x,
        this.plant.y + 95,
        185,
      );
      groundGradient.addColorStop(0, hexToRgba(palette.accent, 0.2));
      groundGradient.addColorStop(1, hexToRgba(palette.accent, 0));
      context.fillStyle = groundGradient;
      context.fillRect(115, 260, 430, 270);

      context.save();
      context.translate(this.plant.x, this.plant.y);
      context.scale(1 + this.pulse * 0.08, 1 + this.pulse * 0.08);
      context.shadowColor = palette.accent;
      context.shadowBlur = 26 + this.pulse * 18;

      context.strokeStyle = "#55b879";
      context.lineWidth = 15;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(0, 104);
      context.bezierCurveTo(-9, 45, 8, 5, -1, -45);
      context.stroke();

      const leaves = [
        { x: -37, y: 39, angle: -0.45, size: 41 },
        { x: 38, y: 25, angle: 0.5, size: 43 },
        { x: -45, y: -19, angle: -0.65, size: 45 },
        { x: 39, y: -36, angle: 0.65, size: 47 },
        { x: 0, y: -75, angle: -0.08, size: 50 },
      ];
      for (const leaf of leaves) {
        context.save();
        context.translate(leaf.x, leaf.y);
        context.rotate(leaf.angle);
        const leafGradient = context.createLinearGradient(-leaf.size, 0, leaf.size, 0);
        leafGradient.addColorStop(0, palette.accent2);
        leafGradient.addColorStop(1, palette.accent);
        context.fillStyle = leafGradient;
        context.beginPath();
        context.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, TAU);
        context.fill();
        context.strokeStyle = hexToRgba("#ffffff", 0.25);
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-leaf.size * 0.55, 0);
        context.lineTo(leaf.size * 0.6, 0);
        context.stroke();
        context.restore();
      }
      context.restore();

      this.label(context, `+${this.clickPower} par clic`, this.plant.x, 463, {
        align: "center",
        color: palette.accent,
        size: 12,
        weight: 850,
      });
      this.label(context, "CLIQUE LA PLANTE", this.plant.x, 487, {
        align: "center",
        color: palette.muted,
        size: 9,
        weight: 850,
      });

      this.panel(context, 579, 40, 364, 514, 0.94);
      this.label(context, "AUTOMATISATION", 605, 72, {
        color: palette.accent,
        size: 10,
        weight: 850,
      });
      this.label(context, "Fais grandir ta production", 605, 99, { size: 19, weight: 850 });

      this.producerDefinitions.forEach((producer, index) => {
        const rectangle = this.cardRects[index];
        const amount = this.state.producers[producer.key];
        const cost = this.producerCost(producer);
        const affordable = this.state.leaves >= cost;
        roundedRect(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 13);
        context.fillStyle = affordable
          ? hexToRgba(palette.accent, 0.08)
          : hexToRgba(palette.panelSoft, 0.75);
        context.fill();
        context.strokeStyle = affordable
          ? hexToRgba(palette.accent, 0.34)
          : hexToRgba(palette.line, 0.52);
        context.stroke();

        roundedRect(context, rectangle.x + 13, rectangle.y + 15, 57, 57, 12);
        context.fillStyle = hexToRgba(palette.accent, 0.12);
        context.fill();
        this.label(context, producer.icon, rectangle.x + 41, rectangle.y + 45, {
          align: "center",
          baseline: "middle",
          size: 24,
        });

        this.label(context, producer.name, rectangle.x + 83, rectangle.y + 29, {
          size: 11,
          weight: 800,
        });
        this.label(
          context,
          `+${producer.production}/s • niveau ${amount}`,
          rectangle.x + 83,
          rectangle.y + 50,
          { color: palette.muted, size: 9, weight: 600 },
        );
        this.label(context, `${formatNumber(cost)} feuilles`, rectangle.x + 83, rectangle.y + 73, {
          color: affordable ? palette.accent : palette.muted,
          size: 10,
          weight: 800,
        });

        this.label(context, `${index + 1}`, rectangle.x + rectangle.width - 19, rectangle.y + 22, {
          align: "center",
          color: palette.muted,
          size: 9,
          weight: 800,
        });
      });

      for (const floater of this.floaters) {
        context.save();
        context.globalAlpha = clamp(floater.life / 0.8, 0, 1);
        this.label(context, floater.text, floater.x, floater.y, {
          align: "center",
          color: palette.hot,
          size: 18,
          weight: 900,
        });
        context.restore();
      }
      this.drawParticles(context);
    }
  }

  class CropCollapse extends BaseGame {
    constructor(hub) {
      super(hub);
      this.tiers = [
        { name: "Graine", radius: 18, color: "#d6b45b", icon: "•" },
        { name: "Pousse", radius: 25, color: "#71d66c", icon: "⌁" },
        { name: "Tomate", radius: 34, color: "#ff675c", icon: "✦" },
        { name: "Citrouille", radius: 45, color: "#ff9a45", icon: "≋" },
        { name: "Pastèque", radius: 59, color: "#47c77a", icon: "◒" },
        { name: "Fruit Nova", radius: 76, color: "#b680ff", icon: "✧" },
      ];
      this.container = { left: 145, right: 815, floor: 545, top: 74 };
      this.reset();
    }

    reset(options = {}) {
      this.balls = [];
      this.previewX = 480;
      this.difficultyScale = this.hub.store.difficultyOf("collapse");
      this.nextTier = this.rollNextTier();
      this.score = 0;
      this.dropCooldown = 0;
      this.dangerTime = 0;
      this.status = "playing";
      this.nextId = 1;
      this.mode = this.hub.store.modeOf("collapse");
      this.duoStage = options.duoStage || (this.mode === "duo" ? "p1" : null);
      this.novaScore = 0;
    }

    rollNextTier() {
      const tier1Chance = clamp(0.22 * (this.difficultyScale?.spawn ?? 1), 0.1, 0.52);
      return Math.random() < 1 - tier1Chance ? 0 : 1;
    }

    spawnBall(x) {
      if (this.dropCooldown > 0 || this.status !== "playing") return;
      const tier = this.tiers[this.nextTier];
      this.balls.push({
        id: this.nextId++,
        x: clamp(x, this.container.left + tier.radius, this.container.right - tier.radius),
        y: 48,
        vx: 0,
        vy: 15,
        tier: this.nextTier,
        radius: tier.radius,
      });
      this.nextTier = this.rollNextTier();
      this.dropCooldown = 0.35;
    }

    mergeBalls(first, second) {
      const nextTier = first.tier + 1;
      const tier = this.tiers[nextTier];
      const merged = {
        id: this.nextId++,
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
        vx: (first.vx + second.vx) * 0.25,
        vy: Math.min(first.vy, second.vy) - 65,
        tier: nextTier,
        radius: tier.radius,
      };
      this.balls = this.balls.filter((ball) => ball !== first && ball !== second);
      this.balls.push(merged);
      const points = 25 * 2 ** nextTier;
      this.score += points;
      this.hub.store.setRecord("collapse", this.score);
      const reward = Math.max(1, Math.round(nextTier * (this.difficultyScale?.reward ?? 1)));
      this.hub.store.award(reward, `${tier.name} fusionné`);
      for (let index = 0; index < 13; index += 1) {
        this.particles.push(new Particle(merged.x, merged.y, tier.color, { gravity: 120 }));
      }
    }

    solvePhysics(delta) {
      const subSteps = 3;
      const step = delta / subSteps;
      for (let subStep = 0; subStep < subSteps; subStep += 1) {
        for (const ball of this.balls) {
          ball.vy += 920 * step;
          ball.x += ball.vx * step;
          ball.y += ball.vy * step;
          ball.vx *= 0.997;

          if (ball.x - ball.radius < this.container.left) {
            ball.x = this.container.left + ball.radius;
            ball.vx = Math.abs(ball.vx) * 0.36;
          }
          if (ball.x + ball.radius > this.container.right) {
            ball.x = this.container.right - ball.radius;
            ball.vx = -Math.abs(ball.vx) * 0.36;
          }
          if (ball.y + ball.radius > this.container.floor) {
            ball.y = this.container.floor - ball.radius;
            ball.vy = -Math.abs(ball.vy) * 0.24;
            if (Math.abs(ball.vy) < 24) ball.vy = 0;
            ball.vx *= 0.92;
          }
        }

        let mergePair = null;
        for (let firstIndex = 0; firstIndex < this.balls.length; firstIndex += 1) {
          for (let secondIndex = firstIndex + 1; secondIndex < this.balls.length; secondIndex += 1) {
            const first = this.balls[firstIndex];
            const second = this.balls[secondIndex];
            const dx = second.x - first.x;
            const dy = second.y - first.y;
            const length = Math.hypot(dx, dy) || 0.001;
            const overlap = first.radius + second.radius - length;
            if (overlap <= 0) continue;

            if (first.tier === second.tier && first.tier < this.tiers.length - 1) {
              mergePair = [first, second];
              break;
            }

            const normalX = dx / length;
            const normalY = dy / length;
            first.x -= normalX * overlap * 0.5;
            first.y -= normalY * overlap * 0.5;
            second.x += normalX * overlap * 0.5;
            second.y += normalY * overlap * 0.5;
            const relativeVelocity =
              (second.vx - first.vx) * normalX + (second.vy - first.vy) * normalY;
            if (relativeVelocity < 0) {
              const impulse = -relativeVelocity * 0.52;
              first.vx -= impulse * normalX;
              first.vy -= impulse * normalY;
              second.vx += impulse * normalX;
              second.vy += impulse * normalY;
            }
          }
          if (mergePair) break;
        }
        if (mergePair) this.mergeBalls(mergePair[0], mergePair[1]);
      }
    }

    update(delta) {
      this.dropCooldown = Math.max(0, this.dropCooldown - delta);
      if (this.status === "playing") {
        this.solvePhysics(delta);
        if (this.mode === "nova") this.novaScore += delta * (34 + Math.random() * 14);
        const danger = this.balls.some(
          (ball) => ball.y - ball.radius < this.container.top + 23 && Math.abs(ball.vy) < 48,
        );
        this.dangerTime = danger ? this.dangerTime + delta : Math.max(0, this.dangerTime - delta * 2);
        if (this.dangerTime > 2.1) {
          this.status = "over";
          this.hub.store.setRecord("collapse", this.score);
          this.resolveRunEnd();
        }
      }
      this.updateParticles(delta);
    }

    resolveRunEnd() {
      if (this.duoStage === "p1") {
        this.p1Score = this.score;
        this.duelMessage = "Tour du Joueur 1 terminé — au tour du Joueur 2 !";
        this.pendingDuoStart = { duoStage: "p2", keepItems: true };
        return;
      }
      const reward = Math.round(
        Math.max(10, this.score * 0.08) * (this.difficultyScale?.reward ?? 1),
      );
      if (this.duoStage === "p2") {
        const winner = this.score >= this.p1Score ? "Joueur 2" : "Joueur 1";
        this.duelMessage = `${winner} remporte le duel ! (J1 : ${formatNumber(this.p1Score)} • J2 : ${formatNumber(this.score)})`;
        this.hub.store.award(reward, "Crop Collapse — Duel");
      } else if (this.mode === "nova") {
        const won = this.score >= this.novaScore;
        this.duelMessage = won
          ? `Tu devances Nova (${formatNumber(this.novaScore)} pts) !`
          : `Nova l'emporte avec ${formatNumber(this.novaScore)} pts.`;
        this.hub.store.award(won ? Math.round(reward * 1.25) : reward, "Crop Collapse");
      } else {
        this.duelMessage = null;
        this.hub.store.award(reward, "Crop Collapse");
      }
      this.duoStage = null;
    }

    pointerMove(point) {
      this.previewX = clamp(point.x, this.container.left + 20, this.container.right - 20);
    }

    pointerDown(point) {
      if (this.status === "over") {
        if (this.pendingDuoStart) {
          const next = this.pendingDuoStart;
          this.pendingDuoStart = null;
          this.reset(next);
        } else {
          this.reset();
        }
        return;
      }
      if (point.x >= this.container.left - 20 && point.x <= this.container.right + 20) {
        this.previewX = point.x;
        this.spawnBall(point.x);
      }
    }

    keyDown(event) {
      if (event.key === "ArrowLeft") this.previewX -= 26;
      if (event.key === "ArrowRight") this.previewX += 26;
      this.previewX = clamp(this.previewX, this.container.left + 20, this.container.right - 20);
      if (event.code === "Space" || event.key === "ArrowDown") {
        event.preventDefault();
        this.spawnBall(this.previewX);
      }
      if (event.key.toLowerCase() === "r") this.reset();
    }

    drawCrop(context, x, y, tierIndex, alpha = 1) {
      const tier = this.tiers[tierIndex];
      context.save();
      context.globalAlpha = alpha;
      context.shadowColor = tier.color;
      context.shadowBlur = 13;
      const gradient = context.createRadialGradient(
        x - tier.radius * 0.3,
        y - tier.radius * 0.35,
        2,
        x,
        y,
        tier.radius,
      );
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.13, tier.color);
      gradient.addColorStop(1, hexToRgba(tier.color, 0.67));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, tier.radius, 0, TAU);
      context.fill();
      context.strokeStyle = hexToRgba("#ffffff", 0.28);
      context.lineWidth = 2;
      context.stroke();
      this.label(context, tier.icon, x, y + 1, {
        align: "center",
        baseline: "middle",
        color: hexToRgba("#07100c", 0.65),
        size: Math.max(11, tier.radius * 0.65),
        weight: 900,
      });
      context.restore();
    }

    draw(context) {
      this.drawBackdrop(context, 480, 290);
      const palette = this.palette;
      this.label(context, "CUVE DE FUSION", 35, 42, { color: palette.accent, size: 10, weight: 850 });
      this.label(context, `Score ${formatNumber(this.score)}`, 35, 70, { size: 22, weight: 900 });
      this.label(
        context,
        `Record ${formatNumber(this.hub.store.data.records.collapse)}`,
        35,
        92,
        { color: palette.muted, size: 10, weight: 650 },
      );
      if (this.mode === "nova") {
        this.label(context, `Nova ${formatNumber(this.novaScore)}`, 35, 112, {
          color: palette.hot,
          size: 10,
          weight: 750,
        });
      } else if (this.duoStage) {
        this.label(
          context,
          this.duoStage === "p1" ? "Tour : Joueur 1" : `Tour : Joueur 2 (J1 : ${formatNumber(this.p1Score)})`,
          35,
          112,
          { color: palette.hot, size: 10, weight: 750 },
        );
      }

      this.panel(context, 826, 35, 100, 104);
      this.label(context, "SUIVANT", 876, 56, {
        align: "center",
        color: palette.muted,
        size: 8,
        weight: 850,
      });
      this.drawCrop(context, 876, 96, this.nextTier);

      context.fillStyle = hexToRgba(palette.panelSoft, 0.62);
      context.fillRect(
        this.container.left,
        this.container.top,
        this.container.right - this.container.left,
        this.container.floor - this.container.top,
      );

      context.strokeStyle = hexToRgba(palette.accent, 0.58);
      context.lineWidth = 5;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(this.container.left, this.container.top);
      context.lineTo(this.container.left, this.container.floor);
      context.lineTo(this.container.right, this.container.floor);
      context.lineTo(this.container.right, this.container.top);
      context.stroke();

      context.setLineDash([10, 9]);
      context.strokeStyle =
        this.dangerTime > 0.2 ? hexToRgba(palette.danger, 0.82) : hexToRgba(palette.hot, 0.28);
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(this.container.left + 4, this.container.top + 25);
      context.lineTo(this.container.right - 4, this.container.top + 25);
      context.stroke();
      context.setLineDash([]);

      if (this.status === "playing" && this.dropCooldown <= 0) {
        context.setLineDash([5, 8]);
        context.strokeStyle = hexToRgba(palette.accent, 0.35);
        context.beginPath();
        context.moveTo(this.previewX, 28);
        context.lineTo(this.previewX, this.container.top + 15);
        context.stroke();
        context.setLineDash([]);
        this.drawCrop(context, this.previewX, 48, this.nextTier, 0.55);
      }

      for (const ball of this.balls) this.drawCrop(context, ball.x, ball.y, ball.tier);
      this.drawParticles(context);

      const legendY = 574;
      this.tiers.forEach((tier, index) => {
        const x = 240 + index * 96;
        context.fillStyle = tier.color;
        context.beginPath();
        context.arc(x, legendY, 7, 0, TAU);
        context.fill();
        this.label(context, tier.name, x + 12, legendY + 3, {
          color: palette.muted,
          size: 8,
          weight: 650,
        });
      });

      if (this.status === "over") {
        context.fillStyle = "rgba(3, 8, 6, 0.82)";
        context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        this.label(context, this.pendingDuoStart ? "TOUR TERMINÉ" : "CUVE SATURÉE", 480, 241, {
          align: "center",
          color: palette.danger,
          size: 11,
          weight: 850,
        });
        this.label(context, formatNumber(this.score), 480, 298, {
          align: "center",
          color: palette.text,
          size: 52,
          weight: 900,
        });
        this.label(context, "points", 480, 324, {
          align: "center",
          color: palette.muted,
          size: 11,
        });
        if (this.duelMessage) {
          this.label(context, this.duelMessage, 480, 344, {
            align: "center",
            color: palette.hot,
            size: 10,
            weight: 750,
          });
        }
        this.button(
          context,
          { x: 390, y: 360, width: 180, height: 45 },
          this.pendingDuoStart ? "TOUR DU JOUEUR 2" : "RECOMMENCER",
        );
      }
    }
  }

  class CanopyRunner extends BaseGame {
    constructor(hub) {
      super(hub);
      this.reset();
    }

    reset() {
      this.status = "idle";
      this.ground = 465;
      this.player = { x: 155, y: this.ground, vy: 0, duck: 0, falling: false };
      this.obstacles = [];
      this.collectibles = [];
      this.difficultyScale = this.hub.store.difficultyOf("runner");
      this.speed = 310 * this.difficultyScale.speed;
      this.rampRate = this.hub.store.consumeItem("slowTime") ? 4.2 : 7.4 * this.difficultyScale.speed;
      if (this.rampRate === 4.2) this.hub.toast("Chrono Ralenti", "Montée en vitesse ralentie");
      this.distance = 0;
      this.spawnTimer = 1.5;
      this.sceneryOffset = 0;
      this.lastMilestone = 0;
      this.shields = this.hub.store.consumeItem("shield") ? 1 : 0;
      if (this.shields) this.hub.toast("Bouclier Renforcé", "Absorbe une collision");
      this.reviveAvailable = this.hub.store.consumeItem("revive");
      if (this.reviveAvailable) this.hub.toast("Jeton de Résurrection", "Disponible pour cette run");
    }

    start() {
      if (this.status === "over") this.reset();
      this.status = "running";
    }

    jump() {
      if (this.status !== "running") {
        this.start();
        return;
      }
      if (this.player.y >= this.ground - 1 && !this.player.falling) {
        this.player.vy = -650;
        for (let index = 0; index < 7; index += 1) {
          this.particles.push(
            new Particle(this.player.x, this.ground - 5, this.palette.accent, {
              vx: random(-90, 25),
              vy: random(-100, -20),
              gravity: 240,
              size: random(2, 5),
            }),
          );
        }
      }
    }

    duck() {
      if (this.status !== "running") {
        this.start();
        return;
      }
      this.player.duck = 0.72;
    }

    spawnObstacle() {
      const roll = Math.random();
      const type = roll < 0.48 ? "rock" : roll < 0.8 ? "branch" : "gap";
      const obstacle = {
        type,
        x: LOGICAL_WIDTH + 80,
        width: type === "gap" ? random(100, 135) : type === "branch" ? 105 : random(42, 58),
        height: type === "rock" ? random(42, 58) : 42,
      };
      this.obstacles.push(obstacle);
      if (type !== "gap" && Math.random() < 0.72) {
        this.collectibles.push({
          x: obstacle.x + obstacle.width / 2,
          y: type === "rock" ? this.ground - 122 : this.ground - 150,
          collected: false,
          phase: Math.random() * TAU,
        });
      }
      this.spawnTimer = random(1.05, 1.62) * (310 / this.speed);
    }

    gameOver() {
      if (this.status !== "running") return;
      if (this.shields > 0) {
        this.shields -= 1;
        this.player.y = this.ground;
        this.player.vy = -420;
        this.hub.toast("Bouclier Renforcé", "A absorbé le choc !");
        return;
      }
      if (this.reviveAvailable) {
        this.reviveAvailable = false;
        this.player.y = this.ground;
        this.player.vy = -420;
        this.speed = Math.max(310 * this.difficultyScale.speed, this.speed * 0.7);
        this.hub.toast("Jeton de Résurrection", "Tu repars de plus belle !");
        return;
      }
      this.status = "over";
      this.hub.store.setRecord("runner", this.distance);
      const reward = Math.round(Math.max(5, this.distance * 0.01) * (this.difficultyScale?.reward ?? 1));
      this.hub.store.award(reward, "Canopy Runner");
    }

    playerBounds() {
      const ducking = this.player.duck > 0;
      const height = ducking ? 34 : 70;
      return { x: this.player.x - 19, y: this.player.y - height, width: 38, height };
    }

    update(delta) {
      this.updateParticles(delta);
      if (this.status !== "running") return;

      this.speed = Math.min(610 * this.difficultyScale.speed, this.speed + delta * this.rampRate);
      this.distance += this.speed * delta * 0.1;
      this.sceneryOffset = (this.sceneryOffset + this.speed * delta) % 960;
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) this.spawnObstacle();

      for (const obstacle of this.obstacles) obstacle.x -= this.speed * delta;
      for (const collectible of this.collectibles) {
        collectible.x -= this.speed * delta;
        collectible.phase += delta * 4;
      }
      this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -50);
      this.collectibles = this.collectibles.filter(
        (collectible) => !collectible.collected && collectible.x > -40,
      );

      this.player.duck = Math.max(0, this.player.duck - delta);
      const overGap = this.obstacles.some(
        (obstacle) =>
          obstacle.type === "gap" &&
          this.player.x + 16 > obstacle.x &&
          this.player.x - 16 < obstacle.x + obstacle.width,
      );

      this.player.vy += 1700 * delta;
      this.player.y += this.player.vy * delta;
      if (!overGap && this.player.y >= this.ground) {
        this.player.y = this.ground;
        this.player.vy = 0;
        this.player.falling = false;
      } else if (overGap && this.player.y >= this.ground - 2) {
        this.player.falling = true;
      }

      if (this.player.y > LOGICAL_HEIGHT + 60) this.gameOver();

      const bounds = this.playerBounds();
      for (const obstacle of this.obstacles) {
        if (obstacle.type === "gap") continue;
        const obstacleBounds =
          obstacle.type === "rock"
            ? {
                x: obstacle.x + 4,
                y: this.ground - obstacle.height,
                width: obstacle.width - 8,
                height: obstacle.height,
              }
            : {
                x: obstacle.x,
                y: this.ground - 91,
                width: obstacle.width,
                height: 42,
              };
        if (
          bounds.x < obstacleBounds.x + obstacleBounds.width &&
          bounds.x + bounds.width > obstacleBounds.x &&
          bounds.y < obstacleBounds.y + obstacleBounds.height &&
          bounds.y + bounds.height > obstacleBounds.y
        ) {
          this.gameOver();
        }
      }

      for (const collectible of this.collectibles) {
        if (
          Math.hypot(this.player.x - collectible.x, this.player.y - 42 - collectible.y) < 38
        ) {
          collectible.collected = true;
          this.hub.store.award(1, "Nova Coin récupérée");
        }
      }

      const milestone = Math.floor(this.distance / 1000);
      if (milestone > this.lastMilestone) {
        this.lastMilestone = milestone;
        this.hub.store.award(3, "Kilomètre sous la canopée");
      }
    }

    pointerDown(point) {
      if (point.y > 490) {
        if (point.x < LOGICAL_WIDTH / 2) this.jump();
        else this.duck();
      }
    }

    pointerUp(_point, gesture) {
      if (gesture.startY > 490) return;
      if (gesture.dy > 40) this.duck();
      else this.jump();
    }

    keyDown(event) {
      if (["ArrowUp", " ", "w", "z"].includes(event.key)) {
        event.preventDefault();
        this.jump();
      }
      if (["ArrowDown", "s"].includes(event.key)) {
        event.preventDefault();
        this.duck();
      }
      if (event.key.toLowerCase() === "r" && this.status === "over") this.reset();
    }

    drawRunner(context) {
      const palette = this.palette;
      const bounds = this.playerBounds();
      context.save();
      context.translate(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      const runningPhase = this.distance * 0.22;
      const ducking = this.player.duck > 0;
      context.lineCap = "round";

      const legSwing = ducking ? 10 : Math.sin(runningPhase) * 12;

      // Jambes (pantalon).
      context.strokeStyle = "#17251c";
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(ducking ? 13 : 0, bounds.height * 0.11);
      context.lineTo(-10 + legSwing, bounds.height * 0.39);
      context.moveTo(ducking ? 13 : 0, bounds.height * 0.11);
      context.lineTo(11 - legSwing, bounds.height * 0.39);
      context.stroke();

      // Torse habillé (débardeur/veste de coureur).
      context.shadowColor = palette.accent;
      context.shadowBlur = 10;
      context.fillStyle = palette.accent2;
      context.strokeStyle = hexToRgba("#ffffff", 0.2);
      context.lineWidth = 1;
      roundedRect(
        context,
        -8,
        -bounds.height * 0.19,
        16,
        bounds.height * 0.3,
        6,
      );
      context.fill();
      context.stroke();

      // Bras.
      context.shadowBlur = 8;
      context.strokeStyle = palette.text;
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(0, -bounds.height * 0.06);
      context.lineTo(-13 - legSwing * 0.45, bounds.height * 0.06);
      context.moveTo(0, -bounds.height * 0.06);
      context.lineTo(15 + legSwing * 0.45, bounds.height * 0.02);
      context.stroke();

      // Tête (peau visible) + bandeau.
      context.shadowBlur = 6;
      context.fillStyle = "#e3b48a";
      context.beginPath();
      context.arc(0, -bounds.height * 0.32, ducking ? 9 : 11, 0, TAU);
      context.fill();
      context.strokeStyle = hexToRgba("#000000", 0.22);
      context.lineWidth = 1.5;
      context.stroke();
      context.strokeStyle = palette.hot;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(0, -bounds.height * 0.32, (ducking ? 9 : 11) + 1, -2.6, -0.5);
      context.stroke();
      context.restore();
    }

    draw(context) {
      this.drawBackdrop(context, 670, 270);
      const palette = this.palette;

      const sky = context.createLinearGradient(0, 0, 0, this.ground);
      sky.addColorStop(0, hexToRgba(palette.accent2, 0.08));
      sky.addColorStop(1, hexToRgba(palette.background, 0));
      context.fillStyle = sky;
      context.fillRect(0, 0, LOGICAL_WIDTH, this.ground);

      for (let layer = 0; layer < 3; layer += 1) {
        const speedFactor = 0.18 + layer * 0.19;
        const spacing = 150 - layer * 14;
        const offset = -(this.sceneryOffset * speedFactor) % spacing;
        context.fillStyle = hexToRgba(
          layer === 2 ? palette.accent : palette.accent2,
          0.045 + layer * 0.035,
        );
        for (let x = offset - spacing; x < LOGICAL_WIDTH + spacing; x += spacing) {
          const height = 150 + layer * 40 + ((x * 7) % 45);
          context.beginPath();
          context.moveTo(x, this.ground);
          context.lineTo(x + spacing * 0.45, this.ground - height);
          context.lineTo(x + spacing, this.ground);
          context.closePath();
          context.fill();
        }
      }

      context.fillStyle = palette.panelSoft;
      context.fillRect(0, this.ground, LOGICAL_WIDTH, LOGICAL_HEIGHT - this.ground);
      context.fillStyle = hexToRgba(palette.accent, 0.17);
      context.fillRect(0, this.ground, LOGICAL_WIDTH, 5);

      for (const obstacle of this.obstacles) {
        if (obstacle.type === "gap") {
          context.fillStyle = palette.background;
          context.fillRect(obstacle.x, this.ground - 3, obstacle.width, 140);
          context.strokeStyle = hexToRgba(palette.danger, 0.25);
          context.beginPath();
          context.moveTo(obstacle.x, this.ground);
          context.lineTo(obstacle.x + 18, this.ground + 55);
          context.moveTo(obstacle.x + obstacle.width, this.ground);
          context.lineTo(obstacle.x + obstacle.width - 18, this.ground + 55);
          context.stroke();
        } else if (obstacle.type === "rock") {
          const gradient = context.createLinearGradient(
            obstacle.x,
            this.ground - obstacle.height,
            obstacle.x + obstacle.width,
            this.ground,
          );
          gradient.addColorStop(0, "#85947e");
          gradient.addColorStop(1, "#39473e");
          context.fillStyle = gradient;
          context.beginPath();
          context.moveTo(obstacle.x, this.ground);
          context.lineTo(obstacle.x + 7, this.ground - obstacle.height * 0.67);
          context.lineTo(obstacle.x + obstacle.width * 0.55, this.ground - obstacle.height);
          context.lineTo(obstacle.x + obstacle.width, this.ground - obstacle.height * 0.3);
          context.lineTo(obstacle.x + obstacle.width, this.ground);
          context.closePath();
          context.fill();
        } else {
          context.strokeStyle = "#6b4e2e";
          context.lineWidth = 13;
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(obstacle.x, this.ground - 66);
          context.lineTo(obstacle.x + obstacle.width, this.ground - 72);
          context.stroke();
          context.fillStyle = palette.accent;
          for (let index = 0; index < 4; index += 1) {
            context.beginPath();
            context.ellipse(
              obstacle.x + 18 + index * 25,
              this.ground - 87 + (index % 2) * 8,
              18,
              8,
              index % 2 ? -0.5 : 0.5,
              0,
              TAU,
            );
            context.fill();
          }
        }
      }

      for (const collectible of this.collectibles) {
        context.save();
        context.translate(collectible.x, collectible.y + Math.sin(collectible.phase) * 6);
        context.shadowColor = palette.hot;
        context.shadowBlur = 14;
        context.fillStyle = palette.hot;
        context.beginPath();
        context.arc(0, 0, 13, 0, TAU);
        context.fill();
        this.label(context, "N", 0, 1, {
          align: "center",
          baseline: "middle",
          color: "#493000",
          size: 10,
          weight: 900,
        });
        context.restore();
      }

      this.drawRunner(context);
      this.drawParticles(context);

      this.panel(context, 24, 22, 157, 63);
      this.label(context, "DISTANCE", 40, 43, { color: palette.muted, size: 8, weight: 850 });
      this.label(context, `${formatNumber(this.distance)} m`, 40, 70, { size: 23, weight: 900 });
      this.panel(context, 192, 22, 145, 63);
      this.label(context, "VITESSE", 208, 43, { color: palette.muted, size: 8, weight: 850 });
      this.label(context, `${Math.round(this.speed)} u/s`, 208, 70, {
        color: palette.accent,
        size: 18,
        weight: 850,
      });
      this.label(
        context,
        `Record ${formatNumber(this.hub.store.data.records.runner)} m`,
        930,
        48,
        { align: "right", color: palette.muted, size: 10, weight: 700 },
      );

      this.button(context, { x: 26, y: 522, width: 170, height: 51 }, "↑ SAUTER", {
        secondary: true,
      });
      this.button(context, { x: 764, y: 522, width: 170, height: 51 }, "↓ SE BAISSER", {
        secondary: true,
      });

      if (this.status !== "running") {
        context.fillStyle = "rgba(3, 8, 6, 0.72)";
        context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        this.label(context, this.status === "over" ? "COURSE TERMINÉE" : "LA CANOPÉE T'ATTEND", 480, 225, {
          align: "center",
          color: this.status === "over" ? palette.danger : palette.accent,
          size: 11,
          weight: 850,
        });
        this.label(
          context,
          this.status === "over" ? `${formatNumber(this.distance)} mètres` : "Canopy Runner",
          480,
          285,
          { align: "center", size: 46, weight: 900 },
        );
        this.label(
          context,
          "Espace / ↑ pour sauter • ↓ pour glisser",
          480,
          320,
          { align: "center", color: palette.muted, size: 11, weight: 600 },
        );
        this.button(
          context,
          { x: 382, y: 356, width: 196, height: 47 },
          this.status === "over" ? "REPARTIR" : "COMMENCER",
        );
      }
    }
  }

  class ChromaSort extends BaseGame {
    constructor(hub) {
      super(hub);
      this.columns = 8;
      this.rows = 10;
      this.cell = 44;
      this.boardX = 273;
      this.boardY = 48;
      this.colors = ["#59e49d", "#8f79ff", "#ff6d88", "#ffc957", "#4dd7ee"];
      this.controls = [
        { action: "left", label: "←", x: 250, y: 520, width: 92, height: 49 },
        { action: "rotate", label: "↻", x: 351, y: 520, width: 92, height: 49 },
        { action: "down", label: "↓", x: 452, y: 520, width: 92, height: 49 },
        { action: "right", label: "→", x: 553, y: 520, width: 92, height: 49 },
      ];
      this.reset();
    }

    reset(options = {}) {
      this.grid = Array.from({ length: this.rows }, () => Array(this.columns).fill(null));
      this.active = null;
      this.nextColors = [this.randomColor(), this.randomColor()];
      this.dropTimer = 0;
      this.difficultyScale = this.hub.store.difficultyOf("chroma");
      this.dropInterval = clamp(0.68 / this.difficultyScale.speed, 0.22, 1.1);
      this.score = 0;
      this.combo = 0;
      this.status = "playing";
      this.mode = this.hub.store.modeOf("chroma");
      this.duoStage = options.duoStage || (this.mode === "duo" ? "p1" : null);
      this.novaScore = 0;
      this.duelMessage = null;
      this.spawnPair();
    }

    randomColor() {
      return Math.floor(Math.random() * this.colors.length);
    }

    cellsFor(pair = this.active) {
      if (!pair) return [];
      const vectors = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ];
      const vector = vectors[pair.orientation];
      return [
        { x: pair.x, y: pair.y, color: pair.colors[0] },
        { x: pair.x + vector[0], y: pair.y + vector[1], color: pair.colors[1] },
      ];
    }

    canPlace(pair) {
      return this.cellsFor(pair).every(
        (cell) =>
          cell.x >= 0 &&
          cell.x < this.columns &&
          cell.y < this.rows &&
          (cell.y < 0 || this.grid[cell.y][cell.x] === null),
      );
    }

    spawnPair() {
      this.active = {
        x: 3,
        y: 0,
        orientation: 0,
        colors: this.nextColors,
      };
      this.nextColors = [this.randomColor(), this.randomColor()];
      this.dropTimer = 0;
      if (!this.canPlace(this.active)) this.status = "over";
    }

    move(horizontal) {
      if (this.status !== "playing") return;
      const candidate = { ...this.active, x: this.active.x + horizontal };
      if (this.canPlace(candidate)) this.active = candidate;
    }

    rotate() {
      if (this.status !== "playing") return;
      const candidate = { ...this.active, orientation: (this.active.orientation + 1) % 4 };
      if (this.canPlace(candidate)) {
        this.active = candidate;
        return;
      }
      for (const nudge of [-1, 1]) {
        const nudged = { ...candidate, x: candidate.x + nudge };
        if (this.canPlace(nudged)) {
          this.active = nudged;
          return;
        }
      }
    }

    stepDown() {
      if (this.status !== "playing") return;
      const candidate = { ...this.active, y: this.active.y + 1 };
      if (this.canPlace(candidate)) {
        this.active = candidate;
      } else {
        this.lockPair();
      }
    }

    hardDrop() {
      if (this.status !== "playing") return;
      let candidate = { ...this.active };
      while (this.canPlace({ ...candidate, y: candidate.y + 1 })) candidate.y += 1;
      this.active = candidate;
      this.lockPair();
    }

    lockPair() {
      const cells = this.cellsFor();
      if (cells.some((cell) => cell.y < 0)) {
        this.status = "over";
        this.hub.store.setRecord("chroma", this.score);
        this.resolveRunEnd();
        return;
      }
      for (const cell of cells) this.grid[cell.y][cell.x] = cell.color;
      this.resolveClusters();
      this.spawnPair();
    }

    resolveRunEnd() {
      if (this.duoStage === "p1") {
        this.p1Score = this.score;
        this.duelMessage = "Tour du Joueur 1 terminé — au tour du Joueur 2 !";
        this.pendingDuoStart = { duoStage: "p2", keepItems: true };
        return;
      }
      const reward = Math.round(Math.max(8, this.score * 0.03) * (this.difficultyScale?.reward ?? 1));
      if (this.duoStage === "p2") {
        const winner = this.score >= this.p1Score ? "Joueur 2" : "Joueur 1";
        this.duelMessage = `${winner} remporte le duel ! (J1 : ${formatNumber(this.p1Score)} • J2 : ${formatNumber(this.score)})`;
        this.hub.store.award(reward, "Chroma Sort — Duel");
      } else if (this.mode === "nova") {
        const won = this.score >= this.novaScore;
        this.duelMessage = won
          ? `Tu devances Nova (${formatNumber(this.novaScore)} pts) !`
          : `Nova l'emporte avec ${formatNumber(this.novaScore)} pts.`;
        this.hub.store.award(won ? Math.round(reward * 1.25) : reward, "Chroma Sort");
      } else {
        this.hub.store.award(reward, "Chroma Sort");
      }
      this.duoStage = null;
    }

    findClusters() {
      const visited = new Set();
      const groups = [];
      for (let row = 0; row < this.rows; row += 1) {
        for (let column = 0; column < this.columns; column += 1) {
          const color = this.grid[row][column];
          const key = `${column}:${row}`;
          if (color === null || visited.has(key)) continue;
          const queue = [{ x: column, y: row }];
          const group = [];
          visited.add(key);
          while (queue.length) {
            const current = queue.shift();
            group.push(current);
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]) {
              const x = current.x + dx;
              const y = current.y + dy;
              const nextKey = `${x}:${y}`;
              if (
                x >= 0 &&
                x < this.columns &&
                y >= 0 &&
                y < this.rows &&
                !visited.has(nextKey) &&
                this.grid[y][x] === color
              ) {
                visited.add(nextKey);
                queue.push({ x, y });
              }
            }
          }
          if (group.length >= 4) groups.push(group);
        }
      }
      return groups;
    }

    applyGravity() {
      for (let column = 0; column < this.columns; column += 1) {
        const values = [];
        for (let row = this.rows - 1; row >= 0; row -= 1) {
          if (this.grid[row][column] !== null) values.push(this.grid[row][column]);
        }
        for (let row = this.rows - 1; row >= 0; row -= 1) {
          this.grid[row][column] = values[this.rows - 1 - row] ?? null;
        }
      }
    }

    resolveClusters() {
      this.combo = 0;
      let groups = this.findClusters();
      while (groups.length) {
        this.combo += 1;
        let cleared = 0;
        for (const group of groups) {
          for (const cell of group) {
            const color = this.colors[this.grid[cell.y][cell.x]];
            this.grid[cell.y][cell.x] = null;
            cleared += 1;
            for (let index = 0; index < 3; index += 1) {
              this.particles.push(
                new Particle(
                  this.boardX + cell.x * this.cell + this.cell / 2,
                  this.boardY + cell.y * this.cell + this.cell / 2,
                  color,
                  { gravity: 80, size: random(2, 5) },
                ),
              );
            }
          }
        }
        const gained = cleared * 12 * this.combo;
        this.score += gained;
        const reward = Math.max(1, Math.round(Math.floor(cleared / 4) * this.combo * (this.difficultyScale?.reward ?? 1)));
        this.hub.store.award(reward, `Combo chromatique x${this.combo}`);
        this.applyGravity();
        groups = this.findClusters();
      }
      this.hub.store.setRecord("chroma", this.score);
    }

    update(delta) {
      this.updateParticles(delta);
      if (this.status !== "playing") {
        return;
      }
      if (this.mode === "nova") this.novaScore += delta * (24 + Math.random() * 10);
      this.dropTimer += delta;
      if (this.dropTimer >= this.dropInterval) {
        this.dropTimer = 0;
        this.stepDown();
      }
    }

    restart() {
      if (this.pendingDuoStart) {
        const next = this.pendingDuoStart;
        this.pendingDuoStart = null;
        this.reset(next);
      } else {
        this.reset();
      }
    }

    perform(action) {
      if (this.status === "over") {
        this.restart();
        return;
      }
      if (action === "left") this.move(-1);
      if (action === "right") this.move(1);
      if (action === "rotate") this.rotate();
      if (action === "down") this.hardDrop();
    }

    pointerDown(point) {
      const control = this.controls.find((item) => hitRect(point, item));
      if (control) this.perform(control.action);
      else if (this.status === "over") this.restart();
    }

    pointerUp(_point, gesture) {
      if (gesture.startY > 500) return;
      if (Math.abs(gesture.dx) > 45 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
        this.move(gesture.dx > 0 ? 1 : -1);
      } else if (gesture.dy > 55) {
        this.hardDrop();
      } else if (Math.abs(gesture.dx) < 18 && Math.abs(gesture.dy) < 18) {
        this.rotate();
      }
    }

    keyDown(event) {
      if (event.key === "ArrowLeft") this.move(-1);
      if (event.key === "ArrowRight") this.move(1);
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "x") this.rotate();
      if (event.key === "ArrowDown") this.stepDown();
      if (event.code === "Space") this.hardDrop();
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
        event.preventDefault();
      }
    }

    drawNode(context, x, y, colorIndex, radius = 18) {
      const color = this.colors[colorIndex];
      context.save();
      context.shadowColor = color;
      context.shadowBlur = 12;
      const gradient = context.createRadialGradient(x - 5, y - 6, 2, x, y, radius);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.18, color);
      gradient.addColorStop(1, hexToRgba(color, 0.55));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, TAU);
      context.fill();
      context.strokeStyle = hexToRgba("#ffffff", 0.24);
      context.stroke();
      context.restore();
    }

    draw(context) {
      this.drawBackdrop(context, 450, 260);
      const palette = this.palette;

      if (this.mode === "nova") {
        this.label(context, `Nova ${formatNumber(this.novaScore)} pts`, 480, 22, {
          align: "center",
          color: palette.hot,
          size: 10,
          weight: 750,
        });
      } else if (this.duoStage) {
        this.label(
          context,
          this.duoStage === "p1" ? "Tour : Joueur 1" : `Tour : Joueur 2 (J1 : ${formatNumber(this.p1Score)})`,
          480,
          22,
          { align: "center", color: palette.hot, size: 10, weight: 750 },
        );
      }

      this.panel(context, 31, 43, 201, 143);
      this.label(context, "RÉACTION CHROMA", 50, 69, {
        color: palette.accent,
        size: 9,
        weight: 850,
      });
      this.label(context, formatNumber(this.score), 50, 111, { size: 32, weight: 900 });
      this.label(context, "POINTS", 50, 132, { color: palette.muted, size: 8, weight: 850 });
      this.label(
        context,
        `Record ${formatNumber(this.hub.store.data.records.chroma)}`,
        50,
        163,
        { color: palette.muted, size: 10, weight: 650 },
      );

      this.panel(context, 31, 201, 201, 107);
      this.label(context, "PROCHAINE PAIRE", 50, 226, {
        color: palette.muted,
        size: 8,
        weight: 850,
      });
      this.drawNode(context, 94, 267, this.nextColors[0], 20);
      this.drawNode(context, 139, 267, this.nextColors[1], 20);

      this.panel(context, 31, 323, 201, 109);
      this.label(context, "COMBO", 50, 348, { color: palette.muted, size: 8, weight: 850 });
      this.label(context, `x${Math.max(1, this.combo)}`, 50, 391, {
        color: this.combo > 1 ? palette.hot : palette.text,
        size: 33,
        weight: 900,
      });

      roundedRect(
        context,
        this.boardX - 9,
        this.boardY - 9,
        this.columns * this.cell + 18,
        this.rows * this.cell + 18,
        17,
      );
      context.fillStyle = hexToRgba(palette.panel, 0.96);
      context.fill();
      context.strokeStyle = hexToRgba(palette.line, 0.7);
      context.stroke();

      for (let row = 0; row < this.rows; row += 1) {
        for (let column = 0; column < this.columns; column += 1) {
          const x = this.boardX + column * this.cell;
          const y = this.boardY + row * this.cell;
          roundedRect(context, x + 2, y + 2, this.cell - 4, this.cell - 4, 8);
          context.fillStyle = hexToRgba(palette.panelSoft, 0.47);
          context.fill();
          if (this.grid[row][column] !== null) {
            this.drawNode(
              context,
              x + this.cell / 2,
              y + this.cell / 2,
              this.grid[row][column],
              16,
            );
          }
        }
      }

      if (this.active && this.status === "playing") {
        for (const cell of this.cellsFor()) {
          if (cell.y < 0) continue;
          this.drawNode(
            context,
            this.boardX + cell.x * this.cell + this.cell / 2,
            this.boardY + cell.y * this.cell + this.cell / 2,
            cell.color,
            17,
          );
        }
      }

      this.panel(context, 686, 43, 242, 205);
      this.label(context, "RÈGLE DE RÉACTION", 707, 69, {
        color: palette.accent,
        size: 9,
        weight: 850,
      });
      this.label(context, "4+", 707, 119, { size: 39, weight: 900 });
      this.label(context, "noyaux connectés", 771, 115, {
        color: palette.muted,
        size: 11,
        weight: 650,
      });
      this.label(context, "Les réactions en chaîne", 707, 158, {
        color: palette.text,
        size: 11,
        weight: 750,
      });
      this.label(context, "multiplient les points et", 707, 179, {
        color: palette.muted,
        size: 10,
        weight: 550,
      });
      this.label(context, "les Nova Coins gagnées.", 707, 198, {
        color: palette.muted,
        size: 10,
        weight: 550,
      });

      this.controls.forEach((control) =>
        this.button(context, control, control.label, { secondary: true, size: 20 }),
      );
      this.drawParticles(context);

      if (this.status === "over") {
        context.fillStyle = "rgba(3, 7, 7, 0.82)";
        context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        this.label(context, this.pendingDuoStart ? "TOUR TERMINÉ" : "GRILLE SATURÉE", 480, 240, {
          align: "center",
          color: palette.danger,
          size: 11,
          weight: 850,
        });
        this.label(context, formatNumber(this.score), 480, 298, {
          align: "center",
          size: 50,
          weight: 900,
        });
        if (this.duelMessage) {
          this.label(context, this.duelMessage, 480, 322, {
            align: "center",
            color: palette.hot,
            size: 10,
            weight: 750,
          });
        }
        this.button(
          context,
          { x: 390, y: 350, width: 180, height: 46 },
          this.pendingDuoStart ? "TOUR DU JOUEUR 2" : "NOUVELLE GRILLE",
        );
      }
    }
  }

  class StickClash extends BaseGame {
    constructor(hub) {
      super(hub);
      this.unitDefinitions = {
        miner: {
          name: "Mineur",
          icon: "◆",
          baseCost: 30,
          upgradeCost: 85,
          hp: 55,
          speed: 33,
          damage: 5,
          range: 24,
          attackRate: 0.85,
          color: "#f4c95d",
        },
        archer: {
          name: "Archer",
          icon: "➶",
          baseCost: 55,
          upgradeCost: 125,
          hp: 42,
          speed: 38,
          damage: 10,
          range: 155,
          attackRate: 1.05,
          color: "#5ee0a0",
        },
        knight: {
          name: "Chevalier",
          icon: "⚔",
          baseCost: 85,
          upgradeCost: 175,
          hp: 125,
          speed: 29,
          damage: 18,
          range: 30,
          attackRate: 0.72,
          color: "#8a83ff",
        },
      };
      this.cardRects = Object.keys(this.unitDefinitions).map((type, index) => ({
        type,
        x: 19,
        y: 128 + index * 120,
        width: 220,
        height: 105,
      }));
      this.player2CardRects = ["raider", "scout", "brute"].map((type, index) => ({
        type,
        x: 721,
        y: 128 + index * 120,
        width: 220,
        height: 105,
      }));
      this.reset();
    }

    reset() {
      this.status = "playing";
      this.difficultyScale = this.hub.store.difficultyOf("clash");
      this.mode = this.hub.store.modeOf("clash");
      this.gold = 65;
      this.goldFraction = 0;
      this.player2Gold = 65;
      this.player2GoldFraction = 0;
      this.player2Levels = { raider: 1, scout: 1, brute: 1 };
      this.wave = 1;
      this.waveCooldown = 2;
      this.enemiesToSpawn = 0;
      this.enemySpawnTimer = 0;
      this.units = [];
      this.enemies = [];
      this.projectiles = [];
      this.baseHp = 500;
      this.baseMaxHp = 500;
      this.levels = { miner: 1, archer: 1, knight: 1 };
      this.nextId = 1;
      this.waveBanner = 2;
      if (this.hub.store.consumeItem("starterPack")) {
        this.gold += 80;
        this.hub.toast("Kit de Démarrage", "+80 or bonus");
      }
    }

    unitCost(type) {
      const definition = this.unitDefinitions[type];
      return Math.floor(definition.baseCost * (1 + (this.levels[type] - 1) * 0.18));
    }

    upgradeCost(type) {
      const definition = this.unitDefinitions[type];
      return Math.floor(definition.upgradeCost * 1.65 ** (this.levels[type] - 1));
    }

    deploy(type) {
      if (this.status !== "playing") {
        this.reset();
        return;
      }
      const cost = this.unitCost(type);
      if (this.gold < cost) {
        this.hub.toast("Or insuffisant", `${cost} or requis`);
        return;
      }
      this.gold -= cost;
      const definition = this.unitDefinitions[type];
      const level = this.levels[type];
      const maxHp = definition.hp * (1 + (level - 1) * 0.32);
      this.units.push({
        id: this.nextId++,
        type,
        x: 298 + random(-8, 8),
        y: 432 + random(-7, 7),
        hp: maxHp,
        maxHp,
        damage: definition.damage * (1 + (level - 1) * 0.38),
        speed: definition.speed,
        range: definition.range,
        attackRate: definition.attackRate,
        cooldown: random(0, 0.3),
        color: definition.color,
        dead: false,
      });
    }

    upgrade(type) {
      if (this.status !== "playing") return;
      const cost = this.upgradeCost(type);
      if (this.gold < cost) {
        this.hub.toast("Or insuffisant", `${cost} or requis`);
        return;
      }
      this.gold -= cost;
      this.levels[type] += 1;
      this.hub.toast(`${this.unitDefinitions[type].name} amélioré`, `Niveau ${this.levels[type]}`);
    }

    startWave() {
      this.enemiesToSpawn = 3 + this.wave * 2;
      this.enemySpawnTimer = 0;
      this.waveBanner = 1.8;
    }

    enemyBaseStats(type) {
      return type === "brute"
        ? { hp: 135, speed: 21, damage: 17, color: "#ff7c68", reward: 22, cost: 70 }
        : type === "scout"
          ? { hp: 48, speed: 46, damage: 8, color: "#ffcb63", reward: 12, cost: 35 }
          : { hp: 78, speed: 31, damage: 11, color: "#ff6d89", reward: 15, cost: 50 };
    }

    spawnEnemy() {
      const roll = Math.random();
      const type = roll < 0.55 ? "raider" : roll < 0.84 ? "scout" : "brute";
      const stats = this.enemyBaseStats(type);
      const spawnScale = this.difficultyScale?.spawn ?? 1;
      const scale = (1 + (this.wave - 1) * 0.13) * spawnScale;
      this.enemies.push({
        id: this.nextId++,
        type,
        x: 920 + random(0, 45),
        y: 432 + random(-7, 7),
        hp: stats.hp * scale,
        maxHp: stats.hp * scale,
        damage: stats.damage * scale,
        speed: stats.speed * Math.min(1.35, 1 + this.wave * 0.015) * Math.sqrt(spawnScale),
        range: 27,
        attackRate: type === "brute" ? 0.65 : 0.82,
        cooldown: 0,
        color: stats.color,
        reward: Math.round(stats.reward * scale),
        dead: false,
        rewarded: false,
      });
    }

    deployEnemyUnit(type) {
      if (this.status !== "playing" || this.mode !== "duo") return;
      const stats = this.enemyBaseStats(type);
      const level = this.player2Levels[type] || 1;
      const cost = Math.floor(stats.cost * (1 + (level - 1) * 0.2));
      if (this.player2Gold < cost) {
        this.hub.toast("Or (Joueur 2) insuffisant", `${cost} or requis`);
        return;
      }
      this.player2Gold -= cost;
      const maxHp = stats.hp * (1 + (level - 1) * 0.28);
      this.enemies.push({
        id: this.nextId++,
        type,
        x: 920 + random(0, 20),
        y: 432 + random(-7, 7),
        hp: maxHp,
        maxHp,
        damage: stats.damage * (1 + (level - 1) * 0.3),
        speed: stats.speed,
        range: 27,
        attackRate: type === "brute" ? 0.65 : 0.82,
        cooldown: 0,
        color: stats.color,
        reward: Math.round(stats.reward * 0.6),
        dead: false,
        rewarded: false,
      });
    }

    upgradeEnemyUnit(type) {
      if (this.mode !== "duo") return;
      const stats = this.enemyBaseStats(type);
      const level = this.player2Levels[type] || 1;
      const cost = Math.floor(stats.cost * 2.1 * 1.6 ** (level - 1));
      if (this.player2Gold < cost) {
        this.hub.toast("Or (Joueur 2) insuffisant", `${cost} or requis`);
        return;
      }
      this.player2Gold -= cost;
      this.player2Levels[type] += 1;
      this.hub.toast(`${type} (J2) amélioré`, `Niveau ${this.player2Levels[type]}`);
    }


    attack(attacker, target, isPlayer) {
      target.hp -= attacker.damage;
      attacker.cooldown = 1 / attacker.attackRate;
      if (attacker.type === "archer") {
        this.projectiles.push({
          x: attacker.x,
          y: attacker.y - 45,
          targetX: target.x,
          targetY: target.y - 35,
          life: 0.24,
          maxLife: 0.24,
          color: attacker.color,
        });
      }
      if (target.hp <= 0) target.dead = true;
      if (!isPlayer && target === this.baseTarget) this.baseHp = Math.max(0, this.baseHp);
    }

    updateArmy(delta) {
      const liveEnemies = () => this.enemies.filter((enemy) => !enemy.dead);
      const liveUnits = () => this.units.filter((unit) => !unit.dead);

      for (const unit of this.units) {
        if (unit.dead) continue;
        unit.cooldown -= delta;
        const targets = liveEnemies();
        const target = targets.reduce(
          (closest, enemy) =>
            !closest || Math.abs(enemy.x - unit.x) < Math.abs(closest.x - unit.x)
              ? enemy
              : closest,
          null,
        );
        if (target && target.x - unit.x <= unit.range) {
          if (unit.cooldown <= 0) this.attack(unit, target, true);
        } else {
          unit.x = Math.min(865, unit.x + unit.speed * delta);
        }
      }

      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        enemy.cooldown -= delta;
        const targets = liveUnits().filter((unit) => unit.x < enemy.x + 25);
        const target = targets.reduce(
          (closest, unit) =>
            !closest || Math.abs(enemy.x - unit.x) < Math.abs(enemy.x - closest.x)
              ? unit
              : closest,
          null,
        );
        if (target && enemy.x - target.x <= enemy.range) {
          if (enemy.cooldown <= 0) this.attack(enemy, target, false);
        } else if (enemy.x <= 287) {
          if (enemy.cooldown <= 0) {
            this.baseHp -= enemy.damage;
            enemy.cooldown = 1 / enemy.attackRate;
            for (let index = 0; index < 5; index += 1) {
              this.particles.push(
                new Particle(280, 405, this.palette.danger, { gravity: 160, size: 4 }),
              );
            }
          }
        } else {
          enemy.x -= enemy.speed * delta;
        }
      }

      for (const enemy of this.enemies) {
        if (enemy.dead && !enemy.rewarded) {
          enemy.rewarded = true;
          this.gold += enemy.reward;
          this.hub.store.award(Math.max(1, Math.round(this.difficultyScale?.reward ?? 1)), "Adversaire repoussé");
        }
      }
      this.units = this.units.filter((unit) => !unit.dead);
      this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    }

    update(delta) {
      this.updateParticles(delta);
      for (const projectile of this.projectiles) projectile.life -= delta;
      this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0);
      this.waveBanner = Math.max(0, this.waveBanner - delta);
      if (this.status !== "playing") return;

      const miners = this.units.filter((unit) => unit.type === "miner" && !unit.dead).length;
      this.goldFraction += (3 + miners * 1.45) * delta;
      if (this.goldFraction >= 1) {
        const whole = Math.floor(this.goldFraction);
        this.gold += whole;
        this.goldFraction -= whole;
      }

      if (this.mode !== "duo") {
        if (this.enemiesToSpawn > 0) {
          this.enemySpawnTimer -= delta;
          if (this.enemySpawnTimer <= 0) {
            this.spawnEnemy();
            this.enemiesToSpawn -= 1;
            this.enemySpawnTimer = Math.max(0.42, 1.05 - this.wave * 0.025);
          }
        } else if (this.enemies.length === 0) {
          this.waveCooldown -= delta;
          if (this.waveCooldown <= 0) {
            if (this.wave > 1) {
              this.gold += 35 + this.wave * 8;
              this.hub.store.award(4 + Math.floor(this.wave / 2), `Vague ${this.wave - 1} sécurisée`);
            }
            this.startWave();
            this.wave += 1;
            this.waveCooldown = 3;
          }
        }
      } else {
        this.player2GoldFraction += 4.2 * delta;
        if (this.player2GoldFraction >= 1) {
          const whole = Math.floor(this.player2GoldFraction);
          this.player2Gold += whole;
          this.player2GoldFraction -= whole;
        }
      }

      this.updateArmy(delta);
      if (this.baseHp <= 0) {
        this.baseHp = 0;
        this.status = "over";
        this.hub.store.setRecord("clash", this.wave - 1);
      }
    }

    pointerDown(point) {
      if (this.status === "over") {
        this.reset();
        return;
      }
      for (const rectangle of this.cardRects) {
        if (!hitRect(point, rectangle)) continue;
        if (point.y > rectangle.y + rectangle.height - 32) this.upgrade(rectangle.type);
        else this.deploy(rectangle.type);
        return;
      }
      if (this.mode === "duo") {
        for (const rectangle of this.player2CardRects) {
          if (!hitRect(point, rectangle)) continue;
          if (point.y > rectangle.y + rectangle.height - 32) this.upgradeEnemyUnit(rectangle.type);
          else this.deployEnemyUnit(rectangle.type);
          return;
        }
      }
    }

    keyDown(event) {
      if (event.key === "1") this.deploy("miner");
      if (event.key === "2") this.deploy("archer");
      if (event.key === "3") this.deploy("knight");
      if (event.key.toLowerCase() === "r" && this.status === "over") this.reset();
    }

    drawStickUnit(context, unit, enemy = false) {
      const x = unit.x;
      const y = unit.y;
      const facing = enemy ? -1 : 1;
      const uniform = enemy ? "#3a1420" : "#163325";
      const skin = "#e3b48a";
      const pants = enemy ? "#241018" : "#13251c";
      context.save();
      context.lineCap = "round";

      // Jambes habillées (pantalon sombre).
      context.strokeStyle = pants;
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(x, y - 17);
      context.lineTo(x - 11, y);
      context.moveTo(x, y - 17);
      context.lineTo(x + 12, y);
      context.stroke();

      // Torse habillé (tunique/uniforme), forme pleine arrondie.
      context.fillStyle = uniform;
      context.strokeStyle = hexToRgba("#ffffff", 0.12);
      context.lineWidth = 1;
      roundedRect(context, x - 8, y - 44, 16, 27, 6);
      context.fill();
      context.stroke();

      // Bras (couleur d'équipe = arme/accent).
      context.strokeStyle = unit.color;
      context.lineWidth = unit.type === "brute" || unit.type === "knight" ? 6 : 4.5;
      context.shadowColor = unit.color;
      context.shadowBlur = 7;
      context.beginPath();
      context.moveTo(x, y - 34);
      context.lineTo(x + facing * 15, y - 27);
      context.stroke();

      // Tête et peau visible (cou).
      context.shadowBlur = 0;
      context.fillStyle = skin;
      context.beginPath();
      context.arc(x, y - 54, unit.type === "brute" ? 13 : 10, 0, TAU);
      context.fill();
      context.strokeStyle = hexToRgba("#000000", 0.25);
      context.lineWidth = 1.5;
      context.stroke();

      if (unit.type === "archer") {
        context.strokeStyle = unit.color;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x + facing * 18, y - 30, 12, -Math.PI / 2, Math.PI / 2);
        context.stroke();
      } else if (unit.type === "knight" || unit.type === "brute") {
        context.strokeStyle = "#f4f4ff";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x + facing * 14, y - 29);
        context.lineTo(x + facing * 29, y - 44);
        context.stroke();
      } else if (unit.type === "miner") {
        context.strokeStyle = "#f4c95d";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x + facing * 13, y - 28);
        context.lineTo(x + facing * 25, y - 42);
        context.moveTo(x + facing * 19, y - 37);
        context.lineTo(x + facing * 29, y - 31);
        context.stroke();
      }

      const hpWidth = 35;
      context.shadowBlur = 0;
      context.fillStyle = "rgba(0,0,0,.45)";
      context.fillRect(x - hpWidth / 2, y - 78, hpWidth, 4);
      context.fillStyle = enemy ? this.palette.danger : this.palette.accent;
      context.fillRect(x - hpWidth / 2, y - 78, hpWidth * clamp(unit.hp / unit.maxHp, 0, 1), 4);
      context.restore();
    }

    draw(context) {
      this.drawBackdrop(context, 650, 280);
      const palette = this.palette;

      this.panel(context, 11, 17, 239, 566, 0.96);
      this.label(context, "COMMANDEMENT", 30, 45, { color: palette.accent, size: 9, weight: 850 });
      this.label(context, `${formatNumber(this.gold)} or`, 30, 78, { size: 26, weight: 900 });
      const miners = this.units.filter((unit) => unit.type === "miner").length;
      this.label(context, `+${(3 + miners * 1.45).toFixed(1)}/s`, 30, 99, {
        color: palette.muted,
        size: 9,
        weight: 650,
      });

      for (const rectangle of this.cardRects) {
        const definition = this.unitDefinitions[rectangle.type];
        const cost = this.unitCost(rectangle.type);
        const upgrade = this.upgradeCost(rectangle.type);
        const affordable = this.gold >= cost;
        roundedRect(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 13);
        context.fillStyle = affordable
          ? hexToRgba(definition.color, 0.09)
          : hexToRgba(palette.panelSoft, 0.72);
        context.fill();
        context.strokeStyle = affordable
          ? hexToRgba(definition.color, 0.35)
          : hexToRgba(palette.line, 0.5);
        context.stroke();

        this.label(context, definition.icon, rectangle.x + 23, rectangle.y + 30, {
          color: definition.color,
          size: 22,
          weight: 900,
        });
        this.label(context, definition.name, rectangle.x + 55, rectangle.y + 27, {
          size: 11,
          weight: 850,
        });
        this.label(
          context,
          `Niv. ${this.levels[rectangle.type]} • ${cost} or`,
          rectangle.x + 55,
          rectangle.y + 46,
          { color: affordable ? definition.color : palette.muted, size: 9, weight: 700 },
        );
        this.label(
          context,
          rectangle.type === "miner"
            ? "Combat + revenu passif"
            : rectangle.type === "archer"
              ? "Attaque à longue portée"
              : "Résistant au corps-à-corps",
          rectangle.x + 17,
          rectangle.y + 66,
          { color: palette.muted, size: 8, weight: 550 },
        );

        context.fillStyle = hexToRgba(palette.accent, 0.06);
        context.fillRect(
          rectangle.x,
          rectangle.y + rectangle.height - 32,
          rectangle.width,
          32,
        );
        this.label(
          context,
          `AMÉLIORER • ${upgrade} OR`,
          rectangle.x + rectangle.width / 2,
          rectangle.y + rectangle.height - 15,
          { align: "center", color: palette.accent, size: 8, weight: 850 },
        );
      }

      const battleLeft = 266;
      context.fillStyle = hexToRgba(palette.panelSoft, 0.42);
      context.fillRect(battleLeft, 0, LOGICAL_WIDTH - battleLeft, LOGICAL_HEIGHT);

      const horizon = context.createLinearGradient(0, 120, 0, 460);
      horizon.addColorStop(0, hexToRgba(palette.accent2, 0));
      horizon.addColorStop(1, hexToRgba(palette.accent2, 0.09));
      context.fillStyle = horizon;
      context.fillRect(battleLeft, 80, LOGICAL_WIDTH - battleLeft, 380);

      for (let index = 0; index < 7; index += 1) {
        const x = 300 + index * 110;
        context.strokeStyle = hexToRgba(palette.accent, 0.06);
        context.lineWidth = 14;
        context.beginPath();
        context.moveTo(x, 410);
        context.lineTo(x + 20, 150 + (index % 3) * 30);
        context.stroke();
        context.fillStyle = hexToRgba(palette.accent, 0.07);
        context.beginPath();
        context.arc(x + 20, 155 + (index % 3) * 30, 62, 0, TAU);
        context.fill();
      }

      context.fillStyle = palette.panelSoft;
      context.fillRect(battleLeft, 440, LOGICAL_WIDTH - battleLeft, 160);
      context.fillStyle = hexToRgba(palette.accent, 0.16);
      context.fillRect(battleLeft, 438, LOGICAL_WIDTH - battleLeft, 4);

      context.fillStyle = hexToRgba(palette.accent, 0.18);
      context.fillRect(270, 337, 48, 103);
      context.strokeStyle = palette.accent;
      context.lineWidth = 3;
      context.strokeRect(270, 337, 48, 103);
      this.label(context, "✦", 294, 374, {
        align: "center",
        color: palette.accent,
        size: 23,
        weight: 900,
      });

      context.fillStyle = hexToRgba(palette.danger, 0.12);
      context.fillRect(900, 345, 45, 95);
      context.strokeStyle = hexToRgba(palette.danger, 0.6);
      context.strokeRect(900, 345, 45, 95);

      this.units.sort((a, b) => a.y - b.y);
      this.enemies.sort((a, b) => a.y - b.y);
      for (const unit of this.units) this.drawStickUnit(context, unit, false);
      for (const enemy of this.enemies) this.drawStickUnit(context, enemy, true);

      for (const projectile of this.projectiles) {
        const progress = 1 - projectile.life / projectile.maxLife;
        const x = lerp(projectile.x, projectile.targetX, progress);
        const y = lerp(projectile.y, projectile.targetY, progress) - Math.sin(progress * Math.PI) * 32;
        context.strokeStyle = projectile.color;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x - 11, y + 3);
        context.lineTo(x + 6, y - 2);
        context.stroke();
      }

      this.drawParticles(context);

      this.panel(context, 277, 18, 180, 63);
      this.label(context, "BASE", 293, 39, { color: palette.muted, size: 8, weight: 850 });
      this.label(context, `${Math.ceil(this.baseHp)} / ${this.baseMaxHp}`, 293, 65, {
        size: 18,
        weight: 900,
      });
      context.fillStyle = hexToRgba(palette.line, 0.5);
      context.fillRect(375, 37, 64, 8);
      context.fillStyle = this.baseHp < this.baseMaxHp * 0.3 ? palette.danger : palette.accent;
      context.fillRect(375, 37, 64 * (this.baseHp / this.baseMaxHp), 8);

      this.panel(context, 774, 18, 165, 63);
      if (this.mode === "duo") {
        this.label(context, "JOUEUR 2", 793, 39, { color: palette.muted, size: 8, weight: 850 });
        this.label(context, `${formatNumber(this.player2Gold)} or`, 793, 66, {
          color: palette.hot,
          size: 20,
          weight: 900,
        });
      } else {
        this.label(context, "VAGUE", 793, 39, { color: palette.muted, size: 8, weight: 850 });
        this.label(context, String(Math.max(1, this.wave - 1)), 793, 66, {
          color: palette.hot,
          size: 24,
          weight: 900,
        });
        this.label(context, `${this.enemies.length + this.enemiesToSpawn} ennemis`, 920, 61, {
          align: "right",
          color: palette.muted,
          size: 9,
          weight: 650,
        });
      }

      if (this.mode === "duo") {
        for (const rectangle of this.player2CardRects) {
          const stats = this.enemyBaseStats(rectangle.type);
          const level = this.player2Levels[rectangle.type] || 1;
          const cost = Math.floor(stats.cost * (1 + (level - 1) * 0.2));
          const upgrade = Math.floor(stats.cost * 2.1 * 1.6 ** (level - 1));
          const affordable = this.player2Gold >= cost;
          roundedRect(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 13);
          context.fillStyle = affordable ? hexToRgba(stats.color, 0.09) : hexToRgba(palette.panelSoft, 0.72);
          context.fill();
          context.strokeStyle = affordable ? hexToRgba(stats.color, 0.35) : hexToRgba(palette.line, 0.5);
          context.stroke();
          this.label(context, rectangle.type === "brute" ? "Brute" : rectangle.type === "scout" ? "Éclaireur" : "Maraudeur", rectangle.x + 17, rectangle.y + 27, {
            size: 11,
            weight: 850,
          });
          this.label(context, `Niv. ${level} • ${cost} or`, rectangle.x + 17, rectangle.y + 46, {
            color: affordable ? stats.color : palette.muted,
            size: 9,
            weight: 700,
          });
          context.fillStyle = hexToRgba(palette.danger, 0.06);
          context.fillRect(rectangle.x, rectangle.y + rectangle.height - 32, rectangle.width, 32);
          this.label(
            context,
            `AMÉLIORER • ${upgrade} OR`,
            rectangle.x + rectangle.width / 2,
            rectangle.y + rectangle.height - 15,
            { align: "center", color: palette.danger, size: 8, weight: 850 },
          );
        }
      }

      if (this.waveBanner > 0 && this.status === "playing") {
        context.save();
        context.globalAlpha = clamp(this.waveBanner, 0, 1);
        this.label(context, `VAGUE ${Math.max(1, this.wave - 1)}`, 600, 240, {
          align: "center",
          color: palette.hot,
          size: 33,
          weight: 900,
        });
        context.restore();
      }

      if (this.status === "over") {
        context.fillStyle = "rgba(4, 7, 6, 0.82)";
        context.fillRect(battleLeft, 0, LOGICAL_WIDTH - battleLeft, LOGICAL_HEIGHT);
        this.label(context, "LA BASE EST TOMBÉE", 611, 238, {
          align: "center",
          color: palette.danger,
          size: 11,
          weight: 850,
        });
        this.label(context, `Vague ${Math.max(1, this.wave - 1)}`, 611, 296, {
          align: "center",
          size: 47,
          weight: 900,
        });
        this.label(
          context,
          `Record : vague ${this.hub.store.data.records.clash}`,
          611,
          329,
          { align: "center", color: palette.muted, size: 10, weight: 650 },
        );
        this.button(context, { x: 520, y: 366, width: 182, height: 46 }, "RECONSTRUIRE");
      }
    }
  }

  class GameHub {
    constructor() {
      this.store = new HubStore();
      this.canvas = document.getElementById("gameCanvas");
      this.context = this.canvas.getContext("2d", { alpha: false });
      this.currentGameId = null;
      this.currentGame = null;
      this.games = new Map();
      this.lastTime = performance.now();
      this.pointerStart = null;
      this.pointerPosition = { x: 0, y: 0 };
      this.resizeObserver = null;
      this.loop = this.loop.bind(this);
      this.gameConstructors = {
        harvest: HarvestClicker,
        collapse: CropCollapse,
        runner: CanopyRunner,
        chroma: ChromaSort,
        clash: StickClash,
      };
      this.initialize();
    }

    get palette() {
      return PALETTES[this.store.data.theme] || PALETTES.verdant;
    }

    initialize() {
      this.renderNavigation();
      this.bindInputs();
      this.bindShop();
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
      this.store.addEventListener("change", () => this.updateSharedUi());
      window.addEventListener("beforeunload", () => this.store.save());
      document.addEventListener("visibilitychange", () => {
        this.lastTime = performance.now();
        if (document.hidden) this.store.save();
      });
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.canvas);
      this.updateSharedUi();

      const requestedGame = new URLSearchParams(location.search).get("game");
      this.switchGame(GAME_META.some((game) => game.id === requestedGame) ? requestedGame : "harvest");
      this.resizeCanvas();
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

    resizeCanvas() {
      const rectangle = this.canvas.getBoundingClientRect();
      if (rectangle.width <= 0 || rectangle.height <= 0) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rectangle.width * pixelRatio));
      const height = Math.max(1, Math.round(rectangle.height * pixelRatio));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
    }

    setCanvasTransform() {
      this.context.setTransform(
        this.canvas.width / LOGICAL_WIDTH,
        0,
        0,
        this.canvas.height / LOGICAL_HEIGHT,
        0,
        0,
      );
    }

    canvasPoint(event) {
      const rectangle = this.canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rectangle.left) / rectangle.width) * LOGICAL_WIDTH,
        y: ((event.clientY - rectangle.top) / rectangle.height) * LOGICAL_HEIGHT,
      };
    }

    bindInputs() {
      this.canvas.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.canvas.focus({ preventScroll: true });
        if (event.isTrusted) this.canvas.setPointerCapture(event.pointerId);
        const point = this.canvasPoint(event);
        this.pointerPosition = point;
        this.pointerStart = {
          x: point.x,
          y: point.y,
          time: performance.now(),
        };
        this.currentGame?.pointerDown(point, event);
      });

      this.canvas.addEventListener("pointermove", (event) => {
        const point = this.canvasPoint(event);
        this.pointerPosition = point;
        this.currentGame?.pointerMove(point, event);
      });

      const finishPointer = (event) => {
        const point = this.canvasPoint(event);
        const start = this.pointerStart || { x: point.x, y: point.y, time: performance.now() };
        this.currentGame?.pointerUp(point, {
          dx: point.x - start.x,
          dy: point.y - start.y,
          duration: performance.now() - start.time,
          startX: start.x,
          startY: start.y,
        });
        this.pointerStart = null;
      };
      this.canvas.addEventListener("pointerup", finishPointer);
      this.canvas.addEventListener("pointercancel", finishPointer);

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.getElementById("shopModal").classList.contains("open")) {
          this.closeShop();
          return;
        }
        this.currentGame?.keyDown(event);
      });
      window.addEventListener("keyup", (event) => this.currentGame?.keyUp(event));
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
      this.canvas.setAttribute("aria-label", `Zone de jeu ${metadata.title}`);
      document.querySelectorAll("[data-game]").forEach((button) => {
        button.classList.toggle("active", button.dataset.game === id);
        button.setAttribute("aria-current", button.dataset.game === id ? "page" : "false");
      });
      this.renderRunSettings(id);
      history.replaceState(null, "", `${location.pathname}?game=${id}`);
      this.lastTime = performance.now();
      this.canvas.focus({ preventScroll: true });
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
      this.canvas.focus({ preventScroll: true });
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
            <small>${maxed ? "Tous tes gains bénéficient du bonus maximal." : "Bonus permanent appliqué aux cinq expériences."}</small>
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
      this.store.scheduleSave(delta);
      this.setCanvasTransform();
      this.currentGame?.draw(this.context);
      requestAnimationFrame(this.loop);
    }
  }

  window.hubApp = new GameHub();
})();
