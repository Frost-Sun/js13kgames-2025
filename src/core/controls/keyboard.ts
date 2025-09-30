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

import { playTune, SFX_KB } from "../../audio/sfx";

// These must match the definitions in KeyboardEvent.code
export type Key =
    | "ArrowLeft"
    | "ArrowRight"
    | "ArrowUp"
    | "ArrowDown"
    | "Escape"
    | "KeyW"
    | "KeyA"
    | "KeyS"
    | "KeyD";

type KeysMutable = Record<Key, boolean>;

export type Keys = Readonly<KeysMutable>;

const createKeys = (): KeysMutable => ({
    ["ArrowLeft"]: false,
    ["ArrowRight"]: false,
    ["ArrowUp"]: false,
    ["ArrowDown"]: false,
    ["Escape"]: false,
    ["KeyW"]: false,
    ["KeyA"]: false,
    ["KeyS"]: false,
    ["KeyD"]: false,
});

let keys: KeysMutable = createKeys();

const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code in keys) {
        keys[event.code as Key] = true;
    }
};

const onKeyUp = (event: KeyboardEvent): void => {
    if (event.code in keys) {
        keys[event.code as Key] = false;
    }
};

export const initializeKeyboard = (): void => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", () => {
        keys = createKeys();
    });
};

// Helper to register an Escape key listener in a safe way. Returns a
// function that removes the registered listener.
export const addEscapeListener = (
    listener: (event: KeyboardEvent) => void,
): (() => void) => {
    const wrapper = (event: KeyboardEvent): void => {
        if (event.code === "Escape") listener(event);
    };

    window.addEventListener("keydown", wrapper);

    return () => window.removeEventListener("keydown", wrapper);
};

// Generic helper to register a keydown listener for specific key codes or
// key characters. `codes` can be an array like ["KeyE", "e"] or a
// single string. Returns a remover function.
export const addKeyListener = (
    codes: string | string[],
    listener: (event: KeyboardEvent) => void,
): (() => void) => {
    const set = Array.isArray(codes) ? codes : [codes];

    const wrapper = (event: KeyboardEvent): void => {
        const code = event.code || "";
        const key = (event.key || "").toLowerCase();

        for (const c of set) {
            if (c.length === 1) {
                if (key === c.toLowerCase()) {
                    listener(event);
                    return;
                }
            } else if (c === code) {
                listener(event);
                return;
            }
        }
    };

    window.addEventListener("keydown", wrapper);

    return () => window.removeEventListener("keydown", wrapper);
};

export const waitForEnter = (soundToPlay?: string): Promise<void> => {
    return new Promise((resolve) => {
        const listener = (event: KeyboardEvent): void => {
            playTune(SFX_KB);
            if (event.code === "Enter") {
                if (soundToPlay) {
                    playTune(soundToPlay);
                }
                window.removeEventListener("keydown", listener);
                resolve();
            }
        };

        window.addEventListener("keydown", listener);
    });
};

export const getKeys = (): Keys => keys;
