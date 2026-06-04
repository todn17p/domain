"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  createArtworkUploadTarget,
  saveUploadedArtwork,
} from "@/app/actions";
import {
  ARTWORK_BUCKET,
  ARTWORK_MAX_FILE_SIZE,
} from "@/lib/storage-constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function mb(size: number) {
  return Math.floor(size / 1024 / 1024);
}

export function ArtworkUploadForm({
  error,
  roomId,
  roomTitle,
}: {
  error?: string;
  roomId: string;
  roomTitle: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(error ? decodeURIComponent(error) : "");
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || !file.size) {
      setMessage("파일이 선택되지 않았습니다. 이미지 또는 영상을 첨부해주세요.");
      return;
    }

    if (file.size > ARTWORK_MAX_FILE_SIZE) {
      setMessage(`파일이 너무 큽니다. 최대 ${mb(ARTWORK_MAX_FILE_SIZE)}MB까지 시도할 수 있습니다.`);
      return;
    }

    setIsUploading(true);
    setStatus("업로드 준비 중입니다.");

    try {
      const targetData = new FormData();
      targetData.set("theme_room_id", roomId);
      targetData.set("file_name", file.name);
      targetData.set("file_type", file.type || "application/octet-stream");
      targetData.set("file_size", String(file.size));

      const target = await createArtworkUploadTarget(targetData);
      if (!target.ok) {
        setMessage(target.error ?? "업로드 준비에 실패했습니다.");
        return;
      }

      if (!target.path || !target.token) {
        setMessage("업로드 경로를 만들지 못했습니다.");
        return;
      }

      setStatus("파일을 Storage에 업로드하고 있습니다.");
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(ARTWORK_BUCKET)
        .uploadToSignedUrl(target.path, target.token, file, {
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      setStatus("작품 정보를 저장하고 있습니다.");
      const saveData = new FormData(form);
      saveData.set("theme_room_id", roomId);
      saveData.set("media_path", target.path);
      saveData.delete("file");

      const saved = await saveUploadedArtwork(saveData);
      if (!saved.ok) {
        setMessage(saved.error ?? "작품 정보 저장에 실패했습니다.");
        return;
      }

      router.push(saved.roomUrl ?? `/dashboard/rooms/${roomId}`);
      router.refresh();
    } catch (uploadError) {
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "업로드 중 문제가 발생했습니다.",
      );
    } finally {
      setIsUploading(false);
      setStatus("");
    }
  }

  return (
    <form className="gallery-panel lit-panel mx-auto max-w-3xl" onSubmit={onSubmit}>
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
      {message && <p className="error-text">업로드에 실패했습니다: {message}</p>}
      {status && <p className="mt-4 text-sm text-[#8a6b2f]">{status}</p>}
      <button
        className="gallery-button mt-5 w-full disabled:cursor-wait disabled:opacity-60"
        disabled={isUploading}
        type="submit"
      >
        {isUploading ? "업로드 중..." : "저장"}
      </button>
      <p className="mt-4 text-xs text-stone-500">
        영상은 브라우저에서 Storage로 직접 업로드됩니다. 현재 프로젝트에서
        확인된 Storage 제한을 넘는 파일은 업로드할 수 없습니다.
      </p>
    </form>
  );
}
