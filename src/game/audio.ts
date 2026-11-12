// Procedural Web Audio API Synthesizer for Orbit Deflect: Bouncy Shield
// Includes unmistakable Bullet-on-Shield Ricochet Bounce SFX, vocal "Aahh!" pain cry when player is hit,
// shield rotation whoosh SFX, and distinct enemy weapon firing sounds.

import { ProjectileSkinId, ShieldSkinId } from './catalog';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  private lastRotateSfxTime: number = 0;

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

  public playUiClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.055);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playStartGame() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.045);
      gain.gain.setValueAtTime(0.11, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.2);
    });
  }

  // Aerodynamic Shield Rotation Whoosh / Plasma Hum Sound
  public playShieldRotate(angularSpeed: number, shieldSkin: ShieldSkinId = 'iron') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (now - this.lastRotateSfxTime < 0.09) return;
    this.lastRotateSfxTime = now;

    const clampedSpeed = Math.min(18, Math.max(2, Math.abs(angularSpeed)));
    const speedRatio = (clampedSpeed - 2) / 16;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (shieldSkin === 'lightsaber') {
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420 + speedRatio * 550, now);
      const baseF = 115 + speedRatio * 90;
      osc.frequency.setValueAtTime(baseF, now);
      osc.frequency.exponentialRampToValueAtTime(baseF * 1.25, now + 0.08);
    } else {
      osc.type = 'triangle';
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(340 + speedRatio * 500, now);
      filter.Q.setValueAtTime(1.6, now);
      const baseF = 200 + speedRatio * 220;
      osc.frequency.setValueAtTime(baseF, now);
      osc.frequency.exponentialRampToValueAtTime(baseF * 0.72, now + 0.085);
    }

    const vol = 0.055 + speedRatio * 0.065;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  // Crisp Bullet-on-Shield Ricochet Bounce Sound + Shield Material Resonance
  public playDeflect(
    isPower: boolean = false,
    combo: number = 1,
    shieldSkin: ShieldSkinId = 'iron',
    projectileSkin: ProjectileSkinId = 'bullet'
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Layer A: Always play a crisp, punchy Bullet Ricochet Bounce ("PING-BOING!")
    const bounceOsc = ctx.createOscillator();
    const bounceGain = ctx.createGain();
    bounceOsc.type = 'sine';
    const comboStep = Math.min(12, combo - 1);
    const bounceStart = this.pitchJitter(520 * Math.pow(1.035, comboStep), 0.03);
    bounceOsc.frequency.setValueAtTime(bounceStart, now);
    bounceOsc.frequency.exponentialRampToValueAtTime(bounceStart * 2.35, now + 0.045);
    bounceOsc.frequency.exponentialRampToValueAtTime(bounceStart * 0.85, now + 0.19);

    bounceGain.gain.setValueAtTime(isPower ? 0.3 : 0.24, now);
    bounceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    bounceOsc.connect(bounceGain);
    bounceGain.connect(ctx.destination);
    bounceOsc.start(now);
    bounceOsc.stop(now + 0.22);

    // Layer B: Sharp metallic impact knock at t=0
    const knockOsc = ctx.createOscillator();
    const knockGain = ctx.createGain();
    knockOsc.type = 'triangle';
    knockOsc.frequency.setValueAtTime(1450, now);
    knockOsc.frequency.exponentialRampToValueAtTime(220, now + 0.035);
    knockGain.gain.setValueAtTime(0.22, now);
    knockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    knockOsc.connect(knockGain);
    knockGain.connect(ctx.destination);
    knockOsc.start(now);
    knockOsc.stop(now + 0.045);

    // Layer C: Shield-Specific Harmonic Overtones
    if (shieldSkin === 'pan') {
      const panFreqs = [1180, 1765, 2540, 3420];
      panFreqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        const jittered = this.pitchJitter(f, 0.02);
        osc.frequency.setValueAtTime(jittered, now);
        osc.frequency.exponentialRampToValueAtTime(jittered * 0.985, now + 0.42);

        const amp = (isPower ? 0.24 : 0.17) / (idx + 1);
        gain.gain.setValueAtTime(amp, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42 - idx * 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.44);
      });
      return;
    }

    if (shieldSkin === 'lightsaber') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.pitchJitter(180, 0.05), now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
      return;
    }

    if (shieldSkin === 'rune') {
      const freqs = [880, 1318.5, 1760];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(this.pitchJitter(f, 0.02), now + i * 0.02);
        gain.gain.setValueAtTime(0.12 / (i + 1), now + i * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.02);
        osc.stop(now + 0.29);
      });
      return;
    }

    if (shieldSkin === 'vinyl') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(390, now + 0.2);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
      return;
    }

    if (projectileSkin === 'tomato' || shieldSkin === 'donut') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.14);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    }
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

    gain.gain.setValueAtTime(0.038, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playEnemyShoot(archetype: string, powerLevel: number = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const powerPitch = 1 + (powerLevel - 1) * 0.08;

    if (archetype === 'marksman') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.pitchJitter(580 * powerPitch), now);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.1);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
      return;
    }

    if (archetype === 'flanker') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.pitchJitter(240 * powerPitch), now);
      osc.frequency.linearRampToValueAtTime(420, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.15);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
      return;
    }

    if (archetype === 'burst') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.pitchJitter(920 * powerPitch), now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.13);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(this.pitchJitter(175), now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
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

  // Synthesizes a realistic human vocal "Aahh!" pain cry using dual vowel formants
  public playPlayerHurt() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const voiceOsc = ctx.createOscillator();
    voiceOsc.type = 'sawtooth';
    voiceOsc.frequency.setValueAtTime(255, now);
    voiceOsc.frequency.linearRampToValueAtTime(285, now + 0.045);
    voiceOsc.frequency.exponentialRampToValueAtTime(145, now + 0.36);

    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(780, now);
    formant1.frequency.linearRampToValueAtTime(650, now + 0.36);
    formant1.Q.setValueAtTime(4.5, now);

    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1250, now);
    formant2.frequency.linearRampToValueAtTime(1080, now + 0.36);
    formant2.Q.setValueAtTime(5.0, now);

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.001, now);
    voiceGain.gain.linearRampToValueAtTime(0.45, now + 0.03);
    voiceGain.gain.setValueAtTime(0.4, now + 0.14);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    voiceOsc.connect(formant1);
    voiceOsc.connect(formant2);
    formant1.connect(voiceGain);
    formant2.connect(voiceGain);
    voiceGain.connect(ctx.destination);

    voiceOsc.start(now);
    voiceOsc.stop(now + 0.39);

    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(135, now);
    thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.2);
    thudGain.gain.setValueAtTime(0.24, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.23);
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
