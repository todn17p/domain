"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
