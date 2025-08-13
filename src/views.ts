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
import { clearCanvas } from "./graphics";
import { renderText, TextSize } from "./text";

export const drawLoadingView = (): void => {
    clearCanvas("rgb(50, 100, 50)");
    renderText("Loading...", TextSize.Normal, "Courier New");
};

export const drawStartScreen = (): void => {
    clearCanvas("rgb(100, 150, 100)");

    renderText(
        "FROST𖤓SUN",
        TextSize.Small,
        "Impact",
        1,
        4,
        false,
        0,
        "FROST𖤓SUN",
        ["#ACD5F3", "orange"],
    );

    renderText("presents", TextSize.Tiny, "Impact", 0.5, 5.25, false);

    renderText("[GAME TITLE HERE]", TextSize.Xl, "Impact", 1, 1.8);

    renderWaitForProgressInput("start");
};
