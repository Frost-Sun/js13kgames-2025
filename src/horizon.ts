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

import type { Area } from "./core/math/Area";
import { cx } from "./graphics";
import { GRASS_COLOR } from "./tiles";

export function drawHorizon(
    area: Area,
    blur: number,
    scrollX: number,
    progress: number,
): void {
    cx.save();

    // Sky
    cx.fillStyle = "rgb(0, 150, 255)";
    cx.fillRect(area.x, area.y, area.width, area.height);

    cx.save(); // Begin objects further away
    cx.filter = `blur(${blur}px)`;

    cx.translate(scrollX / 2, 0);

    // House base
    cx.fillStyle = "#deb887";
    cx.fillRect(
        area.width * 0.3,
        area.height * 0.4,
        area.width * 0.25,
        area.height * 0.5,
    );

    // Roof
    cx.beginPath();
    cx.moveTo(area.width * 0.28, area.height * 0.4);
    cx.lineTo(area.width * 0.425, area.height * 0.1);
    cx.lineTo(area.width * 0.57, area.height * 0.4);
    cx.closePath();
    cx.fillStyle = "#8b0000";
    cx.fill();

    cx.restore();

    // Fence
    const fenceHeightNear = area.height / 1.5;
    const fenceHeightFar = area.height / 3;
    // Make fence dynamically darker based on progress (0 = near, 1 = far)
    function lerpColor(a: string, b: string, t: number) {
        // a, b: hex colors like #882222, #441111
        const ah = a
            .match(/#(..)(..)(..)/)!
            .slice(1)
            .map((x) => parseInt(x, 16));
        const bh = b
            .match(/#(..)(..)(..)/)!
            .slice(1)
            .map((x) => parseInt(x, 16));
        const ch = ah.map((v, i) => Math.round(v + (bh[i] - v) * t));
        return `#${ch.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    }
    // Fence is darkest and most blurred at progress=0 (far), lightest/sharpest at progress=1 (close)
    const t = 1 - Math.max(0, Math.min(progress, 1));
    const fenceColor = lerpColor(
        "#aa4444", // close (light)
        "#664848", // far (very dark)
        t,
    );
    // Blur decreases as progress increases
    if (progress < 1) {
        cx.save();
        cx.filter = `blur(${Math.round((1 - progress) * 4)}px)`;
    }
    cx.fillStyle = fenceColor;
    // If blurred, extend the fence below the bottom to hide background color bleed
    const h =
        fenceHeightFar + (fenceHeightNear - fenceHeightFar) * progress + 8;
    const y = area.y + area.height - h;
    cx.fillRect(area.x, y, area.width, h);
    if (progress < 1) {
        cx.restore();
    }

    // Mouse hole: grows from 0 to full size at the bottom as progress goes from 0.95 to 1
    const HOLE_GROW_START = 0.8;
    const HOLE_GROW_END = 1.0;
    if (progress > HOLE_GROW_START) {
        cx.save();
        cx.translate(scrollX, 0);
        const maxHoleWidth = 20;
        const maxHoleHeight = 20;
        // t: 0 (progress=HOLE_GROW_START) to 1 (progress=HOLE_GROW_END)
        const t = Math.min(
            (progress - HOLE_GROW_START) / (HOLE_GROW_END - HOLE_GROW_START),
            1,
        );
        const holeWidth = maxHoleWidth * t;
        const holeHeight = maxHoleHeight * t;
        // Place the hole at the very bottom of the canvas, regardless of fence or blur
        const holeBaseY = area.y + area.height - holeHeight;
        cx.fillStyle = GRASS_COLOR;
        cx.beginPath();
        cx.moveTo(area.width / 2 - holeWidth / 2, holeBaseY + holeHeight);
        cx.lineTo(area.width / 2 - holeWidth / 2, holeBaseY);
        cx.lineTo(area.width / 2, holeBaseY - holeHeight * 0.2);
        cx.lineTo(area.width / 2 + holeWidth / 2, holeBaseY);
        cx.lineTo(area.width / 2 + holeWidth / 2, holeBaseY + holeHeight);
        cx.fill();
        cx.restore();
    }

    cx.restore();
}
