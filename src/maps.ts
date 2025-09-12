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

import { Array2D } from "./Array2D";
import { random, randomInt } from "./core/math/random";
import {
    createTile,
    TILE_DRAW_HEIGHT,
    TILE_SIZE,
    TileType,
    type Tile,
} from "./tiles";

export const createMap = (number: number): Array2D<Tile> => {
    const grid = new Array2D<Tile>(10, 50);

    const turningYIndices: number[] = [4, 12, 18, 29, 34, 41, 47];

    const plantPropability = Math.max(0.1, 0.8 - number * 0.05);

    let ixPath = 4;

    for (let iy = 0; iy < grid.yCount; iy++) {
        const y = iy * TILE_DRAW_HEIGHT;

        if (turningYIndices.includes(iy)) {
            const previousIxPath = ixPath;
            ixPath = 1 + randomInt(grid.xCount - 1);

            // Add horizontal road
            const ixMin = Math.min(previousIxPath, ixPath);
            const ixMax = Math.max(previousIxPath, ixPath);

            for (let ix = ixMin; ix < ixMax + 1; ix++) {
                const x = ix * TILE_SIZE;

                const tile = createTile(TileType.Slate, x, y);
                grid.setValue(ix, iy, tile);
            }
        }

        for (let ix = 0; ix < grid.xCount; ix++) {
            const existing = grid.getValue(ix, iy);
            if (existing) {
                continue;
            }

            const x = ix * TILE_SIZE;
            const tileType =
                ix === ixPath
                    ? TileType.Slate
                    : random() < plantPropability
                      ? random() < 0.1
                          ? TileType.Bush
                          : TileType.Flower
                      : TileType.Grass;

            const tile = createTile(tileType, x, y);
            grid.setValue(ix, iy, tile);
        }
    }

    return grid;
};

export const createIntroMap = (): Array2D<Tile> => {
    const introWidth = 10;
    const introHeight = 18;
    const grid = new Array2D<Tile>(introWidth, introHeight);
    const centerCol = Math.floor(introWidth / 2) + 1;
    for (let iy = 0; iy < introHeight; iy++) {
        for (let ix = 0; ix < introWidth; ix++) {
            const x = ix * TILE_SIZE;
            const y = iy * TILE_DRAW_HEIGHT;
            let type = TileType.Grass;
            // Place bushes and flowers at fixed positions, not in the center column
            if (
                (iy === 2 && ix === 2) ||
                (iy === 2 && ix === introWidth - 3) ||
                (iy === 4 && ix === 1) ||
                (iy === 4 && ix === introWidth - 2)
            ) {
                type = TileType.Bush;
            } else if (
                (iy === 3 && ix === 1) ||
                (iy === 3 && ix === introWidth - 2) ||
                (iy === 1 && ix === 3) ||
                (iy === 1 && ix === introWidth - 4)
            ) {
                type = TileType.Flower;
            }
            // Never place anything in the center column
            if (ix === centerCol) type = TileType.Slate;
            grid.setValue(ix, iy, createTile(type, x, y));
        }
    }
    return grid;
};
