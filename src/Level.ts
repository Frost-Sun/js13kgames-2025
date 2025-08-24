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

import { Camera } from "./core/gameplay/Camera";
import type { Area } from "./core/math/Area";
import type { TimeStep } from "./core/time/TimeStep";
import { canvas, cx } from "./graphics";
import { PartialArea } from "./PartialArea";
import { Mouse } from "./Mouse";
import { drawHorizon } from "./horizon";
import { TileMap } from "./TileMap";

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

    private tileMap: TileMap = new TileMap(12, 20);

    private camera: Camera;

    x: number = 0;
    y: number = 0;
    width: number = this.tileMap.width;
    height: number = this.tileMap.height;

    private player = new Mouse(
        this.x + this.width / 2,
        this.y + this.height / 2,
    );

    constructor() {
        this.camera = new Camera(this, this.levelDrawArea);
        this.camera.zoom = 10;
        this.camera.follow(this.player);
    }

    update(time: TimeStep): void {
        this.camera.update(time);

        this.player.update();
    }

    draw(time: TimeStep): void {
        const visibleArea = this.camera.getVisibleArea();

        cx.save();
        cx.translate(0, this.levelDrawArea.y);

        this.camera.apply(cx, () => {
            // Default color for grass
            cx.fillStyle = "rgb(100, 200, 100)";
            cx.fillRect(this.x, this.y, this.width, this.height);

            this.tileMap.drawTiles(time, visibleArea);
        });
        cx.restore();

        // The horizon is drawn after the tiles so that the tiles are sharply
        // "cut" at the horizon.
        drawHorizon(this.horizonDrawArea);

        cx.save();
        cx.translate(0, this.levelDrawArea.y);

        this.camera.apply(cx, () => {
            this.tileMap.drawObjects(time, visibleArea);
            this.player.draw(time);
        });
        cx.restore();
    }
}
