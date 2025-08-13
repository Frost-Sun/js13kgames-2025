import { canvas, cx } from "./graphics";

const TIME_STEP = 1000 / 60;
const MAX_FRAME = TIME_STEP * 5;

let lastTime = 0;

const gameLoop = (t: number): void => {
    requestAnimationFrame(gameLoop);

    const dt = Math.min(t - lastTime, MAX_FRAME);
    lastTime = t;

    update(t, dt);
    draw(t, dt);
};

let x = 0;
let y = 0;

const update = (t: number, dt: number): void => {
    const newX = x + dt * 0.5;
    const newY = t < 5000 ? (t / 5000) * 300 : 300;
    x = newX < canvas.width ? newX : 0;
    y = newY;
};

const draw = (t: number, _: number): void => {
    cx.save();
    cx.fillStyle = "black";
    cx.fillRect(0, 0, canvas.width, canvas.height);
    cx.fillStyle = `rgb(100, 100, ${200 + Math.sin(t / 500) * 55})`;
    cx.fillRect(x, y, 150, 150);
    cx.restore();
};

export const start = async (): Promise<void> => {
    window.requestAnimationFrame(gameLoop);
};
