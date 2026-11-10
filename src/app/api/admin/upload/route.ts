import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export const runtime = "nodejs";

const BUCKET_NAME = "product-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates real file magic bytes to verify it's a genuine JPG, PNG, or WebP.
 */
function detectImageSignature(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 12) return null;

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  // WEBP: 'RIFF' .... 'WEBP'
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

/**
 * Ensures bucket exists in Supabase Storage with public read access
 */
let bucketChecked = false;
async function ensureBucket() {
  if (bucketChecked) return;
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets || !buckets.some((b) => b.name === BUCKET_NAME)) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
    }
    bucketChecked = true;
  } catch (err) {
    console.warn("Bucket ensure notice:", err);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "products";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided for upload." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 5 MB limit (size: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a smaller photo or compress it first.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate real file signature (magic bytes)
    const detected = detectImageSignature(buffer);
    if (!detected) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file format or signature. Only real JPG, PNG, and WebP images are permitted (PDFs, executables, or disguised files are strictly blocked).",
        },
        { status: 400 }
      );
    }

    await ensureBucket();

    // Generate safe, collision-resistant unique file name
    const cleanFolder = folder.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "products";
    const uniqueHash = crypto.randomBytes(6).toString("hex");
    const safePath = `${cleanFolder}/${Date.now()}-${uniqueHash}.${detected.ext}`;

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(safePath, buffer, {
        contentType: detected.mime,
        upsert: true,
      });

    if (uploadErr) {
      console.error("[Supabase Storage Upload Error]:", uploadErr);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      size: file.size,
      mime: detected.mime,
    });
  } catch (error: any) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during upload." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { url, path } = await request.json();

    let targetPath = path;
    if (!targetPath && url && typeof url === "string") {
      // Parse relative storage path if public URL was provided
      const bucketMarker = `/${BUCKET_NAME}/`;
      const idx = url.indexOf(bucketMarker);
      if (idx !== -1) {
        targetPath = url.substring(idx + bucketMarker.length);
      }
    }

    if (!targetPath) {
      return NextResponse.json(
        { success: false, error: "Image path or URL is required for deletion." },
        { status: 400 }
      );
    }

    const { error: delErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([targetPath]);

    if (delErr) {
      console.warn("Storage delete notice:", delErr);
    }

    return NextResponse.json({
      success: true,
      message: "Image successfully removed from cloud storage.",
    });
  } catch (error: any) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete image." },
      { status: 500 }
    );
  }
}
