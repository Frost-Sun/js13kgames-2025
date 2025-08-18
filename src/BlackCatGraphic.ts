export function renderBlackCat(
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number = 48,
    height: number = 64,
    options?: { eyeOpen?: number },
) {
    // Body
    cx.save();
    cx.translate(x, y);

    // Draw body
    cx.beginPath();
    cx.ellipse(
        width / 2,
        height * 0.7,
        width * 0.35,
        height * 0.28,
        0,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#000";
    cx.fill();

    // Draw ears (move before drawing head so they are not covered)
    const earY = height * 0.08;
    const earW = width * 0.16;
    const earH = height * 0.18;
    // Left ear
    cx.beginPath();
    cx.moveTo(width * 0.32, earY);
    cx.lineTo(width * 0.32 - earW / 2, earY + earH);
    cx.lineTo(width * 0.32 + earW / 2, earY + earH);
    cx.closePath();
    cx.fillStyle = "#000";
    cx.fill();
    // Right ear
    cx.beginPath();
    cx.moveTo(width * 0.68, earY);
    cx.lineTo(width * 0.68 - earW / 2, earY + earH);
    cx.lineTo(width * 0.68 + earW / 2, earY + earH);
    cx.closePath();
    cx.fillStyle = "#000";
    cx.fill();

    // Draw head (after ears so ears are visible)
    cx.beginPath();
    cx.ellipse(
        width / 2,
        height * 0.35,
        width * 0.28,
        height * 0.22,
        0,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#000";
    cx.fill();

    // Eyes
    const eyeOpen = options?.eyeOpen ?? 1;
    cx.save();
    cx.translate(width / 2, height * 0.37);
    for (const dx of [-width * 0.09, width * 0.09]) {
        cx.beginPath();
        cx.ellipse(
            dx,
            0,
            width * 0.07,
            width * 0.04 * eyeOpen,
            0,
            0,
            Math.PI * 2,
        );
        cx.fillStyle = "#fff";
        cx.fill();
        cx.beginPath();
        cx.ellipse(
            dx,
            0,
            width * 0.06,
            width * 0.03 * eyeOpen,
            0,
            0,
            Math.PI * 2,
        );
        cx.fillStyle = "green";
        cx.fill();
        // Pupils
        cx.beginPath();
        cx.ellipse(
            dx,
            0,
            width * 0.025,
            width * 0.018 * eyeOpen,
            0,
            0,
            Math.PI * 2,
        );
        cx.fillStyle = "#181818";
        cx.fill();
        // Eye highlight
        cx.beginPath();
        cx.arc(dx - width * 0.02, -width * 0.01, width * 0.01, 0, Math.PI * 2);
        cx.fillStyle = "#fff";
        cx.fill();
    }
    cx.restore();

    // Nose (make it a small oval instead of a triangle)
    cx.beginPath();
    cx.ellipse(
        width / 2,
        height * 0.42,
        width * 0.018,
        width * 0.012,
        0,
        0,
        Math.PI * 2,
    );
    cx.fillStyle = "#e6d6e6";
    cx.fill();

    // Whiskers
    cx.strokeStyle = "#e6d6e6";
    cx.lineWidth = 1;
    // Move whisker start points even farther horizontally from the nose
    const whiskerOffsets = [-12, 0, 12];
    const whiskerStartXLeft = width / 2 - 38;
    const whiskerStartXRight = width / 2 + 38;
    const whiskerStartY = height * 0.46;
    for (let i = 0; i < whiskerOffsets.length; i++) {
        const dy = whiskerOffsets[i];
        // Left whisker: thick, multi-strand, much larger height and more separation
        for (let w = -6; w <= 6; w += 6) {
            cx.beginPath();
            cx.moveTo(whiskerStartXLeft, whiskerStartY + dy + w);
            cx.bezierCurveTo(
                whiskerStartXLeft - width * 0.16,
                whiskerStartY + dy - 6 + w,
                whiskerStartXLeft - width * 0.39,
                whiskerStartY + dy - 36 + w,
                whiskerStartXLeft - width * 0.54,
                whiskerStartY + dy - 28 + w,
            );
            cx.stroke();
        }
        // Right whisker: thick, multi-strand, much larger height and more separation
        for (let w = -6; w <= 6; w += 6) {
            cx.beginPath();
            cx.moveTo(whiskerStartXRight, whiskerStartY + dy + w);
            cx.bezierCurveTo(
                whiskerStartXRight + width * 0.16,
                whiskerStartY + dy - 6 + w,
                whiskerStartXRight + width * 0.39,
                whiskerStartY + dy - 36 + w,
                whiskerStartXRight + width * 0.54,
                whiskerStartY + dy - 28 + w,
            );
            cx.stroke();
        }
    }

    // Tail
    cx.beginPath();
    cx.moveTo(width * 0.85, height * 0.7);
    cx.bezierCurveTo(
        width * 1.05,
        height * 0.6,
        width * 0.95,
        height * 0.95,
        width * 0.7,
        height * 0.95,
    );
    cx.strokeStyle = "#000";
    cx.lineWidth = 24; // much thicker tail
    cx.stroke();

    cx.restore();
}
