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

import { initializeKeyboard, waitForEnter } from "./core/controls/keyboard";
import {
    hasTouchScreen,
    initializeTouchscreen,
    waitForTap,
} from "./core/controls/touchscreen";
import { canvas } from "./graphics";
import { renderText, TextSize } from "./text";

export const initializeControls = (): void => {
    initializeKeyboard();
    initializeTouchscreen();
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
