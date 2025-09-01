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
    const grid = new Array2D<Tile>(10, 20);

    const turningYIndices: number[] = [4, 12, 18];

    const flowerPropability = Math.max(0.1, 0.8 - number * 0.05);

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
                    : random() < flowerPropability
                      ? TileType.Flower
                      : TileType.Grass;

            const tile = createTile(tileType, x, y);
            grid.setValue(ix, iy, tile);
        }
    }

    return grid;
};
