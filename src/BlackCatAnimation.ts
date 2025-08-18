export type BlackCatFacing =
    | "side"
    | "up"
    | "down"
    | "up-left"
    | "up-right"
    | "down-left"
    | "down-right";

export enum BlackCatAnimation {
    Stand,
    Walk,
}

import type { TimeStep } from "./core/time/TimeStep";

export function renderBlackCat(
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    facing: BlackCatFacing,
    animation: BlackCatAnimation,
    dir: number,
    step: number,
    lastSpeed: number,
    time: TimeStep,
) {
    const t = time.t;
    cx.save();

    // Centered transform; flip only for side pose; subtle bob when moving
    cx.translate(x + width / 2, y + height / 2);
    cx.scale(facing === "side" ? dir : 1, 1);

    const moveFactor = Math.min(1, lastSpeed * 0.8);
    const bob = Math.sin(t / 220 + step * 2.0) * (1.5 * (0.4 + moveFactor));
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
    const eyeOpen = animation === BlackCatAnimation.Walk ? 1 : 0.7;
    cx.save();
    cx.translate(0, -height * 0.15);
    for (const dx of [-width * 0.09, width * 0.09]) {
        cx.beginPath();
        cx.ellipse(
            dx,
            0,
            width * 0.07,
            width * 0.04 * eyeOpen,
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
            width * 0.03 * eyeOpen,
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
            width * 0.018 * eyeOpen,
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

    // Whiskers
    cx.strokeStyle = "#e6d6e6";
    cx.lineWidth = 1;
    for (const dy of [-2, 0, 2]) {
        // Left
        cx.beginPath();
        cx.moveTo(-4, -height * 0.07 + dy);
        cx.lineTo(-16, -height * 0.07 + dy - 2);
        cx.stroke();
        // Right
        cx.beginPath();
        cx.moveTo(4, -height * 0.07 + dy);
        cx.lineTo(16, -height * 0.07 + dy - 2);
        cx.stroke();
    }

    // Tail
    cx.beginPath();
    cx.moveTo(width * 0.35, height * 0.2);
    cx.bezierCurveTo(
        width * 0.55,
        height * 0.1,
        width * 0.45,
        height * 0.45,
        width * 0.2,
        height * 0.45,
    );
    cx.strokeStyle = "#181818";
    cx.lineWidth = 5;
    cx.stroke();

    cx.restore();
}
