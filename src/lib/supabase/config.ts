export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseConfigStatus() {
  const url = supabaseUrl?.trim() ?? "";
  const anonKey = supabaseAnonKey?.trim() ?? "";
  const serviceRoleKey = supabaseServiceRoleKey?.trim() ?? "";
  let parsedUrl: URL | null = null;

  try {
    parsedUrl = url ? new URL(url) : null;
  } catch {
    parsedUrl = null;
  }

  return {
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    host: parsedUrl?.host ?? "",
    isLikelyProjectUrl:
      Boolean(parsedUrl) &&
      parsedUrl?.protocol === "https:" &&
      parsedUrl.hostname.endsWith(".supabase.co"),
    isAnonJwt: anonKey.startsWith("eyJ"),
    isServiceRoleJwt: serviceRoleKey.startsWith("eyJ"),
  };
}

export function hasSupabaseEnv() {
  const status = getSupabaseConfigStatus();
  return Boolean(status.hasUrl && status.hasAnonKey);
}

export function requireSupabaseEnv() {
  const status = getSupabaseConfigStatus();

  if (!status.hasUrl || !status.hasAnonKey) {
    throw new Error(
      "Supabase 환경변수가 필요합니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정해주세요.",
    );
  }

  if (!status.isLikelyProjectUrl) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL 값이 Supabase Project URL 형식이 아닙니다. 현재 host: ${status.host || "비어 있음"}. https://프로젝트ID.supabase.co 형태여야 합니다.`,
    );
  }

  if (!status.isAnonJwt) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY 값이 올바른 JWT key 형식이 아닙니다. Supabase Project Settings > API의 anon public key를 넣어주세요.",
    );
  }
}
