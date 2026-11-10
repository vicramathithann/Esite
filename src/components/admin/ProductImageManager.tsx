"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { 
  UploadCloud, 
  Plus, 
  Trash2, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Link as LinkIcon, 
  AlertCircle, 
  Check, 
  Loader2 
} from "lucide-react";
import { ProductImageData } from "@/lib/types";

interface ProductImageManagerProps {
  images: ProductImageData[];
  onChange: (images: ProductImageData[]) => void;
  availableColors?: { name: string; hex: string }[];
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  errorMessage?: string | null;
  setErrorMessage?: (msg: string | null) => void;
}

interface UploadProgressItem {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  errorText?: string;
}

/**
 * Resizes large photos in the browser (max 1600px) before upload
 * to respect Vercel's serverless ~4.5 MB request payload limit.
 */
async function resizeImageIfNeeded(file: File, maxDimension = 1600, quality = 0.88): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("svg") || file.size < 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }

      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const safeName = file.name.replace(/\.[^.]+$/, ".webp");
          const resizedFile = new File([blob], safeName, {
            type: "image/webp",
          });
          resolve(resizedFile);
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function ProductImageManager({
  images,
  onChange,
  availableColors = [],
  isUploading,
  setIsUploading,
  errorMessage,
  setErrorMessage,
}: ProductImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadProgressItem[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [urlAlt, setUrlAlt] = useState("");

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (images.length + fileList.length > 8) {
      setErrorMessage?.(`Maximum 8 photos allowed. You currently have ${images.length}.`);
      return;
    }

    setErrorMessage?.(null);
    setIsUploading(true);

    const files = Array.from(fileList);
    const newUploadItems: UploadProgressItem[] = files.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      progress: 10,
      status: "uploading",
    }));

    setUploadItems((prev) => [...prev, ...newUploadItems]);

    const newUploadedImages: ProductImageData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemTracker = newUploadItems[i];

      try {
        // Step 1: Pre-process resize if large
        const preparedFile = await resizeImageIfNeeded(file);

        // Step 2: Upload through authenticated API
        const formData = new FormData();
        formData.append("file", preparedFile);
        formData.append("folder", "products");

        setUploadItems((prev) =>
          prev.map((item) =>
            item.id === itemTracker.id ? { ...item, progress: 50 } : item
          )
        );

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await res.json();

        if (res.ok && data.success && data.url) {
          setUploadItems((prev) =>
            prev.map((item) =>
              item.id === itemTracker.id ? { ...item, progress: 100, status: "done" } : item
            )
          );

          newUploadedImages.push({
            url: data.url,
            alt: file.name.replace(/\.[^.]+$/, ""),
            isPrimary: images.length === 0 && newUploadedImages.length === 0,
            order: images.length + newUploadedImages.length,
          });
        } else {
          setUploadItems((prev) =>
            prev.map((item) =>
              item.id === itemTracker.id
                ? { ...item, status: "error", errorText: data.error || "Upload rejected." }
                : item
            )
          );
          setErrorMessage?.(data.error || `Upload failed for ${file.name}`);
        }
      } catch (err: any) {
        console.error("Upload error:", err);
        setUploadItems((prev) =>
          prev.map((item) =>
            item.id === itemTracker.id
              ? { ...item, status: "error", errorText: err?.message || "Network error" }
              : item
          )
        );
        setErrorMessage?.(`Network error while uploading ${file.name}`);
      }
    }

    if (newUploadedImages.length > 0) {
      const combined = [...images, ...newUploadedImages];
      // Ensure at least one primary
      if (!combined.some((img) => img.isPrimary) && combined.length > 0) {
        combined[0].isPrimary = true;
      }
      onChange(combined);
    }

    setIsUploading(false);

    // Clear completed upload trackers after 3 seconds
    setTimeout(() => {
      setUploadItems((prev) => prev.filter((item) => item.status === "uploading"));
    }, 3000);
  };

  const handleAddExternalUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = externalUrl.trim();
    if (!cleanUrl) return;

    if (images.length >= 8) {
      setErrorMessage?.("Maximum 8 images allowed per product.");
      return;
    }

    const newImg: ProductImageData = {
      url: cleanUrl,
      alt: urlAlt.trim() || `Product photo ${images.length + 1}`,
      isPrimary: images.length === 0,
      order: images.length,
    };

    const updated = [...images, newImg];
    if (!updated.some((img) => img.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
    setExternalUrl("");
    setUrlAlt("");
    setShowUrlInput(false);
  };

  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onChange(updated);
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Re-index order
    const reordered = updated.map((img, i) => ({ ...img, order: i }));
    onChange(reordered);
  };

  const handleRemove = async (index: number) => {
    const target = images[index];
    if (!window.confirm("Are you sure you want to remove this product image?")) {
      return;
    }

    // Call delete API if hosted in Supabase Storage
    if (target.url.includes("supabase.co/storage")) {
      try {
        await fetch("/api/admin/upload", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target.url }),
        });
      } catch (err) {
        console.warn("Storage deletion notice:", err);
      }
    }

    const remaining = images.filter((_, i) => i !== index);
    if (target.isPrimary && remaining.length > 0) {
      remaining[0].isPrimary = true;
    }
    const reindexed = remaining.map((img, i) => ({ ...img, order: i }));
    onChange(reindexed);
  };

  const handleUpdateImage = (index: number, patch: Partial<ProductImageData>) => {
    const updated = images.map((img, i) => (i === index ? { ...img, ...patch } : img));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Product Gallery & Images</h3>
          <p className="text-xs text-muted">
            Upload 1 to 8 high-resolution product photos (JPG, PNG, WebP up to 5 MB each).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-tile hover:bg-tile/80 text-foreground transition cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5 text-[#C9A66B]" />
            {showUrlInput ? "Cancel URL" : "Add Image URL"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || images.length >= 8}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] hover:bg-[#B8914A] transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Choose Photos
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Add External URL Input Box */}
      {showUrlInput && (
        <form onSubmit={handleAddExternalUrl} className="p-4 bg-tile/60 border border-border rounded-xl space-y-3">
          <div className="text-xs font-semibold text-foreground">Add Hosted Image by URL</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="url"
              placeholder="https://example.com/phone.jpg"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              required
              className="sm:col-span-2 px-3 py-1.5 bg-tile border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-[#C9A66B]"
            />
            <input
              type="text"
              placeholder="Alt description (optional)"
              value={urlAlt}
              onChange={(e) => setUrlAlt(e.target.value)}
              className="px-3 py-1.5 bg-tile border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-[#C9A66B]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="px-3 py-1 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1 bg-[#C9A66B] text-white rounded-lg text-xs font-semibold hover:bg-[#B8914A]"
            >
              Add to Gallery
            </button>
          </div>
        </form>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFilesSelected(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-[#C9A66B] bg-[#C9A66B]/10"
            : "border-border/80 bg-tile/30 hover:border-[#C9A66B]/60 hover:bg-tile/60"
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-[#C9A66B]/15 border border-[#C9A66B]/30 flex items-center justify-center mb-2.5 text-[#C9A66B] dark:text-[#D4B483]">
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-foreground mb-0.5">
          Drag and drop product photos here, or <span className="text-[#C9A66B] dark:text-[#D4B483] underline underline-offset-2">browse files</span>
        </p>
        <p className="text-[11px] text-muted">
          JPG, PNG, or WebP up to 5 MB. Photos are automatically compressed and backed by cloud storage. ({images.length}/8 uploaded)
        </p>
      </div>

      {/* Upload Progress Trackers */}
      {uploadItems.length > 0 && (
        <div className="space-y-2">
          {uploadItems.map((item) => (
            <div key={item.id} className="p-2.5 bg-tile border border-border rounded-xl flex items-center gap-3 text-xs">
              {item.status === "uploading" ? (
                <Loader2 className="w-4 h-4 text-[#C9A66B] animate-spin shrink-0" />
              ) : item.status === "done" ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate text-foreground text-[11px]">{item.name}</span>
                  <span className="text-[10px] text-muted">{item.status === "error" ? "Failed" : `${item.progress}%`}</span>
                </div>
                <div className="w-full bg-border rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${item.status === "error" ? "bg-rose-500" : "bg-[#C9A66B]"}`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                {item.errorText && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium">{item.errorText}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Image Thumbnails Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
          {images.map((img, idx) => (
            <div
              key={img.url || idx}
              className={`group relative bg-card border rounded-2xl p-2.5 shadow-xs flex flex-col justify-between transition-all ${
                img.isPrimary
                  ? "border-[#C9A66B] ring-2 ring-[#C9A66B]/20"
                  : "border-border hover:border-border/80"
              }`}
            >
              {/* Photo Preview */}
              <div className="relative aspect-square w-full rounded-xl bg-tile border border-border/40 overflow-hidden flex items-center justify-center mb-2">
                <Image
                  src={img.url}
                  alt={img.alt || "Product image"}
                  fill
                  unoptimized
                  className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                />

                {/* Primary Tag */}
                {img.isPrimary && (
                  <div className="absolute top-2 left-2 bg-[#C9A66B] text-[#FFFCFA] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Star className="w-3 h-3 fill-current" /> Primary
                  </div>
                )}

                {/* Action Overlay */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                  {!img.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className="p-1 rounded-lg bg-black/60 text-white hover:text-amber-400 hover:bg-black/80 transition cursor-pointer"
                      title="Set as primary product photo"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1 rounded-lg bg-black/60 text-white hover:text-rose-400 hover:bg-black/80 transition cursor-pointer"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Controls below image */}
              <div className="space-y-1.5">
                {/* Alt text input */}
                <input
                  type="text"
                  placeholder="Alt caption"
                  value={img.alt || ""}
                  onChange={(e) => handleUpdateImage(idx, { alt: e.target.value })}
                  className="w-full px-2 py-1 bg-tile border border-border rounded text-[11px] text-foreground focus:outline-none focus:border-[#C9A66B]"
                />

                {/* Color association dropdown (if colors exist) */}
                {availableColors.length > 0 && (
                  <select
                    value={img.colorKey || ""}
                    onChange={(e) => handleUpdateImage(idx, { colorKey: e.target.value || undefined })}
                    className="w-full px-2 py-1 bg-tile border border-border rounded text-[11px] text-muted focus:outline-none focus:border-[#C9A66B]"
                  >
                    <option value="">All Finishes (Neutral)</option>
                    {availableColors.map((c) => (
                      <option key={c.name} value={c.name}>
                        Finish: {c.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Move Left / Right Reorder Buttons */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-muted">
                  <span className="font-semibold text-[10px]">Photo {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "left")}
                      className="p-1 rounded border border-border hover:bg-tile disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Move backward"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => handleMove(idx, "right")}
                      className="p-1 rounded border border-border hover:bg-tile disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Move forward"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 border border-dashed border-rose-500/40 bg-rose-500/5 rounded-xl text-center text-xs text-rose-500 font-medium">
          No images uploaded yet. Every product requires at least 1 photo before saving.
        </div>
      )}
    </div>
  );
}
