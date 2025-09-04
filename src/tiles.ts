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

import { Bush } from "./Bush";
import { randomMinMax } from "./core/math/random";
import { Flower } from "./Flower";
import type { GameObject } from "./GameObject";
import { cx } from "./graphics";

export const TILE_SIZE = 10;

// Tiles are drawn lower than what they are wide for a pseudo-3D effect.
export const TILE_DRAW_HEIGHT = TILE_SIZE * 0.2;

export const GRASS_COLOR = "rgb(100, 220, 100)";

export enum TileType {
    Grass,
    Flower,
    Bush,
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
    [TileType.Grass]: 0.9,
    [TileType.Flower]: 0.6,
    [TileType.Bush]: 0.4,
    [TileType.Slate]: 1,
};

export const stepVolumeByTile: Readonly<Record<TileType, number>> = {
    [TileType.Grass]: 0.7,
    [TileType.Flower]: 1,
    [TileType.Bush]: 0.5,
    [TileType.Slate]: 0.1,
};

const asciiPatternCache: Record<string, CanvasPattern | null> = {};
function createAsciiPattern(
    width: number,
    height: number,
    alpha: number,
): CanvasPattern | null {
    const key = `${width}x${height}-a${alpha}`;
    if (asciiPatternCache[key]) return asciiPatternCache[key];
    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const ctx = off.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, width, height);
    const fontSize = Math.max(1, Math.floor(height * 0.2));
    ctx.font = `${fontSize}px Courier New`;
    ctx.globalAlpha = alpha;
    const chars = ["#", ".", "-", "+", "*"];
    for (let y = 0; y < height; y += fontSize) {
        for (let x = 0; x < width; x += fontSize) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillStyle =
                Math.random() > 0.5
                    ? "rgba(40,40,40,0.7)"
                    : "rgba(80,80,80,0.7)";
            ctx.fillText(char, x, y + fontSize);
        }
    }
    const pattern = ctx.createPattern(off, "repeat");
    asciiPatternCache[key] = pattern;
    return pattern;
}

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
        case TileType.Bush: {
            return {
                type: TileType.Bush,
                objects: [new Bush(x, y)],
            };
        }
        case TileType.Slate:
            return {
                type: TileType.Slate,
                objects: [],
            };
        default:
            return { type: TileType.Grass, objects: [] };
    }
};

export const drawTile = (
    tile: TileType | undefined,
    x: number,
    y: number,
): void => {
    const base = tile === TileType.Slate ? "rgb(130, 130, 130)" : GRASS_COLOR;
    cx.fillStyle = base;
    cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
    const pattern = createAsciiPattern(TILE_SIZE, TILE_DRAW_HEIGHT, 0.55);
    if (pattern) {
        cx.save();
        cx.fillStyle = pattern;
        cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
        cx.restore();
    }
    if (tile === undefined) {
        cx.fillStyle = "black";
        cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
    }
};
