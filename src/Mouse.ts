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
    MouseAnimation,
    type MouseFacing,
    renderMouse,
} from "./MouseAnimation";

export class Mouse implements GameObject {
    x: number = 0;
    y: number = 0;

    // Logical bounding box for collisions/culling
    width: number = 3;
    height: number = 3;

    // Animation state
    private dir: number = 1; // 1 = facing right, -1 = facing left
    private step: number = 0; // walk cycle phase
    private lastSpeed: number = 0; // used to modulate animations

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    update(): void {
        const movement = getControls().movement;
        this.x += movement.x;
        this.y += movement.y;

        // Direction follows horizontal input
        if (movement.x > 0.05) this.dir = 1;
        else if (movement.x < -0.05) this.dir = -1;

        // Walk cycle speed from movement magnitude
        const speed = Math.sqrt(
            movement.x * movement.x + movement.y * movement.y,
        );
        this.lastSpeed = speed;
        this.step += speed * 0.25; // tune to taste
    }

    draw(time: TimeStep): void {
        // Decide pose based on current input
        const mv = getControls().movement || { x: 0, y: 0 };
        const ax = Math.abs(mv.x);
        const ay = Math.abs(mv.y);

        let facing: MouseFacing = "side";

        if (ax > 0.01 && ay > 0.01) {
            // diagonal
            if (mv.y < 0) facing = mv.x > 0 ? "up-right" : "up-left";
            else facing = mv.x > 0 ? "down-right" : "down-left";
        } else if (ay > ax && ay > 0.01) {
            // pure vertical
            facing = mv.y < 0 ? "up" : "down";
        } else {
            // pure horizontal
            facing = "side";
            this.dir = mv.x >= 0 ? 1 : -1;
        }

        const animation = this.getAnimation();

        renderMouse(
            cx,
            this.x,
            this.y,
            this.width,
            facing,
            animation,
            this.dir,
            this.step,
            this.lastSpeed,
            time,
        );
    }

    private getAnimation(): MouseAnimation {
        const movement = getControls().movement || { x: 0, y: 0 };
        const speed = Math.sqrt(
            movement.x * movement.x + movement.y * movement.y,
        );

        if (speed > 0.01) {
            return MouseAnimation.Walk;
        }

        return MouseAnimation.Stand;
    }
}
