// src/config/GameConfig.ts
var GameConfig = {
  canvas: {
    width: 1280,
    height: 720
  },
  road: {
    left: 260,
    right: 1020,
    laneCount: 4,
    shoulderWidth: 28,
    centerLineWidth: 8,
    dashedLineHeight: 46,
    dashedLineGap: 58
  },
  player: {
    width: 54,
    height: 82,
    screenY: 570,
    accelerationKmhPerSecond: 56,
    brakeKmhPerSecond: 84,
    dragKmhPerSecond: 2.5,
    steeringPixelsPerSecond: 450,
    maximumSpeedKmh: 160
  },
  traffic: {
    laneChangePixelsPerSecond: 116,
    accelerationKmhPerSecond: 34,
    brakingKmhPerSecond: 86,
    emergencyBrakingKmhPerSecond: 128,
    minimumCruiseSpeedKmh: 24,
    followingLookAheadMeters: 30,
    safeFrontGapMeters: 20,
    safeRearGapMeters: 17
  },
  world: {
    pixelsPerMeter: 5.75,
    entityCleanupBehindMeters: 125,
    entitySpawnAheadMeters: 155,
    scenerySpacingMeters: 25
  },
  rules: {
    speedPenaltyDelaySeconds: 5,
    speedPenaltyPointsPerSecond: 1,
    speedLimitWarmupDistanceMeters: 135,
    finishBonusBase: 950,
    safePassBonus: 25
  },
  audio: {
    backgroundMusicPath: "./assets/music/background.mp3",
    musicVolume: 0.34,
    effectsVolume: 0.55
  }
};
function laneWidth() {
  return (GameConfig.road.right - GameConfig.road.left) / GameConfig.road.laneCount;
}
function laneCenter(laneIndex) {
  return GameConfig.road.left + laneWidth() * (laneIndex + 0.5);
}

// src/core/AudioManager.ts
var AudioManager = class {
  audioContext = null;
  musicElement;
  fallbackMusicTimer = 0;
  isFallbackMusicEnabled = false;
  musicStarted = false;
  musicRequested = false;
  musicEnabled = true;
  effectsEnabled = true;
  audioPrimed = false;
  unlockHandler = null;
  constructor() {
    this.musicElement = new Audio(GameConfig.audio.backgroundMusicPath);
    this.musicElement.loop = true;
    this.musicElement.volume = GameConfig.audio.musicVolume;
    this.musicElement.preload = "auto";
    this.musicElement.setAttribute("playsinline", "");
    this.musicElement.setAttribute("webkit-playsinline", "");
    this.primeAudioOnUserGesture();
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
    if (this.musicEnabled === isEnabled) return;
    this.musicEnabled = isEnabled;
    if (!this.musicEnabled) {
      this.pauseBackgroundMusic();
      return;
    }
    if (this.musicRequested) void this.startBackgroundMusic();
  }
  async startBackgroundMusic() {
    this.musicRequested = true;
    if (!this.musicEnabled) return;
    this.ensureContext();
    if (this.musicStarted) return;
    this.musicStarted = true;
    try {
      await this.musicElement.play();
      this.isFallbackMusicEnabled = false;
    } catch {
      this.musicStarted = false;
      this.isFallbackMusicEnabled = true;
    }
  }
  stopBackgroundMusic() {
    this.musicRequested = false;
    this.pauseBackgroundMusic();
  }
  update(deltaSeconds) {
    if (!this.musicEnabled || !this.isFallbackMusicEnabled || !this.audioContext) return;
    this.fallbackMusicTimer -= deltaSeconds;
    if (this.fallbackMusicTimer > 0) return;
    this.fallbackMusicTimer = 0.18;
    const notes = [220, 277.18, 329.63, 415.3, 440, 415.3, 329.63, 277.18, 246.94, 311.13, 369.99, 493.88, 554.37, 493.88, 369.99, 311.13];
    const noteIndex = Math.floor(performance.now() / 180) % notes.length;
    this.playTone(notes[noteIndex], 0.12, "triangle", GameConfig.audio.musicVolume * 0.075);
    if (noteIndex % 4 === 0) {
      this.playTone(notes[noteIndex] / 2, 0.18, "sine", GameConfig.audio.musicVolume * 0.09);
    }
  }
  playCargoCollected() {
    if (!this.effectsEnabled) return;
    this.ensureContext();
    this.playTone(640, 0.08, "sine", GameConfig.audio.effectsVolume * 0.32);
    window.setTimeout(() => {
      if (this.effectsEnabled) this.playTone(920, 0.11, "sine", GameConfig.audio.effectsVolume * 0.28);
    }, 70);
  }
  playCrash() {
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
    filter.type = "lowpass";
    filter.frequency.value = 520;
    gain.gain.value = GameConfig.audio.effectsVolume;
    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    noise.start();
    this.playTone(82, 0.35, "sawtooth", GameConfig.audio.effectsVolume * 0.34);
  }
  pauseBackgroundMusic() {
    this.musicElement.pause();
    this.musicElement.currentTime = 0;
    this.isFallbackMusicEnabled = false;
    this.musicStarted = false;
  }
  ensureContext() {
    if (!this.audioContext) {
      const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
      this.audioContext = new AudioContextConstructor();
    }
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
  }
  primeAudioOnUserGesture() {
    const handler = () => {
      if (this.audioPrimed) return;
      this.audioPrimed = true;
      this.ensureContext();
      if (this.audioContext) {
        try {
          const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
          const source = this.audioContext.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(this.audioContext.destination);
          source.start(0);
        } catch {
        }
      }
      this.musicRequested = true;
      this.musicStarted = true;
      this.musicElement.muted = false;
      this.musicElement.volume = GameConfig.audio.musicVolume;
      const playResult = this.musicElement.play();
      if (playResult && typeof playResult.then === "function") {
        playResult.then(() => {
          this.isFallbackMusicEnabled = false;
          if (!this.musicEnabled) this.pauseBackgroundMusic();
        }).catch(() => {
          this.musicStarted = false;
          this.isFallbackMusicEnabled = true;
        });
      }
      this.removeUnlockListeners();
    };
    this.unlockHandler = handler;
    document.addEventListener("pointerdown", handler, { capture: true, passive: true });
    document.addEventListener("touchstart", handler, { capture: true, passive: true });
    document.addEventListener("keydown", handler, { capture: true });
    document.addEventListener("mousedown", handler, { capture: true });
  }
  removeUnlockListeners() {
    if (!this.unlockHandler) return;
    const handler = this.unlockHandler;
    document.removeEventListener("pointerdown", handler, { capture: true });
    document.removeEventListener("touchstart", handler, { capture: true });
    document.removeEventListener("keydown", handler, { capture: true });
    document.removeEventListener("mousedown", handler, { capture: true });
    this.unlockHandler = null;
  }
  playTone(frequency, durationSeconds, type, volume) {
    if (!this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 1e-4;
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(1e-4, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 1e-4), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(1e-4, now + durationSeconds);
    oscillator.start(now);
    oscillator.stop(now + durationSeconds + 0.03);
  }
};

// src/core/InputController.ts
var InputController = class {
  constructor(target = window) {
    this.target = target;
    this.target.addEventListener("keydown", this.onKeyDown);
    this.target.addEventListener("keyup", this.onKeyUp);
    this.target.addEventListener("pointerdown", this.onPointerDown);
  }
  pressedKeys = /* @__PURE__ */ new Set();
  physicalPressedKeys = /* @__PURE__ */ new Set();
  justPressedKeys = /* @__PURE__ */ new Set();
  virtualKeyHoldCounts = /* @__PURE__ */ new Map();
  activeVirtualPointers = /* @__PURE__ */ new Map();
  virtualControlCleanups = [];
  pointerClick = null;
  bindVirtualControls(rootElement) {
    const controls = Array.from(rootElement.querySelectorAll("[data-game-key]"));
    for (const control of controls) {
      const key = control.dataset.gameKey;
      if (!key) continue;
      const onPointerDown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.pointerClick = null;
        control.setPointerCapture?.(event.pointerId);
        this.pressVirtualKey(key, event.pointerId);
      };
      const onPointerUp = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.releaseVirtualKey(event.pointerId);
      };
      control.addEventListener("pointerdown", onPointerDown, { passive: false });
      control.addEventListener("pointerup", onPointerUp, { passive: false });
      control.addEventListener("pointercancel", onPointerUp, { passive: false });
      control.addEventListener("lostpointercapture", onPointerUp, { passive: false });
      control.addEventListener("contextmenu", this.preventDefaultEvent);
      this.virtualControlCleanups.push(() => {
        control.removeEventListener("pointerdown", onPointerDown);
        control.removeEventListener("pointerup", onPointerUp);
        control.removeEventListener("pointercancel", onPointerUp);
        control.removeEventListener("lostpointercapture", onPointerUp);
        control.removeEventListener("contextmenu", this.preventDefaultEvent);
      });
    }
  }
  destroy() {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    for (const cleanup of this.virtualControlCleanups) cleanup();
    this.virtualControlCleanups.length = 0;
    this.activeVirtualPointers.clear();
    this.virtualKeyHoldCounts.clear();
    this.pressedKeys.clear();
    this.physicalPressedKeys.clear();
    this.justPressedKeys.clear();
    this.pointerClick = null;
  }
  isPressed(...keys) {
    return keys.some((key) => this.pressedKeys.has(key));
  }
  consumePressed(...keys) {
    const wasPressed = keys.some((key) => this.justPressedKeys.has(key));
    for (const key of keys) this.justPressedKeys.delete(key);
    return wasPressed;
  }
  getPointerClick() {
    return this.pointerClick;
  }
  clearPointerClick() {
    this.pointerClick = null;
  }
  consumePointerClick() {
    const wasClicked = this.pointerClick !== null;
    this.pointerClick = null;
    return wasClicked;
  }
  consumePointerClickPoint() {
    const click = this.pointerClick;
    this.pointerClick = null;
    return click;
  }
  endFrame() {
    this.justPressedKeys.clear();
    this.pointerClick = null;
  }
  onKeyDown = (event) => {
    if (this.shouldPreventBrowserShortcut(event.key)) event.preventDefault();
    if (!this.pressedKeys.has(event.key)) this.justPressedKeys.add(event.key);
    this.physicalPressedKeys.add(event.key);
    this.pressedKeys.add(event.key);
  };
  onKeyUp = (event) => {
    if (this.shouldPreventBrowserShortcut(event.key)) event.preventDefault();
    this.physicalPressedKeys.delete(event.key);
    if (!this.hasVirtualHold(event.key)) this.pressedKeys.delete(event.key);
  };
  onPointerDown = (event) => {
    if (event.target instanceof HTMLElement && event.target.closest("[data-game-key]")) return;
    this.pointerClick = { clientX: event.clientX, clientY: event.clientY };
  };
  preventDefaultEvent = (event) => {
    event.preventDefault();
  };
  pressVirtualKey(key, pointerId) {
    if (!this.pressedKeys.has(key)) this.justPressedKeys.add(key);
    this.activeVirtualPointers.set(pointerId, key);
    this.virtualKeyHoldCounts.set(key, (this.virtualKeyHoldCounts.get(key) ?? 0) + 1);
    this.pressedKeys.add(key);
  }
  releaseVirtualKey(pointerId) {
    const key = this.activeVirtualPointers.get(pointerId);
    if (!key) return;
    this.activeVirtualPointers.delete(pointerId);
    const nextHoldCount = Math.max(0, (this.virtualKeyHoldCounts.get(key) ?? 1) - 1);
    if (nextHoldCount === 0) {
      this.virtualKeyHoldCounts.delete(key);
      if (!this.physicalPressedKeys.has(key)) this.pressedKeys.delete(key);
      return;
    }
    this.virtualKeyHoldCounts.set(key, nextHoldCount);
  }
  hasVirtualHold(key) {
    return (this.virtualKeyHoldCounts.get(key) ?? 0) > 0;
  }
  shouldPreventBrowserShortcut(key) {
    return ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar"].includes(key);
  }
};

// src/core/GameEngine.ts
var GameEngine = class {
  input = new InputController();
  audio = new AudioManager();
  canvas;
  context;
  activeScene = null;
  lastFrameTime = 0;
  animationFrameHandle = 0;
  constructor(canvas2) {
    this.canvas = canvas2;
    const context = canvas2.getContext("2d");
    if (!context) throw new Error("Unable to create 2D canvas context.");
    this.context = context;
    this.canvas.width = GameConfig.canvas.width;
    this.canvas.height = GameConfig.canvas.height;
  }
  setScene(scene) {
    this.activeScene?.exit?.();
    this.activeScene = scene;
    document.documentElement.dataset.gameScene = scene.name;
    scene.enter?.(this);
  }
  start() {
    this.lastFrameTime = performance.now();
    this.animationFrameHandle = requestAnimationFrame(this.onAnimationFrame);
  }
  stop() {
    cancelAnimationFrame(this.animationFrameHandle);
    this.input.destroy();
  }
  clientPointToCanvasPoint(clientX, clientY) {
    const bounds = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / bounds.width;
    const scaleY = this.canvas.height / bounds.height;
    return {
      x: (clientX - bounds.left) * scaleX,
      y: (clientY - bounds.top) * scaleY
    };
  }
  onAnimationFrame = (timestamp) => {
    const deltaSeconds = Math.min((timestamp - this.lastFrameTime) / 1e3, 0.05);
    this.lastFrameTime = timestamp;
    this.audio.update(deltaSeconds);
    this.activeScene?.update(deltaSeconds, this);
    this.activeScene?.render(this.context, this);
    this.input.endFrame();
    this.animationFrameHandle = requestAnimationFrame(this.onAnimationFrame);
  };
};

// src/utils/MathUtils.ts
function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
function moveTowards(current, target, maximumDelta) {
  if (Math.abs(target - current) <= maximumDelta) return target;
  return current + Math.sign(target - current) * maximumDelta;
}
function kmhToMetersPerSecond(speedKmh) {
  return speedKmh / 3.6;
}
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor(totalSeconds % 1 * 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
}
function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

// src/config/LevelFactory.ts
var cities = [
  "Cedar Town",
  "Harbor City",
  "Palm Junction",
  "Metro Bay",
  "Oakridge",
  "Sunset Port",
  "Hill Valley",
  "Lakeview",
  "Skyline City",
  "Riverbend"
];
function createLevelDefinition(levelNumber) {
  const index = Math.max(1, Math.floor(levelNumber));
  const fromCity = cities[(index - 1) % cities.length];
  const toCity = cities[index % cities.length];
  const distanceMeters = 2300 + index * 520;
  const startingMinimumSpeedKmh = clamp(25 + Math.floor((index - 1) / 3) * 5, 25, 65);
  const startingMaximumSpeedKmh = clamp(115 + Math.floor((index - 1) / 4) * 5, 110, 145);
  return {
    levelNumber: index,
    fromCity,
    toCity,
    distanceMeters,
    startingMinimumSpeedKmh,
    startingMaximumSpeedKmh,
    trafficSpawnIntervalSeconds: clamp(3.2 - index * 0.08, 1.35, 3.2),
    rearTrafficSpawnIntervalSeconds: clamp(18 - index * 0.7, 7.5, 18),
    obstacleSpawnIntervalSeconds: clamp(14 - index * 0.5, 5.6, 14),
    cargoSpawnIntervalSeconds: clamp(6.4 - index * 0.08, 4.6, 6.4),
    trafficLaneChangeChancePerSecond: clamp(0.025 + index * 0.011, 0.025, 0.18),
    speedRuleChangeDistanceMeters: clamp(1050 - index * 42, 520, 1050),
    targetCompletionSeconds: distanceMeters / ((88 + index * 2) / 3.6),
    seed: 2049 + index * 977
  };
}

// src/utils/Random.ts
var RandomNumberGenerator = class {
  seed;
  constructor(seed) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = 1664525 * this.seed + 1013904223 >>> 0;
    return this.seed / 4294967296;
  }
  range(minimum, maximum) {
    return minimum + (maximum - minimum) * this.next();
  }
  integer(minimum, maximumInclusive) {
    return Math.floor(this.range(minimum, maximumInclusive + 1));
  }
  chance(probability) {
    return this.next() < probability;
  }
  pick(items) {
    if (items.length === 0) throw new Error("Cannot pick from an empty array.");
    return items[this.integer(0, items.length - 1)];
  }
};
function deterministicNoise(index, salt) {
  let value = index * 374761393 + salt * 668265263 >>> 0;
  value = (value ^ value >> 13) >>> 0;
  value = Math.imul(value, 1274126177) >>> 0;
  return ((value ^ value >> 16) >>> 0) / 4294967296;
}

// src/rendering/CanvasDrawing.ts
function drawRoundedRectangle(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}
function fillRoundedRectangle(context, x, y, width, height, radius, fillStyle) {
  drawRoundedRectangle(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
}
function strokeRoundedRectangle(context, x, y, width, height, radius, strokeStyle, lineWidth = 2) {
  drawRoundedRectangle(context, x, y, width, height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
}
function drawOutlinedText(context, text, x, y, fillStyle = "#ffffff", strokeStyle = "rgba(0, 0, 0, 0.5)", strokeWidth = 5) {
  context.lineWidth = strokeWidth;
  context.strokeStyle = strokeStyle;
  context.strokeText(text, x, y);
  context.fillStyle = fillStyle;
  context.fillText(text, x, y);
}
function drawPanel(context, x, y, width, height, title) {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.35)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 8;
  fillRoundedRectangle(context, x, y, width, height, 18, "rgba(11, 24, 38, 0.88)");
  context.shadowBlur = 0;
  strokeRoundedRectangle(context, x, y, width, height, 18, "rgba(255, 255, 255, 0.22)", 2);
  if (title) {
    context.font = "700 30px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    drawOutlinedText(context, title, x + width / 2, y + 42, "#fef08a");
  }
  context.restore();
}
function drawButton(context, label, x, y, width, height) {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.35)";
  context.shadowBlur = 14;
  context.shadowOffsetY = 5;
  fillRoundedRectangle(context, x, y, width, height, 16, "#facc15");
  context.shadowBlur = 0;
  strokeRoundedRectangle(context, x, y, width, height, 16, "#fff7ad", 3);
  context.font = "800 26px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  drawOutlinedText(context, label, x + width / 2, y + height / 2, "#1f2937", "rgba(255,255,255,0.65)", 2);
  context.restore();
}

// src/rendering/RoadRenderer.ts
var RoadRenderer = class {
  render(context, playerDistanceMeters, speedKmh = 0) {
    const motionIntensity = clamp(speedKmh / GameConfig.player.maximumSpeedKmh, 0, 1);
    this.drawGrass(context);
    this.drawScenery(context, playerDistanceMeters, motionIntensity);
    this.drawRoad(context, playerDistanceMeters, motionIntensity);
    this.drawRoadsideSigns(context, playerDistanceMeters);
  }
  drawGrass(context) {
    const gradient = context.createLinearGradient(0, 0, GameConfig.canvas.width, 0);
    gradient.addColorStop(0, "#7fca2e");
    gradient.addColorStop(0.5, "#5fae20");
    gradient.addColorStop(1, "#83d936");
    context.fillStyle = gradient;
    context.fillRect(0, 0, GameConfig.canvas.width, GameConfig.canvas.height);
  }
  drawRoad(context, playerDistanceMeters, motionIntensity) {
    const roadLeft = GameConfig.road.left;
    const roadWidth = GameConfig.road.right - GameConfig.road.left;
    const roadGradient = context.createLinearGradient(roadLeft, 0, GameConfig.road.right, 0);
    roadGradient.addColorStop(0, "#252a31");
    roadGradient.addColorStop(0.5, "#353a42");
    roadGradient.addColorStop(1, "#252a31");
    context.fillStyle = roadGradient;
    context.fillRect(roadLeft, 0, roadWidth, GameConfig.canvas.height);
    context.fillStyle = "#1e2329";
    context.fillRect(roadLeft - GameConfig.road.shoulderWidth, 0, GameConfig.road.shoulderWidth, GameConfig.canvas.height);
    context.fillRect(GameConfig.road.right, 0, GameConfig.road.shoulderWidth, GameConfig.canvas.height);
    this.drawShoulderRumbleStrips(context, playerDistanceMeters, motionIntensity);
    context.save();
    context.beginPath();
    context.rect(roadLeft, 0, roadWidth, GameConfig.canvas.height);
    context.clip();
    this.drawAsphaltTexture(context, playerDistanceMeters, motionIntensity);
    this.drawLaneMarkers(context, playerDistanceMeters, motionIntensity);
    this.drawRoadMotionLines(context, playerDistanceMeters, motionIntensity);
    context.restore();
    context.fillStyle = "#d6d1c7";
    context.fillRect(roadLeft - GameConfig.road.shoulderWidth - 8, 0, 8, GameConfig.canvas.height);
    context.fillRect(GameConfig.road.right + GameConfig.road.shoulderWidth, 0, 8, GameConfig.canvas.height);
  }
  drawShoulderRumbleStrips(context, playerDistanceMeters, motionIntensity) {
    const spacing = 34;
    const offset = playerDistanceMeters * GameConfig.world.pixelsPerMeter * (1.25 + motionIntensity * 0.75) % spacing;
    context.save();
    context.fillStyle = "rgba(248, 250, 252, 0.55)";
    for (let y = -spacing + offset; y < GameConfig.canvas.height + spacing; y += spacing) {
      context.fillRect(GameConfig.road.left - 22, y, 12, 15);
      context.fillRect(GameConfig.road.right + 10, y, 12, 15);
    }
    context.restore();
  }
  drawLaneMarkers(context, playerDistanceMeters, motionIntensity) {
    const markerCycle = GameConfig.road.dashedLineHeight + GameConfig.road.dashedLineGap;
    const visualDistance = playerDistanceMeters * (1 + motionIntensity * 0.32);
    const offset = visualDistance * GameConfig.world.pixelsPerMeter % markerCycle;
    const width = laneWidth();
    for (let lane = 1; lane < GameConfig.road.laneCount; lane += 1) {
      const x = GameConfig.road.left + lane * width;
      for (let y = -markerCycle + offset; y < GameConfig.canvas.height + markerCycle; y += markerCycle) {
        if (motionIntensity > 0.25) {
          fillRoundedRectangle(context, x - 5, y + GameConfig.road.dashedLineHeight * 0.55, 10, GameConfig.road.dashedLineHeight * motionIntensity, 5, `rgba(248, 250, 252, ${0.14 * motionIntensity})`);
        }
        fillRoundedRectangle(context, x - 4, y, 8, GameConfig.road.dashedLineHeight, 4, "#f8fafc");
      }
    }
    context.fillStyle = "#facc15";
    context.fillRect(GameConfig.road.left + 8, 0, 4, GameConfig.canvas.height);
    context.fillRect(GameConfig.road.right - 12, 0, 4, GameConfig.canvas.height);
    this.drawSubtleLaneChevrons(context, playerDistanceMeters, motionIntensity);
  }
  drawSubtleLaneChevrons(context, playerDistanceMeters, motionIntensity) {
    if (motionIntensity < 0.18) return;
    const spacing = 178;
    const offset = playerDistanceMeters * GameConfig.world.pixelsPerMeter * (1.08 + motionIntensity * 0.55) % spacing;
    const width = laneWidth();
    context.save();
    context.strokeStyle = `rgba(147, 197, 253, ${0.06 + motionIntensity * 0.12})`;
    context.lineWidth = 5;
    context.lineCap = "round";
    for (let lane = 0; lane < GameConfig.road.laneCount; lane += 1) {
      const centerX = GameConfig.road.left + width * (lane + 0.5);
      for (let y = -spacing + offset; y < GameConfig.canvas.height + spacing; y += spacing) {
        context.beginPath();
        context.moveTo(centerX - 24, y + 24);
        context.lineTo(centerX, y + 46);
        context.lineTo(centerX + 24, y + 24);
        context.stroke();
      }
    }
    context.restore();
  }
  drawAsphaltTexture(context, playerDistanceMeters, motionIntensity) {
    const rowSpacing = 24;
    const visualOffset = playerDistanceMeters * GameConfig.world.pixelsPerMeter * (1.4 + motionIntensity * 1.2) % rowSpacing;
    const firstRow = Math.floor(playerDistanceMeters * 3);
    const lanePixelWidth = laneWidth();
    context.save();
    for (let row = -2; row < Math.ceil(GameConfig.canvas.height / rowSpacing) + 3; row += 1) {
      const rowIndex = firstRow + row;
      const y = row * rowSpacing + visualOffset;
      for (let lane = 0; lane < GameConfig.road.laneCount; lane += 1) {
        const laneLeft = GameConfig.road.left + lanePixelWidth * lane;
        const markCount = 2;
        for (let mark = 0; mark < markCount; mark += 1) {
          const salt = lane * 101 + mark * 29;
          const localX = 18 + deterministicNoise(rowIndex, salt + 5) * Math.max(8, lanePixelWidth - 54);
          const x = laneLeft + localX;
          const width = 8 + deterministicNoise(rowIndex, salt + 11) * 26;
          const alpha = 0.03 + motionIntensity * 0.045;
          const localY = y + deterministicNoise(rowIndex, salt + 17) * 11;
          fillRoundedRectangle(context, x, localY, width, 2, 1, `rgba(255, 255, 255, ${alpha})`);
        }
      }
    }
    context.restore();
  }
  drawRoadMotionLines(context, playerDistanceMeters, motionIntensity) {
    if (motionIntensity < 0.22) return;
    const rowSpacing = 58;
    const visualOffset = playerDistanceMeters * GameConfig.world.pixelsPerMeter * (2.1 + motionIntensity * 1.9) % rowSpacing;
    const firstRow = Math.floor(playerDistanceMeters * 4);
    const lanePixelWidth = laneWidth();
    const lineLength = 20 + motionIntensity * 58;
    context.save();
    context.lineWidth = 3;
    context.lineCap = "round";
    for (let row = -2; row < Math.ceil(GameConfig.canvas.height / rowSpacing) + 3; row += 1) {
      const rowIndex = firstRow + row;
      const y = row * rowSpacing + visualOffset;
      for (let lane = 0; lane < GameConfig.road.laneCount; lane += 1) {
        const laneLeft = GameConfig.road.left + lanePixelWidth * lane;
        const laneSalt = lane * 131;
        const shouldDrawFirstLine = deterministicNoise(rowIndex, laneSalt + 19) > 0.22;
        const shouldDrawSecondLine = deterministicNoise(rowIndex, laneSalt + 37) > 0.68;
        const linesInLane = shouldDrawSecondLine ? 2 : shouldDrawFirstLine ? 1 : 0;
        for (let line = 0; line < linesInLane; line += 1) {
          const x = laneLeft + 22 + deterministicNoise(rowIndex, laneSalt + line * 53 + 47) * Math.max(8, lanePixelWidth - 52);
          const alpha = 0.07 + motionIntensity * 0.15;
          context.strokeStyle = `rgba(226, 232, 240, ${alpha})`;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x, y + lineLength);
          context.stroke();
        }
      }
    }
    context.restore();
  }
  drawScenery(context, playerDistanceMeters, motionIntensity) {
    const spacingMeters = GameConfig.world.scenerySpacingMeters;
    const firstSegment = Math.floor((playerDistanceMeters - 110) / spacingMeters);
    const lastSegment = Math.ceil((playerDistanceMeters + 190) / spacingMeters);
    for (let segment = firstSegment; segment <= lastSegment; segment += 1) {
      const worldDistance = segment * spacingMeters;
      const y = GameConfig.player.screenY - (worldDistance - playerDistanceMeters) * GameConfig.world.pixelsPerMeter;
      if (y < -140 || y > GameConfig.canvas.height + 140) continue;
      this.drawSceneryPair(context, segment, y, motionIntensity);
    }
  }
  drawSceneryPair(context, segment, y, motionIntensity) {
    const leftX = 55 + deterministicNoise(segment, 3) * 120;
    const rightX = GameConfig.canvas.width - 175 + deterministicNoise(segment, 7) * 120;
    const leftType = deterministicNoise(segment, 11);
    const rightType = deterministicNoise(segment, 17);
    this.drawSceneryItem(context, leftX, y, leftType, segment, motionIntensity);
    this.drawSceneryItem(context, rightX, y + deterministicNoise(segment, 29) * 40 - 20, rightType, segment + 1e3, motionIntensity);
  }
  drawSceneryItem(context, x, y, typeNoise, seed, motionIntensity) {
    if (motionIntensity > 0.45) {
      fillRoundedRectangle(context, x - 14, y + 26, 28, 22 + motionIntensity * 38, 12, `rgba(20, 83, 45, ${0.08 + motionIntensity * 0.1})`);
    }
    if (typeNoise < 0.52) {
      this.drawTree(context, x, y, 22 + deterministicNoise(seed, 31) * 18);
    } else if (typeNoise < 0.82) {
      this.drawBuilding(context, x, y, 48 + deterministicNoise(seed, 37) * 34, 40 + deterministicNoise(seed, 41) * 55);
    } else {
      this.drawFlowersAndRock(context, x, y, seed);
    }
  }
  drawTree(context, x, y, radius) {
    context.save();
    context.fillStyle = "#7c3f16";
    fillRoundedRectangle(context, x - 8, y + radius * 0.35, 16, 28, 7, "#7c3f16");
    context.fillStyle = "#2f7d1f";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.arc(x - radius * 0.45, y + 4, radius * 0.72, 0, Math.PI * 2);
    context.arc(x + radius * 0.45, y + 6, radius * 0.72, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#145b1d";
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  }
  drawBuilding(context, x, y, width, height) {
    context.save();
    const colors = ["#fca5a5", "#93c5fd", "#fde68a", "#c4b5fd", "#99f6e4"];
    const color = colors[Math.floor((x + y + width) % colors.length)];
    fillRoundedRectangle(context, x - width / 2, y - height / 2, width, height, 8, color);
    strokeRoundedRectangle(context, x - width / 2, y - height / 2, width, height, 8, "rgba(30, 41, 59, 0.5)", 2);
    context.fillStyle = "rgba(15, 23, 42, 0.33)";
    for (let windowY = y - height / 2 + 10; windowY < y + height / 2 - 8; windowY += 18) {
      for (let windowX = x - width / 2 + 9; windowX < x + width / 2 - 9; windowX += 18) {
        context.fillRect(windowX, windowY, 8, 8);
      }
    }
    context.restore();
  }
  drawFlowersAndRock(context, x, y, seed) {
    context.save();
    fillRoundedRectangle(context, x - 14, y - 5, 28, 18, 9, "#a98552");
    context.fillStyle = "#f9a8d4";
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.PI * 2 * i / 5;
      const flowerX = x + 42 + Math.cos(angle) * (10 + deterministicNoise(seed, i) * 8);
      const flowerY = y + Math.sin(angle) * (10 + deterministicNoise(seed, i + 8) * 8);
      context.beginPath();
      context.arc(flowerX, flowerY, 5, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "#fef08a";
    context.beginPath();
    context.arc(x + 42, y, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  drawRoadsideSigns(context, playerDistanceMeters) {
    const signEveryMeters = 620;
    const nextSignDistance = Math.ceil(playerDistanceMeters / signEveryMeters) * signEveryMeters + 180;
    const y = GameConfig.player.screenY - (nextSignDistance - playerDistanceMeters) * GameConfig.world.pixelsPerMeter;
    if (y < -80 || y > GameConfig.canvas.height + 80) return;
    const isLeft = Math.floor(nextSignDistance / signEveryMeters) % 2 === 0;
    const x = isLeft ? 110 : GameConfig.canvas.width - 110;
    context.save();
    context.strokeStyle = "#475569";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(x - 28, y + 30);
    context.lineTo(x - 28, y + 90);
    context.moveTo(x + 28, y + 30);
    context.lineTo(x + 28, y + 90);
    context.stroke();
    fillRoundedRectangle(context, x - 75, y - 28, 150, 58, 10, isLeft ? "#15803d" : "#2563eb");
    strokeRoundedRectangle(context, x - 75, y - 28, 150, 58, 10, "#f8fafc", 3);
    context.fillStyle = "#ffffff";
    context.font = "800 18px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(isLeft ? "NEXT CITY" : "REST AREA", x, y - 6);
    context.font = "700 16px Inter, system-ui, sans-serif";
    context.fillText(`${Math.max(1, Math.round((nextSignDistance - playerDistanceMeters) / 1e3))} KM`, x, y + 15);
    context.restore();
  }
};

// src/ui/ScreenControls.ts
var audioButtonWidth = 136;
var endButtonWidth = 108;
var buttonHeight = 36;
var gap = 10;
function handleScreenControlInput(engine2, layout) {
  if (engine2.input.consumePressed("m", "M")) {
    engine2.audio.toggleMusic();
    return "music";
  }
  if (engine2.input.consumePressed("n", "N")) {
    engine2.audio.toggleEffects();
    return "effects";
  }
  const click = engine2.input.getPointerClick();
  if (!click) return "none";
  const point = engine2.clientPointToCanvasPoint(click.clientX, click.clientY);
  const target = hitTestScreenControls(point, layout);
  if (target === "none") return "none";
  engine2.input.clearPointerClick();
  if (target === "music") engine2.audio.toggleMusic();
  if (target === "effects") engine2.audio.toggleEffects();
  return target;
}
function drawScreenControls(context, engine2, layout) {
  const musicRect = musicButtonRectangle(layout);
  const effectsRect = effectsButtonRectangle(layout);
  drawToggleButton(context, musicRect, "Music", engine2.audio.isMusicEnabled(), "M");
  drawToggleButton(context, effectsRect, "Sound", engine2.audio.isEffectsEnabled(), "N");
  if (layout.includeEndGameButton) {
    drawEndGameButton(context, endGameButtonRectangle(layout));
  }
}
function hitTestScreenControls(point, layout) {
  if (pointInsideRectangle(point, musicButtonRectangle(layout))) return "music";
  if (pointInsideRectangle(point, effectsButtonRectangle(layout))) return "effects";
  if (layout.includeEndGameButton && pointInsideRectangle(point, endGameButtonRectangle(layout))) return "endGame";
  return "none";
}
function musicButtonRectangle(layout) {
  return { x: layout.x, y: layout.y, width: audioButtonWidth, height: buttonHeight };
}
function effectsButtonRectangle(layout) {
  return { x: layout.x + audioButtonWidth + gap, y: layout.y, width: audioButtonWidth, height: buttonHeight };
}
function endGameButtonRectangle(layout) {
  return { x: layout.x + audioButtonWidth * 2 + gap * 2, y: layout.y, width: endButtonWidth, height: buttonHeight };
}
function drawToggleButton(context, rectangle, label, isEnabled, shortcut) {
  const fillStyle = isEnabled ? "rgba(22, 101, 52, 0.88)" : "rgba(69, 10, 10, 0.88)";
  const strokeStyle = isEnabled ? "#86efac" : "#fca5a5";
  const statusText = isEnabled ? "ON" : "OFF";
  context.save();
  fillRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, fillStyle);
  strokeRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, strokeStyle, 2);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 14px Inter, system-ui, sans-serif";
  context.fillStyle = "#ffffff";
  context.fillText(`${label}: ${statusText}`, rectangle.x + rectangle.width / 2, rectangle.y + 14);
  context.font = "600 10px Inter, system-ui, sans-serif";
  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  context.fillText(`Tap / ${shortcut}`, rectangle.x + rectangle.width / 2, rectangle.y + 28);
  context.restore();
}
function drawEndGameButton(context, rectangle) {
  context.save();
  fillRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, "rgba(127, 29, 29, 0.9)");
  strokeRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, "#fecaca", 2);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "900 14px Inter, system-ui, sans-serif";
  context.fillStyle = "#ffffff";
  context.fillText("END", rectangle.x + rectangle.width / 2, rectangle.y + 14);
  context.font = "600 10px Inter, system-ui, sans-serif";
  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  context.fillText("Tap / Esc", rectangle.x + rectangle.width / 2, rectangle.y + 28);
  context.restore();
}
function pointInsideRectangle(point, rectangle) {
  return point.x >= rectangle.x && point.x <= rectangle.x + rectangle.width && point.y >= rectangle.y && point.y <= rectangle.y + rectangle.height;
}

// src/entities/BaseEntity.ts
var BaseEntity = class {
  constructor(id, x, worldDistanceMeters, width, height) {
    this.id = id;
    this.x = x;
    this.worldDistanceMeters = worldDistanceMeters;
    this.width = width;
    this.height = height;
  }
  isActive = true;
  getScreenRectangle(screenY) {
    return {
      x: this.x - this.width / 2,
      y: screenY - this.height / 2,
      width: this.width,
      height: this.height
    };
  }
};

// src/entities/PlayerCar.ts
var PlayerCar = class extends BaseEntity {
  speedKmh = 0;
  distanceMeters = 0;
  constructor() {
    super("player", laneCenter(1), 0, GameConfig.player.width, GameConfig.player.height);
  }
  update(deltaSeconds, input) {
    this.updateSpeed(deltaSeconds, input);
    this.updateSteering(deltaSeconds, input);
    this.distanceMeters += kmhToMetersPerSecond(this.speedKmh) * deltaSeconds;
    this.worldDistanceMeters = this.distanceMeters;
  }
  getScreenY() {
    return GameConfig.player.screenY;
  }
  updateSpeed(deltaSeconds, input) {
    const isAccelerating = input.isPressed("ArrowUp", "w", "W");
    const isBraking = input.isPressed("ArrowDown", "s", "S");
    if (isAccelerating) {
      this.speedKmh += GameConfig.player.accelerationKmhPerSecond * deltaSeconds;
    }
    if (isBraking) {
      this.speedKmh -= GameConfig.player.brakeKmhPerSecond * deltaSeconds;
    }
    if (!isAccelerating && !isBraking) {
      this.speedKmh -= GameConfig.player.dragKmhPerSecond * deltaSeconds;
    }
    this.speedKmh = clamp(this.speedKmh, 0, GameConfig.player.maximumSpeedKmh);
  }
  updateSteering(deltaSeconds, input) {
    const left = input.isPressed("ArrowLeft", "a", "A") ? -1 : 0;
    const right = input.isPressed("ArrowRight", "d", "D") ? 1 : 0;
    const steering = left + right;
    this.x += steering * GameConfig.player.steeringPixelsPerSecond * deltaSeconds;
    const halfWidth = this.width / 2 + 6;
    this.x = clamp(this.x, GameConfig.road.left + halfWidth, GameConfig.road.right - halfWidth);
  }
};

// src/rendering/EntityRenderer.ts
var EntityRenderer = class {
  drawObstacle(context, obstacle, screenY) {
    if (obstacle.kind === "pit") this.drawPit(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    else this.drawAccident(context, obstacle, screenY);
  }
  drawCargo(context, cargo, screenY) {
    const left = cargo.x - cargo.width / 2;
    const top = screenY - cargo.height / 2;
    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.28)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 5;
    fillRoundedRectangle(context, left, top, cargo.width, cargo.height, 9, "#d97706");
    context.shadowBlur = 0;
    strokeRoundedRectangle(context, left, top, cargo.width, cargo.height, 9, "#92400e", 3);
    context.strokeStyle = "#fef3c7";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(left + 6, top + 15);
    context.lineTo(left + cargo.width - 6, top + 15);
    context.moveTo(cargo.x, top + 4);
    context.lineTo(cargo.x, top + cargo.height - 4);
    context.stroke();
    context.font = "800 15px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    drawOutlinedText(context, `+${cargo.bonusPoints}`, cargo.x, screenY + 2, "#ffffff", "rgba(0,0,0,0.6)", 4);
    context.restore();
  }
  drawPit(context, centerX, centerY, width, height) {
    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.35)";
    context.shadowBlur = 12;
    context.fillStyle = "#020617";
    context.beginPath();
    context.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "#64748b";
    context.lineWidth = 5;
    context.stroke();
    context.strokeStyle = "#1e293b";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(centerX - width / 3, centerY - 4);
    context.lineTo(centerX - 8, centerY + height / 4);
    context.lineTo(centerX + 8, centerY - height / 5);
    context.lineTo(centerX + width / 3, centerY + 3);
    context.stroke();
    context.restore();
  }
  drawAccident(context, obstacle, screenY) {
    if (obstacle.accidentVehicles.length === 0) {
      this.drawLegacyAccident(context, obstacle.x, screenY, obstacle.width, obstacle.height);
      return;
    }
    context.save();
    this.drawAccidentShadow(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    this.drawSkidMarks(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    this.drawSmoke(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    for (const vehicle of obstacle.accidentVehicles) {
      this.drawDamagedVehicle(context, obstacle.x + vehicle.offsetX, screenY + vehicle.offsetY, vehicle);
    }
    this.drawDebris(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    this.drawTrafficCones(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    context.font = "900 14px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    drawOutlinedText(context, "CRASH", obstacle.x, screenY - obstacle.height / 2 - 8, "#fecaca", "rgba(0,0,0,0.7)", 4);
    context.restore();
  }
  drawAccidentShadow(context, centerX, centerY, width, height) {
    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.22)";
    context.beginPath();
    context.ellipse(centerX, centerY + 10, width * 0.48, height * 0.42, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  drawSkidMarks(context, centerX, centerY, width, height) {
    context.save();
    context.strokeStyle = "rgba(15, 23, 42, 0.52)";
    context.lineWidth = 5;
    context.lineCap = "round";
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(centerX + side * width * 0.16, centerY + height * 0.48);
      context.quadraticCurveTo(centerX + side * width * 0.32, centerY + height * 0.08, centerX + side * width * 0.08, centerY - height * 0.42);
      context.stroke();
    }
    context.restore();
  }
  drawSmoke(context, centerX, centerY, width, height) {
    context.save();
    context.fillStyle = "rgba(71, 85, 105, 0.38)";
    const smokePuffs = [
      { x: -0.18, y: -0.4, r: 17 },
      { x: 0.04, y: -0.48, r: 21 },
      { x: 0.24, y: -0.34, r: 14 }
    ];
    for (const puff of smokePuffs) {
      context.beginPath();
      context.arc(centerX + puff.x * width, centerY + puff.y * height, puff.r, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
  drawDamagedVehicle(context, centerX, centerY, vehicle) {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(vehicle.rotationRadians);
    context.shadowColor = "rgba(0, 0, 0, 0.34)";
    context.shadowBlur = 10;
    context.shadowOffsetY = 5;
    if (vehicle.kind === "motorcycle") this.drawDamagedMotorcycle(context, vehicle);
    else if (vehicle.kind === "truck") this.drawDamagedTruck(context, vehicle);
    else if (vehicle.kind === "bus") this.drawDamagedBus(context, vehicle);
    else this.drawDamagedCarLikeVehicle(context, vehicle);
    this.drawDamageMarks(context, vehicle.width, vehicle.height);
    context.restore();
  }
  drawDamagedCarLikeVehicle(context, vehicle) {
    const width = vehicle.width;
    const height = vehicle.height;
    const left = -width / 2;
    const top = -height / 2;
    fillRoundedRectangle(context, left, top, width, height, 13, vehicle.color);
    strokeRoundedRectangle(context, left, top, width, height, 13, "#7f1d1d", 3);
    fillRoundedRectangle(context, left + 8, top + 10, width - 16, 18, 8, "#111827");
    fillRoundedRectangle(context, left + 9, top + height - 32, width - 18, 22, 8, "#1f2937");
    fillRoundedRectangle(context, left + 10, top + height * 0.46, width - 20, 15, 8, "rgba(255,255,255,0.24)");
    if (vehicle.kind === "pickup") {
      fillRoundedRectangle(context, left + 8, top + height - 34, width - 16, 24, 6, "rgba(15, 23, 42, 0.32)");
    }
  }
  drawDamagedTruck(context, vehicle) {
    const width = vehicle.width;
    const height = vehicle.height;
    const left = -width / 2;
    const top = -height / 2;
    fillRoundedRectangle(context, left + 3, top + 38, width - 6, height - 42, 8, vehicle.color);
    strokeRoundedRectangle(context, left + 3, top + 38, width - 6, height - 42, 8, "#7f1d1d", 3);
    fillRoundedRectangle(context, left, top, width, 46, 10, "#f97316");
    fillRoundedRectangle(context, left + 10, top + 9, width - 20, 16, 7, "#111827");
  }
  drawDamagedBus(context, vehicle) {
    const width = vehicle.width;
    const height = vehicle.height;
    const left = -width / 2;
    const top = -height / 2;
    fillRoundedRectangle(context, left, top, width, height, 13, vehicle.color);
    strokeRoundedRectangle(context, left, top, width, height, 13, "#7f1d1d", 3);
    fillRoundedRectangle(context, left + 8, top + 9, width - 16, 18, 8, "#111827");
    context.fillStyle = "rgba(255,255,255,0.38)";
    for (let y = top + 36; y < top + height - 20; y += 22) {
      fillRoundedRectangle(context, left + 8, y, 14, 12, 4, "rgba(255,255,255,0.38)");
      fillRoundedRectangle(context, left + width - 22, y, 14, 12, 4, "rgba(255,255,255,0.38)");
    }
  }
  drawDamagedMotorcycle(context, vehicle) {
    const width = vehicle.width;
    const height = vehicle.height;
    context.fillStyle = "#111827";
    context.beginPath();
    context.ellipse(0, -height / 2 + 8, width * 0.36, 8, 0, 0, Math.PI * 2);
    context.ellipse(0, height / 2 - 8, width * 0.36, 8, 0, 0, Math.PI * 2);
    context.fill();
    fillRoundedRectangle(context, -width / 2 + 7, -height / 2 + 10, width - 14, height - 20, 8, vehicle.color);
    fillRoundedRectangle(context, -7, -10, 14, 21, 7, "#0f172a");
  }
  drawDamageMarks(context, width, height) {
    context.shadowBlur = 0;
    context.strokeStyle = "#111827";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-width * 0.22, -height * 0.3);
    context.lineTo(width * 0.18, height * 0.22);
    context.moveTo(width * 0.24, -height * 0.32);
    context.lineTo(-width * 0.14, height * 0.1);
    context.stroke();
    context.fillStyle = "rgba(239, 68, 68, 0.55)";
    context.beginPath();
    context.arc(width * 0.28, height * 0.18, 7, 0, Math.PI * 2);
    context.fill();
  }
  drawDebris(context, centerX, centerY, width, height) {
    context.save();
    const pieces = [
      [-0.45, -0.08, "#94a3b8"],
      [-0.32, 0.28, "#f97316"],
      [-0.08, 0.44, "#facc15"],
      [0.33, 0.12, "#94a3b8"],
      [0.45, -0.18, "#ef4444"]
    ];
    for (const [xRatio, yRatio, color] of pieces) {
      context.fillStyle = color;
      context.beginPath();
      context.arc(centerX + xRatio * width, centerY + yRatio * height, 4, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
  drawTrafficCones(context, centerX, centerY, width, height) {
    for (let i = 0; i < 3; i += 1) {
      const coneX = centerX - width * 0.36 + i * width * 0.36;
      const coneY = centerY + height * 0.52 + i % 2 * 6;
      context.fillStyle = "#fb923c";
      context.beginPath();
      context.moveTo(coneX, coneY - 18);
      context.lineTo(coneX - 10, coneY + 10);
      context.lineTo(coneX + 10, coneY + 10);
      context.closePath();
      context.fill();
      context.strokeStyle = "#7c2d12";
      context.lineWidth = 2;
      context.stroke();
    }
  }
  drawLegacyAccident(context, centerX, centerY, width, height) {
    context.save();
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    fillRoundedRectangle(context, left + 8, top + 14, width - 18, height - 32, 9, "#ef4444");
    strokeRoundedRectangle(context, left + 8, top + 14, width - 18, height - 32, 9, "#7f1d1d", 3);
    context.strokeStyle = "#111827";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(left + 16, top + 18);
    context.lineTo(left + width - 18, top + height - 20);
    context.moveTo(left + width - 16, top + 18);
    context.lineTo(left + 18, top + height - 22);
    context.stroke();
    this.drawTrafficCones(context, centerX, centerY, width, height);
    context.restore();
  }
};

// src/rendering/VehicleRenderer.ts
var VehicleRenderer = class {
  drawPlayer(context, player, speedKmh = 0, passingPulseSeconds = 0) {
    const speedIntensity = clamp(speedKmh / GameConfig.player.maximumSpeedKmh, 0, 1);
    this.drawPlayerMotionTrail(context, player.x, player.getScreenY(), player.width, player.height, speedIntensity, passingPulseSeconds);
    this.drawVehicleBody(context, player.x, player.getScreenY(), player.width, player.height, "#ef2525", "car", true, false);
  }
  drawTrafficVehicle(context, vehicle, screenY) {
    context.save();
    if (vehicle.hasBeenOvertaken) context.globalAlpha = 0.78;
    this.drawVehicleBody(context, vehicle.x, screenY, vehicle.width, vehicle.height, vehicle.color, vehicle.kind, false, vehicle.hasBeenOvertaken);
    if (vehicle.isChangingLane()) {
      this.drawLaneChangeArrow(context, vehicle.x, screenY - vehicle.height / 2 - 17, vehicle.laneChangeDirection());
    }
    if (vehicle.isBraking || vehicle.avoidanceAlertSeconds > 0) {
      this.drawAvoidanceCue(context, vehicle.x, screenY, vehicle.width, vehicle.height, vehicle.isBraking);
    }
    if (vehicle.hasBeenOvertaken) {
      context.font = "800 13px Inter, system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      drawOutlinedText(context, "PASSED", vehicle.x, screenY - vehicle.height / 2 - 8, "#bbf7d0", "rgba(0,0,0,0.55)", 3);
    }
    context.restore();
  }
  drawVehicleBody(context, centerX, centerY, width, height, color, kind, isPlayer, isPassed) {
    context.save();
    context.shadowColor = isPassed ? "rgba(34, 197, 94, 0.42)" : "rgba(0, 0, 0, 0.35)";
    context.shadowBlur = isPassed ? 16 : 10;
    context.shadowOffsetY = 6;
    if (kind === "truck") this.drawTruck(context, centerX, centerY, width, height, color);
    else if (kind === "bus") this.drawBus(context, centerX, centerY, width, height, color);
    else if (kind === "pickup") this.drawPickup(context, centerX, centerY, width, height, color);
    else if (kind === "motorcycle") this.drawMotorcycle(context, centerX, centerY, width, height, color);
    else this.drawCar(context, centerX, centerY, width, height, color, isPlayer);
    context.restore();
  }
  drawPlayerMotionTrail(context, centerX, centerY, width, height, speedIntensity, passingPulseSeconds) {
    if (speedIntensity < 0.12 && passingPulseSeconds <= 0) return;
    const pulseIntensity = clamp(passingPulseSeconds / 0.75, 0, 1);
    const trailLength = 22 + speedIntensity * 94 + pulseIntensity * 34;
    const alpha = 0.1 + speedIntensity * 0.22 + pulseIntensity * 0.2;
    context.save();
    context.lineCap = "round";
    context.lineWidth = 5;
    context.strokeStyle = `rgba(248, 250, 252, ${alpha})`;
    for (let index = 0; index < 4; index += 1) {
      const sideOffset = (index - 1.5) * (width * 0.34);
      const x = centerX + sideOffset;
      context.beginPath();
      context.moveTo(x, centerY + height * 0.35);
      context.lineTo(x, centerY + height * 0.35 + trailLength * (0.68 + index * 0.08));
      context.stroke();
    }
    if (pulseIntensity > 0) {
      context.strokeStyle = `rgba(250, 204, 21, ${0.2 + pulseIntensity * 0.34})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(centerX, centerY, width * (0.85 + pulseIntensity * 0.25), 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }
  drawCar(context, centerX, centerY, width, height, color, isPlayer) {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    this.drawCarWheels(context, left, top, width, height);
    fillRoundedRectangle(context, left, top, width, height, 15, color);
    strokeRoundedRectangle(context, left, top, width, height, 15, "rgba(15, 23, 42, 0.75)", 3);
    fillRoundedRectangle(context, left + 8, top + 10, width - 16, 18, 8, "#111827");
    fillRoundedRectangle(context, left + 9, top + height - 32, width - 18, 23, 9, "#1f2937");
    fillRoundedRectangle(context, left + 12, top + 36, width - 24, 17, 8, isPlayer ? "#7dd3fc" : "rgba(255,255,255,0.45)");
    context.fillStyle = "rgba(255,255,255,0.38)";
    context.beginPath();
    context.moveTo(left + 13, top + 12);
    context.lineTo(left + width - 16, top + 12);
    context.lineTo(left + width - 22, top + 21);
    context.lineTo(left + 18, top + 21);
    context.closePath();
    context.fill();
    context.fillStyle = "#fde68a";
    context.fillRect(left + 7, top + 3, 9, 6);
    context.fillRect(left + width - 16, top + 3, 9, 6);
    context.fillStyle = "#991b1b";
    context.fillRect(left + 8, top + height - 8, 10, 5);
    context.fillRect(left + width - 18, top + height - 8, 10, 5);
  }
  drawPickup(context, centerX, centerY, width, height, color) {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    this.drawCarWheels(context, left, top, width, height);
    fillRoundedRectangle(context, left, top, width, height, 12, color);
    strokeRoundedRectangle(context, left, top, width, height, 12, "rgba(15, 23, 42, 0.75)", 3);
    fillRoundedRectangle(context, left + 8, top + 10, width - 16, 20, 8, "#111827");
    fillRoundedRectangle(context, left + 7, top + 45, width - 14, height - 55, 6, "rgba(15, 23, 42, 0.3)");
    context.strokeStyle = "rgba(255,255,255,0.35)";
    context.lineWidth = 2;
    context.strokeRect(left + 10, top + 50, width - 20, height - 65);
  }
  drawTruck(context, centerX, centerY, width, height, color) {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    this.drawLargeVehicleWheels(context, left, top, width, height);
    fillRoundedRectangle(context, left + 4, top + 38, width - 8, height - 42, 9, color);
    strokeRoundedRectangle(context, left + 4, top + 38, width - 8, height - 42, 9, "#475569", 3);
    fillRoundedRectangle(context, left, top, width, 46, 10, "#f97316");
    strokeRoundedRectangle(context, left, top, width, 46, 10, "rgba(15, 23, 42, 0.75)", 3);
    fillRoundedRectangle(context, left + 10, top + 10, width - 20, 16, 7, "#111827");
    context.strokeStyle = "rgba(255,255,255,0.42)";
    context.lineWidth = 2;
    for (let y = top + 56; y < top + height - 8; y += 22) {
      context.beginPath();
      context.moveTo(left + 10, y);
      context.lineTo(left + width - 10, y);
      context.stroke();
    }
  }
  drawBus(context, centerX, centerY, width, height, color) {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    this.drawLargeVehicleWheels(context, left, top, width, height);
    fillRoundedRectangle(context, left, top, width, height, 13, color);
    strokeRoundedRectangle(context, left, top, width, height, 13, "rgba(15, 23, 42, 0.75)", 3);
    fillRoundedRectangle(context, left + 8, top + 9, width - 16, 18, 8, "#0f172a");
    context.fillStyle = "rgba(255,255,255,0.55)";
    for (let y = top + 36; y < top + height - 20; y += 20) {
      fillRoundedRectangle(context, left + 8, y, 14, 12, 4, "rgba(255,255,255,0.55)");
      fillRoundedRectangle(context, left + width - 22, y, 14, 12, 4, "rgba(255,255,255,0.55)");
    }
    context.fillStyle = "rgba(15,23,42,0.28)";
    fillRoundedRectangle(context, left + width / 2 - 10, top + 36, 20, height - 56, 8, "rgba(15,23,42,0.18)");
  }
  drawMotorcycle(context, centerX, centerY, width, height, color) {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    context.fillStyle = "#111827";
    context.beginPath();
    context.ellipse(centerX, top + 8, width * 0.36, 8, 0, 0, Math.PI * 2);
    context.ellipse(centerX, top + height - 8, width * 0.36, 8, 0, 0, Math.PI * 2);
    context.fill();
    fillRoundedRectangle(context, left + 7, top + 10, width - 14, height - 20, 8, color);
    fillRoundedRectangle(context, centerX - 7, centerY - 10, 14, 21, 7, "#0f172a");
    strokeRoundedRectangle(context, left + 7, top + 10, width - 14, height - 20, 8, "rgba(15, 23, 42, 0.75)", 2);
  }
  drawCarWheels(context, left, top, width, height) {
    fillRoundedRectangle(context, left - 5, top + 14, 9, 18, 4, "#111827");
    fillRoundedRectangle(context, left + width - 4, top + 14, 9, 18, 4, "#111827");
    fillRoundedRectangle(context, left - 5, top + height - 32, 9, 18, 4, "#111827");
    fillRoundedRectangle(context, left + width - 4, top + height - 32, 9, 18, 4, "#111827");
  }
  drawLargeVehicleWheels(context, left, top, width, height) {
    for (const wheelY of [top + 16, top + height * 0.47, top + height - 28]) {
      fillRoundedRectangle(context, left - 6, wheelY, 10, 18, 4, "#111827");
      fillRoundedRectangle(context, left + width - 4, wheelY, 10, 18, 4, "#111827");
    }
  }
  drawAvoidanceCue(context, centerX, centerY, width, height, isBraking) {
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 16px Inter, system-ui, sans-serif";
    if (isBraking) {
      fillRoundedRectangle(context, centerX - width / 2 - 8, centerY + height / 2 - 15, 8, 18, 4, "#ef4444");
      fillRoundedRectangle(context, centerX + width / 2, centerY + height / 2 - 15, 8, 18, 4, "#ef4444");
    }
    drawOutlinedText(context, "!", centerX, centerY - height / 2 - 16, "#fef08a", "rgba(0,0,0,0.65)", 4);
    context.restore();
  }
  drawLaneChangeArrow(context, centerX, centerY, direction) {
    if (direction === 0) return;
    context.save();
    context.strokeStyle = "#fef08a";
    context.fillStyle = "#fef08a";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    const arrowLength = 26 * direction;
    context.beginPath();
    context.moveTo(centerX - arrowLength * 0.5, centerY);
    context.lineTo(centerX + arrowLength * 0.5, centerY);
    context.stroke();
    context.beginPath();
    context.moveTo(centerX + arrowLength * 0.5, centerY);
    context.lineTo(centerX + arrowLength * 0.5 - direction * 9, centerY - 8);
    context.lineTo(centerX + arrowLength * 0.5 - direction * 9, centerY + 8);
    context.closePath();
    context.fill();
    context.restore();
  }
};

// src/types/Geometry.ts
function rectanglesOverlap(first, second) {
  return first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;
}
function expandRectangle(rectangle, horizontalPadding, verticalPadding) {
  return {
    x: rectangle.x - horizontalPadding,
    y: rectangle.y - verticalPadding,
    width: rectangle.width + horizontalPadding * 2,
    height: rectangle.height + verticalPadding * 2
  };
}
function circlesTouch(first, second) {
  const radiusSum = first.radius + second.radius;
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY <= radiusSum * radiusSum;
}
function circleIntersectsRectangle(circle, rectangle) {
  const closestX = clampNumber(circle.x, rectangle.x, rectangle.x + rectangle.width);
  const closestY = clampNumber(circle.y, rectangle.y, rectangle.y + rectangle.height);
  const deltaX = circle.x - closestX;
  const deltaY = circle.y - closestY;
  return deltaX * deltaX + deltaY * deltaY <= circle.radius * circle.radius;
}
function circleIntersectsRotatedRectangle(circle, rectangle) {
  const sine = Math.sin(-rectangle.rotationRadians);
  const cosine = Math.cos(-rectangle.rotationRadians);
  const translatedX = circle.x - rectangle.x;
  const translatedY = circle.y - rectangle.y;
  const localCircle = {
    x: translatedX * cosine - translatedY * sine,
    y: translatedX * sine + translatedY * cosine,
    radius: circle.radius
  };
  return circleIntersectsRectangle(localCircle, {
    x: -rectangle.width / 2,
    y: -rectangle.height / 2,
    width: rectangle.width,
    height: rectangle.height
  });
}
function circleIntersectsEllipse(circle, ellipse) {
  const expandedRadiusX = ellipse.radiusX + circle.radius;
  const expandedRadiusY = ellipse.radiusY + circle.radius;
  const normalizedX = (circle.x - ellipse.x) / expandedRadiusX;
  const normalizedY = (circle.y - ellipse.y) / expandedRadiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}
function clampNumber(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

// src/systems/CollisionSystem.ts
var CollisionSystem = class {
  findTrafficCollision(player, trafficVehicles) {
    const playerCircles = this.createVehicleContactCircles(player.x, player.getScreenY(), player.width, player.height, "player");
    for (const vehicle of trafficVehicles) {
      if (!vehicle.isActive) continue;
      const vehicleScreenY = this.toScreenY(player, vehicle.worldDistanceMeters);
      const vehicleCircles = this.createVehicleContactCircles(vehicle.x, vehicleScreenY, vehicle.width, vehicle.height, vehicle.kind);
      if (this.circleSetsTouch(playerCircles, vehicleCircles)) return vehicle;
    }
    return null;
  }
  findObstacleCollision(player, obstacles) {
    const playerCircles = this.createVehicleContactCircles(player.x, player.getScreenY(), player.width, player.height, "player");
    for (const obstacle of obstacles) {
      if (!obstacle.isActive) continue;
      const obstacleScreenY = this.toScreenY(player, obstacle.worldDistanceMeters);
      if (obstacle.kind === "pit" && this.vehicleTouchesPit(playerCircles, obstacle.x, obstacleScreenY, obstacle.width, obstacle.height)) {
        return obstacle;
      }
      if (obstacle.kind === "accident" && this.vehicleTouchesAccident(playerCircles, obstacle, obstacleScreenY)) {
        return obstacle;
      }
    }
    return null;
  }
  collectCargo(player, cargos) {
    const playerRect = expandRectangle(player.getScreenRectangle(player.getScreenY()), 8, 10);
    const collected = [];
    for (const cargo of cargos) {
      if (!cargo.isActive) continue;
      const cargoScreenY = this.toScreenY(player, cargo.worldDistanceMeters);
      const cargoRect = expandRectangle(cargo.getScreenRectangle(cargoScreenY), 7, 7);
      if (rectanglesOverlap(playerRect, cargoRect)) {
        cargo.isActive = false;
        collected.push(cargo);
      }
    }
    return collected;
  }
  createVehicleContactCircles(centerX, centerY, width, height, kind) {
    const radius = this.getVehicleContactRadius(width, kind);
    const topCircleY = centerY - height / 2 + radius;
    const bottomCircleY = centerY + height / 2 - radius;
    if (bottomCircleY <= topCircleY) return [{ x: centerX, y: centerY, radius }];
    const spacing = radius * 1.25;
    const circleCount = Math.max(2, Math.ceil((bottomCircleY - topCircleY) / spacing) + 1);
    const circles = [];
    for (let index = 0; index < circleCount; index += 1) {
      const t = circleCount === 1 ? 0.5 : index / (circleCount - 1);
      circles.push({
        x: centerX,
        y: topCircleY + (bottomCircleY - topCircleY) * t,
        radius
      });
    }
    return circles;
  }
  circleSetsTouch(firstCircles, secondCircles) {
    for (const first of firstCircles) {
      for (const second of secondCircles) {
        if (circlesTouch(first, second)) return true;
      }
    }
    return false;
  }
  getVehicleContactRadius(width, kind) {
    const radiusRatioByKind = {
      player: 0.47,
      car: 0.46,
      pickup: 0.46,
      truck: 0.45,
      bus: 0.45,
      motorcycle: 0.42
    };
    const visibleBodyRadius = width * radiusRatioByKind[kind];
    return Math.max(7, Math.min(width / 2 - 2, visibleBodyRadius));
  }
  vehicleTouchesPit(playerCircles, centerX, centerY, width, height) {
    const pitShape = {
      x: centerX,
      y: centerY,
      radiusX: width / 2 - 4,
      radiusY: height / 2 - 4
    };
    return playerCircles.some((circle) => circleIntersectsEllipse(circle, pitShape));
  }
  vehicleTouchesAccident(playerCircles, obstacle, screenY) {
    if (obstacle.accidentVehicles.length > 0) {
      return obstacle.accidentVehicles.some((vehicle) => {
        const hitBox = {
          x: obstacle.x + vehicle.offsetX,
          y: screenY + vehicle.offsetY,
          width: vehicle.width * 0.78,
          height: vehicle.height * 0.78,
          rotationRadians: vehicle.rotationRadians
        };
        return playerCircles.some((circle) => circleIntersectsRotatedRectangle(circle, hitBox));
      });
    }
    const accidentBody = {
      x: obstacle.x - obstacle.width / 2 + 10,
      y: screenY - obstacle.height / 2 + 16,
      width: obstacle.width - 22,
      height: obstacle.height - 38
    };
    return playerCircles.some((circle) => circleIntersectsRectangle(circle, accidentBody));
  }
  toScreenY(player, entityWorldDistanceMeters) {
    return player.getScreenY() - (entityWorldDistanceMeters - player.distanceMeters) * GameConfig.world.pixelsPerMeter;
  }
};

// src/entities/Cargo.ts
var Cargo = class extends BaseEntity {
  constructor(id, x, worldDistanceMeters, bonusPoints) {
    super(id, x, worldDistanceMeters, 42, 42);
    this.bonusPoints = bonusPoints;
  }
};

// src/entities/Obstacle.ts
var Obstacle = class _Obstacle extends BaseEntity {
  constructor(id, kind, x, worldDistanceMeters, width = kind === "pit" ? 78 : 132, height = kind === "pit" ? 66 : 118, accidentVehicles = []) {
    super(id, x, worldDistanceMeters, width, height);
    this.kind = kind;
    this.accidentVehicles = accidentVehicles;
  }
  static createTrafficAccident(id, firstVehicle, secondVehicle, random) {
    const centerX = (firstVehicle.x + secondVehicle.x) / 2;
    const centerWorldDistanceMeters = (firstVehicle.worldDistanceMeters + secondVehicle.worldDistanceMeters) / 2;
    const firstRotation = random.range(-0.56, 0.56);
    const secondRotation = random.range(-0.56, 0.56) + (firstRotation > 0 ? -0.34 : 0.34);
    const accidentVehicles = [
      this.createAccidentVisual(firstVehicle, centerX, centerWorldDistanceMeters, firstRotation),
      this.createAccidentVisual(secondVehicle, centerX, centerWorldDistanceMeters, secondRotation)
    ];
    const width = this.measureAccidentWidth(accidentVehicles);
    const height = this.measureAccidentHeight(accidentVehicles);
    return new _Obstacle(id, "accident", centerX, centerWorldDistanceMeters, width, height, accidentVehicles);
  }
  static createStaticAccident(id, x, worldDistanceMeters, firstKind, firstColor, secondKind, secondColor, random) {
    const firstSize = this.sizeForKind(firstKind);
    const secondSize = this.sizeForKind(secondKind);
    const accidentVehicles = [
      {
        kind: firstKind,
        color: firstColor,
        width: firstSize.width,
        height: firstSize.height,
        offsetX: random.range(-32, -18),
        offsetY: random.range(-18, 12),
        rotationRadians: random.range(-0.58, -0.28)
      },
      {
        kind: secondKind,
        color: secondColor,
        width: secondSize.width,
        height: secondSize.height,
        offsetX: random.range(18, 34),
        offsetY: random.range(-4, 22),
        rotationRadians: random.range(0.26, 0.62)
      }
    ];
    const width = this.measureAccidentWidth(accidentVehicles);
    const height = this.measureAccidentHeight(accidentVehicles);
    return new _Obstacle(id, "accident", x, worldDistanceMeters, width, height, accidentVehicles);
  }
  static createAccidentVisual(vehicle, centerX, centerWorldDistanceMeters, rotationRadians) {
    return {
      kind: vehicle.kind,
      color: vehicle.color,
      width: vehicle.width,
      height: vehicle.height,
      offsetX: vehicle.x - centerX,
      offsetY: -(vehicle.worldDistanceMeters - centerWorldDistanceMeters) * GameConfig.world.pixelsPerMeter,
      rotationRadians
    };
  }
  static sizeForKind(kind) {
    const sizes = {
      car: { width: 48, height: 76 },
      pickup: { width: 54, height: 88 },
      truck: { width: 64, height: 122 },
      bus: { width: 62, height: 132 },
      motorcycle: { width: 28, height: 54 }
    };
    return sizes[kind];
  }
  static measureAccidentWidth(vehicles) {
    const halfWidth = Math.max(...vehicles.map((vehicle) => Math.abs(vehicle.offsetX) + vehicle.width * 0.62));
    return clamp(halfWidth * 2 + 34, 118, 224);
  }
  static measureAccidentHeight(vehicles) {
    const halfHeight = Math.max(...vehicles.map((vehicle) => Math.abs(vehicle.offsetY) + vehicle.height * 0.6));
    return clamp(halfHeight * 2 + 40, 108, 242);
  }
};

// src/entities/TrafficVehicle.ts
var vehicleSizes = {
  car: { width: 48, height: 76 },
  pickup: { width: 54, height: 88 },
  truck: { width: 64, height: 122 },
  bus: { width: 62, height: 132 },
  motorcycle: { width: 28, height: 54 }
};
var TrafficVehicle = class extends BaseEntity {
  constructor(id, kind, laneIndex, worldDistanceMeters, speedKmh, color, spawnedAhead) {
    const size = vehicleSizes[kind];
    super(id, laneCenter(laneIndex), worldDistanceMeters, size.width, size.height);
    this.kind = kind;
    this.speedKmh = speedKmh;
    this.color = color;
    this.spawnedAhead = spawnedAhead;
    this.targetLaneIndex = laneIndex;
    this.currentLaneIndex = laneIndex;
    this.cruiseSpeedKmh = speedKmh;
    this.desiredSpeedKmh = speedKmh;
  }
  targetLaneIndex;
  currentLaneIndex;
  hasBeenOvertaken = false;
  cruiseSpeedKmh;
  desiredSpeedKmh;
  isBraking = false;
  avoidanceAlertSeconds = 0;
  laneChangeCooldownSeconds = 0;
  update(deltaSeconds) {
    const acceleration = this.desiredSpeedKmh < this.speedKmh ? GameConfig.traffic.brakingKmhPerSecond : GameConfig.traffic.accelerationKmhPerSecond;
    this.speedKmh = moveTowards(this.speedKmh, this.desiredSpeedKmh, acceleration * deltaSeconds);
    this.speedKmh = clamp(this.speedKmh, GameConfig.traffic.minimumCruiseSpeedKmh, GameConfig.player.maximumSpeedKmh);
    this.worldDistanceMeters += kmhToMetersPerSecond(this.speedKmh) * deltaSeconds;
    const targetX = laneCenter(this.targetLaneIndex);
    this.x = moveTowards(this.x, targetX, GameConfig.traffic.laneChangePixelsPerSecond * deltaSeconds);
    this.laneChangeCooldownSeconds = Math.max(0, this.laneChangeCooldownSeconds - deltaSeconds);
    this.avoidanceAlertSeconds = Math.max(0, this.avoidanceAlertSeconds - deltaSeconds);
    if (!this.isChangingLane()) {
      this.currentLaneIndex = this.targetLaneIndex;
    }
  }
  setCruiseSpeed(speedKmh) {
    this.desiredSpeedKmh = clamp(speedKmh, GameConfig.traffic.minimumCruiseSpeedKmh, GameConfig.player.maximumSpeedKmh);
  }
  brakeBehind(speedKmh, emergency = false) {
    this.desiredSpeedKmh = clamp(speedKmh, GameConfig.traffic.minimumCruiseSpeedKmh, this.speedKmh);
    this.isBraking = true;
    this.avoidanceAlertSeconds = emergency ? 0.65 : 0.35;
  }
  chooseLane(targetLaneIndex) {
    const safeLaneIndex = Math.max(0, Math.min(GameConfig.road.laneCount - 1, targetLaneIndex));
    if (safeLaneIndex === this.targetLaneIndex) return;
    this.targetLaneIndex = safeLaneIndex;
    this.laneChangeCooldownSeconds = 1.2;
    this.avoidanceAlertSeconds = 0.6;
  }
  isChangingLane() {
    return Math.abs(this.x - laneCenter(this.targetLaneIndex)) > 2;
  }
  laneChangeDirection() {
    if (!this.isChangingLane()) return 0;
    return laneCenter(this.targetLaneIndex) > this.x ? 1 : -1;
  }
};

// src/systems/SpawnSystem.ts
var SpawnSystem = class {
  constructor(level, random) {
    this.level = level;
    this.random = random;
    this.rearTrafficTimer = this.rearTrafficIsEnabled() ? level.rearTrafficSpawnIntervalSeconds : Number.POSITIVE_INFINITY;
  }
  trafficTimer = 1.05;
  rearTrafficTimer;
  obstacleTimer = 7.2;
  cargoTimer = 2.1;
  idCounter = 0;
  update(deltaSeconds, playerDistanceMeters, playerSpeedKmh, existingTrafficVehicles = []) {
    this.trafficTimer -= deltaSeconds;
    this.obstacleTimer -= deltaSeconds;
    this.cargoTimer -= deltaSeconds;
    if (this.rearTrafficIsEnabled()) this.rearTrafficTimer -= deltaSeconds;
    const trafficVehicles = [];
    const obstacles = [];
    const cargos = [];
    if (this.trafficTimer <= 0) {
      const vehicle = this.createTrafficVehicle(playerDistanceMeters, false, playerSpeedKmh, existingTrafficVehicles);
      if (vehicle) trafficVehicles.push(vehicle);
      this.trafficTimer = this.level.trafficSpawnIntervalSeconds * this.random.range(0.86, 1.38);
    }
    if (this.rearTrafficIsEnabled() && this.rearTrafficTimer <= 0) {
      const vehicle = this.createTrafficVehicle(playerDistanceMeters, true, playerSpeedKmh, existingTrafficVehicles);
      if (vehicle) trafficVehicles.push(vehicle);
      this.rearTrafficTimer = this.level.rearTrafficSpawnIntervalSeconds * this.random.range(0.92, 1.55);
    }
    if (this.obstacleTimer <= 0) {
      obstacles.push(this.createObstacle(playerDistanceMeters));
      this.obstacleTimer = this.level.obstacleSpawnIntervalSeconds * this.random.range(0.88, 1.55);
    }
    if (this.cargoTimer <= 0) {
      cargos.push(this.createCargo(playerDistanceMeters));
      this.cargoTimer = this.level.cargoSpawnIntervalSeconds * this.random.range(0.72, 1.26);
    }
    return { trafficVehicles, obstacles, cargos };
  }
  createTrafficAccidentId() {
    return this.nextId("traffic-accident");
  }
  createTrafficVehicle(playerDistanceMeters, fromBehind, playerSpeedKmh, existingTrafficVehicles) {
    const preferredLane = this.random.integer(0, GameConfig.road.laneCount - 1);
    const kind = this.pickTrafficKind();
    const worldDistanceMeters = fromBehind ? playerDistanceMeters - this.random.range(58, 96) : playerDistanceMeters + this.random.range(GameConfig.world.entitySpawnAheadMeters, GameConfig.world.entitySpawnAheadMeters + 145);
    const safeLaneIndex = this.findSafeSpawnLane(preferredLane, worldDistanceMeters, existingTrafficVehicles);
    if (safeLaneIndex === null) return null;
    const speedKmh = fromBehind ? this.createRearTrafficSpeed(playerSpeedKmh) : this.createForwardTrafficSpeed();
    return new TrafficVehicle(this.nextId("traffic"), kind, safeLaneIndex, worldDistanceMeters, speedKmh, this.pickVehicleColor(kind), !fromBehind);
  }
  findSafeSpawnLane(preferredLane, worldDistanceMeters, existingTrafficVehicles) {
    const laneOrder = [preferredLane, ...this.shuffledLanes().filter((lane) => lane !== preferredLane)];
    for (const laneIndex of laneOrder) {
      const isSafe = existingTrafficVehicles.every((vehicle) => {
        if (!vehicle.isActive) return true;
        const vehicleUsesLane = vehicle.currentLaneIndex === laneIndex || vehicle.targetLaneIndex === laneIndex;
        if (!vehicleUsesLane) return true;
        return Math.abs(vehicle.worldDistanceMeters - worldDistanceMeters) > 32;
      });
      if (isSafe) return laneIndex;
    }
    return null;
  }
  shuffledLanes() {
    const lanes = Array.from({ length: GameConfig.road.laneCount }, (_value, index) => index);
    for (let index = lanes.length - 1; index > 0; index -= 1) {
      const swapIndex = this.random.integer(0, index);
      const lane = lanes[index];
      lanes[index] = lanes[swapIndex];
      lanes[swapIndex] = lane;
    }
    return lanes;
  }
  createForwardTrafficSpeed() {
    const upperSpeed = clamp(78 + this.level.levelNumber * 4, 78, 114);
    return this.random.range(38, upperSpeed);
  }
  createRearTrafficSpeed(playerSpeedKmh) {
    const minimumRearSpeed = Math.max(62, playerSpeedKmh + 8);
    const maximumRearSpeed = Math.max(minimumRearSpeed + 8, playerSpeedKmh + 22);
    return this.random.range(minimumRearSpeed, maximumRearSpeed);
  }
  createObstacle(playerDistanceMeters) {
    const laneIndex = this.random.integer(0, GameConfig.road.laneCount - 1);
    const kind = this.random.chance(0.58) ? "pit" : "accident";
    const x = laneCenter(laneIndex) + this.random.range(-12, 12);
    const worldDistanceMeters = playerDistanceMeters + this.random.range(GameConfig.world.entitySpawnAheadMeters + 55, GameConfig.world.entitySpawnAheadMeters + 155);
    if (kind === "pit") {
      return new Obstacle(this.nextId("obstacle"), kind, x, worldDistanceMeters);
    }
    const firstKind = this.pickTrafficKind();
    const secondKind = this.pickTrafficKind();
    return Obstacle.createStaticAccident(
      this.nextId("obstacle"),
      x,
      worldDistanceMeters,
      firstKind,
      this.pickVehicleColor(firstKind),
      secondKind,
      this.pickVehicleColor(secondKind),
      this.random
    );
  }
  createCargo(playerDistanceMeters) {
    const laneIndex = this.random.integer(0, GameConfig.road.laneCount - 1);
    const bonus = this.random.pick([10, 20, 30, 50, 75, 100, 150, 200, 300, 500]);
    return new Cargo(
      this.nextId("cargo"),
      laneCenter(laneIndex) + this.random.range(-24, 24),
      playerDistanceMeters + this.random.range(GameConfig.world.entitySpawnAheadMeters + 20, GameConfig.world.entitySpawnAheadMeters + 120),
      bonus
    );
  }
  pickTrafficKind() {
    const roll = this.random.next();
    if (roll < 0.55) return "car";
    if (roll < 0.73) return "pickup";
    if (roll < 0.85) return "truck";
    if (roll < 0.95) return "bus";
    return "motorcycle";
  }
  pickVehicleColor(kind) {
    if (kind === "truck") return this.random.pick(["#e6e2d5", "#ffb44a", "#9bd3ff", "#d1d5db"]);
    if (kind === "bus") return this.random.pick(["#ffce2e", "#69d2ff", "#a5f26c", "#f785a2"]);
    if (kind === "motorcycle") return this.random.pick(["#e11d48", "#1d4ed8", "#101827", "#f97316"]);
    return this.random.pick(["#2fb8ff", "#ffd23f", "#8b5cf6", "#22c55e", "#f97316", "#f43f5e", "#f8fafc"]);
  }
  rearTrafficIsEnabled() {
    return this.level.levelNumber >= 4;
  }
  nextId(prefix) {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }
};

// src/systems/SpeedLimitSystem.ts
var SpeedLimitSystem = class {
  constructor(level, random) {
    this.level = level;
    this.random = random;
    this.minimumSpeedKmh = level.startingMinimumSpeedKmh;
    this.maximumSpeedKmh = level.startingMaximumSpeedKmh;
    this.nextChangeDistanceMeters = level.speedRuleChangeDistanceMeters;
  }
  minimumSpeedKmh;
  maximumSpeedKmh;
  nextChangeDistanceMeters;
  violationSeconds = 0;
  recentlyChangedSecondsRemaining = 0;
  update(deltaSeconds, playerSpeedKmh, playerDistanceMeters) {
    if (playerDistanceMeters >= this.nextChangeDistanceMeters) {
      this.changeSpeedRule(playerDistanceMeters);
    }
    const isBelowMinimum = playerSpeedKmh < this.minimumSpeedKmh;
    const isAboveMaximum = playerSpeedKmh > this.maximumSpeedKmh;
    const isStillLeavingCity = playerDistanceMeters < GameConfig.rules.speedLimitWarmupDistanceMeters && isBelowMinimum;
    const isViolation = !isStillLeavingCity && (isBelowMinimum || isAboveMaximum);
    this.violationSeconds = isViolation ? this.violationSeconds + deltaSeconds : 0;
    this.recentlyChangedSecondsRemaining = Math.max(0, this.recentlyChangedSecondsRemaining - deltaSeconds);
    return this.getStatus(isViolation);
  }
  getStatus(isViolationOverride) {
    const isViolation = isViolationOverride ?? false;
    const secondsUntilPenalty = Math.max(0, GameConfig.rules.speedPenaltyDelaySeconds - this.violationSeconds);
    return {
      minimumSpeedKmh: this.minimumSpeedKmh,
      maximumSpeedKmh: this.maximumSpeedKmh,
      isViolation,
      violationSeconds: this.violationSeconds,
      secondsUntilPenalty,
      penaltyIsActive: isViolation && secondsUntilPenalty <= 0,
      recentlyChangedSecondsRemaining: this.recentlyChangedSecondsRemaining
    };
  }
  changeSpeedRule(playerDistanceMeters) {
    const speedShift = this.random.integer(-2, 3) * 5;
    const baseMinimum = clamp(this.level.startingMinimumSpeedKmh + speedShift + this.random.integer(-1, 2) * 5, 20, 75);
    const range = this.random.pick([50, 55, 60, 65, 70]);
    const maxByLevel = clamp(122 + this.level.levelNumber * 5, 120, 155);
    this.minimumSpeedKmh = roundToNearest(baseMinimum, 5);
    this.maximumSpeedKmh = roundToNearest(clamp(this.minimumSpeedKmh + range, 95, maxByLevel), 5);
    if (this.maximumSpeedKmh <= this.minimumSpeedKmh + 35) this.maximumSpeedKmh = this.minimumSpeedKmh + 40;
    this.recentlyChangedSecondsRemaining = 5.5;
    this.nextChangeDistanceMeters = playerDistanceMeters + this.level.speedRuleChangeDistanceMeters + this.random.range(-90, 180);
  }
};

// src/systems/TrafficSystem.ts
var TrafficSystem = class {
  constructor(level, random) {
    this.level = level;
    this.random = random;
  }
  collisionSystem = new CollisionSystem();
  accidentCounter = 0;
  update(deltaSeconds, trafficVehicles) {
    const activeVehicles = trafficVehicles.filter((vehicle) => vehicle.isActive);
    this.resetVehicleIntentions(activeVehicles);
    this.planOvertakingAndBraking(deltaSeconds, activeVehicles);
    this.planRandomLaneChanges(deltaSeconds, activeVehicles);
    for (const vehicle of activeVehicles) vehicle.update(deltaSeconds);
    const accidents = this.convertTrafficCollisionsToAccidents(activeVehicles);
    return { accidents };
  }
  resetVehicleIntentions(trafficVehicles) {
    for (const vehicle of trafficVehicles) {
      vehicle.isBraking = false;
      vehicle.setCruiseSpeed(vehicle.cruiseSpeedKmh);
    }
  }
  planOvertakingAndBraking(deltaSeconds, trafficVehicles) {
    const followers = [...trafficVehicles].sort((first, second) => second.worldDistanceMeters - first.worldDistanceMeters);
    for (const follower of followers) {
      const lead = this.findClosestLeadVehicle(follower, trafficVehicles);
      if (!lead) continue;
      const gapMeters = lead.worldDistanceMeters - follower.worldDistanceMeters - this.combinedHalfLengthMeters(follower, lead);
      const closingSpeedKmh = Math.max(0, follower.speedKmh - lead.speedKmh);
      const lookAheadMeters = GameConfig.traffic.followingLookAheadMeters + closingSpeedKmh * 0.38;
      if (gapMeters > lookAheadMeters) continue;
      const safeLane = this.findSafePassingLane(follower, trafficVehicles);
      if (safeLane !== null) {
        follower.chooseLane(safeLane);
        follower.setCruiseSpeed(Math.max(follower.cruiseSpeedKmh, lead.speedKmh + 10));
        continue;
      }
      const emergency = gapMeters < 7;
      const driverMistakeChance = emergency ? clamp(8e-3 + this.level.levelNumber * 3e-3, 8e-3, 0.045) * deltaSeconds : 0;
      if (driverMistakeChance > 0 && this.random.chance(driverMistakeChance)) {
        follower.setCruiseSpeed(Math.max(follower.speedKmh, lead.speedKmh + 16));
        follower.avoidanceAlertSeconds = 0.8;
        continue;
      }
      const desiredSpeed = Math.min(follower.cruiseSpeedKmh, lead.speedKmh - (emergency ? 18 : 7));
      follower.brakeBehind(desiredSpeed, emergency);
    }
  }
  planRandomLaneChanges(deltaSeconds, trafficVehicles) {
    const chance = this.level.trafficLaneChangeChancePerSecond * deltaSeconds;
    for (const vehicle of trafficVehicles) {
      if (vehicle.isChangingLane() || vehicle.laneChangeCooldownSeconds > 0) continue;
      if (!this.random.chance(chance)) continue;
      const direction = this.random.pick([-1, 1]);
      const candidateLane = vehicle.targetLaneIndex + direction;
      if (candidateLane < 0 || candidateLane >= GameConfig.road.laneCount) continue;
      if (!this.isLaneSafe(vehicle, candidateLane, trafficVehicles)) continue;
      vehicle.chooseLane(candidateLane);
    }
  }
  findClosestLeadVehicle(follower, trafficVehicles) {
    let closestLead = null;
    let closestGap = Number.POSITIVE_INFINITY;
    for (const other of trafficVehicles) {
      if (other === follower || !other.isActive) continue;
      if (!this.vehiclesShareTravelPath(follower, other)) continue;
      const gap2 = other.worldDistanceMeters - follower.worldDistanceMeters;
      if (gap2 <= 0 || gap2 >= closestGap) continue;
      closestLead = other;
      closestGap = gap2;
    }
    return closestLead;
  }
  findSafePassingLane(vehicle, trafficVehicles) {
    const directions = this.random.chance(0.5) ? [-1, 1] : [1, -1];
    for (const direction of directions) {
      const candidateLane = vehicle.targetLaneIndex + direction;
      if (candidateLane < 0 || candidateLane >= GameConfig.road.laneCount) continue;
      if (this.isLaneSafe(vehicle, candidateLane, trafficVehicles)) return candidateLane;
    }
    return null;
  }
  isLaneSafe(vehicle, laneIndex, trafficVehicles) {
    const vehicleCenterX = laneCenter(laneIndex);
    for (const other of trafficVehicles) {
      if (other === vehicle || !other.isActive) continue;
      if (!this.vehicleUsesLane(other, laneIndex, vehicleCenterX)) continue;
      const gapMeters = other.worldDistanceMeters - vehicle.worldDistanceMeters;
      const dynamicFrontGap = GameConfig.traffic.safeFrontGapMeters + Math.max(0, vehicle.speedKmh - other.speedKmh) * 0.24;
      const dynamicRearGap = GameConfig.traffic.safeRearGapMeters + Math.max(0, other.speedKmh - vehicle.speedKmh) * 0.2;
      const requiredGap = this.combinedHalfLengthMeters(vehicle, other) + (gapMeters >= 0 ? dynamicFrontGap : dynamicRearGap);
      if (Math.abs(gapMeters) < requiredGap) return false;
    }
    return true;
  }
  vehicleUsesLane(vehicle, laneIndex, laneCenterX) {
    return vehicle.currentLaneIndex === laneIndex || vehicle.targetLaneIndex === laneIndex || Math.abs(vehicle.x - laneCenterX) < vehicle.width * 0.82;
  }
  vehiclesShareTravelPath(first, second) {
    return first.currentLaneIndex === second.currentLaneIndex || first.targetLaneIndex === second.targetLaneIndex || first.currentLaneIndex === second.targetLaneIndex || first.targetLaneIndex === second.currentLaneIndex || Math.abs(first.x - second.x) < (first.width + second.width) * 0.55;
  }
  combinedHalfLengthMeters(first, second) {
    return (first.height + second.height) / (2 * GameConfig.world.pixelsPerMeter);
  }
  convertTrafficCollisionsToAccidents(trafficVehicles) {
    const accidents = [];
    for (let firstIndex = 0; firstIndex < trafficVehicles.length; firstIndex += 1) {
      const firstVehicle = trafficVehicles[firstIndex];
      if (!firstVehicle.isActive) continue;
      for (let secondIndex = firstIndex + 1; secondIndex < trafficVehicles.length; secondIndex += 1) {
        const secondVehicle = trafficVehicles[secondIndex];
        if (!secondVehicle.isActive) continue;
        if (!this.trafficVehiclesTouch(firstVehicle, secondVehicle)) continue;
        firstVehicle.isActive = false;
        secondVehicle.isActive = false;
        accidents.push(Obstacle.createTrafficAccident(this.nextAccidentId(), firstVehicle, secondVehicle, this.random));
        break;
      }
    }
    return accidents;
  }
  trafficVehiclesTouch(firstVehicle, secondVehicle) {
    const firstY = firstVehicle.worldDistanceMeters * GameConfig.world.pixelsPerMeter;
    const secondY = secondVehicle.worldDistanceMeters * GameConfig.world.pixelsPerMeter;
    const firstCircles = this.collisionSystem.createVehicleContactCircles(firstVehicle.x, firstY, firstVehicle.width, firstVehicle.height, firstVehicle.kind);
    const secondCircles = this.collisionSystem.createVehicleContactCircles(secondVehicle.x, secondY, secondVehicle.width, secondVehicle.height, secondVehicle.kind);
    return this.collisionSystem.circleSetsTouch(firstCircles, secondCircles);
  }
  nextAccidentId() {
    this.accidentCounter += 1;
    return `traffic-accident-${this.accidentCounter}`;
  }
};

// src/scenes/FailScene.ts
var FailScene = class {
  constructor(summary) {
    this.summary = summary;
  }
  name = "fail";
  roadRenderer = new RoadRenderer();
  enter(engine2) {
    engine2.audio.stopBackgroundMusic();
  }
  update(_deltaSeconds, engine2) {
    if (handleScreenControlInput(engine2, { x: 470, y: 436 }) !== "none") return;
    if (engine2.input.consumePressed("Enter", " ") || engine2.input.consumePointerClick()) {
      void engine2.audio.startBackgroundMusic();
      engine2.setScene(new PlayScene({ levelNumber: this.summary.levelNumber, score: this.summary.score }));
    }
    if (engine2.input.consumePressed("Escape")) {
      engine2.setScene(new StartScene({ levelNumber: this.summary.levelNumber, score: this.summary.score }));
    }
  }
  render(context, engine2) {
    this.roadRenderer.render(context, this.summary.distanceMeters);
    context.fillStyle = "rgba(69, 10, 10, 0.58)";
    context.fillRect(0, 0, 1280, 720);
    drawPanel(context, 330, 106, 620, 492, "LEVEL FAILED");
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "800 24px Inter, system-ui, sans-serif";
    drawOutlinedText(context, `${this.summary.fromCity} \u2192 ${this.summary.toCity}`, 640, 194, "#fecaca");
    context.font = "600 20px Inter, system-ui, sans-serif";
    context.fillStyle = "#ffffff";
    this.wrapText(context, this.summary.reason, 640, 258, 490, 30);
    const percent = Math.round(this.summary.distanceMeters / this.summary.levelDistanceMeters * 100);
    context.font = "700 19px Inter, system-ui, sans-serif";
    context.fillStyle = "#fef3c7";
    context.fillText(`Progress: ${percent}%`, 640, 348);
    context.fillText(`Time: ${formatTime(this.summary.elapsedSeconds)}`, 640, 382);
    context.fillText(`Score kept: ${this.summary.score}`, 640, 416);
    drawScreenControls(context, engine2, { x: 470, y: 436 });
    drawButton(context, "RETRY LEVEL", 470, 486, 340, 62);
    context.font = "500 16px Inter, system-ui, sans-serif";
    context.fillStyle = "#e5e7eb";
    context.fillText("Press Escape to return to the startup screen.", 640, 570);
    context.restore();
  }
  wrapText(context, text, centerX, startY, maxWidth, lineHeight) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    lines.forEach((lineText, index) => context.fillText(lineText, centerX, startY + index * lineHeight));
  }
};

// src/scenes/ResultScene.ts
var ResultScene = class {
  constructor(summary) {
    this.summary = summary;
  }
  name = "result";
  roadRenderer = new RoadRenderer();
  update(_deltaSeconds, engine2) {
    if (handleScreenControlInput(engine2, { x: 470, y: 508 }) !== "none") return;
    if (engine2.input.consumePressed("Enter", " ") || engine2.input.consumePointerClick()) {
      engine2.setScene(new PlayScene({ levelNumber: this.summary.levelNumber + 1, score: this.summary.totalScore }));
    }
    if (engine2.input.consumePressed("Escape")) {
      engine2.audio.stopBackgroundMusic();
      engine2.setScene(new StartScene({ levelNumber: this.summary.levelNumber + 1, score: this.summary.totalScore }));
    }
  }
  render(context, engine2) {
    this.roadRenderer.render(context, 0);
    context.fillStyle = "rgba(6, 78, 59, 0.55)";
    context.fillRect(0, 0, 1280, 720);
    drawPanel(context, 318, 62, 644, 640, "ROUTE COMPLETE");
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "800 24px Inter, system-ui, sans-serif";
    drawOutlinedText(context, `${this.summary.fromCity} \u2192 ${this.summary.toCity}`, 640, 154, "#bbf7d0");
    context.font = "700 20px Inter, system-ui, sans-serif";
    context.fillStyle = "#ffffff";
    context.fillText(`Finished in ${formatTime(this.summary.elapsedSeconds)}`, 640, 214);
    context.textAlign = "left";
    const labelX = 450;
    const valueX = 790;
    const startY = 260;
    const rowGap = 36;
    this.drawScoreRow(context, labelX, valueX, startY, "Previous score", this.summary.previousScore);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap, "Cargo bonus", this.summary.cargoScore);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap * 2, "Safe passing bonus", this.summary.passingScore);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap * 3, "Speed-limit penalties", -this.summary.speedPenaltyScore);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap * 4, "Completion bonus", this.summary.completionBonus);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap * 5, "Fast finish bonus", this.summary.timeBonus);
    context.strokeStyle = "rgba(255,255,255,0.3)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(labelX, startY + rowGap * 5.8);
    context.lineTo(valueX + 54, startY + rowGap * 5.8);
    context.stroke();
    context.font = "900 30px Inter, system-ui, sans-serif";
    context.fillStyle = "#fef08a";
    context.textAlign = "left";
    context.fillText("Total score", labelX, startY + rowGap * 6.55);
    context.textAlign = "right";
    context.fillText(String(this.summary.totalScore), valueX, startY + rowGap * 6.55);
    drawScreenControls(context, engine2, { x: 470, y: 508 });
    drawButton(context, "NEXT LEVEL", 470, 558, 340, 62);
    context.font = "500 16px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillStyle = "#e5e7eb";
    context.fillText("Press Escape to stop at the startup screen.", 640, 642);
    context.restore();
  }
  drawScoreRow(context, labelX, valueX, y, label, value) {
    context.font = "600 19px Inter, system-ui, sans-serif";
    context.fillStyle = "#dbeafe";
    context.textAlign = "left";
    context.fillText(label, labelX, y);
    context.textAlign = "right";
    context.fillStyle = "#ffffff";
    context.fillText(String(value), valueX, y);
  }
};

// src/scenes/PlayScene.ts
var PlayScene = class {
  name = "play";
  level;
  previousScore;
  player = new PlayerCar();
  random;
  spawner;
  speedLimitSystem;
  trafficSystem;
  collisionSystem = new CollisionSystem();
  roadRenderer = new RoadRenderer();
  vehicleRenderer = new VehicleRenderer();
  entityRenderer = new EntityRenderer();
  trafficVehicles = [];
  obstacles = [];
  cargos = [];
  floatingTextEffects = [];
  elapsedSeconds = 0;
  cargoScore = 0;
  passingScore = 0;
  speedPenaltyScore = 0;
  speedPenaltyAccumulatorSeconds = 0;
  wasSpeedPenaltyActive = false;
  passedVehicleCount = 0;
  passingPulseSeconds = 0;
  speedLimitStatus;
  lastCargoPopupText = "";
  cargoPopupSeconds = 0;
  constructor(options) {
    this.level = createLevelDefinition(options.levelNumber);
    this.previousScore = options.score;
    this.random = new RandomNumberGenerator(this.level.seed);
    this.spawner = new SpawnSystem(this.level, this.random);
    this.speedLimitSystem = new SpeedLimitSystem(this.level, this.random);
    this.trafficSystem = new TrafficSystem(this.level, this.random);
    this.speedLimitStatus = this.speedLimitSystem.getStatus(false);
  }
  enter(engine2) {
    void engine2.audio.startBackgroundMusic();
  }
  update(deltaSeconds, engine2) {
    if (this.handleExitOrSettings(engine2)) return;
    this.elapsedSeconds += deltaSeconds;
    this.cargoPopupSeconds = Math.max(0, this.cargoPopupSeconds - deltaSeconds);
    this.passingPulseSeconds = Math.max(0, this.passingPulseSeconds - deltaSeconds);
    this.updateFloatingTextEffects(deltaSeconds);
    this.player.update(deltaSeconds, engine2.input);
    this.speedLimitStatus = this.speedLimitSystem.update(deltaSeconds, this.player.speedKmh, this.player.distanceMeters);
    this.applySpeedLimitPenalty(deltaSeconds);
    const spawnedEntities = this.spawner.update(deltaSeconds, this.player.distanceMeters, this.player.speedKmh, this.trafficVehicles);
    this.trafficVehicles.push(...spawnedEntities.trafficVehicles);
    this.obstacles.push(...spawnedEntities.obstacles);
    this.cargos.push(...spawnedEntities.cargos);
    const trafficUpdateResult = this.trafficSystem.update(deltaSeconds, this.trafficVehicles);
    if (trafficUpdateResult.accidents.length > 0) {
      this.obstacles.push(...trafficUpdateResult.accidents);
      if (trafficUpdateResult.accidents.some((accident) => this.isEntityVisible(accident.worldDistanceMeters, 120))) {
        engine2.audio.playCrash();
      }
    }
    this.markOvertakenTrafficVehicles();
    this.collectCargo(engine2);
    this.removeInactiveEntities();
    const trafficCollision = this.collisionSystem.findTrafficCollision(this.player, this.trafficVehicles);
    if (trafficCollision) {
      this.fail(engine2, `You collided with a ${trafficCollision.kind}.`);
      return;
    }
    const obstacleCollision = this.collisionSystem.findObstacleCollision(this.player, this.obstacles);
    if (obstacleCollision) {
      this.fail(engine2, obstacleCollision.kind === "pit" ? "You failed to avoid a large pit." : "You crashed into an accident scene.");
      return;
    }
    if (this.player.distanceMeters >= this.level.distanceMeters) {
      this.completeLevel(engine2);
    }
  }
  render(context, engine2) {
    this.roadRenderer.render(context, this.player.distanceMeters, this.player.speedKmh);
    this.drawWorldEntities(context);
    this.vehicleRenderer.drawPlayer(context, this.player, this.player.speedKmh, this.passingPulseSeconds);
    this.drawDrivingEffects(context);
    this.drawHeadsUpDisplay(context, engine2);
  }
  handleExitOrSettings(engine2) {
    const controlAction = handleScreenControlInput(engine2, this.getPlayScreenControlsLayout());
    if (controlAction === "endGame" || engine2.input.consumePressed("Escape")) {
      engine2.audio.stopBackgroundMusic();
      engine2.setScene(new StartScene({ levelNumber: this.level.levelNumber, score: this.previousScore }));
      return true;
    }
    return controlAction !== "none";
  }
  applySpeedLimitPenalty(deltaSeconds) {
    if (!this.speedLimitStatus.isViolation || !this.speedLimitStatus.penaltyIsActive) {
      this.speedPenaltyAccumulatorSeconds = 0;
      this.wasSpeedPenaltyActive = false;
      return;
    }
    if (!this.wasSpeedPenaltyActive) {
      this.wasSpeedPenaltyActive = true;
      this.speedPenaltyScore += GameConfig.rules.speedPenaltyPointsPerSecond;
      this.addFloatingText("-1 SPEED", this.player.x, this.player.getScreenY() - 122, "#fecaca", 0.95);
    }
    this.speedPenaltyAccumulatorSeconds += deltaSeconds;
    while (this.speedPenaltyAccumulatorSeconds >= 1) {
      this.speedPenaltyAccumulatorSeconds -= 1;
      this.speedPenaltyScore += GameConfig.rules.speedPenaltyPointsPerSecond;
      this.addFloatingText("-1 SPEED", this.player.x, this.player.getScreenY() - 122, "#fecaca", 0.95);
    }
  }
  collectCargo(engine2) {
    const collected = this.collisionSystem.collectCargo(this.player, this.cargos);
    if (collected.length === 0) return;
    const bonus = collected.reduce((total, cargo) => total + cargo.bonusPoints, 0);
    this.cargoScore += bonus;
    this.lastCargoPopupText = `Cargo +${bonus}`;
    this.cargoPopupSeconds = 1.1;
    this.addFloatingText(`CARGO +${bonus}`, this.player.x, this.player.getScreenY() - 92, "#fde68a", 1.05);
    engine2.audio.playCargoCollected();
  }
  markOvertakenTrafficVehicles() {
    for (const vehicle of this.trafficVehicles) {
      if (!vehicle.isActive || !vehicle.spawnedAhead || vehicle.hasBeenOvertaken) continue;
      const hasDroppedBehindPlayer = vehicle.worldDistanceMeters < this.player.distanceMeters - 8;
      if (!hasDroppedBehindPlayer) continue;
      vehicle.hasBeenOvertaken = true;
      this.passedVehicleCount += 1;
      this.passingScore += GameConfig.rules.safePassBonus;
      this.passingPulseSeconds = 0.75;
      this.addFloatingText(`PASS +${GameConfig.rules.safePassBonus}`, clamp(vehicle.x, GameConfig.road.left + 70, GameConfig.road.right - 70), this.player.getScreenY() - 96, "#bbf7d0", 1.1);
    }
  }
  updateFloatingTextEffects(deltaSeconds) {
    for (const effect of this.floatingTextEffects) {
      effect.secondsRemaining -= deltaSeconds;
    }
    for (let index = this.floatingTextEffects.length - 1; index >= 0; index -= 1) {
      if (this.floatingTextEffects[index].secondsRemaining <= 0) this.floatingTextEffects.splice(index, 1);
    }
  }
  addFloatingText(text, x, y, fillStyle, totalSeconds) {
    this.floatingTextEffects.push({ text, x, y, fillStyle, totalSeconds, secondsRemaining: totalSeconds });
  }
  isEntityVisible(worldDistanceMeters, verticalPadding) {
    const screenY = this.toScreenY(worldDistanceMeters);
    return screenY >= -verticalPadding && screenY <= GameConfig.canvas.height + verticalPadding;
  }
  removeInactiveEntities() {
    const minimumDistance = this.player.distanceMeters - GameConfig.world.entityCleanupBehindMeters;
    this.removeInactiveOrOld(this.trafficVehicles, minimumDistance);
    this.removeInactiveOrOld(this.obstacles, minimumDistance);
    this.removeInactiveOrOld(this.cargos, minimumDistance);
  }
  removeInactiveOrOld(entities, minimumDistanceMeters) {
    for (let index = entities.length - 1; index >= 0; index -= 1) {
      const entity = entities[index];
      if (!entity.isActive || entity.worldDistanceMeters < minimumDistanceMeters) entities.splice(index, 1);
    }
  }
  drawWorldEntities(context) {
    const drawables = [];
    for (const obstacle of this.obstacles) {
      const screenY = this.toScreenY(obstacle.worldDistanceMeters);
      if (screenY < -150 || screenY > GameConfig.canvas.height + 150) continue;
      drawables.push({ screenY, draw: (ctx) => this.entityRenderer.drawObstacle(ctx, obstacle, screenY) });
    }
    for (const cargo of this.cargos) {
      const screenY = this.toScreenY(cargo.worldDistanceMeters);
      if (screenY < -120 || screenY > GameConfig.canvas.height + 120) continue;
      drawables.push({ screenY, draw: (ctx) => this.entityRenderer.drawCargo(ctx, cargo, screenY) });
    }
    for (const vehicle of this.trafficVehicles) {
      const screenY = this.toScreenY(vehicle.worldDistanceMeters);
      if (screenY < -180 || screenY > GameConfig.canvas.height + 180) continue;
      drawables.push({ screenY, draw: (ctx) => this.vehicleRenderer.drawTrafficVehicle(ctx, vehicle, screenY) });
    }
    drawables.sort((first, second) => first.screenY - second.screenY);
    for (const drawable of drawables) drawable.draw(context);
  }
  drawDrivingEffects(context) {
    this.drawPassingRibbons(context);
    this.drawFloatingTextEffects(context);
  }
  drawPassingRibbons(context) {
    if (this.passingPulseSeconds <= 0) return;
    const intensity = clamp(this.passingPulseSeconds / 0.75, 0, 1);
    const playerY = this.player.getScreenY();
    context.save();
    context.lineCap = "round";
    context.lineWidth = 5;
    context.strokeStyle = `rgba(250, 204, 21, ${0.18 + intensity * 0.28})`;
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(this.player.x + side * 34, playerY + 30);
      context.quadraticCurveTo(this.player.x + side * 86, playerY - 18, this.player.x + side * 58, playerY - 102);
      context.stroke();
    }
    context.restore();
  }
  drawFloatingTextEffects(context) {
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 24px Inter, system-ui, sans-serif";
    for (const effect of this.floatingTextEffects) {
      const progress = 1 - effect.secondsRemaining / effect.totalSeconds;
      const y = effect.y - progress * 44;
      const alpha = clamp(effect.secondsRemaining / effect.totalSeconds, 0, 1);
      context.globalAlpha = alpha;
      drawOutlinedText(context, effect.text, effect.x, y, effect.fillStyle, "rgba(0,0,0,0.7)", 5);
    }
    context.restore();
  }
  drawHeadsUpDisplay(context, engine2) {
    const score = this.currentScore();
    const progress = Math.min(1, this.player.distanceMeters / this.level.distanceMeters);
    const screenControlsLayout = this.getPlayScreenControlsLayout();
    context.save();
    fillRoundedRectangle(context, 18, 16, 376, 178, 16, "rgba(15, 23, 42, 0.86)");
    strokeRoundedRectangle(context, 18, 16, 376, 178, 16, "rgba(255, 255, 255, 0.2)", 2);
    context.font = "800 22px Inter, system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillStyle = "#fef08a";
    context.fillText(`Level ${this.level.levelNumber}`, 38, 42);
    context.fillStyle = "#ffffff";
    context.font = "600 18px Inter, system-ui, sans-serif";
    context.fillText(`${this.level.fromCity} \u2192 ${this.level.toCity}`, 38, 72);
    context.fillText(`Score: ${score}`, 38, 102);
    context.fillText(`Time: ${formatTime(this.elapsedSeconds)}`, 38, 132);
    context.fillText(`Safe passes: ${this.passedVehicleCount}`, 38, 162);
    fillRoundedRectangle(context, 186, 153, 172, 16, 8, "rgba(255,255,255,0.16)");
    fillRoundedRectangle(context, 186, 153, 172 * progress, 16, 8, "#22c55e");
    this.drawSpeedPanel(context);
    this.drawSpeedLimitRoadSign(context);
    drawScreenControls(context, engine2, screenControlsLayout);
    this.drawSpeedViolationWarning(context);
    if (this.cargoPopupSeconds > 0) {
      context.font = "900 30px Inter, system-ui, sans-serif";
      context.textAlign = "center";
      drawOutlinedText(context, this.lastCargoPopupText, this.player.x, this.player.getScreenY() - 76, "#fde68a", "rgba(0,0,0,0.7)", 6);
    }
    context.restore();
  }
  getPlayScreenControlsLayout() {
    const topHudRightEdge = 18 + 376;
    const speedPanelLeftEdge = 990;
    const buttonRowWidth = 136 + 10 + 136 + 10 + 108;
    const availableWidth = speedPanelLeftEdge - topHudRightEdge;
    const x = topHudRightEdge + Math.round((availableWidth - buttonRowWidth) / 2);
    return { x, y: 18, includeEndGameButton: true };
  }
  drawSpeedPanel(context) {
    const isViolation = this.speedLimitStatus.isViolation;
    fillRoundedRectangle(context, 990, 18, 262, isViolation ? 154 : 116, 16, "rgba(15, 23, 42, 0.86)");
    strokeRoundedRectangle(context, 990, 18, 262, isViolation ? 154 : 116, 16, isViolation ? "#f87171" : "rgba(255, 255, 255, 0.2)", 2);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 44px Inter, system-ui, sans-serif";
    drawOutlinedText(context, `${Math.round(this.player.speedKmh)}`, 1124, 58, isViolation ? "#fca5a5" : "#93c5fd", "rgba(0,0,0,0.65)", 5);
    context.font = "700 17px Inter, system-ui, sans-serif";
    context.fillStyle = "#ffffff";
    context.fillText("km/h", 1194, 58);
    context.font = "700 18px Inter, system-ui, sans-serif";
    context.fillText(`Limit ${this.speedLimitStatus.minimumSpeedKmh}-${this.speedLimitStatus.maximumSpeedKmh}`, 1121, 101);
    if (isViolation) {
      context.font = "800 16px Inter, system-ui, sans-serif";
      context.fillStyle = "#fecaca";
      const warningText = this.speedLimitStatus.penaltyIsActive ? `Penalty active -${GameConfig.rules.speedPenaltyPointsPerSecond}/s` : `Penalty in ${this.speedLimitStatus.secondsUntilPenalty.toFixed(1)}s`;
      context.fillText(warningText, 1121, 140);
    }
  }
  drawSpeedViolationWarning(context) {
    if (!this.speedLimitStatus.isViolation) return;
    const isPenaltyActive = this.speedLimitStatus.penaltyIsActive;
    const blink = Math.sin(this.elapsedSeconds * 10) > 0;
    const width = 490;
    const height = 72;
    const topHudRightEdge = 18 + 376;
    const speedPanelLeftEdge = 990;
    const availableWidth = speedPanelLeftEdge - topHudRightEdge;
    const x = topHudRightEdge + Math.round((availableWidth - width) / 2);
    const y = 62;
    context.save();
    fillRoundedRectangle(context, x, y, width, height, 18, isPenaltyActive ? "rgba(127, 29, 29, 0.94)" : "rgba(120, 53, 15, 0.94)");
    strokeRoundedRectangle(context, x, y, width, height, 18, blink ? "#fef08a" : "#fecaca", 4);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 23px Inter, system-ui, sans-serif";
    drawOutlinedText(context, "\u26A0 SPEED LIMIT WARNING", x + width / 2, y + 24, "#ffffff", "rgba(0,0,0,0.65)", 5);
    context.font = "800 17px Inter, system-ui, sans-serif";
    const detail = isPenaltyActive ? `Penalty active: losing ${GameConfig.rules.speedPenaltyPointsPerSecond} point every second` : `Adjust speed within ${this.speedLimitStatus.secondsUntilPenalty.toFixed(1)} seconds to avoid penalty`;
    context.fillStyle = isPenaltyActive ? "#fecaca" : "#fef3c7";
    context.fillText(detail, x + width / 2, y + 51);
    context.restore();
  }
  drawSpeedLimitRoadSign(context) {
    const shouldHighlight = this.speedLimitStatus.recentlyChangedSecondsRemaining > 0;
    const x = 1140;
    const y = 214;
    context.save();
    context.strokeStyle = "#475569";
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(x, y + 54);
    context.lineTo(x, y + 118);
    context.stroke();
    fillRoundedRectangle(context, x - 74, y - 58, 148, 112, 12, shouldHighlight ? "#dc2626" : "#ffffff");
    strokeRoundedRectangle(context, x - 74, y - 58, 148, 112, 12, shouldHighlight ? "#fef08a" : "#111827", 4);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 16px Inter, system-ui, sans-serif";
    context.fillStyle = shouldHighlight ? "#ffffff" : "#111827";
    context.fillText("SPEED", x, y - 34);
    context.font = "800 22px Inter, system-ui, sans-serif";
    context.fillText(`MIN ${this.speedLimitStatus.minimumSpeedKmh}`, x, y - 7);
    context.fillText(`MAX ${this.speedLimitStatus.maximumSpeedKmh}`, x, y + 25);
    context.restore();
  }
  fail(engine2, reason) {
    engine2.audio.playCrash();
    const summary = {
      levelNumber: this.level.levelNumber,
      fromCity: this.level.fromCity,
      toCity: this.level.toCity,
      reason,
      score: this.previousScore,
      distanceMeters: Math.min(this.player.distanceMeters, this.level.distanceMeters),
      levelDistanceMeters: this.level.distanceMeters,
      elapsedSeconds: this.elapsedSeconds
    };
    engine2.setScene(new FailScene(summary));
  }
  completeLevel(engine2) {
    const completionBonus = 500 + this.level.levelNumber * 175;
    const timeBonus = Math.max(0, Math.round((this.level.targetCompletionSeconds - this.elapsedSeconds) * 22 + GameConfig.rules.finishBonusBase));
    const totalScore = Math.max(0, this.previousScore + this.cargoScore + this.passingScore + completionBonus + timeBonus - this.speedPenaltyScore);
    const summary = {
      levelNumber: this.level.levelNumber,
      fromCity: this.level.fromCity,
      toCity: this.level.toCity,
      elapsedSeconds: this.elapsedSeconds,
      cargoScore: this.cargoScore,
      passingScore: this.passingScore,
      speedPenaltyScore: this.speedPenaltyScore,
      completionBonus,
      timeBonus,
      previousScore: this.previousScore,
      totalScore
    };
    engine2.setScene(new ResultScene(summary));
  }
  currentScore() {
    return Math.max(0, this.previousScore + this.cargoScore + this.passingScore - this.speedPenaltyScore);
  }
  toScreenY(worldDistanceMeters) {
    return this.player.getScreenY() - (worldDistanceMeters - this.player.distanceMeters) * GameConfig.world.pixelsPerMeter;
  }
};

// src/scenes/StartScene.ts
var StartScene = class {
  name = "start";
  roadRenderer = new RoadRenderer();
  options;
  constructor(options = { levelNumber: 1, score: 0 }) {
    this.options = options;
  }
  update(_deltaSeconds, engine2) {
    if (handleScreenControlInput(engine2, { x: 704, y: 512 }) !== "none") return;
    if (engine2.input.consumePressed("Enter", " ") || engine2.input.consumePointerClick()) {
      void engine2.audio.startBackgroundMusic();
      engine2.setScene(new PlayScene(this.options));
    }
  }
  render(context, engine2) {
    const level = createLevelDefinition(this.options.levelNumber);
    this.roadRenderer.render(context, 0);
    context.fillStyle = "rgba(0, 0, 0, 0.32)";
    context.fillRect(0, 0, 1280, 720);
    drawPanel(context, 270, 62, 740, 594, "CITY HIGHWAY RACER");
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "800 26px Inter, system-ui, sans-serif";
    drawOutlinedText(context, `Level ${level.levelNumber}: ${level.fromCity} \u2192 ${level.toCity}`, 640, 168, "#bbf7d0");
    context.font = "600 20px Inter, system-ui, sans-serif";
    context.fillStyle = "#e5e7eb";
    context.fillText("Drive between cities, avoid traffic, pits, and accidents.", 640, 224);
    context.fillText("Pass slower vehicles safely for bonus points.", 640, 256);
    context.fillText("Collect cargo and respect changing speed signs.", 640, 288);
    context.fillText("After 5 seconds over/under the limit, you lose 1 point per second.", 640, 320);
    context.textAlign = "left";
    context.font = "700 20px Inter, system-ui, sans-serif";
    context.fillStyle = "#fef08a";
    context.fillText("Controls", 402, 362);
    context.fillStyle = "#f8fafc";
    context.font = "500 18px Inter, system-ui, sans-serif";
    context.fillText("\u2191 / W  Accelerate", 402, 398);
    context.fillText("\u2193 / S  Decelerate", 402, 430);
    context.fillText("\u2190 / A  Steer left", 402, 462);
    context.fillText("\u2192 / D  Steer right", 402, 494);
    context.fillText("Touch: on-screen GO, BRAKE, \u2190, \u2192", 402, 526);
    context.fillText("Esc during play ends the current drive", 402, 548);
    context.textAlign = "left";
    context.fillStyle = "#93c5fd";
    context.font = "600 18px Inter, system-ui, sans-serif";
    context.fillText(`Current score: ${this.options.score}`, 700, 398);
    context.fillText(`Route distance: ${(level.distanceMeters / 1e3).toFixed(1)} km`, 700, 430);
    context.fillText(`Starting speed range: ${level.startingMinimumSpeedKmh}-${level.startingMaximumSpeedKmh} km/h`, 700, 462);
    context.fillText("AI traffic steers around slower vehicles", 700, 494);
    drawScreenControls(context, engine2, { x: 704, y: 512 });
    drawButton(context, "PRESS ENTER OR TAP TO START", 405, 574, 470, 58);
    context.restore();
  }
};

// src/main.ts
var canvas = document.querySelector("#gameCanvas");
if (!canvas) throw new Error("Missing #gameCanvas element.");
var touchControls = document.querySelector("#touchControls");
var engine = new GameEngine(canvas);
if (touchControls) engine.input.bindVirtualControls(touchControls);
engine.setScene(new StartScene());
engine.start();
window.addEventListener("beforeunload", () => engine.stop());
//# sourceMappingURL=main.js.map
