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

import type { TimeStep } from "./core/time/TimeStep";

export enum MouseAnimation {
    Stand,
    Walk,
}

export type MouseFacing =
    | "side"
    | "up"
    | "down"
    | "up-left"
    | "up-right"
    | "down-left"
    | "down-right";

const MOUSE_RENDER_WIDTH = 48;
const MOUSE_RENDER_HEIGHT = 28;
const MOUSE_ASPECT_RATIO = MOUSE_RENDER_WIDTH / MOUSE_RENDER_HEIGHT;

export function renderMouse(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    facing: MouseFacing,
    _anim: MouseAnimation,
    dir: number,
    step: number,
    lastSpeed: number,
    time: TimeStep,
) {
    const t = time.t,
        h = w / MOUSE_ASPECT_RATIO,
        PI2 = Math.PI * 2;
    ctx.save();
    ctx.translate(0, -h * 0.6);
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(facing === "side" ? dir : 1, 1);
    ctx.scale(w / MOUSE_RENDER_WIDTH, h / MOUSE_RENDER_HEIGHT);
    const mv = Math.min(1, lastSpeed * 0.8),
        bob = Math.sin(t / 220 + step * 2) * (1.5 * (0.4 + mv));
    ctx.translate(0, bob);

    const fse = (
        x: number,
        y: number,
        rx: number,
        ry: number,
        fill: string,
        stroke = "#dcdcdc",
    ) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, PI2);
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    };

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(
        0,
        h * (facing.startsWith("down") ? 0.7 : 0.5),
        w * 0.45,
        h * 0.24,
        0,
        0,
        PI2,
    );
    ctx.fill();
    ctx.restore();

    if (facing === "side") {
        renderSideView(ctx, t, step, mv, fse);
    } else if (facing.startsWith("up")) {
        renderUpView(ctx, t, step, mv, facing, fse);
    } else {
        renderDownView(ctx, t, step, mv, facing, fse);
    }

    ctx.restore();
}

function renderSideView(
    ctx: CanvasRenderingContext2D,
    t: number,
    step: number,
    mv: number,
    fse: (
        x: number,
        y: number,
        rx: number,
        ry: number,
        fill: string,
        stroke?: string,
    ) => void,
) {
    const PI2 = Math.PI * 2,
        bp = (x: number, y: number, rx: number, ry: number) => {
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, PI2);
        };

    ctx.save();
    const ts = Math.sin(t / 260 + step * 1.6) * (6 + mv * 4);
    ctx.strokeStyle = "#f0c2c2";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.bezierCurveTo(-28, 0, -40, ts * 0.4, -62, ts);
    ctx.stroke();
    ctx.restore();

    const legLift = (p: number) => Math.sin(step * 6 + p) * (2 * (0.3 + mv));
    ctx.fillStyle = "#ededed";
    ctx.strokeStyle = "#d7d7d7";
    bp(-8, 10 + legLift(0), 6, 3);
    ctx.fill();
    ctx.stroke();
    bp(10, 10 + legLift(Math.PI), 6, 3);
    ctx.fill();
    ctx.stroke();

    fse(0, 0, 18, 10, "#fff");

    ctx.save();
    const g = ctx.createRadialGradient(0, 4, 2, 0, 4, 18);
    g.addColorStop(0, "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    bp(0, 4, 14, 7);
    ctx.fill();
    ctx.restore();

    fse(14, -2, 9, 7, "#fff");
    fse(8, -10, 5, 5, "#ffe2e6");
    fse(8, -10, 3, 3, "#ffc8d0", "#eec3c9");

    const bpBlink = (t / 1400) % 1;
    let eo = 1;
    if (bpBlink < 0.06) eo = Math.max(0.15, 1 - bpBlink / 0.06);
    else if (bpBlink < 0.12) eo = Math.max(0.15, (bpBlink - 0.06) / 0.06);

    ctx.save();
    ctx.translate(18, -4);
    bp(0, 0, 1.8, 1.8 * eo);
    ctx.fillStyle = "#222";
    ctx.fill();
    if (eo > 0.3) {
        bp(-0.4, -0.5 * eo, 0.5, 0.35 * eo);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
    }
    ctx.restore();

    fse(22 + Math.sin(t / 120) * 0.6, -1, 1.6, 1.4, "#ff9aa9", "#ef8a99");

    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    [-2, 0, 2].forEach((wy, i) => {
        ctx.beginPath();
        ctx.moveTo(20, wy);
        ctx.lineTo(28, wy - 1 + i);
        ctx.stroke();
    });
    ctx.restore();
}

function renderUpView(
    ctx: CanvasRenderingContext2D,
    t: number,
    step: number,
    mv: number,
    facing: MouseFacing,
    fse: (
        x: number,
        y: number,
        rx: number,
        ry: number,
        fill: string,
        stroke?: string,
    ) => void,
) {
    const PI2 = Math.PI * 2,
        diag = facing === "up-left" || facing === "up-right",
        flip = facing.endsWith("left") ? -1 : 1,
        bp = (x: number, y: number, rx: number, ry: number) => {
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, PI2);
        };

    ctx.scale(flip, 1);

    // Tail
    ctx.save();
    const ts = Math.sin(t / 260 + step * 1.6) * (6 + mv * 4);
    ctx.strokeStyle = "#f0c2c2";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (!diag) {
        ctx.moveTo(0, 6);
        ctx.bezierCurveTo(4, 14, 2, 16 + ts, 0, 20 + ts);
    } else {
        ctx.moveTo(-2, 6);
        ctx.bezierCurveTo(-10, 12, -14, 14 + ts * 0.7, -20, 20 + ts);
    }
    ctx.stroke();
    ctx.restore();

    // Rear paws
    const legLift = (p: number) => Math.sin(step * 6 + p) * (1.5 * (0.3 + mv));
    ctx.fillStyle = "#ededed";
    ctx.strokeStyle = "#d7d7d7";
    if (!diag) {
        bp(-8, 8 + legLift(0), 5, 2.5);
        ctx.fill();
        ctx.stroke();
        bp(8, 8 + legLift(Math.PI), 5, 2.5);
        ctx.fill();
        ctx.stroke();
    } else {
        bp(6, 10 + legLift(0), 5.2, 2.6);
        ctx.fill();
        ctx.stroke();
        bp(-10, 9 + legLift(Math.PI), 4.2, 2.1);
        ctx.fill();
        ctx.stroke();
    }

    // Body
    fse(diag ? 1.5 : 0, 0, 18, 10, "#fff");

    if (!diag) {
        fse(-6, -14, 5, 5, "#ffe2e6");
        fse(-6, -14, 3, 3, "#ffc8d0", "#eec3c9");
        fse(6, -14, 5, 5, "#ffe2e6");
        fse(6, -14, 3, 3, "#ffc8d0", "#eec3c9");
        fse(0, -12, 9, 7, "#fff");
    } else {
        fse(-4, -15, 4.2, 4.2, "#ffe2e6");
        fse(-4, -15, 2.4, 2.4, "#ffc8d0", "#eec3c9");
        fse(4, -12, 9, 7, "#fff");
        fse(7.5, -14, 5.2, 5.2, "#ffe2e6");
        fse(7.5, -14, 3.1, 3.1, "#ffc8d0", "#eec3c9");
    }
}

function renderDownView(
    ctx: CanvasRenderingContext2D,
    t: number,
    step: number,
    mv: number,
    facing: MouseFacing,
    fse: (
        x: number,
        y: number,
        rx: number,
        ry: number,
        fill: string,
        stroke?: string,
    ) => void,
) {
    const PI2 = Math.PI * 2,
        diag = facing === "down-left" || facing === "down-right",
        flip = facing.endsWith("left") ? -1 : 1,
        bp = (x: number, y: number, rx: number, ry: number) => {
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, PI2);
        },
        legLift = (p: number) => Math.sin(step * 6 + p) * (1.5 * (0.3 + mv));

    ctx.scale(flip, 1);
    ctx.fillStyle = "#ededed";
    ctx.strokeStyle = "#d7d7d7";

    if (!diag) {
        bp(-8, 8 + legLift(0), 5, 2.5);
        ctx.fill();
        ctx.stroke();
        bp(8, 8 + legLift(Math.PI), 5, 2.5);
        ctx.fill();
        ctx.stroke();
        const fy = 8;
        bp(-7, fy + legLift(Math.PI), 4.5, 2.2);
        ctx.fill();
        ctx.stroke();
        bp(7, fy + legLift(0), 4.5, 2.2);
        ctx.fill();
        ctx.stroke();
    } else {
        bp(6, 7 + legLift(0), 5.2, 2.6);
        ctx.fill();
        ctx.stroke();
        bp(-8, 9 + legLift(Math.PI), 4.2, 2.1);
        ctx.fill();
        ctx.stroke();
        const fy = 8;
        bp(7.5, fy + legLift(0), 4.9, 2.4);
        ctx.fill();
        ctx.stroke();
        bp(-8.5, fy + legLift(Math.PI), 4.1, 2);
        ctx.fill();
        ctx.stroke();
    }

    fse(diag ? 1.5 : 0, 0, 18, 10, "#fff");

    ctx.save();
    const g = ctx.createRadialGradient(0, 4, 2, 0, 4, 18);
    g.addColorStop(0, "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    bp(0, 4, 14, 7);
    ctx.fill();
    ctx.restore();

    const hy = 12,
        hx = diag ? 3.5 : 0;
    fse(hx - 6, hy - 6, 5, 5, "#ffe2e6");
    fse(hx - 6, hy - 6, 3, 3, "#ffc8d0", "#eec3c9");
    fse(hx + 6, hy - 6, 5, 5, "#ffe2e6");
    fse(hx + 6, hy - 6, 3, 3, "#ffc8d0", "#eec3c9");
    fse(hx, hy, 9, 7, "#fff");

    const bpBlink = (t / 1400) % 1;
    let eo = 1;
    if (bpBlink < 0.06) eo = Math.max(0.15, 1 - bpBlink / 0.06);
    else if (bpBlink < 0.12) eo = Math.max(0.15, (bpBlink - 0.06) / 0.06);

    ctx.fillStyle = "#222";
    if (!diag) {
        bp(hx - 3.2, hy - 2, 1.6, 1.6 * eo);
        ctx.fill();
        bp(hx + 3.2, hy - 2, 1.6, 1.6 * eo);
        ctx.fill();
        if (eo > 0.3) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            bp(hx - 3.7, hy - 2.6 * eo, 0.4, 0.3 * eo);
            ctx.fill();
            bp(hx + 2.7, hy - 2.6 * eo, 0.4, 0.3 * eo);
            ctx.fill();
        }
    } else {
        bp(hx - 2.6, hy - 2.1, 1.3, 1.3 * eo);
        ctx.fill();
        bp(hx + 3.8, hy - 1.9, 1.8, 1.8 * eo);
        ctx.fill();
        if (eo > 0.3) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            bp(hx - 3, hy - 2.4 * eo, 0.35, 0.25 * eo);
            ctx.fill();
            ctx.beginPath(); // near highlight path start
        }
    }

    fse(hx + Math.sin(t / 120) * 0.6, hy + 6, 1.6, 1.4, "#ff9aa9", "#ef8a99");

    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    [-1.5, 0, 1.5]
        .map((d) => d + hy + 6)
        .forEach((wy, i) => {
            ctx.beginPath();
            ctx.moveTo(hx - 2, wy);
            ctx.lineTo(hx - 10, wy - 1 + i);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(hx + 2, wy);
            ctx.lineTo(hx + 10, wy - 1 + i);
            ctx.stroke();
        });
    ctx.restore();
}
