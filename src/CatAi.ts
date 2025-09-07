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
 * - A reset() method allows the AI to be stopped/cleared when the mouse finds the hole or the level ends, resetting all state and music.
 */

export let sightAccuracyDebug: number = 0;
export let hearAccuracyDebug: number = 0;

const OBSERVE_PERIOD = 500;
const SIGHT_ACCURACY_LOWERING_DISTANCE = 3.5 * TILE_SIZE;

// Cat's field of view in radians (e.g., 160 degrees)
const CAT_FOV = (160 * Math.PI) / 180;

export const CERTAIN_OBSERVATION_THERSHOLD = 0.5;
export const VAGUE_OBSERVATION_THRESHOLD = 0.15;

const ALERT_TIMEOUT = 1200;
const VAGUE_OBSERVATION_COOLDOWN = 700; // ms
const OBSERVATION_LINGER_TIME = 800; // ms to keep chasing/alert after last observation
const HEARING_CHASE_THRESHOLD = 0.3;

type Observation = { position: Vector; accuracy: number; mouse?: Mouse };
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
    private lastMusic: string | null = SFX_RUNNING;

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

    private hearingEvents: { t: number; v: number }[] = [];
    private NOISE_SUM_THRESHOLD = 0.6; // total noise needed in 1s to trigger jump (must be > per-event cap)
    private jumpTo: Vector | null = null;
    public dropAnim: boolean = false;
    private jumpTarget: Vector | null = null;
    private jumpStart: number = 0;
    private jumpDuration: number = 1200; // ms
    private hasJumped: boolean = false;
    private postJumpWait: number = 0;
    private postJumpDelay: number = 1200; // ms to wait after jump before chasing

    private initialCatPos = { x: -1000, y: -1000 };
    constructor(
        private host: Animal,
        private space: Space,
    ) {
        // Place cat offscreen before first jump
        this.host.x = this.initialCatPos.x;
        this.host.y = this.initialCatPos.y;
        this.host.direction = { x: 0, y: 1 };
    }

    // Resets cat AI state and music (e.g. when level finishes)
    reset() {
        this.state = CatState.Idle;
        this.target = null;
        this.mouseLastKnownPosition = null;
        this.goingToLastKnown = false;
        this.searchingAfterLostTime = 0;
        this.scanAngle = 0;
        this.hearingEvents = []; // Reset noise buffer for next track/level
        if (this.lastMusic !== SFX_RUNNING) {
            playTune(SFX_RUNNING);
            this.lastMusic = SFX_RUNNING;
        }
    }

    getMovement(time: TimeStep): Vector {
        // Smooth jump/drop animation
        if (this.jumpTo) {
            this.jumpTarget = { x: this.jumpTo.x, y: this.jumpTo.y };
            this.jumpStart = time.t;
            this.dropAnim = true;
            this.jumpTo = null;
            this.hasJumped = true;
            this.postJumpWait = time.t + this.postJumpDelay;
            // On first jump, move cat to jump start position (so animation starts from there)
            if (
                this.host.x === this.initialCatPos.x &&
                this.host.y === this.initialCatPos.y
            ) {
                this.host.x = this.jumpTarget.x - this.host.width / 2;
                this.host.y = this.jumpTarget.y - this.host.height / 2;
            }
        }
        if (this.jumpTarget) {
            const start = {
                x: this.host.x + this.host.width / 2,
                y: this.host.y + this.host.height / 2,
            };
            const end = this.jumpTarget;
            const elapsed = time.t - this.jumpStart;
            const duration = this.jumpDuration;
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
                this.dropAnim = false;
            }
            // No movement during jump
            return ZERO_VECTOR;
        }

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
        // Before first jump, use the mouse's position as the hearing center
        let hostCenter: Vector;
        if (!this.hasJumped && (this.space as any).player) {
            const mouse = (this.space as any).player;
            hostCenter = {
                x: mouse.x + mouse.width / 2,
                y: mouse.y + mouse.height / 2,
            };
        } else {
            hostCenter = getCenter(this.host);
        }
        // Only allow sight after first jump
        let seen: Observation | null = null;
        let heard: Observation | null = null;
        if (this.hasJumped) {
            seen = this.lookForMouse(hostCenter);
        }
        if (OBSERVE_PERIOD < time.t - this.lastObserveTime) {
            const heardRaw = this.listenForMouse(time, hostCenter);
            // Only count as heard if above threshold
            heard =
                heardRaw && heardRaw.accuracy >= HEARING_CHASE_THRESHOLD
                    ? heardRaw
                    : null;
            hearAccuracyDebug = heardRaw?.accuracy ?? 0;
            // Accumulate noise events before first jump (no distance attenuation)
            if (!this.hasJumped && heard) {
                // Clamp each event to max 0.3 so loud grass sounds can't trigger jump
                const capped = Math.min(heard.accuracy, 0.3);
                this.hearingEvents.push({ t: time.t, v: capped });
                // Remove events older than 1s
                const cutoff = time.t - 1000;
                this.hearingEvents = this.hearingEvents.filter(
                    (e) => e.t >= cutoff,
                );
            }
            // After jump, apply distance-based attenuation to heard.accuracy
            if (this.hasJumped && heard) {
                // Calculate distance from cat to sound
                const dist = distance(getCenter(this.host), heard.position);
                // Example attenuation: linear falloff, max at 0, min at 1.5 * TILE_SIZE
                const maxDist = 1.5 * TILE_SIZE;
                const att = clamp(1 - dist / maxDist, 0, 1);
                heard.accuracy = heard.accuracy * att;
            }
        }
        sightAccuracyDebug = seen?.accuracy ?? 0;
        const obs = better(seen, heard);
        // Only allow hearing to trigger the first jump
        if (!this.hasJumped) {
            // Only jump if enough noise in last 1s AND at least 2 events
            const noiseSum = this.hearingEvents.reduce(
                (sum, e) => sum + e.v,
                0,
            );
            const noiseCount = this.hearingEvents.length;
            if (noiseSum >= this.NOISE_SUM_THRESHOLD && noiseCount >= 2) {
                const offset = 24;
                const jumpPos = {
                    x: heard?.position.x ?? hostCenter.x,
                    y: heard?.position.y ?? hostCenter.y,
                };
                if (heard && heard.mouse && heard.mouse.movement) {
                    const mx = heard.mouse.movement.x;
                    const my = heard.mouse.movement.y;
                    const len = Math.sqrt(mx * mx + my * my);
                    if (len > 0.01) {
                        jumpPos.x += (mx / len) * offset;
                        jumpPos.y += (my / len) * offset;
                    } else {
                        jumpPos.x += offset;
                    }
                } else {
                    jumpPos.x += offset;
                }
                this.jumpTo = jumpPos;
                this.lastSenseTime = time.t;
                this.mouseLastKnownPosition = heard?.position ?? hostCenter;
                if (this.state !== CatState.Chase) this.state = CatState.Chase;
                this.hearingEvents = [];
            }
        } else {
            if (
                (seen && seen.accuracy > VAGUE_OBSERVATION_THRESHOLD) ||
                (heard && heard.accuracy > VAGUE_OBSERVATION_THRESHOLD)
            ) {
                // If seeing the mouse and not already chasing, jump to mouse position
                if (
                    seen &&
                    seen.accuracy > VAGUE_OBSERVATION_THRESHOLD &&
                    this.state !== CatState.Chase
                ) {
                    // Jump closer in front of the mouse, not directly on top
                    const offset = 24;
                    const jumpPos = { x: seen.position.x, y: seen.position.y };
                    if (seen.mouse && seen.mouse.movement) {
                        const mx = seen.mouse.movement.x;
                        const my = seen.mouse.movement.y;
                        const len = Math.sqrt(mx * mx + my * my);
                        if (len > 0.01) {
                            jumpPos.x += (mx / len) * offset;
                            jumpPos.y += (my / len) * offset;
                        } else {
                            // Default direction: right
                            jumpPos.x += offset;
                        }
                    } else {
                        // Default direction: right
                        jumpPos.x += offset;
                    }
                    this.jumpTo = jumpPos;
                }
                this.lastSenseTime = time.t;
                if (obs) this.mouseLastKnownPosition = obs.position;
                if (this.state !== CatState.Chase) this.state = CatState.Chase;
            }
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
            // Only patrol after first jump
            if (!this.hasJumped) return ZERO_VECTOR;
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
        // Only count as hearing if above both vague threshold and hearing threshold
        const canHear =
            heard &&
            heard.accuracy > VAGUE_OBSERVATION_THRESHOLD &&
            heard.accuracy >= HEARING_CHASE_THRESHOLD;
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

        // --- SFX logic ---
        let newMusic = null;
        if (this.state === CatState.Chase) newMusic = SFX_CHASE;
        else newMusic = SFX_RUNNING;
        if (newMusic !== this.lastMusic) {
            playTune(newMusic);
            this.lastMusic = newMusic;
        }

        // After jump, wait before chasing
        if (this.postJumpWait > 0) {
            if (time.t < this.postJumpWait) {
                return ZERO_VECTOR;
            } else {
                this.postJumpWait = 0;
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
        return s.visibility > 0 && inFov
            ? { position: mc, accuracy, mouse: m }
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
        let mouse: Mouse | undefined = undefined;
        if ((this.space as any).player) mouse = (this.space as any).player;
        return {
            position: sound.position,
            accuracy: sound.volume,
            mouse,
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
