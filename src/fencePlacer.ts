import { Array2D } from "./Array2D";
import { random, randomInt } from "./core/math/random";
import { Fence } from "./Fence";
import { TILE_DRAW_HEIGHT, TILE_SIZE, TileType, type Tile } from "./tiles";

export class FencePlacer {
    leftEdgeFences = 0;
    rightEdgeFences = 0;

    readonly EDGE_THRESHOLD = 1; // column distance from edge that counts as "edge"
    readonly MIN_VERTICAL_SPACING = 4; // rows between fence spans in same column
    readonly MAX_FENCES_PER_COLUMN = 3; // soft cap per column
    readonly BOTTOM_MARGIN = 3; // number of rows at bottom where fences are disallowed

    private lastFenceRow: number[];
    private fenceCountPerColumn: number[];

    constructor(gridWidth: number) {
        this.lastFenceRow = new Array(gridWidth).fill(-9999);
        this.fenceCountPerColumn = new Array(gridWidth).fill(0);
    }

    private canPlaceFenceSpan(
        grid: Array2D<Tile>,
        iy: number,
        startIx: number,
        fenceTileCount: number,
    ): boolean {
        for (let k = 0; k < fenceTileCount; k++) {
            const ix = startIx + k;
            const t = grid.getValue(ix, iy);
            if (!t) return false;
            if (t.type === TileType.Slate) return false;

            // don't place near existing fence in same row
            for (let adj = -1; adj <= 1; adj++) {
                const checkIx = ix + adj;
                if (checkIx < 0 || checkIx >= grid.xCount) continue;
                const sameRowT = grid.getValue(checkIx, iy);
                if (
                    sameRowT &&
                    sameRowT.objects.some((o) => o instanceof Fence)
                ) {
                    return false;
                }
            }

            // vertical spacing per column
            if (
                Math.abs(iy - this.lastFenceRow[ix]) < this.MIN_VERTICAL_SPACING
            ) {
                return false;
            }
            if (this.fenceCountPerColumn[ix] >= this.MAX_FENCES_PER_COLUMN) {
                return false;
            }

            // don't place near existing fences in adjacent rows
            for (let dy = -1; dy <= 1; dy += 2) {
                const checkY = iy + dy;
                if (checkY < 0 || checkY >= grid.yCount) continue;
                for (let adj = -1; adj <= 1; adj++) {
                    const checkIx = ix + adj;
                    if (checkIx < 0 || checkIx >= grid.xCount) continue;
                    const t2 = grid.getValue(checkIx, checkY);
                    if (t2 && t2.objects.some((o) => o instanceof Fence)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    tryPlaceFence(
        grid: Array2D<Tile>,
        iy: number,
        y: number,
        fenceChance: number,
    ) {
        // Skip early rows and bottom margin rows
        if (
            iy <= 6 ||
            iy >= grid.yCount - this.BOTTOM_MARGIN ||
            random() >= fenceChance
        ) {
            return;
        }

        const fenceTileCount = 2 + randomInt(3); // 2..4 tiles wide
        const maxStart = Math.max(0, grid.xCount - fenceTileCount - 1);
        let startIx = 0;

        const needLeft = this.leftEdgeFences < 2;
        const needRight = this.rightEdgeFences < 2;

        for (let attempts = 0; attempts < 8; attempts++) {
            if (needLeft && attempts % 2 === 0) {
                startIx = Math.min(randomInt(3), maxStart);
            } else if (needRight && attempts % 2 === 1) {
                const span = Math.min(fenceTileCount, 3);
                startIx = Math.max(0, grid.xCount - span - randomInt(3));
            } else {
                startIx = randomInt(maxStart + 1);
                const center = Math.floor(grid.xCount / 2);
                if (
                    startIx > center - 2 &&
                    startIx + fenceTileCount < center + 2
                ) {
                    if (startIx <= center) {
                        startIx = Math.max(0, startIx - 2);
                    } else {
                        startIx = Math.min(maxStart, startIx + 2);
                    }
                }
            }

            if (this.canPlaceFenceSpan(grid, iy, startIx, fenceTileCount)) {
                break;
            }
        }

        if (!this.canPlaceFenceSpan(grid, iy, startIx, fenceTileCount)) return;

        const fx = startIx * TILE_SIZE;
        const fw = fenceTileCount * TILE_SIZE;
        const fence = new Fence(fx, y, fw);
        for (let k = 0; k < fenceTileCount; k++) {
            const ix = startIx + k;
            const t = grid.getValue(ix, iy);
            if (t) {
                const objs = t.objects.slice();
                objs.push(fence);
                grid.setValue(ix, iy, {
                    type: t.type,
                    objects: objs,
                });

                this.lastFenceRow[ix] = iy;
                this.fenceCountPerColumn[ix]++;
            }
        }

        if (startIx <= this.EDGE_THRESHOLD) {
            this.leftEdgeFences++;
        }
        if (
            startIx + fenceTileCount - 1 >=
            grid.xCount - 1 - this.EDGE_THRESHOLD
        ) {
            this.rightEdgeFences++;
        }
    }

    ensureEdgeFences(grid: Array2D<Tile>) {
        const targetPerSide = 2;
        for (const side of ["left", "right"]) {
            while (
                (side === "left" ? this.leftEdgeFences : this.rightEdgeFences) <
                targetPerSide
            ) {
                let placed = false;
                for (
                    let iy = 7;
                    iy < grid.yCount - this.BOTTOM_MARGIN && !placed;
                    iy++
                ) {
                    const fenceTileCount = 2 + randomInt(3);
                    if (side === "left") {
                        const startIx = 0;
                        if (
                            this.canPlaceFenceSpan(
                                grid,
                                iy,
                                startIx,
                                fenceTileCount,
                            )
                        ) {
                            const fx = startIx * TILE_SIZE;
                            const fw = fenceTileCount * TILE_SIZE;
                            const fence = new Fence(
                                fx,
                                iy * TILE_DRAW_HEIGHT,
                                fw,
                            );
                            for (let k = 0; k < fenceTileCount; k++) {
                                const ix = startIx + k;
                                const t = grid.getValue(ix, iy);
                                if (t) {
                                    const objs = t.objects.slice();
                                    objs.push(fence);
                                    grid.setValue(ix, iy, {
                                        type: t.type,
                                        objects: objs,
                                    });

                                    this.lastFenceRow[ix] = iy;
                                    this.fenceCountPerColumn[ix]++;
                                }
                            }
                            this.leftEdgeFences++;
                            placed = true;
                        }
                    } else {
                        const startIx = Math.max(
                            0,
                            grid.xCount - fenceTileCount,
                        );
                        if (
                            this.canPlaceFenceSpan(
                                grid,
                                iy,
                                startIx,
                                fenceTileCount,
                            )
                        ) {
                            const fx = startIx * TILE_SIZE;
                            const fw = fenceTileCount * TILE_SIZE;
                            const fence = new Fence(
                                fx,
                                iy * TILE_DRAW_HEIGHT,
                                fw,
                            );
                            for (let k = 0; k < fenceTileCount; k++) {
                                const ix = startIx + k;
                                const t = grid.getValue(ix, iy);
                                if (t) {
                                    const objs = t.objects.slice();
                                    objs.push(fence);
                                    grid.setValue(ix, iy, {
                                        type: t.type,
                                        objects: objs,
                                    });

                                    this.lastFenceRow[ix] = iy;
                                    this.fenceCountPerColumn[ix]++;
                                }
                            }
                            this.rightEdgeFences++;
                            placed = true;
                        }
                    }
                }
                if (!placed) break;
            }
        }
    }
}

export default FencePlacer;
