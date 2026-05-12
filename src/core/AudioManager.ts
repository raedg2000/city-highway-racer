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

  public constructor() {
    this.musicElement = new Audio(GameConfig.audio.backgroundMusicPath);
    this.musicElement.loop = true;
    this.musicElement.volume = GameConfig.audio.musicVolume;
    this.musicElement.preload = 'auto';
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
    } catch {
      this.isFallbackMusicEnabled = true;
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
    this.ensureContext();
    this.playTone(640, 0.08, 'sine', GameConfig.audio.effectsVolume * 0.32);
    window.setTimeout(() => {
      if (this.effectsEnabled) this.playTone(920, 0.11, 'sine', GameConfig.audio.effectsVolume * 0.28);
    }, 70);
  }

  public playCrash(): void {
    if (!this.effectsEnabled) return;
    this.ensureContext();
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

  private pauseBackgroundMusic(): void {
    this.musicElement.pause();
    this.musicElement.currentTime = 0;
    this.isFallbackMusicEnabled = false;
    this.musicStarted = false;
  }

  private ensureContext(): void {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') void this.audioContext.resume();
      return;
    }

    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    this.audioContext = new AudioContextConstructor();
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
