import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { ArtworkWall } from "@/components/artwork-wall";
import { GalleryHeader } from "@/components/gallery-shell";
import { getCurrentLocalUser, getLocalRoom } from "@/lib/local-db";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Artwork, ThemeRoom } from "@/lib/types";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    const localRoom = await getLocalRoom(user.id, id);
    if (!localRoom) redirect("/dashboard");

    return (
      <RoomView artworks={localRoom.artworks} room={localRoom.room} roomId={id} />
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: room }, { data: artworks }] = await Promise.all([
    supabase
      .from("theme_rooms")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("artworks")
      .select("*")
      .eq("theme_room_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!room) redirect("/dashboard");

  return (
    <RoomView
      artworks={(artworks as Artwork[] | null) ?? []}
      room={room as ThemeRoom}
      roomId={id}
    />
  );
}

function RoomView({
  artworks,
  room,
  roomId,
}: {
  artworks: Artwork[];
  room: ThemeRoom;
  roomId: string;
}) {
  return (
    <>
      <GalleryHeader isAuthed />
      <main className="min-h-screen bg-[#f5f1e8]">
        <section className="mx-auto max-w-7xl px-5 py-10">
          <Link className="gallery-link w-fit" href="/dashboard">
            ← 대시보드
          </Link>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="section-kicker">Theme Room</p>
              <h1 className="font-serif text-5xl">{room.title}</h1>
              <p className="mt-4 max-w-2xl leading-7 text-stone-600">
                {room.description}
              </p>
            </div>
            <Link
              className="gallery-button"
              href={`/dashboard/artworks/new?room=${roomId}`}
            >
              <Plus size={17} /> 작품 등록하기
            </Link>
          </div>
          <section className="mt-10">
            <ArtworkWall artworks={artworks} editable />
          </section>
        </section>
      </main>
    </>
  );
}
