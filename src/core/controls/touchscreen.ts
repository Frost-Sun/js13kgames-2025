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
import { type Area, includesPoint } from "../math/Area";
import { type VectorMutable } from "../math/Vector";
import { setCanvasPositionFromScreenPosition } from "../platform/window";

export const hasTouchScreen = "ontouchstart" in window;

export const initializeTouchscreen = (): void => {
    if (!hasTouchScreen) {
        return;
    }

    // Note: for preventing double-tap, also if the touch
    // is outside the canvas, this should be added to the CSS:
    //
    // * {
    //     touch-action: none;
    // }

    // Prevent a context menu, also when a long tap is done
    // outside of canvas.
    window.oncontextmenu = (e): void => {
        e.preventDefault();
    };
};

export const listenTouch = (
    button: HTMLButtonElement,
    setTouch: (isTouching: boolean) => void,
): void => {
    const handleTouch = (event: TouchEvent) => {
        event.preventDefault();
        const touch = event.targetTouches[0];
        setTouch(touch != null);
    };

    const handleEnd = (event: TouchEvent) => {
        event.preventDefault();
        setTouch(false);
    };

    button.addEventListener("touchstart", handleTouch);
    button.addEventListener("touchmove", handleTouch);
    button.addEventListener("touchend", handleEnd);
};

export const waitForTap = (
    canvas: HTMLCanvasElement,
    area?: Area,
    soundToPlay?: string,
): Promise<void> => {
    return new Promise((resolve) => {
        const listener = (e: TouchEvent): void => {
            // Prevent default behavior if the touch is on the canvas
            e.preventDefault();

            // Use changedTouches for touchend/touchstart to get the specific touch point
            const touch = e.changedTouches[0];
            if (!touch) return; // Exit if no touch information is available

            playTune(SFX_KB);

            const point: VectorMutable = { x: 0, y: 0 };

            setCanvasPositionFromScreenPosition(canvas, point, touch);

            if (!area || includesPoint(area, point)) {
                canvas.removeEventListener("touchstart", listener);

                // Play sound if specified
                if (soundToPlay !== undefined) {
                    try {
                        console.log(`Playing sound ID: ${soundToPlay}`);
                        playTune(soundToPlay);
                    } catch (err) {
                        console.error("Error playing sound:", err);
                    }
                }

                resolve();
            }
        };

        canvas.addEventListener("touchstart", listener, { passive: false });
    });
};
