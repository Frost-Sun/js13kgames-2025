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

import type { TimeStep } from "./core/time/TimeStep";
import type { GameObject } from "./GameObject";
import { cx } from "./graphics";
import { TILE_DRAW_HEIGHT, TILE_SIZE } from "./tiles";

export class Flower implements GameObject {
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(
        private color: string,
        x: number,
        y: number,
    ) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE * 0.2;
        this.height = TILE_DRAW_HEIGHT * 0.2;
    }

    draw(time: TimeStep): void {
        const heightUp = TILE_SIZE * 0.2;
        const stemWidth = TILE_SIZE * 0.04;
        const flowerRadius = this.width * 0.5;
        const flowerX = this.x + this.width * 0.5;
        const flowerY = this.y + this.height * 0.5 - heightUp;

        // Flower stem
        cx.fillStyle = "#228b22";
        cx.fillRect(
            this.x + this.width * 0.5 - stemWidth * 0.5,
            this.y + this.height * 0.5 - heightUp,
            stemWidth,
            heightUp,
        );

        // Flower petals
        cx.beginPath();
        cx.arc(flowerX, flowerY, flowerRadius, 0, Math.PI * 2);
        cx.fillStyle = this.color;
        cx.fill();

        // Flower center
        cx.beginPath();
        cx.arc(flowerX, flowerY, flowerRadius * 0.3, 0, Math.PI * 2);
        cx.fillStyle = "#ffffe0";
        cx.fill();
    }
}
