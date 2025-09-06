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

export type BlackCatFacing =
    | "side"
    | "up"
    | "down"
    | "up-left"
    | "up-right"
    | "down-left"
    | "down-right";

import type { TimeStep } from "./core/time/TimeStep";

const CAT_ASPECT_RATIO = 3 / 4;

// Draws a cat eye at (x, y) with open/closed state
export function renderCatEye(
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    open: boolean,
) {
    const eo = open ? 1 : 0.7;
    [
        [width * 0.07, width * 0.04 * eo, "#fff"],
        [width * 0.06, width * 0.03 * eo, "green"],
        [width * 0.025, width * 0.018 * eo, "#181818"],
    ].forEach((item) => {
        const [rx, ry, fill] = item as [number, number, string];
        cx.beginPath();
        cx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        cx.fillStyle = fill;
        cx.fill();
    });
    // Eye highlight
    cx.beginPath();
    cx.arc(x - width * 0.02, y - width * 0.01, width * 0.01, 0, Math.PI * 2);
    cx.fillStyle = "#fff";
    cx.fill();
}

export function renderBlackCat(
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    facing: BlackCatFacing,
    eyesOpen: boolean,
    dir: number,
    step: number,
    lastSpeed: number,
    time: TimeStep,
) {
    const t = time.t,
        h = width / CAT_ASPECT_RATIO;
    cx.save();
    cx.translate(0, -h * 0.25);
    cx.translate(x + width / 2, y + h / 2);
    cx.scale(facing === "side" ? dir : 1, 1);
    cx.translate(
        0,
        Math.sin(t / 220 + step * 2.0) *
            (h * 0.05 * (0.4 + Math.min(1, lastSpeed * 0.8))),
    );
    // Body
    cx.beginPath();
    cx.ellipse(0, h * 0.2, width * 0.35, h * 0.28, 0, 0, Math.PI * 2);
    cx.fillStyle = "#000";
    cx.fill();
    // Head
    cx.beginPath();
    cx.ellipse(0, -h * 0.18, width * 0.28, h * 0.22, 0, 0, Math.PI * 2);
    cx.fill();
    // Ears
    const earY = -h * 0.5,
        earW = width * 0.16,
        earH = h * 0.18;
    if (facing === "side") {
        // Eye (profile)
        renderCatEye(cx, width * 0.19, -h * 0.18, width, eyesOpen);
        [
            [width * 0.03, earW * 0.7, earH * 0.7, 0.1],
            [width * 0.13, earW, earH, 0],
        ].forEach(([ex, ew, eh, yoff]) => {
            cx.save();
            cx.beginPath();
            cx.moveTo(ex, earY + earH * yoff);
            cx.lineTo(ex + ew / 2, earY + eh + earH * yoff);
            cx.lineTo(ex - ew / 2, earY + eh + earH * yoff);
            cx.closePath();
            cx.fillStyle = "#000";
            cx.fill();
            cx.restore();
        });
        // Nose
        cx.fillStyle = "#e68686";
        cx.beginPath();
        cx.ellipse(
            width * 0.28,
            -h * 0.11,
            width * 0.018,
            h * 0.012,
            0,
            0,
            Math.PI * 2,
        );
        cx.fill();
        // Whiskers (right only)
        cx.strokeStyle = "#e6d6e6";
        cx.lineWidth = Math.max(0.1, width * 0.012);
        const wy = -h * 0.1,
            wl = width * 0.18,
            ws = width * 0.04;
        [-1, 0, 1].forEach((row) => {
            cx.beginPath();
            cx.moveTo(width * 0.13, wy + row * ws);
            cx.bezierCurveTo(
                width * 0.22,
                wy + row * ws + wl * 0.1,
                width * 0.32,
                wy + row * ws + wl * 0.3,
                width * 0.38,
                wy + row * ws + wl * 0.2,
            );
            cx.stroke();
        });
    } else {
        [
            [-width * 0.13, -1],
            [width * 0.13, 1],
        ].forEach(([ex, sign]) => {
            cx.beginPath();
            cx.moveTo(ex, earY);
            cx.lineTo(ex - (sign * earW) / 2, earY + earH);
            cx.lineTo(ex + (sign * earW) / 2, earY + earH);
            cx.closePath();
            cx.fillStyle = "#000";
            cx.fill();
        });
    }
    // Tail
    const tailStartX = -width * 0.33,
        tailStartY = h * 0.2,
        tailThickness = width * 0.07,
        tailEndX = tailStartX + width * 0.22,
        tailEndY = tailStartY + h * 0.32,
        ctrl1X = tailStartX - width * 0.2,
        ctrl1Y = tailStartY - h * 0.1,
        ctrl2X = tailStartX - width * 0.1,
        ctrl2Y = tailStartY + h * 0.25;
    cx.beginPath();
    cx.moveTo(tailStartX, tailStartY);
    cx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, tailEndX, tailEndY);
    cx.strokeStyle = "#000";
    cx.lineWidth = tailThickness;
    cx.stroke();
    cx.beginPath();
    cx.arc(tailEndX, tailEndY, tailThickness / 2, 0, Math.PI * 2);
    cx.fillStyle = "#000";
    cx.fill();
    if (facing.includes("down")) {
        cx.save();
        cx.translate(0, -h * 0.18);
        [-width * 0.09, width * 0.09].forEach((dx) =>
            renderCatEye(cx, dx, 0, width, eyesOpen),
        );
        cx.restore();
        // Nose
        cx.beginPath();
        cx.ellipse(0, -h * 0.11, width * 0.018, h * 0.012, 0, 0, Math.PI * 2);
        cx.fillStyle = "#e68686";
        cx.fill();
        // Whiskers
        cx.strokeStyle = "#e6d6e6";
        cx.lineWidth = Math.max(0.1, width * 0.012);
        const wy = -h * 0.1,
            wl = width * 0.18,
            ws = width * 0.04;
        [-1, 0, 1].forEach((row) => {
            cx.beginPath();
            cx.moveTo(-width * 0.13, wy + row * ws);
            cx.bezierCurveTo(
                -width * 0.22,
                wy + row * ws + wl * 0.1,
                -width * 0.32,
                wy + row * ws + wl * 0.3,
                -width * 0.38,
                wy + row * ws + wl * 0.2,
            );
            cx.stroke();
            cx.beginPath();
            cx.moveTo(width * 0.13, wy + row * ws);
            cx.bezierCurveTo(
                width * 0.22,
                wy + row * ws + wl * 0.1,
                width * 0.32,
                wy + row * ws + wl * 0.3,
                width * 0.38,
                wy + row * ws + wl * 0.2,
            );
            cx.stroke();
        });
    }
    cx.restore();
}
