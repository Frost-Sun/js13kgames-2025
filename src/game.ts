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

import { initialize } from "./audio/sfx";
import {
    initializeControls,
    updateControls,
    waitForProgressInput,
} from "./controls";
import { sleep } from "./core/time/sleep";
import type { TimeStep } from "./core/time/TimeStep";
import { canvas, clearCanvas, cx, drawRain } from "./graphics";
import { Level } from "./Level";
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
const time: TimeStep = {
    t: 0,
    dt: 0,
};

let level = new Level();

const NIGHT_START_TIME = 5000;
let runningStartTime = 0;

const gameLoop = (t: number): void => {
    requestAnimationFrame(gameLoop);

    time.t = t;
    time.dt = Math.min(t - lastTime, MAX_FRAME);
    lastTime = t;

    update(time);
    draw(time);
};

const setState = (newState: GameState): void => {
    gameState = newState;

    switch (gameState) {
        case GameState.StartScreen: {
            waitForProgressInput().then(() => setState(GameState.Running));
            break;
        }
        case GameState.Running: {
            runningStartTime = performance.now();
            break;
        }
        default:
            break;
    }
};

const update = (time: TimeStep): void => {
    switch (gameState) {
        case GameState.Running: {
            updateControls();
            level.update(time);
            break;
        }

        default:
            break;
    }
};

const draw = (time: TimeStep): void => {
    cx.save();

    clearCanvas();

    switch (gameState) {
        case GameState.Load:
            drawLoadingView();
            break;

        case GameState.StartScreen:
            drawStartScreen(cx);
            break;

        case GameState.Running: {
            clearCanvas("rgb(0, 0, 0)");

            level.draw(time);

            drawRain(time.t, cx.canvas.width, cx.canvas.height);

            const elapsed = time.t - runningStartTime;
            if (elapsed > NIGHT_START_TIME) {
                cx.save();
                cx.globalAlpha = Math.min(
                    (elapsed - NIGHT_START_TIME) / 10000,
                    0.7,
                ); // fade in to max 0.7
                cx.fillStyle = "#000";
                cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height);
                cx.restore();
            }
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

    requestAnimationFrame(gameLoop);

    // DUMMY SLEEP FOR TESTING LOAD SCREEN
    await sleep(1500);

    level = new Level();

    initialize();
    setState(GameState.StartScreen);
};
