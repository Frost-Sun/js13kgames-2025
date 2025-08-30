import type { GameObject } from "./GameObject";

export interface Space {
    getMouse(): GameObject;
}
