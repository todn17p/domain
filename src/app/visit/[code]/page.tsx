import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtworkWall } from "@/components/artwork-wall";
import { GalleryHeader } from "@/components/gallery-shell";
import { getLocalVisit } from "@/lib/local-db";
import { hasSupabaseEnv, supabaseServiceRoleKey } from "@/lib/supabase/config";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { Artwork, Gallery, ThemeRoom } from "@/lib/types";

export default async function VisitGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ room?: string }>;
}) {
  const { code } = await params;
  const { room } = await searchParams;

  if (!hasSupabaseEnv()) {
    const localVisit = await getLocalVisit(code, room);
    if (!localVisit) notFound();

    return (
      <VisitView
        activeRoom={localVisit.activeRoom}
        artworks={localVisit.artworks}
        museum={localVisit.gallery}
        themeRooms={localVisit.rooms}
      />
    );
  }

  const supabase = supabaseServiceRoleKey
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const normalizedCode = decodeURIComponent(code).trim().toUpperCase();
  const { data: gallery } = await supabase
    .from("galleries")
    .select("*")
    .eq("gallery_code", normalizedCode)
    .single();

  if (!gallery) notFound();
  const museum = gallery as Gallery;

  const { data: rooms } = await supabase
    .from("theme_rooms")
    .select("*")
    .eq("gallery_id", museum.id)
    .order("created_at");
  const themeRooms = (rooms as ThemeRoom[] | null) ?? [];
  const activeRoom = room ?? themeRooms[0]?.id;
  const { data: artworks } = activeRoom
    ? await supabase
        .from("artworks")
        .select("*")
        .eq("gallery_id", museum.id)
        .eq("theme_room_id", activeRoom)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <VisitView
      activeRoom={activeRoom}
      artworks={(artworks as Artwork[] | null) ?? []}
      museum={museum}
      themeRooms={themeRooms}
    />
  );
}

function VisitView({
  activeRoom,
  artworks,
  museum,
  themeRooms,
}: {
  activeRoom?: string;
  artworks: Artwork[];
  museum: Gallery;
  themeRooms: ThemeRoom[];
}) {
  return (
    <>
      <GalleryHeader minimal />
      <main className="min-h-screen bg-[#f5f1e8]">
        <section className="visitor-hero">
          <div className="mx-auto max-w-7xl px-5 py-16">
            <p className="section-kicker text-[#c8a96a]">Guest Gallery</p>
            <h1 className="mt-4 font-serif text-6xl text-white">{museum.name}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-200">
              {museum.description}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-9">
          <div className="room-scroll">
            {themeRooms.map((themeRoom) => (
              <Link
                className={`room-door visitor ${activeRoom === themeRoom.id ? "active" : ""}`}
                href={`/visit/${museum.gallery_code}?room=${themeRoom.id}`}
                key={themeRoom.id}
              >
                <span className="text-xs uppercase tracking-[0.28em] text-[#8a6b2f]">
                  Exhibition
                </span>
                <h2 className="mt-4 font-serif text-3xl">{themeRoom.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
                  {themeRoom.description}
                </p>
              </Link>
            ))}
          </div>

          <section className="mt-10">
            <div className="mb-5">
              <p className="section-kicker">Artwork Wall</p>
              <h2 className="font-serif text-3xl">좌우로 넘겨 감상하세요</h2>
            </div>
            <ArtworkWall artworks={artworks} />
          </section>
        </section>
      </main>
    </>
  );
}
