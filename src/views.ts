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
import { renderBlackCat } from "./BlackCatAnimation";
import { renderGradient } from "./core/graphics/gradient";
// renderGradient not used here on difficulty screen
import type { TimeStep } from "./core/time/TimeStep";

const startScreenAnim = { t: 0, thunderTimer: 0, nextThunder: 0 };
const readyViewAnim = { t: 0 };
const gameOverAnim = { t: 0 };

export const updateStartScreen = (dt: number) => {
    startScreenAnim.t += dt;
    startScreenAnim.thunderTimer += dt;
    updateThunder(dt);
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

    // Draw the same subtle radial gradient used for the backdrop so the
    // full Start screen keeps the intended lighting.
    renderGradient(canvas, cx, 0.9);

    // Animate cat bobbing up and down
    const bob = Math.sin(startScreenAnim.t * 0.003) * canvas.height * 0.02;
    renderBlackCat(
        canvas.width / 2 - canvas.width * 0.18,
        canvas.height / 2 + canvas.width * 0.17 + bob,
        canvas.width * 0.36,
        "down",
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
    renderText("DG", TextSize.Xl, 1, 1.8, true, 14, "DG", ["red", "orange"]);

    renderWaitForProgressInput("start");

    drawRain(time.t, canvas.width, canvas.height, 0.2);
    drawThunder();
};

// Draw only the start-screen backdrop: cat bobbing, rain and thunder.
export const drawStartBackdrop = (time: TimeStep): void => {
    clearCanvas("rgb(20, 20, 20)");

    // Draw a subtle radial gradient over the ground to add depth behind
    // the cat. Use a reduced opacity so rain/thunder and the cat remain
    // clearly visible.
    renderGradient(canvas, cx, 0.9);

    const bob = Math.sin(startScreenAnim.t * 0.003) * canvas.height * 0.02;
    renderBlackCat(
        canvas.width / 2 - canvas.width * 0.18,
        canvas.height / 2 + canvas.width * 0.17 + bob,
        canvas.width * 0.36,
        "down",
        true,
        1,
        0,
        0,
        { t: startScreenAnim.t, dt: 0 },
    );

    // Keep the environmental effects
    drawRain(time.t, canvas.width, canvas.height, 0.2);
    drawThunder();
};

// Difficulty selection screen
export const drawDifficultySelect = (yShift = 0): void => {
    renderText("Select difficulty", TextSize.Large, 1, 2 + yShift);
    renderText("E — EASY  ", TextSize.Normal, 1, 4 + yShift);
    renderText("N — NORMAL", TextSize.Normal, 1, 6 + yShift);
    drawThunder();
};
