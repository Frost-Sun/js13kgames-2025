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
    const t = time.t;
    const height = width / CAT_ASPECT_RATIO;

    cx.save();

    // For a pseudo-3D effect, the bounding box should be
    // on the ground and the figure "rise" from there.
    cx.translate(0, -height * 0.7);

    // Centered transform; flip only for side pose; subtle bob when moving
    cx.translate(x + width / 2, y + height / 2);
    cx.scale(facing === "side" ? dir : 1, 1);

    const moveFactor = Math.min(1, lastSpeed * 0.8);
    const bob =
        Math.sin(t / 220 + step * 2.0) * (height * 0.05 * (0.4 + moveFactor));
    cx.translate(0, bob);

    // Body
    cx.beginPath();
    cx.ellipse(0, height * 0.2, width * 0.35, height * 0.28, 0, 0, Math.PI * 2);
    cx.fillStyle = "#181818";
    cx.fill();

    // Head
    cx.beginPath();
    cx.ellipse(
        0,
        -height * 0.18,
        width * 0.28,
        height * 0.22,
        0,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#181818";
    cx.fill();

    // Ears
    const earY = -height * 0.5;
    const earW = width * 0.16;
    const earH = height * 0.18;
    // Left ear
    cx.beginPath();
    cx.moveTo(-width * 0.13, earY);
    cx.lineTo(-width * 0.13 - earW / 2, earY + earH);
    cx.lineTo(-width * 0.13 + earW / 2, earY + earH);
    cx.closePath();
    cx.fillStyle = "#181818";
    cx.fill();
    // Right ear
    cx.beginPath();
    cx.moveTo(width * 0.13, earY);
    cx.lineTo(width * 0.13 - earW / 2, earY + earH);
    cx.lineTo(width * 0.13 + earW / 2, earY + earH);
    cx.closePath();
    cx.fillStyle = "#181818";
    cx.fill();

    // Eyes
    const eo = eyesOpen ? 1 : 0.7;
    cx.save();
    cx.translate(0, -height * 0.18);
    for (const dx of [-width * 0.09, width * 0.09]) {
        cx.beginPath();
        cx.ellipse(dx, 0, width * 0.07, width * 0.04 * eo, 0, 0, Math.PI * 2);
        cx.fillStyle = "#fff";
        cx.fill();
        cx.beginPath();
        cx.ellipse(dx, 0, width * 0.06, width * 0.03 * eo, 0, 0, Math.PI * 2);
        cx.fillStyle = "green";
        cx.fill();
        cx.beginPath();
        cx.ellipse(dx, 0, width * 0.025, width * 0.018 * eo, 0, 0, Math.PI * 2);
        cx.fillStyle = "#181818";
        cx.fill();
        cx.beginPath();
        cx.arc(dx - width * 0.02, -width * 0.01, width * 0.01, 0, Math.PI * 2);
        cx.fillStyle = "#fff";
        cx.fill();
    }
    cx.restore();

    // Nose
    cx.beginPath();
    cx.ellipse(
        0,
        -height * 0.11,
        width * 0.018,
        height * 0.012,
        0,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#e6d6e6";
    cx.fill();

    // Tail
    const tailStartX = 0 + width * 0.35;
    const tailStartY = height * 0.2;
    const tailThickness = width * 0.07;
    cx.beginPath();
    cx.moveTo(tailStartX, tailStartY);
    cx.bezierCurveTo(
        tailStartX + width * 0.2,
        tailStartY - height * 0.1,
        tailStartX + width * 0.1,
        tailStartY + height * 0.25,
        tailStartX - width * 0.15,
        tailStartY + height * 0.25,
    );
    cx.strokeStyle = "#000";
    cx.lineWidth = tailThickness;
    cx.stroke();

    // Whiskers
    cx.strokeStyle = "#e6d6e6";
    const whiskerThickness = Math.max(0.1, width * 0.012);
    cx.lineWidth = whiskerThickness;
    const whiskerLength = width * 0.18;
    const whiskerSpread = width * 0.04;
    const whiskerY = -height * 0.1;
    [-1, 0, 1].forEach((row) => {
        // left whiskers
        cx.beginPath();
        cx.moveTo(-width * 0.13, whiskerY + row * whiskerSpread);
        cx.bezierCurveTo(
            -width * 0.22,
            whiskerY + row * whiskerSpread + whiskerLength * 0.1,
            -width * 0.32,
            whiskerY + row * whiskerSpread + whiskerLength * 0.3,
            -width * 0.38,
            whiskerY + row * whiskerSpread + whiskerLength * 0.2,
        );
        cx.stroke();
        // right whiskers
        cx.beginPath();
        cx.moveTo(width * 0.13, whiskerY + row * whiskerSpread);
        cx.bezierCurveTo(
            width * 0.22,
            whiskerY + row * whiskerSpread + whiskerLength * 0.1,
            width * 0.32,
            whiskerY + row * whiskerSpread + whiskerLength * 0.3,
            width * 0.38,
            whiskerY + row * whiskerSpread + whiskerLength * 0.2,
        );
        cx.stroke();
    });

    cx.restore();
}
