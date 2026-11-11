// Procedural Web Audio API Synthesizer for Orbit Deflect: Bouncy Shield
// Includes iconic PUBG-style Cast Iron Frying Pan "TING!", Lightsaber hum, Tomato splat, and Gift fanfare.

import { ProjectileSkinId, ShieldSkinId } from './catalog';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (typeof navigator !== 'undefined' && navigator.webdriver) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private pitchJitter(baseFreq: number, pct = 0.06): number {
    return baseFreq * (1 + (Math.random() * 2 - 1) * pct);
  }

  public playDeflect(
    isPower: boolean = false,
    combo: number = 1,
    shieldSkin: ShieldSkinId = 'iron',
    projectileSkin: ProjectileSkinId = 'bullet'
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Iconic PUBG-style Cast Iron Frying Pan "TING!"
    if (shieldSkin === 'pan') {
      const panFreqs = [1180, 1765, 2540, 3420];
      panFreqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        const jittered = this.pitchJitter(f, 0.02);
        osc.frequency.setValueAtTime(jittered, now);
        osc.frequency.exponentialRampToValueAtTime(jittered * 0.985, now + 0.42);

        const amp = (isPower ? 0.22 : 0.16) / (idx + 1);
        gain.gain.setValueAtTime(amp, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42 - idx * 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.44);
      });
      return;
    }

    // 2. Lightsaber Plasma Clash
    if (shieldSkin === 'lightsaber') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.pitchJitter(180, 0.05), now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
      return;
    }

    // 3. Rotten Tomato Splat / Donut Pop
    if (projectileSkin === 'tomato' || shieldSkin === 'donut') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    // Standard Metallic / Rune / Vinyl Chime
    const comboStep = Math.min(12, combo - 1);
    const rootFreq = this.pitchJitter(430 * Math.pow(1.045, comboStep), 0.04);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isPower ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(rootFreq, now);
    osc.frequency.exponentialRampToValueAtTime(rootFreq * 1.45, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(rootFreq * 0.85, now + 0.22);

    gain.gain.setValueAtTime(isPower ? 0.22 : 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playAimTelegraph() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const f = this.pitchJitter(540, 0.06);
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.35, now + 0.14);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playEnemyShoot(archetype: string) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = archetype === 'bastion' ? 'sawtooth' : 'square';
    const startFreq = archetype === 'bastion' ? 210 : 320;
    osc.frequency.setValueAtTime(this.pitchJitter(startFreq), now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.11);

    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playEnemyKill(isBankShot: boolean = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = isBankShot ? [523.25, 659.25, 783.99, 1046.5] : [440, 587.33, 659.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.038);
      gain.gain.setValueAtTime(0.13, now + idx * 0.038);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.038 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.038);
      osc.stop(now + idx * 0.038 + 0.19);
    });
  }

  public playGiftPickup() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 783.99, 987.77, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.15, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.24);
    });
  }

  public playPlayerHurt() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(52, now + 0.32);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playPulseParry() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.16);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playWaveClear() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.36);
    });
  }
}

export const soundEngine = new SoundEngine();
