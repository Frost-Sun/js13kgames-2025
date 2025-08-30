export type BlackCatFacing =
    | "side"
    | "up"
    | "down"
    | "up-left"
    | "up-right"
    | "down-left"
    | "down-right";

import type { TimeStep } from "./core/time/TimeStep";

const CAT_ASPECT_RATIO = 3 / 4;

export function renderBlackCat(
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    facing: BlackCatFacing,
    eyesOpen: boolean,
    dir: number,
    step: number,
    lastSpeed: number,
    time: TimeStep,
) {
    const t = time.t;
    const height = width / CAT_ASPECT_RATIO;

    cx.save();

    // For a pseudo-3D effect, the bounding box should be
    // on the ground and the figure "rise" from there.
    cx.translate(0, -height * 0.7);

    // Centered transform; flip only for side pose; subtle bob when moving
    cx.translate(x + width / 2, y + height / 2);
    cx.scale(facing === "side" ? dir : 1, 1);

    const moveFactor = Math.min(1, lastSpeed * 0.8);
    const bob =
        Math.sin(t / 220 + step * 2.0) * (height * 0.05 * (0.4 + moveFactor));
    cx.translate(0, bob);

    // Body
    cx.beginPath();
    cx.ellipse(0, height * 0.2, width * 0.35, height * 0.28, 0, 0, Math.PI * 2);
    cx.fillStyle = "#181818";
    cx.fill();

    // Head
    cx.beginPath();
    cx.ellipse(
        0,
        -height * 0.18,
        width * 0.28,
        height * 0.22,
        0,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#181818";
    cx.fill();

    // Ears
    const earY = -height * 0.5;
    const earW = width * 0.16;
    const earH = height * 0.18;
    // Left ear
    cx.beginPath();
    cx.moveTo(-width * 0.13, earY);
    cx.lineTo(-width * 0.13 - earW / 2, earY + earH);
    cx.lineTo(-width * 0.13 + earW / 2, earY + earH);
    cx.closePath();
    cx.fillStyle = "#181818";
    cx.fill();
    // Right ear
    cx.beginPath();
    cx.moveTo(width * 0.13, earY);
    cx.lineTo(width * 0.13 - earW / 2, earY + earH);
    cx.lineTo(width * 0.13 + earW / 2, earY + earH);
    cx.closePath();
    cx.fillStyle = "#181818";
    cx.fill();

    // Eyes
    const eyeOpenRatio = eyesOpen ? 1 : 0.7;
    cx.save();
    cx.translate(0, -height * 0.15);
    for (const dx of [-width * 0.09, width * 0.09]) {
        cx.beginPath();
        cx.ellipse(
            dx,
            0,
            width * 0.07,
            width * 0.04 * eyeOpenRatio,
            0,
            0,
            Math.PI * 2,
        );
        cx.fillStyle = "#fff";
        cx.fill();
        cx.beginPath();
        cx.ellipse(
            dx,
            0,
            width * 0.06,
            width * 0.03 * eyeOpenRatio,
            0,
            0,
            Math.PI * 2,
        );
        cx.fillStyle = "#e6d6e6";
        cx.fill();
        // Pupils
        cx.beginPath();
        cx.ellipse(
            dx,
            0,
            width * 0.025,
            width * 0.018 * eyeOpenRatio,
            0,
            0,
            Math.PI * 2,
        );
        cx.fillStyle = "#181818";
        cx.fill();
        // Eye highlight
        cx.beginPath();
        cx.arc(dx - width * 0.02, -width * 0.01, width * 0.01, 0, Math.PI * 2);
        cx.fillStyle = "#fff";
        cx.fill();
    }
    cx.restore();

    // Nose
    cx.beginPath();
    cx.moveTo(-width * 0.015, -height * 0.09);
    cx.lineTo(width * 0.015, -height * 0.09);
    cx.lineTo(0, -height * 0.06);
    cx.closePath();
    cx.fillStyle = "#e6d6e6";
    cx.fill();

    cx.restore();
}
