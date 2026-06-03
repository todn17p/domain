import Link from "next/link";
import { redirect } from "next/navigation";
import { createArtwork } from "@/app/actions";
import { GalleryHeader } from "@/components/gallery-shell";
import { getCurrentLocalUser, getLocalRoom } from "@/lib/local-db";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function errorMessage(error?: string) {
  if (!error) return "";
  if (error === "file") {
    return "파일이 선택되지 않았습니다. 이미지 또는 영상을 첨부해주세요.";
  }
  if (error === "too-large") {
    return "파일이 너무 큽니다. 현재 업로드 제한은 100MB입니다.";
  }
  return decodeURIComponent(error);
}

export default async function NewArtworkPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; error?: string }>;
}) {
  const { room: roomId, error } = await searchParams;
  if (!roomId) redirect("/dashboard");

  if (!hasSupabaseEnv()) {
    const user = await getCurrentLocalUser();
    if (!user) redirect("/login");

    const localRoom = await getLocalRoom(user.id, roomId);
    if (!localRoom) redirect("/dashboard");

    return <ArtworkForm error={error} roomId={roomId} roomTitle={localRoom.room.title} />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: room } = await supabase
    .from("theme_rooms")
    .select("id,title")
    .eq("id", roomId)
    .eq("user_id", user.id)
    .single();

  if (!room) redirect("/dashboard");

  return <ArtworkForm error={error} roomId={roomId} roomTitle={room.title} />;
}

function ArtworkForm({
  error,
  roomId,
  roomTitle,
}: {
  error?: string;
  roomId: string;
  roomTitle: string;
}) {
  return (
    <>
      <GalleryHeader isAuthed />
      <main className="exhibition-page min-h-screen px-5 py-10">
        <form action={createArtwork} className="gallery-panel lit-panel mx-auto max-w-3xl">
          <div className="ceiling-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <Link className="gallery-link w-fit" href={`/dashboard/rooms/${roomId}`}>
            ← {roomTitle}
          </Link>
          <p className="section-kicker mt-8">New Artwork</p>
          <h1 className="font-serif text-4xl">작품 등록</h1>
          <input name="theme_room_id" type="hidden" value={roomId} />

          <label className="gallery-label mt-8">
            작품 제목
            <input className="gallery-input" name="title" required />
          </label>
          <label className="gallery-label">
            작품 설명
            <textarea className="gallery-textarea min-h-36" name="description" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="gallery-label">
              작품 유형
              <select className="gallery-input" name="media_type">
                <option value="image">이미지</option>
                <option value="video">영상</option>
              </select>
            </label>
            <label className="gallery-label">
              제작연도
              <input className="gallery-input" name="year" placeholder="2026" />
            </label>
          </div>
          <label className="gallery-label">
            작업 도구
            <input
              className="gallery-input"
              name="tools"
              placeholder="DaVinci Resolve, Runway, Photoshop"
            />
          </label>
          <label className="gallery-label">
            이미지 또는 영상 파일
            <input
              accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,image/*,video/*"
              className="file-input"
              name="file"
              required
              type="file"
            />
          </label>
          {error && (
            <p className="error-text">
              업로드에 실패했습니다: {errorMessage(error)}
            </p>
          )}
          <button className="gallery-button mt-5 w-full" type="submit">
            저장
          </button>
          <p className="mt-4 text-xs text-stone-500">
            현재 Supabase 환경변수가 없으면 로컬 파일에 저장됩니다. 실제 배포
            전에는 Supabase Storage를 연결하세요.
          </p>
        </form>
      </main>
    </>
  );
}
