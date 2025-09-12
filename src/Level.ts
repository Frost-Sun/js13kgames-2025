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
import {
    canvas,
    clearCanvas,
    cx,
    drawRain,
    drawThunder,
    updateThunder,
} from "./graphics";
import { PartialArea } from "./PartialArea";
import { Mouse } from "./Mouse";
import { drawHorizon } from "./horizon";
import { getTileIndexOfObject, TileMap } from "./TileMap";
import type { GameObject } from "./GameObject";
import { Flower } from "./Flower";
import { distance, multiply, type Vector } from "./core/math/Vector";
import { BlackCat } from "./BlackCat";
import { SOUND_FADE_DISTANCE, type Observation, type Space } from "./Space";
import type { Animal } from "./Animal";
import { createIntroMap, createMap } from "./maps";
import {
    GRASS_COLOR,
    speedByTile,
    stepVolumeByTile,
    TILE_DRAW_HEIGHT,
    TILE_SIZE,
} from "./tiles";
import { playTune, SFX_RUNNING } from "./audio/sfx";
import { Bush } from "./Bush";
import { renderGradient } from "./core/graphics/gradient";
import { renderText, TextSize } from "./text";

const HORIZON_HEIGHT_OF_CANVAS = 0.25;

const NIGHT_FADE_DURATION = 240000; // 4 minutes in ms

let GAME_START_TIME = performance.now();

export function resetGameStartTime() {
    GAME_START_TIME = performance.now();
}

export enum LevelState {
    Running,
    Lose,
    Finished,
}

export class Level implements Area, Space {
    private setupPlayerAndCamera(player: Mouse, cat?: BlackCat) {
        this.player = player;
        this.cat = cat;
        this.animals = cat ? [player, cat] : [player];
        this.camera = new Camera(this, this.levelDrawArea);
        this.camera.zoom = 15;
        this.camera.follow(this.player);
    }
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

    private tileMap: TileMap;

    private camera!: Camera;

    state: LevelState = LevelState.Running;

    x: number = 0;
    y: number = 0;
    width: number;
    height: number;

    private player!: Mouse;
    private latestSoundByPlayer?: Observation;
    private cat?: BlackCat;

    private animals!: Animal[];

    constructor(public number: number) {
        if (number === 0) {
            // Use intro map from maps.ts
            const grid = createIntroMap();
            this.tileMap = new TileMap(grid);
            this.width = grid.xCount * TILE_SIZE;
            this.height = grid.yCount * TILE_DRAW_HEIGHT;
            // Place mouse at bottom center
            const mouse = new Mouse(
                Math.floor(grid.xCount / 2) * TILE_SIZE + TILE_SIZE / 2 - 1.5,
                this.height - TILE_DRAW_HEIGHT - 1,
            );
            this.setupPlayerAndCamera(mouse);
            return;
        }

        this.tileMap = new TileMap(createMap(number));
        this.width = this.tileMap.width;
        this.height = this.tileMap.height;

        const player = new Mouse(
            this.width * 0.5,
            this.height - TILE_DRAW_HEIGHT,
        );
        const cat = new BlackCat(
            this.width * 0.4,
            this.height * 0.3,
            this,
            player,
        );
        this.setupPlayerAndCamera(player, cat);
    }

    listen(time: TimeStep, listenerPosition: Vector): Observation | null {
        if (
            this.latestSoundByPlayer &&
            time.t - this.latestSoundByPlayer.t < 500
        ) {
            const d = distance(
                listenerPosition,
                this.latestSoundByPlayer.position,
            );
            const fadeFactor = Math.max(0, 1 - d / SOUND_FADE_DISTANCE);

            return {
                ...this.latestSoundByPlayer,
                accuracy: this.latestSoundByPlayer.accuracy * fadeFactor,
            };
        }

        return null;
    }

    lookForMouse(time: TimeStep): Observation {
        const mouse = this.player;

        return {
            t: time.t,
            position: getCenter(this.player),
            accuracy: this.tileMap.getVisibility(mouse),
        };
    }

    update(time: TimeStep): void {
        this.camera.update();

        this.calculateMovement(time);

        if (
            this.state === LevelState.Running &&
            this.playerHasReachedFinish()
        ) {
            this.state = LevelState.Finished;
            playTune(SFX_RUNNING);
            return;
        }

        this.checkCollisionsWithCat();
        this.checkCollisionsWithPlants(time);

        updateThunder(time.t);
    }

    private calculateMovement(time: TimeStep): void {
        for (let i = 0; i < this.animals.length; i++) {
            const o = this.animals[i];
            let movement = o.getMovement(time);

            if (o instanceof Mouse) {
                // Speed according to tile type
                const tileIndex = getTileIndexOfObject(this.player);
                const tile = this.tileMap.getTile(tileIndex);
                const multiplier = tile ? speedByTile[tile.type] : 1;
                movement = multiply(movement, multiplier);
            }

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

            const step = (tune: string): void => {
                const tile = this.tileMap.getTile(getTileIndexOfObject(o));
                const volume: number = tile ? stepVolumeByTile[tile.type] : 1;
                playTune(tune, volume);
                if (o instanceof Mouse) {
                    this.latestSoundByPlayer = {
                        position: getCenter(o),
                        accuracy: volume,
                        t: time.t,
                    };
                }
            };

            o.setActualMovement(movement, step);
        }
    }

    private playerHasReachedFinish(): boolean {
        const holeWidth = TILE_SIZE / 2;
        return (
            this.player.y < TILE_DRAW_HEIGHT * 0.1 &&
            this.width / 2 - holeWidth / 2 <= this.player.x &&
            this.player.x + this.player.width <= this.width / 2 + holeWidth / 2
        );
    }

    private checkCollisionsWithCat(): void {
        if (!this.cat) return;
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
        const playerTileIndex = getTileIndexOfObject(this.player);
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
            cx.fillStyle = GRASS_COLOR;
            cx.fillRect(this.x, this.y, this.width, this.height);

            this.tileMap.draw(visibleArea, objectsToDraw);
        });
        cx.restore();

        // The horizon is drawn after the tiles so that the tiles are sharply
        // "cut" at the horizon.
        const backgroundScrollAmount =
            -(this.camera.x - this.width / 2) * this.camera.zoom;
        // Calculate player progress: 0 at bottom, 1 at top
        let progress = 1 - this.player.y / (this.height - TILE_DRAW_HEIGHT);
        progress = Math.max(0, Math.min(1, progress));

        // In intro level, always show horizon as if finished (mouse hole/fence fully visible)
        if (this.number === 0) {
            progress = 1;
        }

        drawHorizon(
            time,
            this.horizonDrawArea,
            4,
            backgroundScrollAmount,
            progress,
            this.cat,
        );

        cx.save();
        cx.translate(0, this.levelDrawArea.y);

        this.camera.apply(cx, () => {
            this.drawObjects(time, visibleArea, objectsToDraw);
        });

        cx.restore();

        // Show instruction in intro level
        if (this.number === 0) {
            renderText(
                "Find the mouse holes to the next backyards.",
                TextSize.Small,
            );
            renderText(
                "Be quiet, hide in bushes or the black cat catches you!",
                TextSize.Small,
                1,
                2,
            );
            renderText("Use arrow keys or WASD to move.", TextSize.Small, 1, 6);
        }

        drawRain(time.t, canvas.width, canvas.height);

        const elapsed = time.t - GAME_START_TIME;
        cx.save();
        cx.globalAlpha = Math.min(elapsed / NIGHT_FADE_DURATION, 0.9);
        cx.fillStyle = "#000";
        cx.fillRect(0, 0, canvas.width, canvas.height);
        cx.restore();

        drawThunder();

        renderGradient(canvas, cx, 0.9);
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

            if (o instanceof Bush && isBehind(this.player, o)) {
                cx.save();
                cx.globalAlpha = 0.3;
                o.draw(time);
                cx.restore();
            } else {
                o.draw(time);
            }
        }
    }
}
const isBehind = (o: GameObject, obstacle: GameObject): boolean =>
    o.y + o.height / 2 < obstacle.y + obstacle.height / 2 &&
    obstacle.y - 4 * TILE_DRAW_HEIGHT < o.y &&
    obstacle.x <= o.x &&
    o.x + o.width <= obstacle.x + obstacle.width;
