// Stellar Siege — tir de défense 3D en vagues, cadence et montée en puissance.
import * as THREE from "/vendor/three/three.module.min.js";
import {
  Game3D,
  KeyState,
  VirtualJoystick,
  PALETTES,
  SIEGE_UPGRADES,
  configureRenderer,
  readGamepad,
  showWebGLFallback,
  clamp,
  rand,
  choose,
  upgradeCost,
  formatNumber,
} from "/games3d/hub3d-core.js";
import { hubAudio } from "/games3d/hub-audio.js";

const ARENA_RADIUS = 20;
const CORE_RADIUS = 1.6;
const TURRET_HEIGHT = 1.4;
const BASE_FIRE_RATE = 1.6;
const BASE_DAMAGE = 18;
const BASE_SPLASH = 1.6;
const BASE_CORE_HP = 120;
const PROJECTILE_SPEED = 34;
const ENEMY_BASE_HP = 26;
const ENEMY_BASE_SPEED = 2.6;
const WAVE_INTERMISSION = 6;

export class SiegeGame extends Game3D {
  constructor(hub) {
    super(hub);
    this.keys = new KeyState();
    this.container = null;
  }

  buildDom() {
    this.container = document.createElement("div");
    this.container.className = "engine3d engine3d--siege";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "engine3d__canvas";
    this.container.append(this.canvas);

    this.hud = document.createElement("div");
    this.hud.className = "engine3d__hud siege-hud";
    this.hud.innerHTML = `
      <div class="siege-hud__top">
        <div class="siege-stat"><span>Noyau</span><div class="siege-hud__bar"><div class="siege-hud__bar-fill" data-field="coreBar"></div></div></div>
        <div class="siege-stat"><span>Vague</span><strong data-field="wave">1</strong></div>
        <div class="siege-stat"><span>Nova Coins</span><strong data-field="coins">0</strong></div>
      </div>
      <div class="siege-hud__upgrades" data-field="upgrades"></div>
      <div class="siege-hud__hint">Glisser : viser • Tir automatique • Boutons : améliorer la tourelle</div>
      <div class="siege-hud__wave-banner" data-field="banner"></div>
    `;
    this.container.append(this.hud);

    this.resultsPanel = document.createElement("div");
    this.resultsPanel.className = "engine3d__overlay siege-results";
    this.resultsPanel.innerHTML = `
      <div class="siege-results__card">
        <h3>Le noyau est tombé</h3>
        <p class="siege-results__stat">Vagues tenues : <strong data-field="finalWave">0</strong></p>
        <p class="siege-results__stat">Meilleur score : <strong data-field="bestWave">0</strong></p>
        <p class="siege-results__stat">Récompense : <strong data-field="reward">+0 N</strong></p>
        <button type="button" class="siege-results__button" data-action="restart">Redéployer le noyau</button>
      </div>
    `;
    this.resultsPanel.querySelector("[data-action='restart']").addEventListener("click", () => {
      this.resultsPanel.classList.remove("visible");
      this.startRun();
    });
    this.container.append(this.resultsPanel);

    this.upgradeButtons = [];
    const upgradesEl = this.hud.querySelector("[data-field='upgrades']");
    for (const definition of SIEGE_UPGRADES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "siege-upgrade";
      button.innerHTML = `<strong>${definition.name}</strong><small data-field="cost"></small>`;
      button.addEventListener("click", () => {
        if (this.store.upgradeSiege(definition.id)) this.applyUpgradeStats();
        this.refreshUpgradeButtons();
      });
      upgradesEl.append(button);
      this.upgradeButtons.push({ definition, button });
    }

    this.joystick = new VirtualJoystick(this.container, { side: "left" });
    this.joystick.root.classList.add("siege-aim");
  }

  refreshUpgradeButtons() {
    for (const entry of this.upgradeButtons) {
      const level = this.store.data.siegeUpgrades[entry.definition.id] || 0;
      const maxed = level >= entry.definition.maxLevel;
      const cost = maxed ? 0 : upgradeCost(entry.definition, level);
      entry.button.querySelector("[data-field='cost']").textContent = maxed
        ? `Niv. max (${level})`
        : `Niv. ${level} → ${formatNumber(cost)} N`;
      entry.button.classList.toggle("disabled", !maxed && this.store.data.coins < cost);
      entry.button.classList.toggle("maxed", maxed);
    }
  }

  applyUpgradeStats() {
    const upgrades = this.store.data.siegeUpgrades;
    this.fireRate = BASE_FIRE_RATE * (1 + (upgrades.fireRate || 0) * 0.22);
    this.damage = BASE_DAMAGE * (1 + (upgrades.damage || 0) * 0.35);
    this.splashRadius = BASE_SPLASH * (1 + (upgrades.splash || 0) * 0.28);
    this.maxCoreHp = BASE_CORE_HP * (1 + (upgrades.coreHp || 0) * 0.3);
  }

  buildScene() {
    const theme = PALETTES[this.store.data.theme] || PALETTES.verdant;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    } catch {
      showWebGLFallback(this.container);
      return;
    }
    configureRenderer(this.renderer, THREE);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(theme.background);
    this.scene.fog = new THREE.Fog(new THREE.Color(theme.background).getHex(), 24, 70);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 160);
    this.camera.position.set(0, 16, 15);
    this.camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(new THREE.Color(theme.accent2), new THREE.Color(theme.background), 0.6);
    this.scene.add(hemi);
    const spot = new THREE.SpotLight(0xffffff, 1.4, 60, Math.PI / 5, 0.4, 1.2);
    spot.position.set(0, 26, 10);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = true;
    this.scene.add(spot, spot.target);

    const floorGeometry = new THREE.CircleGeometry(ARENA_RADIUS, 64);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1712, roughness: 0.95 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ringGeometry = new THREE.RingGeometry(ARENA_RADIUS - 0.3, ARENA_RADIUS, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.accent), side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    const laneCount = 6;
    this.lanes = [];
    for (let i = 0; i < laneCount; i += 1) {
      const angle = (i / laneCount) * Math.PI * 2;
      this.lanes.push(angle);
      const laneGeometry = new THREE.PlaneGeometry(1.4, ARENA_RADIUS - CORE_RADIUS - 1);
      const laneMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.line), transparent: true, opacity: 0.25 });
      const lane = new THREE.Mesh(laneGeometry, laneMaterial);
      lane.rotation.x = -Math.PI / 2;
      const midDistance = (ARENA_RADIUS + CORE_RADIUS) / 2;
      lane.position.set(Math.cos(angle) * midDistance, 0.015, Math.sin(angle) * midDistance);
      lane.rotation.z = -angle;
      this.scene.add(lane);
    }

    this.core = this.buildCore(theme);
    this.scene.add(this.core);

    this.turretGroup = this.buildTurret(theme);
    this.scene.add(this.turretGroup);

    this.enemyGroup = new THREE.Group();
    this.scene.add(this.enemyGroup);
    this.projectileGroup = new THREE.Group();
    this.scene.add(this.projectileGroup);
    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);
  }

  buildCore(theme) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS * 1.2, 1.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x14241c, metalness: 0.3, roughness: 0.6 }),
    );
    base.position.y = 0.55;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(theme.accent),
        emissive: new THREE.Color(theme.accent),
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
    );
    core.position.y = 2;
    group.add(core);
    this.coreMesh = core;
    return group;
  }

  buildTurret(theme) {
    const group = new THREE.Group();
    const mount = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.9, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x1b2a22, roughness: 0.6 }),
    );
    mount.position.y = TURRET_HEIGHT - 0.3;
    group.add(mount);
    this.turretPivot = new THREE.Group();
    this.turretPivot.position.y = TURRET_HEIGHT;
    group.add(this.turretPivot);
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 1.6),
      new THREE.MeshStandardMaterial({
        color: 0x202a36,
        emissive: new THREE.Color(theme.accent2),
        emissiveIntensity: 0.3,
      }),
    );
    barrel.position.z = 0.9;
    this.turretPivot.add(barrel);
    this.turretPivot.add(this.buildDefender(theme));
    return group;
  }

  /** Défenseur humanoïde (anatomie simplifiée + tenue) posté derrière la tourelle. */
  buildDefender(theme) {
    const defender = new THREE.Group();
    defender.scale.setScalar(1.8);
    const suitMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(theme.panelSoft || "#173329"), roughness: 0.75 });
    const armorMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.accent2),
      emissive: new THREE.Color(theme.accent2),
      emissiveIntensity: 0.18,
      roughness: 0.5,
    });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xd9a876, roughness: 0.8 });

    const legGeometry = new THREE.CylinderGeometry(0.1, 0.09, 0.55, 8);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(legGeometry, suitMaterial);
      leg.position.set(side * 0.13, -0.42, -0.35);
      defender.add(leg);
    }

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.38, 4, 8), armorMaterial);
    torso.position.set(0, 0.02, -0.35);
    defender.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), skinMaterial);
    head.position.set(0, 0.35, -0.35);
    defender.add(head);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.06, 0.04),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.accent) }),
    );
    visor.position.set(0, 0.36, -0.22);
    defender.add(visor);

    const armGeometry = new THREE.CylinderGeometry(0.07, 0.065, 0.42, 8);
    const armLeft = new THREE.Mesh(armGeometry, suitMaterial);
    armLeft.rotation.x = Math.PI / 2.4;
    armLeft.position.set(-0.22, 0.08, -0.1);
    defender.add(armLeft);
    const armRight = new THREE.Mesh(armGeometry, suitMaterial);
    armRight.rotation.x = Math.PI / 2.4;
    armRight.position.set(0.22, 0.08, -0.1);
    defender.add(armRight);

    return defender;
  }

  enter() {
    if (!this.container) {
      this.buildDom();
      this.buildScene();
      this.applyUpgradeStats();
      this.refreshUpgradeButtons();
      this.hub.mountEngine(this.container);
      this.startRun();
    } else {
      this.hub.mountEngine(this.container);
      this.refreshUpgradeButtons();
    }
    this.keys.attach();
    this.resize(this.hub.viewportWidth(), this.hub.viewportHeight());
  }

  exit() {
    this.keys.detach();
  }

  dispose() {
    this.joystick?.dispose();
    this.renderer?.dispose();
  }

  onQualityChanged(quality) {
    if (!this.renderer) return;
    configureRenderer(this.renderer, THREE, quality);
    this.resize(this.hub.viewportWidth(), this.hub.viewportHeight());
  }

  resize(width, height) {
    if (!this.renderer) return;
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  startRun() {
    this.applyUpgradeStats();
    this.difficultyScale = this.store.difficultyOf("siege");
    this.coreHp = this.maxCoreHp;
    this.wave = 1;
    this.waveTimer = 2;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.fireTimer = 0;
    this.enemies = [];
    this.enemyGroup.clear();
    this.aimAngle = 0;
    this.gameOver = false;
    this.inIntermission = true;
    this.shieldCharge = false;
    this.reviveAvailable = false;
    if (this.store.consumeItem("shield")) {
      this.shieldCharge = true;
      this.hub.toast("Bouclier Renforcé", "Absorbe le premier coup sur le noyau");
    }
    this.reviveAvailable = this.store.consumeItem("revive");
    if (this.reviveAvailable) this.hub.toast("Jeton de Résurrection", "Disponible pour cette run");
    this.queueWave();
    this.updateHud();
  }

  queueWave() {
    const spawnScale = this.difficultyScale?.spawn ?? 1;
    const enemyCount = Math.round((4 + Math.floor(this.wave * 1.6)) * clamp(spawnScale, 0.6, 1.6));
    this.spawnQueue = Array.from({ length: enemyCount }, () => ({
      hp: ENEMY_BASE_HP * (1 + this.wave * 0.18) * spawnScale,
      speed: ENEMY_BASE_SPEED * (1 + this.wave * 0.035) * Math.sqrt(spawnScale),
      lane: choose(this.lanes),
    }));
    this.showBanner(`Vague ${this.wave}`);
  }

  showBanner(text) {
    const banner = this.hud.querySelector("[data-field='banner']");
    banner.textContent = text;
    banner.classList.add("visible");
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => banner.classList.remove("visible"), 1800);
  }

  update(delta) {
    if (this.gameOver || !this.renderer) return;
    const dt = Math.min(delta, 0.05);
    const theme = PALETTES[this.store.data.theme] || PALETTES.verdant;
    const pad = readGamepad();

    const aimAxis = this.joystick.axis.x + pad.axisX + (this.keys.isDown("ArrowRight", "KeyD") ? 1 : 0) - (this.keys.isDown("ArrowLeft", "KeyA") ? 1 : 0);
    this.aimAngle += aimAxis * 2.4 * dt;
    this.turretPivot.rotation.y = this.aimAngle;

    if (this.inIntermission) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.inIntermission = false;
        this.spawnTimer = 0;
      }
    } else {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.spawnQueue.length) {
        this.spawnEnemy(this.spawnQueue.shift(), theme);
        this.spawnTimer = Math.max(0.35, 1.1 - this.wave * 0.03);
      }
      if (!this.spawnQueue.length && !this.enemies.length) {
        this.wave += 1;
        this.inIntermission = true;
        this.waveTimer = WAVE_INTERMISSION;
        this.queueWave();
      }
    }

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.enemies.length) {
      this.fireAtNearestEnemy(theme);
      this.fireTimer = 1 / this.fireRate;
    }

    this.updateEnemies(dt, theme);
    this.updateProjectiles(dt, theme);
    this.updateFx(dt);
    this.coreMesh.rotation.y += dt * 0.6;

    this.updateHud();
    this.keys.endFrame();
    this.store.scheduleSave(dt);
  }

  spawnEnemy(spec, theme) {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.3, 6),
      new THREE.MeshStandardMaterial({
        color: 0x3a1420,
        emissive: new THREE.Color(theme.danger),
        emissiveIntensity: 0.4,
        roughness: 0.6,
      }),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    const enemy = {
      mesh,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      angle: spec.lane,
      distance: ARENA_RADIUS - 0.5,
    };
    this.placeEnemy(enemy);
    this.enemyGroup.add(mesh);
    this.enemies.push(enemy);
  }

  placeEnemy(enemy) {
    enemy.mesh.position.set(Math.cos(enemy.angle) * enemy.distance, 0.7, Math.sin(enemy.angle) * enemy.distance);
    enemy.mesh.lookAt(0, 0.7, 0);
  }

  updateEnemies(dt, theme) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      enemy.distance -= enemy.speed * dt;
      this.placeEnemy(enemy);
      if (enemy.distance <= CORE_RADIUS + 0.4) {
        if (this.shieldCharge) {
          this.shieldCharge = false;
          hubAudio.hit();
          this.hub.toast("Bouclier Renforcé", "A absorbé l'impact !");
        } else {
          hubAudio.hit();
          this.coreHp -= 14;
        }
        this.spawnExplosion(enemy.mesh.position, theme.danger);
        this.enemyGroup.remove(enemy.mesh);
        this.enemies.splice(i, 1);
        if (this.coreHp <= 0) {
          if (this.reviveAvailable) {
            this.reviveAvailable = false;
            this.coreHp = Math.round(this.maxCoreHp * 0.3);
            hubAudio.coin();
            this.hub.toast("Jeton de Résurrection", "Le noyau renaît !");
          } else {
            hubAudio.fail();
            this.endRun();
          }
        }
      }
    }
  }

  fireAtNearestEnemy(theme) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const enemy of this.enemies) {
      if (enemy.distance < nearestDistance) {
        nearestDistance = enemy.distance;
        nearest = enemy;
      }
    }
    if (!nearest) return;
    this.aimAngle = nearest.angle;
    this.turretPivot.rotation.y = this.aimAngle;

    const aimDirection = new THREE.Vector3(Math.cos(this.aimAngle), 0, Math.sin(this.aimAngle));
    const start = new THREE.Vector3(0, TURRET_HEIGHT, 0).addScaledVector(aimDirection, 0.9);
    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.accent2) }),
    );
    projectile.position.copy(start);
    const direction = new THREE.Vector3(Math.cos(nearest.angle), 0, Math.sin(nearest.angle));
    projectile.userData = { velocity: direction.multiplyScalar(PROJECTILE_SPEED), life: 2.2, targetAngleRef: nearest };
    this.projectileGroup.add(projectile);
    hubAudio.laser();
  }

  updateProjectiles(dt, theme) {
    for (let i = this.projectileGroup.children.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectileGroup.children[i];
      projectile.position.addScaledVector(projectile.userData.velocity, dt);
      projectile.userData.life -= dt;
      let hit = false;
      for (const enemy of this.enemies) {
        const dx = enemy.mesh.position.x - projectile.position.x;
        const dz = enemy.mesh.position.z - projectile.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < 0.9) {
          hit = true;
          this.applySplashDamage(enemy, theme);
          break;
        }
      }
      if (hit || projectile.userData.life <= 0 || projectile.position.length() > ARENA_RADIUS + 2) {
        this.projectileGroup.remove(projectile);
        projectile.geometry.dispose();
        projectile.material.dispose();
      }
    }
  }

  applySplashDamage(targetEnemy, theme) {
    this.spawnExplosion(targetEnemy.mesh.position, theme.accent2);
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (enemy.mesh.position.distanceTo(targetEnemy.mesh.position) <= this.splashRadius) {
        enemy.hp -= this.damage;
        if (enemy.hp <= 0) {
          this.killEnemy(enemy, i, theme);
        }
      }
    }
  }

  killEnemy(enemy, index, theme) {
    this.spawnExplosion(enemy.mesh.position, theme.hot);
    this.enemyGroup.remove(enemy.mesh);
    this.enemies.splice(index, 1);
    hubAudio.coin();
    this.store.award(
      Math.max(1, Math.round((2 + Math.floor(this.wave * 0.4)) * (this.difficultyScale?.reward ?? 1))),
      "Stellar Siege",
    );
    const total = Math.max(this.store.data.records.siege || 0, this.wave);
    this.store.setRecord("siege", total);
  }

  spawnExplosion(position, color) {
    for (let i = 0; i < 8; i += 1) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      spark.position.copy(position);
      spark.userData.velocity = new THREE.Vector3(rand(-3, 3), rand(1, 4), rand(-3, 3));
      spark.userData.life = 0.45;
      this.fxGroup.add(spark);
    }
  }

  updateFx(dt) {
    for (let i = this.fxGroup.children.length - 1; i >= 0; i -= 1) {
      const spark = this.fxGroup.children[i];
      spark.userData.velocity.y -= 9 * dt;
      spark.position.addScaledVector(spark.userData.velocity, dt);
      spark.userData.life -= dt;
      spark.material.opacity = clamp(spark.userData.life / 0.45, 0, 1);
      if (spark.userData.life <= 0) {
        this.fxGroup.remove(spark);
        spark.geometry.dispose();
        spark.material.dispose();
      }
    }
  }

  updateHud() {
    this.hud.querySelector("[data-field='coreBar']").style.width = `${clamp((this.coreHp / this.maxCoreHp) * 100, 0, 100)}%`;
    this.hud.querySelector("[data-field='wave']").textContent = this.wave;
    this.hud.querySelector("[data-field='coins']").textContent = formatNumber(this.store.data.coins);
    this.refreshUpgradeButtons();
  }

  endRun() {
    this.gameOver = true;
    const reward = this.store.award(Math.round(this.wave * 6 * (this.difficultyScale?.reward ?? 1)), "Stellar Siege");
    this.resultsPanel.querySelector("[data-field='finalWave']").textContent = this.wave;
    this.resultsPanel.querySelector("[data-field='bestWave']").textContent = this.store.data.records.siege || 0;
    this.resultsPanel.querySelector("[data-field='reward']").textContent = `+${reward} N`;
    this.resultsPanel.classList.add("visible");
  }

  render() {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }
}
