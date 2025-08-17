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

export function renderMouse(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    facing: MouseFacing,
    _animation: MouseAnimation,
    dir: number,
    step: number,
    lastSpeed: number,
    time: TimeStep,
): void {
    const t = time.t;

    context.save();

    // Centered transform; flip only for side pose; subtle bob when moving
    context.translate(x + width / 2, y + height / 2);
    context.scale(facing === "side" ? dir : 1, 1);

    const moveFactor = Math.min(1, lastSpeed * 0.8);
    const bob = Math.sin(t / 220 + step * 2.0) * (1.5 * (0.4 + moveFactor));
    context.translate(0, bob);

    // Helper to draw a filled + stroked ellipse
    const fillStrokeEllipse = (
        x: number,
        y: number,
        rx: number,
        ry: number,
        fill: string,
        stroke = "#dcdcdc",
    ) => {
        context.beginPath();
        context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        context.fillStyle = fill;
        context.fill();
        if (stroke) {
            context.strokeStyle = stroke;
            context.lineWidth = 1;
            context.stroke();
        }
    };

    // Common shadow
    context.save();
    context.globalAlpha = 0.18;
    context.fillStyle = "black";
    context.beginPath();
    context.ellipse(
        0,
        height * (facing.indexOf("down") === 0 ? 0.7 : 0.5),
        width * 0.45,
        height * 0.24,
        0,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();

    if (facing === "side") {
        renderSideView(
            context,
            width,
            height,
            t,
            step,
            moveFactor,
            fillStrokeEllipse,
        );
    } else if (facing.indexOf("up") === 0) {
        renderUpView(
            context,
            width,
            height,
            t,
            step,
            moveFactor,
            facing,
            fillStrokeEllipse,
        );
    } else {
        renderDownView(
            context,
            width,
            height,
            t,
            step,
            moveFactor,
            facing,
            fillStrokeEllipse,
        );
    }

    context.restore();
}

function renderSideView(
    context: CanvasRenderingContext2D,
    _width: number,
    _height: number,
    t: number,
    step: number,
    moveFactor: number,
    fillStrokeEllipse: (
        x: number,
        y: number,
        rx: number,
        ry: number,
        fill: string,
        stroke?: string,
    ) => void,
): void {
    // Tail sway
    context.save();
    const tailSway = Math.sin(t / 260 + step * 1.6) * (6 + moveFactor * 4);
    context.strokeStyle = "#f0c2c2";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-18, 2);
    context.bezierCurveTo(-28, 0, -40, tailSway * 0.4, -62, tailSway);
    context.stroke();
    context.restore();

    // Legs (simple step cycle)
    const legLift = (phase: number) =>
        Math.sin(step * 6 + phase) * (2.0 * (0.3 + moveFactor));
    context.fillStyle = "#ededed";
    context.strokeStyle = "#d7d7d7";

    // Back foot
    context.beginPath();
    context.ellipse(-8, 10 + legLift(0), 6, 3, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // Front foot
    context.beginPath();
    context.ellipse(10, 10 + legLift(Math.PI), 6, 3, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // Body
    fillStrokeEllipse(0, 0, 18, 10, "#ffffff");

    // Subtle belly shading
    context.save();
    const grad = context.createRadialGradient(0, 4, 2, 0, 4, 18);
    grad.addColorStop(0, "rgba(0,0,0,0.05)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = grad;
    context.beginPath();
    context.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Head (slightly forward and up)
    fillStrokeEllipse(14, -2, 9, 7, "#ffffff");

    // Ears (outer + inner)
    fillStrokeEllipse(8, -10, 5, 5, "#ffe2e6");
    fillStrokeEllipse(8, -10, 3, 3, "#ffc8d0", "#eec3c9");

    // Eye with blink
    const blinkPhase = (t / 1400) % 1; // 0..1
    let eyeOpen = 1;
    if (blinkPhase < 0.06) eyeOpen = Math.max(0.15, 1 - blinkPhase / 0.06);
    else if (blinkPhase < 0.12)
        eyeOpen = Math.max(0.15, (blinkPhase - 0.06) / 0.06);

    context.save();
    context.translate(18, -4);
    context.beginPath();
    context.ellipse(0, 0, 1.8, 1.8 * eyeOpen, 0, 0, Math.PI * 2);
    context.fillStyle = "#222";
    context.fill();
    // tiny eye highlight when open
    if (eyeOpen > 0.3) {
        context.beginPath();
        context.ellipse(
            -0.4,
            -0.5 * eyeOpen,
            0.5,
            0.35 * eyeOpen,
            0,
            0,
            Math.PI * 2,
        );
        context.fillStyle = "rgba(255,255,255,0.9)";
        context.fill();
    }
    context.restore();

    // Nose wiggle
    const noseWiggle = Math.sin(t / 120) * 0.6;
    fillStrokeEllipse(22 + noseWiggle, -1, 1.6, 1.4, "#ff9aa9", "#ef8a99");

    // Whiskers
    context.save();
    context.strokeStyle = "rgba(0,0,0,0.35)";
    context.lineWidth = 1;
    context.lineCap = "round";
    const whiskerY = [-2, 0, 2];
    for (let i = 0; i < whiskerY.length; i++) {
        const wy = whiskerY[i];
        context.beginPath();
        context.moveTo(20, wy);
        context.lineTo(28, wy - 1 + i); // three slight angles
        context.stroke();
    }
    context.restore();
}

function renderUpView(
    context: CanvasRenderingContext2D,
    _width: number,
    _height: number,
    t: number,
    step: number,
    moveFactor: number,
    facing: MouseFacing,
    fillStrokeEllipse: (
        x: number,
        y: number,
        rx: number,
        ry: number,
        fill: string,
        stroke?: string,
    ) => void,
): void {
    const isDiagonal = facing === "up-left" || facing === "up-right";
    const flip = facing.slice(-4) === "left" ? -1 : 1;
    context.scale(flip, 1);

    // Tail
    context.save();
    const tailSwayFB = Math.sin(t / 260 + step * 1.6) * (6 + moveFactor * 4);
    context.strokeStyle = "#f0c2c2";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.beginPath();
    if (!isDiagonal) {
        context.moveTo(0, 6);
        context.bezierCurveTo(4, 14, 2, 16 + tailSwayFB, 0, 20 + tailSwayFB);
    } else {
        context.moveTo(-2, 6);
        context.bezierCurveTo(
            -10,
            12,
            -14,
            14 + tailSwayFB * 0.7,
            -20,
            20 + tailSwayFB,
        );
    }
    context.stroke();
    context.restore();

    // Rear paws
    const legLiftFB = (phase: number) =>
        Math.sin(step * 6 + phase) * (1.5 * (0.3 + moveFactor));
    context.fillStyle = "#ededed";
    context.strokeStyle = "#d7d7d7";
    if (!isDiagonal) {
        context.beginPath();
        context.ellipse(-8, 8 + legLiftFB(0), 5, 2.5, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.beginPath();
        context.ellipse(8, 8 + legLiftFB(Math.PI), 5, 2.5, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
    } else {
        context.beginPath();
        context.ellipse(6, 10 + legLiftFB(0), 5.2, 2.6, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.beginPath();
        context.ellipse(
            -10,
            9 + legLiftFB(Math.PI),
            4.2,
            2.1,
            0,
            0,
            Math.PI * 2,
        );
        context.fill();
        context.stroke();
    }

    // Body
    fillStrokeEllipse(isDiagonal ? 1.5 : 0, 0, 18, 10, "#ffffff");

    if (!isDiagonal) {
        fillStrokeEllipse(-6, -14, 5, 5, "#ffe2e6");
        fillStrokeEllipse(-6, -14, 3, 3, "#ffc8d0", "#eec3c9");
        fillStrokeEllipse(6, -14, 5, 5, "#ffe2e6");
        fillStrokeEllipse(6, -14, 3, 3, "#ffc8d0", "#eec3c9");
        // Head
        fillStrokeEllipse(0, -12, 9, 7, "#ffffff");
    } else {
        // Far ear (smaller/higher)
        fillStrokeEllipse(-4, -15, 4.2, 4.2, "#ffe2e6");
        fillStrokeEllipse(-4, -15, 2.4, 2.4, "#ffc8d0", "#eec3c9");
        // Head
        fillStrokeEllipse(4, -12, 9, 7, "#ffffff");
        // Near ear (larger/lower)
        fillStrokeEllipse(7.5, -14, 5.2, 5.2, "#ffe2e6");
        fillStrokeEllipse(7.5, -14, 3.1, 3.1, "#ffc8d0", "#eec3c9");
    }
}

function renderDownView(
    context: CanvasRenderingContext2D,
    _width: number,
    _height: number,
    t: number,
    step: number,
    moveFactor: number,
    facing: MouseFacing,
    fillStrokeEllipse: (
        x: number,
        y: number,
        rx: number,
        ry: number,
        fill: string,
        stroke?: string,
    ) => void,
): void {
    const isDiagonal = facing === "down-left" || facing === "down-right";
    const flip = facing.slice(-4) === "left" ? -1 : 1;
    context.scale(flip, 1);

    // Legs: four little paws alternating
    const legLiftFB = (phase: number) =>
        Math.sin(step * 6 + phase) * (1.5 * (0.3 + moveFactor));
    context.fillStyle = "#ededed";
    context.strokeStyle = "#d7d7d7";

    if (!isDiagonal) {
        // Rear paws
        context.beginPath();
        context.ellipse(-8, 8 + legLiftFB(0), 5, 2.5, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.beginPath();
        context.ellipse(8, 8 + legLiftFB(Math.PI), 5, 2.5, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        // Front paws (closer to the head side)
        const frontY = 8;
        context.beginPath();
        context.ellipse(
            -7,
            frontY + legLiftFB(Math.PI),
            4.5,
            2.2,
            0,
            0,
            Math.PI * 2,
        );
        context.fill();
        context.stroke();
        context.beginPath();
        context.ellipse(7, frontY + legLiftFB(0), 4.5, 2.2, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
    } else {
        // Diagonal: near paws slightly larger/closer; far paws smaller/farther
        // Rear paws
        context.beginPath();
        context.ellipse(6, 7 + legLiftFB(0), 5.2, 2.6, 0, 0, Math.PI * 2); // near
        context.fill();
        context.stroke();
        context.beginPath();
        context.ellipse(
            -8,
            9 + legLiftFB(Math.PI),
            4.2,
            2.1,
            0,
            0,
            Math.PI * 2,
        ); // far
        context.fill();
        context.stroke();

        // Front paws
        const frontY = 8;
        context.beginPath();
        context.ellipse(
            7.5,
            frontY + legLiftFB(0),
            4.9,
            2.4,
            0,
            0,
            Math.PI * 2,
        ); // near
        context.fill();
        context.stroke();
        context.beginPath();
        context.ellipse(
            -8.5,
            frontY + legLiftFB(Math.PI),
            4.1,
            2.0,
            0,
            0,
            Math.PI * 2,
        ); // far
        context.fill();
        context.stroke();
    }

    // Body
    fillStrokeEllipse(isDiagonal ? 1.5 : 0, 0, 18, 10, "#ffffff");

    // Subtle belly shading
    context.save();
    const gradFB = context.createRadialGradient(0, 4, 2, 0, 4, 18);
    gradFB.addColorStop(0, "rgba(0,0,0,0.05)");
    gradFB.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradFB;
    context.beginPath();
    context.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Head/ears layering: far ear -> head -> near ear so both ears stay visible
    const headY = 12;
    const headX = isDiagonal ? 3.5 : 0;

    fillStrokeEllipse(headX - 6, headY - 6, 5, 5, "#ffe2e6");
    fillStrokeEllipse(headX - 6, headY - 6, 3, 3, "#ffc8d0", "#eec3c9");

    fillStrokeEllipse(headX + 6, headY - 6, 5, 5, "#ffe2e6");
    fillStrokeEllipse(headX + 6, headY - 6, 3, 3, "#ffc8d0", "#eec3c9");

    // Head at the leading side (bottom for down), slightly shifted for diagonal
    fillStrokeEllipse(headX, headY, 9, 7, "#ffffff");

    // Eyes with synced blink (near eye slightly larger on diagonals)
    const blinkPhase = (t / 1400) % 1;
    let eyeOpen = 1;
    if (blinkPhase < 0.06) eyeOpen = Math.max(0.15, 1 - blinkPhase / 0.06);
    else if (blinkPhase < 0.12)
        eyeOpen = Math.max(0.15, (blinkPhase - 0.06) / 0.06);

    context.fillStyle = "#222";
    if (!isDiagonal) {
        context.beginPath();
        context.ellipse(
            headX - 3.2,
            headY - 2,
            1.6,
            1.6 * eyeOpen,
            0,
            0,
            Math.PI * 2,
        );
        context.fill();
        context.beginPath();
        context.ellipse(
            headX + 3.2,
            headY - 2,
            1.6,
            1.6 * eyeOpen,
            0,
            0,
            Math.PI * 2,
        );
        context.fill();

        // tiny highlights when open
        if (eyeOpen > 0.3) {
            context.fillStyle = "rgba(255,255,255,0.9)";
            context.beginPath();
            context.ellipse(
                headX - 3.7,
                headY - 2.6 * eyeOpen,
                0.4,
                0.3 * eyeOpen,
                0,
                0,
                Math.PI * 2,
            );
            context.fill();
            context.beginPath();
            context.ellipse(
                headX + 2.7,
                headY - 2.6 * eyeOpen,
                0.4,
                0.3 * eyeOpen,
                0,
                0,
                Math.PI * 2,
            );
            context.fill();
        }
    } else {
        // Far eye (smaller)
        context.beginPath();
        context.ellipse(
            headX - 2.6,
            headY - 2.1,
            1.3,
            1.3 * eyeOpen,
            0,
            0,
            Math.PI * 2,
        );
        context.fill();
        // Near eye (larger)
        context.beginPath();
        context.ellipse(
            headX + 3.8,
            headY - 1.9,
            1.8,
            1.8 * eyeOpen,
            0,
            0,
            Math.PI * 2,
        );
        context.fill();

        if (eyeOpen > 0.3) {
            context.fillStyle = "rgba(255,255,255,0.9)";
            // Far highlight
            context.beginPath();
            context.ellipse(
                headX - 3.0,
                headY - 2.4 * eyeOpen,
                0.35,
                0.25 * eyeOpen,
                0,
                0,
                Math.PI * 2,
            );
            context.fill();
            // Near highlight
            context.beginPath();
        }
    }

    // Nose wiggle at the tip
    const noseWiggle = Math.sin(t / 120) * 0.6;
    const noseY = headY + 6;
    fillStrokeEllipse(
        headX + noseWiggle,
        noseY,
        1.6,
        1.4,
        "#ff9aa9",
        "#ef8a99",
    );

    // Whiskers (both sides)
    context.save();
    context.strokeStyle = "rgba(0,0,0,0.35)";
    context.lineWidth = 1;
    context.lineCap = "round";
    const whiskerY = [-1.5, 0, 1.5].map((d) => d + noseY);
    for (let i = 0; i < whiskerY.length; i++) {
        const wy = whiskerY[i];
        // left
        context.beginPath();
        context.moveTo(headX - 2, wy);
        context.lineTo(headX - 10, wy - 1 + i);
        context.stroke();
        // right
        context.beginPath();
        context.moveTo(headX + 2, wy);
        context.lineTo(headX + 10, wy - 1 + i);
        context.stroke();
    }
    context.restore();
}
