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

import { randomMinMax } from "./core/math/random";
import { Flower } from "./Flower";
import type { GameObject } from "./GameObject";
import { cx } from "./graphics";

export const TILE_SIZE = 10;

// Tiles are drawn lower than what they are wide for a pseudo-3D effect.
export const TILE_DRAW_HEIGHT = TILE_SIZE * 0.2;

export const GRASS_COLOR = "rgb(100, 200, 100)";

export enum TileType {
    Grass,
    Flower,
    Slate,
}

export interface Tile {
    readonly type: TileType;
    readonly objects: readonly GameObject[];
}

/**
 * Visibility when being on a tile, a number between 0-1.
 */
export const visibilityByTile: Readonly<Record<TileType, number>> = {
    [TileType.Grass]: 0.8,
    [TileType.Flower]: 0.2,
    [TileType.Slate]: 1,
};

export const stepVolumeByTile: Readonly<Record<TileType, number>> = {
    [TileType.Grass]: 0.7,
    [TileType.Flower]: 1,
    [TileType.Slate]: 0.1,
};

export const createTile = (type: TileType, x: number, y: number): Tile => {
    switch (type) {
        case TileType.Flower:
            return {
                type: TileType.Flower,
                objects: [
                    new Flower(
                        "#ff69b4",
                        x + TILE_SIZE * randomMinMax(0.0, 0.4),
                        y + TILE_DRAW_HEIGHT * randomMinMax(0.0, 0.4),
                    ),
                    new Flower(
                        "#ffd700",
                        x + TILE_SIZE * randomMinMax(0.4, 0.9),
                        y + TILE_DRAW_HEIGHT * randomMinMax(0.0, 0.4),
                    ),
                    new Flower(
                        "#ff4500",
                        x + TILE_SIZE * randomMinMax(0.0, 0.4),
                        y + TILE_DRAW_HEIGHT * randomMinMax(0.4, 0.9),
                    ),
                    new Flower(
                        "#ffffff",
                        x + TILE_SIZE * randomMinMax(0.4, 0.9),
                        y + TILE_DRAW_HEIGHT * randomMinMax(0.4, 0.9),
                    ),
                ],
            };
        case TileType.Slate:
            return {
                type: TileType.Slate,
                objects: [],
            };
        default:
            return { type: TileType.Grass, objects: [] };
    }
};

// Deterministic RNG so the pattern is static and repeatable
function mulberry32(seed) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), 1 | t);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Create a reusable, tileable grass pattern
function createGrassPattern(seed = 20250901) {
    const rand = mulberry32(seed);
    const texSize = 128;

    const off = document.createElement("canvas");
    off.width = texSize;
    off.height = texSize;
    const ctx = off.getContext("2d");

    if (ctx === null) return;

    // 1) Base gradient (more color variation)
    const baseTop = { r: 80, g: 160, b: 70 };
    const baseBot = { r: 40, g: 90, b: 40 };
    const grad = ctx.createLinearGradient(0, 0, 0, texSize);
    grad.addColorStop(0, `rgb(${baseTop.r}, ${baseTop.g}, ${baseTop.b})`);
    grad.addColorStop(0.5, `rgb(60, 130, 60)`);
    grad.addColorStop(1, `rgb(${baseBot.r}, ${baseBot.g}, ${baseBot.b})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, texSize, texSize);

    // 2) Fine chroma noise (more color variation)
    const specks = 1200;
    for (let i = 0; i < specks; i++) {
        const x = rand() * texSize;
        const y = rand() * texSize;
        const dg = Math.floor((rand() - 0.5) * 24); // ±12 green shift
        const r = 40 + Math.floor(rand() * 40);
        const g = 90 + Math.floor(rand() * 80) + dg;
        const b = 30 + Math.floor(rand() * 40);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.16)`;
        ctx.fillRect(x, y, 0.7, 0.7);
    }

    // 3) More blades, more color variety, highlights and shadows
    function drawBlade(
        x: number,
        y: number,
        len: number,
        curve: number,
        width: number,
        color: string,
        alpha: number,
    ) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(curve * 0.5, -len * 0.4, 0, -len * 0.75);
        ctx.quadraticCurveTo(-curve, -len * 0.9, 0, -len);
        ctx.stroke();
        ctx.restore();
    }

    const blades = 900;
    for (let i = 0; i < blades; i++) {
        // More random placement, mostly short blades
        const x = rand() * texSize;
        const y = texSize * (0.18 + rand() * 0.82);
        const len = 1.2 + rand() * 6 * (rand() > 0.8 ? 0.5 : 1); // mostly short
        const width = 0.09 + rand() * 0.08;
        const curve = (rand() - 0.5) * (rand() > 0.7 ? 10 : 4); // less wild

        // shadow pass (deep green, more alpha variation)
        const shade1 = `rgb(${35 + Math.floor(rand() * 35)}, ${100 + Math.floor(rand() * 70)}, ${35 + Math.floor(rand() * 35)})`;
        drawBlade(x, y, len, curve, width + 0.04, shade1, 0.18 + rand() * 0.14);

        // highlight pass (yellow-green, more alpha variation)
        const shade2 = `rgb(${70 + Math.floor(rand() * 50)}, ${160 + Math.floor(rand() * 50)}, ${50 + Math.floor(rand() * 30)})`;
        drawBlade(
            x,
            y,
            len * (0.6 + rand() * 0.4),
            curve * (0.4 + rand() * 0.6),
            width,
            shade2,
            0.09 + rand() * 0.13,
        );

        // blue-green accent, more horizontal, even thinner
        if (rand() > 0.7) {
            const shade3 = `rgb(${55 + Math.floor(rand() * 25)}, ${130 + Math.floor(rand() * 30)}, ${80 + Math.floor(rand() * 30)})`;
            drawBlade(
                x,
                y,
                len * (0.4 + rand() * 0.4),
                curve * (rand() > 0.5 ? 1.0 : 0.2),
                width * 0.5,
                shade3,
                0.07 + rand() * 0.09,
            );
        }
    }

    // 4) Soft mottling overlay to unify
    const overlay = ctx.createRadialGradient(
        texSize * 0.5,
        texSize * 0.6,
        4,
        texSize * 0.5,
        texSize * 0.6,
        texSize * 0.7,
    );
    overlay.addColorStop(0, "rgba(255, 255, 200, 0.03)");
    overlay.addColorStop(1, "rgba(0, 0, 0, 0.07)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, texSize, texSize);

    return ctx.createPattern(off, "repeat");
}

function createCementPattern() {
    const texSize = 32;
    const off = document.createElement("canvas");
    off.width = texSize;
    off.height = texSize;
    const ctx = off.getContext("2d");

    if (ctx === null) return;
    // Base color
    ctx.fillStyle = "rgb(140, 140, 135)";
    ctx.fillRect(0, 0, texSize, texSize);

    const speckles = 70;
    for (let i = 0; i < speckles; i++) {
        const sx = Math.random() * texSize;
        const sy = Math.random() * texSize;
        const shade = 125 + Math.floor(Math.random() * 25); // subtle contrast
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(sx, sy, 0.7, 0.7); // sweet spot size
    }

    return ctx.createPattern(off, "repeat");
}

const cementPattern = createCementPattern();
const grassPattern = createGrassPattern();
let pattern: CanvasPattern;

export const drawTile = (
    tile: TileType | undefined,
    x: number,
    y: number,
): void => {
    switch (tile) {
        case TileType.Flower:
            if (grassPattern) pattern = grassPattern;
            cx.fillStyle = pattern;
            cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
            cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
            break;
        // Create cement textur
        // e once

        // In your draw code
        case TileType.Slate: {
            if (cementPattern) cx.fillStyle = cementPattern;
            cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);

            const edgeThickness = TILE_DRAW_HEIGHT * 0.01;
            cx.fillStyle = "rgb(110, 110, 110)";
            cx.fillRect(
                x,
                y + TILE_DRAW_HEIGHT - edgeThickness,
                TILE_SIZE,
                edgeThickness,
            );

            cx.fillStyle = "rgb(160, 160, 155)";
            cx.fillRect(x, y, edgeThickness, TILE_DRAW_HEIGHT);

            cx.fillStyle = "rgba(255, 255, 255, 0.05)";
            cx.fillRect(x, y, TILE_SIZE, edgeThickness);
            break;
        }

        case TileType.Grass: {
            if (grassPattern) pattern = grassPattern;
            cx.fillStyle = pattern;
            cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
            break;
        }

        default:
            cx.fillStyle = "black";
            cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
            break;
    }
};
