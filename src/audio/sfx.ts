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

import {
    bounceSfx,
    hitSfx,
    kbSfx,
    teleportSfx,
    countSfx,
    goSfx,
    startSong,
} from "./sfxData.ts";

import {
    createTune,
    FadeIn,
    FadeOut,
    type SongData,
} from "../core/audio/music.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { zzfx } from "../core/audio/sfxPlayer.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CPlayer from "../core/audio/musicplayer.js";
import { setupAudioUnlock } from "../core/audio/unlock.ts";

export const SFX_START = "start";
export const SFX_RUNNING = "gamestarted";
export const SFX_BOUNCE = "bounce";
export const SFX_HIT = "hit";
export const SFX_TELEPORT = "teleport";
export const SFX_KB = "keyboard";
export const SFX_FINISHED = "finished";
export const SFX_GAMEOVER = "gameover";
export const SFX_RESTART = "restart";
export const SFX_COUNT = "count";
export const SFX_GO = "go";

type Tune = {
    songData: SongData[];
    rowLen: number;
    patternLen: number;
    endPattern: number;
    numChannels: number;
};

const startTune = createTune();
const gameTune = createTune();
const gameoverFx = createTune();

export const initMusicPlayer = (
    audioTrack: { src: string; loop: boolean },
    tune: Tune,
    isLooped: boolean,
) => {
    return new Promise<void>((resolve) => {
        const songplayer = new CPlayer();
        // Initialize music generation (player).
        songplayer.init(tune);
        // Generate music...
        let done = false;
        setInterval(function () {
            if (done) {
                return;
            }
            done = songplayer.generate() >= 1;
            if (done) {
                // Put the generated song in an Audio element.
                const wave = songplayer.createWave();
                audioTrack.src = URL.createObjectURL(
                    new Blob([wave], { type: "audio/wav" }),
                );
                audioTrack.loop = isLooped;

                resolve();
            }
        }, 0);
    });
};

export const initializeAudio = () => {
    const silentAudio = document.createElement("audio");
    silentAudio.setAttribute(
        "src",
        "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//tUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABGwD///////////////////////////////////////////8AAAA8TEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAARvMPHBz//////////////////////////////////////////////////////////////////8AAAA",
    );

    // Set up audio unlock automatically
    setupAudioUnlock(silentAudio);

    return Promise.all([
        initMusicPlayer(startTune, startSong, true),
        //    initMusicPlayer(raceTune, song2, true),
        //    initMusicPlayer(gameoverFx, gameoverSfx, false),
    ]);
};

export const playTune = async (tune: string, vol: number = 1) => {
    if (vol === 0) return;

    switch (tune) {
        case SFX_RUNNING: {
            FadeOut(startTune, 0.2);
            break;
        }
        case SFX_FINISHED: {
            //zzfx(0.04, ...finishSfx);
            //startTune.currentTime = 0;
            //FadeOutIn(raceTune, startTune);
            break;
        }
        case SFX_GAMEOVER: {
            if (startTune.paused || startTune.volume < 1) {
                startTune.currentTime = 0;
                FadeIn(startTune);
            }
            break;
        }
        case SFX_RESTART: {
            startTune.currentTime = 0;
            FadeIn(startTune);
            break;
        }
        case SFX_START: {
            if (startTune.paused || startTune.volume < 1) {
                startTune.currentTime = 0;
                FadeIn(startTune);
            }
            break;
        }
        case SFX_BOUNCE: {
            zzfx(vol, ...bounceSfx);
            break;
        }
        case SFX_HIT: {
            zzfx(vol, ...hitSfx);
            break;
        }
        case SFX_KB: {
            zzfx(0.5, ...kbSfx);
            break;
        }
        case SFX_TELEPORT: {
            zzfx(vol, ...teleportSfx);
            break;
        }
        case SFX_COUNT: {
            zzfx(0.5, ...countSfx);
            break;
        }
        case SFX_GO: {
            zzfx(0.5, ...goSfx);
            break;
        }
    }
};

export const stopTune = (tune: string) => {
    const tunesToStop = [];

    if (tune === SFX_RUNNING) {
        tunesToStop.push(gameTune);
    } else if (tune === SFX_START) {
        tunesToStop.push(startTune);
    } else {
        tunesToStop.push(startTune, gameTune, gameoverFx);
    }

    tunesToStop.forEach((audioEl) => {
        if (audioEl._fadeInterval) {
            clearInterval(audioEl._fadeInterval);
            audioEl._fadeInterval = undefined;
        }
        if (audioEl._fadeOutInTimeout) {
            clearTimeout(audioEl._fadeOutInTimeout);
            audioEl._fadeOutInTimeout = undefined;
        }

        audioEl.pause();
        audioEl.currentTime = 0;
    });
};
