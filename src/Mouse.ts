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

import { cx } from "./graphics";
import type { GameObject } from "./GameObject";

export class Mouse implements GameObject {
    x: number = 0;
    y: number = 0;
    width: number = 10;
    height: number = 10;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    update(t: number, _: number): void {
        cx.save();
    }

    draw(t: number, dt: number): void {
        cx.save();
        cx.fillStyle = `rgb(80, 80, ${200 + Math.sin(t / 500) * 55})`;
        cx.fillRect(this.x, this.y, this.width, this.height);
        cx.fillStyle = "red";
        cx.font = "32px Courier New";
        cx.fillText("JS13k", this.x + 8, this.y + 40);
        cx.restore();
    }
}
