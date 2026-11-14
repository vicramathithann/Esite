"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Camera,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Check,
  AlertCircle,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";

export interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  currentAvatarUrl?: string | null;
  userInitial?: string;
  onSuccess: (newAvatarUrl: string) => void;
  onRemoveSuccess?: () => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const CROP_BOX_SIZE = 260; // 260px crop viewport in modal
const MAX_PREVIEW_DIMENSION = 2000; // Downscale long side to max 2000px before displaying

/**
 * Pre-processes an image file:
 * 1. Checks file type and size.
 * 2. Reads the image and corrects EXIF orientation.
 * 3. Downscales in the browser so the long side is at most 2000px before editing.
 */
async function processSelectedImage(
  file: File
): Promise<{ dataUrl: string; width: number; height: number; originalFileName: string }> {
  // Validate type
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Unsupported file type (use JPG, PNG or WEBP)");
  }

  // Max 20 MB raw input file
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("File too large (maximum size is 20 MB)");
  }

  // Load into HTMLImageElement
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image file"));
    img.src = objectUrl;
  });

  URL.revokeObjectURL(objectUrl);

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  if (!naturalWidth || !naturalHeight) {
    throw new Error("Invalid image dimensions");
  }

  // Calculate downscaled dimensions so long side <= 2000px
  let targetWidth = naturalWidth;
  let targetHeight = naturalHeight;

  if (Math.max(naturalWidth, naturalHeight) > MAX_PREVIEW_DIMENSION) {
    if (naturalWidth >= naturalHeight) {
      targetWidth = MAX_PREVIEW_DIMENSION;
      targetHeight = Math.round((naturalHeight / naturalWidth) * MAX_PREVIEW_DIMENSION);
    } else {
      targetHeight = MAX_PREVIEW_DIMENSION;
      targetWidth = Math.round((naturalWidth / naturalHeight) * MAX_PREVIEW_DIMENSION);
    }
  }

  // Draw to offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to initialize canvas");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  return {
    dataUrl,
    width: targetWidth,
    height: targetHeight,
    originalFileName: file.name,
  };
}

export default function AvatarCropModal({
  isOpen,
  onClose,
  initialFile,
  currentAvatarUrl,
  userInitial = "U",
  onSuccess,
  onRemoveSuccess,
}: AvatarCropModalProps) {
  // Modal file picker & image states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Crop Controls: Zoom (1x to 3x), Pan, Rotation (0, 90, 180, 270), Shape
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [cropShape, setCropShape] = useState<"circle" | "square">("circle");

  // Interaction tracking (Mouse & Touch)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const initialTouchZoomRef = useRef<number>(1.0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);

  // Effective dimensions considering rotation
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const effectiveWidth = isRotated90or270 ? imageDims.height : imageDims.width;
  const effectiveHeight = isRotated90or270 ? imageDims.width : imageDims.height;

  // Base scale: Minimum scale to completely cover the CROP_BOX_SIZE at zoom 1.0
  const baseScale = useMemo(() => {
    if (!effectiveWidth || !effectiveHeight) return 1;
    return Math.max(CROP_BOX_SIZE / effectiveWidth, CROP_BOX_SIZE / effectiveHeight);
  }, [effectiveWidth, effectiveHeight]);

  const currentScale = baseScale * zoom;

  // Maximum allowed pan to prevent crop area from leaving the image (no empty edges)
  const maxPanX = useMemo(() => {
    if (!effectiveWidth) return 0;
    const renderedWidth = effectiveWidth * currentScale;
    return Math.max(0, (renderedWidth - CROP_BOX_SIZE) / 2);
  }, [effectiveWidth, currentScale]);

  const maxPanY = useMemo(() => {
    if (!effectiveHeight) return 0;
    const renderedHeight = effectiveHeight * currentScale;
    return Math.max(0, (renderedHeight - CROP_BOX_SIZE) / 2);
  }, [effectiveHeight, currentScale]);

  // Safe pan clamp helper
  const clampPan = useCallback(
    (x: number, y: number, currentMaxX = maxPanX, currentMaxY = maxPanY) => {
      return {
        x: Math.min(currentMaxX, Math.max(-currentMaxX, x)),
        y: Math.min(currentMaxY, Math.max(-currentMaxY, y)),
      };
    },
    [maxPanX, maxPanY]
  );

  // Re-clamp pan whenever boundaries shift (e.g. on zoom or rotation change)
  useEffect(() => {
    setPan((prev) => clampPan(prev.x, prev.y));
  }, [clampPan]);

  // Handle incoming file
  const handleLoadFile = useCallback(async (file: File) => {
    try {
      setIsProcessingFile(true);
      setModalError(null);
      const processed = await processSelectedImage(file);
      setImageSrc(processed.dataUrl);
      setImageDims({ width: processed.width, height: processed.height });
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setRotation(0);
    } catch (err: unknown) {
      console.error("[Avatar Editor File Error]:", err);
      const message = err instanceof Error ? err.message : "Failed to load image.";
      setModalError(message);
    } finally {
      setIsProcessingFile(false);
    }
  }, []);

  // Process initialFile when modal opens
  useEffect(() => {
    if (isOpen && initialFile) {
      handleLoadFile(initialFile);
    } else if (!isOpen) {
      // Reset state when closed
      setImageSrc(null);
      setModalError(null);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setIsSaving(false);
    }
  }, [isOpen, initialFile, handleLoadFile]);

  // Keyboard navigation: Escape to close, + / - for zoom, arrows for pan
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onClose();
        return;
      }
      if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(3.0, +(z + 0.1).toFixed(2)));
      } else if (e.key === "-" || e.key === "_") {
        setZoom((z) => Math.max(1.0, +(z - 0.1).toFixed(2)));
      } else if (e.key === "ArrowLeft") {
        setPan((p) => clampPan(p.x + 10, p.y));
      } else if (e.key === "ArrowRight") {
        setPan((p) => clampPan(p.x - 10, p.y));
      } else if (e.key === "ArrowUp") {
        setPan((p) => clampPan(p.x, p.y + 10));
      } else if (e.key === "ArrowDown") {
        setPan((p) => clampPan(p.x, p.y - 10));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose, clampPan]);

  // Non-passive wheel listener for smooth mouse wheel zoom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.0015;
      setZoom((prev) => {
        const next = Math.min(3.0, Math.max(1.0, prev + zoomDelta));
        return parseFloat(next.toFixed(3));
      });
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [imageSrc]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setPan(clampPan(initialPanRef.current.x + deltaX, initialPanRef.current.y + deltaY));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch handlers: Pan & Pinch to zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPanRef.current = { ...pan };
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchDistanceRef.current = dist;
      initialTouchZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;
      setPan(clampPan(initialPanRef.current.x + deltaX, initialPanRef.current.y + deltaY));
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / touchDistanceRef.current;
      const newZoom = Math.min(3.0, Math.max(1.0, initialTouchZoomRef.current * ratio));
      setZoom(parseFloat(newZoom.toFixed(3)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
      touchDistanceRef.current = null;
    } else if (e.touches.length === 1) {
      // One finger remains, reinitialize pan anchor
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPanRef.current = { ...pan };
      touchDistanceRef.current = null;
    }
  };

  // Rotation Handlers
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to initial fitted state
  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Change Photo Picker
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLoadFile(file);
    }
    e.target.value = "";
  };

  // Drag and drop handler onto modal
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLoadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Save Cropped Photo (Canvas 512x512 WebP export & Upload)
  const handleSavePhoto = async () => {
    if (!imageSrc || !imgElementRef.current || isSaving) return;

    try {
      setIsSaving(true);
      setModalError(null);

      const targetSize = 512;
      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize 2D canvas");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Scale multiplier from CROP_BOX_SIZE to target 512px canvas
      const canvasMultiplier = targetSize / CROP_BOX_SIZE;

      ctx.save();
      // Center on canvas with pan offset
      ctx.translate(targetSize / 2 + pan.x * canvasMultiplier, targetSize / 2 + pan.y * canvasMultiplier);
      ctx.rotate((rotation * Math.PI) / 180);

      // Render dimensions
      const drawWidth = imageDims.width * currentScale * canvasMultiplier;
      const drawHeight = imageDims.height * currentScale * canvasMultiplier;

      ctx.drawImage(imgElementRef.current, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Export as WebP (fallback JPEG) at 85% quality (typical size: 30-150 KB)
      let blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.85)
      );

      let fileExt = "webp";
      if (!blob) {
        blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
        );
        fileExt = "jpg";
      }

      if (!blob) throw new Error("Failed to export image from canvas");

      // Upload via FormData
      const formData = new FormData();
      formData.append("file", blob, `avatar.${fileExt}`);

      const res = await fetch("/api/auth/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.avatar) {
        throw new Error(data.error || "Upload failed, please try again");
      }

      // Success! Pass back with cache-busting timestamp
      const newAvatarUrl = `${data.avatar}?v=${Date.now()}`;
      onSuccess(newAvatarUrl);
      onClose();
    } catch (err: unknown) {
      console.error("[Avatar Save Error]:", err);
      const message = err instanceof Error ? err.message : "Upload failed, please try again";
      setModalError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Photo Handler
  const handleRemovePhoto = async () => {
    if (!currentAvatarUrl || isRemoving || isSaving) return;
    if (!confirm("Are you sure you want to remove your profile photo?")) return;

    try {
      setIsRemoving(true);
      setModalError(null);

      const res = await fetch("/api/auth/profile/avatar", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove photo");
      }

      onRemoveSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error("[Avatar Remove Error]:", err);
      const message = err instanceof Error ? err.message : "Failed to remove photo";
      setModalError(message);
    } finally {
      setIsRemoving(false);
    }
  };

  if (!isOpen) return null;

  // Live mini-preview scale (56px preview / 260px crop box = 0.215)
  const previewSize = 56;
  const previewRatio = previewSize / CROP_BOX_SIZE;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-editor-title"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Modal Dialog Card: Full screen on phone, max-w-md / rounded-2xl on laptop */}
      <div className="bg-card text-foreground border border-border sm:rounded-2xl w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-md shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 id="avatar-editor-title" className="font-bold text-sm text-foreground">
                Edit Profile Picture
              </h2>
              <p className="text-[11px] text-muted hidden sm:block">
                LinkedIn-style precision crop & zoom
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-tile transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close photo editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable if small screen */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center justify-center select-none">
          {/* Error Banner inside modal */}
          {modalError && (
            <div className="w-full mb-3 p-3 bg-red-500/10 border border-red-500/25 text-red-500 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{modalError}</span>
            </div>
          )}

          {isProcessingFile ? (
            <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-muted">
              <RefreshCw className="w-8 h-8 animate-spin text-[#C9A66B]" />
              <span className="text-xs font-semibold">Processing image...</span>
            </div>
          ) : imageSrc ? (
            <div className="w-full flex flex-col items-center">
              {/* LinkedIn Interactive Viewport (260px x 260px) */}
              <div
                ref={viewportRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative w-[260px] h-[260px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing border border-border touch-none select-none shadow-inner"
                title="Drag to reposition, pinch or scroll to zoom"
              >
                {/* Background Image with Pan, Zoom & Rotation */}
                <img
                  ref={imgElementRef}
                  src={imageSrc}
                  alt="Crop Target"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${currentScale})`,
                    transformOrigin: "center center",
                    maxWidth: "none",
                    willChange: "transform",
                    transition: isDraggingRef.current ? "none" : "transform 0.08s ease-out",
                  }}
                  className="pointer-events-none select-none max-w-none"
                />

                {/* LinkedIn Cutout Mask: Dimmed surrounding area with clear viewport */}
                <div
                  className={`pointer-events-none absolute inset-0 border-2 border-[#C9A66B] ${
                    cropShape === "circle" ? "rounded-full" : "rounded-2xl"
                  } shadow-[0_0_0_9999px_rgba(0,0,0,0.72)]`}
                />

                {/* Center crosshair / guide dots */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-2 h-2 rounded-full border border-white" />
                </div>
              </div>

              {/* Instructions Pill */}
              <p className="text-[11px] text-muted mt-2 text-center">
                Drag to reposition • Scroll or pinch to zoom
              </p>

              {/* Controls Stack: Zoom, Rotation, Shape & Live Preview */}
              <div className="w-full max-w-[320px] mt-3.5 space-y-3">
                {/* 1. Zoom Slider (1x to 3x) */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1.0, +(z - 0.1).toFixed(2)))}
                    className="p-1 rounded-md text-muted hover:text-foreground hover:bg-tile"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-[#C9A66B] cursor-pointer h-1.5 bg-tile rounded-lg"
                    aria-label="Zoom factor slider"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3.0, +(z + 0.1).toFixed(2)))}
                    className="p-1 rounded-md text-muted hover:text-foreground hover:bg-tile"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-muted w-9 text-right">
                    {zoom.toFixed(1)}x
                  </span>
                </div>

                {/* 2. Tool buttons: Rotate Left, Rotate Right, Reset, and Shape Selector */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRotateLeft}
                      className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-tile transition-colors border border-border/60"
                      title="Rotate Left 90°"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRotateRight}
                      className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-tile transition-colors border border-border/60"
                      title="Rotate Right 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-tile transition-colors border border-border/60 flex items-center gap-1"
                      title="Reset Position & Zoom"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>

                  {/* Circle / Square Mask Toggle */}
                  <div className="flex items-center gap-1 bg-tile p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setCropShape("circle")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        cropShape === "circle"
                          ? "bg-[#C9A66B] text-[#FFFCFA] shadow-xs"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      Circle
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropShape("square")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        cropShape === "square"
                          ? "bg-[#C9A66B] text-[#FFFCFA] shadow-xs"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      Square
                    </button>
                  </div>
                </div>

                {/* 3. Live Preview & Change Photo bar */}
                <div className="flex items-center justify-between bg-tile/70 border border-border rounded-xl p-2.5">
                  <div className="flex items-center gap-3">
                    {/* Live mini preview of final avatar */}
                    <div
                      className={`relative w-11 h-11 bg-slate-950 overflow-hidden shrink-0 border border-[#C9A66B] ${
                        cropShape === "circle" ? "rounded-full" : "rounded-xl"
                      }`}
                    >
                      <img
                        src={imageSrc}
                        alt="Preview"
                        style={{
                          transform: `translate(${pan.x * previewRatio}px, ${pan.y * previewRatio}px) rotate(${rotation}deg) scale(${currentScale * previewRatio})`,
                          transformOrigin: "center center",
                          maxWidth: "none",
                        }}
                        className="pointer-events-none select-none max-w-none"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Live Preview</div>
                      <div className="text-[10px] text-muted">512x512 High-Res</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[#C9A66B] dark:text-[#D4B483] hover:bg-[#C9A66B]/10 transition-colors cursor-pointer"
                  >
                    Change photo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state when opened without initial file: Dropzone picker */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-[320px] h-60 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-[#C9A66B] hover:bg-tile/50 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-[#C9A66B]/15 text-[#C9A66B] flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-foreground mb-1">
                Click or drag & drop photo here
              </p>
              <p className="text-[11px] text-muted">
                JPG, PNG or WEBP (Max 20 MB)
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-tile border-t border-border flex items-center justify-between shrink-0">
          <div>
            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isSaving || isRemoving}
                className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRemoving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Remove photo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isRemoving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-tile text-foreground cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePhoto}
              disabled={!imageSrc || isSaving || isRemoving}
              className="px-5 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Photo...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
