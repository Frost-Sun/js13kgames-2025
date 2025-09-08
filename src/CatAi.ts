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
import { random, randomDirection } from "./core/math/random";
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

/*
 * Cat AI implementation:
 * - The cat starts offscreen and cannot see the mouse until it has first heard enough noise to trigger a jump.
 * - Hearing is based on a rolling 1-second buffer of sound events (above a threshold, capped per event), requiring at least two events and a total sum to trigger the jump.
 * - After the first jump, the cat uses both sight and hearing to detect the mouse, with debug variables for both.
 * - If the cat sees or hears the mouse above a threshold, it enters Chase mode and pursues the last known position.
 * - If the cat loses track, it goes to the last known position and performs a search (rotating direction) for a few seconds before idling.
 * - If the cat only vaguely detects the mouse, it enters Alert mode and investigates, but will eventually idle if no further clues are found.
 * - The cat always goes to the last known position before giving up, never stops abruptly after losing sight/sound.
 * - Audio cues (SFX_CHASE/SFX_RUNNING) are played based on chase state, with music switching logic handled in getMovement.
 */

export let sightAccuracyDebug: number = 0;
export let hearAccuracyDebug: number = 0;

const HEARING_PERIOD = 450;
const SIGHT_ACCURACY_LOWERING_DISTANCE = 6.5 * TILE_SIZE;

// Cat's field of view in radians (e.g., 160 degrees)
const CAT_FOV = (160 * Math.PI) / 180;

export const CERTAIN_OBSERVATION_THERSHOLD = 0.4;
export const VAGUE_OBSERVATION_THRESHOLD = 0.2;

const KEEP_CHASING_TIME = 500;
const NOTICE_IGNORE_TIME = 2000;
const SEARCH_TIME = 5000;
const LOOK_AROUND_INTERVAL = 1500;

const INITIAL_CAT_POS: Vector = { x: -1000, y: -1000 };
const JUMP_DURATION: number = 1200; // ms
const NOISE_SUM_THRESHOLD = 0.6; // total noise needed in 1s to trigger jump (must be > per-event cap)

type Observation = {
    t: number;
    position: Vector;
    accuracy: number;
    mouse?: Mouse;
};

function enoughSoundToTriggerJump(observations: Observation[]): boolean {
    // Only jump if enough noise in last 1s AND at least 2 events
    const noiseSum = observations.reduce((sum, e) => sum + e.accuracy, 0);
    const noiseCount = observations.length;
    return noiseSum >= NOISE_SUM_THRESHOLD && noiseCount >= 2;
}

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

export class CatAi {
    isAlert: boolean = false;

    private lastMusic: string | null = SFX_RUNNING;

    private lastHearingTime: number = 0;
    private target: Vector | null = null;
    private lastCertainObservation: Observation | null = null;
    private lastVagueObservation: Observation | null = null;
    private lastHearObservations: Observation[] = [];
    private lastLookAroundTime: number = 0;

    private jumpTarget: Vector | null = null;
    private jumpStart: number = 0;

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
            this.jump(time, hostCenter) ??
            this.chase(time, hostCenter) ??
            this.noticeSomething(time, hostCenter) ??
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
            // Before first jump, use the mouse's position as the hearing center
            const listenerPosition =
                this.host.x !== INITIAL_CAT_POS.x
                    ? hostCenter
                    : getCenter(this.mouse);

            heard = this.listenForMouse(time, listenerPosition);
            hearAccuracyDebug = heard?.accuracy ?? 0;

            if (heard) {
                // Clamp each event to max 0.3 so loud grass sounds can't trigger jump
                const capped = Math.min(heard.accuracy, 0.3);
                this.lastHearObservations.push({
                    ...heard,
                    accuracy: capped,
                });
                // Remove events older than 1s
                const cutoff = time.t - 1000;
                this.lastHearObservations = this.lastHearObservations.filter(
                    (e) => e.t >= cutoff,
                );
            }
        }

        const obs = better(seen, heard);

        if (obs && obs.accuracy > VAGUE_OBSERVATION_THRESHOLD) {
            this.lastVagueObservation = obs;
        }
    }

    private jump(time: TimeStep, hostCenter: Vector): Vector | null {
        if (this.host.x === INITIAL_CAT_POS.x) {
            if (enoughSoundToTriggerJump(this.lastHearObservations)) {
                this.jumpTarget = {
                    x: this.mouse.x - 1.5 * TILE_SIZE,
                    y: this.mouse.y - 2 * TILE_SIZE,
                };
                this.jumpStart = time.t;
                this.host.x = this.jumpTarget.x - this.host.width * 1.5;
                this.host.y = this.jumpTarget.y - this.host.height * 1.5;
            }
            return ZERO_VECTOR;
        }

        if (this.jumpTarget) {
            const start = hostCenter;
            const end = this.jumpTarget;
            const elapsed = time.t - this.jumpStart;
            const duration = JUMP_DURATION;
            let t = Math.min(1, elapsed / duration);
            // Ease in-out
            t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const x = start.x + (end.x - start.x) * t;
            const y = start.y + (end.y - start.y) * t;
            this.host.x = x - this.host.width / 2;
            this.host.y = y - this.host.height / 2;
            if (elapsed >= duration) {
                this.host.x = end.x - this.host.width / 2;
                this.host.y = end.y - this.host.height / 2;
                this.jumpTarget = null;
            }

            // No movement during jump
            return ZERO_VECTOR;
        }

        return null;
    }

    private idle(hostCenter: Vector): Vector {
        if (this.target == null) {
            this.target = getRandomPosition(this.space);
        }

        const movement = this.goTo(this.target, hostCenter);

        if (!movement) {
            this.target = null;
            return ZERO_VECTOR;
        }

        return movement;
    }

    private noticeSomething(time: TimeStep, hostCenter: Vector): Vector | null {
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

            return this.goTo(target, hostCenter);
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
            return this.goTo(this.lastCertainObservation.position, hostCenter);
        } else {
            this.useMusic(SFX_RUNNING);
            return null;
        }
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

    private goTo(target: Vector, hostCenter: Vector): Vector | null {
        const distanceToMousePosition = distance(hostCenter, target);

        if (distanceToMousePosition <= this.host.width * 0.2) {
            return null;
        }

        const direction: Vector = normalize(subtract(target, hostCenter));
        return direction;
    }
}
