/*
 * Copyright (c) 2024 - 2025 Tero Jäntti, Sami Heikkinen
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

import type { Area, Dimensions } from "../math/Area";
import type { Vector } from "../math/Vector";
import type { TimeStep } from "../time/TimeStep";

export interface TransitionParameters {
    readonly to: Vector;
    readonly visibleAreaHeight?: number;
    readonly duration: number;
    readonly easing: (x: number) => number;
}

interface Transition extends Omit<TransitionParameters, "zoom"> {
    readonly from: Vector;
    readonly fromVisibleAreaHeight: number;
    readonly toVisibleAreaHeight: number;
    readonly startTime: number;
    readonly resolve: () => void;
}

export class Camera {
    x = 0;
    y = 0;

    // How much of the level should be visible within the camera view in the y-direction.
    visibleAreaHeight: number = 1;

    // The actual zoom factor. Do not set directly, use visibleAreaHeight instead.
    zoom = 1;

    // Adjusts the camera y position, relative to the visible level
    // area.
    yAdjust: number = 0;

    private target: Area | null = null;
    private transition: Transition | null = null;

    constructor(
        private level: Area,
        private view: Dimensions,
    ) {}

    // Returns the area of the level that is currently visible on the
    // camera.
    getVisibleArea(): Area {
        const width = this.view.width / this.zoom;
        const height = this.view.height / this.zoom;

        return {
            x: this.x - width / 2,
            y: this.y - height / 2,
            width,
            height,
        };
    }

    // zoomToLevel(): void {
    //     this.target = null;

    //     this.x = this.level.x + this.level.width / 2;
    //     this.y = this.level.y + this.level.height / 2;

    //     if (
    //         this.level.width / this.level.height >=
    //         this.view.width / this.view.height
    //     ) {
    //         this.zoom = this.view.width / this.level.width;
    //     } else {
    //         this.zoom = this.view.height / this.level.height;
    //     }
    // }

    follow(target: Area | null): void {
        this.target = target;
    }

    setTransition(
        time: TimeStep,
        parameters: TransitionParameters,
    ): Promise<void> {
        return new Promise((resolve) => {
            this.target = null;
            this.transition = {
                ...parameters,
                from: { x: this.x, y: this.y },
                fromVisibleAreaHeight: this.visibleAreaHeight,
                toVisibleAreaHeight:
                    parameters.visibleAreaHeight ?? this.visibleAreaHeight,
                startTime: time.t,
                resolve,
            };
        });
    }

    /**
     * Applies camera view when drawing. Drawing within this
     * method is done in level coordinates. On the other hand,
     * drawing outside of this method happens in the pixel
     * coordinates of the screen.
     */
    apply(cx: CanvasRenderingContext2D, draw: () => void): void {
        cx.save();
        cx.translate(this.view.width / 2, this.view.height / 2);
        cx.scale(this.zoom, this.zoom);
        cx.translate(-this.x, -this.y);

        draw();

        cx.restore();
    }

    update(time: TimeStep): void {
        if (this.transition != null) {
            const {
                from,
                to,
                fromVisibleAreaHeight,
                toVisibleAreaHeight,
                startTime,
                duration,
            } = this.transition;

            if (time.t < startTime + duration) {
                const elapsedTime = time.t - this.transition.startTime;
                const progress = this.transition.easing.call(
                    null,
                    elapsedTime / this.transition.duration,
                );

                let x = from.x + progress * (to.x - from.x);
                let y = from.y + progress * (to.y - from.y);

                const newVisibleAreaHeight =
                    fromVisibleAreaHeight +
                    progress * (toVisibleAreaHeight - fromVisibleAreaHeight);

                const newZoom = this.view.height / newVisibleAreaHeight;
                const viewAreaWidth = this.view.width / newZoom;
                const viewAreaHeight = this.view.height / newZoom;

                // Keep camera within level in x-direction.
                if (x - viewAreaWidth / 2 < this.level.x) {
                    x = this.level.x + viewAreaWidth / 2;
                } else if (x + viewAreaWidth / 2 > this.level.width) {
                    x = this.level.width - viewAreaWidth / 2;
                }

                // Keep camera within level in y-direction.
                if (y - viewAreaHeight / 2 < this.level.y) {
                    y = this.level.y + viewAreaHeight / 2;
                } else if (y + viewAreaHeight / 2 > this.level.height) {
                    y = this.level.height - viewAreaHeight / 2;
                }

                this.x = x;
                this.y = y;
                this.visibleAreaHeight = newVisibleAreaHeight;
                this.zoom = newZoom;
            } else {
                this.transition.resolve.call(null);
                this.transition = null;
            }
        } else {
            let newZoom = this.view.height / this.visibleAreaHeight;

            // Force that the level fills the entire view area.
            const minXZoom = this.view.width / this.level.width;
            if (newZoom < minXZoom) {
                newZoom = minXZoom;
            }
            const minYZoom = this.view.height / this.level.height;
            if (newZoom < minYZoom) {
                newZoom = minYZoom;
            }

            this.zoom = newZoom;

            if (this.target) {
                this.followFrame(this.target);
            }
        }
    }

    private followFrame(gameObject: Area): void {
        const viewAreaWidth = this.view.width / this.zoom;
        const viewAreaHeight = this.view.height / this.zoom;

        let x = gameObject.x + gameObject.width / 2;
        let y =
            gameObject.y +
            gameObject.height / 2 +
            viewAreaHeight * this.yAdjust;

        // Keep camera within level in x-direction.
        if (x - viewAreaWidth / 2 < this.level.x) {
            x = this.level.x + viewAreaWidth / 2;
        } else if (x + viewAreaWidth / 2 > this.level.width) {
            x = this.level.width - viewAreaWidth / 2;
        }

        // Keep camera within level in y-direction.
        if (y - viewAreaHeight / 2 < this.level.y) {
            y = this.level.y + viewAreaHeight / 2;
        } else if (y + viewAreaHeight / 2 > this.level.height) {
            y = this.level.height - viewAreaHeight / 2;
        }

        this.x = x;
        this.y = y;
    }
}
