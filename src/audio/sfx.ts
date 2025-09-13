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
    kbSfx,
    startSong,
    mouseSfx,
    mouseWalkNormalSfx,
    fightSong,
} from "./sfxData.ts";

import { createTune, FadeOutIn, type SongData } from "../core/audio/music.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { zzfx } from "../core/audio/sfxPlayer.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CPlayer from "../core/audio/musicplayer.js";

export const SFX_START = "start";
export const SFX_RUNNING = "gamestarted";
export const SFX_CHASE = "chase";
export const SFX_KB = "keyboard";
export const SFX_GAMEOVER = "gameover";
export const SFX_MOUSE_WALK_NORMAL = "mousewalknormal";

type Tune = {
    songData: SongData[];
    rowLen: number;
    patternLen: number;
    endPattern: number;
    numChannels: number;
};

const startTune = createTune();
const gameTune = createTune();

const initMusicPlayer = (
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
    return Promise.all([
        initMusicPlayer(startTune, startSong, true),
        initMusicPlayer(gameTune, fightSong, true),
    ]);
};

export const playTune = async (tune: string, vol: number = 1) => {
    if (vol === 0) return;

    switch (tune) {
        case SFX_RUNNING: {
            FadeOutIn(gameTune, startTune, 0.2);
            break;
        }
        case SFX_GAMEOVER: {
            zzfx(1, ...mouseSfx);
            FadeOutIn(startTune, gameTune);
            break;
        }
        case SFX_START: {
            startTune.currentTime = 0;
            FadeOutIn(gameTune, startTune);
            break;
        }
        case SFX_CHASE: {
            gameTune.currentTime = 0;
            FadeOutIn(startTune, gameTune);
            break;
        }
        case SFX_KB: {
            zzfx(0.5, ...kbSfx);
            break;
        }
        case SFX_MOUSE_WALK_NORMAL: {
            zzfx(vol, ...mouseWalkNormalSfx);
            break;
        }
    }
};
