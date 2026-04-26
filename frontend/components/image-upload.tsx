"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  disabled,
  className,
  label = "Upload Image",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Bug fix: sync preview with the value prop so that when the parent clears
  // the value (e.g. form reset), the preview is also cleared.
  useEffect(() => {
    if (!value) {
      setPreview(null);
    }
  }, [value]);

  const handleFile = useCallback(
    (file: File | null) => {
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        onChange(file);
      } else {
        setPreview(null);
        onChange(null);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const clearImage = useCallback(() => {
    setPreview(null);
    onChange(null);
  }, [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
          preview ? "p-2" : "p-8"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {preview ? (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <label
            className={cn(
              "flex flex-col items-center justify-center gap-3 cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                Drag & drop or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleChange}
              disabled={disabled}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
