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

import type { Animal, StepFunction } from "./Animal";
import { getControls } from "./controls";
import type { TimeStep } from "./core/time/TimeStep";
import { cx } from "./graphics";
import {
    MouseAnimation,
    type MouseFacing,
    renderMouse,
} from "./MouseAnimation";
import { length, multiply, ZERO_VECTOR, type Vector } from "./core/math/Vector";
import { SFX_MOUSE_WALK_NORMAL } from "./audio/sfx";
import { TILE_SIZE } from "./tiles";

const SPEED = 0.001 * TILE_SIZE;

export class Mouse implements Animal {
    x: number;
    y: number;

    // Logical bounding box for collisions/culling
    width: number = 3;
    height: number = 1;

    movement: Vector = ZERO_VECTOR;

    // Not used for now
    direction: Vector = ZERO_VECTOR;

    // Animation state
    private dir: number = 1; // 1 = facing right, -1 = facing left
    private step: number = 0; // walk cycle phase
    private lastSpeed: number = 0; // used to modulate animations
    private lastStep: number = -1; // last integer step for sound timing
    private lastFacing: MouseFacing = "side"; // keep last facing direction when stopped

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    getMovement(time: TimeStep): Vector {
        const movementDirection = getControls().movement;
        const movement = multiply(movementDirection, time.dt * SPEED);

        return movement;
    }

    setActualMovement(movement: Vector, step: StepFunction): void {
        this.movement = movement;
        // Direction follows horizontal input
        if (movement.x > 0.05) this.dir = 1;
        else if (movement.x < -0.05) this.dir = -1;

        // Walk cycle speed from movement magnitude
        const speed = length(movement);
        const wasMoving = this.lastSpeed > 0;
        const isMoving = speed > 0;
        this.lastSpeed = speed;

        if (isMoving) {
            // Reset step cycle when starting to move
            if (!wasMoving) {
                this.step = 0;
                this.lastStep = -1; // ensure first step triggers sound
            }

            this.step += speed * 0.25; // tune to taste

            // Play step sound on each step cycle (including the first)
            const currentStep = Math.floor(this.step);
            if (currentStep !== this.lastStep) {
                step(SFX_MOUSE_WALK_NORMAL);
                this.lastStep = currentStep;
            }
        }
    }

    draw(time: TimeStep): void {
        // Decide pose based on current movement
        const mv = this.movement;
        const ax = Math.abs(mv.x);
        const ay = Math.abs(mv.y);
        const isMoving = ax > 0.01 || ay > 0.01;

        let facing: MouseFacing = "side";

        if (isMoving) {
            // Calculate facing direction when moving
            if (ax > 0.01 && ay > 0.01) {
                // diagonal - update dir for left/right component
                this.dir = mv.x >= 0 ? 1 : -1;
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
            // Update last facing direction
            this.lastFacing = facing;
        } else {
            // Use last facing direction when stopped
            facing = this.lastFacing;
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
