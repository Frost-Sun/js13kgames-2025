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

import { Camera } from "./core/gameplay/Camera";
import type { Area } from "./core/math/Area";
import type { TimeStep } from "./core/time/TimeStep";
import { cx } from "./graphics";
import { Mouse } from "./Mouse";

export const canvas = document.querySelector("canvas") as HTMLCanvasElement;

export class Level implements Area {
    private camera: Camera = new Camera(this, canvas);

    x: number = 0;
    y: number = 0;
    width: number = 400;
    height: number = 300;

    private player = new Mouse(
        this.x + this.width / 2,
        this.y + this.height / 2,
    );

    update(t: number): void {
        this.camera.update(t);

        this.player.update();
    }

    draw(time: TimeStep): void {
        cx.save();
        // Apply camera - drawing in level coordinates after these lines:
        cx.translate(canvas.width / 2, canvas.height / 2);
        cx.scale(this.camera.zoom, this.camera.zoom);
        cx.translate(-this.camera.x, -this.camera.y);

        this.player.draw(time);

        cx.restore();
    }
}
