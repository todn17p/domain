import Link from "next/link";
import { ArrowRight, DoorOpen } from "lucide-react";
import { EnvWarning } from "@/components/env-warning";
import { GalleryHeader } from "@/components/gallery-shell";

const features = [
  {
    index: "01",
    title: "Theme Rooms",
    headline: "작업의 결을 따라 전시실을 나눕니다.",
    body: "영상, 이미지, AI VFX, 브랜드 디자인처럼 작업의 장르와 분위기에 맞춰 관람 동선을 만듭니다.",
  },
  {
    index: "02",
    title: "Artwork Wall",
    headline: "작품은 좌우로 빠르게 넘겨 감상합니다.",
    body: "카드 목록보다 전시장 벽에 가까운 구조로, 미디어가 먼저 보이고 설명은 라벨처럼 따라옵니다.",
  },
  {
    index: "03",
    title: "Guest Code",
    headline: "공유 코드는 초대장처럼 작동합니다.",
    body: "방문객은 로그인 없이 코드만 입력해 미술관에 들어오고, 수정 권한 없이 감상만 할 수 있습니다.",
  },
];

export default function Home() {
  return (
    <>
      <EnvWarning />
      <GalleryHeader />
      <main className="museum-home">
        <section className="landing-hero">
          <div className="landing-hero-image" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=2200&q=85"
              alt=""
            />
          </div>

          <div className="landing-hero-inner">
            <div className="landing-rail">
              <span>Private Online Museum</span>
              <span>Portfolio Exhibition Platform</span>
              <span>Seoul, Digital Gallery</span>
            </div>

            <div className="landing-hero-grid">
              <div className="landing-copy">
                <p className="museum-kicker">ARTFOLIO.AI.KR</p>
                <h1 className="landing-title">
                  Works to Museum.
                </h1>
                <p className="landing-subtitle">
                  한 눈에 정리하는 나만의 포트폴리오.
                </p>
                <div className="landing-actions">
                  <Link className="gallery-button" href="/signup">
                    미술관 만들기 <ArrowRight size={17} />
                  </Link>
                  <Link className="gallery-button-secondary" href="/login">
                    로그인
                  </Link>
                </div>
              </div>

              <form action="/visit" className="visitor-ticket">
                <div className="ticket-heading">
                  <DoorOpen size={22} />
                  <div>
                    <p>Admission</p>
                    <h2>미술관 코드 입장</h2>
                  </div>
                </div>
                <label className="ticket-label" htmlFor="gallery-code">
                  Gallery Code
                </label>
                <input
                  id="gallery-code"
                  className="ticket-input"
                  name="code"
                  placeholder="ART-93KD"
                  required
                />
                <button className="ticket-button" type="submit">
                  입장하기
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="landing-overview">
          <div className="overview-heading">
            <p className="museum-kicker">Now Building</p>
            <h2>포트폴리오를 전시 경험으로 바꾸는 세 가지 구조</h2>
          </div>
          <div className="museum-feature-list">
            {features.map((feature) => (
              <article className="museum-feature" key={feature.index}>
                <div>
                  <span>{feature.index}</span>
                  <p>{feature.title}</p>
                </div>
                <h3>{feature.headline}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
