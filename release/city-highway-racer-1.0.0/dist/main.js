import { GameEngine } from './core/GameEngine.js';
import { StartScene } from './scenes/StartScene.js';
const canvas = document.querySelector('#gameCanvas');
if (!canvas)
    throw new Error('Missing #gameCanvas element.');
const touchControls = document.querySelector('#touchControls');
const engine = new GameEngine(canvas);
if (touchControls)
    engine.input.bindVirtualControls(touchControls);
engine.setScene(new StartScene());
engine.start();
window.addEventListener('beforeunload', () => engine.stop());
