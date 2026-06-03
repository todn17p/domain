import Link from "next/link";
import { ArrowRight, DoorOpen } from "lucide-react";
import { EnvWarning } from "@/components/env-warning";
import { GalleryHeader } from "@/components/gallery-shell";

export default function Home() {
  return (
    <>
      <EnvWarning />
      <GalleryHeader />
      <main className="min-h-screen bg-[#f5f1e8]">
        <section className="relative overflow-hidden border-b border-stone-200">
          <div className="absolute inset-0 opacity-25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="h-full w-full object-cover"
              src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1800&q=80"
              alt="고요한 미술관 전시장"
            />
          </div>
          <div className="relative mx-auto grid min-h-[76vh] max-w-7xl items-end px-5 pb-14 pt-28 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
            <div>
              <p className="text-sm uppercase tracking-[0.38em] text-[#8a6b2f]">
                Private Online Museum
              </p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-tight text-stone-950 md:text-7xl">
                당신의 작업물을 하나의 미술관으로 전시하세요.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
                이미지와 영상 포트폴리오를 작품처럼 보여주는 온라인 갤러리.
                테마관을 만들고, 고유 코드로 방문객을 초대하세요.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="gallery-button" href="/signup">
                  회원가입 <ArrowRight size={17} />
                </Link>
                <Link className="gallery-button-secondary" href="/login">
                  로그인
                </Link>
              </div>
            </div>

            <form
              action="/visit"
              className="mt-12 border border-stone-300 bg-[#f8f4ec]/85 p-5 shadow-[0_28px_80px_rgba(38,31,20,0.16)] backdrop-blur md:mt-0"
            >
              <div className="flex items-center gap-3 border-b border-stone-300 pb-4">
                <DoorOpen className="text-[#9b7a3c]" />
                <div>
                  <h2 className="font-serif text-2xl">미술관 입장</h2>
                  <p className="text-sm text-stone-600">
                    공유받은 코드를 입력하세요.
                  </p>
                </div>
              </div>
              <input
                className="gallery-input mt-5 uppercase"
                name="code"
                placeholder="ART-93KD"
                required
              />
              <button className="gallery-button mt-4 w-full" type="submit">
                미술관 입장하기
              </button>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {["전시실처럼 나누는 테마관", "좌우로 빠르게 넘기는 작품 벽", "코드로 초대하는 방문객 보기"].map(
              (title) => (
                <div className="border-l border-[#c8a96a] bg-white/50 p-6" key={title}>
                  <p className="font-serif text-2xl">{title}</p>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    작품이 먼저 보이고 설명은 미술관 라벨처럼 차분하게 따라오는
                    포트폴리오 경험을 제공합니다.
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
      </main>
    </>
  );
}
