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
    getKeys,
    initializeKeyboard,
    waitForEnter,
} from "./core/controls/keyboard";
import {
    hasTouchScreen,
    initializeTouchscreen,
    waitForTap,
} from "./core/controls/touchscreen";
import { normalize, ZERO_VECTOR, type VectorMutable } from "./core/math/Vector";
import { canvas } from "./graphics";
import { renderText, TextSize } from "./text";

export interface Controls {
    movement: VectorMutable;
}

const controls: Controls = {
    movement: { x: 0, y: 0 },
};

export const initializeControls = (): void => {
    initializeKeyboard();
    initializeTouchscreen();
};

export const updateControls = (): void => {
    const keys = getKeys();

    const left = keys.ArrowLeft || keys.KeyA;
    const right = keys.ArrowRight || keys.KeyD;
    const up = keys.ArrowUp || keys.KeyW;
    const down = keys.ArrowDown || keys.KeyS;

    const dx = left ? -1 : right ? 1 : 0;
    const dy = up ? -1 : down ? 1 : 0;

    if (dx === 0 && dy === 0) {
        controls.movement = ZERO_VECTOR;
    } else {
        controls.movement = normalize({
            x: dx,
            y: dy,
        });
    }
};

export const getControls = (): Controls => {
    return controls;
};

export const waitForProgressInput = async (): Promise<void> => {
    await (hasTouchScreen ? waitForTap(canvas) : waitForEnter());
};

export const renderWaitForProgressInput = (
    action = "continue",
    y = 7.7,
): void => {
    const text =
        (hasTouchScreen ? "Tap the screen to " : "Press ENTER to ") + action;

    renderText(text, TextSize.Small, "Courier New", 1, y, true, 0, text);
};
