import { GameEngine } from './core/GameEngine.js';
import { StartScene } from './scenes/StartScene.js';

const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas');
if (!canvas) throw new Error('Missing #gameCanvas element.');

const touchControls = document.querySelector<HTMLElement>('#touchControls');

const engine = new GameEngine(canvas);
if (touchControls) engine.input.bindVirtualControls(touchControls);
engine.setScene(new StartScene());
engine.start();

window.addEventListener('beforeunload', () => engine.stop());
