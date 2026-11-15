// Crystal Quarry — bac à sable voxel 3D : minage, construction, cycle jour/nuit.
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
  rand,
  makeNoise2D,
  formatNumber,
} from "/games3d/hub3d-core.js";
import { hubAudio } from "/games3d/hub-audio.js";

const ISLAND_RADIUS = 11;
const MAX_HEIGHT = 11;
const EYE_HEIGHT = 1.7;
const MOVE_SPEED = 6.4;
const GRAVITY = -22;
const JUMP_SPEED = 8;
const REACH = 6.2;
const DAY_CYCLE_SECONDS = 150;

const MINE_TIME = { grass: 0.4, dirt: 0.4, stone: 1.0, crystal: 1.5, wood: 0.55, leaves: 0.22 };
const RESOURCE_FOR_TYPE = { grass: "dirt", dirt: "dirt", stone: "stone", crystal: "crystal", wood: "wood", leaves: null };
const PLACEABLE = ["dirt", "stone", "wood", "crystal"];
const RESOURCE_LABEL = { dirt: "Terre", stone: "Pierre", wood: "Bois", crystal: "Cristal" };

export class QuarryGame extends Game3D {
  constructor(hub) {
    super(hub);
    this.keys = new KeyState();
    this.container = null;
  }

  buildDom() {
    this.container = document.createElement("div");
    this.container.className = "engine3d engine3d--quarry";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "engine3d__canvas";
    this.container.append(this.canvas);

    this.crosshair = document.createElement("div");
    this.crosshair.className = "quarry-crosshair";
    this.container.append(this.crosshair);

    this.hud = document.createElement("div");
    this.hud.className = "engine3d__hud quarry-hud";
    this.hud.innerHTML = `
      <div class="quarry-hud__resources">
        <div class="quarry-resource" data-resource="dirt"><span>🟫</span><strong data-field="dirt">0</strong></div>
        <div class="quarry-resource" data-resource="stone"><span>⬜</span><strong data-field="stone">0</strong></div>
        <div class="quarry-resource" data-resource="wood"><span>🟧</span><strong data-field="wood">0</strong></div>
        <div class="quarry-resource" data-resource="crystal"><span>💠</span><strong data-field="crystal">0</strong></div>
      </div>
      <div class="quarry-hud__progress"><div class="quarry-hud__progress-fill" data-field="progress"></div></div>
      <div class="quarry-hud__materials" data-field="materials"></div>
      <div class="quarry-hud__hint">Glisser : regarder • MINER (maintenir) • POSER (tap) • WASD / joystick : marcher</div>
    `;
    this.container.append(this.hud);

    this.materialButtons = [];
    const materialsEl = this.hud.querySelector("[data-field='materials']");
    PLACEABLE.forEach((type, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quarry-material";
      button.textContent = RESOURCE_LABEL[type];
      button.addEventListener("click", () => {
        this.activeMaterial = type;
        this.refreshMaterialButtons();
      });
      materialsEl.append(button);
      this.materialButtons.push({ type, button });
      if (index === 0) button.classList.add("active");
    });
    this.activeMaterial = PLACEABLE[0];

    this.joystick = new VirtualJoystick(this.container, { side: "left" });
    this.mineButton = new TouchButton(this.container, { label: "MINER", side: "right", offset: 78, variant: "touch-action--mine" });
    this.placeButton = new TouchButton(this.container, { label: "POSER", side: "right", offset: 0, variant: "touch-action--place" });

    this.lockButton = document.createElement("button");
    this.lockButton.type = "button";
    this.lockButton.className = "quarry-lock-button";
    this.lockButton.textContent = "Caméra FPS";
    this.lockButton.title = "Verrouiller la souris pour viser librement (Échap pour libérer)";
    this.lockButton.addEventListener("click", () => {
      if (document.pointerLockElement === this.canvas) {
        document.exitPointerLock?.();
      } else {
        this.canvas.requestPointerLock?.();
      }
    });
    this.container.append(this.lockButton);

    this.pointerLockButtons = { left: false, rightJustPressed: false };
    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === this.canvas;
      this.lockButton?.classList.toggle("is-locked", locked);
      if (this.lockButton) {
        this.lockButton.textContent = locked ? "FPS actif (Échap)" : "Caméra FPS";
      }
      if (!locked) this.pointerLockButtons.left = false;
    });
    document.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.yaw -= event.movementX * 0.0024;
      this.pitch = clamp(this.pitch - event.movementY * 0.0024, -1.3, 1.3);
    });
    this.canvas.addEventListener("mousedown", (event) => {
      if (document.pointerLockElement !== this.canvas) return;
      if (event.button === 0) this.pointerLockButtons.left = true;
      if (event.button === 2) this.pointerLockButtons.rightJustPressed = true;
    });
    this.canvas.addEventListener("mouseup", (event) => {
      if (event.button === 0) this.pointerLockButtons.left = false;
    });
    this.canvas.addEventListener("contextmenu", (event) => {
      if (document.pointerLockElement === this.canvas) event.preventDefault();
    });
    this.canvas.addEventListener("wheel", (event) => {
      if (document.pointerLockElement !== this.canvas) return;
      event.preventDefault();
      const idx = PLACEABLE.indexOf(this.activeMaterial);
      const step = event.deltaY > 0 ? 1 : -1;
      this.activeMaterial = PLACEABLE[(idx + step + PLACEABLE.length) % PLACEABLE.length];
      this.refreshMaterialButtons();
    }, { passive: false });

    this.lookDrag = { active: false, pointerId: null, lastX: 0, lastY: 0 };
    this.container.addEventListener("pointerdown", (event) => {
      if (
        document.pointerLockElement === this.canvas ||
        event.target.closest(".virtual-joystick") ||
        event.target.closest(".touch-action") ||
        event.target.closest(".quarry-hud") ||
        event.target.closest(".quarry-lock-button")
      ) {
        return;
      }
      this.lookDrag.active = true;
      this.lookDrag.pointerId = event.pointerId;
      this.lookDrag.lastX = event.clientX;
      this.lookDrag.lastY = event.clientY;
    });
    this.container.addEventListener("pointermove", (event) => {
      if (!this.lookDrag.active || event.pointerId !== this.lookDrag.pointerId) return;
      const dx = event.clientX - this.lookDrag.lastX;
      const dy = event.clientY - this.lookDrag.lastY;
      this.lookDrag.lastX = event.clientX;
      this.lookDrag.lastY = event.clientY;
      this.yaw -= dx * 0.0035;
      this.pitch = clamp(this.pitch - dy * 0.0035, -1.3, 1.3);
    });
    const endDrag = (event) => {
      if (event.pointerId === this.lookDrag.pointerId) this.lookDrag.active = false;
    };
    this.container.addEventListener("pointerup", endDrag);
    this.container.addEventListener("pointercancel", endDrag);
  }

  refreshMaterialButtons() {
    for (const entry of this.materialButtons) {
      entry.button.classList.toggle("active", entry.type === this.activeMaterial);
      entry.button.textContent = `${RESOURCE_LABEL[entry.type]} · ${this.resources[entry.type] || 0}`;
    }
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
    this.scene.fog = new THREE.Fog(new THREE.Color(theme.background).getHex(), 26, 90);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);
    this.minerArm = this.buildMinerArm(theme);
    this.camera.add(this.minerArm);
    this.scene.add(this.camera);

    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.position.set(20, 30, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -20;
    this.sun.shadow.camera.right = 20;
    this.sun.shadow.camera.top = 20;
    this.sun.shadow.camera.bottom = -20;
    this.scene.add(this.sun);
    this.ambient = new THREE.HemisphereLight(0xbfd9ff, new THREE.Color(theme.background), 0.55);
    this.scene.add(this.ambient);

    this.voxelGroup = new THREE.Group();
    this.scene.add(this.voxelGroup);

    const highlightGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(highlightGeometry),
      new THREE.LineBasicMaterial({ color: new THREE.Color(theme.hot) }),
    );
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.generateIsland(theme);
  }

  /** Avant-bras, main gantée et pioche visibles en vue première personne (anatomie simplifiée). */
  buildMinerArm(theme) {
    const group = new THREE.Group();
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xd9a876, roughness: 0.85 });
    const sleeveMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(theme.accent2), roughness: 0.7 });
    const gloveMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.8 });

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.32, 10), sleeveMaterial);
    sleeve.rotation.z = Math.PI / 2.4;
    sleeve.position.set(0.42, -0.42, -0.55);
    group.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.34, 10), skinMaterial);
    forearm.rotation.z = Math.PI / 2.4;
    forearm.position.set(0.58, -0.5, -0.72);
    group.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), gloveMaterial);
    hand.position.set(0.72, -0.56, -0.86);
    group.add(hand);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a30 }));
    handle.rotation.z = Math.PI / 3;
    handle.position.set(0.82, -0.48, -1.0);
    group.add(handle);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.07), new THREE.MeshStandardMaterial({ color: 0x9aa4ab, metalness: 0.4, roughness: 0.4 }));
    head.rotation.z = Math.PI / 3;
    head.position.set(1.0, -0.3, -1.12);
    group.add(head);

    group.userData.restPosition = { x: 0, y: 0, z: 0 };
    return group;
  }

  materialFor(theme, type) {
    const base = {
      grass: { color: 0x2f8f52 },
      dirt: { color: 0x6b4a30 },
      stone: { color: 0x7d8189 },
      wood: { color: 0x5a3c22 },
      leaves: { color: 0x2c6b3d },
      crystal: { color: new THREE.Color(theme.accent), emissive: new THREE.Color(theme.accent), emissiveIntensity: 0.7 },
    }[type];
    return new THREE.MeshStandardMaterial({
      color: base.color,
      emissive: base.emissive || 0x000000,
      emissiveIntensity: base.emissiveIntensity || 0,
      roughness: type === "crystal" ? 0.25 : 0.92,
      metalness: type === "crystal" ? 0.3 : 0,
    });
  }

  generateIsland(theme) {
    const noise = makeNoise2D(Math.floor(Math.random() * 100000));
    this.voxels = new Map();
    this.columnHeights = new Map();
    this.states = {};
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    for (const type of ["grass", "dirt", "stone", "wood", "leaves", "crystal"]) {
      const capacity = type === "grass" || type === "stone" ? 1400 : 500;
      const mesh = new THREE.InstancedMesh(cubeGeometry, this.materialFor(theme, type), capacity);
      mesh.count = 0;
      mesh.castShadow = type !== "leaves";
      mesh.receiveShadow = true;
      mesh.userData.type = type;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.voxelGroup.add(mesh);
      this.states[type] = { mesh, capacity, count: 0, keyByIndex: [] };
    }
    this.crystalMaterial = this.states.crystal.mesh.material;

    for (let x = -ISLAND_RADIUS; x <= ISLAND_RADIUS; x += 1) {
      for (let z = -ISLAND_RADIUS; z <= ISLAND_RADIUS; z += 1) {
        const distance = Math.hypot(x, z);
        if (distance > ISLAND_RADIUS) continue;
        const falloff = clamp(1 - distance / ISLAND_RADIUS, 0, 1);
        const height = Math.max(1, Math.round(2 + noise(x * 0.12, z * 0.12) * 6 * falloff + falloff * 2));
        for (let y = 0; y <= height; y += 1) {
          let type = "stone";
          if (y === height) type = "grass";
          else if (y >= height - 2) type = "dirt";
          if (type === "stone" && Math.random() < 0.05 && y < height - 2) type = "crystal";
          this.setVoxel(x, y, z, type, false);
        }
        this.columnHeights.set(`${x},${z}`, height);
        if (height > 3 && Math.random() < 0.08) this.spawnTree(x, height, z);
      }
    }
    this.refreshInstanceMatrices();

    this.playerX = 0;
    this.playerZ = 0;
    this.playerY = (this.columnHeights.get("0,0") || 4) + EYE_HEIGHT;
    this.velocityY = 0;
    this.yaw = 0;
    this.pitch = -0.15;
    this.dayTime = 40;
    this.crystalSpawnTimer = 0;
  }

  spawnTree(x, baseHeight, z) {
    const trunkHeight = 2 + Math.floor(Math.random() * 2);
    for (let i = 1; i <= trunkHeight; i += 1) this.setVoxel(x, baseHeight + i, z, "wood", false);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        this.setVoxel(x + dx, baseHeight + trunkHeight + 1, z + dz, "leaves", false);
      }
    }
    this.setVoxel(x, baseHeight + trunkHeight + 2, z, "leaves", false);
  }

  setVoxel(x, y, z, type, refresh = true) {
    const key = `${x},${y},${z}`;
    if (this.voxels.has(key)) return;
    const state = this.states[type];
    if (!state || state.count >= state.capacity) return;
    const index = state.count;
    state.keyByIndex[index] = key;
    state.count += 1;
    this.voxels.set(key, { type, index, x, y, z });
    if (refresh) {
      const matrix = new THREE.Matrix4().makeTranslation(x + 0.5, y + 0.5, z + 0.5);
      state.mesh.setMatrixAt(index, matrix);
      state.mesh.count = state.count;
      state.mesh.instanceMatrix.needsUpdate = true;
    } else {
      this.pendingMatrix = this.pendingMatrix || [];
      this.pendingMatrix.push({ type, index, x, y, z });
    }
  }

  refreshInstanceMatrices() {
    if (!this.pendingMatrix) return;
    for (const entry of this.pendingMatrix) {
      const state = this.states[entry.type];
      const matrix = new THREE.Matrix4().makeTranslation(entry.x + 0.5, entry.y + 0.5, entry.z + 0.5);
      state.mesh.setMatrixAt(entry.index, matrix);
    }
    for (const type of Object.keys(this.states)) {
      const state = this.states[type];
      state.mesh.count = state.count;
      state.mesh.instanceMatrix.needsUpdate = true;
    }
    this.pendingMatrix = null;
  }

  removeVoxel(x, y, z) {
    const key = `${x},${y},${z}`;
    const voxel = this.voxels.get(key);
    if (!voxel) return null;
    const state = this.states[voxel.type];
    const lastIndex = state.count - 1;
    if (voxel.index !== lastIndex) {
      const lastKey = state.keyByIndex[lastIndex];
      const matrix = new THREE.Matrix4();
      state.mesh.getMatrixAt(lastIndex, matrix);
      state.mesh.setMatrixAt(voxel.index, matrix);
      state.keyByIndex[voxel.index] = lastKey;
      const lastVoxel = this.voxels.get(lastKey);
      lastVoxel.index = voxel.index;
    }
    state.count -= 1;
    state.mesh.count = state.count;
    state.mesh.instanceMatrix.needsUpdate = true;
    this.voxels.delete(key);

    const colKey = `${x},${z}`;
    if ((this.columnHeights.get(colKey) ?? -1) === y) {
      let top = y - 1;
      while (top >= 0 && !this.voxels.has(`${x},${top},${z}`)) top -= 1;
      this.columnHeights.set(colKey, top);
    }
    return voxel.type;
  }

  placeVoxel(x, y, z, type) {
    if (y < 0 || y > MAX_HEIGHT) return false;
    if (this.voxels.has(`${x},${y},${z}`)) return false;
    const distanceFromPlayer = Math.hypot(x + 0.5 - this.playerX, z + 0.5 - this.playerZ);
    if (distanceFromPlayer < 0.7 && y >= Math.floor(this.playerY - EYE_HEIGHT) && y <= Math.ceil(this.playerY)) return false;
    this.setVoxel(x, y, z, type);
    const colKey = `${x},${z}`;
    if (y > (this.columnHeights.get(colKey) ?? -1)) this.columnHeights.set(colKey, y);
    return true;
  }

  enter() {
    this.difficultyScale = this.store.difficultyOf("quarry");
    if (!this.container) {
      this.buildDom();
      this.buildScene();
      this.resources = { dirt: 6, stone: 4, wood: 4, crystal: 0 };
      if (this.store.consumeItem("starterPack")) {
        this.resources.dirt += 10;
        this.resources.stone += 10;
        this.resources.wood += 10;
        this.hub.toast("Kit de Démarrage", "+10 de chaque ressource");
      }
      this.reachBonus = this.store.consumeItem("magnet") ? 2.2 : 0;
      if (this.reachBonus) this.hub.toast("Aimant à Pièces", "Portée de minage augmentée");
      this.refreshMaterialButtons();
      this.updateResourceHud();
      this.hub.mountEngine(this.container);
    } else {
      this.hub.mountEngine(this.container);
    }
    this.keys.attach();
    this.resize(this.hub.viewportWidth(), this.hub.viewportHeight());
  }

  exit() {
    this.keys.detach();
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
    }
  }

  onQualityChanged(quality) {
    if (!this.renderer) return;
    configureRenderer(this.renderer, THREE, quality);
    this.resize(this.hub.viewportWidth(), this.hub.viewportHeight());
  }

  dispose() {
    this.joystick?.dispose();
    this.mineButton?.dispose();
    this.placeButton?.dispose();
    this.renderer?.dispose();
  }

  resize(width, height) {
    if (!this.renderer) return;
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  raycastTarget() {
    const direction = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    const origin = new THREE.Vector3(this.playerX, this.playerY, this.playerZ);
    const raycaster = new THREE.Raycaster(origin, direction, 0.01, REACH + (this.reachBonus || 0));
    const meshes = Object.values(this.states).map((state) => state.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const type = hit.object.userData.type;
    const state = this.states[type];
    const key = state.keyByIndex[hit.instanceId];
    const voxel = this.voxels.get(key);
    if (!voxel) return null;
    return { voxel, point: hit.point, normal: hit.face.normal.clone() };
  }

  update(delta) {
    if (!this.renderer) return;
    const dt = Math.min(delta, 0.05);
    const theme = PALETTES[this.store.data.theme] || PALETTES.verdant;
    const pad = readGamepad();

    const axisX = (this.keys.isDown("KeyD") ? 1 : 0) - (this.keys.isDown("KeyA") ? 1 : 0) + this.joystick.axis.x + pad.axisX;
    const axisZ = (this.keys.isDown("KeyS") ? 1 : 0) - (this.keys.isDown("KeyW") ? 1 : 0) + this.joystick.axis.y + pad.axisY;
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const move = new THREE.Vector3()
      .addScaledVector(forward, -axisZ)
      .addScaledVector(right, axisX);
    if (move.lengthSq() > 1) move.normalize();

    this.playerX += move.x * MOVE_SPEED * dt;
    this.playerZ += move.z * MOVE_SPEED * dt;
    const distanceFromCenter = Math.hypot(this.playerX, this.playerZ);
    if (distanceFromCenter > ISLAND_RADIUS - 0.5) {
      const scale = (ISLAND_RADIUS - 0.5) / distanceFromCenter;
      this.playerX *= scale;
      this.playerZ *= scale;
    }

    const groundHeight = this.columnHeights.get(`${Math.round(this.playerX)},${Math.round(this.playerZ)}`);
    const groundY = (groundHeight ?? 0) + 1 + EYE_HEIGHT;
    this.velocityY += GRAVITY * dt;
    this.playerY += this.velocityY * dt;
    if (this.playerY <= groundY) {
      this.playerY = groundY;
      this.velocityY = 0;
      if (this.keys.wasPressed("Space")) this.velocityY = JUMP_SPEED;
    }

    this.camera.position.set(this.playerX, this.playerY, this.playerZ);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    const target = this.raycastTarget();
    if (target) {
      this.highlight.visible = true;
      this.highlight.position.set(target.voxel.x + 0.5, target.voxel.y + 0.5, target.voxel.z + 0.5);
    } else {
      this.highlight.visible = false;
    }

    const mining = this.keys.isDown("KeyE") || this.mineButton.pressed || this.pointerLockButtons?.left || pad.actionA;
    if (mining && target) {
      const key = `${target.voxel.x},${target.voxel.y},${target.voxel.z}`;
      if (this.miningKey !== key) {
        this.miningKey = key;
        this.miningProgress = 0;
      }
      this.miningProgress += dt;
      const required = (MINE_TIME[target.voxel.type] || 0.5) * (this.difficultyScale?.spawn ?? 1);
      this.hud.querySelector("[data-field='progress']").style.width = `${clamp((this.miningProgress / required) * 100, 0, 100)}%`;
      if (this.miningProgress >= required) {
        this.mineComplete(target.voxel, theme);
        this.miningKey = null;
        this.miningProgress = 0;
      }
    } else {
      this.miningKey = null;
      this.miningProgress = 0;
      this.hud.querySelector("[data-field='progress']").style.width = "0%";
    }

    this.armSwingTime = (this.armSwingTime || 0) + (mining && target ? dt * 9 : dt * 2.5);
    if (mining && target) {
      this.minerArm.rotation.x = Math.sin(this.armSwingTime) * 0.28;
      this.minerArm.position.z = Math.sin(this.armSwingTime) * 0.06;
    } else {
      this.minerArm.rotation.x = lerp(this.minerArm.rotation.x, 0, 0.1);
      this.minerArm.position.z = lerp(this.minerArm.position.z, 0, 0.1);
    }

    const lockPlace = Boolean(this.pointerLockButtons?.rightJustPressed);
    if (this.pointerLockButtons) this.pointerLockButtons.rightJustPressed = false;
    if ((this.keys.wasPressed("KeyF") || this.placeButton.consumeJustPressed() || lockPlace) && target) {
      const resourceCount = this.resources[this.activeMaterial] || 0;
      if (resourceCount > 0) {
        const placeX = target.voxel.x + Math.round(target.normal.x);
        const placeY = target.voxel.y + Math.round(target.normal.y);
        const placeZ = target.voxel.z + Math.round(target.normal.z);
        if (this.placeVoxel(placeX, placeY, placeZ, this.activeMaterial)) {
          hubAudio.place();
          this.resources[this.activeMaterial] -= 1;
          this.refreshMaterialButtons();
          this.updateResourceHud();
        }
      }
    }

    this.dayTime += dt;
    const cycle = (this.dayTime % DAY_CYCLE_SECONDS) / DAY_CYCLE_SECONDS;
    const dayFactor = clamp(Math.sin(cycle * Math.PI * 2) * 0.5 + 0.5, 0, 1);
    this.sun.intensity = lerp(0.12, 1.05, dayFactor);
    this.ambient.intensity = lerp(0.15, 0.55, dayFactor);
    const skyColor = new THREE.Color(theme.background).lerp(new THREE.Color("#274a63"), dayFactor * 0.6);
    this.scene.background = skyColor;
    this.scene.fog.color = skyColor;
    if (this.crystalMaterial) this.crystalMaterial.emissiveIntensity = lerp(1.1, 0.5, dayFactor);

    this.crystalSpawnTimer += dt;
    if (this.crystalSpawnTimer > 9) {
      this.crystalSpawnTimer = 0;
      this.trySpawnCrystal();
    }

    this.updateParticles(dt);
    this.keys.endFrame();
    this.store.scheduleSave(dt);
  }

  trySpawnCrystal() {
    const stoneKeys = Array.from(this.voxels.entries()).filter(([, v]) => v.type === "stone");
    if (!stoneKeys.length) return;
    const [key, voxel] = stoneKeys[Math.floor(Math.random() * stoneKeys.length)];
    this.voxels.delete(key);
    const state = this.states.stone;
    const lastIndex = state.count - 1;
    if (voxel.index !== lastIndex) {
      const lastKey = state.keyByIndex[lastIndex];
      const matrix = new THREE.Matrix4();
      state.mesh.getMatrixAt(lastIndex, matrix);
      state.mesh.setMatrixAt(voxel.index, matrix);
      state.keyByIndex[voxel.index] = lastKey;
      this.voxels.get(lastKey).index = voxel.index;
    }
    state.count -= 1;
    state.mesh.count = state.count;
    state.mesh.instanceMatrix.needsUpdate = true;
    this.setVoxel(voxel.x, voxel.y, voxel.z, "crystal");
  }

  mineComplete(voxel, theme) {
    const type = this.removeVoxel(voxel.x, voxel.y, voxel.z);
    const resource = RESOURCE_FOR_TYPE[type];
    if (resource) {
      this.resources[resource] = (this.resources[resource] || 0) + 1;
      this.refreshMaterialButtons();
      this.updateResourceHud();
    }
    if (type === "crystal") {
      hubAudio.coin();
      this.store.award(Math.max(1, Math.round(4 * (this.difficultyScale?.reward ?? 1))), "Crystal Quarry");
      const total = (this.store.data.records.quarry || 0) + 1;
      this.store.setRecord("quarry", total);
    } else {
      hubAudio.mine();
    }
    this.spawnBurst(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5, type === "crystal" ? theme.accent : "#cccccc");
  }

  spawnBurst(x, y, z, color) {
    for (let i = 0; i < 6; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      particle.position.set(x, y, z);
      particle.userData.velocity = new THREE.Vector3(rand(-2, 2), rand(2, 4), rand(-2, 2));
      particle.userData.life = 0.6;
      this.particleGroup.add(particle);
    }
  }

  updateParticles(dt) {
    for (let i = this.particleGroup.children.length - 1; i >= 0; i -= 1) {
      const particle = this.particleGroup.children[i];
      particle.userData.velocity.y += GRAVITY * 0.4 * dt;
      particle.position.addScaledVector(particle.userData.velocity, dt);
      particle.userData.life -= dt;
      particle.material.opacity = clamp(particle.userData.life / 0.6, 0, 1);
      if (particle.userData.life <= 0) {
        this.particleGroup.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
      }
    }
  }

  updateResourceHud() {
    for (const type of Object.keys(RESOURCE_LABEL)) {
      const field = this.hud.querySelector(`[data-field='${type}']`);
      if (field) field.textContent = formatNumber(this.resources[type] || 0);
    }
  }

  render() {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }
}
