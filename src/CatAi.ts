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
import { random } from "./core/math/random";
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

export let sightAccuracyDebug: number = 0;
export let hearAccuracyDebug: number = 0;

const OBSERVE_PERIOD = 500;
const SIGHT_ACCURACY_LOWERING_DISTANCE = 5 * TILE_SIZE;

// Cat's field of view in radians (e.g., 160 degrees)
const CAT_FOV = (160 * Math.PI) / 180;

export const CERTAIN_OBSERVATION_THERSHOLD = 0.5;
export const VAGUE_OBSERVATION_THRESHOLD = 0.15;

const ALERT_TIMEOUT = 2000;
const VAGUE_OBSERVATION_COOLDOWN = 1000; // ms
const OBSERVATION_LINGER_TIME = 1500; // ms to keep chasing/alert after last observation

type Observation = { position: Vector; accuracy: number };
function getSightAcc(d: number) {
    return clamp(1 - d / SIGHT_ACCURACY_LOWERING_DISTANCE, 0.3, 1);
}
function getMoveFac(m: Mouse) {
    return clamp(length(m.movement) / 0.16, 0.4, 1);
}
function randPos(s: Space) {
    const x = 2 * TILE_SIZE,
        y = 2 + TILE_DRAW_HEIGHT;
    return { x: x + random(s.width - 2 * x), y: y + random(s.height - 2 * y) };
}
function notFar(r: Vector, p: Vector) {
    const x = 3 * TILE_SIZE,
        y = 3 * TILE_DRAW_HEIGHT;
    return { x: clamp(p.x, r.x - x, r.x + x), y: clamp(p.y, r.y - y, r.y + y) };
}
function posToward(h: Vector, m: Vector) {
    const t = subtract(m, h),
        d = length(t),
        dir = normalize(t);
    return add(h, multiply(dir, d / 3));
}
function better(
    a: Observation | null,
    b: Observation | null,
): Observation | null {
    if (!a) return b;
    if (!b) return a;
    return a.accuracy > b.accuracy ? a : b;
}

export enum CatState {
    Idle,
    Alert,
    Chase,
}

export class CatAi {
    state: CatState = CatState.Idle;

    private alertPositionReachedTime: number | null = null;
    private lastObserveTime: number = 0;
    private target: Vector | null = null;
    private mouseLastKnownPosition: Vector | null = null;
    private vagueObservationCooldownUntil: number = 0;
    private lastObservationTime: number = 0;
    private lastSenseTime: number = 0; // last time cat saw or heard mouse
    private goingToLastKnown: boolean = false;
    private lastLookAroundTime: number = 0;
    private scanAngle: number = 0;
    private searchingAfterLostTime: number = 0;

    constructor(
        private host: Animal,
        private space: Space,
    ) {}

    getMovement(time: TimeStep): Vector {
        // After reaching last known position, look around for 3s before going fully idle
        if (
            this.searchingAfterLostTime > 0 &&
            time.t - this.searchingAfterLostTime < 3000
        ) {
            // Actively scan all directions: rotate direction smoothly every frame for 3s
            const scanSpeed = Math.PI / 60; // 3s = 180 frames at 60fps, full circle
            this.scanAngle += scanSpeed;
            if (this.scanAngle > Math.PI * 2) this.scanAngle -= Math.PI * 2;
            this.host.direction = {
                x: Math.cos(this.scanAngle),
                y: Math.sin(this.scanAngle),
            };
            // Stay in search phase, do not set Idle yet
            return ZERO_VECTOR;
        } else if (this.searchingAfterLostTime > 0) {
            this.searchingAfterLostTime = 0;
            this.scanAngle = 0;
            // Only now set Idle
            this.state = CatState.Idle;
            this.target = null;
            this.alertPositionReachedTime = null;
            return ZERO_VECTOR;
        }

        let hadObservation = false;
        const hostCenter = getCenter(this.host);
        // Always check if we can see the mouse, every frame
        const seen = this.lookForMouse(hostCenter);
        let heard: Observation | null = null;
        if (OBSERVE_PERIOD < time.t - this.lastObserveTime) {
            heard = this.listenForMouse(time, hostCenter);
            hearAccuracyDebug = heard?.accuracy ?? 0;
        }
        sightAccuracyDebug = seen?.accuracy ?? 0;
        const obs = better(seen, heard);
        if (
            (seen && seen.accuracy > VAGUE_OBSERVATION_THRESHOLD) ||
            (heard && heard.accuracy > VAGUE_OBSERVATION_THRESHOLD)
        ) {
            this.lastSenseTime = time.t;
            if (obs) this.mouseLastKnownPosition = obs.position;
            if (this.state !== CatState.Chase) this.state = CatState.Chase;
        }
        if (OBSERVE_PERIOD < time.t - this.lastObserveTime && obs) {
            this.lastObserveTime = time.t;
            this.lastObservationTime = time.t;
            hadObservation = true;
            if (obs.accuracy > CERTAIN_OBSERVATION_THERSHOLD) {
                this.mouseLastKnownPosition = obs.position;
                this.vagueObservationCooldownUntil = 0;
                if (this.state !== CatState.Chase) this.state = CatState.Chase;
            } else if (
                obs.accuracy > VAGUE_OBSERVATION_THRESHOLD &&
                time.t >= this.vagueObservationCooldownUntil
            ) {
                if (
                    !(seen && seen.accuracy > CERTAIN_OBSERVATION_THERSHOLD) &&
                    time.t - this.lastSenseTime > OBSERVATION_LINGER_TIME
                ) {
                    const d = distance(hostCenter, obs.position);
                    this.mouseLastKnownPosition =
                        d < TILE_SIZE
                            ? obs.position
                            : posToward(hostCenter, obs.position);
                }
                if (this.state == CatState.Idle) this.state = CatState.Alert;
                this.vagueObservationCooldownUntil =
                    time.t + VAGUE_OBSERVATION_COOLDOWN;
            }
        }

        if (this.goingToLastKnown && this.mouseLastKnownPosition) {
            // Continue moving to last known position until reached
            const hostCenter = getCenter(this.host);
            const dist = distance(hostCenter, this.mouseLastKnownPosition);
            // Look around (randomize direction) every 300ms while searching
            if (time.t - this.lastLookAroundTime > 300) {
                const angle = Math.random() * Math.PI * 2;
                this.host.direction = {
                    x: Math.cos(angle),
                    y: Math.sin(angle),
                };
                this.lastLookAroundTime = time.t;
            }
            if (dist <= this.host.width * 0.2) {
                this.goingToLastKnown = false;
                this.searchingAfterLostTime = time.t;
                this.mouseLastKnownPosition = null;
                // Do NOT set Idle here; search phase will handle it
                this.target = null;
                // Start searching in place
                return ZERO_VECTOR;
            }
            return this.goTo(this.mouseLastKnownPosition) ?? ZERO_VECTOR;
        } else if (
            this.state === CatState.Idle &&
            !this.mouseLastKnownPosition &&
            !this.goingToLastKnown &&
            this.searchingAfterLostTime === 0
        ) {
            if (this.target == null) {
                this.target = randPos(this.space);
            }
            const movement = this.target ? this.goTo(this.target) : null;
            if (movement != null) {
                return movement;
            } else {
                this.target = randPos(this.space);
            }
        } else if (this.state === CatState.Alert) {
            // Stay alert for linger time after last observation
            if (
                !hadObservation &&
                time.t - this.lastObservationTime > OBSERVATION_LINGER_TIME
            ) {
                // Always go to last known/search if we have a last known position
                if (this.mouseLastKnownPosition) {
                    this.goingToLastKnown = true;
                    return (
                        this.goTo(this.mouseLastKnownPosition) ?? ZERO_VECTOR
                    );
                }
                // Only set Idle if not going to/searching last known position
                if (!this.goingToLastKnown && !this.searchingAfterLostTime) {
                    this.state = CatState.Idle;
                    this.target = null;
                    this.alertPositionReachedTime = null;
                    return ZERO_VECTOR;
                }
            }
            if (this.target == null)
                this.target = notFar(getCenter(this.host), randPos(this.space));
            const movement = this.goTo(this.target);
            if (movement == null) {
                if (this.alertPositionReachedTime == null)
                    this.alertPositionReachedTime = time.t;
                if (ALERT_TIMEOUT < time.t - this.alertPositionReachedTime) {
                    this.target = null;
                    this.alertPositionReachedTime = null;
                }
            }
            return movement ?? ZERO_VECTOR;
        }
        // Unconditional fallback: if we have a last known position and can't see/hear, always go to it and search
        const canSee = seen && seen.accuracy > VAGUE_OBSERVATION_THRESHOLD;
        const canHear = heard && heard.accuracy > VAGUE_OBSERVATION_THRESHOLD;
        if (
            this.mouseLastKnownPosition &&
            ((!canSee && !canHear) || this.goingToLastKnown)
        ) {
            this.goingToLastKnown = true;
            // Move to last known position until reached
            const hostCenter = getCenter(this.host);
            const dist = distance(hostCenter, this.mouseLastKnownPosition);
            if (dist > this.host.width * 0.2) {
                return this.goTo(this.mouseLastKnownPosition) ?? ZERO_VECTOR;
            } else {
                // Start search phase
                this.goingToLastKnown = false;
                this.searchingAfterLostTime = time.t;
                this.scanAngle = 0;
                this.mouseLastKnownPosition = null;
                return ZERO_VECTOR;
            }
        }

        return ZERO_VECTOR;
    }

    private lookForMouse(hostCenter: Vector): Observation | null {
        const s = this.space.lookForMouse();
        const m = s.target;
        const mc = getCenter(m);
        const d = distance(hostCenter, mc);
        const dir = normalize(subtract(mc, hostCenter));
        const dot = dotProduct(dir, this.host.direction);
        const inFov = dot > Math.cos(CAT_FOV / 2);
        const f = inFov ? dot : 0;
        const accuracy = f * s.visibility * getSightAcc(d) * getMoveFac(m);
        return s.visibility > 0 && inFov ? { position: mc, accuracy } : null;
    }

    private listenForMouse(
        time: TimeStep,
        hostCenter: Vector,
    ): Observation | null {
        const sound = this.space.listen(time, hostCenter);

        if (!sound) {
            return null;
        }

        return {
            position: sound.position,
            accuracy: sound.volume,
        };
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
