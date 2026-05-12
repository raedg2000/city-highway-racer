import { GameConfig } from '../config/GameConfig.js';
export class AudioManager {
    audioContext = null;
    musicElement;
    fallbackMusicTimer = 0;
    isFallbackMusicEnabled = false;
    musicStarted = false;
    musicRequested = false;
    musicEnabled = true;
    effectsEnabled = true;
    constructor() {
        this.musicElement = new Audio(GameConfig.audio.backgroundMusicPath);
        this.musicElement.loop = true;
        this.musicElement.volume = GameConfig.audio.musicVolume;
        this.musicElement.preload = 'auto';
    }
    isMusicEnabled() {
        return this.musicEnabled;
    }
    isEffectsEnabled() {
        return this.effectsEnabled;
    }
    toggleMusic() {
        this.setMusicEnabled(!this.musicEnabled);
        return this.musicEnabled;
    }
    toggleEffects() {
        this.effectsEnabled = !this.effectsEnabled;
        return this.effectsEnabled;
    }
    setMusicEnabled(isEnabled) {
        if (this.musicEnabled === isEnabled)
            return;
        this.musicEnabled = isEnabled;
        if (!this.musicEnabled) {
            this.pauseBackgroundMusic();
            return;
        }
        if (this.musicRequested)
            void this.startBackgroundMusic();
    }
    async startBackgroundMusic() {
        this.musicRequested = true;
        if (!this.musicEnabled)
            return;
        this.ensureContext();
        if (this.musicStarted)
            return;
        this.musicStarted = true;
        try {
            await this.musicElement.play();
        }
        catch {
            this.isFallbackMusicEnabled = true;
        }
    }
    stopBackgroundMusic() {
        this.musicRequested = false;
        this.pauseBackgroundMusic();
    }
    update(deltaSeconds) {
        if (!this.musicEnabled || !this.isFallbackMusicEnabled || !this.audioContext)
            return;
        this.fallbackMusicTimer -= deltaSeconds;
        if (this.fallbackMusicTimer > 0)
            return;
        this.fallbackMusicTimer = 0.18;
        const notes = [220, 277.18, 329.63, 415.3, 440, 415.3, 329.63, 277.18, 246.94, 311.13, 369.99, 493.88, 554.37, 493.88, 369.99, 311.13];
        const noteIndex = Math.floor(performance.now() / 180) % notes.length;
        this.playTone(notes[noteIndex], 0.12, 'triangle', GameConfig.audio.musicVolume * 0.075);
        if (noteIndex % 4 === 0) {
            this.playTone(notes[noteIndex] / 2, 0.18, 'sine', GameConfig.audio.musicVolume * 0.09);
        }
    }
    playCargoCollected() {
        if (!this.effectsEnabled)
            return;
        this.ensureContext();
        this.playTone(640, 0.08, 'sine', GameConfig.audio.effectsVolume * 0.32);
        window.setTimeout(() => {
            if (this.effectsEnabled)
                this.playTone(920, 0.11, 'sine', GameConfig.audio.effectsVolume * 0.28);
        }, 70);
    }
    playCrash() {
        if (!this.effectsEnabled)
            return;
        this.ensureContext();
        if (!this.audioContext)
            return;
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
    pauseBackgroundMusic() {
        this.musicElement.pause();
        this.musicElement.currentTime = 0;
        this.isFallbackMusicEnabled = false;
        this.musicStarted = false;
    }
    ensureContext() {
        if (this.audioContext) {
            if (this.audioContext.state === 'suspended')
                void this.audioContext.resume();
            return;
        }
        const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
        this.audioContext = new AudioContextConstructor();
    }
    playTone(frequency, durationSeconds, type, volume) {
        if (!this.audioContext)
            return;
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
