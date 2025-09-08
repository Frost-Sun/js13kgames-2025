import type { Area } from "./core/math/Area";
import type { Vector } from "./core/math/Vector";
import type { TimeStep } from "./core/time/TimeStep";
import type { Mouse } from "./Mouse";
import { TILE_DRAW_HEIGHT } from "./tiles";

export const SOUND_FADE_DISTANCE = 25 * TILE_DRAW_HEIGHT;

export interface SpaceWithMouse extends Space {
    mouse?: Mouse;
}
export interface Sighting {
    target: Mouse;

    /**
     * 0-1, how much the target is visible.
     */
    visibility: number;
}

export interface Sound {
    position: Vector;
    volume: number;
}

export interface Space extends Area {
    lookForMouse(): Sighting;
    listen(time: TimeStep, listenerPosition: Vector): Sound | null;
}
