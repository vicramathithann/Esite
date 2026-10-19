import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // Strictly authenticate via signed session cookie
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Fetch me error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
