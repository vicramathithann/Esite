import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Admin login methods have been removed. Use email recovery sent to rrroyce20@gmail.com to access the admin account.",
    },
    { status: 403 }
  );
}
