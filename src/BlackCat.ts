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

import type { GameObject } from "./GameObject";
import { getControls } from "./controls";
import type { TimeStep } from "./core/time/TimeStep";
import { cx } from "./graphics";
import {
    BlackCatAnimation,
    type BlackCatFacing,
    renderBlackCat,
} from "././BlackCatAnimation";

export class BlackCat implements GameObject {
    x: number = 0;
    y: number = 0;

    width: number = 48;
    height: number = 64;

    private dir: number = 1;
    private step: number = 0;
    private lastSpeed: number = 0;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    update(): void {
        const movement = getControls().movement;
        this.x += movement.x;
        this.y += movement.y;

        if (movement.x > 0.05) this.dir = 1;
        else if (movement.x < -0.05) this.dir = -1;

        const speed = Math.sqrt(
            movement.x * movement.x + movement.y * movement.y,
        );
        this.lastSpeed = speed;
        this.step += speed * 0.25;
    }

    draw(time: TimeStep): void {
        const mv = getControls().movement || { x: 0, y: 0 };
        const ax = Math.abs(mv.x);
        const ay = Math.abs(mv.y);

        let facing: BlackCatFacing = "side";
        if (ax > 0.01 && ay > 0.01) {
            if (mv.y < 0) facing = mv.x > 0 ? "up-right" : "up-left";
            else facing = mv.x > 0 ? "down-right" : "down-left";
        } else if (ay > ax && ay > 0.01) {
            facing = mv.y < 0 ? "up" : "down";
        } else {
            facing = "side";
            this.dir = mv.x >= 0 ? 1 : -1;
        }

        const animation = this.getAnimation();

        renderBlackCat(
            cx,
            this.x,
            this.y,
            this.width,
            this.height,
            facing,
            animation,
            this.dir,
            this.step,
            this.lastSpeed,
            time,
        );
    }

    private getAnimation(): BlackCatAnimation {
        const movement = getControls().movement || { x: 0, y: 0 };
        const speed = Math.sqrt(
            movement.x * movement.x + movement.y * movement.y,
        );
        if (speed > 0.01) {
            return BlackCatAnimation.Walk;
        }
        return BlackCatAnimation.Stand;
    }
}
