import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 读取 Supabase 项目地址。
// 优先用运行时变量 SUPABASE_URL：带 NEXT_PUBLIC_ 前缀的变量会在 Docker 构建时被
// 内联进代码，构建时为空则运行时注入环境变量也读不到（CloudBase 只配置运行时变量，
// 不传构建参数，之前就是栽在这个坑上）。所以 CloudBase 请配置 SUPABASE_URL /
// SUPABASE_ANON_KEY（不带 NEXT_PUBLIC_ 前缀）。旧前缀仅作兼容保留。
function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}
function supabaseAnonKey() {
  return (
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;
  return createClient(url, key);
}

export function createServiceClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
