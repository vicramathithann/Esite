import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_AVATAR_SIZE,
  validateImageBuffer,
  uploadAvatarToStorage,
  deleteAvatarFromStorage,
  setUserAvatar,
  removeUserAvatar,
} from "@/lib/userAvatarStorage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // 1. Strict authentication check: authenticated user only
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return NextResponse.json(
        { success: false, error: "Session expired, sign in again." },
        { status: 401 }
      );
    }
    const authUser = auth;

    // 2. Parse Multipart FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formErr) {
      console.error("[Avatar Upload] Failed to parse formData:", formErr);
      return NextResponse.json(
        { success: false, error: "Upload failed, please try again." },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image file provided." },
        { status: 400 }
      );
    }

    // 3. Size validation (max 5 MB)
    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large" },
        { status: 400 }
      );
    }

    // 4. File signature validation (real magic bytes: JPG, PNG, WEBP)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const formatCheck = validateImageBuffer(buffer);

    if (!formatCheck.valid) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type (use JPG, PNG or WEBP)" },
        { status: 400 }
      );
    }

    // 5. Query user record to safely delete their previous avatar if replacing
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: authUser.id },
      });
      const previousAvatar = (existingUser as any)?.avatar;
      if (previousAvatar) {
        await deleteAvatarFromStorage(previousAvatar);
      }
    } catch (prevErr) {
      console.warn("[Avatar Upload] Cleanup previous avatar notice:", prevErr);
    }

    // 6. Upload new avatar to Cloud Storage (Supabase Storage 'avatars' bucket)
    const { publicUrl } = await uploadAvatarToStorage(
      authUser.id,
      buffer,
      formatCheck.mime,
      formatCheck.ext
    );

    // 7. Persist avatar URL on user record in database
    await prisma.user.update({
      where: { id: authUser.id },
      data: { avatar: publicUrl } as any,
    });

    // Update process memory cache
    setUserAvatar(authUser.id, publicUrl);

    // 8. Return successful response with new URL
    return NextResponse.json({
      success: true,
      avatar: publicUrl,
      message: "Profile picture updated successfully!",
    });
  } catch (error) {
    // Log real internal error server-side only
    console.error("[Avatar Upload Server Error]:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed, please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // 1. Strict authentication check
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return NextResponse.json(
        { success: false, error: "Session expired, sign in again." },
        { status: 401 }
      );
    }
    const authUser = auth;

    // 2. Locate existing avatar and delete from cloud storage
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: authUser.id },
      });
      const currentAvatar = (existingUser as any)?.avatar;
      if (currentAvatar) {
        await deleteAvatarFromStorage(currentAvatar);
      }
    } catch (cleanErr) {
      console.warn("[Avatar Delete] Cleanup notice:", cleanErr);
    }

    // 3. Clear avatar on database record
    await prisma.user.update({
      where: { id: authUser.id },
      data: { avatar: "" } as any,
    });

    // Clear process memory cache
    removeUserAvatar(authUser.id);

    return NextResponse.json({
      success: true,
      avatar: null,
      message: "Profile picture removed successfully.",
    });
  } catch (error) {
    console.error("[Avatar Delete Server Error]:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed, please try again." },
      { status: 500 }
    );
  }
}
