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
import {
  ARTWORK_BUCKET,
  ARTWORK_ALLOWED_MIME_TYPES,
  ARTWORK_MAX_FILE_SIZE,
  ensureArtworkBucket,
} from "@/lib/storage";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function artworkErrorUrl(roomId: string, error: string) {
  return `/dashboard/artworks/new?room=${encodeURIComponent(roomId)}&error=${encodeURIComponent(error)}`;
}

function dashboardErrorUrl(error: string) {
  return `/dashboard?error=${encodeURIComponent(error)}`;
}

function readableError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

async function supabaseActionClient(errorUrl: (message: string) => string) {
  try {
    return await createSupabaseServerClient();
  } catch (error) {
    redirect(errorUrl(readableError(error, "Supabase 설정을 확인해주세요.")));
  }
}

function supabaseAdminActionClient(errorUrl: (message: string) => string) {
  try {
    return createSupabaseAdminClient();
  } catch (error) {
    redirect(errorUrl(readableError(error, "Supabase 관리자 설정을 확인해주세요.")));
  }
}

function supabaseMutationClient() {
  if (supabaseServiceRoleKey) {
    return createSupabaseAdminClient();
  }

  throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
}

function authEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes("@")) {
    return normalized;
  }

  const clean = normalized.replace(/[^a-z0-9._-]/g, "");
  return `${clean || crypto.randomUUID()}@artfolio.local`;
}

function authPassword(password: string) {
  if (password.length >= 6) {
    return password;
  }

  return `${password}__artfolio`;
}

function uploadExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "upload";
}

async function fileToDataUrl(file: File) {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type || "application/octet-stream"};base64,${base64}`;
}

export async function createArtworkUploadTarget(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Supabase Storage가 연결되어 있지 않습니다." };
  }

  const roomId = value(formData, "theme_room_id");
  const fileName = value(formData, "file_name");
  const fileType = value(formData, "file_type") || "application/octet-stream";
  const fileSize = Number(value(formData, "file_size"));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  if (!roomId || !fileName || !Number.isFinite(fileSize) || fileSize <= 0) {
    return { ok: false, error: "업로드할 파일 정보를 확인해주세요." };
  }

  if (fileSize > ARTWORK_MAX_FILE_SIZE) {
    return { ok: false, error: "파일이 너무 큽니다. 최대 200MB까지 시도할 수 있습니다." };
  }

  if (!ARTWORK_ALLOWED_MIME_TYPES.includes(fileType)) {
    return { ok: false, error: "지원하지 않는 파일 형식입니다." };
  }

  const dataClient = supabaseMutationClient();
  const { data: room, error: roomError } = await dataClient
    .from("theme_rooms")
    .select("id")
    .eq("id", roomId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) {
    return { ok: false, error: "테마관을 확인할 수 없습니다." };
  }

  let ensured;
  try {
    ensured = await ensureArtworkBucket();
  } catch (error) {
    return { ok: false, error: readableError(error, "Storage 버킷 준비에 실패했습니다.") };
  }

  const appliedLimit = ensured.bucket.file_size_limit ?? ARTWORK_MAX_FILE_SIZE;
  if (fileSize > appliedLimit) {
    const mb = Math.floor(appliedLimit / 1024 / 1024);
    return {
      ok: false,
      error: `현재 Supabase 프로젝트의 Storage 업로드 제한은 ${mb}MB입니다.`,
    };
  }

  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${uploadExtension(fileName)}`;
  const { data, error } = await ensured.admin.storage
    .from(ARTWORK_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "업로드 URL을 만들지 못했습니다.",
    };
  }

  return {
    ok: true,
    bucket: ARTWORK_BUCKET,
    path: data.path,
    token: data.token,
    appliedLimit,
  };
}

export async function saveUploadedArtwork(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Supabase Storage가 연결되어 있지 않습니다." };
  }

  const roomId = value(formData, "theme_room_id");
  const mediaType = value(formData, "media_type") === "video" ? "video" : "image";
  const path = value(formData, "media_path");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  if (!path.startsWith(`${user.id}/`)) {
    return { ok: false, error: "업로드 경로를 확인할 수 없습니다." };
  }

  const mutationClient = supabaseMutationClient();
  const { data: room, error: roomError } = await mutationClient
    .from("theme_rooms")
    .select("id,gallery_id,user_id")
    .eq("id", roomId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) {
    return { ok: false, error: "테마관을 확인할 수 없습니다." };
  }

  const { data: publicUrl } = mutationClient.storage
    .from(ARTWORK_BUCKET)
    .getPublicUrl(path);

  const { error } = await mutationClient.from("artworks").insert({
    theme_room_id: room.id,
    gallery_id: room.gallery_id,
    user_id: user.id,
    title: value(formData, "title"),
    description: value(formData, "description"),
    media_type: mediaType,
    media_url: publicUrl.publicUrl,
    tools: value(formData, "tools"),
    year: value(formData, "year"),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/rooms/${room.id}`);
  revalidatePath("/dashboard");

  return { ok: true, roomUrl: `/dashboard/rooms/${room.id}` };
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

  const supabase = await supabaseActionClient(
    (message) => `/signup?error=${encodeURIComponent(message)}`,
  );
  const email = authEmail(identifier);
  const authPasswordValue = authPassword(password);

  if (supabaseServiceRoleKey) {
    const admin = supabaseAdminActionClient((message) => `/signup?error=${encodeURIComponent(message)}`);
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: authPasswordValue,
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
      password: authPasswordValue,
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
    password: authPasswordValue,
  });

  if (signInError) {
    redirect(`/login?error=${encodeURIComponent(signInError.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await ensureGallery(supabase, user);
    } catch (error) {
      const message = readableError(error, "미술관 생성에 실패했습니다.");
      redirect(`/signup?error=${encodeURIComponent(message)}`);
    }
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const identifier = value(formData, "email");
  const email = authEmail(identifier);
  const password = value(formData, "password");
  const authPasswordValue = authPassword(password);

  if (!hasSupabaseEnv()) {
    try {
      await signInLocalUser(identifier, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "로그인 실패";
      redirect(`/login?error=${encodeURIComponent(message)}`);
    }

    redirect("/dashboard");
  }

  const supabase = await supabaseActionClient(
    (message) => `/login?error=${encodeURIComponent(message)}`,
  );
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: authPasswordValue,
  });

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

  const supabase = await supabaseActionClient(
    (message) => `/?error=${encodeURIComponent(message)}`,
  );
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

  const supabase = await supabaseActionClient(dashboardErrorUrl);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let gallery;
  try {
    gallery = await ensureGallery(supabase, user);
  } catch (error) {
    redirect(
      dashboardErrorUrl(
        readableError(error, "미술관 정보를 불러오지 못했습니다."),
      ),
    );
  }

  const mutationClient = supabaseMutationClient();
  const { error } = await mutationClient
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
  redirect("/dashboard");
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

  const supabase = await supabaseActionClient(dashboardErrorUrl);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let gallery;
  try {
    gallery = await ensureGallery(supabase, user);
  } catch (error) {
    redirect(
      dashboardErrorUrl(
        readableError(error, "미술관 정보를 불러오지 못했습니다."),
      ),
    );
  }

  const mutationClient = supabaseMutationClient();
  const { error } = await mutationClient.from("theme_rooms").insert({
    gallery_id: gallery.id,
    user_id: user.id,
    title: value(formData, "title"),
    description: value(formData, "description"),
  });

  if (error) {
    redirect(dashboardErrorUrl(error.message));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteThemeRoom(formData: FormData) {
  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    await deleteLocalThemeRoom(user.id, value(formData, "roomId"));
    revalidatePath("/dashboard");
    return;
  }

  const supabase = await supabaseActionClient(dashboardErrorUrl);
  const roomId = value(formData, "roomId");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const mutationClient = supabaseMutationClient();
  const { error } = await mutationClient
    .from("theme_rooms")
    .delete()
    .eq("id", roomId)
    .eq("user_id", user.id);

  if (error) {
    redirect(dashboardErrorUrl(error.message));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
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

    if (file.size > ARTWORK_MAX_FILE_SIZE) {
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

  const roomId = value(formData, "theme_room_id");
  const supabase = await supabaseActionClient((message) =>
    artworkErrorUrl(roomId, message),
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const mediaType = value(formData, "media_type");
  const file = formData.get("file");

  if (!(file instanceof File) || !file.size) {
    redirect(artworkErrorUrl(roomId, "file"));
  }

  if (file.size > ARTWORK_MAX_FILE_SIZE) {
    redirect(artworkErrorUrl(roomId, "too-large"));
  }

  const dataClient = supabaseMutationClient();
  const { data: room, error: roomError } = await dataClient
    .from("theme_rooms")
    .select("id,gallery_id,user_id")
    .eq("id", roomId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) redirect("/dashboard");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "upload";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  let mutationClient;
  try {
    const ensured = await ensureArtworkBucket();
    mutationClient = ensured.admin;
  } catch (error) {
    redirect(artworkErrorUrl(roomId, readableError(error, "bucket-failed")));
  }

  const { error: uploadError } = await mutationClient.storage
    .from(ARTWORK_BUCKET)
    .upload(path, fileBuffer, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    redirect(
      artworkErrorUrl(roomId, uploadError.message),
    );
  }

  const { data: publicUrl } = mutationClient.storage
    .from(ARTWORK_BUCKET)
    .getPublicUrl(path);

  const { error: artworkError } = await mutationClient.from("artworks").insert({
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

  const supabase = await supabaseActionClient(dashboardErrorUrl);
  const artworkId = value(formData, "artworkId");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const mutationClient = supabaseMutationClient();
  await mutationClient
    .from("artworks")
    .delete()
    .eq("id", artworkId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
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

  const supabase = supabaseAdminActionClient(
    (message) => `/admin?error=${encodeURIComponent(message)}`,
  );

  await supabase.from("artworks").delete().eq("user_id", userId);
  await supabase.from("theme_rooms").delete().eq("user_id", userId);
  await supabase.from("galleries").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.auth.admin.deleteUser(userId);

  revalidatePath("/admin");
}
