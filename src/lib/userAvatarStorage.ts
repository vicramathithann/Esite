type NodeFs = {
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
  readFileSync: (path: string, encoding: string) => string;
  writeFileSync: (path: string, data: string, encoding: string) => void;
  unlinkSync: (path: string) => void;
};

type NodePath = {
  join: (...paths: string[]) => string;
  basename: (path: string) => string;
};

function getFs(): NodeFs | null {
  if (typeof window !== "undefined") return null;
  try {
    const req = eval("require");
    return req("fs") as NodeFs;
  } catch {
    return null;
  }
}

function getPath(): NodePath | null {
  if (typeof window !== "undefined") return null;
  try {
    const req = eval("require");
    return req("path") as NodePath;
  } catch {
    return null;
  }
}

function getUploadDir(): string {
  const path = getPath();
  if (!path) return "";
  return path.join(process.cwd(), "public", "uploads", "avatars");
}

function getManifestPath(): string {
  const path = getPath();
  if (!path) return "";
  return path.join(getUploadDir(), "manifest.json");
}

/**
 * Ensures the avatar upload directory exists on server.
 */
export function ensureAvatarDir(): void {
  const fs = getFs();
  const dir = getUploadDir();
  if (fs && dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Reads the server-side avatar manifest.
 */
function readManifest(): Record<string, string> {
  const fs = getFs();
  const manifestPath = getManifestPath();
  if (!fs || !manifestPath) return {};
  try {
    ensureAvatarDir();
    if (fs.existsSync(manifestPath)) {
      const data = fs.readFileSync(manifestPath, "utf-8");
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
  const fs = getFs();
  const manifestPath = getManifestPath();
  if (!fs || !manifestPath) return;
  try {
    ensureAvatarDir();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
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
  const fs = getFs();
  const path = getPath();
  const manifest = readManifest();
  const oldUrl = manifest[userId];

  // If there's an old local file, delete it
  if (oldUrl && oldUrl !== avatarUrl && oldUrl.startsWith("/uploads/avatars/") && fs && path) {
    const oldFileName = path.basename(oldUrl);
    const oldFilePath = path.join(getUploadDir(), oldFileName);
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
  const fs = getFs();
  const path = getPath();
  const manifest = readManifest();
  const oldUrl = manifest[userId];

  if (oldUrl && oldUrl.startsWith("/uploads/avatars/") && fs && path) {
    const oldFileName = path.basename(oldUrl);
    const oldFilePath = path.join(getUploadDir(), oldFileName);
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
