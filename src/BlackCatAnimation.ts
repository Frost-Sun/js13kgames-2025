/*
 * Copyright (c) 2025 Tero Jäntti, Sami Heikkinen
    }
    // slightly amplify rotations for visibility
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

// Tuple type for renderBlackCat arguments (excluding cx)
export type BlackCatRenderProps = [
    x: number,
    y: number,
    width: number,
    facing: BlackCatFacing,
    eyesOpen: boolean,
    dir: number,
    step: number,
    lastSpeed: number,
    time: TimeStep,
    riseLevel?: 0 | 1 | 2,
];

export type BlackCatFacing =
    | "side"
    | "up"
    | "down"
    | "up-left"
    | "up-right"
    | "down-left"
    | "down-right";

import type { TimeStep } from "./core/time/TimeStep";
import { cx } from "./graphics";

export const CAT_ASPECT_RATIO = 3 / 4;

// Draws a cat eye at (x, y) with open/closed state
export function renderCatEye(
    x: number,
    y: number,
    width: number,
    open: boolean | number,
    pupilOffsetX = 0,
    pupilOffsetY = 0,
) {
    // open: true/false or 0..1 (0 = shut, 1 = open, 0.2 = almost shut)
    let eo = 1;
    if (typeof open === "number") eo = open;
    else eo = open ? 1 : 0.1;
    // Iris
    cx.beginPath();
    cx.ellipse(x, y, width * 0.07, width * 0.035 * eo, 0, 0, Math.PI * 2);
    cx.fillStyle = "green";
    cx.fill();
    // Pupil (slightly offset inside the iris for gaze)
    cx.beginPath();
    cx.ellipse(
        x + pupilOffsetX,
        y + pupilOffsetY,
        width * 0.03,
        width * 0.02 * eo,
        0,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#181818";
    cx.fill();
    // Eye highlight only if eye is open enough; scale highlight by openness so
    // partially closed eyes don't show an oversized bright spot.
    if (eo > 0.5) {
        const hlScale = eo; // 0.5..1 -> scale highlight accordingly
        const hlOffsetX = width * 0.025 * hlScale;
        const hlOffsetY = width * 0.012 * hlScale;
        const hlRadius = width * 0.015 * hlScale;
        cx.beginPath();
        cx.arc(
            x + pupilOffsetX - hlOffsetX,
            y + pupilOffsetY - hlOffsetY,
            hlRadius,
            0,
            Math.PI * 2,
        );
        cx.fillStyle = "#fff";
        cx.fill();
    }
}

function renderWhiskers(
    mode: "side" | "down" | "up",
    width: number,
    h: number,
    bias = 0,
    horizontalShift = 0,
) {
    // make whiskers more visible: slightly brighter and thicker per mode
    const baseLineWidth = Math.max(0.1, width * 0.012);
    let modeMultiplier = 1;
    if (mode === "up") modeMultiplier = 1.6;
    else if (mode === "side") modeMultiplier = 1.4;
    else if (mode === "down") modeMultiplier = 1.2;
    cx.strokeStyle = "#f0d6de";
    cx.lineWidth = baseLineWidth * modeMultiplier;
    const wl = width * 0.18,
        ws = width * 0.04;
    const shiftX = horizontalShift || 0;
    // make the inward pull stronger for large shifts but cap it relative to width
    const shiftAdj = Math.min(Math.abs(shiftX) * 1.1, width * 0.06);
    // shiftAdj will shorten endpoints when the face/eyes are shifted
    if (mode === "side") {
        // align side whiskers with eye vertical position
        const base = -h * 0.18;
        [-1, 0, 1].forEach((row) => {
            const wy = base + row * ws;
            cx.beginPath();
            // start a bit further right to match profile nose/eye spacing
            cx.moveTo(width * 0.16, wy);
            const rightEndX = width * 0.36 + bias - shiftAdj;
            // ensure right whisker isn't longer than a symmetric baseline
            const maxRight = Math.abs(width * 0.36);
            const clampedRightEndX = Math.min(rightEndX, maxRight);
            cx.bezierCurveTo(
                width * 0.22,
                wy + wl * 0.1,
                width * 0.32 + bias * 0.6,
                wy + wl * 0.3,
                clampedRightEndX,
                wy + wl * 0.2,
            );
            cx.stroke();
        });
    } else if (mode === "down") {
        // Use separate left/right biases so curves always arc outward rather than folding
        const base = -h * 0.1;
        const leftBias = -Math.abs(bias);
        const rightBias = Math.abs(bias);
        [-1, 0, 1].forEach((row) => {
            const wy = base + row * ws;
            // left
            // compute a symmetric base magnitude and bias it slightly towards the facing
            const baseMag = width * 0.38;
            const baseAdj = baseMag - shiftAdj;
            const biasDelta = Math.abs(bias) * width * 0.01; // small bias-based offset
            let leftEndX = -baseAdj;
            cx.beginPath();
            cx.moveTo(-width * 0.13, wy);
            cx.bezierCurveTo(
                -width * 0.22,
                wy + wl * 0.1,
                -width * 0.32 + leftBias * 0.35,
                wy + wl * 0.3,
                leftEndX,
                wy + wl * 0.2,
            );
            cx.stroke();
            // right
            let rightEndX = baseAdj;
            // bias the pair: if bias positive, favor right; otherwise favor left
            if (bias > 0) {
                rightEndX = baseAdj + biasDelta;
                leftEndX = -(baseAdj - biasDelta);
            } else if (bias < 0) {
                leftEndX = -(baseAdj + biasDelta);
                rightEndX = baseAdj - biasDelta;
            }
            cx.beginPath();
            cx.moveTo(width * 0.13, wy);
            cx.bezierCurveTo(
                width * 0.22,
                wy + wl * 0.1,
                width * 0.32 + rightBias * 0.6,
                wy + wl * 0.3,
                rightEndX,
                wy + wl * 0.2,
            );
            cx.stroke();
        });
    } else if (mode === "up") {
        const base = -h * 0.22;
        [-1, 0, 1].forEach((row) => {
            const wy = base + row * ws;
            // left
            // compute base magnitude and bias it toward facing side
            const upBaseMag = width * 0.36;
            const upBaseAdj = upBaseMag - shiftAdj;
            const upBiasDelta = Math.abs(bias) * width * 0.01;
            let upLeftEndX = -upBaseAdj;
            cx.beginPath();
            cx.moveTo(-width * 0.1, wy);
            cx.bezierCurveTo(
                -width * 0.18,
                wy - wl * 0.05,
                -width * 0.28 + bias * 0.35,
                wy - wl * 0.12,
                upLeftEndX,
                wy - wl * 0.08,
            );
            cx.stroke();
            // right
            let upRightEndX = upBaseAdj;
            if (bias > 0) {
                upRightEndX = upBaseAdj + upBiasDelta;
                upLeftEndX = -(upBaseAdj - upBiasDelta);
            } else if (bias < 0) {
                upLeftEndX = -(upBaseAdj + upBiasDelta);
                upRightEndX = upBaseAdj - upBiasDelta;
            }
            cx.beginPath();
            cx.moveTo(width * 0.1, wy);
            cx.bezierCurveTo(
                width * 0.18,
                wy - wl * 0.05,
                width * 0.28 + bias * 0.6,
                wy - wl * 0.12,
                upRightEndX,
                wy - wl * 0.08,
            );
            cx.stroke();
        });
    }
}

// riseLevel: 0 = low, 1 = mid, 2 = high to jump next
export function renderBlackCat(
    x: number,
    y: number,
    width: number,
    facing: BlackCatFacing,
    eyesOpen: boolean,
    dir: number,
    step: number,
    lastSpeed: number,
    time: TimeStep,
    riseLevel: 0 | 1 | 2 = 0,
) {
    cx.save();

    const t = time.t,
        h = width / CAT_ASPECT_RATIO;

    // Shadow
    cx.fillStyle = "rgba(0,0,0,0.20)";
    cx.beginPath();
    cx.ellipse(
        x + width / 2,
        y + h / 2 + h * 0.5 - h,
        width * 0.45,
        h * 0.24,
        0,
        0,
        Math.PI * 2,
    );
    cx.fill();

    // Animate cat eyes: flash (blink) like mouse
    // Cat blink: less frequent, eyes shut for a short period
    // eyesOpen: boolean, if false, max open-ness is half-shut (0.2)
    // During blink, eyes are almost fully shut (0.05)
    let catEyesOpen = eyesOpen ? 1 : 0.6;
    if (eyesOpen) {
        // Blink every ~3 seconds, eyes closed for 120ms
        const blinkCycle = 3000; // ms
        const blinkDuration = 120; // ms
        const blinkTime = time.t % blinkCycle;
        if (blinkTime < blinkDuration) {
            catEyesOpen = 0.1;
        }
    }

    // Rising to fence
    const amp = h * 0.005;
    let riseY = 0;
    if (riseLevel === 0) {
        riseY = Math.min(Math.sin(t / 400) * (h * 0.0002), 0); // only allow nearly invisible downward movement
    } else if (riseLevel === 1) {
        riseY = -h * 0.25 + Math.sin(t / 400) * amp;
        riseY = Math.max(riseY, -h * 0.248);
    } else if (riseLevel === 2) {
        // Jump up quickly (0.3s), then stay above the screen
        const jumpDuration = 150; // ms
        // You must provide a reference time for when riseLevel became 2 for a true one-shot jump.
        // For now, if time.t is reset on riseLevel change, this works:
        if (time.t > jumpDuration) {
            riseY = -h * 2;
        } else {
            const progress = Math.min(time.t / jumpDuration, 1);
            // Ease out: fast at first, slow at end
            const ease = 1 - Math.pow(1 - progress, 2);
            riseY = -h * 0.45 - ease * (h * 1.55);
        }
    }
    const baseYOffset = -h * 0.5;
    cx.translate(0, baseYOffset + riseY);
    cx.translate(x + width / 2, y + h * 0.1);
    cx.scale(facing === "side" ? dir : 1, 1);
    cx.translate(
        0,
        Math.sin(t / 220 + step * 2.0) *
            (h * 0.05 * (0.4 + Math.min(1, lastSpeed * 0.8))),
    );
    // Small facing offsets for diagonals and up/down to give simple animation
    // Increase horizontal offset so the whole face (eyes, nose, whiskers) moves more to the side
    let faceOffsetX = 0,
        faceOffsetY = 0;
    if (facing === "up") faceOffsetY = -h * 0.05;
    if (facing === "down") faceOffsetY = h * 0.02;
    if (facing.endsWith("-left")) faceOffsetX = -width * 0.1;
    else if (facing.endsWith("-right")) faceOffsetX = width * 0.1;
    else if (facing === "side")
        faceOffsetX = dir > 0 ? width * 0.1 : -width * 0.1;
    cx.translate(faceOffsetX, faceOffsetY);
    // Body
    cx.beginPath();
    cx.ellipse(0, h * 0.2, width * 0.35, h * 0.28, 0, 0, Math.PI * 2);
    cx.fillStyle = "#000";
    cx.fill();
    // Facing-specific small shifts and ear rotations (moved earlier so whiskers can use eyeShiftX)
    let eyeShiftX = 0,
        eyeShiftY = 0,
        noseShiftX = 0,
        noseShiftY = 0,
        earLeftRot = 0,
        earRightRot = 0;
    switch (facing) {
        case "up":
            eyeShiftY = -h * 0.03;
            noseShiftY = -h * 0.03;
            earLeftRot = -0.12;
            earRightRot = 0.12;
            break;
        case "down":
            eyeShiftY = h * 0.02;
            noseShiftY = h * 0.02;
            earLeftRot = 0.04;
            earRightRot = -0.04;
            break;
        case "up-left":
            eyeShiftX = -width * 0.04;
            eyeShiftY = -h * 0.04;
            noseShiftX = eyeShiftX;
            noseShiftY = -h * 0.03;
            earLeftRot = -0.22;
            earRightRot = 0.08;
            break;
        case "up-right":
            eyeShiftX = width * 0.04;
            eyeShiftY = -h * 0.04;
            // keep nose roughly centered between the two eyes
            noseShiftX = eyeShiftX;
            // match vertical nose offset of plain "up"
            noseShiftY = -h * 0.03;
            earLeftRot = -0.08;
            earRightRot = 0.22;
            break;
        case "down-left":
            eyeShiftX = -width * 0.03;
            eyeShiftY = h * 0.02;
            // keep nose centered between the two eyes
            noseShiftX = eyeShiftX;
            // match vertical nose offset of plain "down"
            noseShiftY = h * 0.02;
            earLeftRot = -0.08;
            earRightRot = 0.04;
            break;
        case "down-right":
            eyeShiftX = width * 0.03;
            eyeShiftY = h * 0.02;
            // keep nose centered between the two eyes
            noseShiftX = eyeShiftX;
            // match vertical nose offset of plain "down"
            noseShiftY = h * 0.02;
            earLeftRot = -0.04;
            earRightRot = 0.08;
            break;
        case "side":
        default:
            earLeftRot = -0.04 * dir;
            earRightRot = 0.04 * dir;
    }
    // Whiskers behind head when looking up (draw before head so they appear behind)
    if (facing.includes("up")) {
        cx.save();
        cx.globalAlpha = 1;
        cx.shadowColor = "rgba(0,0,0,0)";
        cx.shadowBlur = 0;
        renderWhiskers(
            "up",
            width,
            h,
            facing.includes("right") ? 2.4 : facing.includes("left") ? -2.4 : 0,
            faceOffsetX + eyeShiftX,
        );
        cx.restore();
    }
    // Head (force opaque, no shadow in case canvas state outside set alpha/shadow)
    cx.save();
    cx.globalAlpha = 1;
    cx.shadowColor = "rgba(0,0,0,0)";
    cx.shadowBlur = 0;
    cx.beginPath();
    cx.ellipse(0, -h * 0.18, width * 0.28, h * 0.22, 0, 0, Math.PI * 2);
    cx.fill();
    cx.restore();
    // Ears
    const earY = -h * 0.5,
        earW = width * 0.16,
        earH = h * 0.18;
    // slightly amplify rotations for visibility
    earLeftRot *= 1.4;
    earRightRot *= 1.4;
    if (facing === "side") {
        // Eye (profile) - apply facing-specific small shifts
        renderCatEye(
            width * 0.19 + eyeShiftX,
            -h * 0.18 + eyeShiftY,
            width,
            catEyesOpen,
        );
        // Ears (two, with small rotations)
        [
            [width * 0.03, earW * 0.7, earH * 0.7, 0.1, earLeftRot],
            [width * 0.13, earW, earH, 0, earRightRot],
        ].forEach(([ex, ew, eh, yoff, rot]) => {
            // draw ear relative to its tip so rotation looks natural
            cx.save();
            cx.translate(ex, earY + eh * yoff);
            cx.rotate(rot || 0);
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.lineTo(ew / 2, eh);
            cx.lineTo(-ew / 2, eh);
            cx.closePath();
            cx.fillStyle = "#000";
            cx.fill();
            cx.restore();
        });

        // Nose - apply facing-specific shift
        cx.fillStyle = "#e68686";
        cx.beginPath();
        cx.ellipse(
            width * 0.28 + noseShiftX,
            -h * 0.11 + noseShiftY,
            width * 0.018,
            h * 0.012,
            0,
            0,
            Math.PI * 2,
        );
        cx.fill();

        // Whiskers (right only) - use dir to determine left/right for side-facing
        renderWhiskers(
            "side",
            width,
            h,
            dir > 0 ? 2.6 : -2.6,
            faceOffsetX + eyeShiftX,
        );
    } else {
        // Ears for non-side facings - apply small rotations
        [
            [-width * 0.13, -1, earLeftRot],
            [width * 0.13, 1, earRightRot],
        ].forEach(([ex, sign, rot]) => {
            cx.save();
            cx.translate(ex, earY);
            cx.rotate(rot || 0);
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.lineTo(-sign * (earW / 2), earH);
            cx.lineTo(sign * (earW / 2), earH);
            cx.closePath();
            cx.fillStyle = "#000";
            cx.fill();
            cx.restore();
        });
    }
    // Tail
    const tailStartX = -width * 0.33,
        tailStartY = h * 0.2,
        tailThickness = width * 0.07,
        tailEndX = tailStartX + width * 0.22,
        tailEndY = tailStartY + h * 0.32,
        ctrl1X = tailStartX - width * 0.2,
        ctrl1Y = tailStartY - h * 0.1,
        ctrl2X = tailStartX - width * 0.1,
        ctrl2Y = tailStartY + h * 0.25;
    cx.beginPath();
    cx.moveTo(tailStartX, tailStartY);
    cx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, tailEndX, tailEndY);
    cx.strokeStyle = "#000";
    cx.lineWidth = tailThickness;
    cx.stroke();
    cx.beginPath();
    cx.arc(tailEndX, tailEndY, tailThickness / 2, 0, Math.PI * 2);
    cx.fillStyle = "#000";
    cx.fill();
    if (facing.includes("down")) {
        cx.save();
        cx.translate(0, -h * 0.18);
        [-width * 0.09, width * 0.09].forEach((dx) =>
            renderCatEye(dx + eyeShiftX, 0 + eyeShiftY, width, catEyesOpen),
        );
        cx.restore();
        // Nose
        cx.beginPath();
        cx.ellipse(
            noseShiftX,
            -h * 0.11 + noseShiftY,
            width * 0.018,
            h * 0.012,
            0,
            0,
            Math.PI * 2,
        );
        cx.fillStyle = "#e68686";
        cx.fill();
        // Whiskers (both sides) - translate by eyeShiftX so whiskers follow eye horizontal offset
        cx.save();
        cx.translate(eyeShiftX, 0);
        renderWhiskers(
            "down",
            width,
            h,
            facing.includes("right") ? 3.2 : facing.includes("left") ? -3.2 : 0,
            faceOffsetX + eyeShiftX,
        );
        cx.restore();
    }

    cx.restore();
}
