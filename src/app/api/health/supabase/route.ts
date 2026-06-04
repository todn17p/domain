import { NextResponse } from "next/server";
import {
  getSupabaseConfigStatus,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/config";

export async function GET() {
  const status = getSupabaseConfigStatus();
  let authHealth: {
    ok: boolean;
    status?: number;
    contentType?: string | null;
    error?: string;
  } = { ok: false };

  if (status.hasUrl && status.isLikelyProjectUrl) {
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: supabaseAnonKey
          ? {
              apikey: supabaseAnonKey,
            }
          : undefined,
        cache: "no-store",
      });
      const contentType = response.headers.get("content-type");
      authHealth = {
        ok: response.ok && Boolean(contentType?.includes("application/json")),
        status: response.status,
        contentType,
      };
    } catch (error) {
      authHealth = {
        ok: false,
        error: error instanceof Error ? error.message : "unknown",
      };
    }
  }

  return NextResponse.json({
    ...status,
    authHealth,
    note: "Keys are not exposed. host and boolean format checks only.",
  });
}
