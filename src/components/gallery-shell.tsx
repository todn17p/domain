import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/actions";

export function GalleryHeader({
  isAuthed = false,
  minimal = false,
}: {
  isAuthed?: boolean;
  minimal?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f5f1e8]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-serif text-xl tracking-[0.18em]">
          ATELIER HALL
        </Link>
        {!minimal && (
          <nav className="flex items-center gap-2 text-sm">
            <Link className="gallery-link" href="/admin">
              <ShieldCheck size={16} />
              Admin
            </Link>
            {isAuthed ? (
              <form action={signOut}>
                <button className="gallery-link" type="submit">
                  <LogOut size={16} />
                  로그아웃
                </button>
              </form>
            ) : (
              <>
                <Link className="gallery-link" href="/login">
                  로그인
                </Link>
                <Link className="gallery-button" href="/signup">
                  회원가입
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
