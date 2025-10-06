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
import { random, randomInt, randomMinMax } from "./core/math/random";
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
import type { Observation, Space } from "./Space";
import { Difficulty } from "./settings";
import { TILE_DRAW_HEIGHT, TILE_SIZE } from "./tiles";
import {
    playTune,
    SFX_CHASE,
    SFX_RUNNING,
    SFX_BOUNCE,
    SFX_MEOW,
} from "./audio/sfx";
import type { GameObject } from "./GameObject";

export let sightAccuracyDebug: number = 0;
export let hearAccuracyDebug: number = 0;

// Make sure the cat does not appear on the screen at start as the horizon
// takes care of drawing it when on the fence.
const INITIAL_CAT_POS: Vector = { x: -1000, y: -1000 };

const GOTO_FENCE_DURATION = 800;
const NOTICE_DURATION = 1500;

const FENCE_HEARD_THRESHOLD = 0.06;
const FENCE_NOTICE_THRESHOLD = 0.16;

export const JUMP_DURATION: number = 1500; // ms
const STILL_AFTER_JUMP_DURATION = 1000;

const HEARING_PERIOD = 200;
const HEAR_OBSERVATION_BUFFER_TIME = 1500;
const HEAR_BUFFER_MAX_SIZE = 4;

const SIGHT_ACCURACY_LOWERING_DISTANCE = 6.5 * TILE_SIZE;

// Cat's field of view in radians (e.g., 160 degrees)
const CAT_FOV = (160 * Math.PI) / 180;

export const NORMAL_SIGHT_THRESHOLD = 0.3;
export const ACCURATE_SIGHT_THRESHOLD = 0.12;

export const HEAR_THRESHOLD = 0.18;
export const ACCURATE_HEAR_THRESHOLD = 0.1;

const HEAR_OBSERVATION_IGNORE_TIME = 3500;

const STOP_TO_LISTEN_TIME = 1500;

const SEARCH_TIME = 5000;
const CHASE_RETURN_DELAY = 700; // ms - how quickly music should revert after chase ends
// Meow plays immediately on new sightings.
const LOOK_AROUND_INTERVAL = 1500;

// Speeds relative to the actual speed in BlackCat.ts.
const SPEED_IDLE = 0.4;
const SPEED_VAGUE_OBSERVATION = 0.8;
const SPEED_CHASE = 1.0;

const DIRECTIONS: readonly Vector[] = [
    { x: 0, y: -1 },
    { x: 0.5, y: -0.5 },
    { x: 1, y: 0 },
    { x: 0.5, y: 0.5 },
    { x: 0, y: 1 },
    { x: -0.5, y: -0.5 },
    { x: -1, y: 0 },
    { x: -0.5, y: -0.5 },
];

function getRandomDirection(): Vector {
    return DIRECTIONS[randomInt(DIRECTIONS.length)];
}

function getSightAccuracy(d: number) {
    return clamp(1.5 - d / SIGHT_ACCURACY_LOWERING_DISTANCE, 0.35, 1);
}

function getMoveFactor(m: Mouse) {
    return clamp(length(m.movement) / 0.16, 0.3, 1);
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
    return add(from, multiply(direction, dist * 0.5));
}

function better(
    a: Observation | null,
    b: Observation | null,
): Observation | null {
    if (!a) return b;
    if (!b) return a;
    return a.accuracy > b.accuracy ? a : b;
}

function updateObservationBuffer(
    buffer: Observation[],
    time: TimeStep,
    newObservation: Observation | null,
): void {
    // Remove oldest observations
    while (true) {
        const oldest = buffer.at(0);
        if (
            buffer.length > HEAR_BUFFER_MAX_SIZE ||
            (oldest && HEAR_OBSERVATION_BUFFER_TIME < time.t - oldest.t)
        ) {
            buffer.shift();
        } else {
            break;
        }
    }

    // Add new observation
    const previousObservation = buffer.at(-1);
    if (newObservation && newObservation.t !== previousObservation?.t) {
        buffer.push(newObservation);
    }
}

function reduceObservations(
    observations: readonly Observation[],
): Observation | null {
    const latestObservation = observations.at(-1);

    if (!latestObservation) {
        return null;
    }

    let sum = 0;

    for (let i = 0; i < observations.length; i++) {
        const o = observations[i];
        sum += o.accuracy;
    }

    const averageAccuracy = sum / HEAR_BUFFER_MAX_SIZE;

    return {
        t: latestObservation.t,
        position: latestObservation.position,
        accuracy: averageAccuracy,
    };
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
    jumpTarget: Vector | null = null;
    jumpFinishTime: number = 0;

    private lastMusic: string | null = SFX_RUNNING;

    private heardSomethingTime: number = 0;
    private noticedTime: number = 0;

    jumpStartTime: number = 0;
    private hasLanded: boolean = false;
    private hasJumped: boolean = false;

    private lastHearingTime: number = 0;
    private lastObservation: Observation | null = null;
    private lastSightObservation: Observation | null = null;
    private sightThreshold = NORMAL_SIGHT_THRESHOLD;
    private lastHearObservation: Observation | null = null;
    private hearBuffer: Observation[] = [];

    private stopToListenStartTime: number = 0;
    private lastAccurateHearObservation: Observation | null = null;

    // Tracks whether we've already played a meow for the current chase cycle.
    private meowPlayed: boolean = false;

    // Timestamp when last chase ended; used to revert music after a delay.
    private chaseEndTime: number = 0;

    private lookAroundStartTime: number = 0;
    private lastTurnTime: number = 0;

    private idleTarget: Vector | null = null;

    private speedMultiplier: number = 1;

    get isOnLevel(): boolean {
        return (
            this.host.x !== INITIAL_CAT_POS.x &&
            this.host.y !== INITIAL_CAT_POS.y &&
            this.hasLanded
        );
    }

    // Public accessor so other systems can know if the cat is actively
    // chasing a sighting and where that chase is directed.
    public get isChasing(): boolean {
        return !!this.lastSightObservation;
    }

    public get chaseTarget(): Vector | null {
        return this.lastSightObservation
            ? this.lastSightObservation.position
            : null;
    }

    constructor(
        private host: Animal,
        private space: Space,
        private mouse: Mouse,
        private difficulty: Difficulty = Difficulty.Hard,
    ) {
        // Place cat offscreen before first jump
        this.host.x = INITIAL_CAT_POS.x;
        this.host.y = INITIAL_CAT_POS.y;
        this.host.direction = { x: 0, y: 1 };
        this.speedMultiplier = this.difficulty === Difficulty.Easy ? 0.6 : 1.0;
    }

    getMovement(time: TimeStep): Vector {
        const hostCenter = getCenter(this.host);
        this.observe(time, hostCenter);

        return (
            this.stayOnTheFence(time) ??
            this.jump(time, hostCenter) ??
            this.chase(time, hostCenter) ??
            this.followHearObservation(time, hostCenter) ??
            this.stopToListen(time) ??
            this.lookAround(time) ??
            this.idle(hostCenter)
        );
    }

    private observe(time: TimeStep, hostCenter: Vector): void {
        const seen = this.lookForMouse(time, hostCenter);
        let heard: Observation | null = null;

        sightAccuracyDebug = seen?.accuracy ?? 0;

        if (seen && seen.accuracy >= this.sightThreshold) {
            // Only trigger a meow when we transition from no sight
            // observation to having one. This prevents repeated meows while
            // already chasing the same sighting. Also mark chaseActive so
            // music follows the chase lifecycle.
            const hadSightBefore = !!this.lastSightObservation;
            this.lastSightObservation = seen;
            if (!hadSightBefore) {
                if (!this.meowPlayed) {
                    playTune(SFX_MEOW);
                    this.meowPlayed = true;
                }
            }
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

            heard = this.space.listen(time, listenerPosition);

            updateObservationBuffer(this.hearBuffer, time, heard);
            this.lastHearObservation = reduceObservations(this.hearBuffer);

            hearAccuracyDebug = this.lastHearObservation?.accuracy ?? 0;
        }

        const obs = better(seen, heard);

        this.lastObservation = obs;
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

        const lastObservation = this.lastObservation;
        if (
            this.fenceState === FenceState.HeardSomething &&
            GOTO_FENCE_DURATION < time.t - this.heardSomethingTime &&
            lastObservation &&
            lastObservation.accuracy > FENCE_NOTICE_THRESHOLD
        ) {
            this.lastSightObservation = {
                ...lastObservation,
                position: {
                    x: lastObservation.position.x,
                    // Anticipate that the mouse is going forward
                    y: lastObservation.position.y - TILE_DRAW_HEIGHT * 8,
                },
            };
            this.fenceState = FenceState.Noticed;
            this.noticedTime = time.t;
            playTune(SFX_MEOW);
            // Mark that we've already played the meow for this upcoming chase
            this.meowPlayed = true;

            return ZERO_VECTOR;
        }

        if (
            this.fenceState === FenceState.Noticed &&
            NOTICE_DURATION < time.t - this.noticedTime
        ) {
            // Set jumpTarget as soon as Noticed state is reached, so shadow appears sooner
            if (!this.jumpTarget) {
                this.jumpTarget = {
                    x: this.mouse.x + randomMinMax(-0.5, 0.5) * TILE_SIZE,
                    y: this.mouse.y - 5 * TILE_DRAW_HEIGHT,
                };
            }
            // Position the cat such that it appears coming from the fence
            this.host.x = this.mouse.x - this.host.width * 0.5;
            this.host.y =
                this.mouse.y - 20 * TILE_DRAW_HEIGHT - this.host.height * 0.5;
            // Play bounce SFX as the cat jumps from the fence
            playTune(SFX_BOUNCE);
            this.fenceState = FenceState.Jumped;
            return ZERO_VECTOR;
        }

        return ZERO_VECTOR;
    }

    private jump(time: TimeStep, hostCenter: Vector): Vector | null {
        if (this.hasJumped) {
            return null;
        }

        // Set jumpTarget only when jump starts
        if (!this.jumpStartTime) {
            this.jumpStartTime = time.t;
            this.jumpTarget = {
                x: this.mouse.x + randomMinMax(-0.5, 0.5) * TILE_SIZE,
                y: this.mouse.y - 5 * TILE_DRAW_HEIGHT,
            };
        }

        // Only draw shadow and move cat while actively jumping
        if (this.jumpTarget && !this.jumpFinishTime) {
            // Hide cat during jump arc
            this.host.x = -10000;
            this.host.y = -10000;
            // Jump!
            const done = jumpMovement(
                time,
                this.jumpStartTime,
                this.host,
                hostCenter,
                this.jumpTarget,
            );

            // Shadow should be drawn at jumpTarget as soon as jumpTarget is set

            if (done) {
                // Do not place cat at landing position yet, keep hidden for 1 second
                this.jumpFinishTime = time.t;
            }

            // No movement during jump
            return ZERO_VECTOR;
        }

        // After jump is finished, animate cat dropping from the sky for 0.12s, then show at landing position
        const dropDuration = 120;
        if (
            this.jumpFinishTime &&
            time.t - this.jumpFinishTime < dropDuration
        ) {
            // Animate cat dropping from above with ease-out
            const t = (time.t - this.jumpFinishTime) / dropDuration;
            const ease = 1 - Math.pow(1 - t, 2);
            if (this.jumpTarget) {
                // Start higher above the target, drop down
                const startY = this.jumpTarget.y - 120;
                const endY = this.jumpTarget.y - this.host.height / 2;
                const y = startY + (endY - startY) * ease;
                this.host.x = this.jumpTarget.x - this.host.width / 2;
                this.host.y = y;
            }
            return ZERO_VECTOR;
        }
        if (
            this.jumpFinishTime &&
            time.t - this.jumpFinishTime >= dropDuration &&
            this.jumpTarget
        ) {
            // Show cat at landing position after drop, aligned with shadow
            const width = this.host.width;
            const h = width / (3 / 4); // CAT_ASPECT_RATIO
            this.host.x = this.jumpTarget.x;
            this.host.y = this.jumpTarget.y + h * 0.1;
            this.jumpTarget = null;
            this.hasLanded = true;
            return ZERO_VECTOR;
        }

        // Stay still for a little while after the jump.
        if (
            this.hasLanded &&
            time.t - this.jumpFinishTime >= dropDuration &&
            time.t - this.jumpFinishTime <
                dropDuration + STILL_AFTER_JUMP_DURATION &&
            // Do not pause if the mouse is seen
            !(
                this.lastSightObservation &&
                time.t - this.lastSightObservation?.t < 500
            )
        ) {
            return ZERO_VECTOR;
        }

        // If we've passed the post-jump still period, clear the jump state
        // so the AI can return to normal behavior (including music changes)
        if (
            this.hasLanded &&
            this.jumpFinishTime &&
            time.t - this.jumpFinishTime >=
                dropDuration + STILL_AFTER_JUMP_DURATION
        ) {
            this.hasJumped = true;
            this.jumpStartTime = 0;
            this.jumpFinishTime = 0;
            // Start look-around so chase() can decide to switch music later
            this.lookAroundStartTime = time.t;
        }

        return null;
    }

    private idle(hostCenter: Vector): Vector {
        if (this.idleTarget == null) {
            this.idleTarget = getRandomPosition(this.space);
            this.useMusic(SFX_RUNNING);
        }

        const movement = this.goTo(
            this.idleTarget,
            hostCenter,
            SPEED_IDLE * this.speedMultiplier,
        );

        if (!movement) {
            this.idleTarget = null;
            return ZERO_VECTOR;
        }

        return movement;
    }

    private followHearObservation(
        time: TimeStep,
        hostCenter: Vector,
    ): Vector | null {
        if (
            !this.stopToListenStartTime &&
            this.lastAccurateHearObservation &&
            time.t - this.lastAccurateHearObservation.t <
                HEAR_OBSERVATION_IGNORE_TIME
        ) {
            if (this.idleTarget) {
                // Dont always go back to the same direction after following the mouse.
                this.idleTarget = null;
            }

            this.isAlert = true;
            const d = distance(
                hostCenter,
                this.lastAccurateHearObservation.position,
            );
            const target =
                d < TILE_SIZE
                    ? this.lastAccurateHearObservation.position
                    : getPointBetween(
                          hostCenter,
                          this.lastAccurateHearObservation.position,
                      );

            return this.goTo(
                target,
                hostCenter,
                SPEED_VAGUE_OBSERVATION * this.speedMultiplier,
            );
        }

        this.isAlert = false;
        return null;
    }

    private chase(time: TimeStep, hostCenter: Vector): Vector | null {
        if (this.lastSightObservation) {
            this.useMusic(SFX_CHASE);

            // Look more accurately when chasing
            if (this.sightThreshold > ACCURATE_SIGHT_THRESHOLD) {
                this.sightThreshold = ACCURATE_SIGHT_THRESHOLD;
            }

            const movement = this.goTo(
                this.lastSightObservation.position,
                hostCenter,
                SPEED_CHASE * this.speedMultiplier,
            );

            if (movement == null) {
                this.lastSightObservation = null;
                this.sightThreshold = NORMAL_SIGHT_THRESHOLD;
                this.lookAroundStartTime = time.t;
                // Record when chase ended so we can revert music after a delay
                this.chaseEndTime = time.t;
            }

            return movement;
        }

        // If chase music is playing, revert it after CHASE_RETURN_DELAY from
        // when chase ended.
        if (this.lastMusic === SFX_CHASE && this.chaseEndTime !== 0) {
            if (time.t - this.chaseEndTime >= CHASE_RETURN_DELAY) {
                this.useMusic(SFX_RUNNING);
            }
        }

        return null;
    }

    private stopToListen(time: TimeStep): Vector | null {
        // Stop for listening
        if (
            !this.stopToListenStartTime &&
            this.lastHearObservation &&
            HEAR_THRESHOLD < this.lastHearObservation.accuracy
        ) {
            this.stopToListenStartTime = time.t;
        }

        // Listen closely while standing still
        if (time.t - this.stopToListenStartTime < STOP_TO_LISTEN_TIME) {
            if (
                this.lastHearObservation &&
                ACCURATE_HEAR_THRESHOLD < this.lastHearObservation.accuracy
            ) {
                this.lastAccurateHearObservation = this.lastHearObservation;
            }

            return ZERO_VECTOR;
        }

        // Done listening
        if (this.stopToListenStartTime) {
            this.stopToListenStartTime = 0;
        }

        return null;
    }

    private lookAround(time: TimeStep): Vector | null {
        // If lookAroundStartTime is zero, there's no active look-around.
        if (!this.lookAroundStartTime) return null;

        const elapsed = time.t - this.lookAroundStartTime;
        if (elapsed < SEARCH_TIME) {
            if (LOOK_AROUND_INTERVAL < time.t - this.lastTurnTime) {
                this.lastTurnTime = time.t;

                // Move a little to turn to another direction
                return getRandomDirection();
            }

            return ZERO_VECTOR;
        }

        // Look-around finished — allow next chase to meow.
        this.meowPlayed = false;
        this.lookAroundStartTime = 0;
        // Ensure chase music is reverted when look-around completes.
        if (this.chaseEndTime !== 0) {
            this.chaseEndTime = 0;
            // Force the running tune to play even if `lastMusic` is out of
            // sync for some reason. This directly triggers the play and
            // updates the local state to avoid chase music sticking.
            playTune(SFX_RUNNING);
            this.lastMusic = SFX_RUNNING;
        }
        return null;
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
        const sighting = this.space.lookForMouse(time);
        const d = distance(hostCenter, sighting.position);
        const directionToMouse = normalize(
            subtract(sighting.position, hostCenter),
        );
        const dot = dotProduct(directionToMouse, this.host.direction);
        const inFov = dot > Math.cos(CAT_FOV / 2);
        const fovFactor = inFov ? dot : 0;
        const accuracy =
            fovFactor *
            sighting.accuracy *
            getSightAccuracy(d) *
            getMoveFactor(this.mouse);

        return sighting.accuracy > 0 && inFov
            ? { ...sighting, accuracy }
            : null;
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
