// Synthétiseur Web Audio léger partagé par les hubs 2D et 3D (aucun fichier audio externe requis).
const MUTE_KEY = "novaplay:muted";

class HubAudioEngine {
  constructor() {
    this.ctx = null;
  }

  isMuted() {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  }

  setMuted(muted) {
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // Ignore storage errors
    }
  }

  toggleMuted() {
    const next = !this.isMuted();
    this.setMuted(next);
    return next;
  }

  ensureContext() {
    if (this.isMuted()) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!this.ctx) this.ctx = new Ctx();
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  tone(freq, duration = 0.08, type = "sine", volume = 0.06, slideTo = null) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  click() {
    this.tone(520, 0.04, "triangle", 0.045, 640);
  }

  coin() {
    this.tone(660, 0.07, "sine", 0.06, 980);
    setTimeout(() => this.tone(990, 0.09, "sine", 0.05, 1320), 40);
  }

  boost() {
    this.tone(240, 0.22, "sawtooth", 0.045, 620);
  }

  laser() {
    this.tone(760, 0.06, "triangle", 0.035, 320);
  }

  hit() {
    this.tone(180, 0.1, "square", 0.045, 95);
  }

  mine() {
    this.tone(300, 0.07, "triangle", 0.05, 190);
  }

  place() {
    this.tone(420, 0.055, "sine", 0.05, 520);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.13, "triangle", 0.055), i * 70);
    });
  }

  fail() {
    this.tone(240, 0.18, "sawtooth", 0.055, 105);
    setTimeout(() => this.tone(150, 0.22, "sawtooth", 0.05, 70), 100);
  }
}

export const hubAudio = new HubAudioEngine();
