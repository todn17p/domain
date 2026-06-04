import { createSupabaseAdminClient } from "./supabase/server";

export const ARTWORK_BUCKET = "artwork-media";
export const ARTWORK_MAX_FILE_SIZE = 200 * 1024 * 1024;
export const ARTWORK_BUCKET_LIMIT_CANDIDATES = [
  200 * 1024 * 1024,
  100 * 1024 * 1024,
  50 * 1024 * 1024,
  25 * 1024 * 1024,
  10 * 1024 * 1024,
];
export const ARTWORK_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export function artworkBucketOptions(fileSizeLimit = ARTWORK_MAX_FILE_SIZE) {
  return {
    public: true,
    fileSizeLimit: String(fileSizeLimit),
    allowedMimeTypes: ARTWORK_ALLOWED_MIME_TYPES,
  };
}

export async function ensureArtworkBucket() {
  const admin = createSupabaseAdminClient();
  const steps: Array<{ action: string; ok: boolean; error?: string | null }> = [];

  const { data: initialBucket, error: getBeforeError } =
    await admin.storage.getBucket(ARTWORK_BUCKET);
  steps.push({
    action: "get-before",
    ok: !getBeforeError,
    error: getBeforeError?.message ?? null,
  });

  for (const fileSizeLimit of ARTWORK_BUCKET_LIMIT_CANDIDATES) {
    const options = artworkBucketOptions(fileSizeLimit);
    const { data: currentBucket } = await admin.storage.getBucket(ARTWORK_BUCKET);

    if (!currentBucket) {
      const { error } = await admin.storage.createBucket(ARTWORK_BUCKET, options);
      steps.push({
        action: `create-${Math.round(fileSizeLimit / 1024 / 1024)}mb`,
        ok: !error,
        error: error?.message ?? null,
      });

      if (error) {
        continue;
      }
    }

    const { error: updateError } = await admin.storage.updateBucket(
      ARTWORK_BUCKET,
      options,
    );
    steps.push({
      action: `update-${Math.round(fileSizeLimit / 1024 / 1024)}mb`,
      ok: !updateError,
      error: updateError?.message ?? null,
    });

    if (!updateError) {
      break;
    }
  }

  const { data: verifiedBucket, error: verifyError } =
    await admin.storage.getBucket(ARTWORK_BUCKET);
  steps.push({
    action: "get-after",
    ok: !verifyError && Boolean(verifiedBucket),
    error: verifyError?.message ?? null,
  });

  if (verifyError || !verifiedBucket) {
    const error = verifyError ?? new Error("Bucket was not created.");
    throw Object.assign(error, { steps, initialBucket });
  }

  return { admin, bucket: verifiedBucket, steps };
}
