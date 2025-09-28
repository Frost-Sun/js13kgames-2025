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

import type { Animal } from "./Animal";
import type { TimeStep } from "./core/time/TimeStep";
import {
    type BlackCatFacing,
    CAT_ASPECT_RATIO,
    renderBlackCat,
} from "././BlackCatAnimation";
import { cx } from "./graphics";
import { CatAi, JUMP_DURATION } from "./CatAi";
import {
    length,
    multiply,
    normalize,
    ZERO_VECTOR,
    type Vector,
} from "./core/math/Vector";
import type { Space } from "./Space";
import type { Mouse } from "./Mouse";
import { TILE_SIZE } from "./tiles";

const SPEED = TILE_SIZE * 0.0011;

export class BlackCat implements Animal {
    x: number = 0;
    y: number = 0;

    width: number = 12;
    height: number = 6;

    direction: Vector = ZERO_VECTOR;
    private dir: number = 1;
    private step: number = 0;
    private lastSpeed: number = 0;

    ai: CatAi;

    constructor(x: number, y: number, space: Space, mouse: Mouse) {
        this.x = x;
        this.y = y;
        this.ai = new CatAi(this, space, mouse);
    }

    getMovement(time: TimeStep): Vector {
        const movementDirection = this.ai.getMovement(time);
        return multiply(movementDirection, time.dt * SPEED);
    }

    setActualMovement(movement: Vector): void {
        if (movement.x !== 0 || movement.y !== 0) {
            this.direction = normalize(movement);
        }

        if (movement.x > 0.05) this.dir = 1;
        else if (movement.x < -0.05) this.dir = -1;

        const speed = length(movement);
        this.lastSpeed = speed;
        this.step += speed * 0.25;
    }

    draw(time: TimeStep): void {
        const mv = this.direction;
        const ax = Math.abs(mv.x);
        const ay = Math.abs(mv.y);

        let facing: BlackCatFacing = "down";
        if (ax > 0.01 && ay > 0.01) {
            if (mv.y < 0) facing = mv.x > 0 ? "up-right" : "up-left";
            else facing = mv.x > 0 ? "down-right" : "down-left";
        } else if (ay > ax && ay > 0.01) {
            facing = mv.y < 0 ? "up" : "down";
        } else {
            facing = "side";
            this.dir = mv.x >= 0 ? 1 : -1;
        }

        const eyesOpen: boolean = this.ai.isAlert;

        // Draw shadow at jump target only while cat is in the air (jump arc or drop animation)
        const jumpTarget = this.ai.jumpTarget;
        let shadowScale = 1;
        if (jumpTarget) {
            // Animate shadow scale during jump arc
            if (!this.ai.jumpFinishTime) {
                const elapsed = time.t - this.ai.jumpStartTime;
                shadowScale = Math.min(1, Math.max(0, elapsed / JUMP_DURATION));
            } else if (
                this.ai.jumpFinishTime &&
                time.t - this.ai.jumpFinishTime < 120
            ) {
                // Keep shadow at full size during drop
                shadowScale = 1;
            }
        }
        const inAir =
            (jumpTarget && !this.ai.jumpFinishTime) ||
            (this.ai.jumpFinishTime && time.t - this.ai.jumpFinishTime < 120);
        if (jumpTarget && inAir) {
            cx.save();
            const width = this.width;
            const h = width / CAT_ASPECT_RATIO;
            cx.fillStyle = "rgba(0,0,0,0.15)";
            cx.beginPath();
            cx.ellipse(
                jumpTarget.x + width / 2,
                jumpTarget.y + h * 0.1,
                width * 0.45 * shadowScale,
                h * 0.24 * shadowScale,
                0,
                0,
                Math.PI * 2,
            );
            cx.fill();
            cx.strokeStyle = "rgba(255,0,0,0.5)";
            cx.lineWidth = 1;
            cx.stroke();
            cx.restore();
        }

        // Show cat during drop animation (post-jump delay) so it visually falls from the sky
        const ai = this.ai;
        const dropDuration = 300;
        const isDropping =
            ai.jumpFinishTime && time.t - ai.jumpFinishTime < dropDuration;
        if (!(ai.jumpTarget && ai.jumpFinishTime === 0) || isDropping) {
            renderBlackCat(
                this.x,
                this.y,
                this.width,
                facing,
                eyesOpen,
                this.dir,
                this.step,
                this.lastSpeed,
                time,
            );
        }

        // Debug draw the direction the cat is facing.
        // const pos: Vector = {
        //     x: this.x + this.width / 2,
        //     y: this.y + this.height / 2,
        // };
        // const dirPos: Vector = add(
        //     pos,
        //     multiply(this.direction, this.width / 2),
        // );
        // const r = this.width / 10;
        // cx.save();
        // cx.fillStyle = "blue";
        // cx.beginPath();
        // cx.ellipse(dirPos.x, dirPos.y, r, r, 0, 0, 2 * Math.PI);
        // cx.fill();
        // cx.restore();
    }
}
