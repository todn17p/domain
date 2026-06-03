import Link from "next/link";
import { signIn } from "@/app/actions";
import { EnvWarning } from "@/components/env-warning";
import { GalleryHeader } from "@/components/gallery-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <EnvWarning />
      <GalleryHeader minimal />
      <main className="auth-page">
        <form action={signIn} className="auth-panel">
          <p className="text-sm uppercase tracking-[0.32em] text-[#8a6b2f]">
            Owner Access
          </p>
          <h1 className="mt-3 font-serif text-4xl">로그인</h1>
          <label className="gallery-label mt-8">
            아이디
            <input
              autoComplete="username"
              className="gallery-input"
              name="email"
              required
              type="text"
            />
          </label>
          <label className="gallery-label">
            패스워드
            <input
              className="gallery-input"
              name="password"
              autoComplete="current-password"
              required
              type="password"
            />
          </label>
          {error && <p className="error-text">{decodeURIComponent(error)}</p>}
          <button className="gallery-button mt-4 w-full" type="submit">
            로그인
          </button>
          <p className="mt-5 text-center text-sm text-stone-600">
            아직 계정이 없나요?{" "}
            <Link className="underline" href="/signup">
              회원가입
            </Link>
          </p>
        </form>
      </main>
    </>
  );
}
