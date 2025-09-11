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
import { getCenter } from "./core/math/Area";
import { clamp } from "./core/math/number";
import { random, randomDirection, randomMinMax } from "./core/math/random";
import {
    add,
    distance,
    dotProduct,
    length,
    multiply,
    normalize,
    subtract,
    ZERO_VECTOR,
    type Vector,
} from "./core/math/Vector";
import type { TimeStep } from "./core/time/TimeStep";
import type { Mouse } from "./Mouse";
import type { Space } from "./Space";
import { TILE_DRAW_HEIGHT, TILE_SIZE } from "./tiles";
import { playTune, SFX_CHASE, SFX_RUNNING } from "./audio/sfx";
import type { GameObject } from "./GameObject";

export let sightAccuracyDebug: number = 0;
export let hearAccuracyDebug: number = 0;

// Make sure the cat does not appear on the screen at start as the horizon
// takes care of drawing it when on the fence.
const INITIAL_CAT_POS: Vector = { x: -1000, y: -1000 };

const GOTO_FENCE_DURATION = 1000;
const NOTICE_DURATION = 2000;

const FENCE_HEARD_THRESHOLD = 0.1;
const FENCE_NOTICE_THRESHOLD = 0.2;

const JUMP_DURATION: number = 1200; // ms
const STILL_AFTER_JUMP_DURATION = 1000;

const HEARING_PERIOD = 450;
const SIGHT_ACCURACY_LOWERING_DISTANCE = 6.5 * TILE_SIZE;

// Cat's field of view in radians (e.g., 160 degrees)
const CAT_FOV = (160 * Math.PI) / 180;

export const CERTAIN_OBSERVATION_THERSHOLD = 0.4;
export const VAGUE_OBSERVATION_THRESHOLD = 0.2;

const KEEP_CHASING_TIME = 500;
const NOTICE_IGNORE_TIME = 1600;
const SEARCH_TIME = 5000;
const LOOK_AROUND_INTERVAL = 1500;

// Speeds relative to the actual speed in BlackCat.ts.
const SPEED_IDLE = 0.8;
const SPEED_VAGUE_OBSERVATION = 0.4; // Slow approach to pray (as cats do)
const SPEED_CHASE = 1.0;

type Observation = {
    t: number;
    position: Vector;
    accuracy: number;
    mouse?: Mouse;
};

function getSightAccuracy(d: number) {
    return clamp(1 - d / SIGHT_ACCURACY_LOWERING_DISTANCE, 0.3, 1);
}

function getMoveFactor(m: Mouse) {
    return clamp(length(m.movement) / 0.16, 0.4, 1);
}

function getRandomPosition(s: Space): Vector {
    const x = 2 * TILE_SIZE,
        y = 2 + TILE_DRAW_HEIGHT;
    return { x: x + random(s.width - 2 * x), y: y + random(s.height - 2 * y) };
}

function getPointBetween(from: Vector, to: Vector): Vector {
    const difference = subtract(to, from),
        dist = length(difference),
        direction = normalize(difference);
    return add(from, multiply(direction, dist / 3));
}

function better(
    a: Observation | null,
    b: Observation | null,
): Observation | null {
    if (!a) return b;
    if (!b) return a;
    return a.accuracy > b.accuracy ? a : b;
}

function jumpMovement(
    time: TimeStep,
    startTime: number,
    o: GameObject,
    start: Vector,
    end: Vector,
): boolean {
    const elapsed = time.t - startTime;
    const duration = JUMP_DURATION;
    let t = Math.min(1, elapsed / duration);

    // Ease in-out
    t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    o.x = x - o.width / 2;
    o.y = y - o.height / 2;

    if (elapsed >= duration) {
        o.x = end.x - o.width / 2;
        o.y = end.y - o.height / 2;
        return true;
    }

    return false;
}

export enum FenceState {
    // Has heard nothing yet.
    Nothing,

    // Heard something, coming to the fence to observe.
    HeardSomething,

    // Noticed the mouse, ready to jump.
    Noticed,

    // Already jumped off the fence, should not be drawn on the fence any more.
    Jumped,
}

export class CatAi {
    isAlert: boolean = false;
    fenceState: FenceState = FenceState.Nothing;

    private lastMusic: string | null = SFX_RUNNING;

    private heardSomethingTime: number = 0;
    private noticedTime: number = 0;

    private jumpTarget: Vector | null = null;
    jumpStartTime: number = 0;
    private jumpFinishTime: number = 0;
    private hasJumped: boolean = false;

    private lastHearingTime: number = 0;
    private lastObservation: Observation | null = null;
    private lastHearObservation: Observation | null = null;
    private lastCertainObservation: Observation | null = null;
    private lastVagueObservation: Observation | null = null;
    private lastLookAroundTime: number = 0;

    private target: Vector | null = null;

    constructor(
        private host: Animal,
        private space: Space,
        private mouse: Mouse,
    ) {
        // Place cat offscreen before first jump
        this.host.x = INITIAL_CAT_POS.x;
        this.host.y = INITIAL_CAT_POS.y;
        this.host.direction = { x: 0, y: 1 };
    }

    getMovement(time: TimeStep): Vector {
        const hostCenter = getCenter(this.host);
        this.observe(time, hostCenter);

        return (
            this.stayOnTheFence(time) ??
            this.jump(time, hostCenter) ??
            this.chase(time, hostCenter) ??
            this.followVagueObservation(time, hostCenter) ??
            this.lookAround(time) ??
            this.idle(hostCenter)
        );
    }

    private observe(time: TimeStep, hostCenter: Vector): void {
        const seen = this.lookForMouse(time, hostCenter);
        let heard: Observation | null = null;

        sightAccuracyDebug = seen?.accuracy ?? 0;

        if (seen && seen.accuracy > CERTAIN_OBSERVATION_THERSHOLD) {
            this.lastCertainObservation = seen;
        }

        if (HEARING_PERIOD < time.t - this.lastHearingTime) {
            this.lastHearingTime = time.t;
            const listenerPosition =
                this.host.x !== INITIAL_CAT_POS.x
                    ? hostCenter
                    : // On the fence
                      {
                          x: this.space.x + this.space.width / 2,
                          y: this.space.y,
                      };

            heard = this.listenForMouse(time, listenerPosition);
            hearAccuracyDebug = heard?.accuracy ?? 0;

            if (heard) {
                this.lastHearObservation = heard;
            }
        }

        const obs = better(seen, heard);

        this.lastObservation = obs;

        if (obs && obs.accuracy > VAGUE_OBSERVATION_THRESHOLD) {
            this.lastVagueObservation = obs;
        }
    }

    private stayOnTheFence(time: TimeStep): Vector | null {
        if (this.host.x !== INITIAL_CAT_POS.x) {
            return null;
        }

        if (
            this.fenceState === FenceState.Nothing &&
            this.lastHearObservation &&
            this.lastHearObservation.accuracy > FENCE_HEARD_THRESHOLD
        ) {
            this.fenceState = FenceState.HeardSomething;
            this.heardSomethingTime = time.t;
            return ZERO_VECTOR;
        }

        if (
            this.fenceState === FenceState.HeardSomething &&
            GOTO_FENCE_DURATION < time.t - this.heardSomethingTime &&
            this.lastObservation &&
            this.lastObservation.accuracy > FENCE_NOTICE_THRESHOLD
        ) {
            this.fenceState = FenceState.Noticed;
            this.noticedTime = time.t;
            return ZERO_VECTOR;
        }

        if (
            this.fenceState === FenceState.Noticed &&
            NOTICE_DURATION < time.t - this.noticedTime
        ) {
            // Position the cat such that it appears coming from the fence
            this.host.x = this.mouse.x - this.host.width * 0.5;
            this.host.y =
                this.mouse.y - 20 * TILE_DRAW_HEIGHT - this.host.height * 0.5;
            this.fenceState = FenceState.Jumped;
            return ZERO_VECTOR;
        }

        return ZERO_VECTOR;
    }

    private jump(time: TimeStep, hostCenter: Vector): Vector | null {
        if (this.hasJumped) {
            return null;
        }

        if (!this.jumpStartTime) {
            // Ready to jump
            this.jumpStartTime = time.t;
            this.jumpTarget = {
                x: this.mouse.x + randomMinMax(-3, 3) * TILE_SIZE,
                y: this.mouse.y - 5 * TILE_DRAW_HEIGHT,
            };

            this.useMusic(SFX_CHASE);
        }

        if (this.jumpTarget && !this.jumpFinishTime) {
            // Jump!
            const done = jumpMovement(
                time,
                this.jumpStartTime,
                this.host,
                hostCenter,
                this.jumpTarget,
            );

            if (done) {
                this.jumpTarget = null;
                this.jumpFinishTime = time.t;
            }

            // No movement during jump
            return ZERO_VECTOR;
        }

        if (time.t - this.jumpFinishTime < STILL_AFTER_JUMP_DURATION) {
            this.hasJumped = true;
            return ZERO_VECTOR;
        }

        return null;
    }

    private idle(hostCenter: Vector): Vector {
        if (this.target == null) {
            this.target = getRandomPosition(this.space);
            this.useMusic(SFX_RUNNING);
        }

        const direction = this.goTo(this.target, hostCenter, SPEED_IDLE);

        if (!direction) {
            this.target = null;
            return ZERO_VECTOR;
        }

        return direction;
    }

    private followVagueObservation(
        time: TimeStep,
        hostCenter: Vector,
    ): Vector | null {
        if (
            this.lastVagueObservation &&
            time.t - this.lastVagueObservation.t < NOTICE_IGNORE_TIME
        ) {
            this.isAlert = true;
            const d = distance(hostCenter, this.lastVagueObservation.position);
            const target =
                d < TILE_SIZE
                    ? this.lastVagueObservation.position
                    : getPointBetween(
                          hostCenter,
                          this.lastVagueObservation.position,
                      );

            return this.goTo(target, hostCenter, SPEED_VAGUE_OBSERVATION);
        }

        this.isAlert = false;
        return null;
    }

    private chase(time: TimeStep, hostCenter: Vector): Vector | null {
        if (
            this.lastCertainObservation &&
            time.t - this.lastCertainObservation.t < KEEP_CHASING_TIME
        ) {
            this.useMusic(SFX_CHASE);
            return this.goTo(
                this.lastCertainObservation.position,
                hostCenter,
                SPEED_CHASE,
            );
        }

        return null;
    }

    private lookAround(time: TimeStep): Vector | null {
        const lastObservation = this.lastCertainObservation;

        if (!lastObservation || SEARCH_TIME < time.t - lastObservation.t) {
            return null;
        }

        if (LOOK_AROUND_INTERVAL < time.t - this.lastLookAroundTime) {
            this.lastLookAroundTime = time.t;

            // Move a little to turn to another direction
            return randomDirection();
        }

        return ZERO_VECTOR;
    }

    private useMusic(tune: string): void {
        if (tune !== this.lastMusic) {
            playTune(tune);
            this.lastMusic = tune;
        }
    }

    private lookForMouse(
        time: TimeStep,
        hostCenter: Vector,
    ): Observation | null {
        const sighting = this.space.lookForMouse();
        const mouse = sighting.target;
        const mouseCenter = getCenter(mouse);
        const d = distance(hostCenter, mouseCenter);
        const directionToMouse = normalize(subtract(mouseCenter, hostCenter));
        const dot = dotProduct(directionToMouse, this.host.direction);
        const inFov = dot > Math.cos(CAT_FOV / 2);
        const fovFactor = inFov ? dot : 0;
        const accuracy =
            fovFactor *
            sighting.visibility *
            getSightAccuracy(d) *
            getMoveFactor(mouse);

        return sighting.visibility > 0 && inFov
            ? { t: time.t, position: mouseCenter, accuracy, mouse: mouse }
            : null;
    }

    private listenForMouse(
        time: TimeStep,
        hostCenter: Vector,
    ): Observation | null {
        const sound = this.space.listen(time, hostCenter);
        if (!sound) {
            return null;
        }
        // Try to get the mouse from the space if possible
        return {
            t: time.t,
            position: sound.position,
            accuracy: sound.volume,
            mouse: this.mouse,
        };
    }

    private goTo(
        target: Vector,
        hostCenter: Vector,
        multiplier: number,
    ): Vector | null {
        const distanceToMousePosition = distance(hostCenter, target);

        if (distanceToMousePosition <= this.host.width * 0.2) {
            return null;
        }

        const direction: Vector = normalize(subtract(target, hostCenter));
        return multiply(direction, multiplier);
    }
}
