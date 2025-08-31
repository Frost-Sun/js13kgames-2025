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

import {
    initializeAudio,
    playTune,
    SFX_GAMEOVER,
    SFX_RUNNING,
    SFX_START,
} from "./audio/sfx";
import { propabilityToNoticeDebug } from "./CatAi";
import {
    initializeControls,
    renderWaitForProgressInput,
    updateControls,
    waitForProgressInput,
} from "./controls";
import type { TimeStep } from "./core/time/TimeStep";
import { canvas, clearCanvas, cx } from "./graphics";
import { Level, LevelState } from "./Level";
import { renderText, TextSize } from "./text";
import { drawLoadingView, drawReadyView, drawStartScreen } from "./views";

export enum GameState {
    Load,
    Ready,
    StartScreen,
    Running,
    GameOver,
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
        case GameState.Load: {
            waitForProgressInput().then(() => setState(GameState.Ready));
            break;
        }
        case GameState.Ready: {
            waitForProgressInput(SFX_START).then(() =>
                setState(GameState.StartScreen),
            );
            break;
        }
        case GameState.StartScreen: {
            waitForProgressInput(SFX_RUNNING).then(() =>
                setState(GameState.Running),
            );
            break;
        }
        case GameState.Running: {
            level = new Level();
            break;
        }
        case GameState.GameOver: {
            playTune(SFX_GAMEOVER);
            waitForProgressInput(SFX_START).then(() =>
                setState(GameState.StartScreen),
            );
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

            if (level.state === LevelState.Lose) {
                setState(GameState.GameOver);
            }
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

        case GameState.Ready:
            drawReadyView();
            break;

        case GameState.StartScreen:
            drawStartScreen(cx);
            break;

        case GameState.Running: {
            level.draw(time);

            // Debug drawing of the propability of the cat to notice the mouse.
            cx.save();
            cx.fillStyle = "red";
            cx.font = "32px Courier New";
            cx.fillText(propabilityToNoticeDebug.toFixed(2), 10, 40);
            cx.restore();

            break;
        }

        case GameState.GameOver: {
            level.draw(time);
            renderText("GAME OVER ☹", TextSize.Huge, "Courier New");
            renderWaitForProgressInput("try again");
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

    await initializeAudio();

    setState(GameState.Ready);
};
