/*
 * Copyright (c) 2024 - 2025 Tero Jäntti, Sami Heikkinen
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

// @ts-expect-error Library module
import CPlayer from "./musicplayer.js";
import { isIOS } from "../platform/deviceDetection";

export interface Tune extends HTMLAudioElement {
    _fadeInterval?: number;
    _fadeOutInTimeout?: number;
}

export type SongData = {
    i: number[];
    p: (number | undefined)[];
    c: { n: (number | undefined)[]; f: never[] }[];
};

export const createTune = (): Tune => document.createElement("audio") as Tune;

export const initTune = (
    audioTrack: Tune,
    tune: unknown,
    isLooped: boolean,
): Promise<void> => {
    return new Promise((resolve) => {
        const songplayer = new CPlayer();
        // Initialize music generation (player).
        songplayer.init(tune);
        // Generate music...
        let done = false;
        const interval = setInterval(function () {
            if (done) {
                clearInterval(interval);
                return;
            }
            done = songplayer.generate() >= 1;
            if (done) {
                clearInterval(interval);
                // Put the generated song in an Audio element.
                const wave = songplayer.createWave();
                audioTrack.src = URL.createObjectURL(
                    new Blob([wave], { type: "audio/wav" }),
                );
                audioTrack.loop = isLooped;
                resolve();
            }
        }, 16);
    });
};

export const stopTune = (tune: Tune): void => {
    if (tune._fadeInterval) {
        clearInterval(tune._fadeInterval);
        tune._fadeInterval = undefined;
    }
    if (tune._fadeOutInTimeout) {
        clearTimeout(tune._fadeOutInTimeout);
        tune._fadeOutInTimeout = undefined;
    }

    tune.pause();
    tune.currentTime = 0;
};

const roundToFractionDigits = (x: number, fractionDigits: number): number =>
    parseFloat(x.toFixed(fractionDigits));

// --- Fade Manager ---

interface FadeTask {
    tune: Tune;
    from: number;
    to: number;
    step: number;
    onDone?: () => void;
}

const fadeTasks: FadeTask[] = [];
let fadeTimer: number | undefined;

function startFadeManager() {
    if (fadeTimer !== undefined) return;
    fadeTimer = setInterval(() => {
        for (let i = fadeTasks.length - 1; i >= 0; i--) {
            const task = fadeTasks[i];
            const dir = Math.sign(task.to - task.from);
            let v = roundToFractionDigits(
                task.tune.volume + dir * task.step,
                2,
            );
            if ((dir > 0 && v > task.to) || (dir < 0 && v < task.to))
                v = task.to;
            task.tune.volume = v;
            let done = false;
            if (dir > 0 ? v >= task.to : v <= task.to) {
                if (task.to === 0) task.tune.pause();
                done = true;
            }
            if (done) {
                if (task.onDone) setTimeout(task.onDone, 500);
                fadeTasks.splice(i, 1);
            }
        }
        if (fadeTasks.length === 0 && fadeTimer !== undefined) {
            clearInterval(fadeTimer);
            fadeTimer = undefined;
        }
    }, 100);
}

function addFadeTask(task: FadeTask) {
    // Set initial volume if needed
    if (typeof task.from === "number") task.tune.volume = task.from;
    fadeTasks.push(task);
    startFadeManager();
}

export const FadeOut = (tune: Tune, vol = 0): void => {
    addFadeTask({
        tune,
        from: tune.volume,
        to: vol,
        step: 0.2,
    });
};

export const FadeIn = (tune: Tune, vol: number = 1): void => {
    let playPromise = Promise.resolve();
    if (tune.paused) {
        tune.volume = isIOS ? 0.1 : 0;
        tune.setAttribute("playsinline", "playsinline");
        playPromise = tune.play();
    }
    playPromise
        .then(() => {
            addFadeTask({
                tune,
                from: tune.volume,
                to: vol,
                step: 0.2,
            });
        })
        .catch((e) => {
            console.warn("FadeIn play() failed:", e);
            if (tune.paused) {
                tune.volume = 1;
                tune.play().catch((err) =>
                    console.error("Second play attempt failed:", err),
                );
            }
        });
};

export const FadeOutIn = (tune1: Tune, tune2: Tune, vol: number = 1): void => {
    addFadeTask({
        tune: tune1,
        from: tune1.volume,
        to: 0,
        step: 0.2,
        onDone: () => FadeIn(tune2, vol),
    });
};
