import { random } from "./core/math/random";
import type { TimeStep } from "./core/time/TimeStep";
import type { GameObject } from "./GameObject";
import { cx } from "./graphics";
import { TILE_DRAW_HEIGHT, TILE_SIZE } from "./tiles";

export class Bush implements GameObject {
    x: number;
    y: number;
    width: number = TILE_SIZE;
    height: number = TILE_DRAW_HEIGHT;

    // So that all the instances don't wobble in sync
    wobblePhase: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.wobblePhase = random(2 * Math.PI);
    }

    draw(time: TimeStep): void {
        cx.save();
        cx.translate(this.x + this.width / 2, this.y);

        this.drawPart(
            time,
            this.width * 0.45,
            this.width * 0.5,
            "rgb(60, 150, 80)",
        );
        this.drawPart(
            time,
            this.width * 0.35,
            this.width * 0.4,
            "rgb(55, 145, 75)",
        );

        cx.restore();
    }

    private drawPart(
        time: TimeStep,
        rx: number,
        ry: number,
        color: string,
    ): void {
        cx.save();

        cx.rotate(Math.sin(time.t * 0.001 + rx * ry + this.wobblePhase) * 0.04);
        cx.translate(0, -ry + this.height / 2);

        cx.fillStyle = color;
        cx.beginPath();
        cx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        cx.fill();

        cx.restore();
    }
}
