import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Temporary Supabase Health Check Endpoint
 * Runs a simple select on "MobileProduct" using the public anon client.
 * Verifies Supabase connectivity, table existence, and anon SELECT RLS policy.
 * Delete this route after testing.
 */
export async function GET() {
  try {
    const { count, data, error } = await supabase
      .from("MobileProduct")
      .select("id, name", { count: "exact" })
      .limit(1);

    if (error) {
      console.error(
        `[Supabase Health Check Error] Code: ${error.code} | Message: ${error.message} | Hint: ${error.hint || "None"} | Details: ${error.details || "None"}`
      );
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: error.message,
            code: error.code,
            hint: error.hint || null,
            details: error.details || null,
          },
          count: count || 0,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      error: null,
      count: count || (data ? data.length : 0),
      sampleDevice: data && data.length > 0 ? data[0].name : null,
    });
  } catch (err: any) {
    console.error("[Supabase Health Check Exception]:", err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: err?.message || "Internal server error",
          code: "SERVER_EXCEPTION",
          hint: null,
          details: null,
        },
        count: 0,
      },
      { status: 500 }
    );
  }
}

