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

export const CERTAIN_OBSERVATION_THERSHOLD = 0.5;
export const VAGUE_OBSERVATION_THRESHOLD = 0.15;

const ALERT_TIMEOUT = 2000;

const getSightAccuracyByDistance = (distance: number): number =>
    clamp(1 - distance / SIGHT_ACCURACY_LOWERING_DISTANCE, 0.3, 1.0);

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

const notFarFrom = (reference: Vector, position: Vector): Vector => {
    const xMaxDistance = 3 * TILE_SIZE;
    const yMaxDistance = 3 * TILE_DRAW_HEIGHT;
    return {
        x: clamp(
            position.x,
            reference.x - xMaxDistance,
            reference.x + xMaxDistance,
        ),
        y: clamp(
            position.y,
            reference.y - yMaxDistance,
            reference.y + yMaxDistance,
        ),
    };
};

const getPositionALittleTowardsMouse = (
    hostCenter: Vector,
    mousePosition: Vector,
): Vector => {
    const toMouse: Vector = subtract(mousePosition, hostCenter);
    const d = length(toMouse);
    const directionToMouse: Vector = normalize(toMouse);
    return add(hostCenter, multiply(directionToMouse, d / 3));
};

interface Observation {
    position: Vector;
    accuracy: number; // 0-1
}

const chooseBetter = (
    a: Observation | null,
    b: Observation | null,
): Observation | null => {
    if (a == null && b == null) {
        return null;
    }

    if (a == null) {
        return b;
    }

    if (b == null) {
        return a;
    }

    return a.accuracy > b.accuracy ? a : b;
};

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
    private mouseLastObservedPosition: Vector | null = null;

    constructor(
        private host: Animal,
        private space: Space,
    ) {}

    getMovement(time: TimeStep): Vector {
        if (OBSERVE_PERIOD < time.t - this.lastObserveTime) {
            this.lastObserveTime = time.t;
            const hostCenter = getCenter(this.host);

            const seen = this.lookForMouse(hostCenter);
            const heard = this.listenForMouse(time, hostCenter);
            sightAccuracyDebug = seen?.accuracy ?? 0;
            hearAccuracyDebug = heard?.accuracy ?? 0;

            const observation = chooseBetter(seen, heard);

            if (observation) {
                if (CERTAIN_OBSERVATION_THERSHOLD < observation.accuracy) {
                    this.mouseLastObservedPosition = observation.position;
                    if (this.state !== CatState.Chase) {
                        this.state = CatState.Chase;
                    }
                } else if (VAGUE_OBSERVATION_THRESHOLD < observation.accuracy) {
                    const distanceToMouse = distance(
                        hostCenter,
                        observation.position,
                    );
                    this.target =
                        distanceToMouse < TILE_SIZE
                            ? observation.position
                            : getPositionALittleTowardsMouse(
                                  hostCenter,
                                  observation.position,
                              );
                    if (this.state == CatState.Idle) {
                        this.state = CatState.Alert;
                    }
                }
            }
        }

        if (this.state === CatState.Idle) {
            if (this.target == null) {
                this.target = getRandomPosition(this.space);
            }

            const movement = this.goTo(this.target);

            if (movement != null) {
                return movement;
            } else {
                this.target = getRandomPosition(this.space);
            }
        } else if (this.state === CatState.Alert) {
            if (this.target == null) {
                const hostCenter = getCenter(this.host);
                this.target = notFarFrom(
                    hostCenter,
                    getRandomPosition(this.space),
                );
            }

            const movement = this.goTo(this.target);

            if (movement == null) {
                if (this.alertPositionReachedTime == null) {
                    this.alertPositionReachedTime = time.t;
                }
                if (ALERT_TIMEOUT < time.t - this.alertPositionReachedTime) {
                    this.target = null;
                    this.alertPositionReachedTime = null;
                }
            }

            return movement ?? ZERO_VECTOR;
        } else if (
            this.state === CatState.Chase &&
            this.mouseLastObservedPosition
        ) {
            return this.goTo(this.mouseLastObservedPosition) ?? ZERO_VECTOR;
        }

        return ZERO_VECTOR;
    }

    private lookForMouse(hostCenter: Vector): Observation | null {
        const sighting = this.space.lookForMouse();
        const mouse = sighting.target;
        const mouseCenter = getCenter(mouse);
        const distanceToMouse = distance(hostCenter, mouseCenter);
        const directionToMouse = normalize(subtract(mouseCenter, hostCenter));

        const lookingDirectionFactor = Math.max(
            0,
            dotProduct(directionToMouse, this.host.direction),
        );

        const accuracy: number =
            lookingDirectionFactor *
            sighting.visibility *
            getSightAccuracyByDistance(distanceToMouse) *
            getMovementFactor(mouse);

        return sighting.visibility > 0
            ? { position: mouseCenter, accuracy }
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
