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

import { canvas, cx } from "./graphics";

export enum TextSize {
    Tiny = 16,
    Xs = 20,
    Small = 24,
    Normal = 32,
    Large = 48,
    Xl = 64,
    Huge = 80,
}

export const renderText = (
    text: string,
    textSize: TextSize,
    alpha = 1,
    yAdjust = 0,
    centerY = true,
    xAdjust = 0,
    referenceText?: string,
    color: string | [string, string] = "white",
) => {
    cx.save();
    cx.shadowColor = "rgba(0,0,0,0.8)";
    cx.shadowBlur = 4;
    cx.shadowOffsetX = 2;
    cx.shadowOffsetY = 2;
    const fontSize = Math.floor(textSize * (canvas.width / 1000));
    const rem = Math.floor(TextSize.Tiny * (canvas.width / 1000));
    cx.globalAlpha = Math.max(alpha, 0);
    cx.font =
        fontSize +
        "px " +
        (textSize >= TextSize.Large ? "Impact" : "Courier New");
    const t = referenceText ?? text,
        m = cx.measureText(t);
    const a = m.actualBoundingBoxAscent ?? fontSize * 0.8,
        d = m.actualBoundingBoxDescent ?? fontSize * 0.2;
    const w = m.width,
        x = (canvas.width - w) / 2 + xAdjust * rem,
        y = (centerY ? canvas.height / 2 : 0) + yAdjust * rem;
    if (Array.isArray(color) && color.length === 2) {
        const g = cx.createLinearGradient(0, y - a, 0, y + d);
        g.addColorStop(0.2, color[0]);
        g.addColorStop(1, color[1]);
        cx.fillStyle = g;
    } else {
        cx.fillStyle = color;
    }
    cx.textBaseline = "alphabetic";
    cx.fillText(text, x, y);
    cx.restore();
};
