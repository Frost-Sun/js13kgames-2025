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
import { getCenter, type Area } from "./core/math/Area";
import type { TimeStep } from "./core/time/TimeStep";
import { canvas, clearCanvas, cx, drawRain } from "./graphics";
import { PartialArea } from "./PartialArea";
import { Mouse } from "./Mouse";
import { drawHorizon } from "./horizon";
import { getTileIndex, TileMap } from "./TileMap";
import type { GameObject } from "./GameObject";
import { Flower } from "./Flower";
import { distance, type Vector } from "./core/math/Vector";
import { BlackCat } from "./BlackCat";
import type { Sighting, Space } from "./Space";
import type { Animal } from "./Animal";

const HORIZON_HEIGHT_OF_CANVAS = 0.25;

const NIGHT_START_TIME = 5000;

export enum LevelState {
    Running,
    Lose,
}

export class Level implements Area, Space {
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

    private startTime: number;

    state: LevelState = LevelState.Running;

    x: number = 0;
    y: number = 0;
    width: number = this.tileMap.width;
    height: number = this.tileMap.height;

    private player = new Mouse(this.width * 0.8, this.height * 0.6);
    private cat = new BlackCat(this.width * 0.4, this.height * 0.3, this);

    private animals: Animal[] = [this.player];

    constructor() {
        this.startTime = performance.now();
        this.animals.push(this.cat);

        this.camera = new Camera(this, this.levelDrawArea);
        this.camera.zoom = 15;
        this.camera.follow(this.player);
    }

    lookForMouse(): Sighting {
        const mouse = this.player;

        return {
            target: mouse,
            visibility: this.tileMap.getVisibility(mouse),
        };
    }

    update(time: TimeStep): void {
        this.camera.update(time);

        this.calculateMovement(time);

        this.checkCollisionsWithCat();
        this.checkCollisionsWithPlants(time);
    }

    private calculateMovement(time: TimeStep): void {
        for (let i = 0; i < this.animals.length; i++) {
            const o = this.animals[i];
            const movement = o.getMovement(time);

            if (movement.x < 0 && this.x <= o.x + movement.x) {
                o.x += movement.x;
            } else if (
                movement.x > 0 &&
                o.x + movement.x + o.width < this.x + this.width
            ) {
                o.x += movement.x;
            }

            if (movement.y < 0 && this.y <= o.y + movement.y) {
                o.y += movement.y;
            } else if (
                movement.y > 0 &&
                o.y + movement.y + o.height < this.y + this.height
            ) {
                o.y += movement.y;
            }

            o.setActualMovement(movement);
        }
    }

    private checkCollisionsWithCat(): void {
        const playerCenter = getCenter(this.player);
        const catCenter = getCenter(this.cat);

        if (
            distance(playerCenter, catCenter) <
            (this.player.width + this.cat.width) * 0.3
        ) {
            this.state = LevelState.Lose;
        }
    }

    private checkCollisionsWithPlants(time: TimeStep): void {
        const playerTileIndex = getTileIndex(this.player);
        const playerCenter: Vector = getCenter(this.player);

        for (const o of this.tileMap.getNearbyObjects(playerTileIndex)) {
            if (o instanceof Flower) {
                const flowerCenter: Vector = getCenter(o);

                if (
                    distance(playerCenter, flowerCenter) <
                    (this.player.width + o.width) * 0.4
                ) {
                    o.hit(time);
                }
            }
        }
    }

    draw(time: TimeStep): void {
        const visibleArea = this.camera.getVisibleArea();
        const objectsToDraw: GameObject[] = [...this.animals];

        clearCanvas("rgb(0, 0, 0)");

        cx.save();
        cx.translate(0, this.levelDrawArea.y);

        this.camera.apply(cx, () => {
            // Default color for grass
            cx.fillStyle = "rgb(100, 200, 100)";
            cx.fillRect(this.x, this.y, this.width, this.height);

            this.tileMap.draw(visibleArea, objectsToDraw);
        });
        cx.restore();

        // The horizon is drawn after the tiles so that the tiles are sharply
        // "cut" at the horizon.
        drawHorizon(this.horizonDrawArea, 4); // TODO: Change based on y location in map

        cx.save();
        cx.translate(0, this.levelDrawArea.y);

        this.camera.apply(cx, () => {
            this.drawObjects(time, visibleArea, objectsToDraw);
        });

        cx.restore();

        drawRain(time.t, cx.canvas.width, cx.canvas.height);

        const elapsed = time.t - this.startTime;
        if (elapsed > NIGHT_START_TIME) {
            cx.save();
            cx.globalAlpha = Math.min(
                (elapsed - NIGHT_START_TIME) / 10000,
                0.7,
            ); // fade in to max 0.7
            cx.fillStyle = "#000";
            cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height);
            cx.restore();
        }
    }

    private drawObjects(
        time: TimeStep,
        visibleArea: Area,
        objectsToDraw: GameObject[],
    ): void {
        // Sort the objects so that objects in front get drawn after
        // objects behind them.
        objectsToDraw.sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2));

        for (let i = 0; i < objectsToDraw.length; i++) {
            const o = objectsToDraw[i];

            if (o.y + o.height * 0.5 < visibleArea.y) {
                // Skip objects that are over the horizon.
                continue;
            }

            o.draw(time);
        }
    }
}
