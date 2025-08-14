/*
 * Copyright (c) 2025 Tero Jäntti, Sami Heikkinen
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { initializeControls, waitForProgressInput } from "./controls";
import { sleep } from "./core/time/sleep";
import { canvas, clearCanvas, cx } from "./graphics";
import { drawLoadingView, drawStartScreen } from "./views";

enum GameState {
    Load,
    StartScreen,
    Running,
}

let gameState: GameState = GameState.Load;

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

const setState = (newState: GameState): void => {
    gameState = newState;

    switch (gameState) {
        case GameState.StartScreen: {
            waitForProgressInput().then(() => setState(GameState.Running));
            break;
        }

        default:
            break;
    }
};

const update = (t: number, dt: number): void => {
    switch (gameState) {
        case GameState.Running: {
            const newX = x + dt * 0.5;
            const newY = y + dt * 0.6;
            x = newX < canvas.width ? newX : 0;
            y = newY < canvas.height ? newY : 0;
            break;
        }

        default:
            break;
    }
};

const draw = (t: number, _: number): void => {
    cx.save();

    clearCanvas();

    switch (gameState) {
        case GameState.Load:
            drawLoadingView();
            break;

        case GameState.StartScreen:
            drawStartScreen();
            break;

        case GameState.Running: {
            cx.save();
            clearCanvas("rgb(180, 180, 220)");

            // DUMMY OBJECT FOR TESTING
            cx.fillStyle = `rgb(80, 80, ${200 + Math.sin(t / 500) * 55})`;
            cx.fillRect(x, y, 150, 150);
            cx.fillStyle = "red";
            cx.font = "32px Courier New";
            cx.fillText("JS13k", x + 8, y + 40);

            cx.restore();
            break;
        }

        default:
            break;
    }

    cx.restore();
};

export const init = async (): Promise<void> => {
    // Make sure the canvas can can be focused
    canvas.tabIndex = 0;
    canvas.style.outline = "none"; // Prevents outline when focused

    initializeControls();

    window.requestAnimationFrame(gameLoop);

    // DUMMY SLEEP FOR TESTING LOAD SCREEN
    await sleep(1500);

    setState(GameState.StartScreen);
};
