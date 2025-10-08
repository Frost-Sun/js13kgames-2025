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
import { Fence } from "./Fence";
import FencePlacer from "./fencePlacer";
import { getDifficulty, Difficulty } from "./settings";
import { Flower } from "./Flower";
import { Bush } from "./Bush";

export const createMap = (number: number): Array2D<Tile> => {
    const grid = new Array2D<Tile>(11, 65 + number * 5);

    const plantPropability = Math.max(0.1, 0.8 - number * 0.05);
    const bushPropability = Math.max(0.1, 0.35 - number * 0.05);

    const BASE_FENCE_CHANCE = 0.12;
    // Scale with difficulty (number or global setting)
    const settingsDifficulty = getDifficulty();
    const settingsNumber = settingsDifficulty === Difficulty.Hard ? 1 : 0;
    const effectiveDifficulty = Math.max(number, settingsNumber);
    const fenceChance = Math.min(
        0.5,
        BASE_FENCE_CHANCE + effectiveDifficulty * 0.05,
    );

    const turningYIndices: number[] = [4, 12, 18, 29, 34, 41, 47];

    // Note: Paving the road starts from the top of the map!
    let ixPath = 3 + randomInt(5);
    let previousIxPath: number = ixPath;

    // fence placement is handled by FencePlacer
    const fencePlacer = new FencePlacer(grid.xCount);

    for (let iy = 0; iy < grid.yCount; iy++) {
        const y = iy * TILE_DRAW_HEIGHT;

        if (turningYIndices.includes(iy)) {
            previousIxPath = ixPath;
            ixPath = 1 + randomInt(grid.xCount - 1);

            // Add horizontal road
            const ixMin = Math.min(previousIxPath, ixPath);
            const ixMax = Math.max(previousIxPath, ixPath);

            for (let ix = ixMin; ix < ixMax + 1; ix++) {
                const x = ix * TILE_SIZE;

                const tile = createTile(
                    TileType.Slate,
                    x,
                    iy * TILE_DRAW_HEIGHT,
                );
                grid.setValue(ix, iy, tile);
            }
        } else if (turningYIndices.includes(iy - 1)) {
            // Add another horizontal road so that it's not too thin.
            const ixMin = Math.min(previousIxPath, ixPath);
            const ixMax = Math.max(previousIxPath, ixPath);

            for (let ix = ixMin; ix < ixMax + 1; ix++) {
                const x = ix * TILE_SIZE;

                const tile = createTile(
                    TileType.Slate,
                    x,
                    iy * TILE_DRAW_HEIGHT,
                );
                grid.setValue(ix, iy, tile);
            }
        } else {
            const ix = ixPath;
            const x = ix * TILE_SIZE;
            const tile = createTile(TileType.Slate, x, y);
            grid.setValue(ix, iy, tile);
        }

        for (let ix = 0; ix < grid.xCount; ix++) {
            const existing = grid.getValue(ix, iy);
            if (existing) {
                continue;
            }

            const x = ix * TILE_SIZE;
            let tileType =
                random() < plantPropability
                    ? random() < bushPropability
                        ? TileType.Bush
                        : TileType.Flower
                    : TileType.Grass;

            if (isInFrontOfMouseHole(grid, ix, iy)) {
                // Make sure that the mouse hole is visible.
                tileType = TileType.Grass;
            }

            const tile = createTile(tileType, x, y);
            grid.setValue(ix, iy, tile);
        }

        // Delegate fence placement to FencePlacer (handles spacing, adjacency and edge guarantees)
        fencePlacer.tryPlaceFence(grid, iy, y, fenceChance);
    }

    // If edge fences are under the required minimum, try to add additional fences
    // let the fence placer ensure minimum edge fences (it will respect spacing)
    fencePlacer.ensureEdgeFences(grid);

    // Post-process: nudge plant objects away from road tiles when necessary
    const V_MARGIN = Math.max(1, Math.floor(TILE_DRAW_HEIGHT * 0.6));
    const H_MARGIN = Math.max(1, Math.floor(TILE_SIZE * 0.15));
    for (let iy = 0; iy < grid.yCount; iy++) {
        for (let ix = 0; ix < grid.xCount; ix++) {
            const t = grid.getValue(ix, iy);
            if (!t) continue;

            // If there's a fence object on this tile, remove plant visuals
            // but preserve fence objects so collision stays intact.
            const hasFence = t.objects.some((o) => o instanceof Fence);
            if (
                hasFence &&
                (t.type === TileType.Flower || t.type === TileType.Bush)
            ) {
                // Keep fence objects but remove plant visuals: set tile to Grass
                const fenceObjs = t.objects.filter((o) => o instanceof Fence);
                grid.setValue(ix, iy, {
                    type: TileType.Grass,
                    objects: fenceObjs,
                });
                continue;
            }

            // If neighboring tiles are Slate, nudge/inset plant objects vertically and slightly horizontally
            const above = iy - 1 >= 0 ? grid.getValue(ix, iy - 1) : null;
            const below =
                iy + 1 < grid.yCount ? grid.getValue(ix, iy + 1) : null;
            const left = ix - 1 >= 0 ? grid.getValue(ix - 1, iy) : null;
            const right =
                ix + 1 < grid.xCount ? grid.getValue(ix + 1, iy) : null;

            if (t.type === TileType.Flower) {
                const objs = t.objects.slice();
                for (const o of objs) {
                    if (!(o instanceof Flower)) continue;
                    const tileTop = iy * TILE_DRAW_HEIGHT;
                    const tileLeft = ix * TILE_SIZE;
                    const tileRight = tileLeft + TILE_SIZE;

                    // if Slate is below, move flower up so shadow/petals don't overlap road
                    if (below && below.type === TileType.Slate) {
                        o.y = Math.min(
                            o.y,
                            tileTop + TILE_DRAW_HEIGHT - V_MARGIN - o.height,
                        );
                    }
                    // if Slate is above, move flower down so it doesn't overlap
                    if (above && above.type === TileType.Slate) {
                        o.y = Math.max(o.y, tileTop + V_MARGIN);
                    }

                    // Small horizontal nudges if adjacent horizontally to Slate
                    if (left && left.type === TileType.Slate) {
                        o.x = Math.max(o.x, tileLeft + H_MARGIN);
                    }
                    if (right && right.type === TileType.Slate) {
                        o.x = Math.min(o.x, tileRight - H_MARGIN - o.width);
                    }

                    // clamp inside tile
                    o.x = Math.max(
                        tileLeft + 0.1,
                        Math.min(o.x, tileRight - o.width - 0.1),
                    );
                    o.y = Math.max(
                        tileTop + 0.1,
                        Math.min(
                            o.y,
                            tileTop + TILE_DRAW_HEIGHT - o.height - 0.1,
                        ),
                    );
                }
                grid.setValue(ix, iy, { type: t.type, objects: objs });
            } else if (t.type === TileType.Bush) {
                const objs = t.objects.slice();
                if (objs.length > 0) {
                    const b = objs[0];
                    if (b instanceof Bush) {
                        const tileTop = iy * TILE_DRAW_HEIGHT;
                        if (below && below.type === TileType.Slate) {
                            // shrink height so shadow doesn't cross into road below
                            b.height = Math.max(
                                0.1,
                                TILE_DRAW_HEIGHT - V_MARGIN,
                            );
                            b.y = tileTop + (TILE_DRAW_HEIGHT - b.height);
                        }
                        if (above && above.type === TileType.Slate) {
                            b.y = tileTop + V_MARGIN;
                            b.height = Math.max(
                                0.1,
                                TILE_DRAW_HEIGHT - V_MARGIN,
                            );
                        }
                        grid.setValue(ix, iy, { type: t.type, objects: objs });
                    }
                }
            }
        }
    }

    return grid;
};

// After map creation, ensure plants don't overlap fences visually.
// This function can be used by higher-level code if needed.
export const postProcessPlantsAgainstFences = (grid: Array2D<Tile>): void => {
    for (let iy = 0; iy < grid.yCount; iy++) {
        for (let ix = 0; ix < grid.xCount; ix++) {
            const t = grid.getValue(ix, iy);
            if (!t) continue;
            // If there's a fence object on this tile, remove plants from this tile
            // so they don't render over the fence. Prefer to keep fence visuals.
            const hasFence = t.objects.some((o) => o instanceof Fence);
            if (
                hasFence &&
                (t.type === TileType.Flower || t.type === TileType.Bush)
            ) {
                const fenceObjs = t.objects.filter((o) => o instanceof Fence);
                grid.setValue(ix, iy, {
                    type: TileType.Grass,
                    objects: fenceObjs,
                });
            }
        }
    }
};

const isInFrontOfMouseHole = (
    grid: Array2D<Tile>,
    ix: number,
    iy: number,
): boolean => {
    return ix === Math.floor(grid.xCount / 2) && iy < 6;
};

export const createIntroMap = (): Array2D<Tile> => {
    const introWidth = 10;
    const introHeight = 18;
    const grid = new Array2D<Tile>(introWidth, introHeight);
    const roadStart = Math.floor(introHeight / 2) - 1;
    const roadEnd = roadStart + 8;
    for (let iy = 0; iy < introHeight; iy++) {
        for (let iy = 0; iy < introHeight; iy++) {
            for (let ix = 0; ix < introWidth; ix++) {
                const x = ix * TILE_SIZE;
                const y = iy * TILE_DRAW_HEIGHT;
                let type = TileType.Grass;
                // Place bushes and flowers at fixed positions, not in the road area
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
                if (iy >= roadStart && iy < roadEnd) type = TileType.Slate;
                grid.setValue(ix, iy, createTile(type, x, y));
            }
        }
    }
    return grid;
};
