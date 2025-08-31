import type { GameObject } from "./GameObject";

export interface Sighting {
    target: GameObject;

    /**
     * 0-1, how much the target is visible.
     */
    visibility: number;
}

export interface Space {
    lookForMouse(): Sighting;
}
