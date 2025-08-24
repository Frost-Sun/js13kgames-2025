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
import type { Area } from "./core/math/Area";
import type { TimeStep } from "./core/time/TimeStep";
import { drawTile, TILE_HEIGHT, TILE_WIDTH, TileType } from "./tiles";

export class TileMap {
    private grid: Array2D<TileType>;

    width: number;
    height: number;

    constructor(xCount: number, yCount: number) {
        this.grid = new Array2D<TileType>(xCount, yCount);
        this.width = this.grid.xCount * TILE_WIDTH;
        this.height = this.grid.yCount * TILE_HEIGHT;

        for (let iy = 0; iy < this.grid.yCount; iy++) {
            for (let ix = 0; ix < this.grid.xCount; ix++) {
                const tile =
                    Math.random() < 0.3 ? TileType.Flower : TileType.Grass;
                this.grid.setValue(ix, iy, tile);
            }
        }
    }

    draw(time: TimeStep, visibleArea: Area): void {
        const tiles = this.grid;

        // Calculate how many tiles are visible in x- and y direction
        const tilesLeftOfCamera = Math.floor(visibleArea.x / TILE_WIDTH);
        const tilesToRightEdge = Math.ceil(
            (visibleArea.x + visibleArea.width) / TILE_WIDTH,
        );
        const tilesTopOfCamera = Math.floor(visibleArea.y / TILE_HEIGHT);
        const tilesToBottomEdge = Math.ceil(
            (visibleArea.y + visibleArea.height) / TILE_HEIGHT,
        );
        const leftmostIndex = Math.max(0, tilesLeftOfCamera);
        const rightmostIndex = Math.min(tiles.xCount, tilesToRightEdge);
        const tommostIndex = Math.max(0, tilesTopOfCamera);
        const bottommostIndex = Math.min(tiles.yCount, tilesToBottomEdge);

        // Draw the currently visible tiles
        for (let iy = tommostIndex; iy < bottommostIndex; iy++) {
            const y = iy * TILE_HEIGHT;

            for (let ix = leftmostIndex; ix < rightmostIndex; ix++) {
                const x = ix * TILE_WIDTH;
                const tile = tiles.getValue(ix, iy);

                drawTile(tile, x, y);
            }
        }
    }
}
