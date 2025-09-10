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
import {
    hearAccuracyDebug,
    CERTAIN_OBSERVATION_THERSHOLD,
    sightAccuracyDebug,
    VAGUE_OBSERVATION_THRESHOLD,
} from "./CatAi";
import {
    initializeControls,
    renderWaitForProgressInput,
    updateControls,
    waitForProgressInput,
} from "./controls";
import type { TimeStep } from "./core/time/TimeStep";
import { canvas, clearCanvas, cx } from "./graphics";
import { Level, LevelState, resetGameStartTime } from "./Level";
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

let level: Level;

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
            resetGameStartTime();
            level = new Level(0);
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
            } else if (level.state === LevelState.Finished) {
                const previousNumber = level.number;
                level = new Level(previousNumber + 1);
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

            // Debug drawing of the accuracy of the cat noticing the mouse.
            cx.save();
            cx.font = "32px Courier New";
            cx.fillStyle =
                sightAccuracyDebug > CERTAIN_OBSERVATION_THERSHOLD
                    ? "red"
                    : sightAccuracyDebug > VAGUE_OBSERVATION_THRESHOLD
                      ? "orange"
                      : "white";
            cx.fillText("see: " + sightAccuracyDebug.toFixed(2), 10, 30);
            cx.fillStyle =
                hearAccuracyDebug > CERTAIN_OBSERVATION_THERSHOLD
                    ? "red"
                    : hearAccuracyDebug > VAGUE_OBSERVATION_THRESHOLD
                      ? "orange"
                      : "white";
            cx.fillText("hear:" + hearAccuracyDebug.toFixed(2), 10, 65);
            cx.restore();

            renderText(
                level.number > 0 ? "BACKYARD " + level.number : "Outside",
                TextSize.Small,
                "Courier New",
                1,
                2,
                false,
                25,
            );

            break;
        }

        case GameState.GameOver: {
            level.draw(time);
            cx.save();
            cx.globalAlpha = 0.6;
            cx.fillStyle = "#000";
            cx.fillRect(0, 0, canvas.width, canvas.height);
            cx.restore();
            renderText("GAME OVER ☹", TextSize.Huge, "Impact");
            renderText(
                "You reached backyard #" + level.number,
                TextSize.Normal,
                "Courier New",
                1,
                3,
            );
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
