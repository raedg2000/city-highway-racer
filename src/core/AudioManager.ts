import { GameConfig } from '../config/GameConfig.js';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private readonly musicElement: HTMLAudioElement;
  private fallbackMusicTimer = 0;
  private isFallbackMusicEnabled = false;
  private musicStarted = false;
  private musicRequested = false;
  private musicEnabled = true;
  private effectsEnabled = true;
  private audioPrimed = false;
  private unlockHandler: (() => void) | null = null;

  public constructor() {
    this.musicElement = new Audio(GameConfig.audio.backgroundMusicPath);
    this.musicElement.loop = true;
    this.musicElement.volume = GameConfig.audio.musicVolume;
    this.musicElement.preload = 'auto';
    this.musicElement.setAttribute('playsinline', '');
    this.musicElement.setAttribute('webkit-playsinline', '');
    this.primeAudioOnUserGesture();
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public isEffectsEnabled(): boolean {
    return this.effectsEnabled;
  }

  public toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  public toggleEffects(): boolean {
    this.effectsEnabled = !this.effectsEnabled;
    return this.effectsEnabled;
  }

  public setMusicEnabled(isEnabled: boolean): void {
    if (this.musicEnabled === isEnabled) return;
    this.musicEnabled = isEnabled;

    if (!this.musicEnabled) {
      this.pauseBackgroundMusic();
      return;
    }

    if (this.musicRequested) void this.startBackgroundMusic();
  }

  public async startBackgroundMusic(): Promise<void> {
    this.musicRequested = true;
    if (!this.musicEnabled) return;

    this.ensureContext();
    if (this.musicStarted) return;
    this.musicStarted = true;

    try {
      await this.musicElement.play();
      this.isFallbackMusicEnabled = false;
    } catch {
      // Playback was rejected (e.g. iOS Safari outside a user gesture).
      // Allow a later retry once audio has been primed by a user gesture.
      this.musicStarted = false;
      this.isFallbackMusicEnabled = true;
    }
  }

  public async startFromUserGesture(): Promise<boolean> {
    this.musicRequested = true;
    if (!this.musicEnabled) return true;

    this.musicElement.muted = false;
    this.musicElement.volume = GameConfig.audio.musicVolume;

    const context = this.ensureContext();
    try {
      if (context?.state === 'suspended') await context.resume();
      await this.musicElement.play();
      this.musicStarted = true;
      this.isFallbackMusicEnabled = false;
      return true;
    } catch {
      this.audioPrimed = false;
      this.musicStarted = false;
      this.isFallbackMusicEnabled = true;
      return false;
    }
  }

  public stopBackgroundMusic(): void {
    this.musicRequested = false;
    this.pauseBackgroundMusic();
  }

  public update(deltaSeconds: number): void {
    if (!this.musicEnabled || !this.isFallbackMusicEnabled || !this.audioContext) return;
    this.fallbackMusicTimer -= deltaSeconds;
    if (this.fallbackMusicTimer > 0) return;

    this.fallbackMusicTimer = 0.18;
    const notes = [220, 277.18, 329.63, 415.3, 440, 415.3, 329.63, 277.18, 246.94, 311.13, 369.99, 493.88, 554.37, 493.88, 369.99, 311.13];
    const noteIndex = Math.floor(performance.now() / 180) % notes.length;
    this.playTone(notes[noteIndex], 0.12, 'triangle', GameConfig.audio.musicVolume * 0.075);
    if (noteIndex % 4 === 0) {
      this.playTone(notes[noteIndex] / 2, 0.18, 'sine', GameConfig.audio.musicVolume * 0.09);
    }
  }

  public playCargoCollected(): void {
    if (!this.effectsEnabled) return;
    void this.withReadyContext(() => {
      this.playTone(640, 0.08, 'sine', GameConfig.audio.effectsVolume * 0.32);
      window.setTimeout(() => {
        if (this.effectsEnabled) this.playTone(920, 0.11, 'sine', GameConfig.audio.effectsVolume * 0.28);
      }, 70);
    });
  }

  public playCrash(): void {
    if (!this.effectsEnabled) return;
    void this.withReadyContext(() => this.playCrashNow());
  }

  public prepareForPlayback(): void {
    void this.withReadyContext(() => {
      this.playTone(1, 0.01, 'sine', 0.0001);
    });
  }

  private playCrashNow(): void {
    if (!this.audioContext) return;

    const noiseLength = Math.floor(this.audioContext.sampleRate * 0.45);
    const buffer = this.audioContext.createBuffer(1, noiseLength, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLength);
    }

    const noise = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    gain.gain.value = GameConfig.audio.effectsVolume;
    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    noise.start();

    this.playTone(82, 0.35, 'sawtooth', GameConfig.audio.effectsVolume * 0.34);
  }

  private async withReadyContext(callback: () => void): Promise<void> {
    const context = this.ensureContext();
    if (!context) return;

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        return;
      }
    }

    if (context.state !== 'closed') callback();
  }

  private pauseBackgroundMusic(): void {
    this.musicElement.pause();
    this.musicElement.currentTime = 0;
    this.isFallbackMusicEnabled = false;
    this.musicStarted = false;
  }

  private ensureContext(): AudioContext | null {
    if (!this.audioContext) {
      const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
      this.audioContext = new AudioContextConstructor();
    }

    // iOS Safari creates AudioContexts in the 'suspended' state. resume() must
    // be invoked inside a user gesture; callers ensure that.
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    return this.audioContext;
  }

  private primeAudioOnUserGesture(): void {
    const handler = (): void => {
      if (this.audioPrimed) return;
      this.audioPrimed = true;

      this.ensureContext();

      // Warm up WebAudio output by playing a 1-sample silent buffer inside
      // the user gesture. Without this, the first oscillator-based sound
      // effects can stay silent on iPadOS Safari.
      if (this.audioContext) {
        try {
          const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
          const source = this.audioContext.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(this.audioContext.destination);
          source.start(0);
        } catch {
          // ignore — non-fatal
        }
      }

      void this.startFromUserGesture().then((didStart) => {
        if (!didStart) return;
        if (!this.musicEnabled) this.pauseBackgroundMusic();
        this.removeUnlockListeners();
      });
    };

    this.unlockHandler = handler;
    document.addEventListener('pointerdown', handler, { capture: true, passive: true });
    document.addEventListener('touchstart', handler, { capture: true, passive: true });
    document.addEventListener('keydown', handler, { capture: true });
    document.addEventListener('mousedown', handler, { capture: true });
  }

  private removeUnlockListeners(): void {
    if (!this.unlockHandler) return;
    const handler = this.unlockHandler;
    document.removeEventListener('pointerdown', handler, { capture: true } as EventListenerOptions);
    document.removeEventListener('touchstart', handler, { capture: true } as EventListenerOptions);
    document.removeEventListener('keydown', handler, { capture: true } as EventListenerOptions);
    document.removeEventListener('mousedown', handler, { capture: true } as EventListenerOptions);
    this.unlockHandler = null;
  }

  private playTone(frequency: number, durationSeconds: number, type: OscillatorType, volume: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.0001;

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
    oscillator.start(now);
    oscillator.stop(now + durationSeconds + 0.03);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
