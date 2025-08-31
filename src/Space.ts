import type { Mouse } from "./Mouse";

export interface Sighting {
    target: Mouse;

    /**
     * 0-1, how much the target is visible.
     */
    visibility: number;
}

export interface Space {
    lookForMouse(): Sighting;
}
