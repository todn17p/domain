import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  requireSupabaseEnv,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./config";

export async function createSupabaseServerClient() {
  requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server components cannot set cookies; server actions and routes can.
        }
      },
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient {
  requireSupabaseEnv();

  if (!supabaseServiceRoleKey) {
    throw new Error(
      "관리자 기능에는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.",
    );
  }

  return createClient(supabaseUrl!, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
