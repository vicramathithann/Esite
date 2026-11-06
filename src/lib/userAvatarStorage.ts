import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const MANIFEST_PATH = path.join(UPLOAD_DIR, "manifest.json");

/**
 * Ensures the avatar upload directory exists.
 */
export function ensureAvatarDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Reads the server-side avatar manifest.
 */
function readManifest(): Record<string, string> {
  try {
    ensureAvatarDir();
    if (fs.existsSync(MANIFEST_PATH)) {
      const data = fs.readFileSync(MANIFEST_PATH, "utf-8");
      return JSON.parse(data) || {};
    }
  } catch (err) {
    console.error("Failed to read avatar manifest:", err);
  }
  return {};
}

/**
 * Writes the server-side avatar manifest.
 */
function writeManifest(manifest: Record<string, string>): void {
  try {
    ensureAvatarDir();
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write avatar manifest:", err);
  }
}

/**
 * Gets the current avatar URL for a user ID.
 */
export function getUserAvatar(userId: string): string | null {
  if (!userId) return null;
  const manifest = readManifest();
  return manifest[userId] || null;
}

/**
 * Sets the avatar URL for a user ID and cleans up any old avatar file.
 */
export function setUserAvatar(userId: string, avatarUrl: string): void {
  if (!userId) return;
  const manifest = readManifest();
  const oldUrl = manifest[userId];

  // If there's an old local file, delete it
  if (oldUrl && oldUrl !== avatarUrl && oldUrl.startsWith("/uploads/avatars/")) {
    const oldFileName = path.basename(oldUrl);
    const oldFilePath = path.join(UPLOAD_DIR, oldFileName);
    try {
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    } catch (err) {
      console.warn("Failed to delete previous avatar file:", err);
    }
  }

  manifest[userId] = avatarUrl;
  writeManifest(manifest);
}

/**
 * Removes the avatar for a user and deletes the file from disk.
 */
export function removeUserAvatar(userId: string): void {
  if (!userId) return;
  const manifest = readManifest();
  const oldUrl = manifest[userId];

  if (oldUrl && oldUrl.startsWith("/uploads/avatars/")) {
    const oldFileName = path.basename(oldUrl);
    const oldFilePath = path.join(UPLOAD_DIR, oldFileName);
    try {
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    } catch (err) {
      console.warn("Failed to delete avatar file on remove:", err);
    }
  }

  delete manifest[userId];
  writeManifest(manifest);
}

/**
 * Validates image buffer magic bytes against allowed formats: JPG, PNG, WEBP.
 */
export function validateImageBuffer(buffer: Buffer): { valid: boolean; ext: string; mime: string } {
  if (!buffer || buffer.length < 12) {
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

  // WebP: RIFF ... WEBP
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return { valid: true, ext: "webp", mime: "image/webp" };
  }

  return { valid: false, ext: "", mime: "" };
}

