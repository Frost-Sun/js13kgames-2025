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

let thunderTimer = 0;
let thunderActive = false;
let lastThunder = 0;
let nextThunderInterval = 10800 + Math.random() * 10800;

export const updateThunder = (frame: number) => {
    if (frame - lastThunder > nextThunderInterval) {
        thunderActive = true;
        thunderTimer = 0;
        lastThunder = frame;
        nextThunderInterval = 10800 + Math.random() * 10800;
    }
    if (thunderActive) {
        thunderTimer++;
        if (thunderTimer > 24) {
            // lasts 0.4 seconds at 60 FPS
            thunderActive = false;
        }
    }
};

export const drawThunder = () => {
    if (thunderActive) {
        cx.save();

        // Dramatic flicker sequence
        let alpha = 0,
            color = "#fff";
        if (thunderTimer < 4) {
            alpha = 1;
            color = "#fff";
        } else if (thunderTimer < 8) {
            alpha = 0.7 + Math.random() * 0.3;
            color = "#eaf6ff";
        } else if (thunderTimer < 12) {
            alpha = 0.4 + Math.random() * 0.2;
            color = "#f9f6e7";
        } else if (thunderTimer < 16) {
            alpha = Math.random() * 0.3;
            color = "#eaf6ff";
        } else if (thunderTimer < 20) {
            alpha = 0.2 + Math.random() * 0.2;
            color = "#fff";
        } else {
            alpha = Math.random() * 0.1;
            color = "#eaf6ff";
        }

        cx.globalAlpha = alpha;
        cx.fillStyle = color;
        cx.fillRect(0, 0, canvas.width, canvas.height);
        cx.restore();
    }
};

const raindrops = Array.from({ length: 200 }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: 2 + Math.random() * 3,
    drift: (Math.random() - 0.5) * 0.3, // slight horizontal drift
    length: 12 + Math.random() * 10,
}));

export const drawRain = (time: number, width: number, height: number) => {
    const rainColor = "rgba(255,255,255,0.6)";
    cx.strokeStyle = rainColor;
    cx.lineWidth = 1;

    for (const drop of raindrops) {
        const x = (drop.x * width + drop.drift * time) % width;
        const y = (drop.y * height + drop.speed * time) % height;

        cx.beginPath();
        cx.moveTo(x, y);
        cx.lineTo(x, y + drop.length);
        cx.stroke();
    }
};
