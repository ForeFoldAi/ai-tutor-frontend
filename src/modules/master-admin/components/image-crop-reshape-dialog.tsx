import type React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { API_BASE } from "@/api/index";
import {
  cropTextbookImage,
  createManualTextbookImage,
  getUploadPdfPagesInfo,
  getUploadPdfPageImageUrl,
} from "@/api/masterAdmin";
import type { TextbookImageAdminApi } from "@/api/types";
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  RefreshCw,
  Loader2,
  Check,
  Eye,
  Sliders,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ImageCropReshapeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: TextbookImageAdminApi | null;
  uploadId?: number | string | null;
  initialSourceMode?: "extracted" | "pdf";
  onSaved: (updatedImage: TextbookImageAdminApi) => void;
}

type AspectPreset = "free" | "1:1" | "4:3" | "16:9" | "3:2" | "orig";

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropReshapeDialog({
  open,
  onOpenChange,
  image,
  uploadId: explicitUploadId,
  initialSourceMode = "extracted",
  onSaved,
}: ImageCropReshapeDialogProps) {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Source selection: Extracted Figure vs Direct PDF Page
  const [sourceMode, setSourceMode] = useState<"extracted" | "pdf">(initialSourceMode);
  const resolvedUploadId = explicitUploadId || image?.textbook_upload_id || null;

  // PDF Page navigation
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(image?.page_index ?? 0);
  const [loadingPdfInfo, setLoadingPdfInfo] = useState<boolean>(false);

  // New figure metadata fields (when creating figure from PDF without prior image)
  const [newCaption, setNewCaption] = useState<string>("");
  const [newFigureNumber, setNewFigureNumber] = useState<string>("");

  const [loadingImage, setLoadingImage] = useState(true);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Transform states
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [aspect, setAspect] = useState<AspectPreset>("free");

  // Normalized crop rectangle (0 to 1 relative to transformed natural image)
  const [crop, setCrop] = useState<CropRect>({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<
    "move" | "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w" | null
  >(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; crop: CropRect }>({
    clientX: 0,
    clientY: 0,
    crop: { x: 0, y: 0, width: 0, height: 0 },
  });

  const [saving, setSaving] = useState(false);

  // Initialize source mode and PDF page when opened
  useEffect(() => {
    if (!open) {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
        setImageBlobUrl(null);
      }
      return;
    }

    const startMode = !image ? "pdf" : initialSourceMode;
    setSourceMode(startMode);
    setCurrentPdfPage(image?.page_index ?? 0);
    setNewCaption(image?.caption || "");
    setNewFigureNumber(image?.figure_number || "");
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setAspect("free");
    setCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });

    // Load PDF info if uploadId is available
    if (resolvedUploadId) {
      setLoadingPdfInfo(true);
      getUploadPdfPagesInfo(resolvedUploadId)
        .then((info) => {
          setTotalPages(info.total_pages);
          setPdfFileName(info.file_name);
        })
        .catch(() => {
          // If not PDF or failed, fallback to extracted mode
        })
        .finally(() => setLoadingPdfInfo(false));
    }
  }, [open, image, resolvedUploadId, initialSourceMode]);

  // Load the active image (either extracted figure or PDF page)
  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoadingImage(true);

    if (imageBlobUrl) {
      URL.revokeObjectURL(imageBlobUrl);
      setImageBlobUrl(null);
    }

    let urlToFetch = "";

    if (sourceMode === "extracted" && image) {
      urlToFetch = `${API_BASE}${image.image_url}`;
    } else if (sourceMode === "pdf" && resolvedUploadId) {
      urlToFetch = getUploadPdfPageImageUrl(resolvedUploadId, currentPdfPage, 160);
    } else {
      setLoadingImage(false);
      return;
    }

    fetch(urlToFetch, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        setImageBlobUrl(objectUrl);

        const img = new Image();
        img.onload = () => {
          if (!active) return;
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          setLoadingImage(false);

          // For PDF pages, start with a reasonable initial crop in the center
          if (sourceMode === "pdf") {
            setCrop({ x: 0.15, y: 0.2, width: 0.7, height: 0.5 });
          } else {
            setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
          }
        };
        img.onerror = () => {
          if (!active) return;
          setLoadingImage(false);
          toast({ title: "Failed to parse image data", variant: "destructive" });
        };
        img.src = objectUrl;
      })
      .catch((err) => {
        if (!active) return;
        setLoadingImage(false);
        toast({
          title: "Could not load image source",
          description: err.message,
          variant: "destructive",
        });
      });

    return () => {
      active = false;
    };
  }, [open, sourceMode, currentPdfPage, image?.id, resolvedUploadId, token]);

  // Handle aspect ratio constraint application
  const applyAspectPreset = useCallback(
    (preset: AspectPreset) => {
      setAspect(preset);
      if (preset === "free") return;

      let targetRatio = 1;
      const isRotated90 = (rotation / 90) % 2 !== 0;
      const wBase = isRotated90 ? naturalSize.height : naturalSize.width;
      const hBase = isRotated90 ? naturalSize.width : naturalSize.height;

      if (preset === "1:1") targetRatio = 1;
      else if (preset === "4:3") targetRatio = 4 / 3;
      else if (preset === "16:9") targetRatio = 16 / 9;
      else if (preset === "3:2") targetRatio = 3 / 2;
      else if (preset === "orig" && hBase > 0) targetRatio = wBase / hBase;

      setCrop((prev) => {
        const imageRatio = wBase / (hBase || 1);
        let newWidth = prev.width;
        let newHeight = ((newWidth / targetRatio) * imageRatio);

        if (newHeight > 0.95) {
          newHeight = 0.9;
          newWidth = (newHeight * targetRatio) / imageRatio;
        }
        if (newWidth > 0.95) {
          newWidth = 0.9;
          newHeight = ((newWidth / targetRatio) * imageRatio);
        }

        const newX = Math.max(0, Math.min(1 - newWidth, prev.x));
        const newY = Math.max(0, Math.min(1 - newHeight, prev.y));

        return { x: newX, y: newY, width: newWidth, height: newHeight };
      });
    },
    [rotation, naturalSize],
  );

  // Render live preview on small canvas
  useEffect(() => {
    if (!imageBlobUrl || loadingImage || !canvasPreviewRef.current) return;
    const canvas = canvasPreviewRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imageBlobUrl;
    img.onload = () => {
      const isRotated90 = (rotation / 90) % 2 !== 0;
      const tW = isRotated90 ? img.naturalHeight : img.naturalWidth;
      const tH = isRotated90 ? img.naturalWidth : img.naturalHeight;

      const off = document.createElement("canvas");
      off.width = tW;
      off.height = tH;
      const oCtx = off.getContext("2d");
      if (!oCtx) return;

      oCtx.save();
      oCtx.translate(tW / 2, tH / 2);
      oCtx.rotate((rotation * Math.PI) / 180);
      oCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      oCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      oCtx.restore();

      const sx = Math.max(0, Math.round(crop.x * tW));
      const sy = Math.max(0, Math.round(crop.y * tH));
      const sw = Math.min(tW - sx, Math.round(crop.width * tW));
      const sh = Math.min(tH - sy, Math.round(crop.height * tH));

      if (sw <= 0 || sh <= 0) return;

      canvas.width = Math.min(320, sw);
      canvas.height = Math.round((canvas.width / sw) * sh);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    };
  }, [imageBlobUrl, loadingImage, crop, rotation, flipH, flipV]);

  // Pointer drag handlers for interactive crop box
  const handlePointerDown = (
    e: React.PointerEvent,
    mode: "move" | "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragMode(mode);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      crop: { ...crop },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - dragStartRef.current.clientX) / rect.width;
    const dy = (e.clientY - dragStartRef.current.clientY) / rect.height;
    const init = dragStartRef.current.crop;

    setCrop((prev) => {
      let nx = prev.x;
      let ny = prev.y;
      let nw = prev.width;
      let nh = prev.height;

      if (dragMode === "move") {
        nx = Math.max(0, Math.min(1 - init.width, init.x + dx));
        ny = Math.max(0, Math.min(1 - init.height, init.y + dy));
        return { x: nx, y: ny, width: init.width, height: init.height };
      }

      const minSize = 0.05;

      if (dragMode.includes("e")) {
        nw = Math.max(minSize, Math.min(1 - init.x, init.width + dx));
      }
      if (dragMode.includes("s")) {
        nh = Math.max(minSize, Math.min(1 - init.y, init.height + dy));
      }
      if (dragMode.includes("w")) {
        const potentialW = init.width - dx;
        if (potentialW >= minSize && init.x + dx >= 0) {
          nx = init.x + dx;
          nw = potentialW;
        }
      }
      if (dragMode.includes("n")) {
        const potentialH = init.height - dy;
        if (potentialH >= minSize && init.y + dy >= 0) {
          ny = init.y + dy;
          nh = potentialH;
        }
      }

      return { x: nx, y: ny, width: nw, height: nh };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setDragMode(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // fallback
      }
    }
  };

  // Perform saving
  const handleSave = async () => {
    if (!imageBlobUrl) return;
    setSaving(true);

    try {
      const img = new Image();
      img.src = imageBlobUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not reload image data"));
      });

      const isRotated90 = (rotation / 90) % 2 !== 0;
      const tW = isRotated90 ? img.naturalHeight : img.naturalWidth;
      const tH = isRotated90 ? img.naturalWidth : img.naturalHeight;

      const off = document.createElement("canvas");
      off.width = tW;
      off.height = tH;
      const oCtx = off.getContext("2d");
      if (!oCtx) throw new Error("Could not obtain canvas context");

      oCtx.save();
      oCtx.translate(tW / 2, tH / 2);
      oCtx.rotate((rotation * Math.PI) / 180);
      oCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      oCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      oCtx.restore();

      const sx = Math.max(0, Math.round(crop.x * tW));
      const sy = Math.max(0, Math.round(crop.y * tH));
      const sw = Math.min(tW - sx, Math.round(crop.width * tW));
      const sh = Math.min(tH - sy, Math.round(crop.height * tH));

      if (sw <= 0 || sh <= 0) throw new Error("Crop selection is too small.");

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = sw;
      cropCanvas.height = sh;
      const cCtx = cropCanvas.getContext("2d");
      if (!cCtx) throw new Error("Could not create crop canvas");

      cCtx.drawImage(off, sx, sy, sw, sh, 0, 0, sw, sh);

      const mimeType = "image/jpeg";
      const blob = await new Promise<Blob>((resolve, reject) => {
        cropCanvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Canvas blob conversion failed"));
          },
          mimeType,
          0.95,
        );
      });

      let resultImage: TextbookImageAdminApi;

      if (image) {
        // Updating existing figure
        resultImage = await cropTextbookImage(image.id, {
          file: blob,
          page_index: sourceMode === "pdf" ? currentPdfPage : undefined,
        });
        toast({
          title: "Figure updated successfully",
          description:
            sourceMode === "pdf"
              ? `Re-cropped directly from PDF page ${currentPdfPage + 1} (${sw} × ${sh} px).`
              : `Cropped to ${sw} × ${sh} px and re-indexed.`,
        });
      } else if (resolvedUploadId) {
        // Creating new figure from PDF
        resultImage = await createManualTextbookImage(resolvedUploadId, {
          file: blob,
          page_index: currentPdfPage,
          caption: newCaption.trim() || undefined,
          figure_number: newFigureNumber.trim() || undefined,
          image_type: "diagram",
          educational_role: "primary_concept",
        });
        toast({
          title: "New figure created from PDF",
          description: `Cropped from page ${currentPdfPage + 1} and indexed.`,
        });
      } else {
        throw new Error("Missing upload context to save figure.");
      }

      onSaved(resultImage);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Crop failed",
        description: err.message || "Failed to save cropped image",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isRotated90 = (rotation / 90) % 2 !== 0;
  const currentNaturalWidth = isRotated90 ? naturalSize.height : naturalSize.width;
  const currentNaturalHeight = isRotated90 ? naturalSize.width : naturalSize.height;
  const pixelCropW = Math.round(crop.width * currentNaturalWidth);
  const pixelCropH = Math.round(crop.height * currentNaturalHeight);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header with Source Mode Toggle & PDF Page Navigator */}
        <DialogHeader className="px-6 py-3.5 border-b bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Crop className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>{image ? "Crop & Reshape Figure" : "Crop New Figure from PDF"}</span>
                  {image?.figure_number && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {image.figure_number}
                    </Badge>
                  )}
                  {sourceMode === "pdf" && (
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      PDF Page {currentPdfPage + 1}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {sourceMode === "pdf"
                    ? "Select and crop any figure or diagram directly from the original textbook PDF page."
                    : "Adjust boundaries and reshape the auto-extracted figure, or switch to the original PDF."}
                </DialogDescription>
              </div>
            </div>

            {/* Source Switcher Buttons */}
            <div className="flex items-center gap-2">
              {resolvedUploadId && (
                <div className="flex items-center p-0.5 rounded-lg bg-muted border text-xs">
                  {image && (
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                        sourceMode === "extracted"
                          ? "bg-background text-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setSourceMode("extracted")}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Extracted Asset
                    </button>
                  )}

                  <button
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                      sourceMode === "pdf"
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSourceMode("pdf")}
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Crop from Original PDF
                  </button>
                </div>
              )}

              <Badge variant="secondary" className="font-mono text-xs hidden sm:inline-flex">
                {pixelCropW} × {pixelCropH} px
              </Badge>
            </div>
          </div>

          {/* Subheader: PDF Page Selector Bar (Only in PDF Mode) */}
          {sourceMode === "pdf" && (
            <div className="flex items-center justify-between pt-2.5 mt-1 border-t text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  PDF Page:
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Previous PDF Page"
                    disabled={currentPdfPage <= 0 || loadingImage}
                    onClick={() => setCurrentPdfPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>

                  <div className="flex items-center gap-1 font-mono">
                    <Input
                      type="number"
                      min={1}
                      max={totalPages || 999}
                      value={currentPdfPage + 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          const maxP = totalPages || 999;
                          setCurrentPdfPage(Math.min(maxP - 1, val - 1));
                        }
                      }}
                      className="h-7 w-14 text-center text-xs p-1 font-semibold"
                    />
                    <span className="text-muted-foreground">
                      / {loadingPdfInfo ? "..." : totalPages || "–"}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Next PDF Page"
                    disabled={(totalPages > 0 && currentPdfPage >= totalPages - 1) || loadingImage}
                    onClick={() =>
                      setCurrentPdfPage((p) =>
                        totalPages > 0 ? Math.min(totalPages - 1, p + 1) : p + 1,
                      )
                    }
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {pdfFileName && (
                  <span className="text-muted-foreground truncate max-w-xs hidden md:inline">
                    ({pdfFileName})
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground hidden sm:block">
                Drag the box over any figure on this page to crop it directly.
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Workspace */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Main Interactive Canvas Workspace */}
          <div
            className="flex-1 relative bg-neutral-950 flex items-center justify-center p-6 overflow-hidden select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {loadingImage ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs">
                  {sourceMode === "pdf"
                    ? `Rendering PDF page ${currentPdfPage + 1}...`
                    : "Loading figure asset..."}
                </span>
              </div>
            ) : imageBlobUrl ? (
              <div
                ref={containerRef}
                className="relative inline-block max-w-full max-h-full shadow-2xl"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.15s ease",
                }}
              >
                {/* Visual Image/Page Render */}
                <img
                  ref={imageRef}
                  src={imageBlobUrl}
                  alt="Crop Source"
                  className="max-h-[62vh] max-w-[58vw] w-auto h-auto object-contain pointer-events-none block rounded-sm"
                  style={{
                    transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    transition: isDragging ? "none" : "transform 0.2s ease",
                  }}
                  draggable={false}
                />

                {/* Dark Mask Outside Crop Region */}
                <div
                  className="absolute inset-0 bg-black/60 pointer-events-none"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 100% 0%, 100% 100%, 0% 100%,
                      0% ${crop.y * 100}%,
                      ${crop.x * 100}% ${crop.y * 100}%,
                      ${crop.x * 100}% ${(crop.y + crop.height) * 100}%,
                      ${(crop.x + crop.width) * 100}% ${(crop.y + crop.height) * 100}%,
                      ${(crop.x + crop.width) * 100}% ${crop.y * 100}%,
                      0% ${crop.y * 100}%
                    )`,
                  }}
                />

                {/* Draggable Active Crop Box */}
                <div
                  className="absolute border-2 border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.7)] cursor-move touch-none"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.width * 100}%`,
                    height: `${crop.height * 100}%`,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, "move")}
                >
                  {/* Rule of Thirds Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div />
                  </div>

                  {/* Corner Handles */}
                  <div
                    className="absolute -top-2 -left-2 w-4 h-4 bg-primary border-2 border-white rounded-sm cursor-nwse-resize shadow"
                    onPointerDown={(e) => handlePointerDown(e, "nw")}
                  />
                  <div
                    className="absolute -top-2 -right-2 w-4 h-4 bg-primary border-2 border-white rounded-sm cursor-nesw-resize shadow"
                    onPointerDown={(e) => handlePointerDown(e, "ne")}
                  />
                  <div
                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary border-2 border-white rounded-sm cursor-nesw-resize shadow"
                    onPointerDown={(e) => handlePointerDown(e, "sw")}
                  />
                  <div
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary border-2 border-white rounded-sm cursor-nwse-resize shadow"
                    onPointerDown={(e) => handlePointerDown(e, "se")}
                  />

                  {/* Edge Handles */}
                  <div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-primary border border-white rounded-full cursor-ns-resize shadow"
                    onPointerDown={(e) => handlePointerDown(e, "n")}
                  />
                  <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-primary border border-white rounded-full cursor-ns-resize shadow"
                    onPointerDown={(e) => handlePointerDown(e, "s")}
                  />
                  <div
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-6 bg-primary border border-white rounded-full cursor-ew-resize shadow"
                    onPointerDown={(e) => handlePointerDown(e, "w")}
                  />
                  <div
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-6 bg-primary border border-white rounded-full cursor-ew-resize shadow"
                    onPointerDown={(e) => handlePointerDown(e, "e")}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Control & Live Preview Sidebar */}
          <div className="w-full md:w-80 border-l bg-card flex flex-col shrink-0 p-5 gap-4 overflow-y-auto">
            {/* Live Crop Result Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Live Crop Preview
              </span>
              <div className="w-full h-32 bg-muted/40 rounded-lg border border-dashed flex items-center justify-center p-2 overflow-hidden">
                <canvas
                  ref={canvasPreviewRef}
                  className="max-h-full max-w-full object-contain rounded shadow-sm"
                />
              </div>
            </div>

            {/* Optional Metadata for new figure or caption tweak */}
            {!image && (
              <div className="space-y-2 p-2.5 rounded-lg border bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Figure Number</Label>
                  <Input
                    placeholder="e.g. Fig. 1.3"
                    value={newFigureNumber}
                    onChange={(e) => setNewFigureNumber(e.target.value)}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Caption</Label>
                  <Input
                    placeholder="Describe the figure..."
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Aspect Ratio Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5 text-primary" />
                Aspect Ratio
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "free", label: "Free" },
                    { id: "1:1", label: "1:1" },
                    { id: "4:3", label: "4:3" },
                    { id: "16:9", label: "16:9" },
                    { id: "3:2", label: "3:2" },
                    { id: "orig", label: "Original" },
                  ] as const
                ).map((p) => (
                  <Button
                    key={p.id}
                    variant={aspect === p.id ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2 font-medium"
                    onClick={() => applyAspectPreset(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Transformations: Rotate & Flip */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Rotate & Flip
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-1.5"
                  title="Rotate Counter-Clockwise"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-1.5"
                  title="Rotate Clockwise"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={flipH ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-1.5"
                  title="Flip Horizontally"
                  onClick={() => setFlipH((f) => !f)}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={flipV ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-1.5"
                  title="Flip Vertically"
                  onClick={() => setFlipV((f) => !f)}
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* View Zoom */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Zoom</span>
                <span className="font-mono text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <Slider
                value={[zoom]}
                min={0.6}
                max={2.5}
                step={0.1}
                onValueChange={([val]) => setZoom(val)}
              />
            </div>

            {/* Reset Defaults */}
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs gap-1.5 text-muted-foreground hover:text-foreground h-7"
                onClick={() => {
                  setRotation(0);
                  setFlipH(false);
                  setFlipV(false);
                  setZoom(1);
                  setAspect("free");
                  setCrop(
                    sourceMode === "pdf"
                      ? { x: 0.15, y: 0.2, width: 0.7, height: 0.5 }
                      : { x: 0.05, y: 0.05, width: 0.9, height: 0.9 },
                  );
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Reset Box
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {sourceMode === "pdf"
              ? `Cropping from PDF page ${currentPdfPage + 1}. Applies immediately to student tutor.`
              : "Saves clean figure to storage & updates vector embedding."}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={saving || loadingImage}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {image
                    ? sourceMode === "pdf"
                      ? "Replace with PDF Crop"
                      : "Save & Apply Crop"
                    : "Add Figure to Chapter"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
