import { GameConfig } from '../config/GameConfig.js';
import { AudioManager } from './AudioManager.js';
import { InputController } from './InputController.js';
export class GameEngine {
    input = new InputController();
    audio = new AudioManager();
    canvas;
    context;
    activeScene = null;
    lastFrameTime = 0;
    animationFrameHandle = 0;
    constructor(canvas) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('Unable to create 2D canvas context.');
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
        const deltaSeconds = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
        this.lastFrameTime = timestamp;
        this.audio.update(deltaSeconds);
        this.activeScene?.update(deltaSeconds, this);
        this.activeScene?.render(this.context, this);
        this.input.endFrame();
        this.animationFrameHandle = requestAnimationFrame(this.onAnimationFrame);
    };
}
