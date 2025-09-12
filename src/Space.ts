import type { Area } from "./core/math/Area";
import type { Vector } from "./core/math/Vector";
import type { TimeStep } from "./core/time/TimeStep";
import { TILE_DRAW_HEIGHT } from "./tiles";

export const SOUND_FADE_DISTANCE = 50 * TILE_DRAW_HEIGHT;

export type Observation = {
    t: number;
    position: Vector;
    accuracy: number;
};

export interface Space extends Area {
    lookForMouse(time: TimeStep): Observation;
    listen(time: TimeStep, listenerPosition: Vector): Observation | null;
}
