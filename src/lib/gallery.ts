import type { Gallery } from "./types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "./supabase/server";
import { supabaseServiceRoleKey } from "./supabase/config";

function randomCode() {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ART-${suffix}`;
}

export async function ensureGallery(
  supabase: SupabaseClient,
  user: User,
): Promise<Gallery> {
  if (supabaseServiceRoleKey) {
    try {
      return await ensureGalleryWithClient(createSupabaseAdminClient(), user);
    } catch {
      // Fall back to the user-scoped client so the caller gets the exact error.
    }
  }

  return ensureGalleryWithClient(supabase, user);
}

async function ensureGalleryWithClient(
  supabase: SupabaseClient,
  user: User,
): Promise<Gallery> {
  const { data: existing, error: existingError } = await supabase
    .from("galleries")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as Gallery;
  }

  const emailName = user.email?.split("@")[0] ?? "My";
  const { data, error } = await supabase
    .from("galleries")
    .insert({
      user_id: user.id,
      name: `${emailName} Gallery`,
      description: "이미지와 영상 작업물을 전시하는 개인 미술관입니다.",
      gallery_code: randomCode(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Gallery;
}
