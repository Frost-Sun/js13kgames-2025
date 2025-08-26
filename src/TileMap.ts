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
import type { GameObject } from "./GameObject";
import {
    createTile,
    drawTile,
    TILE_DRAW_HEIGHT,
    TILE_SIZE,
    TileType,
    type Tile,
} from "./tiles";

export class TileMap {
    private grid: Array2D<Tile>;

    width: number;
    height: number;

    constructor(xCount: number, yCount: number) {
        this.grid = new Array2D<Tile>(xCount, yCount);
        this.width = this.grid.xCount * TILE_SIZE;
        this.height = this.grid.yCount * TILE_DRAW_HEIGHT;

        for (let iy = 0; iy < this.grid.yCount; iy++) {
            const y = iy * TILE_DRAW_HEIGHT;

            for (let ix = 0; ix < this.grid.xCount; ix++) {
                const x = ix * TILE_SIZE;

                const tileType =
                    Math.random() < 0.3 ? TileType.Flower : TileType.Grass;
                const tile = createTile(tileType, x, y);
                this.grid.setValue(ix, iy, tile);
            }
        }
    }

    drawTiles(visibleArea: Area, objectsToDraw: GameObject[]): void {
        const tiles = this.grid;

        // Calculate how many tiles are visible in x- and y direction
        const tilesLeftOfCamera = Math.floor(visibleArea.x / TILE_SIZE);
        const tilesToRightEdge = Math.ceil(
            (visibleArea.x + visibleArea.width) / TILE_SIZE,
        );
        const tilesTopOfCamera = Math.floor(visibleArea.y / TILE_DRAW_HEIGHT);
        const tilesToBottomEdge =
            Math.ceil((visibleArea.y + visibleArea.height) / TILE_DRAW_HEIGHT) +
            1; // +1 so that objects get drawn from a tile that is just below the edge
        const leftmostIndex = Math.max(0, tilesLeftOfCamera);
        const rightmostIndex = Math.min(tiles.xCount, tilesToRightEdge);
        const topmostIndex = Math.max(0, tilesTopOfCamera);
        const bottommostIndex = Math.min(tiles.yCount, tilesToBottomEdge);

        // Draw the currently visible tiles
        for (let iy = topmostIndex; iy < bottommostIndex; iy++) {
            const y = iy * TILE_DRAW_HEIGHT;

            for (let ix = leftmostIndex; ix < rightmostIndex; ix++) {
                const x = ix * TILE_SIZE;
                const tile = tiles.getValue(ix, iy);

                const objects = tile?.objects ?? [];
                objectsToDraw.push(...objects);

                drawTile(tile?.type, x, y);
            }
        }
    }

    /**
     * Returns objects from the given tile and the tiles next to it.
     */
    *getNearbyObjects(
        tileX: number,
        tileY: number,
    ): IterableIterator<GameObject> {
        const tiles = this.grid;

        const leftmostIndex = Math.max(0, tileX - 1);
        const rightmostIndex = Math.min(tileX + 1, tiles.xCount);
        const topmostIndex = Math.max(0, tileY - 1);
        const bottommostIndex = Math.min(tileY + 1, tiles.yCount);

        for (let iy = topmostIndex; iy < bottommostIndex; iy++) {
            for (let ix = leftmostIndex; ix < rightmostIndex; ix++) {
                const tile = tiles.getValue(ix, iy);

                if (tile) {
                    for (
                        let iObject = 0;
                        iObject < tile.objects.length;
                        iObject++
                    ) {
                        yield tile.objects[iObject];
                    }
                }
            }
        }
    }
}
