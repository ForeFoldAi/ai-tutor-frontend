/** Self-check: crop box drag math. Run: npx tsx src/lib/crop-rect.check.ts */
import { dragCrop, MIN_CROP, type CropRect } from "./crop-rect";

function near(a: CropRect, b: CropRect) {
  for (const k of ["x", "y", "w", "h"] as const) {
    if (Math.abs(a[k] - b[k]) > 1e-9) throw new Error(`${k}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
}

const start = { x: 0.1, y: 0.1, w: 0.5, h: 0.5 };
near(dragCrop(start, "move", 0.1, 0.2), { x: 0.2, y: 0.3, w: 0.5, h: 0.5 });
near(dragCrop(start, "move", 0.9, -0.9), { x: 0.5, y: 0, w: 0.5, h: 0.5 }); // pinned inside image
near(dragCrop(start, "se", 0.2, 0.1), { x: 0.1, y: 0.1, w: 0.7, h: 0.6 });
near(dragCrop(start, "se", 2, 2), { x: 0.1, y: 0.1, w: 0.9, h: 0.9 }); // can't leave image
near(dragCrop(start, "nw", -0.5, -0.5), { x: 0, y: 0, w: 0.6, h: 0.6 });
near(dragCrop(start, "nw", 1, 1), { x: 0.6 - MIN_CROP, y: 0.6 - MIN_CROP, w: MIN_CROP, h: MIN_CROP }); // min size
near(dragCrop(start, "ne", 0.1, 0.05), { x: 0.1, y: 0.15, w: 0.6, h: 0.45 });
near(dragCrop(start, "sw", 0.05, 0.1), { x: 0.15, y: 0.1, w: 0.45, h: 0.6 });
console.log("crop-rect: ok");
