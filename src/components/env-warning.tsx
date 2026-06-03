import { hasSupabaseEnv } from "@/lib/supabase/config";

export function EnvWarning() {
  if (hasSupabaseEnv()) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-stone-800">
      Supabase 환경변수가 아직 없어 데모 저장 모드로 실행 중입니다. 실제 운영
      데이터 보존과 큰 파일 업로드에는 Supabase 연결이 필요합니다.
    </div>
  );
}
