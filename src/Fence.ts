import type { GameObject } from "./GameObject";
import type { TimeStep } from "./core/time/TimeStep";
import { cx } from "./graphics";
import { TILE_DRAW_HEIGHT } from "./tiles";

export class Fence implements GameObject {
    x: number;
    y: number;
    width: number;
    height: number = TILE_DRAW_HEIGHT;

    constructor(x: number, y: number, width: number) {
        this.x = x;
        this.y = y;
        this.width = width;
    }

    draw(time: TimeStep): void {
        void time;
        cx.save();
        const postW = Math.max(1, Math.floor(this.width / 12));
        const posts = Math.max(2, Math.floor(this.width / (postW * 3)));

        // plank
        cx.fillStyle = "#6b3e1b";
        cx.fillRect(
            this.x,
            this.y + this.height * 0.25,
            this.width,
            this.height * 0.5,
        );

        // posts
        cx.fillStyle = "#3d260f";
        for (let i = 0; i < posts; i++) {
            const px = this.x + (i / (posts - 1)) * (this.width - postW);
            cx.fillRect(px, this.y, postW, this.height);
        }

        cx.restore();
    }
}
