import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteSubjectImage, listSubjectImages, uploadSubjectImages } from "@/api/masterAdmin";
import type { SubjectImageApi, SubjectImageUploadApi } from "@/api/types";
import { textbookImageSrc } from "@/components/voice/voice-image-utils";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export const SUBJECT_IMAGES_KEY = ["subject-images"] as const;

export function useSubjectImages() {
  return useQuery({ queryKey: SUBJECT_IMAGES_KEY, queryFn: listSubjectImages });
}

/** Upload files to the pool, refresh the shared list and toast any skipped files. */
export function useUploadSubjectImages() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const upload = async (files: File[]): Promise<SubjectImageUploadApi | null> => {
    if (!files.length) return null;
    setUploading(true);
    try {
      const res = await uploadSubjectImages(files);
      await queryClient.invalidateQueries({ queryKey: SUBJECT_IMAGES_KEY });
      if (res.skipped.length) {
        toast({
          title: `${res.skipped.length} file(s) skipped`,
          description: res.skipped.map((s) => `${s.file_name}: ${s.reason}`).join("\n"),
          variant: "destructive",
        });
      } else {
        toast({ title: `${res.created.length} image(s) uploaded` });
      }
      return res;
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}

export function SubjectImageThumb({ image, className }: { image: SubjectImageApi | undefined; className?: string }) {
  const token = useAuthStore((s) => s.token);
  if (!image) return null;
  return (
    <img
      src={textbookImageSrc(image.image_url, token)}
      alt={image.file_name}
      loading="lazy"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

/** Subject Images tab: bulk upload and delete pool images (delete is blocked while subjects use an image). */
export function SubjectImagePool() {
  const { data: images = [], isLoading } = useSubjectImages();
  const { upload, uploading } = useUploadSubjectImages();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const remove = async (im: SubjectImageApi) => {
    setDeletingId(im.id);
    try {
      await deleteSubjectImage(im.id);
      toast({ title: "Image deleted" });
    } catch (err) {
      toast({
        title: "Cannot delete image",
        description: im.used_by.length ? `Used by: ${im.used_by.join(", ")}` : (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      await queryClient.invalidateQueries({ queryKey: SUBJECT_IMAGES_KEY });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {images.length} image(s). Upload a batch here, then pick one per subject in Add / Edit Syllabus.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            await upload(files);
          }}
        />
        <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload Images
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : images.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">No subject images uploaded yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((im) => (
            <div key={im.id} className="overflow-hidden rounded-lg border bg-card">
              <div className="aspect-square bg-muted/30">
                <SubjectImageThumb image={im} />
              </div>
              <div className="flex items-start justify-between gap-1 p-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-foreground" title={im.file_name}>
                    {im.file_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground" title={im.used_by.join("\n") || undefined}>
                    {im.used_by.length ? `Used by ${im.used_by.length} subject(s)` : "Unused"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${im.file_name}`}
                  disabled={deletingId === im.id}
                  onClick={() => remove(im)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  value: number | null;
  onChange: (id: number | null) => void;
};

/** Pick one pool image (or none) for a subject; "Upload more" adds to the pool and selects the first new image. */
export function SubjectImagePicker({ value, onChange }: Props) {
  const { data: images = [], isLoading } = useSubjectImages();
  const { upload, uploading } = useUploadSubjectImages();
  const inputRef = useRef<HTMLInputElement>(null);

  const tile = "relative aspect-square overflow-hidden rounded-md border transition-colors";

  return (
    <div className="space-y-2">
      <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto p-0.5 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            tile,
            "flex flex-col items-center justify-center gap-1 bg-muted/30 text-[10px] text-muted-foreground",
            value === null ? "border-primary ring-2 ring-primary" : "hover:border-primary/40",
          )}
          aria-label="No image"
          aria-pressed={value === null}
        >
          <Ban className="h-4 w-4" />
          None
        </button>
        {images.map((im) => (
          <button
            key={im.id}
            type="button"
            onClick={() => onChange(im.id)}
            title={im.file_name}
            aria-label={`Use ${im.file_name}`}
            aria-pressed={value === im.id}
            className={cn(tile, value === im.id ? "border-primary ring-2 ring-primary" : "hover:border-primary/40")}
          >
            <SubjectImageThumb image={im} />
            {value === im.id ? (
              <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
          </button>
        ))}
        {isLoading ? (
          <div className={cn(tile, "flex items-center justify-center")}>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
      {!isLoading && images.length === 0 ? (
        <p className="text-xs text-muted-foreground">No images in the pool yet — upload some below.</p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          const res = await upload(files);
          if (res?.created[0]) onChange(res.created[0].id);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full gap-1.5 text-xs"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Upload more
      </Button>
    </div>
  );
}
