import type { Artwork } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { deleteArtwork } from "@/app/actions";

export function ArtworkWall({
  artworks,
  editable = false,
}: {
  artworks: Artwork[];
  editable?: boolean;
}) {
  if (!artworks.length) {
    return (
      <div className="gallery-empty">
        아직 전시된 작품이 없습니다. 첫 작품을 걸어 미술관의 분위기를 만들어
        보세요.
      </div>
    );
  }

  return (
    <div className="horizontal-gallery">
      {artworks.map((artwork) => (
        <article className="artwork-frame" key={artwork.id}>
          <div className="artwork-media">
            {artwork.media_type === "video" ? (
              <video src={artwork.media_url} controls preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artwork.media_url} alt={artwork.title} />
            )}
          </div>
          <div className="museum-label">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#9b7a3c]">
                  {artwork.year || "Undated"}
                </p>
                <h3 className="mt-1 font-serif text-xl text-stone-950">
                  {artwork.title}
                </h3>
              </div>
              {editable && (
                <form action={deleteArtwork}>
                  <input type="hidden" name="artworkId" value={artwork.id} />
                  <button
                    className="icon-button"
                    type="submit"
                    title="작품 삭제"
                    aria-label="작품 삭제"
                  >
                    <Trash2 size={17} />
                  </button>
                </form>
              )}
            </div>
            {artwork.tools && (
              <p className="mt-3 text-sm text-stone-600">{artwork.tools}</p>
            )}
            <p className="mt-3 line-clamp-5 text-sm leading-6 text-stone-700">
              {artwork.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
