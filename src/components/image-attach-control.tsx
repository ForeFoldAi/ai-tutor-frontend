import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, FileImage, ImageIcon, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadTutorImage, validateTutorImageFile } from "@/api/tutor-images";
import { cn } from "@/lib/utils";

export type AttachedTutorImage = {
  file: File;
  previewUrl: string;
  imageId?: string;
};

type Props = {
  disabled?: boolean;
  className?: string;
  attached: AttachedTutorImage | null;
  onChange: (next: AttachedTutorImage | null) => void;
  onError?: (message: string) => void;
};

/**
 * Shared + attach control: camera / gallery / files for tutor composers.
 */
export function ImageAttachControl({
  disabled,
  className,
  attached,
  onChange,
  onError,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const clear = useCallback(() => {
    if (attached?.previewUrl) URL.revokeObjectURL(attached.previewUrl);
    onChange(null);
  }, [attached, onChange]);

  useEffect(() => {
    return () => {
      if (attached?.previewUrl) URL.revokeObjectURL(attached.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount of current preview
  }, [attached?.previewUrl]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (attached) {
      onError?.("Please remove the current image before attaching another.");
      return;
    }
    const err = validateTutorImageFile(file);
    if (err) {
      onError?.(err);
      return;
    }
    onChange({ file, previewUrl: URL.createObjectURL(file) });
  };

  return (
    <div className={cn("flex items-center", className)}>
      <input
        ref={cameraRef}
        id={`${uid}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        id={`${uid}-gallery`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        id={`${uid}-file`}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="h-11 w-11 shrink-0"
            title="Attach image"
            aria-label="Attach image"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              cameraRef.current?.click();
            }}
          >
            <Camera className="mr-2 h-4 w-4" />
            Take photo
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              galleryRef.current?.click();
            }}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Photo library
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              fileRef.current?.click();
            }}
          >
            <FileImage className="mr-2 h-4 w-4" />
            Choose file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {attached ? (
        <button
          type="button"
          className="ml-1 relative h-11 w-11 overflow-hidden rounded-md border"
          onClick={clear}
          title="Remove image"
          aria-label="Remove attached image"
        >
          <img src={attached.previewUrl} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100">
            <X className="h-4 w-4" />
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** Upload attached file if needed; returns image_id list (0 or 1). */
export async function ensureUploadedImageIds(
  attached: AttachedTutorImage | null,
  onProgress?: (uploading: boolean) => void,
): Promise<string[]> {
  if (!attached) return [];
  if (attached.imageId) return [attached.imageId];
  onProgress?.(true);
  try {
    const res = await uploadTutorImage(attached.file);
    attached.imageId = res.image_id;
    return [res.image_id];
  } finally {
    onProgress?.(false);
  }
}

export function useTutorImageAttach() {
  const [attached, setAttached] = useState<AttachedTutorImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setAttached((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setAttachError(null);
  }, []);

  return {
    attached,
    setAttached,
    uploading,
    setUploading,
    attachError,
    setAttachError,
    clear,
  };
}
