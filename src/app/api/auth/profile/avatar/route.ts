import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureAvatarDir,
  setUserAvatar,
  removeUserAvatar,
  validateImageBuffer,
} from "@/lib/userAvatarStorage";

// Max file size: 2 MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image file provided." },
        { status: 400 }
      );
    }

    // Check size limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Image exceeds 2 MB size limit. Please select a smaller photo.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate image format through magic bytes
    const formatCheck = validateImageBuffer(buffer);
    if (!formatCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid image format. Supported formats: JPG, PNG, and WEBP.",
        },
        { status: 400 }
      );
    }

    ensureAvatarDir();
    const fileName = `avatar-${authUser.id}-${Date.now()}.${formatCheck.ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Write file to disk
    await fs.writeFile(filePath, buffer);
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // Update manifest storage (cleans up any older avatar file for this user)
    setUserAvatar(authUser.id, avatarUrl);

    // Try updating user record in DB if avatar column is supported
    try {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { avatar: avatarUrl } as any,
      });
    } catch {
      // Ignored if column doesn't exist yet on remote table
    }

    return NextResponse.json({
      success: true,
      avatar: avatarUrl,
      message: "Profile picture updated successfully!",
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload profile picture." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;

    removeUserAvatar(authUser.id);

    // Try updating user record in DB
    try {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { avatar: "" } as any,
      });
    } catch {
      // Ignored
    }

    return NextResponse.json({
      success: true,
      avatar: null,
      message: "Profile picture removed successfully.",
    });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove profile picture." },
      { status: 500 }
    );
  }
}

