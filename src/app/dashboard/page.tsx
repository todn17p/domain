import Link from "next/link";
import { DoorOpen, Plus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  createThemeRoom,
  deleteThemeRoom,
  updateGallery,
} from "@/app/actions";
import { ArtworkWall } from "@/components/artwork-wall";
import { CopyCodeButton } from "@/components/copy-code-button";
import { EnvWarning } from "@/components/env-warning";
import { GalleryHeader } from "@/components/gallery-shell";
import { ensureGallery } from "@/lib/gallery";
import { getCurrentLocalUser, getLocalDashboard } from "@/lib/local-db";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Artwork, Gallery, ThemeRoom } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    const dashboard = await getLocalDashboard(user.id);
    if (!dashboard) redirect("/login");

    return (
      <DashboardView
        artworks={dashboard.artworks}
        error={error}
        gallery={dashboard.gallery}
        rooms={dashboard.rooms}
      />
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const gallery = await ensureGallery(supabase, user);
  const [{ data: rooms }, { data: artworks }] = await Promise.all([
    supabase
      .from("theme_rooms")
      .select("*")
      .eq("gallery_id", gallery.id)
      .order("created_at"),
    supabase
      .from("artworks")
      .select("*")
      .eq("gallery_id", gallery.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <DashboardView
      artworks={(artworks as Artwork[] | null) ?? []}
      error={error}
      gallery={gallery}
      rooms={(rooms as ThemeRoom[] | null) ?? []}
    />
  );
}

function DashboardView({
  artworks,
  error,
  gallery,
  rooms,
}: {
  artworks: Artwork[];
  error?: string;
  gallery: Gallery;
  rooms: ThemeRoom[];
}) {
  return (
    <>
      <EnvWarning />
      <GalleryHeader isAuthed />
      <main className="min-h-screen bg-[#f5f1e8]">
        <section className="mx-auto max-w-7xl px-5 py-10">
          {error && (
            <p className="error-text mb-6">
              작업을 완료하지 못했습니다: {decodeURIComponent(error)}
            </p>
          )}
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <form action={updateGallery} className="gallery-panel">
              <p className="section-kicker">내 미술관</p>
              <input
                aria-label="미술관 이름"
                className="title-input"
                defaultValue={gallery.name}
                name="name"
              />
              <textarea
                aria-label="미술관 소개"
                className="gallery-textarea mt-4"
                defaultValue={gallery.description ?? ""}
                name="description"
              />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="code-plate">{gallery.gallery_code}</span>
                <CopyCodeButton code={gallery.gallery_code} />
                <Link
                  className="gallery-button-secondary"
                  href={`/visit/${gallery.gallery_code}`}
                >
                  <DoorOpen size={16} /> 방문객 보기
                </Link>
              </div>
              <button className="gallery-button mt-5" type="submit">
                미술관 정보 저장
              </button>
            </form>

            <form action={createThemeRoom} className="gallery-panel">
              <p className="section-kicker">새 테마관</p>
              <label className="gallery-label mt-4">
                테마관 이름
                <input
                  className="gallery-input"
                  name="title"
                  placeholder="AI VFX 전시관"
                  required
                />
              </label>
              <label className="gallery-label">
                설명
                <textarea
                  className="gallery-textarea"
                  name="description"
                  placeholder="작품의 분위기와 관람 포인트를 적어주세요."
                />
              </label>
              <button className="gallery-button mt-4" type="submit">
                <Plus size={17} /> 테마관 만들기
              </button>
            </form>
          </div>

          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-kicker">Theme Rooms</p>
                <h2 className="font-serif text-3xl">전시실 입구</h2>
              </div>
            </div>
            <div className="room-scroll">
              {rooms.map((room) => (
                <article className="room-door" key={room.id}>
                  <Link href={`/dashboard/rooms/${room.id}`}>
                    <span className="text-xs uppercase tracking-[0.28em] text-[#8a6b2f]">
                      Enter Room
                    </span>
                    <h3 className="mt-4 font-serif text-3xl">{room.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
                      {room.description}
                    </p>
                  </Link>
                  <form action={deleteThemeRoom} className="mt-6">
                    <input name="roomId" type="hidden" value={room.id} />
                    <button className="danger-button-light" type="submit">
                      <Trash2 size={15} /> 테마관 삭제
                    </button>
                  </form>
                </article>
              ))}
              {!rooms.length && (
                <div className="gallery-empty min-w-full">
                  아직 테마관이 없습니다.
                </div>
              )}
            </div>
          </section>

          <section className="mt-12">
            <p className="section-kicker">Recent Works</p>
            <h2 className="mb-5 font-serif text-3xl">최근 등록 작품</h2>
            <ArtworkWall artworks={artworks} editable />
          </section>
        </section>
      </main>
    </>
  );
}
