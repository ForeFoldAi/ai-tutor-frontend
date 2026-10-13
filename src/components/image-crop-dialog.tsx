import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Check, Loader2, RotateCw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dragCrop, type CropHandle, type CropRect } from "@/lib/crop-rect";

const FULL: CropRect = { x: 0, y: 0, w: 1, h: 1 };
// Keeps the upload well under the tutor's 8 MB limit while staying sharp enough to read text.
const MAX_OUTPUT_SIDE = 2000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the photo."));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the photo."))), "image/jpeg", 0.9),
  );
}

const CORNERS: Array<{ handle: Exclude<CropHandle, "move">; area: string; bracket: string }> = [
  { handle: "nw", area: "left-0 top-0 cursor-nwse-resize", bracket: "left-0 top-0 border-l-4 border-t-4" },
  { handle: "ne", area: "right-0 top-0 cursor-nesw-resize", bracket: "right-0 top-0 border-r-4 border-t-4" },
  { handle: "sw", area: "bottom-0 left-0 cursor-nesw-resize", bracket: "bottom-0 left-0 border-b-4 border-l-4" },
  { handle: "se", area: "bottom-0 right-0 cursor-nwse-resize", bracket: "bottom-0 right-0 border-b-4 border-r-4" },
];

type Props = {
  /** Photo to crop; dialog is open while this is non-null. */
  file: File | null;
  onCancel: () => void;
  onDone: (cropped: File) => void;
};

export function ImageCropDialog({ file, onCancel, onDone }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropRect>(FULL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: CropHandle; x: number; y: number; start: CropRect } | null>(null);
  const rotatedUrl = useRef<string | null>(null);

  const dropRotated = () => {
    if (rotatedUrl.current) URL.revokeObjectURL(rotatedUrl.current);
    rotatedUrl.current = null;
  };

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop(FULL);
    setError(null);
    return () => {
      URL.revokeObjectURL(url);
      dropRotated();
    };
  }, [file]);

  const startDrag = (handle: CropHandle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { handle, x: e.clientX, y: e.clientY, start: crop };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!d || !rect?.width || !rect.height) return;
    setCrop(dragCrop(d.start, d.handle, (e.clientX - d.x) / rect.width, (e.clientY - d.y) / rect.height));
  };

  const endDrag = () => {
    drag.current = null;
  };

  const rotate = async () => {
    if (!src) return;
    setBusy(true);
    try {
      const img = await loadImage(src);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process the photo.");
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      const url = URL.createObjectURL(await canvasToBlob(canvas));
      dropRotated();
      rotatedUrl.current = url;
      setSrc(url);
      setCrop(FULL);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!src || !file) return;
    setBusy(true);
    try {
      const img = await loadImage(src);
      const sx = Math.round(crop.x * img.naturalWidth);
      const sy = Math.round(crop.y * img.naturalHeight);
      const sw = Math.max(1, Math.round(crop.w * img.naturalWidth));
      const sh = Math.max(1, Math.round(crop.h * img.naturalHeight));
      const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(sw, sh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process the photo.");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas);
      const base = file.name.replace(/\.[^.]+$/, "") || "photo";
      onDone(new File([blob], `${base}-cropped.jpg`, { type: "image/jpeg" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="w-[96vw] max-w-lg gap-3 p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle>Crop photo</DialogTitle>
          <DialogDescription>Drag the corners to keep just the part you want to ask about.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center rounded-lg bg-neutral-950 p-3">
          {src ? (
            <div
              ref={frameRef}
              className="relative inline-block touch-none select-none overflow-hidden"
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img src={src} alt="Photo to crop" draggable={false} className="block max-h-[55vh] max-w-full" />
              <div
                className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
                onPointerDown={startDrag("move")}
              >
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border-[0.5px] border-white/30" />
                  ))}
                </div>
                {CORNERS.map((c) => (
                  <div
                    key={c.handle}
                    className={`absolute h-10 w-10 ${c.area}`}
                    onPointerDown={startDrag(c.handle)}
                  >
                    <span className={`absolute h-5 w-5 border-white ${c.bracket}`} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Loader2 className="my-16 h-6 w-6 animate-spin text-white/70" />
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={rotate} disabled={busy || !src}>
              <RotateCw className="mr-1.5 h-4 w-4" />
              Rotate
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCrop(FULL)} disabled={busy}>
              <Undo2 className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
          </div>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={finish} disabled={busy || !src}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Use photo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
