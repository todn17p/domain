"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { ensureGallery } from "@/lib/gallery";
import {
  clearAdminSession,
  isAdminLoggedIn,
  setAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin";
import { hasSupabaseEnv, supabaseServiceRoleKey } from "@/lib/supabase/config";
import {
  clearLocalSession,
  createLocalArtwork,
  createLocalThemeRoom,
  createLocalUser,
  deleteLocalArtwork,
  deleteLocalThemeRoom,
  deleteLocalUser,
  getCurrentLocalUser,
  getLocalRoom,
  signInLocalUser,
  updateLocalGallery,
} from "@/lib/local-db";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function artworkErrorUrl(roomId: string, error: string) {
  return `/dashboard/artworks/new?room=${encodeURIComponent(roomId)}&error=${encodeURIComponent(error)}`;
}

function dashboardErrorUrl(error: string) {
  return `/dashboard?error=${encodeURIComponent(error)}`;
}

function authEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes("@")) {
    return normalized;
  }

  const clean = normalized.replace(/[^a-z0-9._-]/g, "");
  return `${clean || crypto.randomUUID()}@artfolio.local`;
}

async function fileToDataUrl(file: File) {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type || "application/octet-stream"};base64,${base64}`;
}

export async function signUp(formData: FormData) {
  const identifier = value(formData, "email");
  const password = value(formData, "password");

  if (!hasSupabaseEnv()) {
    try {
      await createLocalUser(identifier, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "회원가입 실패";
      redirect(`/signup?error=${encodeURIComponent(message)}`);
    }

    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const email = authEmail(identifier);

  if (supabaseServiceRoleKey) {
    const admin = createSupabaseAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: identifier,
      },
    });

    if (createError && !createError.message.toLowerCase().includes("already")) {
      redirect(`/signup?error=${encodeURIComponent(createError.message)}`);
    }
  } else {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: identifier,
        },
      },
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    redirect(`/login?error=${encodeURIComponent(signInError.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureGallery(supabase, user);
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const identifier = value(formData, "email");
  const email = authEmail(identifier);
  const password = value(formData, "password");

  if (!hasSupabaseEnv()) {
    try {
      await signInLocalUser(identifier, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "로그인 실패";
      redirect(`/login?error=${encodeURIComponent(message)}`);
    }

    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  if (!hasSupabaseEnv()) {
    await clearLocalSession();
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateGallery(formData: FormData) {
  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    await updateLocalGallery(
      user.id,
      value(formData, "name"),
      value(formData, "description"),
    );
    revalidatePath("/dashboard");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

    const gallery = await ensureGallery(supabase, user);
  const { error } = await supabase
    .from("galleries")
    .update({
      name: value(formData, "name"),
      description: value(formData, "description"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", gallery.id)
    .eq("user_id", user.id);

  if (error) {
    redirect(dashboardErrorUrl(error.message));
  }

  revalidatePath("/dashboard");
}

export async function createThemeRoom(formData: FormData) {
  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    await createLocalThemeRoom(
      user.id,
      value(formData, "title"),
      value(formData, "description"),
    );
    revalidatePath("/dashboard");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const gallery = await ensureGallery(supabase, user);
  const { error } = await supabase.from("theme_rooms").insert({
    gallery_id: gallery.id,
    user_id: user.id,
    title: value(formData, "title"),
    description: value(formData, "description"),
  });

  if (error) {
    redirect(dashboardErrorUrl(error.message));
  }

  revalidatePath("/dashboard");
}

export async function deleteThemeRoom(formData: FormData) {
  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    await deleteLocalThemeRoom(user.id, value(formData, "roomId"));
    revalidatePath("/dashboard");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const roomId = value(formData, "roomId");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("theme_rooms")
    .delete()
    .eq("id", roomId)
    .eq("user_id", user.id);

  if (error) {
    redirect(dashboardErrorUrl(error.message));
  }

  revalidatePath("/dashboard");
}

export async function createArtwork(formData: FormData) {
  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    const roomId = value(formData, "theme_room_id");
    const localRoom = await getLocalRoom(user.id, roomId);
    const file = formData.get("file");

    if (!localRoom || !(file instanceof File) || !file.size) {
      redirect(artworkErrorUrl(roomId, "file"));
    }

    if (file.size > 100 * 1024 * 1024) {
      redirect(artworkErrorUrl(roomId, "too-large"));
    }

    try {
      let mediaUrl = "";

      if (process.env.VERCEL) {
        mediaUrl = await fileToDataUrl(file);
      } else {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "upload";
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const uploadDir = nodePath.join(
          process.cwd(),
          "public",
          "uploads",
          user.id,
        );

        await mkdir(uploadDir, { recursive: true });
        await writeFile(
          nodePath.join(uploadDir, fileName),
          Buffer.from(await file.arrayBuffer()),
        );
        mediaUrl = `/uploads/${user.id}/${fileName}`;
      }

      await createLocalArtwork(user.id, {
        theme_room_id: localRoom.room.id,
        gallery_id: localRoom.room.gallery_id,
        title: value(formData, "title"),
        description: value(formData, "description"),
        media_type: value(formData, "media_type") === "video" ? "video" : "image",
        media_url: mediaUrl,
        tools: value(formData, "tools"),
        year: value(formData, "year"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "upload-failed";
      redirect(artworkErrorUrl(roomId, message));
    }

    redirect(`/dashboard/rooms/${localRoom.room.id}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const roomId = value(formData, "theme_room_id");
  const mediaType = value(formData, "media_type");
  const file = formData.get("file");

  if (!(file instanceof File) || !file.size) {
    redirect(artworkErrorUrl(roomId, "file"));
  }

  if (file.size > 100 * 1024 * 1024) {
    redirect(artworkErrorUrl(roomId, "too-large"));
  }

  const { data: room, error: roomError } = await supabase
    .from("theme_rooms")
    .select("id,gallery_id,user_id")
    .eq("id", roomId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) redirect("/dashboard");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "upload";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("artwork-media")
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
    });

  if (uploadError) {
    redirect(
      artworkErrorUrl(roomId, uploadError.message),
    );
  }

  const { data: publicUrl } = supabase.storage
    .from("artwork-media")
    .getPublicUrl(path);

  const { error: artworkError } = await supabase.from("artworks").insert({
    theme_room_id: room.id,
    gallery_id: room.gallery_id,
    user_id: user.id,
    title: value(formData, "title"),
    description: value(formData, "description"),
    media_type: mediaType === "video" ? "video" : "image",
    media_url: publicUrl.publicUrl,
    tools: value(formData, "tools"),
    year: value(formData, "year"),
  });

  if (artworkError) {
    redirect(artworkErrorUrl(roomId, artworkError.message));
  }

  redirect(`/dashboard/rooms/${room.id}`);
}

export async function deleteArtwork(formData: FormData) {
  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    await deleteLocalArtwork(user.id, value(formData, "artworkId"));
    revalidatePath("/dashboard");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const artworkId = value(formData, "artworkId");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("artworks")
    .delete()
    .eq("id", artworkId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function adminLogin(formData: FormData) {
  const id = value(formData, "id");
  const password = value(formData, "password");

  if (!verifyAdminCredentials(id, password)) {
    redirect("/admin?error=invalid");
  }

  await setAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin");
}

export async function adminDeleteUser(formData: FormData) {
  if (!(await isAdminLoggedIn())) {
    redirect("/admin?error=admin-required");
  }

  const userId = value(formData, "userId");

  if (!hasSupabaseEnv()) {
    await deleteLocalUser(userId);
    revalidatePath("/admin");
    return;
  }

  const supabase = createSupabaseAdminClient();

  await supabase.from("artworks").delete().eq("user_id", userId);
  await supabase.from("theme_rooms").delete().eq("user_id", userId);
  await supabase.from("galleries").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.auth.admin.deleteUser(userId);

  revalidatePath("/admin");
}
