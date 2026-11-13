/*
 * Synthesized egg "crack": a few fast filtered noise bursts (the shell snapping) and a tiny falling sine "drip".
 * `planCrack` is pure (testable with a fake random source); `playCrack` renders a plan with the Web Audio API.
 * No audio files, no dependencies. The AudioContext is created lazily on the first call, which always comes from
 * a user gesture (click / Enter / Space), and is reused afterwards. Any failure is silent.
 */

/** Every burst ends inside this window (seconds). */
export const CRACK_WINDOW = 0.08;

export type CrackBurst = {
  /** Start offset in seconds from the crack start. */
  at: number;
  duration: number;
  /** Peak gain before the exponential decay. */
  gain: number;
  /** Band-pass centre frequency (Hz). */
  frequency: number;
  q: number;
};

export type CrackDrip = { at: number; duration: number; gain: number; from: number; to: number };

export type CrackPlan = { bursts: CrackBurst[]; drip: CrackDrip };

const between = (random: () => number, min: number, max: number) => min + random() * (max - min);

/** Builds a slightly different crack on every call: 3–5 decaying clicks inside 80 ms, then a quiet drip. */
export function planCrack(random: () => number = Math.random): CrackPlan {
  const count = 3 + Math.min(2, Math.floor(random() * 3));
  const bursts: CrackBurst[] = [];
  let at = 0;
  let gain = between(random, 0.55, 0.7);

  for (let i = 0; i < count; i++) {
    if (i > 0) {
      // Max 4 gaps × 16 ms + 14 ms burst = 78 ms, inside the window.
      at += between(random, 0.006, 0.016);
      gain *= between(random, 0.55, 0.85);
    }
    bursts.push({
      at,
      duration: between(random, 0.005, 0.014),
      gain,
      frequency: between(random, 2000, 5000),
      q: between(random, 0.8, 2.5),
    });
  }

  const last = bursts[bursts.length - 1];
  const from = between(random, 650, 1000);
  const drip: CrackDrip = {
    at: last.at + last.duration + between(random, 0.01, 0.03),
    duration: between(random, 0.06, 0.1),
    gain: between(random, 0.08, 0.14),
    from,
    to: from * between(random, 0.4, 0.55),
  };

  return { bursts, drip };
}

/** Overall volume: moderate, the bursts already peak below 0.7. */
const MASTER_GAIN = 0.45;
const SILENCE = 0.0001;

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function getContext(): AudioContext | null {
  if (context) return context;
  const w = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

function getNoise(ac: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  const length = Math.ceil(ac.sampleRate * 0.25);
  noise = ac.createBuffer(1, length, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

/** Plays one egg crack. Call it only from a user gesture handler; never autoplays. Fails silently. */
export function playCrack(random: () => number = Math.random): void {
  if (typeof window === "undefined") return;
  try {
    const ac = getContext();
    if (!ac) return;
    if (ac.state === "suspended") void ac.resume().catch(() => {});

    const plan = planCrack(random);
    const start = ac.currentTime + 0.005;
    const buffer = getNoise(ac);

    const master = ac.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ac.destination);

    for (const burst of plan.bursts) {
      const t = start + burst.at;
      const source = ac.createBufferSource();
      source.buffer = buffer;

      const highpass = ac.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 1200;

      const band = ac.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = burst.frequency;
      band.Q.value = burst.q;

      const envelope = ac.createGain();
      envelope.gain.setValueAtTime(burst.gain, t);
      envelope.gain.exponentialRampToValueAtTime(SILENCE, t + burst.duration);

      source.connect(highpass).connect(band).connect(envelope).connect(master);
      // Random read offset so each burst gets a different slice of noise.
      source.start(t, random() * (buffer.duration - 0.05), burst.duration + 0.01);
    }

    const { drip } = plan;
    const dt = start + drip.at;
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(drip.from, dt);
    osc.frequency.exponentialRampToValueAtTime(drip.to, dt + drip.duration);

    const dripGain = ac.createGain();
    dripGain.gain.setValueAtTime(SILENCE, dt);
    dripGain.gain.exponentialRampToValueAtTime(drip.gain, dt + 0.006);
    dripGain.gain.exponentialRampToValueAtTime(SILENCE, dt + drip.duration);

    osc.connect(dripGain).connect(master);
    osc.onended = () => master.disconnect();
    osc.start(dt);
    osc.stop(dt + drip.duration + 0.02);
  } catch {
    // Audio is a nicety: unsupported or blocked audio must never break the page.
  }
}
