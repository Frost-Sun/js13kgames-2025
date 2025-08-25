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

export function drawHorizon(area: Area): void {
    cx.save();

    // Draw sky
    cx.fillStyle = "rgb(0, 150, 255)";
    cx.fillRect(area.x, area.y, area.width, area.height);

    // Draw house base
    cx.fillStyle = "#deb887";
    cx.fillRect(
        area.width * 0.3,
        area.height * 0.4,
        area.width * 0.25,
        area.height * 0.6,
    );

    // Draw roof
    cx.beginPath();
    cx.moveTo(area.width * 0.28, area.height * 0.4);
    cx.lineTo(area.width * 0.425, area.height * 0.1);
    cx.lineTo(area.width * 0.57, area.height * 0.4);
    cx.closePath();
    cx.fillStyle = "#8b0000";
    cx.fill();

    // Draw door
    cx.fillStyle = "#654321";
    cx.fillRect(
        area.width * 0.42,
        area.height * 0.6,
        area.width * 0.06,
        area.height * 0.4,
    );

    // Draw window
    cx.fillStyle = "#add8e6";
    cx.fillRect(
        area.width * 0.33,
        area.height * 0.56,
        area.width * 0.06,
        area.height * 0.3,
    );

    // Draw tree trunk
    cx.fillStyle = "#8b5a2b";
    cx.fillRect(
        area.width * 0.7,
        area.height * 0.6,
        area.width * 0.03,
        area.height * 0.4,
    );

    // Draw tree foliage
    cx.beginPath();
    cx.arc(
        area.width * 0.715,
        area.height * 0.5,
        area.width * 0.05,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#228b22";
    cx.fill();

    cx.restore();
}
