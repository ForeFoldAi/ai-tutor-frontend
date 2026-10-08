import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { API_BASE } from "@/api/index";
import {
  getTextbookUploadImages,
  updateTextbookImage,
  deleteTextbookImage,
} from "@/api/masterAdmin";
import type { TextbookImageAdminApi, TextbookUploadApi } from "@/api/types";
import { ImageCropReshapeDialog } from "./image-crop-reshape-dialog";
import {
  Image as ImageIcon,
  Crop,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Check,
  X,
  RefreshCw,
  Info,
  Maximize2,
} from "lucide-react";

interface TextbookImagesGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upload: TextbookUploadApi | null;
  onImagesChanged?: () => void;
}

const IMAGE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "diagram", label: "Diagram" },
  { value: "chart", label: "Chart / Graph" },
  { value: "map", label: "Map" },
  { value: "instrument", label: "Instrument / Apparatus" },
  { value: "process", label: "Process / Flow" },
  { value: "activity", label: "Activity / Experiment" },
  { value: "historical_photo", label: "Historical Photo" },
  { value: "landscape", label: "Landscape / Terrain" },
  { value: "wildlife", label: "Wildlife / Specimen" },
  { value: "table", label: "Table" },
  { value: "formula", label: "Formula" },
  { value: "unknown", label: "Other / Uncategorized" },
];

const EDUCATIONAL_ROLES = [
  { value: "primary_concept", label: "Primary Concept" },
  { value: "supporting_example", label: "Supporting Example" },
  { value: "sidebar_example", label: "Sidebar / Decorative" },
  { value: "unknown", label: "Unspecified" },
];

export function TextbookImagesGalleryDialog({
  open,
  onOpenChange,
  upload,
  onImagesChanged,
}: TextbookImagesGalleryDialogProps) {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);

  const [images, setImages] = useState<TextbookImageAdminApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Selected image for Cropping & Reshaping
  const [croppingImage, setCroppingImage] = useState<TextbookImageAdminApi | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropInitialSource, setCropInitialSource] = useState<"extracted" | "pdf">("extracted");

  // Selected image for Metadata Editing
  const [editingImage, setEditingImage] = useState<TextbookImageAdminApi | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editFigureNumber, setEditFigureNumber] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("unknown");
  const [editRole, setEditRole] = useState("unknown");
  const [editIsDecorative, setEditIsDecorative] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Selected image for Inline Caption Edit
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineCaptionText, setInlineCaptionText] = useState("");

  // Selected image for Deletion
  const [deletingImage, setDeletingImage] = useState<TextbookImageAdminApi | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fullsize Lightbox image
  const [lightboxImage, setLightboxImage] = useState<TextbookImageAdminApi | null>(null);

  // Cache buster for re-rendered images after cropping
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());

  const fetchImages = async () => {
    if (!upload) return;
    setLoading(true);
    try {
      const data = await getTextbookUploadImages(upload.id);
      setImages(data);
    } catch (err: any) {
      toast({
        title: "Could not load extracted images",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && upload) {
      fetchImages();
      setSearchQuery("");
      setTypeFilter("all");
      setInlineEditId(null);
    } else {
      setImages([]);
    }
  }, [open, upload?.id]);

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (typeFilter !== "all" && img.image_type !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cap = (img.caption || "").toLowerCase();
        const fig = (img.figure_number || "").toLowerCase();
        const title = (img.title || "").toLowerCase();
        const fn = (img.file_name || "").toLowerCase();
        return cap.includes(q) || fig.includes(q) || title.includes(q) || fn.includes(q);
      }
      return true;
    });
  }, [images, typeFilter, searchQuery]);

  // Open Edit Metadata modal
  const handleOpenEdit = (img: TextbookImageAdminApi) => {
    setEditingImage(img);
    setEditCaption(img.caption || "");
    setEditFigureNumber(img.figure_number || "");
    setEditTitle(img.title || "");
    setEditType(img.image_type || "unknown");
    setEditRole(img.educational_role || "unknown");
    setEditIsDecorative(img.is_decorative);
  };

  // Save Edit Metadata
  const handleSaveEdit = async () => {
    if (!editingImage) return;
    setSavingEdit(true);
    try {
      const updated = await updateTextbookImage(editingImage.id, {
        caption: editCaption,
        figure_number: editFigureNumber,
        title: editTitle,
        image_type: editType,
        educational_role: editRole,
        is_decorative: editIsDecorative,
      });

      setImages((prev) => prev.map((im) => (im.id === updated.id ? updated : im)));
      toast({ title: "Figure metadata updated successfully" });
      setEditingImage(null);
      if (onImagesChanged) onImagesChanged();
    } catch (err: any) {
      toast({
        title: "Failed to update figure",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick inline caption save
  const handleSaveInlineCaption = async (img: TextbookImageAdminApi) => {
    try {
      const updated = await updateTextbookImage(img.id, {
        caption: inlineCaptionText,
      });
      setImages((prev) => prev.map((im) => (im.id === updated.id ? updated : im)));
      setInlineEditId(null);
      toast({ title: "Caption saved" });
      if (onImagesChanged) onImagesChanged();
    } catch (err: any) {
      toast({
        title: "Could not save caption",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingImage) return;
    setIsDeleting(true);
    try {
      await deleteTextbookImage(deletingImage.id);
      setImages((prev) => prev.filter((im) => im.id !== deletingImage.id));
      toast({ title: "Figure deleted", description: "Image and vectors permanently removed." });
      setDeletingImage(null);
      if (onImagesChanged) onImagesChanged();
    } catch (err: any) {
      toast({
        title: "Failed to delete figure",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle successful crop
  const handleCropSaved = (updated: TextbookImageAdminApi) => {
    setImages((prev) => {
      const exists = prev.some((im) => im.id === updated.id);
      if (exists) {
        return prev.map((im) => (im.id === updated.id ? updated : im));
      }
      return [updated, ...prev];
    });
    setCacheBuster(Date.now());
    if (onImagesChanged) onImagesChanged();
  };

  const getImageUrl = (img: TextbookImageAdminApi) => {
    const base = `${API_BASE}${img.image_url}`;
    const separator = base.includes("?") ? "&" : "?";
    const authPart = token ? `token=${token}&` : "";
    return `${base}${separator}${authPart}v=${cacheBuster}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[96vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <span>Extracted Figures & Diagrams</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {images.length} {images.length === 1 ? "figure" : "figures"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate max-w-xl">
                    {upload?.content_label || upload?.chapter || upload?.file_name} • {upload?.board}{" "}
                    • {upload?.class_level?.replace("CLASS_", "Class ")} • {upload?.subject_name}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    setCroppingImage(null);
                    setCropInitialSource("pdf");
                    setCropModalOpen(true);
                  }}
                >
                  <Crop className="h-3.5 w-3.5" />
                  Crop from PDF
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={fetchImages}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by caption, figure number, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background/80"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs w-[180px] bg-background/80">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          {/* Main Gallery Area */}
          <div className="flex-1 min-h-0 bg-muted/10 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs">Loading extracted figures from PDF...</span>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground text-center p-8">
                <div className="p-4 rounded-full bg-muted/60 text-muted-foreground/60">
                  <ImageIcon className="h-10 w-10" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {images.length === 0 ? "No Figures Extracted" : "No Matching Figures"}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    {images.length === 0
                      ? "This PDF either has no embedded diagrams or image extraction is still processing in the background."
                      : "No figures match your search or category filter. Try clearing the filter."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map((img) => {
                  const isInlineEditing = inlineEditId === img.id;
                  const imgUrl = getImageUrl(img);

                  return (
                    <div
                      key={img.id}
                      className="group bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-[4/3] bg-neutral-950/80 overflow-hidden flex items-center justify-center cursor-pointer border-b">
                        <img
                          src={imgUrl}
                          alt={img.caption || img.file_name}
                          className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                          onClick={() => setLightboxImage(img)}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="bg-black/70 text-white border-0 text-[10px] px-1.5 py-0 backdrop-blur-sm"
                          >
                            p. {img.page_index + 1}
                          </Badge>
                          {img.figure_number && (
                            <Badge
                              variant="secondary"
                              className="bg-primary/90 text-primary-foreground border-0 text-[10px] font-mono font-bold px-1.5 py-0 backdrop-blur-sm"
                            >
                              {img.figure_number}
                            </Badge>
                          )}
                        </div>

                        {/* Top Right Action - Maximize */}
                        <button
                          type="button"
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Expand figure"
                          onClick={() => setLightboxImage(img)}
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Type & Role Badges (Bottom Overlay) */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px]">
                          <span className="capitalize px-1.5 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur-sm truncate max-w-[120px]">
                            {img.image_type.replace(/_/g, " ")}
                          </span>
                          {img.is_decorative && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/80 text-white font-medium">
                              Decorative
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content & Caption */}
                      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                        <div className="space-y-1">
                          {isInlineEditing ? (
                            <div className="space-y-1.5">
                              <Textarea
                                value={inlineCaptionText}
                                onChange={(e) => setInlineCaptionText(e.target.value)}
                                className="text-xs min-h-[60px] p-2 leading-relaxed resize-none"
                                placeholder="Enter figure caption..."
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 text-muted-foreground"
                                  onClick={() => setInlineEditId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 gap-1"
                                  onClick={() => handleSaveInlineCaption(img)}
                                >
                                  <Check className="h-3 w-3" /> Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="text-xs text-foreground/90 line-clamp-3 leading-relaxed cursor-pointer hover:text-primary transition-colors group/cap"
                              title="Click to edit caption quickly"
                              onClick={() => {
                                setInlineEditId(img.id);
                                setInlineCaptionText(img.caption || "");
                              }}
                            >
                              {img.caption ? (
                                <span>{img.caption}</span>
                              ) : (
                                <span className="italic text-muted-foreground flex items-center gap-1">
                                  <Info className="h-3 w-3 inline" /> No caption extracted. Click to
                                  add.
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Controls */}
                        <div className="pt-2 border-t flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {/* Crop & Reshape Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 bg-background hover:bg-primary/10 hover:text-primary"
                              title="Crop, rotate, reshape, or re-crop from PDF"
                              onClick={() => {
                                setCroppingImage(img);
                                setCropInitialSource("extracted");
                                setCropModalOpen(true);
                              }}
                            >
                              <Crop className="h-3.5 w-3.5" />
                              <span>Crop</span>
                            </Button>

                            {/* Edit Metadata Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                              title="Edit all figure metadata"
                              onClick={() => handleOpenEdit(img)}
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Edit</span>
                            </Button>
                          </div>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete figure"
                            onClick={() => setDeletingImage(img)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CROP & RESHAPE DIALOG */}
      <ImageCropReshapeDialog
        open={cropModalOpen}
        onOpenChange={(open) => {
          setCropModalOpen(open);
          if (!open) setCroppingImage(null);
        }}
        image={croppingImage}
        uploadId={upload?.id}
        initialSourceMode={cropInitialSource}
        onSaved={handleCropSaved}
      />

      {/* EDIT METADATA MODAL */}
      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Figure Information
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify the figure caption, label, and categorization for AI retrieval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-caption" className="text-xs font-semibold">
                Caption
              </Label>
              <Textarea
                id="edit-caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Figure caption displayed to students..."
                className="text-xs min-h-[70px] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-fignum" className="text-xs font-semibold">
                  Figure Number / Label
                </Label>
                <Input
                  id="edit-fignum"
                  value={editFigureNumber}
                  onChange={(e) => setEditFigureNumber(e.target.value)}
                  placeholder="e.g. Fig. 2.1 or Scheme 3"
                  className="text-xs h-8 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-type" className="text-xs font-semibold">
                  Image Type
                </Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger id="edit-type" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_TYPES.filter((t) => t.value !== "all").map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-role" className="text-xs font-semibold">
                  Educational Role
                </Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger id="edit-role" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATIONAL_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col justify-end space-y-1.5 pb-1">
                <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                  <Label htmlFor="edit-decorative" className="text-xs cursor-pointer">
                    Decorative only
                  </Label>
                  <Switch
                    id="edit-decorative"
                    checked={editIsDecorative}
                    onCheckedChange={setEditIsDecorative}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-xs font-semibold">
                Title / Topic (Optional)
              </Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Structure of a Plant Cell"
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingImage(null)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="gap-1.5"
            >
              {savingEdit ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE ALERT DIALOG */}
      <AlertDialog
        open={!!deletingImage}
        onOpenChange={(open) => !open && !isDeleting && setDeletingImage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Extracted Figure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete this figure
                {deletingImage?.figure_number ? ` (${deletingImage.figure_number})` : ""}?
              </p>
              <p className="font-semibold text-foreground">
                This will delete the image file and remove its vector embeddings from Qdrant/Chroma.
                It will no longer appear in student AI tutor sessions.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* LIGHTBOX FULL PREVIEW DIALOG */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-neutral-950 border-neutral-800">
          <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800 text-white">
            <span className="text-xs font-semibold">
              {lightboxImage?.figure_number || "Figure Preview"} • Page{" "}
              {(lightboxImage?.page_index ?? 0) + 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-neutral-400 hover:text-white"
              onClick={() => setLightboxImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-hidden">
            {lightboxImage && (
              <img
                src={getImageUrl(lightboxImage)}
                alt={lightboxImage.caption || ""}
                className="max-h-[70vh] max-w-full object-contain rounded"
              />
            )}
          </div>
          {lightboxImage?.caption && (
            <div className="px-4 py-3 bg-neutral-900/90 border-t border-neutral-800 text-neutral-300 text-xs text-center">
              {lightboxImage.caption}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
