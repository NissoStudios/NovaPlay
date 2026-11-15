// Neon Canopy Rally — rally arcade 3D à piste procédurale infinie (drift + boost).
import * as THREE from "/vendor/three/three.module.min.js";
import {
  Game3D,
  KeyState,
  VirtualJoystick,
  TouchButton,
  PALETTES,
  configureRenderer,
  readGamepad,
  showWebGLFallback,
  clamp,
  lerp,
  makeRng,
  formatNumber,
} from "/games3d/hub3d-core.js";
import { hubAudio } from "/games3d/hub-audio.js";

const STEP = 2;
const CHUNK_POINTS = 40;
const LOOKAHEAD = 280;
const REMOVE_BEHIND = 140;
const TRIM_POINTS_AT = 3000;

const BASE_SPEED = 24;
const MAX_SPEED = 58;
const SPEED_RAMP_DISTANCE = 3200;
const STEER_SPEED = 15;
const DRIFT_STEER_MULTIPLIER = 1.55;
const BOOST_SPEED_MULTIPLIER = 1.65;
const BOOST_DURATION = 1.3;
const CAR_HALF_WIDTH = 1.1;

export class RallyGame extends Game3D {
  constructor(hub) {
    super(hub);
    this.keys = new KeyState();
    this.joystick = null;
    this.boostButton = null;
    this.container = null;
    this.hud = null;
    this.resultsPanel = null;
    this.running = false;
    this.width = 1;
    this.height = 1;
  }

  buildDom() {
    this.container = document.createElement("div");
    this.container.className = "engine3d engine3d--rally";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "engine3d__canvas";
    this.container.append(this.canvas);

    this.hud = document.createElement("div");
    this.hud.className = "engine3d__hud rally-hud";
    this.hud.innerHTML = `
      <div class="rally-hud__top">
        <div class="rally-stat"><span>Distance</span><strong data-field="distance">0 m</strong></div>
        <div class="rally-stat"><span>Vitesse</span><strong data-field="speed">0 kn</strong></div>
        <div class="rally-stat"><span>Nova Coins</span><strong data-field="coins">0</strong></div>
        <div class="rally-stat" data-field="rivalStat" hidden><span data-field="rivalLabel">Nova</span><strong data-field="rivalDistance">0 m</strong></div>
      </div>
      <div class="rally-hud__shields" data-field="shields"></div>
      <div class="rally-hud__boost">
        <div class="rally-hud__boost-fill" data-field="boostFill"></div>
      </div>
      <div class="rally-hud__hint">Flèches / A-D : diriger • Maj ou tap DRIFT : boost</div>
    `;
    this.container.append(this.hud);

    this.resultsPanel = document.createElement("div");
    this.resultsPanel.className = "engine3d__overlay rally-results";
    this.resultsPanel.innerHTML = `
      <div class="rally-results__card">
        <h3 data-field="resultTitle">Collision !</h3>
        <p class="rally-results__stat" data-field="duelLine" hidden><strong data-field="duelResult"></strong></p>
        <p class="rally-results__stat">Distance parcourue : <strong data-field="finalDistance">0 m</strong></p>
        <p class="rally-results__stat">Meilleure distance : <strong data-field="bestDistance">0 m</strong></p>
        <p class="rally-results__stat">Récompense : <strong data-field="reward">+0 N</strong></p>
        <button type="button" class="rally-results__button" data-action="restart">Relancer la course</button>
      </div>
    `;
    this.resultsPanel.querySelector("[data-action='restart']").addEventListener("click", () => {
      this.resultsPanel.classList.remove("visible");
      if (this.pendingDuoStart) {
        const next = this.pendingDuoStart;
        this.pendingDuoStart = null;
        this.startRun(next);
      } else {
        this.startRun();
      }
    });
    this.container.append(this.resultsPanel);

    this.joystick = new VirtualJoystick(this.container, { side: "left" });
    this.joystick.root.classList.add("rally-steer");
    this.boostButton = new TouchButton(this.container, {
      label: "BOOST",
      side: "right",
      variant: "touch-action--boost",
    });
  }

  buildScene() {
    const THEME = PALETTES[this.store.data.theme] || PALETTES.verdant;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    } catch {
      showWebGLFallback(this.container);
      return;
    }
    configureRenderer(this.renderer, THREE);
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(THEME.background);
    this.scene.fog = new THREE.Fog(new THREE.Color(THEME.background).getHex(), 40, 210);

    this.camera = new THREE.PerspectiveCamera(68, 1, 0.1, 400);

    const hemi = new THREE.HemisphereLight(new THREE.Color(THEME.accent2), new THREE.Color(THEME.background), 1.1);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xdfe8ff, 0.65);
    moon.position.set(-40, 60, -20);
    this.scene.add(moon);
    this.chaseLight = new THREE.PointLight(new THREE.Color(THEME.accent), 2.2, 18, 2);
    this.chaseLight.position.set(0, 4.5, 6);
    this.scene.add(this.chaseLight);

    this.groundGrid = this.buildGroundGrid(THEME);
    this.scene.add(this.groundGrid);

    this.car = this.buildCar(THEME);
    this.scene.add(this.car);

    this.driftTrail = [];
    this.trailGroup = new THREE.Group();
    this.scene.add(this.trailGroup);
  }

  buildGroundGrid(theme) {
    const size = 2000;
    const divisions = 200;
    const grid = new THREE.GridHelper(size, divisions, new THREE.Color(theme.accent), new THREE.Color(theme.line));
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.position.y = -0.02;
    return grid;
  }

  buildCar(theme) {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x141824,
      metalness: 0.4,
      roughness: 0.35,
      emissive: new THREE.Color(theme.accent),
      emissiveIntensity: 0.05,
    });
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.accent) });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.6), bodyMaterial);
    chassis.position.y = 0.42;
    group.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 1.6), bodyMaterial);
    cabin.position.set(0, 0.78, -0.15);
    group.add(cabin);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 3.4), stripeMaterial);
    stripe.position.set(0, 0.7, -0.1);
    group.add(stripe);

    const wheelGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.32, 12);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.8 });
    const wheelOffsets = [
      [-0.95, 0.22, 1.15],
      [0.95, 0.22, 1.15],
      [-0.95, 0.22, -1.15],
      [0.95, 0.22, -1.15],
    ];
    this.wheels = wheelOffsets.map(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      group.add(wheel);
      return wheel;
    });

    const tailLightGeometry = new THREE.PlaneGeometry(1.6, 0.28);
    const tailLightMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.hot),
      transparent: true,
      opacity: 0.9,
    });
    const tailLight = new THREE.Mesh(tailLightGeometry, tailLightMaterial);
    tailLight.position.set(0, 0.5, 1.82);
    tailLight.rotation.y = Math.PI;
    group.add(tailLight);
    this.tailLightMaterial = tailLightMaterial;

    return group;
  }

  enter() {
    if (!this.container) {
      this.buildDom();
      this.buildScene();
      this.hub.mountEngine(this.container);
      this.startRun();
    } else {
      this.hub.mountEngine(this.container);
    }
    this.keys.attach();
    this.running = true;
    this.resize(this.hub.viewportWidth(), this.hub.viewportHeight());
  }

  exit() {
    this.keys.detach();
    this.running = false;
  }

  dispose() {
    this.joystick?.dispose();
    this.boostButton?.dispose();
    this.renderer?.dispose();
  }

  onQualityChanged(quality) {
    if (!this.renderer) return;
    configureRenderer(this.renderer, THREE, quality);
    this.renderer.shadowMap.enabled = false;
    this.resize(this.width, this.height);
  }

  resize(width, height) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    if (!this.renderer) return;
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  startRun(options = {}) {
    const theme = PALETTES[this.store.data.theme] || PALETTES.verdant;
    this.mode = this.store.modeOf("rally");
    this.difficultyScale = this.store.difficultyOf("rally");
    this.runSeed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
    this.rng = makeRng(this.runSeed);

    this.points = [{ x: 0, z: 0, heading: 0, width: 9, distance: 0 }];
    this.pointsBaseIndex = 0;
    this.genHeading = 0;
    this.genX = 0;
    this.genZ = 0;
    this.genCurvature = 0;
    this.genTargetCurvature = 0;
    this.genWidth = 9;
    this.genTargetWidth = 9;
    this.genSegmentRemaining = 20;
    this.generatedDistance = 0;

    this.chunks = [];
    if (this.trackGroup) {
      this.scene.remove(this.trackGroup);
      this.trackGroup.traverse((child) => child.geometry?.dispose());
    }
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
    this.trackObjects = [];

    this.carDistance = 0;
    this.carLateral = 0;
    this.speed = BASE_SPEED * this.difficultyScale.speed;
    this.boostTimer = 0;
    this.boostCharge = 0.35;
    this.drifting = false;
    this.shields = 3;
    this.coinsThisRun = 0;
    this.crashed = false;
    this.crashCooldown = 0;
    this.running = true;
    this.coinMagnetBonus = 0;
    this.reviveAvailable = false;
    this.slowRampActive = false;

    this.duoStage = options.duoStage || (this.mode === "duo" ? "p1" : null);
    if (this.duoStage === "p1") this.p1Distance = undefined;
    if (!options.keepItems) {
      if (this.store.consumeItem("shield")) {
        this.shields = 4;
        this.hub.toast("Bouclier Renforcé", "+1 bouclier de départ");
      }
      if (this.store.consumeItem("magnet")) {
        this.coinMagnetBonus = 1.1;
        this.hub.toast("Aimant à Pièces", "Zone de collecte élargie");
      }
      if (this.store.consumeItem("slowTime")) {
        this.slowRampActive = true;
        this.hub.toast("Chrono Ralenti", "Montée en difficulté ralentie");
      }
      this.reviveAvailable = this.store.consumeItem("revive");
      if (this.reviveAvailable) this.hub.toast("Jeton de Résurrection", "Disponible pour cette run");
    }

    if (this.mode === "nova") {
      this.novaDistance = 0;
      this.novaSpeed = BASE_SPEED * this.difficultyScale.speed * 1.05;
      if (!this.novaGhost) this.novaGhost = this.buildGhostCar(theme);
      this.novaGhost.visible = true;
      this.scene.add(this.novaGhost);
    } else if (this.novaGhost) {
      this.novaGhost.visible = false;
    }

    while (this.generatedDistance < this.carDistance + LOOKAHEAD) this.generateChunk(theme);
    this.updateHud(true);
  }

  buildGhostCar(theme) {
    const ghost = this.buildCar(theme);
    ghost.traverse((child) => {
      if (child.material) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.45;
      }
    });
    return ghost;
  }

  generateChunk(theme) {
    const chunk = { startIndex: this.points.length - 1 + this.pointsBaseIndex, group: new THREE.Group() };
    const spawnScale = this.difficultyScale?.spawn ?? 1;
    for (let i = 0; i < CHUNK_POINTS; i += 1) {
      if (this.genSegmentRemaining <= 0) {
        this.genTargetCurvature =
          this.chooseRng([-1, -1, 0, 1, 1]) *
          this.randRange(0.012, 0.05) *
          spawnScale *
          (1 + this.generatedDistance / SPEED_RAMP_DISTANCE);
        this.genTargetWidth = clamp(this.randRange(6.5, 9.5) - this.generatedDistance / 2600, 5.4, 9.5);
        this.genSegmentRemaining = this.randRange(26, 60);
      }
      this.genCurvature = lerp(this.genCurvature, this.genTargetCurvature, 0.035);
      this.genWidth = lerp(this.genWidth, this.genTargetWidth, 0.02);
      this.genHeading += this.genCurvature * STEP;
      this.genX += Math.sin(this.genHeading) * STEP;
      this.genZ -= Math.cos(this.genHeading) * STEP;
      this.generatedDistance += STEP;
      this.genSegmentRemaining -= STEP;
      this.points.push({
        x: this.genX,
        z: this.genZ,
        heading: this.genHeading,
        width: this.genWidth,
        distance: this.generatedDistance,
      });
    }

    const startPointIndex = chunk.startIndex - this.pointsBaseIndex;
    const pts = this.points.slice(startPointIndex, startPointIndex + CHUNK_POINTS + 1);
    this.buildChunkMesh(chunk.group, pts, theme);
    this.decorateChunk(chunk.group, pts, theme);
    chunk.endDistance = pts[pts.length - 1].distance;
    this.trackGroup.add(chunk.group);
    this.chunks.push(chunk);

    if (this.points.length > TRIM_POINTS_AT) {
      const cut = this.points.length - 800;
      this.points.splice(0, cut);
      this.pointsBaseIndex += cut;
    }
  }

  buildChunkMesh(group, pts, theme) {
    const positions = [];
    const indices = [];
    const edgeLeft = [];
    const edgeRight = [];
    for (let i = 0; i < pts.length; i += 1) {
      const p = pts[i];
      const perpX = Math.cos(p.heading);
      const perpZ = Math.sin(p.heading);
      const halfW = p.width / 2;
      const lx = p.x - perpX * halfW;
      const lz = p.z - perpZ * halfW;
      const rx = p.x + perpX * halfW;
      const rz = p.z + perpZ * halfW;
      positions.push(lx, 0, lz, rx, 0, rz);
      edgeLeft.push(lx, 0.12, lz);
      edgeRight.push(rx, 0.12, rz);
      if (i > 0) {
        const a = (i - 1) * 2;
        const b = i * 2;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0x0d1712, roughness: 0.95, metalness: 0.05 });
    const road = new THREE.Mesh(geometry, material);
    group.add(road);

    const edgeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.accent) });
    const leftEdge = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(toVec3(edgeLeft)),
        Math.max(2, pts.length * 2),
        0.09,
        4,
        false,
      ),
      edgeMaterial,
    );
    const rightEdge = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(toVec3(edgeRight)),
        Math.max(2, pts.length * 2),
        0.09,
        4,
        false,
      ),
      edgeMaterial,
    );
    group.add(leftEdge, rightEdge);
  }

  decorateChunk(group, pts, theme) {
    const treeGeometry = new THREE.ConeGeometry(1, 3.4, 6);
    const treeMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c2318,
      emissive: new THREE.Color(theme.accent2),
      emissiveIntensity: 0.18,
      roughness: 0.9,
    });
    const rockGeometry = new THREE.IcosahedronGeometry(0.85, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 1 });
    const coinGeometry = new THREE.TorusGeometry(0.42, 0.16, 8, 16);
    const coinMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.hot) });
    const obstacleGeometry = new THREE.DodecahedronGeometry(0.75, 0);
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x552030,
      emissive: new THREE.Color(theme.danger),
      emissiveIntensity: 0.35,
    });

    const decorCount = Math.max(2, Math.floor(pts.length / 6));
    for (let i = 0; i < decorCount; i += 1) {
      const p = this.chooseRng(pts);
      const perpX = Math.cos(p.heading);
      const perpZ = Math.sin(p.heading);
      const side = this.rng() > 0.5 ? 1 : -1;
      const outset = p.width / 2 + this.randRange(1.5, 6);
      const mesh = new THREE.Mesh(this.rng() > 0.35 ? treeGeometry : rockGeometry, this.rng() > 0.35 ? treeMaterial : rockMaterial);
      mesh.position.set(p.x + perpX * outset * side, 1.2, p.z + perpZ * outset * side);
      mesh.rotation.y = this.rng() * Math.PI * 2;
      const scale = this.randRange(0.7, 1.6);
      mesh.scale.setScalar(scale);
      group.add(mesh);
    }

    const obstacleChance = clamp(0.38 * (this.difficultyScale?.spawn ?? 1), 0.16, 0.7);
    for (let i = 6; i < pts.length - 2; i += this.randRange(7, 13) | 0) {
      const p = pts[i];
      if (!p) continue;
      const perpX = Math.cos(p.heading);
      const perpZ = Math.sin(p.heading);
      const lateral = this.randRange(-p.width / 2 + 1, p.width / 2 - 1);
      if (this.rng() < obstacleChance) {
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        obstacle.position.set(p.x + perpX * lateral, 0.65, p.z + perpZ * lateral);
        obstacle.userData = { type: "obstacle", distance: p.distance, lateral, radius: 0.95 };
        group.add(obstacle);
        this.registerTrackObject(obstacle);
      } else {
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(p.x + perpX * lateral, 0.6, p.z + perpZ * lateral);
        coin.userData = { type: "coin", distance: p.distance, lateral, radius: 0.8, collected: false };
        group.add(coin);
        this.registerTrackObject(coin);
      }
    }
  }

  registerTrackObject(mesh) {
    if (!this.trackObjects) this.trackObjects = [];
    this.trackObjects.push(mesh);
  }

  randRange(min, max) {
    return min + this.rng() * (max - min);
  }

  chooseRng(values) {
    return values[Math.floor(this.rng() * values.length)];
  }

  pointAtDistance(distance) {
    const index = Math.floor(distance / STEP) - this.pointsBaseIndex;
    const clampedIndex = clamp(index, 0, this.points.length - 2);
    const a = this.points[clampedIndex];
    const b = this.points[clampedIndex + 1] || a;
    const t = clamp((distance - a.distance) / STEP, 0, 1);
    return {
      x: lerp(a.x, b.x, t),
      z: lerp(a.z, b.z, t),
      heading: lerp(a.heading, b.heading, t),
      width: lerp(a.width, b.width, t),
    };
  }

  update(delta) {
    if (!this.running || this.crashed) {
      if (this.crashed) this.updateCamera();
      return;
    }
    const dt = Math.min(delta, 0.05);
    const theme = PALETTES[this.store.data.theme] || PALETTES.verdant;

    const pad = readGamepad();
    const steerAxis = clamp((this.keys.isDown("ArrowLeft", "KeyA") ? -1 : 0) + (this.keys.isDown("ArrowRight", "KeyD") ? 1 : 0) + this.joystick.axis.x + pad.axisX, -1, 1);
    const boostHeld = this.keys.isDown("ShiftLeft", "ShiftRight", "Space") || this.boostButton.pressed || pad.actionA;

    this.drifting = Math.abs(steerAxis) > 0.55 && this.speed > BASE_SPEED * this.difficultyScale.speed * 1.1;
    const steerMultiplier = this.drifting ? DRIFT_STEER_MULTIPLIER : 1;
    this.carLateral += steerAxis * STEER_SPEED * steerMultiplier * dt;

    const point = this.pointAtDistance(this.carDistance);
    const halfW = point.width / 2 - CAR_HALF_WIDTH;
    this.carLateral = clamp(this.carLateral, -halfW, halfW);

    if (this.drifting) this.boostCharge = clamp(this.boostCharge + dt * 0.55, 0, 1);
    else this.boostCharge = clamp(this.boostCharge + dt * 0.05, 0, 1);

    if (boostHeld && this.boostCharge > 0.2 && this.boostTimer <= 0) {
      this.boostTimer = BOOST_DURATION;
      this.boostCharge = Math.max(0, this.boostCharge - 0.35);
      hubAudio.boost();
    }
    if (this.boostTimer > 0) this.boostTimer -= dt;

    const rampDistance = this.slowRampActive ? SPEED_RAMP_DISTANCE * 1.6 : SPEED_RAMP_DISTANCE;
    const baseSpeed = BASE_SPEED * this.difficultyScale.speed;
    const maxSpeed = MAX_SPEED * this.difficultyScale.speed;
    const rampSpeed = baseSpeed + (maxSpeed - baseSpeed) * clamp(this.carDistance / rampDistance, 0, 1);
    this.speed = this.boostTimer > 0 ? rampSpeed * BOOST_SPEED_MULTIPLIER : rampSpeed;
    this.carDistance += this.speed * dt;

    if (this.mode === "nova" && this.novaGhost) {
      this.novaDistance += this.novaSpeed * dt;
      const novaPoint = this.pointAtDistance(Math.min(this.novaDistance, this.generatedDistance - 4));
      const novaPerpX = Math.cos(novaPoint.heading);
      const novaPerpZ = Math.sin(novaPoint.heading);
      this.novaGhost.position.set(novaPoint.x + novaPerpX * 1.2, 0, novaPoint.z + novaPerpZ * 1.2);
      this.novaGhost.rotation.y = novaPoint.heading;
    }

    if (this.crashCooldown > 0) this.crashCooldown -= dt;

    this.checkTrackObjects();
    this.ensureTrack(theme);
    this.pruneChunks(theme);
    this.placeCar();
    this.updateCamera();
    this.updateTrail(dt, theme);

    this.wheels?.forEach((wheel) => {
      wheel.rotation.x -= this.speed * dt * 1.4;
    });
    if (this.tailLightMaterial) this.tailLightMaterial.opacity = this.boostTimer > 0 ? 1 : 0.6;

    this.updateHud(false);
    this.store.scheduleSave(dt);
  }

  ensureTrack(theme) {
    while (this.generatedDistance < this.carDistance + LOOKAHEAD) this.generateChunk(theme);
  }

  pruneChunks() {
    while (this.chunks.length && this.chunks[0].endDistance < this.carDistance - REMOVE_BEHIND) {
      const chunk = this.chunks.shift();
      this.trackGroup.remove(chunk.group);
      chunk.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
      });
      if (this.trackObjects) {
        this.trackObjects = this.trackObjects.filter((mesh) => mesh.userData.distance >= this.carDistance - REMOVE_BEHIND);
      }
    }
  }

  checkTrackObjects() {
    if (!this.trackObjects) return;
    for (const mesh of this.trackObjects) {
      const data = mesh.userData;
      if (data.type === "coin" && data.collected) continue;
      const distanceDelta = Math.abs(data.distance - this.carDistance);
      if (distanceDelta > 1.6) continue;
      const magnet = data.type === "coin" ? this.coinMagnetBonus || 0 : 0;
      const lateralDelta = Math.abs(data.lateral - this.carLateral);
      if (lateralDelta > data.radius + CAR_HALF_WIDTH + magnet) continue;

      if (data.type === "coin") {
        data.collected = true;
        mesh.visible = false;
        this.coinsThisRun += 1;
        hubAudio.coin();
      } else if (data.type === "obstacle" && this.crashCooldown <= 0) {
        this.shields -= 1;
        this.crashCooldown = 1.4;
        this.carLateral = clamp(this.carLateral * 0.4, -3, 3);
        this.speed = BASE_SPEED * this.difficultyScale.speed * 0.6;
        if (this.shields <= 0) {
          if (this.reviveAvailable) {
            this.reviveAvailable = false;
            this.shields = 2;
            hubAudio.coin();
            this.hub.toast("Jeton de Résurrection", "Une seconde chance t'est accordée !");
          } else {
            hubAudio.fail();
            this.endRun();
            return;
          }
        } else {
          hubAudio.hit();
        }
      }
    }
  }

  placeCar() {
    const point = this.pointAtDistance(this.carDistance);
    const perpX = Math.cos(point.heading);
    const perpZ = Math.sin(point.heading);
    this.car.position.set(point.x + perpX * this.carLateral, 0, point.z + perpZ * this.carLateral);
    this.car.rotation.y = point.heading + (this.carLateral - (this.previousLateral ?? this.carLateral)) * 0.06;
    this.car.rotation.z = clamp(-((this.carLateral - (this.previousLateral ?? this.carLateral)) * 0.4), -0.35, 0.35);
    this.previousLateral = this.carLateral;
  }

  updateCamera() {
    if (!this.car) return;
    const behind = new THREE.Vector3(0, 4.1, 8.6).applyEuler(new THREE.Euler(0, this.car.rotation.y, 0));
    const targetPosition = this.car.position.clone().add(behind);
    this.camera.position.lerp(targetPosition, 0.12);
    const lookTarget = this.car.position.clone().add(new THREE.Vector3(0, 1, 0));
    this.camera.lookAt(lookTarget);
    this.camera.fov = lerp(this.camera.fov, this.boostTimer > 0 ? 78 : 68, 0.08);
    this.camera.updateProjectionMatrix();
    if (this.chaseLight) {
      this.chaseLight.position.set(this.car.position.x, this.car.position.y + 4, this.car.position.z + 5);
    }
  }

  updateTrail(dt, theme) {
    if (this.drifting || this.boostTimer > 0) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.accent2), transparent: true, opacity: 0.85 }),
      );
      spark.position.copy(this.car.position).add(new THREE.Vector3(0, 0.3, 1.6));
      spark.userData.life = 0.5;
      this.trailGroup.add(spark);
    }
    for (let i = this.trailGroup.children.length - 1; i >= 0; i -= 1) {
      const child = this.trailGroup.children[i];
      child.userData.life -= dt;
      child.material.opacity = clamp(child.userData.life / 0.5, 0, 1);
      child.scale.multiplyScalar(1 + dt * 0.6);
      if (child.userData.life <= 0) {
        this.trailGroup.remove(child);
        child.geometry.dispose();
        child.material.dispose();
      }
    }
  }

  updateHud(reset) {
    if (!this.hud) return;
    this.hud.querySelector("[data-field='distance']").textContent = `${Math.floor(this.carDistance)} m`;
    this.hud.querySelector("[data-field='speed']").textContent = `${Math.floor(this.speed * 3.2)} kn`;
    this.hud.querySelector("[data-field='coins']").textContent = formatNumber(this.coinsThisRun);
    this.hud.querySelector("[data-field='shields']").innerHTML = Array.from({ length: 3 })
      .map((_, i) => `<span class="shield-dot ${i < this.shields ? "on" : ""}"></span>`)
      .join("");
    this.hud.querySelector("[data-field='boostFill']").style.width = `${Math.round(this.boostCharge * 100)}%`;
    const rivalStat = this.hud.querySelector("[data-field='rivalStat']");
    if (this.mode === "nova") {
      rivalStat.hidden = false;
      this.hud.querySelector("[data-field='rivalLabel']").textContent = "Nova";
      this.hud.querySelector("[data-field='rivalDistance']").textContent = `${Math.floor(this.novaDistance || 0)} m`;
    } else if (this.duoStage) {
      rivalStat.hidden = false;
      this.hud.querySelector("[data-field='rivalLabel']").textContent = this.duoStage === "p1" ? "Joueur 1" : "Joueur 2";
      this.hud.querySelector("[data-field='rivalDistance']").textContent =
        this.duoStage === "p2" && this.p1Distance !== undefined ? `Rival : ${Math.floor(this.p1Distance)} m` : "";
    } else {
      rivalStat.hidden = true;
    }
    if (reset) this.resultsPanel.classList.remove("visible");
  }

  endRun() {
    this.crashed = true;
    this.running = false;
    const baseReward = Math.round(this.carDistance * 0.05) + this.coinsThisRun * 2;
    const scaledReward = Math.max(1, Math.round(baseReward * this.difficultyScale.reward));

    if (this.duoStage === "p1") {
      this.p1Distance = this.carDistance;
      this.store.setRecord("rally", this.carDistance);
      this.resultsPanel.querySelector("[data-field='resultTitle']").textContent = "Tour du Joueur 1 terminé";
      const duelLine = this.resultsPanel.querySelector("[data-field='duelLine']");
      duelLine.hidden = false;
      this.resultsPanel.querySelector("[data-field='duelResult']").textContent =
        "Au tour du Joueur 2 de battre ce score !";
      this.resultsPanel.querySelector("[data-field='finalDistance']").textContent = `${Math.floor(this.carDistance)} m`;
      this.resultsPanel.querySelector("[data-field='bestDistance']").textContent = `${Math.floor(this.store.data.records.rally)} m`;
      this.resultsPanel.querySelector("[data-field='reward']").textContent = "En attente du Joueur 2";
      this.resultsPanel.querySelector(".rally-results__button").textContent = "Lancer le tour du Joueur 2";
      this.pendingDuoStart = { seed: this.runSeed, duoStage: "p2", keepItems: true };
      this.resultsPanel.classList.add("visible");
      return;
    }

    let reward = scaledReward;
    let resultTitle = "Collision !";
    let duelText = "";
    if (this.duoStage === "p2") {
      const winner = this.carDistance >= this.p1Distance ? "Joueur 2" : "Joueur 1";
      duelText = `${winner} remporte le duel ! (J1 : ${Math.floor(this.p1Distance)} m • J2 : ${Math.floor(this.carDistance)} m)`;
      resultTitle = "Duel terminé";
    } else if (this.mode === "nova") {
      const won = this.carDistance >= this.novaDistance;
      duelText = won
        ? `Tu devances Nova de ${Math.floor(this.carDistance - this.novaDistance)} m !`
        : `Nova finit devant toi de ${Math.floor(this.novaDistance - this.carDistance)} m.`;
      if (won) reward = Math.round(reward * 1.25);
      resultTitle = won ? "Victoire contre Nova !" : "Nova l'emporte";
    }

    reward = this.store.award(reward, "Neon Canopy Rally");
    this.store.setRecord("rally", this.carDistance);
    this.resultsPanel.querySelector("[data-field='resultTitle']").textContent = resultTitle;
    const duelLine = this.resultsPanel.querySelector("[data-field='duelLine']");
    if (duelText) {
      duelLine.hidden = false;
      this.resultsPanel.querySelector("[data-field='duelResult']").textContent = duelText;
    } else {
      duelLine.hidden = true;
    }
    this.resultsPanel.querySelector("[data-field='finalDistance']").textContent = `${Math.floor(this.carDistance)} m`;
    this.resultsPanel.querySelector("[data-field='bestDistance']").textContent = `${Math.floor(this.store.data.records.rally)} m`;
    this.resultsPanel.querySelector("[data-field='reward']").textContent = `+${reward} N`;
    this.resultsPanel.querySelector(".rally-results__button").textContent = "Relancer la course";
    this.duoStage = null;
    this.resultsPanel.classList.add("visible");
  }

  onModeChanged() {
    // Un changement de mode en cours de run sera appliqué au prochain lancement.
  }

  render() {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }
}

function toVec3(flatArray) {
  const points = [];
  for (let i = 0; i < flatArray.length; i += 3) {
    points.push(new THREE.Vector3(flatArray[i], flatArray[i + 1], flatArray[i + 2]));
  }
  return points;
}
