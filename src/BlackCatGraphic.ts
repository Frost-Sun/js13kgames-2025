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

export function renderBlackCat(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w = 48,
    h = 64,
    opt?: { eyeOpen?: number },
) {
    const PI2 = Math.PI * 2,
        bp = (x: number, y: number, rx: number, ry: number) => {
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, PI2);
        };

    ctx.save();
    ctx.translate(x, y);

    // Body
    bp(w / 2, h * 0.7, w * 0.35, h * 0.28);
    ctx.fillStyle = "#000";
    ctx.fill();

    // Ears
    const ey = h * 0.08,
        ew = w * 0.16,
        eh = h * 0.18,
        ear = (ex: number) => {
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - ew / 2, ey + eh);
            ctx.lineTo(ex + ew / 2, ey + eh);
            ctx.closePath();
            ctx.fill();
        };
    ctx.fillStyle = "#000";
    ear(w * 0.32);
    ear(w * 0.68);

    // Head
    bp(w / 2, h * 0.35, w * 0.28, h * 0.22);
    ctx.fill();

    // Eyes
    const eo = opt?.eyeOpen ?? 1;
    ctx.save();
    ctx.translate(w / 2, h * 0.37);
    [-w * 0.09, w * 0.09].forEach((dx) => {
        bp(dx, 0, w * 0.07, w * 0.04 * eo);
        ctx.fillStyle = "#fff";
        ctx.fill();
        bp(dx, 0, w * 0.06, w * 0.03 * eo);
        ctx.fillStyle = "green";
        ctx.fill();
        bp(dx, 0, w * 0.025, w * 0.018 * eo);
        ctx.fillStyle = "#181818";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx - w * 0.02, -w * 0.01, w * 0.01, 0, PI2);
        ctx.fillStyle = "#fff";
        ctx.fill();
    });
    ctx.restore();

    // Nose
    bp(w / 2, h * 0.42, w * 0.018, w * 0.012);
    ctx.fillStyle = "#e6d6e6";
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = "#e6d6e6";
    ctx.lineWidth = 1;
    const offs = [-12, 0, 12],
        lx = w / 2 - 38,
        rx = w / 2 + 38,
        wy = h * 0.46;
    offs.forEach((dy) => {
        [-6, 0, 6].forEach((wi) => {
            ctx.beginPath();
            ctx.moveTo(lx, wy + dy + wi);
            ctx.bezierCurveTo(
                lx - w * 0.16,
                wy + dy - 6 + wi,
                lx - w * 0.39,
                wy + dy - 36 + wi,
                lx - w * 0.54,
                wy + dy - 28 + wi,
            );
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rx, wy + dy + wi);
            ctx.bezierCurveTo(
                rx + w * 0.16,
                wy + dy - 6 + wi,
                rx + w * 0.39,
                wy + dy - 36 + wi,
                rx + w * 0.54,
                wy + dy - 28 + wi,
            );
            ctx.stroke();
        });
    });

    // Tail
    ctx.beginPath();
    ctx.moveTo(w * 0.85, h * 0.7);
    ctx.bezierCurveTo(w * 1.05, h * 0.6, w * 0.95, h * 0.95, w * 0.7, h * 0.95);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 24;
    ctx.stroke();

    ctx.restore();
}
