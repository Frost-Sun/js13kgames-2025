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
    drawTile,
    TILE_DRAW_HEIGHT,
    TILE_SIZE,
    TileType,
    visibilityByTile,
    type Tile,
} from "./tiles";

export interface TileIndex {
    ix: number;
    iy: number;
}

const average = (a: number, b: number, c: number, d: number): number =>
    (a + b + c + d) / 4;

const getTileIndex = (x: number, y: number): TileIndex => ({
    ix: Math.floor(x / TILE_SIZE),
    iy: Math.floor(y / TILE_DRAW_HEIGHT),
});

export const getTileIndexOfObject = (object: GameObject): TileIndex =>
    getTileIndex(object.x + object.width / 2, object.y + object.height / 2);

export class TileMap {
    private grid: Array2D<Tile>;

    width: number;
    height: number;

    constructor(tiles: Array2D<Tile>) {
        this.grid = tiles;
        this.width = this.grid.xCount * TILE_SIZE;
        this.height = this.grid.yCount * TILE_DRAW_HEIGHT;
    }

    getTile(index: TileIndex): Tile | undefined {
        return this.grid.getValue(index.ix, index.iy);
    }

    /**
     * Returns visibility of the object, a number between 0-1.
     */
    getVisibility(o: GameObject): number {
        // In case the object is between several tiles, calculate average
        // of visibilities of each corner of the bounding box.
        const topLeft =
            this.getTile(getTileIndex(o.x, o.y))?.type ?? TileType.Grass;
        const topRight =
            this.getTile(getTileIndex(o.x + o.width, o.y))?.type ??
            TileType.Grass;
        const bottomLeft =
            this.getTile(getTileIndex(o.x, o.y + o.height))?.type ??
            TileType.Grass;
        const bottomRight =
            this.getTile(getTileIndex(o.x + o.width, o.y + o.height))?.type ??
            TileType.Grass;

        return average(
            visibilityByTile[topLeft],
            visibilityByTile[topRight],
            visibilityByTile[bottomLeft],
            visibilityByTile[bottomRight],
        );
    }

    draw(visibleArea: Area, objectsToDraw: GameObject[]): void {
        const tiles = this.grid;

        // Calculate how many tiles are visible in x- and y direction
        const tilesLeftOfCamera = Math.floor(visibleArea.x / TILE_SIZE);
        const tilesToRightEdge = Math.ceil(
            (visibleArea.x + visibleArea.width) / TILE_SIZE,
        );
        const tilesTopOfCamera = Math.floor(visibleArea.y / TILE_DRAW_HEIGHT);
        const tilesToBottomEdge =
            Math.ceil((visibleArea.y + visibleArea.height) / TILE_DRAW_HEIGHT) +
            4; // +4 so that objects get drawn from a tile that is just below the edge
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
    *getNearbyObjects(position: TileIndex): IterableIterator<GameObject> {
        const tiles = this.grid;

        const leftmostIndex = Math.max(0, position.ix - 1);
        const rightmostIndex = Math.min(position.ix + 1, tiles.xCount);
        const topmostIndex = Math.max(0, position.iy - 1);
        const bottommostIndex = Math.min(position.iy + 1, tiles.yCount);

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
