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
import { Camera } from "./core/gameplay/Camera";
import type { Area } from "./core/math/Area";
import type { TimeStep } from "./core/time/TimeStep";
import { canvas, cx } from "./graphics";
import { PartialArea } from "./PartialArea";
import { Mouse } from "./Mouse";
import { drawTile, TILE_HEIGHT, TILE_WIDTH, TileType } from "./tiles";
import { drawHorizon } from "./horizon";

const HORIZON_HEIGHT_OF_CANVAS = 0.25;

export class Level implements Area {
    private horizonDrawArea = new PartialArea(
        canvas,
        0,
        HORIZON_HEIGHT_OF_CANVAS,
    );
    private levelDrawArea = new PartialArea(
        canvas,
        HORIZON_HEIGHT_OF_CANVAS,
        1 - HORIZON_HEIGHT_OF_CANVAS,
    );

    private camera: Camera;

    private grid: Array2D<TileType> = new Array2D<TileType>(12, 20);

    x: number = 0;
    y: number = 0;
    width: number = this.grid.xCount * TILE_WIDTH;
    height: number = this.grid.yCount * TILE_HEIGHT;

    private player = new Mouse(
        this.x + this.width / 2,
        this.y + this.height / 2,
    );

    constructor() {
        this.camera = new Camera(this, this.levelDrawArea);
        this.camera.zoom = 10;
        this.camera.follow(this.player);

        for (let iy = 0; iy < this.grid.yCount; iy++) {
            for (let ix = 0; ix < this.grid.xCount; ix++) {
                const tile =
                    Math.random() < 0.3 ? TileType.Flower : TileType.Grass;
                this.grid.setValue(ix, iy, tile);
            }
        }
    }

    update(time: TimeStep): void {
        this.camera.update(time);

        this.player.update();
    }

    draw(time: TimeStep): void {
        cx.save();
        cx.translate(0, this.levelDrawArea.y);

        this.camera.apply(cx, () => {
            // Default color for grass
            cx.fillStyle = "rgb(100, 200, 100)";
            cx.fillRect(this.x, this.y, this.width, this.height);

            const tiles = this.grid;
            const visibleArea = this.camera.getVisibleArea();

            const tilesLeftOfCamera = Math.floor(
                (visibleArea.x - this.x) / TILE_WIDTH,
            );
            const tilesToRightEdge = Math.ceil(
                (visibleArea.x + visibleArea.width - this.x) / TILE_WIDTH,
            );
            const tilesTopOfCamera = Math.floor(
                (visibleArea.y - this.y) / TILE_HEIGHT,
            );
            const tilesToBottomEdge = Math.ceil(
                (visibleArea.y + visibleArea.height - this.y) / TILE_HEIGHT,
            );

            const leftmostIndex = Math.max(0, tilesLeftOfCamera);
            const rightmostIndex = Math.min(tiles.xCount, tilesToRightEdge);
            const tommostIndex = Math.max(0, tilesTopOfCamera);
            const bottommostIndex = Math.min(tiles.yCount, tilesToBottomEdge);

            for (let iy = tommostIndex; iy < bottommostIndex; iy++) {
                const y = iy * TILE_HEIGHT;

                for (let ix = leftmostIndex; ix < rightmostIndex; ix++) {
                    const x = ix * TILE_WIDTH;
                    const tile = tiles.getValue(ix, iy);

                    drawTile(tile, x, y);
                }
            }
        });
        cx.restore();

        // The horizon is drawn after the tiles so that the tiles are sharply
        // "cut" at the horizon.
        drawHorizon(this.horizonDrawArea);

        this.camera.apply(cx, () => {
            this.player.draw(time);
        });
    }
}
