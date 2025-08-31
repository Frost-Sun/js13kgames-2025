import type { Vector } from "./core/math/Vector";
import type { TimeStep } from "./core/time/TimeStep";
import type { Mouse } from "./Mouse";

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

export interface Space {
    lookForMouse(): Sighting;
    listen(time: TimeStep): Sound | null;
}
