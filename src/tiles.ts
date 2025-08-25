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

import { Flower } from "./Flower";
import type { GameObject } from "./GameObject";
import { cx } from "./graphics";

export const TILE_SIZE = 10;

// Tiles are drawn lower than what they are wide for a pseudo-3D effect.
export const TILE_DRAW_HEIGHT = TILE_SIZE * 0.3;

export enum TileType {
    Grass,
    Flower,
}

export interface Tile {
    readonly type: TileType;
    readonly objects: readonly GameObject[];
}

export const createTile = (type: TileType, x: number, y: number): Tile => {
    switch (type) {
        case TileType.Flower:
            return {
                type: TileType.Flower,
                objects: [
                    new Flower(
                        "#ff69b4",
                        x + TILE_SIZE * 0.3,
                        y + TILE_DRAW_HEIGHT * 0.3,
                    ),
                    new Flower(
                        "#ffd700",
                        x + TILE_SIZE * 0.7,
                        y + TILE_DRAW_HEIGHT * 0.3,
                    ),
                    new Flower(
                        "#ff4500",
                        x + TILE_SIZE * 0.3,
                        y + TILE_DRAW_HEIGHT * 0.7,
                    ),
                    new Flower(
                        "#ffffff",
                        x + TILE_SIZE * 0.7,
                        y + TILE_DRAW_HEIGHT * 0.7,
                    ),
                ],
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
    switch (tile) {
        case TileType.Flower:
            cx.fillStyle = "rgb(100, 190, 100)";
            cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
            break;
        case TileType.Grass:
            break;

        default:
            cx.fillStyle = "black";
            cx.fillRect(x, y, TILE_SIZE, TILE_DRAW_HEIGHT);
            break;
    }
};
