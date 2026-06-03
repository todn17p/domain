export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function requireSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase 환경변수가 필요합니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정해주세요.",
    );
  }
}
