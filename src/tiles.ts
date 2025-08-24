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

import type { Area } from "./core/math/Area";
import { cx } from "./graphics";

export const TILE_WIDTH = 10;
export const TILE_HEIGHT = 10;

export enum TileType {
    Grass,
    Flower,
}

export const drawTile = (
    tile: TileType | undefined,
    x: number,
    y: number,
): void => {
    switch (tile) {
        case TileType.Flower:
            cx.fillStyle = "rgb(100, 190, 100)";
            cx.fillRect(x, y, TILE_WIDTH, TILE_HEIGHT);
            break;
        case TileType.Grass:
            break;

        default:
            cx.fillStyle = "black";
            cx.fillRect(x, y, TILE_WIDTH, TILE_HEIGHT);
            break;
    }
};

export const drawObject = (
    tile: TileType | undefined,
    x: number,
    y: number,
    visibleArea: Area,
): void => {
    switch (tile) {
        case TileType.Flower:
            drawFlower(
                x + TILE_WIDTH * 0.3,
                y + TILE_HEIGHT * 0.3,
                TILE_HEIGHT * 0.2,
                "#ff69b4",
                visibleArea,
            );
            drawFlower(
                x + TILE_WIDTH * 0.7,
                y + TILE_HEIGHT * 0.3,
                TILE_HEIGHT * 0.2,
                "#ffd700",
                visibleArea,
            );
            drawFlower(
                x + TILE_WIDTH * 0.3,
                y + TILE_HEIGHT * 0.7,
                TILE_HEIGHT * 0.2,
                "#ff4500",
                visibleArea,
            );
            drawFlower(
                x + TILE_WIDTH * 0.7,
                y + TILE_HEIGHT * 0.7,
                TILE_HEIGHT * 0.2,
                "#ffffff",
                visibleArea,
            );
            break;

        default:
            break;
    }
};

const drawFlower = (
    x: number,
    y: number,
    h: number,
    color: string,
    visibleArea: Area,
): void => {
    // Skip drawing if the object is over the horizon.
    if (y < visibleArea.y) {
        return;
    }

    const stemWidth = TILE_WIDTH * 0.04;
    const flowerWidth = TILE_WIDTH * 0.2;

    // Flower stem
    cx.fillStyle = "#228b22";
    cx.fillRect(x - stemWidth * 0.5, y - h, stemWidth, h);

    // Flower petals
    cx.beginPath();
    cx.arc(x, y - h, flowerWidth * 0.5, 0, Math.PI * 2);
    cx.fillStyle = color;
    cx.fill();

    // Flower center
    cx.beginPath();
    cx.arc(x, y - h, flowerWidth * 0.2, 0, Math.PI * 2);
    cx.fillStyle = "#ffffe0";
    cx.fill();
};
