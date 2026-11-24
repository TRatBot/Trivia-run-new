import { RaceEvent } from './raceLogic';

class TempleAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public handleEvent(event: RaceEvent): void {
    if (this.muted) return;
    const jitter = 0.94 + Math.random() * 0.12;

    switch (event.type) {
      case 'lane_shift':
        this.playTone(320 * jitter, 460 * jitter, 0.08, 'triangle', 0.08);
        break;
      case 'jump':
        this.playTone(240 * jitter, 580 * jitter, 0.16, 'sine', 0.12);
        break;
      case 'land':
        this.playTone(135 * jitter, 65, 0.07, 'triangle', 0.07);
        break;
      case 'obstacle_hit':
        this.playTone(145, 48, 0.24, 'sawtooth', 0.16);
        this.playTone(95, 38, 0.28, 'square', 0.11, 0.02);
        break;
      case 'trivia_start':
        // Resonant temple gong
        this.playTone(220, 210, 0.45, 'triangle', 0.14);
        this.playTone(330, 324, 0.38, 'sine', 0.1, 0.04);
        break;
      case 'trivia_choice_move':
      case 'select_move':
        this.playTone(520 * jitter, 600 * jitter, 0.055, 'triangle', 0.07);
        break;
      case 'select_lock':
        this.playTone(event.locked ? 440 : 320, event.locked ? 660 : 240, 0.12, 'triangle', 0.11);
        break;
      case 'select_preview':
        this.playTone(340 * jitter, 680 * jitter, 0.18, 'sine', 0.11);
        break;
      case 'select_blocked':
        this.playTone(165, 130, 0.14, 'sawtooth', 0.1);
        break;
      case 'trivia_correct':
        this.playTone(523.25, 523.25, 0.14, 'triangle', 0.12, 0);
        this.playTone(659.25, 659.25, 0.14, 'triangle', 0.12, 0.08);
        this.playTone(783.99, 1046.5, 0.24, 'sine', 0.14, 0.16);
        break;
      case 'trivia_wrong':
        this.playTone(240, 175, 0.2, 'sawtooth', 0.13, 0);
        this.playTone(170, 115, 0.3, 'sawtooth', 0.13, 0.14);
        break;
      case 'trivia_penalty_end':
        this.playTone(392, 523.25, 0.16, 'triangle', 0.1);
        break;
      case 'countdown_tick':
        this.playTone(440, 440, 0.14, 'triangle', 0.12);
        break;
      case 'race_go':
        this.playTone(587.33, 880, 0.28, 'triangle', 0.16);
        break;
      case 'race_win':
        this.playTone(523.25, 523.25, 0.15, 'triangle', 0.14, 0);
        this.playTone(659.25, 659.25, 0.15, 'triangle', 0.14, 0.11);
        this.playTone(783.99, 783.99, 0.15, 'triangle', 0.14, 0.22);
        this.playTone(1046.5, 1046.5, 0.48, 'sine', 0.16, 0.34);
        break;
    }
  }
}

export const templeAudio = new TempleAudioEngine();
