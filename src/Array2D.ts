/*
 * Copyright (c) 2025 Tero Jäntti, Sami Heikkinen
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

/*
 * A two-dimensional array.
 */
export class Array2D<T> {
    private values: T[];

    constructor(
        public xCount: number,
        public yCount: number,
    ) {
        this.values = new Array<T>(xCount * yCount);
    }

    getValue(ix: number, iy: number): T | undefined {
        if (ix < 0 || this.xCount <= ix || iy < 0 || this.yCount <= iy) {
            return undefined;
        }
        return this.values[ix * this.yCount + iy];
    }

    setValue(ix: number, iy: number, value: T): void {
        if (ix < 0 || this.xCount <= ix || iy < 0 || this.yCount <= iy) {
            return;
        }
        this.values[ix * this.yCount + iy] = value;
    }
}
