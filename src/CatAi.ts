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
import { random, randomBool } from "./core/math/random";
import {
    distance,
    length,
    normalize,
    subtract,
    ZERO_VECTOR,
    type Vector,
} from "./core/math/Vector";
import type { TimeStep } from "./core/time/TimeStep";
import type { GameObject } from "./GameObject";
import type { Mouse } from "./Mouse";
import type { Space } from "./Space";
import { TILE_DRAW_HEIGHT, TILE_SIZE } from "./tiles";

export let propabilityToNoticeDebug: number = 0;

const LOOK_PERIOD = 500;
const NOTICE_PROPABILITY_LOWERING_DISTANCE = 5 * TILE_SIZE;

const getPropabilityToNoticeByDistance = (distance: number): number =>
    clamp(1 - distance / NOTICE_PROPABILITY_LOWERING_DISTANCE, 0.3, 1.0);

const getMovementFactor = (mouse: Mouse): number => {
    const speed = length(mouse.movement);
    const relativeSpeed = speed / 0.16;
    return clamp(relativeSpeed, 0.4, 1);
};

const getRandomPosition = (space: Space): Vector => {
    const xMargin = 2 * TILE_SIZE;
    const yMargin = 2 + TILE_DRAW_HEIGHT;

    return {
        x: xMargin + random(space.width - 2 * xMargin),
        y: yMargin + random(space.height - 2 * yMargin),
    };
};

export enum CatState {
    Idle,
    Follow,
}

export class CatAi {
    state: CatState = CatState.Idle;

    private lastLookTime: number = 0;
    private idleTarget: Vector | null = null;
    private mouseLastObservedPosition: Vector | null = null;

    constructor(
        private host: GameObject,
        private space: Space,
    ) {}

    getMovement(time: TimeStep): Vector {
        if (LOOK_PERIOD < time.t - this.lastLookTime) {
            this.lastLookTime = time.t;
            const hostCenter = getCenter(this.host);

            const mousePosition =
                this.lookForMouse(hostCenter) ||
                this.listenForMouse(time, hostCenter);

            if (mousePosition) {
                this.mouseLastObservedPosition = mousePosition;
                if (this.state === CatState.Idle) {
                    this.state = CatState.Follow;
                }
            }
        }

        if (this.state === CatState.Idle) {
            if (this.idleTarget == null) {
                this.idleTarget = getRandomPosition(this.space);
            }

            const movement = this.goTo(this.idleTarget);

            if (movement != null) {
                return movement;
            } else {
                this.idleTarget = getRandomPosition(this.space);
            }
        } else if (
            this.state === CatState.Follow &&
            this.mouseLastObservedPosition
        ) {
            return this.goTo(this.mouseLastObservedPosition) ?? ZERO_VECTOR;
        }

        return ZERO_VECTOR;
    }

    private lookForMouse(hostCenter: Vector): Vector | null {
        const sighting = this.space.lookForMouse();
        const mouse = sighting.target;
        const mouseCenter = getCenter(mouse);
        const distanceToMouse = distance(hostCenter, mouseCenter);

        const propabilityToNotice: number =
            sighting.visibility *
            getPropabilityToNoticeByDistance(distanceToMouse) *
            getMovementFactor(mouse);

        propabilityToNoticeDebug = propabilityToNotice;

        return randomBool(propabilityToNotice) ? mouseCenter : null;
    }

    private listenForMouse(time: TimeStep, hostCenter: Vector): Vector | null {
        const sound = this.space.listen(time, hostCenter);

        if (sound && 0.1 <= sound.volume) {
            return sound.position;
        }

        return null;
    }

    private goTo(target: Vector): Vector | null {
        const hostCenter = getCenter(this.host);
        const distanceToMousePosition = distance(hostCenter, target);

        if (distanceToMousePosition <= this.host.width * 0.2) {
            return null;
        }

        const direction: Vector = normalize(subtract(target, hostCenter));
        return direction;
    }
}
