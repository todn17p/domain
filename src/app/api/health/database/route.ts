import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

const tables = ["profiles", "galleries", "theme_rooms", "artworks"] as const;

function serializeError(error: unknown) {
  if (!error || typeof error !== "object") return String(error);
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }
  return JSON.stringify(error);
}

export async function GET() {
  const config = getSupabaseConfigStatus();

  if (!config.hasUrl || !config.hasAnonKey || !config.hasServiceRoleKey) {
    return NextResponse.json({
      ok: false,
      config,
      error:
        "Supabase URL, anon key, service role key가 모두 필요합니다. 비밀키 값은 이 응답에 노출되지 않습니다.",
    });
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json({
      ok: false,
      config,
      error: serializeError(error),
    });
  }

  const tableChecks = await Promise.all(
    tables.map(async (table) => {
      const { error } = await supabase.from(table).select("id").limit(1);
      return {
        table,
        ok: !error,
        error: error?.message ?? null,
      };
    }),
  );

  const { data: buckets, error: bucketError } =
    await supabase.storage.listBuckets();
  const artworkBucket = buckets?.find((bucket) => bucket.name === "artwork-media");

  return NextResponse.json({
    ok:
      tableChecks.every((check) => check.ok) &&
      !bucketError &&
      Boolean(artworkBucket),
    config: {
      host: config.host,
      isLikelyProjectUrl: config.isLikelyProjectUrl,
      isAnonJwt: config.isAnonJwt,
      isServiceRoleJwt: config.isServiceRoleJwt,
    },
    tables: tableChecks,
    storage: {
      ok: !bucketError && Boolean(artworkBucket),
      hasArtworkMediaBucket: Boolean(artworkBucket),
      artworkMediaPublic: artworkBucket?.public ?? null,
      artworkMediaFileSizeLimit: artworkBucket?.file_size_limit ?? null,
      artworkMediaAllowedMimeTypes: artworkBucket?.allowed_mime_types ?? null,
      error: bucketError?.message ?? null,
    },
    note: "No secret keys are returned. This checks schema and storage readiness only.",
  });
}
