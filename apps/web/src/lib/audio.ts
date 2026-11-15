import { useCallback, useSyncExternalStore } from "react";

const MUTE_KEY = "novaplay:muted";
const MUTE_EVENT = "novaplay:mute-change";

let audioContext: AudioContext | null = null;

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeMute(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === MUTE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(MUTE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(MUTE_EVENT, callback);
  };
}

export function isMuted(): boolean {
  return readMuted();
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    window.dispatchEvent(new Event(MUTE_EVENT));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function useMuted(): { muted: boolean; toggleMuted: () => void } {
  const muted = useSyncExternalStore(subscribeMute, readMuted, () => false);
  const toggleMuted = useCallback(() => {
    setMuted(!readMuted());
  }, []);
  return { muted, toggleMuted };
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined" || readMuted()) return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    audioContext = new Ctx();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => {});
  }
  return audioContext;
}

export function playTone(
  frequency: number,
  duration = 0.09,
  type: OscillatorType = "sine",
  volume = 0.08,
  slideTo?: number,
): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (slideTo !== undefined) {
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

export const sfx = {
  click: () => playTone(520, 0.045, "triangle", 0.05, 620),
  pickup: () => {
    playTone(580, 0.07, "sine", 0.07, 880);
    setTimeout(() => playTone(880, 0.09, "sine", 0.06, 1180), 45);
  },
  merge: (level = 1) => {
    const base = Math.min(960, 260 + level * 38);
    playTone(base, 0.1, "triangle", 0.075, base * 1.35);
  },
  bounce: () => playTone(360, 0.055, "triangle", 0.065, 480),
  brick: () => playTone(640, 0.065, "square", 0.04, 420),
  flag: () => playTone(440, 0.06, "triangle", 0.055, 330),
  simon: (sector: number) => {
    const freqs = [329.63, 392.0, 493.88, 659.25];
    playTone(freqs[sector % freqs.length] ?? 440, 0.22, "sine", 0.085);
  },
  win: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      setTimeout(() => playTone(freq, 0.14, "triangle", 0.07), idx * 75);
    });
  },
  fail: () => {
    playTone(260, 0.18, "sawtooth", 0.065, 110);
    setTimeout(() => playTone(165, 0.24, "sawtooth", 0.055, 75), 110);
  },
};
