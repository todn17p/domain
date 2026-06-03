import Link from "next/link";
import { signUp } from "@/app/actions";
import { EnvWarning } from "@/components/env-warning";
import { GalleryHeader } from "@/components/gallery-shell";

export default async function SignupPage({
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
        <form action={signUp} className="auth-panel">
          <p className="text-sm uppercase tracking-[0.32em] text-[#8a6b2f]">
            Create Gallery
          </p>
          <h1 className="mt-3 font-serif text-4xl">회원가입</h1>
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
              minLength={1}
              name="password"
              autoComplete="new-password"
              required
              type="password"
            />
          </label>
          {error && <p className="error-text">{decodeURIComponent(error)}</p>}
          <button className="gallery-button mt-4 w-full" type="submit">
            회원가입
          </button>
          <p className="mt-5 text-center text-sm text-stone-600">
            이미 계정이 있나요?{" "}
            <Link className="underline" href="/login">
              로그인
            </Link>
          </p>
        </form>
      </main>
    </>
  );
}
