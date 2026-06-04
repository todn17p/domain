import { createSupabaseAdminClient } from "./supabase/server";

export const ARTWORK_BUCKET = "artwork-media";
export const ARTWORK_MAX_FILE_SIZE = 200 * 1024 * 1024;
export const ARTWORK_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export function artworkBucketOptions() {
  return {
    public: true,
    fileSizeLimit: String(ARTWORK_MAX_FILE_SIZE),
    allowedMimeTypes: ARTWORK_ALLOWED_MIME_TYPES,
  };
}

export async function ensureArtworkBucket() {
  const admin = createSupabaseAdminClient();
  const options = artworkBucketOptions();
  const steps: Array<{ action: string; ok: boolean; error?: string | null }> = [];

  const { data: bucket, error: getBeforeError } =
    await admin.storage.getBucket(ARTWORK_BUCKET);
  steps.push({
    action: "get-before",
    ok: !getBeforeError,
    error: getBeforeError?.message ?? null,
  });

  if (!bucket) {
    const { error } = await admin.storage.createBucket(ARTWORK_BUCKET, options);
    steps.push({
      action: "create",
      ok: !error,
      error: error?.message ?? null,
    });

    if (error) {
      throw Object.assign(error, { steps });
    }
  }

  const { error: updateError } = await admin.storage.updateBucket(
    ARTWORK_BUCKET,
    options,
  );
  steps.push({
    action: "update",
    ok: !updateError,
    error: updateError?.message ?? null,
  });

  if (updateError) {
    throw Object.assign(updateError, { steps });
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
    throw Object.assign(error, { steps });
  }

  return { admin, bucket: verifiedBucket, steps };
}
