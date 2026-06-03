import Link from "next/link";
import { adminDeleteUser, adminLogin, adminLogout } from "@/app/actions";
import { GalleryHeader } from "@/components/gallery-shell";
import { isAdminLoggedIn } from "@/lib/admin";
import { listLocalUsers } from "@/lib/local-db";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { hasSupabaseEnv, supabaseServiceRoleKey } from "@/lib/supabase/config";

type AdminUserRow = {
  id: string;
  email?: string;
  created_at?: string;
  canDelete: boolean;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const loggedIn = await isAdminLoggedIn();
  let users: AdminUserRow[] = [];
  let setupError = "";

  if (loggedIn) {
    try {
      if (!hasSupabaseEnv()) {
        users = (await listLocalUsers()).map((user) => ({
          ...user,
          canDelete: true,
        }));
      } else if (!supabaseServiceRoleKey) {
        const supabase = await createSupabaseServerClient();
        const { data, error: galleriesError } = await supabase
          .from("galleries")
          .select("user_id,name,gallery_code,created_at")
          .order("created_at", { ascending: false });

        if (galleriesError) {
          throw galleriesError;
        }

        users = (data ?? []).map((gallery) => ({
          id: gallery.user_id,
          email: `${gallery.name} (${gallery.gallery_code})`,
          created_at: gallery.created_at,
          canDelete: false,
        }));
      } else {
        const supabase = createSupabaseAdminClient();
        const { data } = await supabase.auth.admin.listUsers();
        users = data.users.map((user) => ({
          id: user.id,
          email:
            typeof user.user_metadata?.username === "string"
              ? user.user_metadata.username
              : user.email,
          created_at: user.created_at,
          canDelete: true,
        }));
      }
    } catch (err) {
      setupError = err instanceof Error ? err.message : "관리자 데이터를 불러오지 못했습니다.";
    }
  }

  return (
    <>
      <GalleryHeader minimal />
      <main className="min-h-screen bg-[#111] px-5 py-12 text-[#f5f1e8]">
        <section className="mx-auto max-w-3xl border border-[#c8a96a]/40 bg-[#1a1a1a] p-6">
          <Link className="gallery-link mb-6 w-fit border-white/15 bg-white/5 text-[#f5f1e8]" href="/">
            ← 뒤로가기
          </Link>
          <p className="text-sm uppercase tracking-[0.32em] text-[#c8a96a]">
            Restricted Room
          </p>
          <h1 className="mt-3 font-serif text-4xl">관리자 기능</h1>
          {!loggedIn ? (
            <form action={adminLogin} className="mt-8 space-y-4">
              <input
                className="admin-input"
                name="id"
                placeholder="enter your id"
                required
              />
              <input
                className="admin-input"
                name="password"
                placeholder="enter your password"
                required
                type="password"
              />
              {error && <p className="text-sm text-red-300">관리자 로그인이 필요합니다.</p>}
              <button className="gold-button w-full" type="submit">
                관리자 로그인
              </button>
            </form>
          ) : (
            <div className="mt-8">
              <form action={adminLogout}>
                <button className="gold-button" type="submit">
                  관리자 로그아웃
                </button>
              </form>
              {setupError ? (
                <p className="mt-6 border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-100">
                  {setupError}
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {users.map((user) => (
                    <div
                      className="flex items-center justify-between gap-4 border border-white/10 p-4"
                      key={user.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{user.email}</p>
                        <p className="truncate text-xs text-stone-400">{user.id}</p>
                      </div>
                      {user.canDelete ? (
                        <form action={adminDeleteUser}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="danger-button" type="submit">
                            계정 삭제
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-stone-500">
                          삭제 권한 설정 필요
                        </span>
                      )}
                    </div>
                  ))}
                  {!users.length && <p className="text-sm text-stone-400">계정이 없습니다.</p>}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
