"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, File, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FILE_CONSTRAINTS, formatFileSize } from "@/lib/r2";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  itemType: "file" | "image";
  onUploadComplete: (data: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
  }) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

interface UploadedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export default function FileUpload({
  itemType,
  onUploadComplete,
  onUploadError,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const constraints = FILE_CONSTRAINTS[itemType];
  const acceptedExtensions = constraints.extensions.join(",");
  const maxSizeMB = constraints.maxSize / (1024 * 1024);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check size
      if (file.size > constraints.maxSize) {
        return `File size exceeds ${maxSizeMB} MB limit`;
      }

      // Check extension
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!(constraints.extensions as readonly string[]).includes(ext)) {
        return `Invalid file type. Allowed: ${constraints.extensions.join(", ")}`;
      }

      return null;
    },
    [constraints, maxSizeMB]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const error = validateFile(file);
      if (error) {
        onUploadError(error);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemType", itemType);

        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        const uploadPromise = new Promise<UploadedFile>((resolve, reject) => {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(progress);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                resolve(response.data);
              } else {
                reject(new Error(response.error || "Upload failed"));
              }
            } else {
              const response = JSON.parse(xhr.responseText);
              reject(new Error(response.error || "Upload failed"));
            }
          };

          xhr.onerror = () => reject(new Error("Network error"));
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);

        const data = await uploadPromise;
        setUploadedFile(data);
        onUploadComplete(data);
      } catch (err) {
        onUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [itemType, validateFile, onUploadComplete, onUploadError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [disabled, isUploading, uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFile]
  );

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  // Show uploaded file preview
  if (uploadedFile) {
    const isImage = itemType === "image";

    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          {isImage ? (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedFile.fileUrl}
                alt={uploadedFile.fileName}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-muted">
              <File className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">
              {uploadedFile.fileName}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatFileSize(uploadedFile.fileSize)}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleRemoveFile}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Show upload area
  return (
    <div
      className={cn(
        "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50",
        (disabled || isUploading) && "cursor-not-allowed opacity-50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div className="flex flex-col items-center gap-3">
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Uploading...</p>
              <p className="text-muted-foreground text-xs">{uploadProgress}%</p>
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-muted p-3">
              {itemType === "image" ? (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">
                Drop {itemType === "image" ? "an image" : "a file"} here or
                click to upload
              </p>
              <p className="text-muted-foreground text-xs">
                Max {maxSizeMB} MB
                {itemType === "image"
                  ? " (PNG, JPG, GIF, WebP, SVG)"
                  : " (PDF, TXT, MD, JSON, YAML, XML, CSV)"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
