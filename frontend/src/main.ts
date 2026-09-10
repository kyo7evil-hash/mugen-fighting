import { App } from './core/app.js';
import { Boot } from './scenes/boot.js';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = new App(canvas);
(window as unknown as { __app: App }).__app = app;
app.replace(new Boot());
app.start();
