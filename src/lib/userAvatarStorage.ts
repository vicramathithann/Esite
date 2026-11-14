import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

let avatarBucketChecked = false;

/**
 * Ensures the 'avatars' bucket exists in Supabase Storage with public access.
 */
export async function ensureAvatarBucket(): Promise<boolean> {
  if (avatarBucketChecked) return true;
  if (!isSupabaseConfigured) return false;

  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.warn("[Avatar Storage] listBuckets notice:", listError.message);
      return false;
    }

    const exists = buckets?.some((b) => b.name === AVATAR_BUCKET);
    if (!exists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: MAX_AVATAR_SIZE,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
      if (createError) {
        console.warn("[Avatar Storage] createBucket notice:", createError.message);
      }
    }
    avatarBucketChecked = true;
    return true;
  } catch (err) {
    console.warn("[Avatar Storage] ensureAvatarBucket error:", err);
    return false;
  }
}

/**
 * Validates real image buffer magic bytes against allowed formats: JPG, PNG, WEBP.
 * Strictly blocks PDFs (%PDF-), executables (MZ), HTML, scripts, or disguised files.
 */
export function validateImageBuffer(buffer: Buffer): { valid: boolean; ext: string; mime: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false, ext: "", mime: "" };
  }

  // Reject PDF explicitly (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { valid: false, ext: "", mime: "" };
  }

  // Reject Windows Executable (MZ)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, ext: "", mime: "" };
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: "jpg", mime: "image/jpeg" };
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
    return { valid: true, ext: "png", mime: "image/png" };
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
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
    return { valid: true, ext: "webp", mime: "image/webp" };
  }

  return { valid: false, ext: "", mime: "" };
}

/**
 * Uploads an avatar image buffer to Supabase Storage with a collision-resistant random filename.
 */
export async function uploadAvatarToStorage(
  userId: string,
  buffer: Buffer,
  mime: string,
  ext: string
): Promise<{ fileName: string; publicUrl: string }> {
  await ensureAvatarBucket();

  const randomHash = crypto.randomBytes(6).toString("hex");
  const fileName = `user-${userId}-${Date.now()}-${randomHash}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(fileName, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    console.error("[Avatar Storage Upload Error]:", uploadError);
    throw new Error(`Cloud storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(fileName);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to generate public URL for avatar");
  }

  return {
    fileName,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Deletes an avatar file from cloud storage when replaced or removed.
 */
export async function deleteAvatarFromStorage(avatarUrlOrPath: string | null | undefined): Promise<void> {
  if (!avatarUrlOrPath) return;

  try {
    // If it's a Supabase public URL: .../storage/v1/object/public/avatars/user-xxx.webp
    let storageFileName = "";
    if (avatarUrlOrPath.includes(`/storage/v1/object/public/${AVATAR_BUCKET}/`)) {
      const parts = avatarUrlOrPath.split(`/storage/v1/object/public/${AVATAR_BUCKET}/`);
      if (parts[1]) {
        // Strip query params if any (?v=...)
        storageFileName = parts[1].split("?")[0];
      }
    } else if (avatarUrlOrPath.includes(`/storage/v1/object/public/product-images/`)) {
      // In case an avatar was stored in product-images bucket
      const parts = avatarUrlOrPath.split(`/storage/v1/object/public/product-images/`);
      if (parts[1]) {
        const p = parts[1].split("?")[0];
        await supabaseAdmin.storage.from("product-images").remove([p]);
        return;
      }
    } else if (!avatarUrlOrPath.startsWith("http://") && !avatarUrlOrPath.startsWith("https://") && !avatarUrlOrPath.startsWith("/")) {
      storageFileName = avatarUrlOrPath.split("?")[0];
    }

    if (storageFileName) {
      const { error } = await supabaseAdmin.storage
        .from(AVATAR_BUCKET)
        .remove([storageFileName]);
      if (error) {
        console.warn("[Avatar Storage Delete Notice]:", error.message);
      }
    }
  } catch (err) {
    console.warn("[Avatar Storage] deleteAvatarFromStorage caught error:", err);
  }
}

// In-memory fallback map for user avatar state during current process lifecycle
const inMemoryAvatarMap = new Map<string, string>();

export function getUserAvatar(userId: string): string | null {
  if (!userId) return null;
  return inMemoryAvatarMap.get(userId) || null;
}

export function setUserAvatar(userId: string, avatarUrl: string): void {
  if (!userId) return;
  inMemoryAvatarMap.set(userId, avatarUrl);
}

export function removeUserAvatar(userId: string): void {
  if (!userId) return;
  inMemoryAvatarMap.delete(userId);
}
