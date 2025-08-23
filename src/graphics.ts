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

export const canvas = document.querySelector("canvas") as HTMLCanvasElement;

export const cx: CanvasRenderingContext2D = canvas.getContext("2d")!;

export const clearCanvas = (color: string = "black"): void => {
    cx.save();
    cx.fillStyle = color;
    cx.fillRect(0, 0, canvas.width, canvas.height);
    cx.restore();
};

export function drawFarObject(): void {
    // Draw house base
    cx.fillStyle = "#deb887";
    cx.fillRect(
        canvas.width * 0.3,
        canvas.height * 0.5,
        canvas.width * 0.25,
        canvas.height * 0.2,
    );

    // Draw roof
    cx.beginPath();
    cx.moveTo(canvas.width * 0.28, canvas.height * 0.5);
    cx.lineTo(canvas.width * 0.425, canvas.height * 0.38);
    cx.lineTo(canvas.width * 0.55, canvas.height * 0.5);
    cx.closePath();
    cx.fillStyle = "#8b0000";
    cx.fill();

    // Draw door
    cx.fillStyle = "#654321";
    cx.fillRect(
        canvas.width * 0.41,
        canvas.height * 0.62,
        canvas.width * 0.06,
        canvas.height * 0.08,
    );

    // Draw window
    cx.fillStyle = "#add8e6";
    cx.fillRect(
        canvas.width * 0.33,
        canvas.height * 0.56,
        canvas.width * 0.06,
        canvas.height * 0.06,
    );

    // Draw tree trunk
    cx.fillStyle = "#8b5a2b";
    cx.fillRect(
        canvas.width * 0.7,
        canvas.height * 0.6,
        canvas.width * 0.03,
        canvas.height * 0.1,
    );

    // Draw tree foliage
    cx.beginPath();
    cx.arc(
        canvas.width * 0.715,
        canvas.height * 0.58,
        canvas.width * 0.05,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#228b22";
    cx.fill();

    cx.restore();
}
