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
import { getCenter, includesPoint, type Area } from "./core/math/Area";
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
import { Fence } from "./Fence";
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
import { FenceState, JUMP_DURATION } from "./CatAi";

const HORIZON_HEIGHT_OF_CANVAS = 0.25;

const NIGHT_FADE_DURATION = 240000; // 4 minutes in ms

let GAME_START_TIME = performance.now();

// Fixed alpha to use when the player is under a bush (keep it constant)
// Increase this value to make the bush less transparent (1 = opaque).
const BUSH_UNDER_ALPHA = 0.6;

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
        this.camera.visibleAreaHeight = 20 * TILE_DRAW_HEIGHT;
        this.camera.yAdjust = -(1 / 4);
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

    private camera: Camera = new Camera(this, this.levelDrawArea);
    private transitionStartTime: number | null = null;
    private transitionDone = false;

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
        this.camera.update(time);

        this.calculateMovement(time);

        const holeWidth = TILE_SIZE / 2;
        const playerHasReachedFinish: boolean =
            this.player.y < TILE_DRAW_HEIGHT * 0.1 &&
            this.width / 2 - holeWidth / 2 <= this.player.x &&
            this.player.x + this.player.width <= this.width / 2 + holeWidth / 2;

        if (this.state === LevelState.Running && playerHasReachedFinish) {
            this.state = LevelState.Finished;
            playTune(SFX_RUNNING);
            return;
        }

        // Camera effect when the cat is jumping
        if (
            !this.transitionStartTime &&
            this.cat?.ai.fenceState == FenceState.Jumped &&
            !this.cat?.ai.isOnLevel
        ) {
            this.transitionStartTime = time.t;
            const playerPos = getCenter(this.player);

            this.camera.setTransition(time, {
                to: this.cat.ai.jumpTarget ?? playerPos,
                duration: 1000,
            });
        } else if (
            !this.transitionDone &&
            this.transitionStartTime &&
            JUMP_DURATION + 500 < time.t - this.transitionStartTime
        ) {
            this.transitionDone = true;
            this.camera.follow(this.player);
        }

        // Check collision with the cat
        if (this.cat?.ai.isOnLevel) {
            const playerCenter = getCenter(this.player);
            const catCenter = getCenter(this.cat);
            if (
                distance(playerCenter, catCenter) <
                (this.player.width + this.cat.width) * 0.3
            ) {
                // Teleport the cat to the mouse's position so the capture visually completes immediately
                const target = getCenter(this.player);
                this.cat.x = target.x - this.cat.width / 2;
                this.cat.y = target.y - this.cat.height * 0.2;
                this.state = LevelState.Lose;
            }
        }

        // Check collisions with plants
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

            // Default movement application (for non-mouse animals)
            if (!(o instanceof Mouse)) {
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
            } else {
                // For the player mouse: perform swept collision against fences
                const dx = movement.x;
                const dy = movement.y;
                let allowedDx = dx;
                let allowedDy = dy;

                const proposedLeft = Math.min(o.x, o.x + dx);
                const proposedRight = Math.max(
                    o.x + o.width,
                    o.x + dx + o.width,
                );
                const proposedTop = Math.min(o.y, o.y + dy);
                const proposedBottom = Math.max(
                    o.y + o.height,
                    o.y + dy + o.height,
                );

                // Small epsilon to avoid slipping through due to floating point
                // or tiny gaps when moving exactly along the fence edge.
                const COLLISION_EPS = 0.5;

                // Convert proposed bbox to tile indices (widen by 1 tile to be safe)
                const totalXTiles = Math.floor(this.width / TILE_SIZE);
                const totalYTiles = Math.floor(this.height / TILE_DRAW_HEIGHT);
                const tileLeft = Math.max(
                    0,
                    Math.floor(proposedLeft / TILE_SIZE) - 1,
                );
                const tileRight = Math.min(
                    totalXTiles - 1,
                    Math.floor(proposedRight / TILE_SIZE) + 1,
                );
                const tileTop = Math.max(
                    0,
                    Math.floor(proposedTop / TILE_DRAW_HEIGHT) - 1,
                );
                const tileBottom = Math.min(
                    totalYTiles - 1,
                    Math.floor(proposedBottom / TILE_DRAW_HEIGHT) + 1,
                );

                // Collect fences from covered tiles (for horizontal check)
                const fencesH: Fence[] = [];
                for (let iy = tileTop; iy <= tileBottom; iy++) {
                    for (let ix = tileLeft; ix <= tileRight; ix++) {
                        const tile = this.tileMap.getTile({ ix, iy });
                        if (!tile) continue;
                        for (const obj of tile.objects) {
                            if (obj instanceof Fence) fencesH.push(obj);
                        }
                    }
                }

                // Horizontal blocking using fencesH
                for (const f of fencesH) {
                    if (
                        !(
                            proposedBottom <= f.y + COLLISION_EPS ||
                            proposedTop >= f.y + f.height - COLLISION_EPS
                        )
                    ) {
                        if (dx > 0) {
                            const gap = f.x - (o.x + o.width);
                            if (gap >= -COLLISION_EPS) {
                                allowedDx = Math.min(
                                    allowedDx,
                                    Math.max(0, gap),
                                );
                            }
                        } else if (dx < 0) {
                            const gapLeft = o.x - (f.x + f.width);
                            if (gapLeft >= -COLLISION_EPS) {
                                allowedDx = Math.max(
                                    allowedDx,
                                    Math.min(0, -gapLeft),
                                );
                            }
                        }
                    }
                }

                // Clamp horizontal to level bounds and apply immediately
                if (dx > 0) {
                    const maxRight = this.x + this.width - (o.x + o.width);
                    allowedDx = Math.min(allowedDx, maxRight);
                } else {
                    const maxLeft = this.x - o.x;
                    allowedDx = Math.max(allowedDx, maxLeft);
                }

                if (Math.abs(allowedDx) > 1e-6) o.x += allowedDx;

                // Recompute horizontal extents after applied dx to check vertical collisions
                const newLeft = o.x;
                const newRight = o.x + o.width;
                const vProposedTop = Math.min(o.y, o.y + dy);
                const vProposedBottom = Math.max(
                    o.y + o.height,
                    o.y + dy + o.height,
                );

                // Determine tile range for vertical checks (widen by 1)
                const vTileLeft = Math.max(
                    0,
                    Math.floor(newLeft / TILE_SIZE) - 1,
                );
                const vTileRight = Math.min(
                    Math.floor(this.width / TILE_SIZE) - 1,
                    Math.floor(newRight / TILE_SIZE) + 1,
                );
                const vTileTop = Math.max(
                    0,
                    Math.floor(vProposedTop / TILE_DRAW_HEIGHT) - 1,
                );
                const vTileBottom = Math.min(
                    Math.floor(this.height / TILE_DRAW_HEIGHT) - 1,
                    Math.floor(vProposedBottom / TILE_DRAW_HEIGHT) + 1,
                );

                const fencesV: Fence[] = [];
                for (let iy = vTileTop; iy <= vTileBottom; iy++) {
                    for (let ix = vTileLeft; ix <= vTileRight; ix++) {
                        const tile = this.tileMap.getTile({ ix, iy });
                        if (!tile) continue;
                        for (const obj of tile.objects) {
                            if (obj instanceof Fence) fencesV.push(obj);
                        }
                    }
                }

                // Vertical blocking using fencesV
                for (const f of fencesV) {
                    if (
                        !(
                            newRight <= f.x + COLLISION_EPS ||
                            newLeft >= f.x + f.width - COLLISION_EPS
                        )
                    ) {
                        if (dy > 0) {
                            const gap = f.y - (o.y + o.height);
                            if (gap >= -COLLISION_EPS) {
                                allowedDy = Math.min(
                                    allowedDy,
                                    Math.max(0, gap),
                                );
                            }
                        } else if (dy < 0) {
                            const gapUp = o.y - (f.y + f.height);
                            if (gapUp >= -COLLISION_EPS) {
                                allowedDy = Math.max(
                                    allowedDy,
                                    Math.min(0, -gapUp),
                                );
                            }
                        }
                    }
                }

                // Clamp vertical to level bounds and apply
                if (dy > 0) {
                    const maxDown = this.y + this.height - (o.y + o.height);
                    allowedDy = Math.min(allowedDy, maxDown);
                } else {
                    const maxUp = this.y - o.y;
                    allowedDy = Math.max(allowedDy, maxUp);
                }

                if (Math.abs(allowedDy) > 1e-6) o.y += allowedDy;
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

        cx.save();
        const horizonY = HORIZON_HEIGHT_OF_CANVAS * canvas.height;
        const fadeGradient = cx.createLinearGradient(
            0,
            canvas.height,
            0,
            horizonY,
        );
        fadeGradient.addColorStop(0, "rgba(0,0,0,0)");
        fadeGradient.addColorStop(1, "rgba(0,0,0,0.15)");
        cx.fillStyle = fadeGradient;
        cx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);
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

        // Draw objects on the level
        this.camera.apply(cx, () => {
            // Sort the objects so that objects in front get drawn after
            // objects behind them.
            objectsToDraw.sort(
                (a, b) => a.y + a.height / 2 - (b.y + b.height / 2),
            );

            // Determine if the player is currently under any bush so we can
            // optionally make the mouse transparent instead of the bush.
            const playerCenter = getCenter(this.player);
            const playerTileIndex = getTileIndexOfObject(this.player);
            let bushUnderPlayer: Bush | null = null;
            for (const obj of this.tileMap.getNearbyObjects(playerTileIndex)) {
                if (obj instanceof Bush && includesPoint(obj, playerCenter)) {
                    bushUnderPlayer = obj;
                    break;
                }
            }

            for (let i = 0; i < objectsToDraw.length; i++) {
                const o = objectsToDraw[i];

                if (o.y + o.height * 0.5 < visibleArea.y) {
                    // Skip objects that are over the horizon.
                    continue;
                }

                // If this is a bush that the player is under, draw the bush
                // slightly transparent so the player can be seen through it.
                if (
                    o instanceof Bush &&
                    bushUnderPlayer &&
                    includesPoint(o, playerCenter)
                ) {
                    // If the cat is actively chasing and its chase target lies
                    // inside this bush, keep the bush opaque so the chase is
                    // visually clear. Otherwise use a fixed semi-transparent
                    // rendering so the player can be seen under it.
                    const catAi = this.cat?.ai;
                    const catIsChasing = !!catAi && catAi.isChasing;
                    const chaseTarget = catAi?.chaseTarget ?? null;
                    const jumpTarget = catAi?.jumpTarget;

                    const targetInsideBush =
                        // If chasing, and the chase target is inside the bush
                        (catIsChasing && chaseTarget
                            ? includesPoint(o, chaseTarget)
                            : false) ||
                        // Or if the cat's jump target (when jumping) is inside
                        // the bush — this covers cases where the AI set a
                        // landing point instead of the sighting.
                        (jumpTarget ? includesPoint(o, jumpTarget) : false);

                    if (targetInsideBush) {
                        o.draw(time);
                    } else {
                        cx.save();
                        cx.globalAlpha = BUSH_UNDER_ALPHA;
                        o.draw(time);
                        cx.restore();
                    }

                    continue;
                }

                // Keep the mouse visible if the cat is actively chasing into
                // that same bush.
                if (o instanceof Mouse) {
                    const catAi = this.cat?.ai;
                    const catIsChasing = !!catAi && catAi.isChasing;
                    const chaseTarget = catAi?.chaseTarget ?? null;

                    const targetInsideBush =
                        catIsChasing && chaseTarget && bushUnderPlayer
                            ? includesPoint(bushUnderPlayer, chaseTarget)
                            : false;

                    if (bushUnderPlayer && !targetInsideBush) {
                        // Dynamically darken the mouse based on tile visibility so
                        // lower visibility (deeper hiding) results in a darker
                        // rendering while still keeping the player visible.
                        const vis = this.tileMap.getVisibility(this.player);
                        // Map visibility [0..1] -> brightness [0.4..1.0] and clamp
                        const raw = 0.4 + vis * 0.6;
                        const clamped = Math.min(1, raw);
                        const brightness = Math.max(0.2, clamped);
                        cx.save();
                        cx.filter = `brightness(${brightness})`;
                        o.draw(time);
                        cx.restore();
                    } else {
                        o.draw(time);
                    }

                    continue;
                }

                // Draw everything else normally (including bushes — we no
                // longer change their alpha here).
                o.draw(time);
            }
        });

        cx.restore();

        // Show instruction in intro level
        if (this.number === 0) {
            renderText("It's almost midnight.", TextSize.Small);
            renderText(
                "Find the mouse hole to the next backyard.",
                TextSize.Small,
                1,
                2,
            );
            renderText(
                "Stay quiet — don't wake the cat.",
                TextSize.Small,
                1,
                4,
            );
            renderText(
                "If you're spotted, hide in bushes or run!",
                TextSize.Small,
                1,
                6,
            );
            renderText(
                "Or the black cat will catch you!",
                TextSize.Small,
                1,
                8,
            );
            renderText("Move with Arrow keys or WASD.", TextSize.Small, 1, 12);
        }

        drawRain(time.t, canvas.width, canvas.height);

        const elapsed = time.t - GAME_START_TIME;
        cx.save();
        cx.globalAlpha = Math.min(elapsed / NIGHT_FADE_DURATION, 0.9);
        cx.fillStyle = "#001";
        cx.fillRect(0, 0, canvas.width, canvas.height);
        cx.restore();

        drawThunder();

        renderGradient(canvas, cx, 0.9);
    }
}
