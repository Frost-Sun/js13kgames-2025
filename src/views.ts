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

import { renderWaitForProgressInput } from "./controls";
import {
    canvas,
    clearCanvas,
    drawRain,
    drawThunder,
    updateThunder,
    cx,
} from "./graphics";
import { renderText, TextSize } from "./text";
import { renderBlackCat, type BlackCatFacing } from "./BlackCatAnimation";
import { renderGradient } from "./core/graphics/gradient";
// renderGradient not used here on difficulty screen
import type { TimeStep } from "./core/time/TimeStep";

type LookState = {
    bias: number;
    target: number;
    timer: number;
    nextChange: number;
};

const startScreenAnim: {
    t: number;
    thunderTimer: number;
    nextThunder: number;
    look: LookState;
} = {
    t: 0,
    thunderTimer: 0,
    nextThunder: 0,
    // look: animates where the cat is looking; bias -1..1 (-1 = left, 0 = center, 1 = right)
    look: {
        bias: 0,
        target: 0,
        timer: 0,
        nextChange: 2000 + Math.random() * 4000,
    },
};
const readyViewAnim = { t: 0 };
const gameOverAnim = { t: 0 };

export const updateStartScreen = (dt: number) => {
    startScreenAnim.t += dt;
    startScreenAnim.thunderTimer += dt;
    updateThunder(dt);
    // update look state: occasionally pick a new target (-1 left, 0 center, 1 right)
    const look = startScreenAnim.look;
    look.timer += dt;
    if (look.timer >= look.nextChange) {
        look.timer = 0;
        look.nextChange = 2000 + Math.random() * 4000; // 2..6s until next change
        const r = Math.random();
        if (r < 0.6) {
            look.target = 0; // mostly neutral
        } else if (r < 0.8) {
            look.target = -1;
        } else {
            look.target = 1;
        }
    }
    // smooth towards target; dt is ms so use ~800ms smoothing
    const alpha = Math.min(1, dt / 800);
    look.bias += (look.target - look.bias) * alpha;
};

export const updateReadyView = (dt: number) => {
    readyViewAnim.t += dt;
    updateThunder(dt);
};

export const updateGameOverView = (dt: number) => {
    gameOverAnim.t += dt;
    updateThunder(dt);
};

export const drawLoadingView = (): void => {
    clearCanvas("rgb(0, 0, 0)");
    renderText("Loading...", TextSize.Normal);
};

export const drawReadyView = (): void => {
    clearCanvas("rgb(0, 0, 0)");
    renderText("Press ENTER to start", TextSize.Normal);
    drawThunder();
};

export const drawStartScreen = (time: TimeStep): void => {
    clearCanvas("rgb(20, 20, 20)");

    renderGradient(canvas, cx, 0.9);

    // Animate cat bobbing up and down
    const bob = Math.sin(startScreenAnim.t * 0.003) * canvas.height * 0.02;
    // determine facing from current look bias (-1..1)
    const lookBias = startScreenAnim.look ? startScreenAnim.look.bias : 0;
    let facingFromBias: BlackCatFacing = "down";
    if (lookBias > 0.33) facingFromBias = "down-right";
    else if (lookBias < -0.33) facingFromBias = "down-left";
    renderBlackCat(
        canvas.width / 2 - canvas.width * 0.18,
        canvas.height / 2 + canvas.width * 0.17 + bob,
        canvas.width * 0.36,
        facingFromBias,
        true,
        1,
        0,
        0,
        { t: startScreenAnim.t, dt: 0 },
    );

    renderText("FROST𖤓SUN", TextSize.Large, 1, 4, false, 0, "FROST𖤓SUN", [
        "#ACD5F3",
        "orange",
    ]);

    renderText("presents", TextSize.Tiny, 0.5, 5.25, false);

    renderText(
        "MIDNIGHT PAWS",
        TextSize.Xl,
        1,
        1.8,
        true,
        -2,
        "MIDNIGHT PAWS",
        ["white", "gray"],
    );
    renderText("DC", TextSize.Xl, 1, 1.8, true, 14, "DC", ["red", "orange"]);

    renderWaitForProgressInput("start");

    drawRain(time.t, canvas.width, canvas.height, 0.2);
    drawThunder();
};

// Draw only the start-screen backdrop: cat bobbing, rain and thunder.
export const drawStartBackdrop = (time: TimeStep): void => {
    clearCanvas("rgb(20, 20, 20)");

    renderGradient(canvas, cx, 0.9);

    const bob = Math.sin(startScreenAnim.t * 0.003) * canvas.height * 0.02;
    renderBlackCat(
        canvas.width / 2 - canvas.width * 0.18,
        canvas.height / 2 + canvas.width * 0.17 + bob,
        canvas.width * 0.36,
        "down",
        false,
        1,
        0,
        0,
        { t: startScreenAnim.t, dt: 0 },
    );

    drawRain(time.t, canvas.width, canvas.height, 0.2);
    drawThunder();
};

// Difficulty selection screen
export const drawDifficultySelect = (yShift = 0): void => {
    renderText("Select difficulty", TextSize.Large, 1, 2 + yShift);
    renderText("  E — EASY  ", TextSize.Normal, 1, 5 + yShift);
    renderText("H — HARD", TextSize.Normal, 1, 7 + yShift);
    drawThunder();
};
