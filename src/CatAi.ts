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

import { getCenter } from "./core/math/Area";
import { clamp } from "./core/math/number";
import { randomBool } from "./core/math/random";
import {
    distance,
    normalize,
    subtract,
    ZERO_VECTOR,
    type Vector,
} from "./core/math/Vector";
import type { TimeStep } from "./core/time/TimeStep";
import type { GameObject } from "./GameObject";
import type { Space } from "./Space";
import { TILE_SIZE } from "./tiles";

const LOOK_PERIOD = 1000;
const NOTICE_PROPABILITY_LOWERING_DISTANCE = 5 * TILE_SIZE;

const getPropabilityToNoticeByDistance = (distance: number): number =>
    clamp(1 - distance / NOTICE_PROPABILITY_LOWERING_DISTANCE, 0.1, 0.9);

export enum CatState {
    Idle,
    Follow,
}

export class CatAi {
    state: CatState = CatState.Idle;

    private lastLookTime: number = 0;
    private mouseLastSightPosition: Vector | null = null;

    constructor(
        private host: GameObject,
        private space: Space,
    ) {}

    getMovement(time: TimeStep): Vector {
        if (LOOK_PERIOD < time.t - this.lastLookTime) {
            this.lastLookTime = time.t;
            const mousePosition = this.lookForMouse();
            if (mousePosition) {
                this.mouseLastSightPosition = mousePosition;
                if (this.state === CatState.Idle) {
                    this.state = CatState.Follow;
                }
            }
        }

        if (this.state === CatState.Follow && this.mouseLastSightPosition) {
            return this.follow(this.mouseLastSightPosition);
        }

        return ZERO_VECTOR;
    }

    private lookForMouse(): Vector | null {
        const mouse = this.space.getMouse();
        const mouseCenter = getCenter(mouse);
        const hostCenter = getCenter(this.host);

        const distanceToMouse = distance(hostCenter, mouseCenter);

        return randomBool(getPropabilityToNoticeByDistance(distanceToMouse))
            ? mouseCenter
            : null;
    }

    private follow(target: Vector): Vector {
        const hostCenter = getCenter(this.host);
        const distanceToMousePosition = distance(hostCenter, target);

        if (distanceToMousePosition <= this.host.width * 0.4) {
            this.state = CatState.Idle;
            return ZERO_VECTOR;
        }

        const direction: Vector = normalize(subtract(target, hostCenter));
        return direction;
    }
}
