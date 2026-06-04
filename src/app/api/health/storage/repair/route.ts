import { NextResponse } from "next/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import {
  ARTWORK_BUCKET,
  ARTWORK_MAX_FILE_SIZE,
  ensureArtworkBucket,
} from "@/lib/storage";

function errorPayload(error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "Unknown storage repair error";
  const steps =
    error && typeof error === "object" && "steps" in error
      ? error.steps
      : undefined;

  return { message, steps };
}

export async function GET() {
  const config = getSupabaseConfigStatus();

  try {
    const { bucket, steps } = await ensureArtworkBucket();

    return NextResponse.json({
      ok: true,
      bucket: ARTWORK_BUCKET,
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
      expectedFileSizeLimit: ARTWORK_MAX_FILE_SIZE,
      allowedMimeTypes: bucket.allowed_mime_types,
      steps,
      config: {
        host: config.host,
        isLikelyProjectUrl: config.isLikelyProjectUrl,
        isAnonJwt: config.isAnonJwt,
        isServiceRoleJwt: config.isServiceRoleJwt,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      bucket: ARTWORK_BUCKET,
      expectedFileSizeLimit: ARTWORK_MAX_FILE_SIZE,
      error: errorPayload(error),
      config: {
        host: config.host,
        isLikelyProjectUrl: config.isLikelyProjectUrl,
        isAnonJwt: config.isAnonJwt,
        isServiceRoleJwt: config.isServiceRoleJwt,
      },
    });
  }
}
