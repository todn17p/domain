import { hasSupabaseEnv } from "@/lib/supabase/config";

export function EnvWarning() {
  if (hasSupabaseEnv()) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-stone-800">
      Supabase 환경변수가 아직 없어 로컬 저장 모드로 실행 중입니다. 아이디,
      패스워드, 미술관 데이터는 이 프로젝트의 `.data/local-db.json`에 저장됩니다.
    </div>
  );
}
