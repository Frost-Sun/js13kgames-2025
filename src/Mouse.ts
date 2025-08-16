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
import { cx } from "./graphics";
import type { GameObject } from "./GameObject";
import { getControls } from "./controls";

export class Mouse implements GameObject {
    x: number = 0;
    y: number = 0;

    // Logical bounding box for collisions/culling
    width: number = 48;
    height: number = 28;

    // Animation state
    private dir: number = 1; // 1 = facing right, -1 = facing left
    private step: number = 0; // walk cycle phase
    private lastSpeed: number = 0; // used to modulate animations

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    update(_: TimeStep): void {
        const movement = getControls().movement;
        this.x += movement.x;
        this.y += movement.y;

        // Direction follows horizontal input
        if (movement.x > 0.05) this.dir = 1;
        else if (movement.x < -0.05) this.dir = -1;

        // Walk cycle speed from movement magnitude
        const speed = Math.hypot(movement.x, movement.y);
        this.lastSpeed = speed;
        this.step += speed * 0.25; // tune to taste
    }

    draw(time: TimeStep): void {
        const t = time.t;

        // Decide pose based on current input (no movement logic changed)
        const mv = getControls().movement || { x: 0, y: 0 };
        const ax = Math.abs(mv.x),
            ay = Math.abs(mv.y);
        let facing: "side" | "up" | "down" = "side";
        if (ay > ax && ay > 0.01) facing = mv.y < 0 ? "up" : "down";

        cx.save();

        // Centered transform; flip only for side pose; subtle bob when moving
        cx.translate(this.x + this.width / 2, this.y + this.height / 2);
        cx.scale(facing === "side" ? this.dir : 1, 1);

        const moveFactor = Math.min(1, this.lastSpeed * 0.8);
        const bob =
            Math.sin(t / 220 + this.step * 2.0) * (1.5 * (0.4 + moveFactor));
        cx.translate(0, bob);

        // Helper to draw a filled + stroked ellipse
        const fillStrokeEllipse = (
            x: number,
            y: number,
            rx: number,
            ry: number,
            fill: string,
            stroke = "#dcdcdc",
        ) => {
            cx.beginPath();
            cx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            cx.fillStyle = fill;
            cx.fill();
            if (stroke) {
                cx.strokeStyle = stroke;
                cx.lineWidth = 1;
                cx.stroke();
            }
        };

        // Common shadow
        cx.save();
        cx.globalAlpha = 0.18;
        cx.fillStyle = "black";
        cx.beginPath();
        cx.ellipse(
            0,
            this.height * (facing === "down" ? 0.6 : 0.5),
            this.width * 0.45,
            this.height * 0.24,
            0,
            0,
            Math.PI * 2,
        );
        cx.fill();
        cx.restore();

        if (facing === "side") {
            // === YOUR ORIGINAL SIDE-VIEW ANIMATION (unchanged) ===

            // Tail sway
            cx.save();
            const tailSway =
                Math.sin(t / 260 + this.step * 1.6) * (6 + moveFactor * 4);
            cx.strokeStyle = "#f0c2c2";
            cx.lineWidth = 2;
            cx.lineCap = "round";
            cx.beginPath();
            cx.moveTo(-18, 2);
            cx.bezierCurveTo(-28, 0, -40, tailSway * 0.4, -62, tailSway);
            cx.stroke();
            cx.restore();

            // Legs (simple step cycle)
            const legLift = (phase: number) =>
                Math.sin(this.step * 6 + phase) * (2.0 * (0.3 + moveFactor));
            cx.fillStyle = "#ededed";
            cx.strokeStyle = "#d7d7d7";

            // Back foot
            cx.beginPath();
            cx.ellipse(-8, 10 + legLift(0), 6, 3, 0, 0, Math.PI * 2);
            cx.fill();
            cx.stroke();

            // Front foot
            cx.beginPath();
            cx.ellipse(10, 10 + legLift(Math.PI), 6, 3, 0, 0, Math.PI * 2);
            cx.fill();
            cx.stroke();

            // Body
            fillStrokeEllipse(0, 0, 18, 10, "#ffffff");

            // Subtle belly shading
            cx.save();
            const grad = cx.createRadialGradient(0, 4, 2, 0, 4, 18);
            grad.addColorStop(0, "rgba(0,0,0,0.05)");
            grad.addColorStop(1, "rgba(0,0,0,0)");
            cx.fillStyle = grad;
            cx.beginPath();
            cx.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2);
            cx.fill();
            cx.restore();

            // Head (slightly forward and up)
            fillStrokeEllipse(14, -2, 9, 7, "#ffffff");

            // Ears (outer + inner)
            fillStrokeEllipse(8, -10, 5, 5, "#ffe2e6");
            fillStrokeEllipse(8, -10, 3, 3, "#ffc8d0", "#eec3c9");

            // Eye with blink
            const blinkPhase = (t / 1400) % 1; // 0..1
            let eyeOpen = 1;
            if (blinkPhase < 0.06)
                eyeOpen = Math.max(0.15, 1 - blinkPhase / 0.06);
            else if (blinkPhase < 0.12)
                eyeOpen = Math.max(0.15, (blinkPhase - 0.06) / 0.06);

            cx.save();
            cx.translate(18, -4);
            cx.beginPath();
            cx.ellipse(0, 0, 1.8, 1.8 * eyeOpen, 0, 0, Math.PI * 2);
            cx.fillStyle = "#222";
            cx.fill();
            // tiny eye highlight when open
            if (eyeOpen > 0.3) {
                cx.beginPath();
                cx.ellipse(
                    -0.4,
                    -0.5 * eyeOpen,
                    0.5,
                    0.35 * eyeOpen,
                    0,
                    0,
                    Math.PI * 2,
                );
                cx.fillStyle = "rgba(255,255,255,0.9)";
                cx.fill();
            }
            cx.restore();

            // Nose wiggle
            const noseWiggle = Math.sin(t / 120) * 0.6;
            fillStrokeEllipse(
                22 + noseWiggle,
                -1,
                1.6,
                1.4,
                "#ff9aa9",
                "#ef8a99",
            );

            // Whiskers
            cx.save();
            cx.strokeStyle = "rgba(0,0,0,0.35)";
            cx.lineWidth = 1;
            cx.lineCap = "round";
            const whiskerY = [-2, 0, 2];
            for (let i = 0; i < whiskerY.length; i++) {
                const wy = whiskerY[i];
                cx.beginPath();
                cx.moveTo(20, wy);
                cx.lineTo(28, wy - 1 + i); // three slight angles
                cx.stroke();
            }
            cx.restore();
        } else if (facing === "up") {
            // Tail at bottom (since mouse is moving up)
            cx.save();
            const tailSwayFB =
                Math.sin(t / 260 + this.step * 1.6) * (6 + moveFactor * 4);
            cx.strokeStyle = "#f0c2c2";
            cx.lineWidth = 2;
            cx.lineCap = "round";
            cx.beginPath();
            cx.moveTo(0, 6);
            cx.bezierCurveTo(4, 14, 2, 16 + tailSwayFB, 0, 20 + tailSwayFB);
            cx.stroke();
            cx.restore();

            // Paws (rear)
            const legLiftFB = (phase: number) =>
                Math.sin(this.step * 6 + phase) * (1.5 * (0.3 + moveFactor));
            cx.fillStyle = "#ededed";
            cx.strokeStyle = "#d7d7d7";
            cx.beginPath();
            cx.ellipse(-8, 8 + legLiftFB(0), 5, 2.5, 0, 0, Math.PI * 2);
            cx.fill();
            cx.stroke();
            cx.beginPath();
            cx.ellipse(8, 8 + legLiftFB(Math.PI), 5, 2.5, 0, 0, Math.PI * 2);
            cx.fill();
            cx.stroke();

            // Body
            fillStrokeEllipse(0, 0, 18, 10, "#ffffff");

            // Ears (visible from behind)
            fillStrokeEllipse(-6, -14, 5, 5, "#ffe2e6");
            fillStrokeEllipse(6, -14, 5, 5, "#ffe2e6");
            fillStrokeEllipse(-6, -14, 3, 3, "#ffc8d0", "#eec3c9");
            fillStrokeEllipse(6, -14, 3, 3, "#ffc8d0", "#eec3c9");

            // Back of head (no eyes/nose)
            fillStrokeEllipse(0, -12, 9, 7, "#ffffff");
        } else {
            // === FRONT/BACK POSE FOR UP/DOWN FACING ===

            // Tail: vertical behind the body with gentle sway
            cx.save();
            const sign = -1; // down facing
            const tailSwayFB =
                Math.sin(t / 260 + this.step * 1.6) * (6 + moveFactor * 4);
            cx.strokeStyle = "#f0c2c2";
            cx.lineWidth = 2;
            cx.lineCap = "round";
            cx.beginPath();
            cx.moveTo(0, 6);
            cx.bezierCurveTo(
                4,
                6 + sign * 8,
                2,
                12 + sign * tailSwayFB,
                0,
                20 + sign * (tailSwayFB + 6),
            );
            cx.stroke();
            cx.restore();

            // Legs: four little paws alternating
            const legLiftFB = (phase: number) =>
                Math.sin(this.step * 6 + phase) * (1.5 * (0.3 + moveFactor));
            cx.fillStyle = "#ededed";
            cx.strokeStyle = "#d7d7d7";

            // Rear paws
            cx.beginPath();
            cx.ellipse(-8, 8 + legLiftFB(0), 5, 2.5, 0, 0, Math.PI * 2);
            cx.fill();
            cx.stroke();
            cx.beginPath();
            cx.ellipse(8, 8 + legLiftFB(Math.PI), 5, 2.5, 0, 0, Math.PI * 2);
            cx.fill();
            cx.stroke();

            // Front paws (closer to the head side)
            const frontY = facing === "up" ? -8 : 8;
            cx.beginPath();
            cx.ellipse(
                -7,
                frontY + legLiftFB(Math.PI),
                4.5,
                2.2,
                0,
                0,
                Math.PI * 2,
            );
            cx.fill();
            cx.stroke();
            cx.beginPath();
            cx.ellipse(7, frontY + legLiftFB(0), 4.5, 2.2, 0, 0, Math.PI * 2);
            cx.fill();
            cx.stroke();

            // Body
            fillStrokeEllipse(0, 0, 18, 10, "#ffffff");

            // Subtle belly shading
            cx.save();
            const gradFB = cx.createRadialGradient(0, 4, 2, 0, 4, 18);
            gradFB.addColorStop(0, "rgba(0,0,0,0.05)");
            gradFB.addColorStop(1, "rgba(0,0,0,0)");
            cx.fillStyle = gradFB;
            cx.beginPath();
            cx.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2);
            cx.fill();
            cx.restore();

            // Head at the leading side (top for up, bottom for down)
            const headY = facing === "up" ? -12 : 12;
            fillStrokeEllipse(0, headY, 9, 7, "#ffffff");

            // Ears (symmetrical)
            fillStrokeEllipse(-6, headY - 6, 5, 5, "#ffe2e6");
            fillStrokeEllipse(6, headY - 6, 5, 5, "#ffe2e6");
            fillStrokeEllipse(-6, headY - 6, 3, 3, "#ffc8d0", "#eec3c9");
            fillStrokeEllipse(6, headY - 6, 3, 3, "#ffc8d0", "#eec3c9");

            // Eyes (two) with synced blink
            const blinkPhase = (t / 1400) % 1;
            let eyeOpen = 1;
            if (blinkPhase < 0.06)
                eyeOpen = Math.max(0.15, 1 - blinkPhase / 0.06);
            else if (blinkPhase < 0.12)
                eyeOpen = Math.max(0.15, (blinkPhase - 0.06) / 0.06);

            cx.beginPath();
            cx.ellipse(-3.2, headY - 2, 1.6, 1.6 * eyeOpen, 0, 0, Math.PI * 2);
            cx.fillStyle = "#222";
            cx.fill();

            cx.beginPath();
            cx.ellipse(3.2, headY - 2, 1.6, 1.6 * eyeOpen, 0, 0, Math.PI * 2);
            cx.fillStyle = "#222";
            cx.fill();

            // tiny highlights when open
            if (eyeOpen > 0.3) {
                cx.fillStyle = "rgba(255,255,255,0.9)";
                cx.beginPath();
                cx.ellipse(
                    -3.7,
                    headY - 2.6 * eyeOpen,
                    0.4,
                    0.3 * eyeOpen,
                    0,
                    0,
                    Math.PI * 2,
                );
                cx.fill();
                cx.beginPath();
                cx.ellipse(
                    2.7,
                    headY - 2.6 * eyeOpen,
                    0.4,
                    0.3 * eyeOpen,
                    0,
                    0,
                    Math.PI * 2,
                );
                cx.fill();
            }

            // Nose wiggle at the tip
            const noseWiggle = Math.sin(t / 120) * 0.6;
            const noseY = headY + (facing === "up" ? -6 : 6);
            fillStrokeEllipse(
                0 + noseWiggle,
                noseY,
                1.6,
                1.4,
                "#ff9aa9",
                "#ef8a99",
            );

            // Whiskers (both sides)
            cx.save();
            cx.strokeStyle = "rgba(0,0,0,0.35)";
            cx.lineWidth = 1;
            cx.lineCap = "round";
            const whiskerY = [-1.5, 0, 1.5].map((d) => d + noseY);
            for (let i = 0; i < whiskerY.length; i++) {
                const wy = whiskerY[i];
                // left
                cx.beginPath();
                cx.moveTo(-2, wy);
                cx.lineTo(-10, wy - 1 + i);
                cx.stroke();
                // right
                cx.beginPath();
                cx.moveTo(2, wy);
                cx.lineTo(10, wy - 1 + i);
                cx.stroke();
            }
            cx.restore();
        }

        cx.restore();
    }
}
